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
const LAYER_CONFIG_SEWER = {
  baseUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/NSW_Water_Sewer_Infrastructure/FeatureServer/11',
  layerId: 14112,
  size: 2048,
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
  opacity: 1,
  width: 2048,
  height: 2048,
  padding: 0.2,
  dpi: 300,
  fallbackUrl: 'https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Imagery/MapServer',
  fallbackFormat: 'png32',
  fallbackTransparent: false,
  fallbackSpatialReference: 102100
};

export async function captureSewerMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false) {
    if (!feature) return null;
    console.log('Starting sewer infrastructure capture...');
  
    try {
      const config = LAYER_CONFIG_SEWER;
      const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
      let sewerFeatures = [];
      
      console.log('Raw coordinates:', { centerX, centerY, size });
      
      // Create base canvas
      const canvas = createCanvas(config.width || config.size, config.height || config.size);
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
          WIDTH: aerialConfig.width || aerialConfig.size,
          HEIGHT: aerialConfig.height || aerialConfig.size,
          LAYERS: aerialConfig.layers,
          STYLES: '',
          FORMAT: 'image/png',
          DPI: 300,
          MAP_RESOLUTION: 300,
          FORMAT_OPTIONS: 'dpi:300'
        });
  
        const url = `${aerialConfig.url}?${params.toString()}`;
        console.log('Aerial request URL:', url);
        const baseMap = await loadImage(url);
        console.log('Aerial layer loaded');
        drawImage(ctx, baseMap, canvas.width, canvas.height, 0.5);
      } catch (error) {
        console.error('Failed to load aerial layer:', error);
      }
  
      try {
        // 2. Sewer infrastructure layer
        console.log('Loading sewer infrastructure layer...');
        
        // Get the sewer layer data from Giraffe
        console.log('Fetching project layers from Giraffe...');
        const projectLayers = await giraffeState.get('projectLayers');
        const sewerLayer = projectLayers?.find(layer => layer.layer === config.layerId);
        console.log('Found sewer layer:', sewerLayer);
        
        if (sewerLayer) {
          console.log('Calculating Mercator parameters...');
          const { bbox } = calculateMercatorParams(centerX, centerY, size);
          console.log('Bbox:', bbox);
          
          // Extract the actual service URL and token from the vector tiles URL
          const vectorTileUrl = sewerLayer.layer_full?.vector_source?.tiles?.[0];
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
            console.log('Final sewer request URL (with sensitive info removed):', url.replace(extractedToken, 'REDACTED'));
            
            const sewerResponse = await proxyRequest(url);
            console.log('Sewer response:', sewerResponse);
  
            if (sewerResponse.features?.length > 0) {
              console.log(`Drawing ${sewerResponse.features.length} sewer features...`);
              sewerFeatures = sewerResponse.features;
  
              // Store the features directly in the feature object
              if (!feature.properties) {
                feature.properties = {};
              }
              feature.properties.sewerFeatures = sewerFeatures;
  
              sewerFeatures.forEach((feature, index) => {
                console.log(`Drawing sewer feature ${index + 1}...`);
                drawBoundary(ctx, feature.geometry.coordinates, centerX, centerY, size, config.width || config.size, {
                  strokeStyle: '#964B00',
                  lineWidth: 8
                });
              });
              console.log('Finished drawing sewer features');
            } else {
              console.log('No sewer features found in response');
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load sewer infrastructure layer:', error);
      }
  
      // Draw boundaries without labels
      drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width || config.size, {
        strokeStyle: '#FF0000',
        lineWidth: 6,
        showLabels: false
      });
  
      if (developableArea?.features?.length > 0 && showDevelopableArea) {
        // Use the helper function to draw developable areas without labels
        drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width || config.size, false);
      }
  
      return {
        image: canvas.toDataURL('image/png', 1.0),
        features: sewerFeatures
      };
  
    } catch (error) {
      console.error('Failed to capture sewer infrastructure map:', error);
      return null;
    }
  }