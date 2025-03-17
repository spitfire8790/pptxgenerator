import { LAYER_CONFIGS } from '../../config/layerConfigs';
import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';
import { calculateMercatorParams } from '../../utils/coordinates';
import { getWMSImage } from '../wmsService';
import { getArcGISImage } from '../arcgisService';
import { createCanvas, drawImage, drawBoundary, drawPolyline } from '../../utils/canvas';
import { proxyRequest } from '../../../services/proxyService';
import { loadImage } from '../../utils/image';
import { giraffeState } from '@gi-nx/iframe-sdk';
import proj4 from 'proj4';
import { getPTALToken } from '../tokenService';
import * as turf from '@turf/turf';
import { calculateBounds } from '../../utils/boundsUtils';
import { drawFeatureBoundaries, drawDevelopableAreaBoundaries, drawRoundedTextBox } from '../../utils/drawingUtils';

// Layer configurations
const LAYER_CONFIG_GEOSCAPE = {
  baseUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/BLDS_Mar24_Geoscape/FeatureServer/0',
  layerId: 20976,
  width: 2048,
  height: 2048,
  padding: 0.2,
  dpi: 300,
  format: 'png32',
  transparent: true,
  showBoundary: true
};

const LAYER_CONFIG_AERIAL = {
  url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service',
  layers: 'Australia_latest',
  opacity: 0.7,
  width: 2048,
  height: 2048,
  padding: 0.2,
  dpi: 300,
  fallbackUrl: 'https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Imagery/MapServer',
  fallbackFormat: 'png32',
  fallbackTransparent: false,
  fallbackSpatialReference: 102100
};

// Helper function to handle Giraffe layers proxy requests with fallback
async function fetchFromGiraffeLayers(url) {
  try {
    // First try direct fetch (which may fail with CORS)
    console.log('Attempting direct fetch from Giraffe layers:', url);
    const response = await fetch(url);
    if (response.ok) {
      console.log('Direct fetch from Giraffe layers succeeded');
      return await response.json();
    }
    throw new Error('Direct fetch failed');
  } catch (error) {
    console.warn('Direct fetch from Giraffe layers failed, falling back to proxy:', error.message);
    // Fall back to proxy
    try {
      return await proxyRequest(url);
    } catch (proxyError) {
      console.error('Proxy fetch also failed:', proxyError);
      throw proxyError;
    }
  }
}

export async function captureGeoscapeMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false) {
    if (!feature) return null;
    console.log('Starting geoscape capture...');
  
    try {
      const config = LAYER_CONFIG_GEOSCAPE;
      const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
      let geoscapeFeatures = [];
      
      console.log('Raw coordinates:', { centerX, centerY, size });
      
      // Create base canvas
      const canvas = createCanvas(config.width, config.height);
      const ctx = canvas.getContext('2d', { alpha: true });
  
      try {
        // 1. Aerial imagery (base) - Use Mercator coordinates
        console.log('Loading aerial base layer...');
        const aerialConfig = LAYER_CONFIG_AERIAL;
        const { bbox } = calculateMercatorParams(centerX, centerY, size);
        
        const params = new URLSearchParams({
          SERVICE: 'WMS',
          VERSION: '1.3.0',
          REQUEST: 'GetMap',
          BBOX: bbox,
          CRS: 'EPSG:3857',
          WIDTH: aerialConfig.width,
          HEIGHT: aerialConfig.height,
          LAYERS: aerialConfig.layers,
          STYLES: '',
          FORMAT: 'image/png',
          DPI: 300,
          MAP_RESOLUTION: 300,
          FORMAT_OPTIONS: 'dpi:300'
        });
  
        const url = `${aerialConfig.url}?${params.toString()}`;
        console.log('Aerial request URL:', url);
        try {
          const baseMap = await loadImage(url);
          console.log('Aerial layer loaded');
          drawImage(ctx, baseMap, canvas.width, canvas.height, aerialConfig.opacity);
        } catch (loadError) {
          console.warn('Failed to load aerial layer directly, trying with proxy:', loadError);
          // Try with proxy if direct load fails
          const proxyUrl = await proxyRequest(url);
          const baseMap = await loadImage(proxyUrl);
          drawImage(ctx, baseMap, canvas.width, canvas.height, aerialConfig.opacity);
        }
      } catch (error) {
        console.error('Failed to load aerial layer:', error);
      }
  
      try {
        // 2. Geoscape layer from Giraffe
        console.log('Starting geoscape layer capture...');
        
        // Get the geoscape layer data from Giraffe
        console.log('Fetching project layers from Giraffe...');
        const projectLayers = await giraffeState.get('projectLayers');
        const geoscapeLayer = projectLayers?.find(layer => layer.layer === config.layerId);
        console.log('Found geoscape layer:', geoscapeLayer);
        
        if (geoscapeLayer) {
          console.log('Calculating Mercator parameters...');
          const { bbox } = calculateMercatorParams(centerX, centerY, size);
          console.log('Bbox:', bbox);
          
          // Extract the actual service URL and token from the vector tiles URL
          const vectorTileUrl = geoscapeLayer.layer_full?.vector_source?.tiles?.[0];
          console.log('Vector tile URL:', vectorTileUrl);
          
          if (vectorTileUrl) {
            const decodedUrl = decodeURIComponent(vectorTileUrl.split('/featureServer/{z}/{x}/{y}/')?.[1] || '');
            console.log('Decoded URL:', decodedUrl);
            
            const extractedToken = decodedUrl.split('token=')?.[1]?.split('&')?.[0];
            console.log('Extracted token:', extractedToken);
            
            const params = new URLSearchParams({
              where: '1=1',
              geometry: bbox,
              geometryType: 'esriGeometryEnvelope',
              inSR: 3857,
              spatialRel: 'esriSpatialRelIntersects',
              outFields: '*',
              returnGeometry: true,
              f: 'geojson',
              token: extractedToken
            });
  
            const url = `${config.baseUrl}/query?${params.toString()}`;
            console.log('Final geoscape request URL (with sensitive info removed):', url.replace(extractedToken, 'REDACTED'));
            
            // Use fetchFromGiraffeLayers for better error handling
            const geoscapeResponse = await fetchFromGiraffeLayers(url);
            console.log('Geoscape response:', geoscapeResponse);
  
            if (geoscapeResponse.features?.length > 0) {
              console.log(`Drawing ${geoscapeResponse.features.length} geoscape features...`);
              geoscapeFeatures = geoscapeResponse.features;
              
              // Store the features directly in the feature object with proper GeoJSON structure
              if (!feature.properties) {
                feature.properties = {};
              }
              // Ensure each feature has valid geometry before storing
              feature.properties.geoscapeFeatures = {
                type: 'FeatureCollection',
                features: geoscapeFeatures.filter(f => {
                  // Validate geometry
                  if (!f.geometry || !f.geometry.coordinates || !Array.isArray(f.geometry.coordinates)) {
                    console.warn('Invalid geoscape feature geometry:', f);
                    return false;
                  }
                  // For Polygon, ensure it has at least one ring with 3 points
                  if (f.geometry.type === 'Polygon' && 
                      (!Array.isArray(f.geometry.coordinates[0]) || f.geometry.coordinates[0].length < 3)) {
                    console.warn('Invalid polygon geometry:', f);
                    return false;
                  }
                  // For MultiPolygon, ensure each polygon has at least one ring with 3 points
                  if (f.geometry.type === 'MultiPolygon') {
                    return f.geometry.coordinates.every(poly => 
                      Array.isArray(poly[0]) && poly[0].length >= 3
                    );
                  }
                  return true;
                })
              };
              
              geoscapeFeatures.forEach((geoscapeFeature, index) => {
                console.log(`Drawing geoscape feature ${index + 1}...`);
                if (geoscapeFeature.geometry?.coordinates?.[0]) {
                  drawBoundary(ctx, geoscapeFeature.geometry.coordinates[0], centerX, centerY, size, config.width, {
                    fill: true,
                    strokeStyle: 'rgba(255, 165, 0, 0.8)',
                    fillStyle: 'rgba(255, 165, 0, 0.6)',
                    lineWidth: 2
                  });
                }
              });
              console.log('Finished drawing geoscape features');
            } else {
              console.log('No geoscape features found in response');
            }
          }
        } else {
          console.log('Geoscape layer not found in project layers');
        }
      } catch (error) {
        console.error('Failed to load geoscape layer:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
  
      // Draw boundaries without labels
      drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width, {
        strokeStyle: '#FF0000',
        lineWidth: 6,
        showLabels: false
      });
  
      if (developableArea?.features?.length > 0 && showDevelopableArea) {
        // Draw developable areas without labels
        drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width, false);
      }
  
      return {
        image: canvas.toDataURL('image/png', 1.0),
        features: geoscapeFeatures
      };
    } catch (error) {
      console.error('Failed to capture geoscape map:', error);
      return null;
    }
  }