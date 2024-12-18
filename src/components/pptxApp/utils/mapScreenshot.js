import { rpc } from '@gi-nx/iframe-sdk';

// Types of screenshots we support
const SCREENSHOT_TYPES = {
  AERIAL: 'aerial',
  PLANNING: 'planning',
  CONSTRAINTS: 'constraints',
  TOPOGRAPHY: 'topography'
};

// Layer configurations for different screenshot types
const LAYER_CONFIGS = {
  [SCREENSHOT_TYPES.AERIAL]: {
    url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service',
    layers: 'Australia_latest',
    opacity: 1,
    width: 2048,
    height: 2048,
    padding: 0.5
  }
  // Other layer configs will be added as we get their URLs
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
    
    // Calculate bounds from feature
    const coordinates = feature.geometry.coordinates[0];
    const bounds = coordinates.reduce((bounds, coord) => {
      bounds.minLng = Math.min(bounds.minLng, coord[0]);
      bounds.maxLng = Math.max(bounds.maxLng, coord[0]);
      bounds.minLat = Math.min(bounds.minLat, coord[1]);
      bounds.maxLat = Math.max(bounds.maxLat, coord[1]);
      return bounds;
    }, { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity });

    // Convert bounds to Web Mercator
    const [minX, minY] = convertToWebMercator(bounds.minLng, bounds.minLat);
    const [maxX, maxY] = convertToWebMercator(bounds.maxLng, bounds.maxLat);

    // Calculate center and size
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const width = maxX - minX;
    const height = maxY - minY;
    const size = Math.max(width, height) * 1.5; // 150% padding

    // Calculate bbox as square in Web Mercator
    const bbox = `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`;

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
    ctx.lineWidth = 5;
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 2;
    ctx.beginPath();

    // Convert coordinates to canvas space
    coordinates.forEach((coord, i) => {
      // Convert the coordinate to Web Mercator first
      const [mercX, mercY] = convertToWebMercator(coord[0], coord[1]);
      
      // Then convert to canvas space
      const x = ((mercX - (centerX - size/2)) / size) * config.width;
      const y = ((centerY + size/2 - mercY) / size) * config.height;
      
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