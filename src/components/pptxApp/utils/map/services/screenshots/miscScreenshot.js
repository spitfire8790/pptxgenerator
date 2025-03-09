import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';
import { LAYER_CONFIGS } from '../../config/layerConfigs';
import { calculateBounds, long2tile, lat2tile, mercatorToWGS84 } from './baseScreenshot';
import { createCanvas, drawImage, drawBoundary } from '../../utils/canvas';
import { getWMSImage } from '../wmsService';
import { getArcGISImage } from '../arcgisService';
import { proxyRequest } from '../../../services/proxyService';
import { loadImage } from '../../utils/image';
import { HISTORICAL_LAYERS, METROMAP_CONFIG } from '../../config/historicalLayers';

export async function captureContaminationMap(feature, developableArea = null, showDevelopableArea = true, boundsSource = 'feature') {
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
      // 2. Contamination layer
      const contaminationConfig = {
        url: 'https://mapprod1.environment.nsw.gov.au/arcgis/rest/services/Planning/Contaminated_Land/MapServer',
        layerId: 0, // Contaminated land layer
        size: config.width || config.size,
        padding: config.padding
      };
      
      const params = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${contaminationConfig.size},${contaminationConfig.size}`,
        bbox: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        bboxSR: 4326,
        imageSR: 3857,
        layers: `show:${contaminationConfig.layerId}`,
        dpi: 96
      });

      const contaminationUrl = await proxyRequest(`${contaminationConfig.url}/export?${params.toString()}`);
      const contaminationLayer = await loadImage(contaminationUrl);
      drawImage(ctx, contaminationLayer, canvas.width, canvas.height, 1);
    } catch (error) {
      console.warn('Failed to load contamination layer:', error);
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
    console.warn('Failed to capture contamination map:', error);
    return null;
  }
}

export async function captureOpenStreetMap(feature, developableArea = null, boundsSource = 'feature') {
  if (!feature) return null;
  
  try {
    const config = LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL];
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, boundsSource);
    
    // Create base canvas
    const canvas = createCanvas(config.width || config.size, config.height || config.size);
    const ctx = canvas.getContext('2d', { alpha: true });

    try {
      // OpenStreetMap tiles
      const zoom = 17; // Adjust zoom level as needed
      const xtile = long2tile(centerX, zoom);
      const ytile = lat2tile(centerY, zoom);
      
      // Calculate tile coordinates for the area
      const tilesX = Math.ceil(size / (256 * Math.pow(2, -zoom) * 360)) + 1;
      const tilesY = Math.ceil(size / (256 * Math.pow(2, -zoom) * 180)) + 1;
      
      const halfTilesX = Math.floor(tilesX / 2);
      const halfTilesY = Math.floor(tilesY / 2);
      
      // Load and draw tiles
      for (let x = -halfTilesX; x <= halfTilesX; x++) {
        for (let y = -halfTilesY; y <= halfTilesY; y++) {
          const tileX = xtile + x;
          const tileY = ytile + y;
          
          const tileUrl = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;
          const proxyTileUrl = await proxyRequest(tileUrl);
          const tileImage = await loadImage(proxyTileUrl);
          
          // Calculate position to draw the tile
          const mercatorX = (tileX / Math.pow(2, zoom)) * 360 - 180;
          const mercatorY = Math.atan(Math.sinh(Math.PI * (1 - 2 * tileY / Math.pow(2, zoom)))) * 180 / Math.PI;
          
          // Convert to canvas coordinates
          const canvasX = ((mercatorX - (centerX - size/2)) / size) * canvas.width;
          const canvasY = ((mercatorY - (centerY + size/2)) / -size) * canvas.height;
          
          ctx.drawImage(tileImage, canvasX, canvasY, 256 * (canvas.width / (size * 111319.9)), 256 * (canvas.height / (size * 111319.9)));
        }
      }
    } catch (error) {
      console.warn('Failed to load OpenStreetMap tiles:', error);
    }

    // Add site boundary
    if (feature.geometry?.coordinates?.[0]) {
      drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, canvas.width, {
        strokeStyle: '#FF0000',
        lineWidth: 6
      });
    }

    // Add developable area boundary if available
    if (developableArea?.features?.[0]) {
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, canvas.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.warn('Failed to capture OpenStreetMap:', error);
    return null;
  }
}

export async function captureTECMap(feature, developableArea = null, showDevelopableArea = true, boundsSource = 'feature') {
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
      // 2. TEC layer
      const tecConfig = {
        url: 'https://mapprod1.environment.nsw.gov.au/arcgis/rest/services/Planning/BioNet_Atlas/MapServer',
        layerId: 4, // TEC layer
        size: config.width || config.size,
        padding: config.padding
      };
      
      const params = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${tecConfig.size},${tecConfig.size}`,
        bbox: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        bboxSR: 4326,
        imageSR: 3857,
        layers: `show:${tecConfig.layerId}`,
        dpi: 96
      });

      const tecUrl = await proxyRequest(`${tecConfig.url}/export?${params.toString()}`);
      const tecLayer = await loadImage(tecUrl);
      drawImage(ctx, tecLayer, canvas.width, canvas.height, 1);
    } catch (error) {
      console.warn('Failed to load TEC layer:', error);
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
    console.warn('Failed to capture TEC map:', error);
    return null;
  }
}

export async function captureHistoricalImagery(feature, developableArea = null, showDevelopableArea = true, boundsSource = 'feature') {
  if (!feature) return null;
  
  try {
    const config = LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL];
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, boundsSource);
    
    // Create base canvas
    const canvas = createCanvas(config.width || config.size, config.height || config.size);
    const ctx = canvas.getContext('2d', { alpha: true });

    try {
      // Historical imagery from MetroMap
      const historicalLayer = HISTORICAL_LAYERS[0]; // Use the first historical layer by default
      
      if (historicalLayer) {
        const metromapConfig = {
          ...METROMAP_CONFIG,
          layers: historicalLayer.id,
          width: config.width || config.size,
          height: config.height || config.size,
          padding: config.padding
        };
        
        const historicalImage = await getWMSImage(metromapConfig, centerX, centerY, size);
        drawImage(ctx, historicalImage, canvas.width, canvas.height, 1.0);
      }
    } catch (error) {
      console.warn('Failed to load historical imagery:', error);
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
    console.warn('Failed to capture historical imagery:', error);
    return null;
  }
} 