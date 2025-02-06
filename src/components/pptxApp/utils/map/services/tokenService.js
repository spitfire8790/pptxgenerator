// Token cache object
const tokenCache = {
  ptal: {
    token: null,
    expiresAt: null
  }
};

// Constants
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
const PORTAL_URL = 'https://portal.data.nsw.gov.au/arcgis';

import { proxyRequest } from '../../services/proxyService';

// Credentials
const CREDENTIALS = {
  username: 'james.strutt@dpie.nsw.gov.au',
  password: 'B6pwt266^&&^'
};

/**
 * Generates a new PTAL token
 * @returns {Promise<string>} The generated token
 */
async function generatePTALToken() {
  try {
    const tokenUrl = `${PORTAL_URL}/sharing/rest/generateToken`;
    
    const params = new URLSearchParams({
      username: CREDENTIALS.username,
      password: CREDENTIALS.password,
      referer: window.location.origin,
      expiration: 60,
      f: 'json',
      client: 'referer'
    });

    console.log('Requesting PTAL token through proxy...');
    
    const data = await proxyRequest(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (data.error) {
      throw new Error(data.error.message || 'Failed to generate token');
    }

    if (!data || !data.token) {
      throw new Error('No token received in response');
    }

    return data.token;
  } catch (error) {
    console.error('Error generating PTAL token:', error);
    throw error;
  }
}

/**
 * Gets a valid PTAL token, either from cache or by generating a new one
 * @returns {Promise<string>} A valid token
 */
export async function getPTALToken() {
  const now = Date.now();

  // Check if we have a valid cached token
  if (
    tokenCache.ptal.token &&
    tokenCache.ptal.expiresAt &&
    tokenCache.ptal.expiresAt - now > TOKEN_REFRESH_THRESHOLD
  ) {
    return tokenCache.ptal.token;
  }

  // Generate new token
  try {
    const token = await generatePTALToken();
    
    // Update cache
    tokenCache.ptal.token = token;
    tokenCache.ptal.expiresAt = now + (60 * 60 * 1000); // Set expiration to 1 hour from now

    return token;
  } catch (error) {
    // If token generation fails, try to use cached token if available
    if (tokenCache.ptal.token) {
      console.warn('Token generation failed, using cached token:', error);
      return tokenCache.ptal.token;
    }
    throw error;
  }
}

/**
 * Clears the cached PTAL token
 */
export function clearPTALTokenCache() {
  tokenCache.ptal.token = null;
  tokenCache.ptal.expiresAt = null;
} 