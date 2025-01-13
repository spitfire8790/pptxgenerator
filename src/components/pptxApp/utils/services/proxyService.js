import { PROXY_CONFIG } from '../config/proxyConfig';

export async function proxyRequest(url, options = {}) {
  // Handle different URL patterns
  let proxyUrl = url;
  
  if (url.includes('mapprod3.environment.nsw.gov.au')) {
    // Extract the path after 'services/'
    const servicePath = url.split('arcgis/rest/services/')[1];
    proxyUrl = `/api/spatial/${servicePath}`;
  } else if (url.includes('portal.spatial.nsw.gov.au')) {
    const servicePath = url.split('server/rest/services/')[1];
    proxyUrl = `/api/nsw/${servicePath}`;
  } else if (url.includes('api.apps1.nsw.gov.au')) {
    const servicePath = url.split('eplanning/')[1];
    proxyUrl = `/api/eplanning/${servicePath}`;
  } else {
    proxyUrl = url.replace(/^https?:\/\//, '/api/proxy/');
  }

  // Add timestamp to bypass caching for image requests
  if (url.includes('/export') || url.includes('GetMap')) {
    proxyUrl += `${proxyUrl.includes('?') ? '&' : '?'}_ts=${Date.now()}`;
  }

  try {
    const response = await fetch(proxyUrl, {
      method: options.method || 'GET',
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0',
        ...options.headers,
      },
      body: options.body,
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

    // For all other responses
    try {
      return await response.json();
    } catch {
      return await response.text();
    }
  } catch (error) {
    console.error('Proxy request failed:', error);
    throw error;
  }
} 