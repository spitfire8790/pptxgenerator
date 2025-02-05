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
    res.set('Content-Type', contentType || 'application/octet-stream');

    try {
      if (contentType?.includes('image')) {
        const buffer = await response.buffer();
        res.send(buffer);
      } else {
        const text = await response.text();
        res.send(text);
      }
    } catch (error) {
      console.error('Error processing response:', error);
      res.status(500).json({ 
        error: 'Error processing response',
        message: error.message
      });
    }
  } catch (error) {
    console.error('Detailed proxy error:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ 
      error: 'Proxy request failed',
      message: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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