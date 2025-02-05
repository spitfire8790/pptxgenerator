import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { createServer } from 'http';

const app = express();

// CORS configuration
app.use(cors({
  origin: '*', // Allow all origins for now - update this to your Vercel app URL in production
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));

// Proxy endpoint
app.post('/api/proxy', async (req, res) => {
  const { url, method, headers, body } = req.body;

  console.log('Proxy request received for URL:', url);
  console.log('Request method:', method);
  console.log('Request headers:', headers);

  try {
    // Validate URL
    const targetUrl = new URL(url);
    
    // Add additional headers for ArcGIS requests
    const requestHeaders = {
      ...headers,
      'User-Agent': 'Mozilla/5.0',
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Referer': targetUrl.origin,
    };

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
      console.error('External service error:', errorText);
      return res.status(response.status).json({
        error: 'External service error',
        status: response.status,
        statusText: response.statusText,
        details: errorText
      });
    }

    // Forward the response
    const contentType = response.headers.get('content-type');
    res.set('Content-Type', contentType);

    if (contentType?.includes('image')) {
      const buffer = await response.buffer();
      res.send(buffer);
    } else {
      const text = await response.text();
      res.send(text);
    }
  } catch (error) {
    console.error('Detailed proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy request failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      url: url
    });
  }
});

const PORT = process.env.PROXY_PORT || 3000;

// Export the Express app as a handler function
export default async function handler(req, res) {
  await new Promise((resolve, reject) => {
    createServer(app)
      .listen(PORT)
      .on('listening', () => {
        console.log(`Proxy server running on port ${PORT}`);
        resolve();
      })
      .on('error', (err) => {
        reject(err);
      });
  });

  return app(req, res);
}