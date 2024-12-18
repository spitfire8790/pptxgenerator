import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/eplanning': {
        target: 'https://api.apps1.nsw.gov.au/eplanning',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/eplanning/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Clear existing headers to prevent duplicates
            proxyReq.removeHeader('PageSize');
            proxyReq.removeHeader('PageNumber');
            proxyReq.removeHeader('filters');

            // Set headers with correct casing as per API documentation
            if (req.headers.pagesize) {
              proxyReq.setHeader('PageSize', req.headers.pagesize);
            }
            if (req.headers.pagenumber) {
              proxyReq.setHeader('PageNumber', req.headers.pagenumber);
            }
            if (req.headers.filters) {
              proxyReq.setHeader('filters', req.headers.filters);
            }

            // Set required headers for the NSW Planning Portal API
            proxyReq.setHeader('Accept', 'application/json');
            proxyReq.setHeader('Content-Type', 'application/json');

            // Log the outgoing request for debugging
            console.log('Proxying request:', {
              method: req.method,
              url: req.url,
              headers: proxyReq.getHeaders(),
              targetUrl: `${proxy.options.target}${req.url.replace('/api/eplanning', '')}`
            });
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            // Set CORS headers
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
            proxyRes.headers['Access-Control-Allow-Headers'] = 'PageSize, PageNumber, filters, Content-Type, Accept';

            // Log the response for debugging
            console.log('Received response:', {
              method: req.method,
              url: req.url,
              status: proxyRes.statusCode,
              headers: proxyRes.headers
            });
          });
        }
      }
    }
  },
  assetsInclude: ['**/*.csv'],
})
