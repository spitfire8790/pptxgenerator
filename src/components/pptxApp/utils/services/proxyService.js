import { PROXY_CONFIG } from '../config/proxyConfig';

export async function proxyRequest(url, options = {}) {
  const proxyUrl = PROXY_CONFIG.baseUrl;
  
  // Debug logs
  console.log('Debug - PROXY_CONFIG:', PROXY_CONFIG);
  console.log('Debug - proxyUrl being used:', proxyUrl);
  
  try {
    console.log('Sending proxy request for:', url);
    
    // For ArcGIS services, ensure we're using a POST request when appropriate
    if (url.includes('arcgis') && url.includes('GeometryServer')) {
      console.log('ArcGIS Geometry Service detected, ensuring proper request format');
      
      // Force POST for ArcGIS Geometry Service operations
      if (!options.method || options.method === 'GET') {
        options.method = 'POST';
        console.log('Converted to POST request for ArcGIS service');
      }
      
      // Ensure proper Content-Type for form data
      if (!options.headers) {
        options.headers = {};
      }
      
      if (!options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
      
      // Check URL length and move query params to body if needed
      if (url.includes('?') && url.length > 2000) {
        console.log('URL too long (' + url.length + ' chars), moving query parameters to request body');
        const [baseUrl, queryString] = url.split('?');
        url = baseUrl;
        
        // If body isn't set, use the query string as the body
        if (!options.body) {
          options.body = queryString;
          console.log('Moved query parameters to request body');
        }
      }
    } else if (url.includes('arcgis') && (url.includes('/export') || url.includes('/MapServer'))) {
      // Special handling for ArcGIS export and MapServer requests
      console.log('ArcGIS Export or MapServer request detected');
      
      // Add specific headers for ArcGIS services
      if (!options.headers) {
        options.headers = {};
      }
      
      // Add referer header to help with CORS issues
      if (!options.headers['Referer']) {
        options.headers['Referer'] = window.location.origin;
        console.log('Added Referer header for ArcGIS service');
      }
      
      // Special handling for spatialportalarcgis.dpie.nsw.gov.au
      if (url.includes('spatialportalarcgis.dpie.nsw.gov.au')) {
        console.log('Special handling for spatialportalarcgis.dpie.nsw.gov.au');
        
        // Check if this is an export request
        if (url.includes('/export')) {
          // Force to use POST with form data for export requests
          options.method = 'POST';
          
          // Set proper content type for ArcGIS REST API
          options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
          
          // Move all query parameters to the body for POST request
          if (url.includes('?')) {
            const [baseUrl, queryString] = url.split('?');
            url = baseUrl;
            options.body = queryString;
            console.log('Modified request: Moved query params to body for spatialportalarcgis');
          }
          
          // Add additional headers that might help
          options.headers['Accept'] = 'image/png,*/*';
          
          // Set a longer timeout for these specific requests
          options.timeout = 300000; // 5 minutes
          console.log('Set extended timeout (5 minutes) for spatialportalarcgis service');
        }
      } else {
        // Add specific timeout for ArcGIS services
        if (!options.timeout) {
          // Special handling for SIX Maps services which need longer timeouts
          if (url.includes('maps.six.nsw.gov.au')) {
            options.timeout = 240000; // 4 minutes for SIX Maps services
            console.log('Set extended timeout (4 minutes) for SIX Maps service');
          } else {
            options.timeout = 240000; // 4 minutes for other ArcGIS services
            console.log('Set extended timeout (4 minutes) for ArcGIS service');
          }
        }
      }
      
      // Log the specific ArcGIS service being called
      const serviceMatch = url.match(/\/arcgis\/rest\/services\/([^\/]+)\/([^\/]+)/);
      if (serviceMatch) {
        console.log(`ArcGIS Service: ${serviceMatch[1]}/${serviceMatch[2]}`);
      }
    }
    
    // Log the request details for debugging
    console.log('Proxy request details:', {
      url: url,
      method: options.method || 'GET',
      bodySize: options.body ? (typeof options.body === 'string' ? options.body.length : 'non-string body') : 'no body',
      headers: options.headers
    });
    
    // Build request options for our proxy
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*'
      },
      body: JSON.stringify({
        url,
        method: options.method || 'GET',
        headers: {
          ...options.headers,
          'Origin': window.location.origin,
          'Accept': 'application/json, text/plain, */*'
        },
        body: options.body,
      }),
    };
    
    console.log('Sending request to proxy:', {
      proxyUrl,
      method: requestOptions.method,
      targetUrl: url,
      targetMethod: options.method || 'GET',
      hasBody: !!options.body
    });
    
    // Set a timeout for the request - use provided timeout or default to 60 seconds (increased from 30)
    const timeoutMs = options.timeout || 60000;
    console.log(`Setting request timeout to ${timeoutMs}ms`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      // If we're requesting from spatialportalarcgis.dpie.nsw.gov.au and it's an export operation,
      // we'll try up to 3 times with a small delay between attempts
      let maxRetries = 0;
      if (url.includes('spatialportalarcgis.dpie.nsw.gov.au') && url.includes('/export')) {
        maxRetries = 2; // Will try 3 times total (initial + 2 retries)
      }
      
      let lastError = null;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`Retry attempt ${attempt} for spatialportalarcgis.dpie.nsw.gov.au export request`);
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 3000 * attempt));
          }
          
          const response = await fetch(proxyUrl, {
            ...requestOptions,
            signal: controller.signal
          });
          
          // Clear the timeout
          clearTimeout(timeoutId);
      
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Proxy request failed:', {
              status: response.status,
              statusText: response.statusText,
              error: errorText
            });
            
            // If we have retries left, throw an error to trigger retry
            if (attempt < maxRetries) {
              throw new Error(`Proxy request failed (will retry): ${response.statusText}. ${errorText}`);
            }
            
            // If no retries left or not a retryable request, throw final error
            throw new Error(`Proxy request failed: ${response.statusText}. ${errorText}`);
          }
      
          const contentType = response.headers.get('content-type');
          console.log('Response content type:', contentType);
          
          // Handle binary responses (images, etc.)
          if (contentType?.includes('image') || url.includes('/export') || url.includes('GetMap')) {
            const arrayBuffer = await response.arrayBuffer();
            const blob = new Blob([arrayBuffer], { type: contentType || 'image/png' });
            return URL.createObjectURL(blob);
          }
      
          // Handle text responses
          if (contentType?.includes('text') || url.includes('maps.google.com/maps') || url.includes('google.com/maps')) {
            return await response.text();
          }
      
          // Try to parse as JSON, fallback to text if that fails
          try {
            const jsonResponse = await response.json();
            console.log('Successfully parsed JSON response');
            return jsonResponse;
          } catch (e) {
            console.warn('Failed to parse response as JSON, falling back to text:', e.message);
            const text = await response.text();
            if (!text) {
              throw new Error('Empty response from proxy server');
            }
            
            // If the text looks like JSON but couldn't be parsed, log it for debugging
            if (text.startsWith('{') || text.startsWith('[')) {
              console.log('Response looks like JSON but could not be parsed:', text.substring(0, 200) + '...');
            }
            
            return text;
          }
        } catch (retryError) {
          lastError = retryError;
          // If this is the last attempt, don't continue
          if (attempt === maxRetries) {
            throw retryError;
          }
          console.warn(`Attempt ${attempt + 1} failed, retrying...`, retryError.message);
        }
      }
      
      // This should never be reached due to the throw in the loop
      throw lastError || new Error('Unknown error occurred during retry logic');
    } catch (fetchError) {
      // Clear the timeout
      clearTimeout(timeoutId);
      
      // If this was an abort error, provide a clearer message
      if (fetchError.name === 'AbortError') {
        console.error(`Proxy request timed out after ${timeoutMs/1000} seconds`);
        throw new Error(`Request to proxy timed out after ${timeoutMs/1000} seconds`);
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('Proxy request error:', {
      url,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}