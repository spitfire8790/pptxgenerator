import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

// For local development
const app = express();

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));

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

    console.log('Proxy request received:', {
      url,
      method,
      headers,
      bodyLength: body ? JSON.stringify(body).length : 0
    });

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
      'Accept': '*/*',
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

    console.log('Sending request to target URL with headers:', Object.fromEntries(requestHeaders.entries()));

    const fetchOptions = {
      method,
      headers: requestHeaders,
      redirect: 'follow',
    };

    // Only add body for POST requests
    if (method === 'POST' && body.body) {
      fetchOptions.body = typeof body.body === 'string' ? body.body : JSON.stringify(body.body);
    }

    const response = await fetch(url, fetchOptions);

    console.log('External service response:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type')
    });

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

    // Forward the response with appropriate headers
    const contentType = response.headers.get('content-type');
    const responseHeaders = new Headers({
      'Content-Type': contentType || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });

    // Copy all other headers from the response
    for (const [key, value] of response.headers.entries()) {
      if (key.toLowerCase() !== 'content-length' && // Skip content-length as it might change
          key.toLowerCase() !== 'content-encoding') { // Skip encoding as we'll handle it
        responseHeaders.set(key, value);
      }
    }

    // Handle different response types
    if (contentType?.includes('image') || url.includes('/export') || url.includes('GetMap')) {
      const buffer = await response.arrayBuffer();
      return new Response(buffer, { 
        status: 200,
        headers: responseHeaders 
      });
    }

    if (contentType?.includes('application/json')) {
      const json = await response.json();
      return new Response(JSON.stringify(json), { 
        status: 200,
        headers: responseHeaders 
      });
    }

    // Default to text response
    const text = await response.text();
    return new Response(text, { 
      status: 200,
      headers: responseHeaders 
    });

  } catch (error) {
    console.error('Detailed proxy error:', {
      error: error.message,
      stack: error.stack
    });
    
    return new Response(JSON.stringify({
      error: 'Proxy request failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

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