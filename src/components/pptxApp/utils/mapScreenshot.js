import { rpc } from '@gi-nx/iframe-sdk';

// Types of screenshots we support
const SCREENSHOT_TYPES = {
  AERIAL: 'aerial',
  SNAPSHOT: 'snapshot'
};

// Layer configurations for different screenshot types
const LAYER_CONFIGS = {
  [SCREENSHOT_TYPES.AERIAL]: {
    url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service',
    layers: 'Australia_latest',
    opacity: 1,
    width: 3072,
    height: 2048,
    padding: 1.0
  },
  [SCREENSHOT_TYPES.SNAPSHOT]: {
    url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service',
    layers: 'Australia_latest',
    opacity: 1,
    width: 3072,
    height: 2048,
    padding: 0.1  // Minimal padding for a close-up view
  }
};

// Convert GeoJSON coordinates from EPSG:4326 to EPSG:3857
function convertToWebMercator(lng, lat) {
  const x = lng * 20037508.34 / 180;
  let y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
  y = y * 20037508.34 / 180;
  return [x, y];
}

export async function captureMapScreenshot(feature, type = SCREENSHOT_TYPES.AERIAL) {
  if (!feature || !LAYER_CONFIGS[type]) return null;
  
  try {
    const config = LAYER_CONFIGS[type];
    
    // Calculate bounds of the property
    const coordinates = feature.geometry.coordinates[0];
    const bounds = coordinates.reduce((acc, coord) => {
      return {
        minX: Math.min(acc.minX, coord[0]),
        minY: Math.min(acc.minY, coord[1]),
        maxX: Math.max(acc.maxX, coord[0]),
        maxY: Math.max(acc.maxY, coord[1])
      };
    }, {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity
    });

    // Calculate center point
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    // Calculate required size with padding
    const width = Math.abs(bounds.maxX - bounds.minX);
    const height = Math.abs(bounds.maxY - bounds.minY);
    const size = Math.max(width, height) * (1 + config.padding * 2);

    // Calculate bbox as square in Web Mercator
    const [minX, minY] = convertToWebMercator(centerX - size/2, centerY - size/2);
    const [maxX, maxY] = convertToWebMercator(centerX + size/2, centerY + size/2);
    const bbox = `${minX},${minY},${maxX},${maxY}`;

    // Get aerial imagery
    const mapUrl = `${config.url}?` + new URLSearchParams({
      SERVICE: 'WMS',
      VERSION: '1.3.0',
      REQUEST: 'GetMap',
      BBOX: bbox,
      CRS: 'EPSG:3857',
      WIDTH: config.width,
      HEIGHT: config.height,
      LAYERS: config.layers,
      STYLES: '',
      FORMAT: 'image/png',
      DPI: 300,
      MAP_RESOLUTION: 300,
      FORMAT_OPTIONS: 'dpi:300'
    }).toString();

    // Load aerial image using a Promise
    const loadImage = () => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = mapUrl;
      });
    };

    const image = await loadImage();

    // Create canvas and draw aerial image
    const canvas = document.createElement('canvas');
    canvas.width = config.width;
    canvas.height = config.height;
    const ctx = canvas.getContext('2d', { alpha: false });
    
    // Use better quality settings
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Draw the background image
    ctx.drawImage(image, 0, 0, config.width, config.height);

    // Draw property boundary
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 8;  // Make it thicker
    ctx.beginPath();

    // Convert coordinates to canvas space
    coordinates.forEach((coord, i) => {
      // Convert the coordinate to Web Mercator
      const [mercX, mercY] = convertToWebMercator(coord[0], coord[1]);
      
      // Convert to canvas space using the same bbox we used for the WMS request
      const x = ((mercX - minX) / (maxX - minX)) * config.width;
      const y = ((maxY - mercY) / (maxY - minY)) * config.height;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.closePath();
    ctx.stroke();

    // Convert canvas to base64 with maximum quality
    return canvas.toDataURL('image/png', 1.0);

  } catch (error) {
    console.warn('Failed to capture screenshot:', error);
    return null;
  }
}

export { SCREENSHOT_TYPES };