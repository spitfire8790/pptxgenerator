import { PROXY_CONFIG } from '../config/proxyConfig';

export async function proxyRequest(url, options = {}) {
  const proxyUrl = 'http://localhost:3000/proxy';
  
  try {
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    
    // Handle image responses
    if (contentType?.includes('image') || url.includes('/export') || url.includes('GetMap')) {
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }

    // Clone response for potential double reading
    const clonedResponse = response.clone();

    // For GeoJSON responses
    if (url.includes('f=geojson')) {
      try {
        return await response.json();
      } catch (error) {
        console.warn('Failed to parse GeoJSON response, trying text:', error);
        const text = await clonedResponse.text();
        try {
          return JSON.parse(text);
        } catch {
          throw new Error('Failed to parse response as JSON');
        }
      }
    }

    // For all other responses
    try {
      return await response.json();
    } catch {
      return await clonedResponse.text();
    }
  } catch (error) {
    console.error('Proxy request failed:', error);
    throw error;
  }
} 