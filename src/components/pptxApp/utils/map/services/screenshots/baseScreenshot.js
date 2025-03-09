import { LAYER_CONFIGS } from '../../config/layerConfigs';
import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';
import { calculateMercatorParams } from '../../utils/coordinates';
import { getWMSImage } from '../wmsService';
import { getArcGISImage } from '../arcgisService';
import { createCanvas, drawImage, drawBoundary, drawPolyline } from '../../utils/canvas';
import { proxyRequest } from '../../../services/proxyService';
import { loadImage } from '../../utils/image';
import proj4 from 'proj4';
import * as turf from '@turf/turf';

export function calculateBounds(feature, padding, developableArea = null, boundsSource = 'feature') {
  // Determine which coordinates to use based on boundsSource
  let coordinates;
  
  if (boundsSource === 'developableArea' && developableArea?.features?.[0]) {
    // Use only developable area coordinates
    coordinates = developableArea.features[0].geometry.coordinates[0];
  } else if (boundsSource === 'feature') {
    // Use only feature coordinates
    coordinates = feature.geometry.coordinates[0];
  } else {
    // Default: Include both feature and developableArea if available
    coordinates = feature.geometry.coordinates[0];
    
    // If we have a developable area, include its coordinates too
    if (developableArea?.features?.[0]) {
      coordinates = [
        ...coordinates,
        ...developableArea.features[0].geometry.coordinates[0]
      ];
    }
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

export function long2tile(lon, zoom) {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
}

export function lat2tile(lat, zoom) {
  return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
}

export function mercatorToWGS84(x, y) {
  const lon = (x / 20037508.34) * 180;
  const lat = (y / 20037508.34) * 180;
  return [(Math.atan(Math.exp(lat * (Math.PI / 180))) * 360 / Math.PI) - 90, lon];
}

export function drawRoundedTextBox(ctx, text, x, y, padding = 10, cornerRadius = 5) {
  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  const textHeight = parseInt(ctx.font.match(/\d+/)[0], 10); // Extract font size from font string
  
  const boxWidth = textWidth + padding * 2;
  const boxHeight = textHeight + padding * 2;
  
  // Draw rounded rectangle
  ctx.beginPath();
  ctx.moveTo(x + cornerRadius, y);
  ctx.lineTo(x + boxWidth - cornerRadius, y);
  ctx.quadraticCurveTo(x + boxWidth, y, x + boxWidth, y + cornerRadius);
  ctx.lineTo(x + boxWidth, y + boxHeight - cornerRadius);
  ctx.quadraticCurveTo(x + boxWidth, y + boxHeight, x + boxWidth - cornerRadius, y + boxHeight);
  ctx.lineTo(x + cornerRadius, y + boxHeight);
  ctx.quadraticCurveTo(x, y + boxHeight, x, y + boxHeight - cornerRadius);
  ctx.lineTo(x, y + cornerRadius);
  ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
  ctx.closePath();
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fill();
  ctx.strokeStyle = '#666';
  ctx.stroke();
  
  // Draw text
  ctx.fillStyle = '#000';
  ctx.fillText(text, x + padding, y + padding + textHeight * 0.75);
}

export async function captureMapScreenshot(feature, type = SCREENSHOT_TYPES.SNAPSHOT, drawBoundaryLine = true, developableArea = null, showDevelopableArea = true, boundsSource = 'feature') {
  if (!feature || !LAYER_CONFIGS[type]) return null;
  
  try {
    const config = LAYER_CONFIGS[type];
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, boundsSource);
    
    // Get Mercator parameters for proper coordinate transformation
    const { bbox, mercatorCoords } = calculateMercatorParams(centerX, centerY, size);
        
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

    // Add cadastre layer only for property snapshot
    if (type === SCREENSHOT_TYPES.SNAPSHOT) {
      try {
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
          bbox: bbox,  // Use the mercator bbox we already calculated
          bboxSR: 3857,
          imageSR: 3857,
          layers: `show:${cadastreConfig.layerId}`,
          dpi: 300
        });

        const cadastreUrl = `${cadastreConfig.url}/export?${params.toString()}`;
        const cadastreProxyUrl = await proxyRequest(cadastreUrl);
        
        if (cadastreProxyUrl) {
          const cadastreLayer = await loadImage(cadastreProxyUrl);
          // Draw cadastre with reduced opacity to not overwhelm other layers
          drawImage(ctx, cadastreLayer, canvas.width, canvas.height, 1);
        }
      } catch (error) {
        console.warn('Failed to load cadastre layer:', error);
      }
    }

    if (developableArea?.features?.[0] && showDevelopableArea) {
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width || config.size, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    if (drawBoundaryLine && feature.geometry?.coordinates?.[0]) {
      drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width || config.size, {
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