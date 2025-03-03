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
 * Primary site attributes map configuration
 */
export const PRIMARY_SITE_CONFIG = {
  size: 2048,
  width: 2048,
  height: 2048,
  padding: 0.3,
  dpi: 300
};

/**
 * Capture a primary site attributes map screenshot for the given feature
 * @param {Object} feature - GeoJSON feature
 * @param {Object} developableArea - Optional developable area GeoJSON
 * @param {Boolean} showDevelopableArea - Whether to show the developable area
 * @returns {Promise<String>} Screenshot as a data URL
 */
export async function capturePrimarySiteAttributesMap(feature, developableArea = null, showDevelopableArea = true) {
  if (!feature) return null;
  
  try {
    const config = PRIMARY_SITE_CONFIG;
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
      // 2. Zoning
      const zoningLayer = await getArcGISImage(LAYER_CONFIGS[SCREENSHOT_TYPES.ZONING], centerX, centerY, size);
      drawImage(ctx, zoningLayer, canvas.width, canvas.height, 0.3);
    } catch (error) {
      console.warn('Failed to load zoning layer:', error);
    }

    try {
      // 3. Easements layer 
      const easementsConfig = {
        url: 'https://mapuat3.environment.nsw.gov.au/arcgis/rest/services/Common/Admin_3857/MapServer',
        layerId: 25,
        size: 2048,
        padding: 0.2
      };

      const params = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${easementsConfig.size},${easementsConfig.size}`,
        bbox: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        bboxSR: 4326,
        imageSR: 3857,
        layers: `show:${easementsConfig.layerId}`,
        dpi: 96
      });

      // Use proxy service to avoid CORS issues
      const easementsUrl = await proxyRequest(`${easementsConfig.url}/export?${params.toString()}`);
      const easementsLayer = await loadImage(easementsUrl);
      drawImage(ctx, easementsLayer, canvas.width, canvas.height, 1);
    } catch (error) {
      console.warn('Failed to load easements layer:', error);
    }

    try {
      // 4. Biodiversity Values
      const biodiversityConfig = {
        url: 'https://www.lmbc.nsw.gov.au/arcgis/rest/services/BV/BiodiversityValues/MapServer',
        layerId: 0,
        size: 2048,
        padding: 0.2
      };
      const biodiversityUrl = await proxyRequest(`${biodiversityConfig.url}/export?${new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${biodiversityConfig.size},${biodiversityConfig.size}`,
        bbox: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        bboxSR: 4283,
        imageSR: 4283,
        layers: `show:${biodiversityConfig.layerId}`,
        dpi: 96
      })}`);
      const biodiversityLayer = await loadImage(biodiversityUrl);
      drawImage(ctx, biodiversityLayer, canvas.width, canvas.height, 1);
    } catch (error) {
      console.warn('Failed to load biodiversity layer:', error);
    }

    try {
      // 5. High Voltage Power Lines
      const powerLinesConfig = {
        url: 'https://services.ga.gov.au/gis/rest/services/Foundation_Electricity_Infrastructure/MapServer',
        layerId: 2,
        size: 2048,
        padding: 0.2
      };
      const powerLinesUrl = await proxyRequest(`${powerLinesConfig.url}/export?${new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${powerLinesConfig.size},${powerLinesConfig.size}`,
        bbox: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        bboxSR: 4283,
        imageSR: 4283,
        layers: `show:${powerLinesConfig.layerId}`,
        dpi: 96
      })}`);
      const powerLinesLayer = await loadImage(powerLinesUrl);
      drawImage(ctx, powerLinesLayer, canvas.width, canvas.height, 1);
    } catch (error) {
      console.warn('Failed to load power lines layer:', error);
    }

    try {
      // 6. 1AEP Flood Extents from Giraffe layer
      const floodConfig = {
        baseUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/nsw_1aep_flood_extents/FeatureServer/0',
        layerId: 5180
      };

      // Get the flood layer data from Giraffe
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
        
        const queryUrl = `${floodConfig.baseUrl}/query?${new URLSearchParams(query)}`;
        const response = await fetch(queryUrl);
        const floodData = await response.json();
        
        if (floodData.features.length > 0) {
          // Draw flood data with semi-transparent blue
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
      console.warn('Failed to load flood layer:', error);
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
    console.warn('Failed to capture primary site attributes map:', error);
    return null;
  }
} 