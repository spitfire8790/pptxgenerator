import { calculateMercatorParams } from '../utils/coordinates';
import { proxyRequest } from '../../services/proxyService';

function formatBBox(bbox) {
  const coords = bbox.split(',').map(Number);
  const [x1, y1, x2, y2] = coords;
  const xmin = Math.min(x1, x2);
  const ymin = Math.min(y1, y2);
  const xmax = Math.max(x1, x2);
  const ymax = Math.max(y1, y2);
  
  return [xmin, ymin, xmax, ymax]
    .map(coord => coord.toFixed(6))
    .join(',');
}

export async function getArcGISImage(config, centerX, centerY, size) {
  const { bbox } = calculateMercatorParams(centerX, centerY, size);
  
  const params = new URLSearchParams({
    f: 'image',
    format: 'png32',
    transparent: 'true',
    size: `${config.size},${config.size}`,
    bbox: formatBBox(bbox),
    bboxSR: '3857',
    imageSR: '3857',
    layers: `show:${config.layerId}`,
    dpi: '96'
  });

  const url = `${config.url}/export?${params.toString()}`;
  return await proxyRequest(url);
} 