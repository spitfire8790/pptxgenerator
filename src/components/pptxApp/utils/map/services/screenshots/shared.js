import { LAYER_CONFIGS } from '../../config/layerConfigs';
import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';
import { calculateMercatorParams } from '../../utils/coordinates';
import { getWMSImage } from '../wmsService';
import { getArcGISImage } from '../arcgisService';
import { createCanvas, drawImage, drawBoundary, drawPolyline } from '../../utils/canvas';
import { proxyRequest } from '../../../services/proxyService';
import { loadImage } from '../../utils/image';

/**
 * Calculate the bounding box for a feature with optional developable area
 * @param {Object} feature - GeoJSON feature
 * @param {Number} padding - Padding percentage around the feature
 * @param {Object} developableArea - Optional developable area GeoJSON
 * @returns {Object} Bounding box parameters
 */
export function calculateBounds(feature, padding, developableArea = null) {
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

/**
 * Draw a rounded text box on a canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {String} text - Text to display
 * @param {Number} x - X coordinate
 * @param {Number} y - Y coordinate
 * @param {Number} padding - Padding around text
 * @param {Number} cornerRadius - Corner radius
 */
export function drawRoundedTextBox(ctx, text, x, y, padding = 10, cornerRadius = 5) {
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const textHeight = 14; // Approximate height of text
  
  const boxWidth = textWidth + padding * 2;
  const boxHeight = textHeight + padding * 2;
  
  // Draw rounded rectangle
  ctx.beginPath();
  ctx.moveTo(x + cornerRadius, y);
  ctx.lineTo(x + boxWidth - cornerRadius, y);
  ctx.arcTo(x + boxWidth, y, x + boxWidth, y + cornerRadius, cornerRadius);
  ctx.lineTo(x + boxWidth, y + boxHeight - cornerRadius);
  ctx.arcTo(x + boxWidth, y + boxHeight, x + boxWidth - cornerRadius, y + boxHeight, cornerRadius);
  ctx.lineTo(x + cornerRadius, y + boxHeight);
  ctx.arcTo(x, y + boxHeight, x, y + boxHeight - cornerRadius, cornerRadius);
  ctx.lineTo(x, y + cornerRadius);
  ctx.arcTo(x, y, x + cornerRadius, y, cornerRadius);
  ctx.closePath();
  
  // Fill and stroke
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // Draw text
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padding, y + boxHeight / 2);
}

/**
 * Capture a map screenshot with the specified configuration
 * @param {Object} feature - GeoJSON feature
 * @param {String} type - Screenshot type from SCREENSHOT_TYPES
 * @param {Boolean} drawBoundaryLine - Whether to draw a boundary line
 * @param {Object} developableArea - Optional developable area GeoJSON
 * @param {Boolean} showDevelopableArea - Whether to display the developable area
 * @returns {String} Screenshot as a data URL
 */
export async function captureMapScreenshot(feature, type = SCREENSHOT_TYPES.SNAPSHOT, drawBoundaryLine = true, developableArea = null, showDevelopableArea = true) {
  if (!feature || !LAYER_CONFIGS[type]) return null;
  
  try {
    const config = LAYER_CONFIGS[type];
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    
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

/**
 * Converts lng/lat coordinates to Web Mercator projection
 * @param {Number} lon - Longitude
 * @param {Number} lat - Latitude
 * @returns {Array} [x, y] coordinates in Web Mercator
 */
export function toWebMercator(lon, lat) {
  const x = lon * 20037508.34 / 180;
  let y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
  y = y * 20037508.34 / 180;
  return [x, y];
}

/**
 * Converts Web Mercator coordinates to lng/lat (WGS84)
 * @param {Number} x - X coordinate in Web Mercator
 * @param {Number} y - Y coordinate in Web Mercator
 * @returns {Array} [lon, lat] coordinates in WGS84
 */
export function mercatorToWGS84(x, y) {
  const lon = (x * 180) / 20037508.34;
  let lat = (y * 180) / 20037508.34;
  lat = 180 / Math.PI * (2 * Math.atan(Math.exp(lat * Math.PI / 180)) - Math.PI / 2);
  return [lon, lat];
}

/**
 * Convert longitude to tile coordinate
 * @param {Number} lon - Longitude
 * @param {Number} zoom - Zoom level
 * @returns {Number} Tile x coordinate
 */
export function long2tile(lon, zoom) {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
}

/**
 * Convert latitude to tile coordinate
 * @param {Number} lat - Latitude
 * @param {Number} zoom - Zoom level
 * @returns {Number} Tile y coordinate
 */
export function lat2tile(lat, zoom) {
  return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
} 