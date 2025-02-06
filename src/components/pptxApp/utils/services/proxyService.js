import { PROXY_CONFIG } from '../config/proxyConfig';

export async function proxyRequest(url, options = {}) {
  const proxyUrl = PROXY_CONFIG.baseUrl;
  
  // Debug logs
  console.log('Debug - PROXY_CONFIG:', PROXY_CONFIG);
  console.log('Debug - proxyUrl being used:', proxyUrl);
  console.log('Debug - import.meta.env:', import.meta.env);
  
  try {
    console.log('Sending proxy request for:', url);
    
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        method: options.method || 'GET',
        headers: {
          ...options.headers,
          'Origin': window.location.origin,
        },
        body: options.body,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Proxy request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Proxy request failed: ${response.statusText}. ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    
    // Handle binary responses (images, etc.)
    if (contentType?.includes('image') || url.includes('/export') || url.includes('GetMap')) {
      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: contentType });
      return URL.createObjectURL(blob);
    }

    // Handle text responses
    if (contentType?.includes('text') || url.includes('maps.google.com/maps') || url.includes('google.com/maps')) {
      return await response.text();
    }

    // Try to parse as JSON, fallback to text if that fails
    try {
      return await response.json();
    } catch (e) {
      const text = await response.text();
      if (!text) {
        throw new Error('Empty response from proxy server');
      }
      return text;
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