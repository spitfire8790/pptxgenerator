import { rpc } from '@gi-nx/iframe-sdk';

// Types of screenshots we support
export const SCREENSHOT_TYPES = {
  AERIAL: 'aerial',
  SNAPSHOT: 'snapshot',
  COVER: 'cover',
  ZONING: 'zoning',
  FSR: 'fsr',
  HOB: 'hob'
};

// Layer configurations for different screenshot types
export const LAYER_CONFIGS = {
  [SCREENSHOT_TYPES.AERIAL]: {
    url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service',
    layers: 'Australia_latest',
    opacity: 1,
    size: 2048,     // Single size value for square output
    padding: 1.0
  },
  [SCREENSHOT_TYPES.COVER]: {
    url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service',
    layers: 'Australia_latest',
    opacity: 1,
    width: 683,    // 33% of 2048 (rounded up)
    height: 1152,  // 16:9 ratio of full width (2048)
    padding: 0.3
  },
  [SCREENSHOT_TYPES.SNAPSHOT]: {
    url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service',
    layers: 'Australia_latest',
    opacity: 1,
    size: 2048,     // Single size value for square output
    padding: 0.3
  },
  [SCREENSHOT_TYPES.ZONING]: {
    url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer',
    layerId: 2,
    width: 1085,    // 10.85cm in pixels at 100dpi
    height: 716,    // 7.16cm in pixels at 100dpi
    padding: 0.2
  },
  [SCREENSHOT_TYPES.FSR]: {
    url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/Principal_Planning_Layers/MapServer',
    layerId: 4,
    width: 1085,
    height: 716,
    padding: 0.2
  },
  [SCREENSHOT_TYPES.HOB]: {
    url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/Principal_Planning_Layers/MapServer',
    layerId: 7,
    width: 1085,
    height: 716,
    padding: 0.2
  }
};

// Convert GeoJSON coordinates from EPSG:4326 to EPSG:3857
function convertToWebMercator(lng, lat) {
  const x = lng * 20037508.34 / 180;
  let y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
  y = y * 20037508.34 / 180;
  return [x, y];
}

export async function captureMapScreenshot(feature, type = SCREENSHOT_TYPES.AERIAL, drawBoundary = true) {
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

    // Calculate center point and size with padding
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const width = Math.abs(bounds.maxX - bounds.minX);
    const height = Math.abs(bounds.maxY - bounds.minY);
    const size = Math.max(width, height) * (1 + config.padding * 2);

    // First get the aerial basemap if this is a planning layer
    let baseMapImage = null;
    if (config.layerId !== undefined) {
      const aerialConfig = LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL];
      const [centerMercX, centerMercY] = convertToWebMercator(centerX, centerY);
      const metersPerDegree = 111319.9;
      const latFactor = Math.cos(centerY * Math.PI / 180);
      const sizeInMeters = size * metersPerDegree * latFactor;
      const bbox = `${centerMercX - sizeInMeters/2},${centerMercY - sizeInMeters/2},${centerMercX + sizeInMeters/2},${centerMercY + sizeInMeters/2}`;

      const baseParams = new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: '1.3.0',
        REQUEST: 'GetMap',
        BBOX: bbox,
        CRS: 'EPSG:3857',
        WIDTH: config.size,
        HEIGHT: config.size,
        LAYERS: aerialConfig.layers,
        STYLES: '',
        FORMAT: 'image/png',
        DPI: 300,
        MAP_RESOLUTION: 300,
        FORMAT_OPTIONS: 'dpi:300'
      });

      const baseMapUrl = `${aerialConfig.url}?${baseParams.toString()}`;
      baseMapImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = baseMapUrl;
      });
    }

    // Get the main layer (planning or aerial)
    let mapUrl;
    if (config.layerId !== undefined) {
      // ESRI REST service
      const params = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${config.width},${config.height}`,
        bboxSR: 4326,
        imageSR: 4326,
        bbox: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        layers: `show:${config.layerId}`,
        dpi: 100
      });
      mapUrl = `${config.url}/export?${params.toString()}`;
    } else {
      // WMS service
      const [centerMercX, centerMercY] = convertToWebMercator(centerX, centerY);
      const metersPerDegree = 111319.9;
      const latFactor = Math.cos(centerY * Math.PI / 180);
      const sizeInMeters = size * metersPerDegree * latFactor;
      const bbox = `${centerMercX - sizeInMeters/2},${centerMercY - sizeInMeters/2},${centerMercX + sizeInMeters/2},${centerMercY + sizeInMeters/2}`;

      const params = new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: '1.3.0',
        REQUEST: 'GetMap',
        BBOX: bbox,
        CRS: 'EPSG:3857',
        WIDTH: config.width || config.size,
        HEIGHT: config.height || config.size,
        LAYERS: config.layers,
        STYLES: '',
        FORMAT: 'image/png',
        DPI: 300,
        MAP_RESOLUTION: 300,
        FORMAT_OPTIONS: 'dpi:300'
      });
      mapUrl = `${config.url}?${params.toString()}`;
    }

    const mainImage = await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = mapUrl;
    });

    // Create canvas and draw layers
    const canvas = document.createElement('canvas');
    canvas.width = config.width || config.size;
    canvas.height = config.height || config.size;
    const ctx = canvas.getContext('2d', { alpha: true });
    
    // Draw base aerial map if this is a planning layer
    if (baseMapImage) {
      ctx.globalAlpha = 0.7;  // 50% opacity for basemap
      ctx.drawImage(baseMapImage, 0, 0, canvas.width, canvas.height);
    }

    // Draw main layer
    ctx.globalAlpha = config.layerId !== undefined ? 0.7 : 1.0;  // Only apply transparency to planning layers
    ctx.drawImage(mainImage, 0, 0, canvas.width, canvas.height);

    // Reset alpha for boundary
    ctx.globalAlpha = 1.0;

    // Draw property boundary only if drawBoundary is true
    if (drawBoundary) {
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = Math.max(config.size / 256, 5);
      ctx.beginPath();

      coordinates.forEach((coord, i) => {
        let x, y;
        if (config.layerId !== undefined) {
          // For ESRI layers, use geographic coordinates with center-based bbox
          x = ((coord[0] - (centerX - size/2)) / size) * config.size;
          y = ((centerY + size/2 - coord[1]) / size) * config.size;
        } else {
          // For WMS layers, use Web Mercator conversion
          const [mercX, mercY] = convertToWebMercator(coord[0], coord[1]);
          const [centerMercX, centerMercY] = convertToWebMercator(centerX, centerY);
          const metersPerDegree = 111319.9;
          const latFactor = Math.cos(centerY * Math.PI / 180);
          const sizeInMeters = size * metersPerDegree * latFactor;
          x = ((mercX - (centerMercX - sizeInMeters/2)) / sizeInMeters) * config.size;
          y = ((centerMercY + sizeInMeters/2 - mercY) / sizeInMeters) * config.size;
        }
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.closePath();
      ctx.stroke();
    }

    return canvas.toDataURL('image/png', 1.0);

  } catch (error) {
    console.warn('Failed to capture screenshot:', error);
    return null;
  }
}
