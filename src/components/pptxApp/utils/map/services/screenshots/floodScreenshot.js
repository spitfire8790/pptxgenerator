import { LAYER_CONFIGS } from '../../config/layerConfigs';
import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';
import { calculateMercatorParams } from '../../utils/coordinates';
import { getWMSImage } from '../wmsService';
import { getArcGISImage } from '../arcgisService';
import { createCanvas, drawImage, drawBoundary } from '../../utils/canvas';
import { proxyRequest } from '../../../services/proxyService';
import { loadImage } from '../../utils/image';
import { giraffeState } from '@gi-nx/iframe-sdk';
import { calculateBounds } from '../../utils/boundsUtils';
import { drawFeatureBoundaries, drawDevelopableAreaBoundaries } from '../../utils/drawingUtils';

// Layer configurations
const LAYER_CONFIG_FLOOD = {
  baseUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/nsw_1aep_flood_extents/FeatureServer/0',
  layerId: 5180,
  size: 2048,
  width: 2048,
  height: 2048,
  padding: 0.3,
  dpi: 300,
  format: 'png32',
  transparent: true,
  showBoundary: true
};

const LAYER_CONFIG_AERIAL = {
  url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service',
  layers: 'Australia_latest',
  opacity: 0.7,
  width: 2048,
  height: 2048,
  padding: 0.3,
  dpi: 300
};

export async function captureFloodMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false, showLabels = false, showDevelopableArealabels = false) {
  if (!feature) return null;
  
  try {
    const config = LAYER_CONFIG_FLOOD;
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
    
    // Create base canvas
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d', { alpha: true });

    try {
      // 1. Aerial imagery (base)
      const aerialConfig = LAYER_CONFIG_AERIAL;
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
        DPI: aerialConfig.dpi,
        MAP_RESOLUTION: aerialConfig.dpi,
        FORMAT_OPTIONS: `dpi:${aerialConfig.dpi}`
      });

      const url = `${aerialConfig.url}?${params.toString()}`;
      const baseMap = await loadImage(url);
      drawImage(ctx, baseMap, canvas.width, canvas.height, aerialConfig.opacity);
    } catch (error) {
      console.warn('Failed to load aerial layer:', error);
    }

    try {
      // 2. Flood layer from Giraffe
      console.log('Fetching project layers from Giraffe...');
      const projectLayers = await giraffeState.get('projectLayers');
      const floodLayer = projectLayers?.find(layer => layer.layer === config.layerId);
      console.log('Found flood layer:', floodLayer);
      
      if (floodLayer) {
        console.log('Calculating Mercator parameters...');
        const { bbox } = calculateMercatorParams(centerX, centerY, size);
        console.log('Bbox:', bbox);
        
        // Extract the actual service URL and token from the vector tiles URL
        const vectorTileUrl = floodLayer.layer_full?.vector_source?.tiles?.[0];
        console.log('Vector tile URL:', vectorTileUrl);
        
        if (vectorTileUrl) {
          const decodedUrl = decodeURIComponent(vectorTileUrl.split('/featureServer/{z}/{x}/{y}/')?.[1] || '');
          console.log('Decoded URL:', decodedUrl);
          
          const extractedToken = decodedUrl.split('token=')?.[1]?.split('&')?.[0];
          console.log('Extracted token:', extractedToken);
          
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

          const url = `${config.baseUrl}/query?${params.toString()}`;
          console.log('Final flood request URL (with sensitive info removed):', url.replace(extractedToken, 'REDACTED'));
          
          const floodResponse = await proxyRequest(url);
          console.log('Flood response:', floodResponse);

          if (floodResponse.features?.length > 0) {
            console.log(`Drawing ${floodResponse.features.length} flood features...`);
            // Store the flood features and transformation parameters
            floodResponse.transformParams = { centerX, centerY, size };
            
            // Store flood features in feature properties for all features
            if (feature.type === 'FeatureCollection' && feature.features?.length > 0) {
              for (const f of feature.features) {
                if (!f.properties) {
                  f.properties = {};
                }
                f.properties.site_suitability__floodFeatures = floodResponse;
              }
            } else {
              // Single feature case
              if (!feature.properties) {
                feature.properties = {};
              }
              feature.properties.site_suitability__floodFeatures = floodResponse;
            }
            
            floodResponse.features.forEach((feature, index) => {
              console.log(`Drawing flood feature ${index + 1}...`);
              
              // Handle MultiPolygon geometry type
              if (feature.geometry.type === 'MultiPolygon') {
                feature.geometry.coordinates.forEach(polygonCoords => {
                  // Draw each polygon in the MultiPolygon separately
                  polygonCoords.forEach(coords => {
                    drawBoundary(ctx, coords, centerX, centerY, size, config.width, {
                      fill: true,
                      strokeStyle: 'rgba(0, 0, 255, 0.6)',
                      fillStyle: 'rgba(0, 0, 255, 0.6)',
                      lineWidth: 2
                    });
                  });
                });
              } else {
                // Handle regular Polygon geometry type
                drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width, {
                  fill: true,
                  strokeStyle: 'rgba(0, 0, 255, 0.6)',
                  fillStyle: 'rgba(0, 0, 255, 0.6)',
                  lineWidth: 2
                });
              }
            });
            console.log('Finished drawing flood features');
          } else {
            console.log('No flood features found in response');
          }
        }
      } else {
        console.log('Flood layer not found in project layers');
      }
    } catch (error) {
      console.error('Failed to load flood extents:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }

    // Draw boundaries for all features if it's a collection
    if (feature.type === 'FeatureCollection' && feature.features?.length > 0) {
      console.log(`Drawing boundaries for ${feature.features.length} features`);
      for (const f of feature.features) {
        drawFeatureBoundaries(ctx, f, centerX, centerY, size, config.width, { 
          showLabels,
          strokeStyle: 'rgba(255, 0, 0, 0.9)',  // More opaque red
          lineWidth: 4  // Thicker line
        });
      }
    } else {
      // Single feature case
      drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width, { 
        showLabels,
        strokeStyle: 'rgba(255, 0, 0, 0.9)',  // More opaque red
        lineWidth: 4  // Thicker line 
      });
    }

    if (developableArea?.features?.length > 0 && showDevelopableArea) {
      // Use the helper function to draw developable areas with labels
      drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width, showDevelopableArealabels);
    }

    // Store the screenshot
    const screenshot = canvas.toDataURL('image/png', 1.0);
    
    // Store the screenshot in all features if it's a collection
    if (feature.type === 'FeatureCollection' && feature.features?.length > 0) {
      for (const f of feature.features) {
        if (!f.properties) {
          f.properties = {};
        }
        f.properties.floodMapScreenshot = screenshot;
      }
    } else {
      // Single feature case
      if (!feature.properties) {
        feature.properties = {};
      }
      feature.properties.floodMapScreenshot = screenshot;
    }

    // Return both the screenshot and properties with the features
    return {
      dataURL: screenshot,
      properties: feature.properties
    };
  } catch (error) {
    console.error('Failed to capture flood map:', error);
    return null;
  }
}