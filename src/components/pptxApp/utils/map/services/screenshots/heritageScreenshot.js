import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';
import { LAYER_CONFIGS } from '../../config/layerConfigs';
import { calculateBounds } from './baseScreenshot';
import { createCanvas, drawImage, drawBoundary } from '../../utils/canvas';
import { getWMSImage } from '../wmsService';
import { getArcGISImage } from '../arcgisService';
import { proxyRequest } from '../../../services/proxyService';
import { loadImage } from '../../utils/image';

export async function captureHeritageMap(feature, developableArea = null, showDevelopableArea = true, boundsSource = 'feature') {
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
      // 2. Heritage layer
      const heritageConfig = {
        url: 'https://data.cityofsydney.nsw.gov.au/server/rest/services/Hosted/HeritageProps/MapServer',
        layerId: 0, // Heritage properties layer
        size: config.width || config.size,
        padding: config.padding
      };
      
      const params = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${heritageConfig.size},${heritageConfig.size}`,
        bbox: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        bboxSR: 4326,
        imageSR: 3857,
        layers: `show:${heritageConfig.layerId}`,
        dpi: 96
      });

      const heritageUrl = await proxyRequest(`${heritageConfig.url}/export?${params.toString()}`);
      const heritageLayer = await loadImage(heritageUrl);
      drawImage(ctx, heritageLayer, canvas.width, canvas.height, 1);
    } catch (error) {
      console.warn('Failed to load heritage layer:', error);
    }

    // Alternative heritage layer if first one fails
    try {
      const stateHeritageConfig = {
        url: 'https://maps.six.nsw.gov.au/arcgis/rest/services/sixviewer/Heritage/MapServer',
        layerId: 0, // State heritage register
        size: config.width || config.size,
        padding: config.padding
      };
      
      const params = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${stateHeritageConfig.size},${stateHeritageConfig.size}`,
        bbox: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        bboxSR: 4326,
        imageSR: 3857,
        layers: `show:${stateHeritageConfig.layerId}`,
        dpi: 96
      });

      const stateHeritageUrl = await proxyRequest(`${stateHeritageConfig.url}/export?${params.toString()}`);
      const stateHeritageLayer = await loadImage(stateHeritageUrl);
      drawImage(ctx, stateHeritageLayer, canvas.width, canvas.height, 1);
    } catch (error) {
      console.warn('Failed to load state heritage layer:', error);
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
    console.warn('Failed to capture heritage map:', error);
    return null;
  }
} 