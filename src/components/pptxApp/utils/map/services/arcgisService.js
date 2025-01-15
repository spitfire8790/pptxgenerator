import { calculateMercatorParams } from '../utils/coordinates';
import { loadImage } from '../utils/image';
import { proxyRequest } from '../../services/proxyService';

export async function getArcGISImage(config, centerX, centerY, size) {
  const { centerMercX, centerMercY, sizeInMeters } = calculateMercatorParams(centerX, centerY, size);
  
  const params = new URLSearchParams({
    f: 'image',
    format: 'png32',
    transparent: 'true',
    size: `${config.size},${config.size}`,
    bbox: `${centerMercX - sizeInMeters/2},${centerMercY - sizeInMeters/2},${centerMercX + sizeInMeters/2},${centerMercY + sizeInMeters/2}`,
    bboxSR: '3857',
    imageSR: '3857',
    layers: `show:${config.layerId}`,
    dpi: '300'
  });

  const url = `${config.url}/export?${params.toString()}`;

  return loadImage(url);

} 