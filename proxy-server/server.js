import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { chromium } from 'playwright';

// For local development
const app = express();

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));

// Timeout configuration (in milliseconds)
const FETCH_TIMEOUT = 8000; // 8 seconds to leave room for processing

// Add a simple caching mechanism at the top of the file
const titleCache = new Map();

// At the top of the file, add a retry function
function retry(fn, retries = 3, delay = 2000) {
  return async (...args) => {
    let lastError = null;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${retries}...`);
        return await fn(...args);
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error.message);
        lastError = error;
        if (attempt < retries) {
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          // Increase delay for next retry (exponential backoff)
          delay = delay * 1.5;
        }
      }
    }
    throw lastError;
  };
}

// Helper function to create a timeout promise
function timeoutPromise(ms, message) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

// Helper function to parse request body
async function parseRequestBody(req) {
  try {
    const text = await req.text();
    return text ? JSON.parse(text) : {};
  } catch (error) {
    console.error('Error parsing request body:', error);
    return {};
  }
}

// Helper function to handle proxy requests
async function handleProxyRequest(req) {
  try {
    const body = await parseRequestBody(req);
    const { url, method = 'GET', headers = {} } = body;

    if (!url) {
      return new Response(JSON.stringify({ error: 'No URL provided' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Validate URL
    let targetUrl;
    try {
      targetUrl = new URL(url);
    } catch (error) {
      console.error('Invalid URL:', url, error);
      return new Response(JSON.stringify({ error: 'Invalid URL provided' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Add additional headers for ArcGIS requests
    const requestHeaders = new Headers({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Origin': req.headers.get('origin') || 'https://pptxgenerator-jws.vercel.app',
      'Referer': targetUrl.origin,
      ...headers
    });

    // Remove any undefined or null headers
    Array.from(requestHeaders.keys()).forEach(key => {
      const value = requestHeaders.get(key);
      if (value === undefined || value === null || value === 'undefined' || value === 'null') {
        requestHeaders.delete(key);
      }
    });

    const fetchOptions = {
      method,
      headers: requestHeaders,
      redirect: 'follow',
    };

    // Only add body for POST requests
    if (method === 'POST' && body.body) {
      fetchOptions.body = typeof body.body === 'string' ? body.body : JSON.stringify(body.body);
    }

    // Race between fetch and timeout
    const response = await Promise.race([
      fetch(url, fetchOptions),
      timeoutPromise(FETCH_TIMEOUT, 'Request timed out')
    ]);

    // Handle different response types with streaming where possible
    const contentType = response.headers.get('content-type');
    const responseHeaders = new Headers({
      'Content-Type': contentType || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600' // Cache successful responses for 1 hour
    });

    // Copy relevant headers from the response
    for (const [key, value] of response.headers.entries()) {
      if (!['content-length', 'content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('External service error:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      return new Response(JSON.stringify({
        error: 'External service error',
        status: response.status,
        statusText: response.statusText,
        details: errorText
      }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // For image responses, stream directly
    if (contentType?.includes('image') || url.includes('/export') || url.includes('GetMap')) {
      return new Response(response.body, { 
        status: 200,
        headers: responseHeaders 
      });
    }

    // For JSON responses
    if (contentType?.includes('application/json')) {
      const json = await response.json();
      return new Response(JSON.stringify(json), { 
        status: 200,
        headers: responseHeaders 
      });
    }

    // Default to streaming text response
    return new Response(response.body, { 
      status: 200,
      headers: responseHeaders 
    });

  } catch (error) {
    console.error('Detailed proxy error:', {
      error: error.message,
      stack: error.stack
    });
    
    const status = error.message.includes('timed out') ? 504 : 500;
    
    return new Response(JSON.stringify({
      error: 'Proxy request failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Add a new route for fetching title data
app.post('/api/fetch-title', async (req, res) => {
  const { lotReference } = req.body;
  
  if (!lotReference) {
    return res.status(400).json({ error: 'Lot reference is required' });
  }
  
  console.log(`Starting title search for ${lotReference}...`);
  
  // Check cache first
  if (titleCache.has(lotReference)) {
    console.log(`Cache hit for ${lotReference}`);
    return res.status(200).json(titleCache.get(lotReference));
  }
  
  let browser;
  try {
    // Launch a browser instance with optimized settings
    browser = await chromium.launch({ 
      headless: true,
      args: ['--disable-dev-shm-usage', '--disable-gpu', '--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Create a context with performance optimizations
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      javaScriptEnabled: true,
      bypassCSP: true,
      // Disable images, fonts, and other non-essential resources
      serviceWorkers: 'block',
      permissions: ['clipboard-read', 'clipboard-write']
    });
    
    // Enable request interception to block unnecessary resources
    await context.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf,otf,eot}', route => route.abort());
    
    const page = await context.newPage();
    
    // Step 1: Navigate to the LRS site with a timeout
    console.log('Navigating to NSW Land Registry Services portal...');
    try {
      // Navigate with more robust loading strategy
      await page.goto('https://online.nswlrs.com.au/wps/portal/six/home', { 
        waitUntil: 'networkidle', // Wait until network is idle
        timeout: 30000 // Longer timeout for initial load
      });
      
      // Wait for page to fully initialize
      await page.waitForFunction(() => {
        return document.readyState === 'complete' && 
               window.jQuery !== undefined && 
               typeof $ !== 'undefined';
      }, { timeout: 10000 }).catch(() => console.log('Page initialized without jQuery'));
      
      console.log('NSW LRS portal loaded successfully');
    } catch (error) {
      console.error('Error loading NSW LRS portal:', error);
      // Take a screenshot of the failed loading
      await page.screenshot({ path: 'portal-load-error.png' });
      throw new Error('Failed to load NSW LRS portal: ' + error.message);
    }
    
    // Step 2: Accept terms and conditions (only if present)
    console.log('Checking for terms and conditions...');
    const hasTerms = await page.isVisible('input[name="iaccept"]', { timeout: 1000 }).catch(() => false);
    
    if (hasTerms) {
      console.log('Accepting terms and conditions...');
      await page.click('input[name="iaccept"]');
      await page.click('button.btn.btn-primary.accept');
    }
    
    // Step 3 & 4: Login (only if needed)
    const loginRequired = await page.isVisible('#loginModal', { timeout: 1000 }).catch(() => false);
    
    if (loginRequired) {
      console.log('Logging in...');
      await page.click('#loginModal');
      await page.fill('#txtUsername', 'jstrutt');
      await page.fill('#txtPassword', 'B6pwt266');
      await page.click('button[type="submit"]');
      
      // Wait for login to complete (reduced from 3000ms to 1000ms)
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 5000 }).catch(() => {});
    }
    
    // Step 6: Search for the lot
    console.log(`Searching for lot reference: ${lotReference}...`);
    
    // Wait for the search field using a more robust approach
    try {
      // Wait for page to be fully loaded and stable
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      
      // Take a screenshot to debug search page
      await page.screenshot({ path: 'search-page.png' });
      
      console.log('Waiting for search field to be visible...');
      // Increase timeout and specifically wait for visibility
      await page.waitForSelector('#searchString', { 
        state: 'visible',
        timeout: 10000 
      });
      
      console.log('Search field found, entering lot reference:', lotReference);
      // Clear and fill the search field
      await page.fill('#searchString', '');
      await page.fill('#searchString', lotReference);
      console.log('Lot reference entered successfully');
      
      // Click search button using multiple approaches
      const searchButtonSelector = 'button.btn-search';
      console.log('Attempting to click search button...');
      
      // Check if button is visible first
      const isSearchButtonVisible = await page.isVisible(searchButtonSelector, { timeout: 2000 })
        .catch(() => false);
      
      if (isSearchButtonVisible) {
        console.log('Search button is visible, clicking...');
        await page.click(searchButtonSelector);
        console.log('Search button clicked');
      } else {
        console.log('Search button not visible, trying alternative methods...');
        
        // Try JavaScript click first
        await page.evaluate(() => {
          const button = document.querySelector('button.btn-search');
          if (button) {
            console.log('Found button via JS, clicking');
            button.click();
            return true;
          }
          return false;
        }).then(clicked => {
          if (clicked) console.log('Button clicked via JavaScript');
          else console.log('Button not found via JavaScript');
        });
        
        // If JavaScript click didn't work, try Enter key
        console.log('Pressing Enter key as fallback...');
        await page.press('#searchString', 'Enter');
        console.log('Enter key pressed');
      }
    } catch (error) {
      console.error('Error during search process:', error);
      
      // Take a screenshot to debug the error
      try {
        await page.screenshot({ path: 'search-error.png' });
        console.log('Error screenshot saved to search-error.png');
      } catch (err) {
        console.error('Failed to take error screenshot:', err);
      }
      
      // Attempt to print current page content
      try {
        const bodyText = await page.textContent('body');
        console.log('Current page content:', bodyText.substring(0, 500) + '...');
      } catch (err) {
        console.error('Failed to get page content:', err);
      }
      
      throw new Error('Unable to perform search: ' + error.message);
    }
    
    // Step 7: Wait for search results with a more efficient approach
    console.log('Waiting for search results...');
    await Promise.race([
      page.waitForSelector('button.product-link.btn-view[data-productcode="RET_ITS01"]', { timeout: 5000 }),
      page.waitForSelector('.no-results-message', { timeout: 5000 })
    ]).catch(() => {});
    
    // Check if no results were found
    const noResults = await page.isVisible('.no-results-message');
    if (noResults) {
      const noResultsText = await page.textContent('.no-results-message');
      throw new Error(`No results found for lot reference: ${lotReference}`);
    }
    
    // Step 8: Click the View button using the exact selector
    console.log('Clicking view button...');
    try {
      // Use the exact selector provided
      const viewButtonSelector = 'button.product-link.btn-view[data-productcode="RET_ITS01"]';
      
      // First check if the button is visible
      const isVisible = await page.isVisible(viewButtonSelector, { timeout: 2000 });
      
      if (isVisible) {
        // Try direct click first
        await page.click(viewButtonSelector, { force: true });
      } else {
        // If not visible, try evaluation click
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const viewButton = buttons.find(btn => 
            btn.textContent.trim() === 'View' && 
            btn.className.includes('product-link') && 
            btn.className.includes('btn-view')
          );
          if (viewButton) viewButton.click();
        });
      }
    } catch (error) {
      console.error('Error clicking view button:', error);
      throw new Error('Could not click View button: ' + error.message);
    }
    
    // Step 9: Click Proceed button
    console.log('Proceeding to title information...');
    try {
      // Take a screenshot before clicking proceed
      await page.screenshot({ path: 'before-proceed.png' });
      
      // Wait a bit longer for any transitions to complete
      await page.waitForTimeout(2000);
      
      // Try to find the proceed button with explicit ID first
      console.log('Looking for proceed button...');
      const proceedButton = await page.$('#btnFrmSearch');
      
      if (proceedButton) {
        console.log('Found proceed button with ID btnFrmSearch');
        await proceedButton.click();
      } else {
        // Try various other selectors
        console.log('Trying alternative proceed buttons...');
        const primaryButton = await page.$('button.btn.btn-primary');
        
        if (primaryButton) {
          console.log('Found primary button');
          await primaryButton.click();
        } else {
          // Last resort - use JavaScript to find and click any proceed-like button
          console.log('Using JavaScript to find proceed button...');
          await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            
            // Look for buttons with specific text content
            for (const buttonText of ['Proceed', 'Continue', 'Submit', 'Next']) {
              const button = buttons.find(b => 
                b.textContent.includes(buttonText) || 
                b.value?.includes(buttonText)
              );
              
              if (button) {
                console.log(`Found button with text: ${buttonText}`);
                button.click();
                return true;
              }
            }
            
            // If no text match, try by class or id hints
            const proceedButton = buttons.find(b => 
              b.id?.includes('proceed') || 
              b.id?.includes('submit') || 
              b.id?.includes('search') ||
              b.className?.includes('primary')
            );
            
            if (proceedButton) {
              console.log('Found button with proceed-like attributes');
              proceedButton.click();
              return true;
            }
            
            return false;
          });
        }
      }
      
      // Give the page time to load the title information
      console.log('Waiting for title information to load...');
      await page.waitForTimeout(5000);
      
      // Take a screenshot after clicking proceed
      await page.screenshot({ path: 'after-proceed.png' });
    } catch (error) {
      console.error('Error with proceed button:', error);
      throw new Error('Could not proceed to title information: ' + error.message);
    }
    
    // Wrap the extraction in a retry function
    const extractTitleWithRetry = retry(async () => {
      // Step 10: Extract the title data
    console.log('Extracting title information...');
      
      // Wait for title data to be fully loaded and visible
      console.log('Waiting for title content to load...');
      
      // Take a screenshot to debug what we're looking at
      await page.screenshot({ path: 'title-screen.png' });
      
      // Wait longer for content to load - NSW LRS site can be slow
      await page.waitForTimeout(8000);
      
      // Try direct extraction of the pre.pre-scrollable element first
      console.log('Attempting direct extraction of pre.pre-scrollable...');
      try {
        const directExtraction = await page.evaluate(() => {
          // Try to make hidden elements visible temporarily
          const styleElements = document.querySelectorAll('style, [style*="display: none"], [style*="visibility: hidden"]');
          const originalStyles = new Map();
          
          // Store original styles and make elements visible
          styleElements.forEach((el, index) => {
            if (el.style) {
              originalStyles.set(index, {
                display: el.style.display,
                visibility: el.style.visibility
              });
              el.style.display = 'block';
              el.style.visibility = 'visible';
            }
          });
          
          // Look specifically for the pre.pre-scrollable element
          const preElement = document.querySelector('pre.pre-scrollable');
          
          // Check if we found it and it contains title data
          if (preElement) {
            const text = preElement.textContent.trim();
            if (text && text.length > 100 && 
                !text.includes('$(document).ready') && 
                !text.includes('function(') &&
                !text.includes('$.')) {
              // This is likely the title text
              return text;
            }
          }
          
          // Restore original styles
          styleElements.forEach((el, index) => {
            if (el.style && originalStyles.has(index)) {
              const original = originalStyles.get(index);
              el.style.display = original.display;
              el.style.visibility = original.visibility;
            }
          });
          
          return null;
        });
        
        if (directExtraction) {
          console.log('Successfully found title text via direct extraction!');
          return directExtraction;
        }
      } catch (e) {
        console.log('Direct extraction attempt failed:', e.message);
      }
      
      // Try to find the title information using multiple approaches
      console.log('Trying multiple approaches to find title information...');
      
      // First check if we need to click any additional buttons or tabs
      const needsInteraction = await page.evaluate(() => {
        // Look for any "View Title" buttons or tabs that might need clicking
        const viewButtons = Array.from(document.querySelectorAll('button, a, div[role="button"]'))
          .filter(el => 
            el.textContent.toLowerCase().includes('view') || 
            el.textContent.toLowerCase().includes('title') ||
            el.textContent.toLowerCase().includes('details')
          );
          
        if (viewButtons.length > 0) {
          viewButtons[0].click();
          return true;
        }
        
        return false;
      });
      
      if (needsInteraction) {
        console.log('Detected and clicked an interaction element');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'after-interaction.png' });
      }
      
      // Check for iframes that might contain the title information
      const hasIframes = await page.evaluate(() => document.querySelectorAll('iframe').length > 0);
      
      if (hasIframes) {
        console.log('Detected iframes on the page, attempting to access content...');
        
        // Get iframe content
        const frameContent = await page.evaluate(() => {
          const iframes = Array.from(document.querySelectorAll('iframe'));
          for (const iframe of iframes) {
            try {
              // Try to access iframe content
              let iframeDocument;
              try {
                iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
              } catch (e) {
                console.log('Cross-origin iframe, cannot access directly');
                continue;
              }
              
              // Look for pre.pre-scrollable in the iframe
              const preElement = iframeDocument.querySelector('pre.pre-scrollable');
              if (preElement && preElement.textContent.trim().length > 100) {
                return preElement.textContent.trim();
              }
              
              // If no pre element, try to get any text that looks like title data
              const text = iframeDocument.body.textContent.trim();
              if (text.includes('NEW SOUTH WALES LAND REGISTRY SERVICES') || 
                  text.includes('TITLE SEARCH') || 
                  text.includes('FOLIO:')) {
                return text;
              }
            } catch (e) {
              console.log('Could not access iframe content:', e);
            }
          }
          return null;
        });
        
        if (frameContent) {
          console.log('Successfully extracted content from iframe');
          return frameContent;
        }
      }
      
      // Try clicking any tabs that might contain title information
      console.log('Trying to click any tabs that might reveal title data...');
      await page.evaluate(() => {
        // Look for tabs, especially ones with title-related text
        const potentialTabs = Array.from(document.querySelectorAll('a[role="tab"], .nav-item, .tab, button[data-toggle="tab"]'))
          .filter(el => el.textContent.toLowerCase().includes('title') || 
                      el.textContent.toLowerCase().includes('detail') ||
                      el.textContent.toLowerCase().includes('result') ||
                      el.textContent.toLowerCase().includes('content'));
                      
        // Click each potential tab
        potentialTabs.forEach(tab => {
          console.log('Clicking tab:', tab.textContent);
          tab.click();
        });
      });
      
      // Wait a moment for any tab content to load
      await page.waitForTimeout(2000);
      
      // Try a variety of selectors to find the title information
      const titleText = await page.evaluate(() => {
        // Common selectors that might contain title information
        const selectors = [
          'pre.pre-scrollable',
          'pre',
          '.record-viewer pre.pre-scrollable',
          '.record-viewer pre',
          '.overlayer pre',
          'div.record-viewer-content pre',
          '.modal-content pre',
          '.record-viewer',
          '.overlayer',
          '.modal-content',
          '.modal-body',
          '[id*="certificateOfTitle"]',
          '[id*="title"]',
          '[class*="title"]',
          '.content-area',
          '.document-content',
          '.search-result',
          '.result-content',
          '.detail-view'
        ];
        
        // Try each selector
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            // Check if content appears to be title data and not JavaScript
            const text = element.textContent.trim();
            
            // Skip if it contains typical JavaScript patterns
            if (text.includes('function(') || text.includes('$(document).ready') || 
                text.includes('$.') || text.includes('var ')) {
              console.log(`Found JavaScript in ${selector}, skipping`);
              continue;
            }
            
            // Check for title data patterns
            if (text.includes('NEW SOUTH WALES LAND REGISTRY SERVICES') || 
                text.includes('TITLE SEARCH') || 
                text.includes('FOLIO:') ||
                text.includes('PLAN') ||
                text.includes('PARISH OF')) {
              console.log(`Found title data in ${selector}`);
              return text;
            }
            
            // If we've checked the first few highest-priority selectors and didn't find title data,
            // we'll accept any substantial non-JS text
            if (selectors.indexOf(selector) < 5 && text.length > 100) {
              console.log(`Found potential title data in ${selector}`);
              return text;
            }
          }
        }
        
        // If no specific selector works, try getting all visible text from the page
        // that might look like a title record 
        const allParagraphs = Array.from(document.querySelectorAll('p, div, pre, span'))
          .filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   el.offsetHeight > 0 &&
                   el.textContent.trim().length > 100; // Only elements with substantial text
          })
          .map(el => el.textContent.trim())
          .join('\n\n');
          
        if (allParagraphs.length > 100) {
          return allParagraphs;
        }
        
        // Last resort - get all text content of the body
        return document.body.textContent.trim();
      });
      
      // If we got text but it doesn't look like title data, try to extract title-like portions
      if (titleText && !titleText.includes('NEW SOUTH WALES LAND REGISTRY SERVICES') && 
          !titleText.includes('TITLE SEARCH') && titleText.length > 500) {
        
        console.log('Processing full page text to extract title data...');
        
        // Use a more sophisticated approach to extract title data from the full text
        const processedText = await page.evaluate((fullText) => {
          // Function to extract title data patterns from text
          function extractTitleData(text) {
            // Common patterns in title data
            const patterns = [
              // Match the entire title block if possible
              /NEW SOUTH WALES LAND REGISTRY SERVICES[\s\S]*?END OF SEARCH/i,
              
              // Or match portions that look like title data
              /FOLIO: .*?\d+\/\d+/i,
              /LOT \d+ IN .*?PLAN \d+/i,
              /LOCAL GOVERNMENT AREA .*?/i,
              /PARISH OF .*? COUNTY OF/i,
              /FIRST SCHEDULE.*?SECOND SCHEDULE/i,
              /RESERVATIONS AND CONDITIONS/i,
              /EASEMENT FOR/i,
              /COVENANT AFFECTING/i
            ];
            
            // Try each pattern and collect matches
            let matchResults = [];
            for (const pattern of patterns) {
              const match = text.match(pattern);
              if (match) {
                matchResults.push(match[0]);
              }
            }
            
            // If we found matches, join them together
            if (matchResults.length > 0) {
              return matchResults.join('\n');
            }
            
            // If no regex matches, try extracting lines containing key title terms
            const lines = text.split('\n');
            const titleLines = lines.filter(line => 
              line.includes('LAND REGISTRY') ||
              line.includes('TITLE SEARCH') ||
              line.includes('FOLIO:') ||
              line.includes('LOT ') ||
              line.includes('PLAN ') ||
              line.includes('PARISH OF') ||
              line.includes('COUNTY OF') ||
              line.includes('SCHEDULE') ||
              line.includes('EASEMENT') ||
              line.includes('COVENANT')
            );
            
            if (titleLines.length > 0) {
              return titleLines.join('\n');
            }
            
            return null;
          }
          
          return extractTitleData(fullText);
        }, titleText);
        
        if (processedText && processedText.length > 100) {
          console.log('Successfully extracted title-like data from full page text');
          return processedText;
        }
      }
      
      if (!titleText || titleText.trim() === '') {
        console.error('No title text found using any method');
        
        // Take a screenshot to debug the issue
        await page.screenshot({ path: 'title-extraction-failure.png' });
        
        // Get the current HTML for debugging
        const html = await page.content();
        console.log('Current page HTML:', html.substring(0, 1000) + '...');
        
        throw new Error('Title information could not be extracted');
      }
      
      console.log('Title text successfully extracted!');
      // Return the title text
      return titleText;
    }, 2, 3000); // 2 retries, 3 second initial delay
    
    // Execute the retry function
    try {
      const titleText = await extractTitleWithRetry();
      
      console.log('Title text successfully extracted!');
      // Create the response object
      const response = {
        lotReference,
        title: titleText
      };
      
      // Save to cache
      titleCache.set(lotReference, response);
      
      // Send success response
      return res.status(200).json(response);
    } catch (error) {
      console.error('Error extracting title data:', error);
      
      // Take a final debug screenshot
      if (page) {
        await page.screenshot({ path: `extraction-error-${Date.now()}.png` });
        
        // Get the current URL and page info for debugging
        const currentUrl = await page.url();
        const pageTitle = await page.title();
        
        console.log('Error details:', {
          url: currentUrl,
          title: pageTitle,
          errorMsg: error.message
        });
      }
      
      throw new Error('Failed to extract title data: ' + error.message);
    } finally {
      // Close the browser as soon as possible
      await browser.close();
      browser = null;
    }
  } catch (error) {
    console.error(`Error fetching title data: ${error.message}`);
    
    return res.status(500).json({ 
      error: error.message, 
      lotReference, 
      isFetched: false,
      timestamp: new Date().toISOString(),
      details: `The server encountered an error while trying to extract title data. This could be due to changes in the NSW Land Registry Services portal interface or timeouts in the process. Please try again or check if the lot reference is correct.`
    });
  } finally {
    // Ensure the browser is closed
    if (browser) {
      await browser.close();
    }
  }
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PROXY_PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
  });
}

// Vercel serverless function handler
export default async function handler(req) {
  // Add CORS headers to all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  if (req.method === 'POST') {
    return handleProxyRequest(req);
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}