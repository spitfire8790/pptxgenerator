import { calculateMercatorParams } from '../utils/coordinates';
import { loadImage } from '../utils/image';

export async function getArcGISImage(config, centerX, centerY, size) {
  const { centerMercX, centerMercY, sizeInMeters } = calculateMercatorParams(centerX, centerY, size);
  
  const params = new URLSearchParams({
    f: 'image',
    format: 'png32',
    transparent: 'true',
    size: `${config.size},${config.size}`,
    bboxSR: 3857,
    imageSR: 3857,
    bbox: `${centerMercX - sizeInMeters/2},${centerMercY - sizeInMeters/2},${centerMercX + sizeInMeters/2},${centerMercY + sizeInMeters/2}`,
    layers: `show:${config.layerId}`,
    dpi: 300
  });

  return loadImage(`${config.url}/export?${params.toString()}`);
} 