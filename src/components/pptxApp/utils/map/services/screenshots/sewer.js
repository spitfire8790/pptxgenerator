import { LAYER_CONFIGS } from '../../config/layerConfigs';
import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';
import { calculateMercatorParams } from '../../utils/coordinates';
import { createCanvas, drawImage, drawBoundary, drawPolyline } from '../../utils/canvas';
import { proxyRequest } from '../../../services/proxyService';
import { loadImage } from '../../utils/image';
import { calculateBounds } from './shared';

/**
 * Sewer map configuration
 */
export const SEWER_CONFIG = LAYER_CONFIGS[SCREENSHOT_TYPES.SEWER_MAINS] || {
  url: 'https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/NSW_Water_Sewer_Infrastructure/FeatureServer/11',
  layerId: 14112,
  size: 2048,
  padding: 0.2,
  dpi: 300,
  format: 'png32',
  transparent: true
};

/**
 * Capture a sewer map screenshot
 * @param {Object} feature - GeoJSON feature
 * @param {Object} developableArea - Optional developable area GeoJSON
 * @param {Boolean} showDevelopableArea - Whether to show the developable area
 * @param {Object} state - Application state object containing giraffeState
 * @returns {Promise<Object>} Object containing screenshot as data URL and features
 */
export async function captureSewerMap(feature, developableArea = null, showDevelopableArea = true, state = {}) {
  if (!feature) return null;
  console.log('Starting sewer infrastructure capture...');

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.2
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    let sewerFeatures = [];
    
    // Create base canvas
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d', { alpha: true });

    try {
      // 1. Aerial imagery (base)
      console.log('Loading aerial base layer...');
      const aerialConfig = LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL];
      const { bbox } = calculateMercatorParams(centerX, centerY, size);
      
      const params = new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: '1.3.0',
        REQUEST: 'GetMap',
        BBOX: bbox,
        CRS: 'EPSG:3857',
        WIDTH: config.width,
        HEIGHT: config.height,
        LAYERS: aerialConfig.layers,
        STYLES: '',
        FORMAT: 'image/png',
        DPI: 300,
        MAP_RESOLUTION: 300,
        FORMAT_OPTIONS: 'dpi:300'
      });

      const url = `${aerialConfig.url}?${params.toString()}`;
      const baseMap = await loadImage(url);
      drawImage(ctx, baseMap, canvas.width, canvas.height, 0.5);
    } catch (error) {
      console.error('Failed to load aerial layer:', error);
    }

    try {
      // 2. Sewer infrastructure layer
      const sewerConfig = {
        baseUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/NSW_Water_Sewer_Infrastructure/FeatureServer/11',
        layerId: 14112
      };

      // Get the sewer layer data from Giraffe state if available
      console.log('Fetching project layers from state...');
      const projectLayers = state?.giraffeState?.get?.('projectLayers') || [];
      const sewerLayer = projectLayers.find(layer => layer?.layer === sewerConfig.layerId);
      console.log('Found sewer layer:', sewerLayer);
      
      if (sewerLayer?.layer_full?.vector_source?.tiles?.[0]) {
        console.log('Processing Giraffe sewer layer...');
        const { bbox } = calculateMercatorParams(centerX, centerY, size);
        const vectorTileUrl = sewerLayer.layer_full.vector_source.tiles[0];
        
        const decodedUrl = decodeURIComponent(vectorTileUrl.split('/featureServer/{z}/{x}/{y}/')?.[1] || '');
        const extractedToken = decodedUrl.split('token=')?.[1]?.split('&')?.[0];

        if (extractedToken) {
          try {
            const params = new URLSearchParams({
              where: '1=1',
              geometry: bbox,
              geometryType: 'esriGeometryEnvelope',
              inSR: 3857,
              spatialRel: 'esriSpatialRelIntersects',
              outFields: '*',
              returnGeometry: true,
              f: 'geojson',
              token: extractedToken
            });

            const url = `${sewerConfig.baseUrl}/query?${params.toString()}`;
            console.log('Final sewer request URL (with sensitive info removed):', url.replace(extractedToken, 'REDACTED'));
            
            const sewerResponse = await proxyRequest(url);
            console.log('Sewer response:', sewerResponse);

            if (sewerResponse?.features?.length > 0) {
              console.log(`Drawing ${sewerResponse.features.length} sewer features...`);
              sewerFeatures = sewerResponse.features;

              sewerFeatures.forEach((sewerFeature, index) => {
                console.log(`Drawing sewer feature ${index + 1}...`);
                
                if (!sewerFeature.geometry) {
                  console.warn(`Sewer feature ${index + 1} has no geometry`);
                  return;
                }

                try {
                  switch (sewerFeature.geometry.type) {
                    case 'LineString':
                      drawPolyline(ctx, sewerFeature.geometry.coordinates, centerX, centerY, size, config.width, {
                        strokeStyle: '#8B4513',
                        lineWidth: 4
                      });
                      break;
                      
                    case 'MultiLineString':
                      sewerFeature.geometry.coordinates.forEach(line => {
                        drawPolyline(ctx, line, centerX, centerY, size, config.width, {
                          strokeStyle: '#8B4513',
                          lineWidth: 4
                        });
                      });
                      break;
                      
                    case 'Point':
                      const [x, y] = transformCoordinates(sewerFeature.geometry.coordinates, centerX, centerY, size, config.width);
                      ctx.beginPath();
                      ctx.arc(x, y, 8, 0, 2 * Math.PI);
                      ctx.fillStyle = '#8B4513';
                      ctx.fill();
                      ctx.strokeStyle = '#603311';
                      ctx.lineWidth = 2;
                      ctx.stroke();
                      break;
                      
                    case 'MultiPoint':
                      sewerFeature.geometry.coordinates.forEach(point => {
                        const [x, y] = transformCoordinates(point, centerX, centerY, size, config.width);
                        ctx.beginPath();
                        ctx.arc(x, y, 8, 0, 2 * Math.PI);
                        ctx.fillStyle = '#8B4513';
                        ctx.fill();
                        ctx.strokeStyle = '#603311';
                        ctx.lineWidth = 2;
                        ctx.stroke();
                      });
                      break;
                      
                    default:
                      console.warn(`Unsupported geometry type: ${sewerFeature.geometry.type}`);
                  }
                } catch (err) {
                  console.warn(`Error drawing sewer feature ${index + 1}:`, err);
                }
              });
            }
          } catch (proxyError) {
            console.warn('Failed to fetch sewer data from Giraffe layer:', proxyError);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load sewer infrastructure layer:', error);
    }

    // Draw boundaries
    drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width, {
      strokeStyle: '#FF0000',
      lineWidth: 10
    });

    if (developableArea?.features?.[0] && showDevelopableArea) {
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    // Add legend
    const legendHeight = 140;
    const legendWidth = 180;
    const padding = 20;
    const legendX = canvas.width - legendWidth - padding;
    const legendY = padding;

    // Draw legend background with border
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

    // Legend title
    ctx.font = 'bold 16px Public Sans';
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'top';
    ctx.fillText('Sewer Infrastructure', legendX + padding, legendY + padding);

    // Draw legend items
    const items = [
      { label: 'Sewer Main', style: { strokeStyle: '#8B4513', lineWidth: 4 } },
      { label: 'Manhole/Pit', type: 'point', style: { fillStyle: '#8B4513', strokeStyle: '#603311' } }
    ];

    let currentY = legendY + padding + 35;
    const lineLength = 40;
    const spacing = 35;

    items.forEach(item => {
      if (item.type === 'point') {
        // Draw point symbol
        ctx.beginPath();
        ctx.arc(legendX + padding + 20, currentY + 8, 8, 0, 2 * Math.PI);
        ctx.fillStyle = item.style.fillStyle;
        ctx.fill();
        ctx.strokeStyle = item.style.strokeStyle;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Draw line symbol
        ctx.beginPath();
        ctx.moveTo(legendX + padding, currentY + 8);
        ctx.lineTo(legendX + padding + lineLength, currentY + 8);
        ctx.strokeStyle = item.style.strokeStyle;
        ctx.lineWidth = item.style.lineWidth;
        ctx.stroke();
      }

      // Draw label
      ctx.font = '14px Public Sans';
      ctx.fillStyle = '#000000';
      ctx.fillText(item.label, legendX + padding + lineLength + 10, currentY + 8);

      currentY += spacing;
    });

    // Store the features directly in the feature object
    feature.properties.sewerFeatures = sewerFeatures;

    return {
      image: canvas.toDataURL('image/png', 1.0),
      features: sewerFeatures
    };

  } catch (error) {
    console.error('Failed to capture sewer infrastructure map:', error);
    return null;
  }
}

/**
 * Transform geographic coordinates to canvas coordinates
 * @param {Array} coords - [lon, lat] coordinates
 * @param {Number} centerX - Center X coordinate of the view
 * @param {Number} centerY - Center Y coordinate of the view
 * @param {Number} size - Size of the view in geographic units
 * @param {Number} canvasWidth - Width of the canvas in pixels
 * @returns {Array} [x, y] coordinates on the canvas
 */
function transformCoordinates(coords, centerX, centerY, size, canvasWidth) {
  const [lon, lat] = coords;
  const x = ((lon - (centerX - size/2)) / size) * canvasWidth;
  const y = ((centerY + size/2) - lat) / size * canvasWidth;  // Y is inverted in canvas
  return [x, y];
} 