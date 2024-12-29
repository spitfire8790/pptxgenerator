import { LAYER_CONFIGS } from '../config/layerConfigs';
import { SCREENSHOT_TYPES } from '../config/screenshotTypes';
import { calculateMercatorParams } from '../utils/coordinates';
import { getWMSImage } from './wmsService';
import { getArcGISImage } from './arcgisService';
import { createCanvas, drawImage, drawBoundary } from '../utils/canvas';

export async function captureMapScreenshot(feature, type = SCREENSHOT_TYPES.SNAPSHOT, drawBoundaryLine = true, developableArea = null) {
  if (!feature || !LAYER_CONFIGS[type]) return null;
  
  try {
    const config = LAYER_CONFIGS[type];
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    
    // Remove or comment out debug logs
    // console.log('Screenshot capture params:', {...});

    const baseMapImage = config.layerId ? 
      await getWMSImage(LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL], centerX, centerY, size) : 
      null;

    const mainImage = config.layerId ?
      await getArcGISImage(config, centerX, centerY, size) :
      await getWMSImage(config, centerX, centerY, size);

    const canvas = createCanvas(config.width || config.size, config.height || config.size);
    const ctx = canvas.getContext('2d', { alpha: true });

    if (baseMapImage) {
      drawImage(ctx, baseMapImage, canvas.width, canvas.height, 0.7);
    }
    
    drawImage(ctx, mainImage, canvas.width, canvas.height, config.layerId ? 0.7 : 1.0);

    if (developableArea?.features?.[0]) {
      // Remove console.log
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.size || config.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    if (drawBoundaryLine) {
      // Remove console.log
      drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.size || config.width, {
        strokeStyle: '#FF0000',
        lineWidth: 6
      });
    }

    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.warn('Failed to capture screenshot:', error);
    return null;
  }
}

function calculateBounds(feature, padding, developableArea = null) {
  // Start with property bounds
  let coordinates = feature.geometry.coordinates[0];
  
  // If we have a developable area, include its coordinates too
  if (developableArea?.features?.[0]) {
    coordinates = [
      ...coordinates,
      ...developableArea.features[0].geometry.coordinates[0]
    ];
  }

  const bounds = coordinates.reduce((acc, coord) => ({
    minX: Math.min(acc.minX, coord[0]),
    minY: Math.min(acc.minY, coord[1]),
    maxX: Math.max(acc.maxX, coord[0]),
    maxY: Math.max(acc.maxY, coord[1])
  }), {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity
  });

  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const width = Math.abs(bounds.maxX - bounds.minX);
  const height = Math.abs(bounds.maxY - bounds.minY);
  const size = Math.max(width, height) * (1 + padding * 2);

  return { centerX, centerY, size };
}

export async function capturePrimarySiteAttributesMap(feature, developableArea = null) {
  if (!feature) return null;
  
  try {
    const config = LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL];
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    
    // Create base canvas
    const canvas = createCanvas(config.width || config.size, config.height || config.size);
    const ctx = canvas.getContext('2d', { alpha: true });

    try {
      // 1. Aerial imagery (base)
      const baseMap = await getWMSImage(LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL], centerX, centerY, size);
      drawImage(ctx, baseMap, canvas.width, canvas.height, 1.0);
    } catch (error) {
      console.warn('Failed to load aerial layer:', error);
    }

    try {
      // 2. Zoning
      const zoningLayer = await getArcGISImage(LAYER_CONFIGS[SCREENSHOT_TYPES.ZONING], centerX, centerY, size);
      drawImage(ctx, zoningLayer, canvas.width, canvas.height, 0.5);
    } catch (error) {
      console.warn('Failed to load zoning layer:', error);
    }

    // Continue with other layers, each in their own try-catch
    try {
      // 3. Easements
      const easementsConfig = {
        url: 'https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Land_Parcel_Property_Theme/MapServer',
        layerId: 9,
        size: 2048,
        padding: 0.2
      };
      const easementsLayer = await getArcGISImage(easementsConfig, centerX, centerY, size);
      drawImage(ctx, easementsLayer, canvas.width, canvas.height, 0.5);
    } catch (error) {
      console.warn('Failed to load easements layer:', error);
    }

    // Continue with remaining layers...

    // Always draw boundaries even if some layers fail
    drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.size || config.width, {
      strokeStyle: '#FF0000',
      lineWidth: 6
    });

    if (developableArea?.features?.[0]) {
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.size || config.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Failed to capture primary site attributes map:', error);
    return null; // Return null instead of throwing
  }
}

export async function captureContourMap(feature, developableArea = null) {
  if (!feature) return null;
  
  try {
    const config = LAYER_CONFIGS[SCREENSHOT_TYPES.CONTOUR];
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    const { centerMercX, centerMercY, sizeInMeters } = calculateMercatorParams(centerX, centerY, size);
    
    console.log('Contour map params:', { centerMercX, centerMercY, sizeInMeters });
    
    // Create base canvas
    const canvas = createCanvas(config.width || config.size, config.height || config.size);
    const ctx = canvas.getContext('2d', { alpha: true });

    try {
      // 1. Aerial imagery (base)
      console.log('Loading aerial layer...');
      const baseMap = await getWMSImage(LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL], centerMercX, centerMercY, sizeInMeters);
      console.log('Aerial layer loaded');
      drawImage(ctx, baseMap, canvas.width, canvas.height, 1.0);
    } catch (error) {
      console.warn('Failed to load aerial layer:', error);
    }

    try {
      // 2. Contour layer with reduced opacity
      console.log('Loading contour layer...');
      const contourLayer = await getArcGISImage(LAYER_CONFIGS[SCREENSHOT_TYPES.CONTOUR], centerMercX, centerMercY, sizeInMeters);
      console.log('Contour layer loaded');
      drawImage(ctx, contourLayer, canvas.width, canvas.height, 0.6);
    } catch (error) {
      console.warn('Failed to load contour layer:', error);
    }

    // 3. Draw boundaries using original coordinates
    drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.size || config.width, {
      strokeStyle: '#FF0000',
      lineWidth: 3
    });

    // 4. Draw developable area if available
    if (developableArea?.features?.[0]) {
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.size || config.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 3,
        dashArray: [10, 5]
      });
    }

    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Failed to capture contour map:', error);
    return null;
  }
} 