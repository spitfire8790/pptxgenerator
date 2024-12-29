import { calculateMercatorParams } from '../utils/coordinates';
import { loadImage } from '../utils/image';

export async function getWMSImage(config, centerX, centerY, size) {
  const { bbox } = calculateMercatorParams(centerX, centerY, size);

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

  return loadImage(`${config.url}?${params.toString()}`);
} 