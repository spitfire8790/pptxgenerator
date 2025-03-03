import { LAYER_CONFIGS } from '../../config/layerConfigs';
import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';
import { getWMSImage } from '../wmsService';
import { getArcGISImage } from '../arcgisService';
import { createCanvas, drawImage, drawBoundary } from '../../utils/canvas';
import { proxyRequest } from '../../../services/proxyService';
import { loadImage } from '../../utils/image';
import { calculateBounds } from './shared';
import { giraffeState } from '@gi-nx/iframe-sdk';
import * as turf from '@turf/turf';

/**
 * Flood map configuration
 */
export const FLOOD_CONFIG = {
  baseUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/nsw_1aep_flood_extents/FeatureServer/0',
  layerId: 5180,
  size: 2048,
  padding: 0.3,
  dpi: 300
};

/**
 * Capture a flood map screenshot for the given feature
 * @param {Object} feature - GeoJSON feature
 * @param {Object} developableArea - Optional developable area GeoJSON
 * @param {Boolean} showDevelopableArea - Whether to show the developable area
 * @returns {Promise<String>} Screenshot as a data URL
 */
export async function captureFloodMap(feature, developableArea = null, showDevelopableArea = true) {
  if (!feature) return null;
  
  try {
    const config = FLOOD_CONFIG;
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    
    // Create base canvas
    const canvas = createCanvas(config.width || config.size, config.height || config.size);
    const ctx = canvas.getContext('2d', { alpha: true });

    try {
      // 1. Aerial imagery (base)
      const baseMap = await getWMSImage(LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL], centerX, centerY, size);
      drawImage(ctx, baseMap, canvas.width, canvas.height, 0.7);
    } catch (error) {
      console.warn('Failed to load aerial layer:', error);
    }

    try {
      // 2. PMF (Probable Maximum Flood) Extents
      const pmfConfig = {
        url: 'https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/NSW_PMF_Extents/FeatureServer/0',
        size: config.size
      };
      
      // Get the PMF layer data from Giraffe
      const projectLayers = giraffeState.get("projectLayers") ?? [];
      const pmfLayer = projectLayers.find(layer => 
        layer.layerOptions?.source?.url?.includes('NSW_PMF_Extents')
      );
      
      if (pmfLayer) {
        const featureBbox = turf.bbox(feature);
        const buffer = 0.01; // ~1km buffer
        const bboxWithBuffer = [
          featureBbox[0] - buffer,
          featureBbox[1] - buffer,
          featureBbox[2] + buffer,
          featureBbox[3] + buffer
        ];
        
        // Query PMF layer within the buffered bbox
        const query = {
          geometry: {
            spatialReference: { wkid: 4326 },
            xmin: bboxWithBuffer[0],
            ymin: bboxWithBuffer[1],
            xmax: bboxWithBuffer[2],
            ymax: bboxWithBuffer[3]
          },
          outFields: ['*'],
          returnGeometry: true,
          outSpatialReference: { wkid: 4326 },
          f: 'geojson'
        };
        
        const queryUrl = `${pmfConfig.url}/query?${new URLSearchParams(query)}`;
        const response = await fetch(queryUrl);
        const pmfData = await response.json();
        
        if (pmfData.features.length > 0) {
          // Draw PMF data with semi-transparent blue
          pmfData.features.forEach(pmfFeature => {
            if (pmfFeature.geometry.type === 'Polygon') {
              drawBoundary(ctx, pmfFeature.geometry.coordinates[0], centerX, centerY, size, canvas.width, {
                strokeStyle: 'rgba(100, 149, 237, 0.5)',
                lineWidth: 2,
                fillStyle: 'rgba(100, 149, 237, 0.2)'
              });
            }
          });
        }
      }
    } catch (error) {
      console.warn('Failed to load PMF layer:', error);
    }

    try {
      // 3. 1% AEP Flood Extents (1 in 100 year flood)
      // Check Giraffe for NSW flood data
      const projectLayers = giraffeState.get("projectLayers") ?? [];
      const floodLayer = projectLayers.find(layer => 
        layer.layerOptions?.source?.url?.includes('nsw_1aep_flood_extents')
      );
      
      if (floodLayer) {
        const featureBbox = turf.bbox(feature);
        const buffer = 0.01; // ~1km buffer
        const bboxWithBuffer = [
          featureBbox[0] - buffer,
          featureBbox[1] - buffer,
          featureBbox[2] + buffer,
          featureBbox[3] + buffer
        ];
        
        // Query flood layer within the buffered bbox
        const query = {
          geometry: {
            spatialReference: { wkid: 4326 },
            xmin: bboxWithBuffer[0],
            ymin: bboxWithBuffer[1],
            xmax: bboxWithBuffer[2],
            ymax: bboxWithBuffer[3]
          },
          outFields: ['*'],
          returnGeometry: true,
          outSpatialReference: { wkid: 4326 },
          f: 'geojson'
        };
        
        const queryUrl = `${config.baseUrl}/query?${new URLSearchParams(query)}`;
        const response = await fetch(queryUrl);
        const floodData = await response.json();
        
        if (floodData.features.length > 0) {
          // Draw flood data with semi-transparent blue (darker than PMF)
          floodData.features.forEach(floodFeature => {
            if (floodFeature.geometry.type === 'Polygon') {
              drawBoundary(ctx, floodFeature.geometry.coordinates[0], centerX, centerY, size, canvas.width, {
                strokeStyle: 'rgba(30, 144, 255, 0.8)',
                lineWidth: 2,
                fillStyle: 'rgba(30, 144, 255, 0.4)'
              });
            }
          });
        }
      } else {
        // Fallback to direct query if not in Giraffe
        const floodParams = new URLSearchParams({
          f: 'geojson',
          where: '1=1',
          outFields: '*',
          geometry: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
          geometryType: 'esriGeometryEnvelope',
          inSR: 4326,
          spatialRel: 'esriSpatialRelIntersects',
          outSR: 4326
        });
        
        const floodUrl = await proxyRequest(`${config.baseUrl}/query?${floodParams.toString()}`);
        const response = await fetch(floodUrl);
        const floodData = await response.json();
        
        if (floodData.features && floodData.features.length > 0) {
          // Draw flood data
          floodData.features.forEach(floodFeature => {
            if (floodFeature.geometry.type === 'Polygon') {
              drawBoundary(ctx, floodFeature.geometry.coordinates[0], centerX, centerY, size, canvas.width, {
                strokeStyle: 'rgba(30, 144, 255, 0.8)',
                lineWidth: 2,
                fillStyle: 'rgba(30, 144, 255, 0.4)'
              });
            }
          });
        }
      }
    } catch (error) {
      console.warn('Failed to load 1% AEP flood layer:', error);
    }

    // Draw property boundary
    if (feature.geometry?.coordinates?.[0]) {
      drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width || config.size, {
        strokeStyle: '#FF0000',
        lineWidth: 6
      });
    }

    // Draw developable area if available
    if (developableArea?.features?.[0] && showDevelopableArea) {
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width || config.size, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.warn('Failed to capture flood map:', error);
    return null;
  }
} 