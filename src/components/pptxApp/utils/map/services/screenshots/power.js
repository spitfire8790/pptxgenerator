import { LAYER_CONFIGS } from '../../config/layerConfigs';
import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';
import { calculateMercatorParams } from '../../utils/coordinates';
import { createCanvas, drawImage, drawBoundary, drawPolyline } from '../../utils/canvas';
import { proxyRequest } from '../../../services/proxyService';
import { loadImage } from '../../utils/image';
import { calculateBounds } from './shared';
import proj4 from 'proj4';

/**
 * Power infrastructure map configuration
 */
export const POWER_CONFIG = LAYER_CONFIGS[SCREENSHOT_TYPES.POWER] || {
  services: [
    {
      url: 'https://services-ap1.arcgis.com/ug6sGLFkytbXYo4f/arcgis/rest/services/LUAL_Network_LV_Public/FeatureServer/0',
      spatialReference: 3857
    },
    {
      url: 'https://services.arcgis.com/Gbs1D7TkFBVkx0Nz/ArcGIS/rest/services/LookUpNLive/FeatureServer/2',
      spatialReference: 7856
    }
  ],
  size: 2048,
  padding: 0.2,
  dpi: 300
};

/**
 * Capture a power infrastructure map screenshot
 * @param {Object} feature - GeoJSON feature
 * @param {Object} developableArea - Optional developable area GeoJSON
 * @param {Boolean} showDevelopableArea - Whether to show the developable area
 * @param {Object} state - Application state object containing giraffeState
 * @returns {Promise<Object>} Object containing screenshot as data URL and features
 */
export async function capturePowerMap(feature, developableArea = null, showDevelopableArea = true, state = {}) {
  if (!feature) return null;
  console.log('Starting power infrastructure capture...');

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.2
    };

    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    let powerFeatures = [];

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
      drawImage(ctx, baseMap, canvas.width, canvas.height, 0.4);
    } catch (error) {
      console.error('Failed to load aerial layer:', error);
    }

    try {
      // 2. Power infrastructure layers
      console.log('Loading power infrastructure layers...');

      // Define coordinate systems
      proj4.defs([
        ['EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs'],
        ['EPSG:7856', '+proj=utm +zone=56 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'],
        ['EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs']
      ]);

      // Define power config
      const powerConfig = {
        baseUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/NSW_Electricity_Infrastructure/FeatureServer/0',
        layerId: 19976
      };

      // Get the power layer data from Giraffe state if available
      console.log('Fetching project layers from state...');
      const projectLayers = state?.giraffeState?.get?.('projectLayers') || [];
      const powerLayer = projectLayers.find(layer => layer?.layer === powerConfig.layerId);
      console.log('Found power layer:', powerLayer);

      if (powerLayer?.layer_full?.vector_source?.tiles?.[0]) {
        console.log('Processing Giraffe power layer...');
        const { bbox } = calculateMercatorParams(centerX, centerY, size);
        const vectorTileUrl = powerLayer.layer_full.vector_source.tiles[0];

        const decodedUrl = decodeURIComponent(vectorTileUrl.split('/featureServer/{z}/{x}/{y}/')?.[1] || '');
        const extractedToken = decodedUrl.split('token=')?.[1]?.split('&')?.[0];

        if (extractedToken) {
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

          try {
            const url = `${powerConfig.baseUrl}/query?${params.toString()}`;
            console.log('Final power request URL (with sensitive info removed):', url.replace(extractedToken, 'REDACTED'));

            const powerResponse = await proxyRequest(url);
            console.log('Power response:', powerResponse);

            if (powerResponse?.features?.length > 0) {
              console.log(`Drawing ${powerResponse.features.length} Giraffe power features...`);
              powerFeatures = powerFeatures.concat(powerResponse.features);

              powerResponse.features.forEach((powerFeature, index) => {
                console.log(`Drawing Giraffe power feature ${index + 1}...`);
                
                if (!powerFeature.geometry) {
                  console.warn(`Power feature ${index + 1} has no geometry`);
                  return;
                }

                try {
                  switch (powerFeature.geometry.type) {
                    case 'LineString':
                      drawPolyline(ctx, powerFeature.geometry.coordinates, centerX, centerY, size, config.width, {
                        strokeStyle: '#FFBD33',
                        lineWidth: 4
                      });
                      break;
                      
                    case 'MultiLineString':
                      powerFeature.geometry.coordinates.forEach(line => {
                        drawPolyline(ctx, line, centerX, centerY, size, config.width, {
                          strokeStyle: '#FFBD33',
                          lineWidth: 4
                        });
                      });
                      break;
                      
                    case 'Point':
                      const [x, y] = transformCoordinates(powerFeature.geometry.coordinates, centerX, centerY, size, config.width);
                      ctx.beginPath();
                      ctx.arc(x, y, 8, 0, 2 * Math.PI);
                      ctx.fillStyle = '#FFBD33';
                      ctx.fill();
                      ctx.strokeStyle = '#CC7A00';
                      ctx.lineWidth = 2;
                      ctx.stroke();
                      break;
                      
                    case 'MultiPoint':
                      powerFeature.geometry.coordinates.forEach(point => {
                        const [x, y] = transformCoordinates(point, centerX, centerY, size, config.width);
                        ctx.beginPath();
                        ctx.arc(x, y, 8, 0, 2 * Math.PI);
                        ctx.fillStyle = '#FFBD33';
                        ctx.fill();
                        ctx.strokeStyle = '#CC7A00';
                        ctx.lineWidth = 2;
                        ctx.stroke();
                      });
                      break;
                      
                    default:
                      console.warn(`Unsupported geometry type: ${powerFeature.geometry.type}`);
                  }
                } catch (err) {
                  console.warn(`Error drawing power feature ${index + 1}:`, err);
                }
              });
            }
          } catch (proxyError) {
            console.warn('Failed to fetch power data from Giraffe layer:', proxyError);
          }
        }
      }

      // Add LUAL power infrastructure layer
      console.log('Loading LUAL power infrastructure layer...');
      const { bbox: mercatorBbox } = calculateMercatorParams(centerX, centerY, size);
      
      try {
        const lualParams = new URLSearchParams({
          where: '1=1',
          geometry: mercatorBbox,
          geometryType: 'esriGeometryEnvelope',
          inSR: 3857,
          outSR: 4283,  // Request coordinates in GDA94
          spatialRel: 'esriSpatialRelIntersects',
          outFields: '*',
          returnGeometry: true,
          f: 'geojson'
        });

        const lualUrl = `${POWER_CONFIG.services[0].url}/query?${lualParams.toString()}`;
        console.log('LUAL request URL:', lualUrl);
        const lualResponse = await proxyRequest(lualUrl);
        console.log('LUAL response:', lualResponse);

        if (lualResponse?.features?.length > 0) {
          console.log(`Drawing ${lualResponse.features.length} LUAL power features...`);
          powerFeatures = powerFeatures.concat(lualResponse.features);

          lualResponse.features.forEach((powerFeature, index) => {
            console.log(`Drawing LUAL power feature ${index + 1}...`);
            
            if (!powerFeature.geometry) {
              console.warn(`LUAL power feature ${index + 1} has no geometry`);
              return;
            }

            try {
              const style = powerFeature.properties.ASSET_TYPE === 'OH' ? {
                strokeStyle: '#FFBD33',
                lineWidth: 4
              } : {
                strokeStyle: '#FFBD33',
                lineWidth: 4,
                dashArray: [15, 10]
              };

              switch (powerFeature.geometry.type) {
                case 'LineString':
                  drawPolyline(ctx, powerFeature.geometry.coordinates, centerX, centerY, size, config.width, style);
                  break;
                  
                case 'MultiLineString':
                  powerFeature.geometry.coordinates.forEach(line => {
                    drawPolyline(ctx, line, centerX, centerY, size, config.width, style);
                  });
                  break;
                  
                default:
                  console.warn(`Unsupported LUAL geometry type: ${powerFeature.geometry.type}`);
              }
            } catch (err) {
              console.warn(`Error drawing LUAL power feature ${index + 1}:`, err);
            }
          });
        }
      } catch (lualError) {
        console.warn('Failed to fetch LUAL power data:', lualError);
      }

      // Add LookUpNLive power infrastructure layer
      console.log('Loading LookUpNLive power infrastructure layer...');
      
      try {
        const lookupParams = new URLSearchParams({
          where: '1=1',
          geometry: mercatorBbox,
          geometryType: 'esriGeometryEnvelope',
          inSR: 3857,
          outSR: 4283,  
          spatialRel: 'esriSpatialRelIntersects',
          outFields: '*',
          returnGeometry: true,
          f: 'geojson'
        });

        const lookupUrl = `${POWER_CONFIG.services[1].url}/query?${lookupParams.toString()}`;
        console.log('LookUpNLive request URL:', lookupUrl);
        const lookupResponse = await proxyRequest(lookupUrl);
        console.log('LookUpNLive response:', lookupResponse);

        if (lookupResponse?.features?.length > 0) {
          console.log(`Drawing ${lookupResponse.features.length} LookUpNLive power features...`);
          powerFeatures = powerFeatures.concat(lookupResponse.features);

          lookupResponse.features.forEach((powerFeature, index) => {
            console.log(`Drawing LookUpNLive power feature ${index + 1}...`);
            
            if (!powerFeature.geometry) {
              console.warn(`LookUpNLive power feature ${index + 1} has no geometry`);
              return;
            }

            try {
              const style = {
                strokeStyle: '#FFBD33',
                lineWidth: 4
              };

              switch (powerFeature.geometry.type) {
                case 'LineString':
                  drawPolyline(ctx, powerFeature.geometry.coordinates, centerX, centerY, size, config.width, style);
                  break;
                  
                case 'MultiLineString':
                  powerFeature.geometry.coordinates.forEach(line => {
                    drawPolyline(ctx, line, centerX, centerY, size, config.width, style);
                  });
                  break;
                  
                case 'Point':
                  const [x, y] = transformCoordinates(powerFeature.geometry.coordinates, centerX, centerY, size, config.width);
                  ctx.beginPath();
                  ctx.arc(x, y, 8, 0, 2 * Math.PI);
                  ctx.fillStyle = '#FFBD33';
                  ctx.fill();
                  ctx.strokeStyle = '#CC7A00';
                  ctx.lineWidth = 2;
                  ctx.stroke();
                  break;
                  
                case 'MultiPoint':
                  powerFeature.geometry.coordinates.forEach(point => {
                    const [x, y] = transformCoordinates(point, centerX, centerY, size, config.width);
                    ctx.beginPath();
                    ctx.arc(x, y, 8, 0, 2 * Math.PI);
                    ctx.fillStyle = '#FFBD33';
                    ctx.fill();
                    ctx.strokeStyle = '#CC7A00';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                  });
                  break;
                  
                default:
                  console.warn(`Unsupported LookUpNLive geometry type: ${powerFeature.geometry.type}`);
              }
            } catch (err) {
              console.warn(`Error drawing LookUpNLive power feature ${index + 1}:`, err);
            }
          });
        }
      } catch (lookupError) {
        console.warn('Failed to fetch LookUpNLive power data:', lookupError);
      }

    } catch (error) {
      console.warn('Failed to load power infrastructure layer:', error);
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
    const legendHeight = 200;
    const legendWidth = 220;
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
    ctx.fillText('Power Infrastructure', legendX + padding, legendY + padding);

    // Draw legend items
    const items = [
      { label: 'Overhead Line', style: { strokeStyle: '#FFBD33', lineWidth: 4 } },
      { label: 'Underground Line', style: { strokeStyle: '#FFBD33', lineWidth: 4, dashArray: [15, 10] } },
      { label: 'Power Point', type: 'point', style: { fillStyle: '#FFBD33', strokeStyle: '#CC7A00' } }
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
        
        if (item.style.dashArray) {
          ctx.setLineDash(item.style.dashArray);
        } else {
          ctx.setLineDash([]);
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw label
      ctx.font = '14px Public Sans';
      ctx.fillStyle = '#000000';
      ctx.fillText(item.label, legendX + padding + lineLength + 10, currentY + 8);

      currentY += spacing;
    });

    // Store the features directly in the feature object
    feature.properties.powerFeatures = powerFeatures;

    return {
      image: canvas.toDataURL('image/png', 1.0),
      features: powerFeatures
    };

  } catch (error) {
    console.error('Failed to capture power infrastructure map:', error);
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