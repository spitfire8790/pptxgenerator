import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Proxy endpoint
app.post('/proxy', async (req, res) => {
  const { url, method, headers, body } = req.body;

  console.log('Proxy request received:', { url, method });

  try {
    const response = await fetch(url, {
      method: method || 'GET',
      headers: {
        ...headers,
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'image/png,image/*,*/*'
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log('External service response:', {
      status: response.status,
      contentType: response.headers.get('content-type')
    });

    if (!response.ok) {
      throw new Error(`External service responded with status: ${response.status}`);
    }

    // Forward the response
    const contentType = response.headers.get('content-type');
    res.set('Content-Type', contentType);

    if (contentType?.includes('image')) {
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } else {
      const data = await response.text();
      res.send(data);
    }
  } catch (error) {
    console.error('Detailed proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy request failed',
      details: error.message,
      url: url
    });
  }
});

const PORT = process.env.PROXY_PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
}); 