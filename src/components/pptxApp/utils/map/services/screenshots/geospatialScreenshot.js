import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';
import { LAYER_CONFIGS } from '../../config/layerConfigs';
import { calculateBounds } from './baseScreenshot';
import { createCanvas, drawImage, drawBoundary } from '../../utils/canvas';
import { getWMSImage } from '../wmsService';
import { getArcGISImage } from '../arcgisService';
import { proxyRequest } from '../../../services/proxyService';
import { loadImage } from '../../utils/image';

export async function captureGeoscapeMap(feature, developableArea = null, showDevelopableArea = true, boundsSource = 'feature') {
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
      // 2. Geoscape layer
      const geoscapeConfig = {
        url: 'https://services.ga.gov.au/gis/rest/services/NationalMap_Colour_Topographic_Base_World_WM/MapServer',
        layerId: 0, // Geoscape layer
        size: config.width || config.size,
        padding: config.padding
      };
      
      const params = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${geoscapeConfig.size},${geoscapeConfig.size}`,
        bbox: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        bboxSR: 4326,
        imageSR: 3857,
        layers: `show:${geoscapeConfig.layerId}`,
        dpi: 96
      });

      const geoscapeUrl = await proxyRequest(`${geoscapeConfig.url}/export?${params.toString()}`);
      const geoscapeLayer = await loadImage(geoscapeUrl);
      drawImage(ctx, geoscapeLayer, canvas.width, canvas.height, 0.8);
    } catch (error) {
      console.warn('Failed to load geoscape layer:', error);
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
    console.warn('Failed to capture geoscape map:', error);
    return null;
  }
} 