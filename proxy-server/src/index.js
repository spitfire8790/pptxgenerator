export default {
  async fetch(request, env, ctx) {
    // Debug logging
    console.log('Worker received request:', {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries())
    });

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Handle OPTIONS request
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    try {
      const body = await request.json();
      console.log('Worker received body:', body);

      const { url, method = 'GET', headers = {} } = body;

      if (!url) {
        console.log('No URL provided in request');
        return new Response(JSON.stringify({ error: 'No URL provided' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // Add headers for ArcGIS requests
      const requestHeaders = new Headers({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': request.headers.get('origin') || 'https://pptxgenerator-jws.vercel.app',
        ...headers
      });

      console.log('Worker making request to:', url, {
        method,
        headers: Object.fromEntries(requestHeaders.entries())
      });

      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: method === 'POST' && body.body ? 
          (typeof body.body === 'string' ? body.body : JSON.stringify(body.body)) 
          : undefined,
        redirect: 'follow',
      });

      console.log('Worker received response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      const responseHeaders = new Headers({
        'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
        ...corsHeaders,
        'Cache-Control': 'public, max-age=3600'
      });

      // Stream the response directly
      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Proxy request failed',
        message: error.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
};
