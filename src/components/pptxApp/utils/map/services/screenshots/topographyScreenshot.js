import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';
import { LAYER_CONFIGS } from '../../config/layerConfigs';
import { calculateBounds } from './baseScreenshot';
import { createCanvas, drawImage, drawBoundary } from '../../utils/canvas';
import { getWMSImage } from '../wmsService';
import { getArcGISImage } from '../arcgisService';
import { proxyRequest } from '../../../services/proxyService';
import { loadImage } from '../../utils/image';

export async function captureContourMap(feature, developableArea = null, showDevelopableArea = true, boundsSource = 'feature') {
  if (!feature) return null;
  
  try {
    const config = LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL];
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, boundsSource);
    
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
      // 2. Contour layer
      const contourConfig = {
        url: 'https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Topographic_Map/MapServer',
        layerId: 5, // Contour layer
        size: config.width || config.size,
        padding: config.padding
      };
      
      const params = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${contourConfig.size},${contourConfig.size}`,
        bbox: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        bboxSR: 4326,
        imageSR: 3857,
        layers: `show:${contourConfig.layerId}`,
        dpi: 96
      });

      const contourUrl = await proxyRequest(`${contourConfig.url}/export?${params.toString()}`);
      const contourLayer = await loadImage(contourUrl);
      drawImage(ctx, contourLayer, canvas.width, canvas.height, 1);
    } catch (error) {
      console.warn('Failed to load contour layer:', error);
    }

    // Add site boundary
    if (feature.geometry?.coordinates?.[0]) {
      drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, canvas.width, {
        strokeStyle: '#FF0000',
        lineWidth: 6
      });
    }

    // Add developable area boundary if available
    if (developableArea?.features?.[0] && showDevelopableArea) {
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, canvas.width, {
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

export async function captureRegularityMap(feature, developableArea = null, showDevelopableArea = true, boundsSource = 'feature') {
  if (!feature) return null;
  
  try {
    const config = LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL];
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, boundsSource);
    
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
      // 2. Cadastre layer
      const cadastreConfig = {
        url: 'https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Cadastre/MapServer',
        layerId: 9,
        size: config.width || config.size,
        padding: config.padding
      };
      
      const params = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${cadastreConfig.size},${cadastreConfig.size}`,
        bbox: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        bboxSR: 4326,
        imageSR: 3857,
        layers: `show:${cadastreConfig.layerId}`,
        dpi: 96
      });

      const cadastreUrl = await proxyRequest(`${cadastreConfig.url}/export?${params.toString()}`);
      const cadastreLayer = await loadImage(cadastreUrl);
      drawImage(ctx, cadastreLayer, canvas.width, canvas.height, 1);
    } catch (error) {
      console.warn('Failed to load cadastre layer:', error);
    }

    // Add site boundary
    if (feature.geometry?.coordinates?.[0]) {
      drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, canvas.width, {
        strokeStyle: '#FF0000',
        lineWidth: 6
      });
    }

    // Add developable area boundary if available
    if (developableArea?.features?.[0] && showDevelopableArea) {
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, canvas.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.warn('Failed to capture regularity map:', error);
    return null;
  }
} 