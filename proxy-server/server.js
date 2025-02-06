import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));

// Helper function to handle proxy requests
async function handleProxyRequest(req, res) {
  try {
    const { url, method, headers, body } = req.body;

    if (!url) {
      console.error('No URL provided in request body');
      return res.status(400).json({ error: 'No URL provided' });
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
      return res.status(400).json({ error: 'Invalid URL provided' });
    }
    
    // Add additional headers for ArcGIS requests
    const requestHeaders = {
      ...headers,
      'User-Agent': 'Mozilla/5.0',
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Referer': targetUrl.origin,
    };

    console.log('Sending request to target URL with headers:', requestHeaders);

    const response = await fetch(url, {
      method: method || 'GET',
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      timeout: 30000, // 30 second timeout
    });

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
      return res.status(response.status).json({
        error: 'External service error',
        status: response.status,
        statusText: response.statusText,
        details: errorText
      });
    }

    // Forward the response
    const contentType = response.headers.get('content-type');
    const headers = new Headers();
    headers.set('Content-Type', contentType || 'application/octet-stream');

    // Copy all other headers from the response
    for (const [key, value] of response.headers.entries()) {
      if (key.toLowerCase() !== 'content-length') { // Skip content-length as it might change
        headers.set(key, value);
      }
    }

    try {
      if (contentType?.includes('image') || url.includes('/export') || url.includes('GetMap')) {
        const buffer = await response.arrayBuffer();
        return res.send(new Response(buffer, { headers }));
      }

      if (contentType?.includes('application/json')) {
        const json = await response.json();
        return res.send(new Response(JSON.stringify(json), { headers }));
      }

      // Default to text response
      const text = await response.text();
      return res.send(new Response(text, { headers }));
    } catch (error) {
      console.error('Error processing response:', error);
      return res.status(500).send(new Response(JSON.stringify({ error: 'Error processing response', details: error.message }), {
        headers: { 'Content-Type': 'application/json' }
      }));
    }
  } catch (error) {
    console.error('Detailed proxy error:', {
      url,
      error: error.message,
      stack: error.stack
    });
    
    return new Response(JSON.stringify({
      error: 'Proxy request failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
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
export default async function handler(req, res) {
  console.log('Received request:', {
    method: req.method,
    url: req.url,
    headers: req.headers
  });

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    return handleProxyRequest(req, res);
  }

  res.status(405).json({ error: 'Method not allowed' });
}