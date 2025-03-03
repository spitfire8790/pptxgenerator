import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';
import { getWMSImage } from '../wmsService';
import { getArcGISImage } from '../arcgisService';
import { createCanvas, drawImage, drawBoundary } from '../../utils/canvas';
import { proxyRequest } from '../../../services/proxyService';
import { loadImage } from '../../utils/image';
import { calculateBounds } from '../screenshot';
import { LAYER_CONFIGS } from '../../config/layerConfigs';

/**
 * Contour map layer configuration
 */
export const CONTOUR_CONFIG = {
  url: 'https://spatial.industry.nsw.gov.au/arcgis/rest/services/PUBLIC/Contours/MapServer',
  layerId: 0,
  size: 2048,
  width: 2048,
  height: 2048,
  padding: 0.3,
  dpi: 300,
  format: 'png32',
  transparent: true,
  spatialReference: 4283
};

/**
 * Capture a contour map screenshot for the given feature
 * @param {Object} feature - GeoJSON feature
 * @param {Object} developableArea - Optional developable area GeoJSON
 * @param {Boolean} showDevelopableArea - Whether to show the developable area
 * @returns {Promise<String>} Screenshot as a data URL
 */
export async function captureContourMap(feature, developableArea = null, showDevelopableArea = true) {
  if (!feature) return null;
  
  try {
    const config = CONTOUR_CONFIG;
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    
    // Create base canvas
    const canvas = createCanvas(config.width || config.size, config.height || config.size);
    const ctx = canvas.getContext('2d', { alpha: true });

    try {
      // 1. Aerial imagery (base)
      const baseMap = await getWMSImage(LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL], centerX, centerY, size);
      drawImage(ctx, baseMap, canvas.width, canvas.height, 0.3);
    } catch (error) {
      console.warn('Failed to load aerial layer:', error);
    }

    try {
      // 2. Contour lines
      const contourLayer = await getArcGISImage(config, centerX, centerY, size);
      drawImage(ctx, contourLayer, canvas.width, canvas.height, 1);
    } catch (error) {
      console.warn('Failed to load contour layer:', error);
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
    console.warn('Failed to capture contour map:', error);
    return null;
  }
} 