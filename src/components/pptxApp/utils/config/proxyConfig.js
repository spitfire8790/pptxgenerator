export const PROXY_CONFIG = {
  baseUrl: import.meta.env.VITE_PROXY_URL || '/api/proxy',
  allowedDomains: [
    'portal.spatial.nsw.gov.au',
    'mapprod3.environment.nsw.gov.au',
    'maps.six.nsw.gov.au',
    'portal.data.nsw.gov.au',
    'services.ga.gov.au',
    'www.lmbc.nsw.gov.au',
    'mapuat3.environment.nsw.gov.au',
    'spatial.industry.nsw.gov.au',
    'sims.spatial.nsw.gov.au'
  ]
}; 