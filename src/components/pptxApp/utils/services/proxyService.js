import { PROXY_CONFIG } from '../config/proxyConfig';

export async function proxyRequest(url, options = {}) {
  const proxyUrl = PROXY_CONFIG.baseUrl;
  
  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        method: options.method || 'GET',
        headers: options.headers || {},
        body: options.body,
      }),
    });

    if (!response.ok) {
      throw new Error(`Proxy request failed: ${response.statusText}`);
    }

    // If the response is an image, return as blob
    if (url.includes('/export') || url.includes('GetMap')) {
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }

    return response.json();
  } catch (error) {
    console.error('Proxy request failed:', error);
    throw error;
  }
} 