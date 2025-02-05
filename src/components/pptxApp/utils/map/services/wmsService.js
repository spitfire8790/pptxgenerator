import { loadImage } from '../utils/image';
import { proxyRequest } from '../../services/proxyService';
import { calculateMercatorParams } from '../utils/coordinates';
import { createCanvas } from '../utils/canvas';

// Cache to store service availability for the current report generation
const serviceAvailabilityCache = {
  // Key will be bbox string, value will be 'primary' or 'fallback'
  cache: new Map(),
  
  // Helper to create a cache key from coordinates
  createKey: (centerX, centerY, size) => {
    // Round to 4 decimal places to handle minor differences
    const x = Math.round(centerX * 10000) / 10000;
    const y = Math.round(centerY * 10000) / 10000;
    const s = Math.round(size * 10000) / 10000;
    return `${x},${y},${s}`;
  },
  
  // Store which service worked for these coordinates
  setServiceType: (centerX, centerY, size, serviceType) => {
    const key = serviceAvailabilityCache.createKey(centerX, centerY, size);
    serviceAvailabilityCache.cache.set(key, serviceType);
  },
  
  // Check if we already know which service to use
  getServiceType: (centerX, centerY, size) => {
    const key = serviceAvailabilityCache.createKey(centerX, centerY, size);
    return serviceAvailabilityCache.cache.get(key);
  },
  
  // Clear the cache (useful when starting a new report)
  clear: () => {
    serviceAvailabilityCache.cache.clear();
  }
};

// Helper function to check if an image is blank/empty - optimized version
async function isImageBlank(imageElement) {
  // Create a canvas to analyze the image
  const canvas = createCanvas(imageElement.width, imageElement.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageElement, 0, 0);

  // Only sample a portion of the image for performance
  const sampleSize = 50; // Check every 50 pixels
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  
  for (let i = 0; i < imageData.length; i += (4 * sampleSize)) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    const a = imageData[i + 3];

    // If we find a non-white, non-transparent pixel, the image is not blank
    if (a > 0 && (r < 255 || g < 255 || b < 255)) {
      return false;
    }
  }
  
  return true;
}

async function getFallbackImage(config, bbox) {
  const fallbackParams = new URLSearchParams({
    f: 'image',
    format: 'png32',
    transparent: 'false',
    size: `${config.width || config.size},${config.height || config.size}`,
    bbox: bbox,
    bboxSR: 3857,
    imageSR: 3857,
    dpi: config.dpi
  });

  const fallbackUrl = `${config.fallbackUrl}/export?${fallbackParams.toString()}`;
  
  try {
    // Try direct request first
    const fallbackImage = await loadImage(fallbackUrl);
    return fallbackImage;
  } catch (directError) {
    // If direct request fails, try through proxy
    const proxyUrl = await proxyRequest(fallbackUrl);
    if (!proxyUrl) {
      throw new Error('Failed to get proxy URL for fallback service');
    }
    
    const fallbackImage = await loadImage(proxyUrl);
    const fallbackBlank = await isImageBlank(fallbackImage);
    if (fallbackBlank) {
      throw new Error('Blank image received from fallback service');
    }
    
    return fallbackImage;
  }
}

export async function getWMSImage(config, centerX, centerY, size) {
  try {
    const { bbox } = calculateMercatorParams(centerX, centerY, size);
    
    // Check if we already know which service to use for this location
    const cachedService = serviceAvailabilityCache.getServiceType(centerX, centerY, size);
    
    // If we know the primary service failed here before, go straight to fallback
    if (cachedService === 'fallback') {
      console.log('Using cached fallback service for this location');
      return getFallbackImage(config, bbox);
    }

    // Try primary service if we haven't cached a failure
    if (!cachedService) {
      try {
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
          DPI: config.dpi,
          MAP_RESOLUTION: config.dpi,
          FORMAT_OPTIONS: `dpi:${config.dpi}`
        });

        const url = `${config.url}?${params.toString()}`;
        const image = await loadImage(url);
        
        // Check if image is blank
        const blank = await isImageBlank(image);
        if (blank) {
          throw new Error('Blank image received from primary service');
        }
        
        // Cache that primary service worked here
        serviceAvailabilityCache.setServiceType(centerX, centerY, size, 'primary');
        return image;
      } catch (primaryError) {
        // Cache that we need to use fallback for this location
        serviceAvailabilityCache.setServiceType(centerX, centerY, size, 'fallback');
        
        // Try fallback service
        if (config.fallbackUrl) {
          return getFallbackImage(config, bbox);
        }
        throw primaryError;
      }
    }
    
    // If we get here, we had a cached 'primary' service type
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
      DPI: config.dpi,
      MAP_RESOLUTION: config.dpi,
      FORMAT_OPTIONS: `dpi:${config.dpi}`
    });

    return loadImage(`${config.url}?${params.toString()}`);
  } catch (error) {
    console.error('getWMSImage failed:', error);
    throw error;
  }
}

// Export the cache clear function so it can be called when starting a new report
export function clearServiceCache() {
  serviceAvailabilityCache.clear();
} 