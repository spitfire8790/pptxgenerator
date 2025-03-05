import { calculateMercatorParams } from '../utils/coordinates';
import { loadImage } from '../utils/image';
import { proxyRequest } from '../../services/proxyService';

export async function getArcGISImage(config, centerX, centerY, size) {
  try {
    console.log(`getArcGISImage: Starting to capture image from ${config.url} for layer ${config.layerId}`);
    
    const { centerMercX, centerMercY, sizeInMeters } = calculateMercatorParams(centerX, centerY, size);
    
    const params = new URLSearchParams({
      f: 'image',
      format: config.format || 'png32',
      transparent: config.transparent !== undefined ? config.transparent.toString() : 'true',
      size: `${config.size},${config.size}`,
      bbox: `${centerMercX - sizeInMeters/2},${centerMercY - sizeInMeters/2},${centerMercX + sizeInMeters/2},${centerMercY + sizeInMeters/2}`,
      bboxSR: '3857',
      imageSR: '3857',
      layers: `show:${config.layerId}`,
      dpi: config.dpi || '300'
    });

    const url = `${config.url}/export?${params.toString()}`;
    console.log(`getArcGISImage: Request URL: ${url}`);

    // Try to use the proxy service first
    try {
      console.log(`getArcGISImage: Attempting to use proxy service`);
      const proxyUrl = await proxyRequest(url);
      if (proxyUrl) {
        console.log(`getArcGISImage: Successfully got proxy URL: ${proxyUrl}`);
        return await loadImage(proxyUrl);
      }
    } catch (proxyError) {
      console.warn(`getArcGISImage: Proxy request failed, falling back to direct request:`, proxyError);
    }

    // Fall back to direct request if proxy fails
    console.log(`getArcGISImage: Using direct request`);
    return await loadImage(url);
  } catch (error) {
    console.error(`getArcGISImage: Failed to capture image:`, error);
    throw error;
  }
} 