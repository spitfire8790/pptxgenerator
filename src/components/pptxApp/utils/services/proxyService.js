import { PROXY_CONFIG } from '../config/proxyConfig';

export async function proxyRequest(url, options = {}) {
  const proxyUrl = PROXY_CONFIG.baseUrl;
  
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
      throw new Error(`Proxy request failed: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    
    // Clone the response before reading it
    const responseClone = response.clone();
    
    // Handle image responses
    if (contentType?.includes('image') || url.includes('/export') || url.includes('GetMap')) {
      const blob = await responseClone.blob();
      return URL.createObjectURL(blob);
    }

    // Handle Street View responses
    if (url.includes('maps.google.com/maps') || url.includes('google.com/maps')) {
      return await responseClone.text();
    }

    // Handle JSON responses
    try {
      const data = await responseClone.json();
      return data;
    } catch (e) {
      // If JSON parsing fails, return the raw text
      return await response.text();
    }
  } catch (error) {
    console.error('Proxy request failed:', error);
    throw error;
  }
} 