export const PROXY_CONFIG = {
  baseUrl: import.meta.env.VITE_PROXY_URL || '/api/proxy',
  allowedDomains: [
    'portal.spatial.nsw.gov.au',
    'mapprod3.environment.nsw.gov.au',
    'maps.six.nsw.gov.au'
  ]
}; 