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
      const errorData = await response.json();
      console.error('Proxy error details:', errorData);
      throw new Error(`Proxy request failed: ${errorData.error}\n${errorData.details || ''}`);
    }

    const contentType = response.headers.get('content-type');
    
    // Handle image responses
    if (contentType?.includes('image') || url.includes('/export') || url.includes('GetMap')) {
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }

    // Handle JSON responses
    try {
      const data = await response.json();
      return data;
    } catch (e) {
      // If JSON parsing fails, return the raw text
      const text = await response.text();
      return text;
    }
  } catch (error) {
    console.error('Proxy request failed:', error);
    throw error;
  }
} 