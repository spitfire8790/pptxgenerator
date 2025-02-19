import { LAYER_CONFIGS } from '../config/layerConfigs';
import { SCREENSHOT_TYPES } from '../config/screenshotTypes';
import { calculateMercatorParams } from '../utils/coordinates';
import { getWMSImage } from './wmsService';
import { getArcGISImage } from './arcgisService';
import { createCanvas, drawImage, drawBoundary, drawPolyline } from '../utils/canvas';
import { proxyRequest } from '../../services/proxyService';
import { loadImage } from '../utils/image';
import { giraffeState } from '@gi-nx/iframe-sdk';
import proj4 from 'proj4';
import { getPTALToken } from './tokenService';
import * as turf from '@turf/turf';
import { HISTORICAL_LAYERS, METROMAP_CONFIG } from '../config/historicalLayers';


console.log('Aerial config:', LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL]);

export async function captureMapScreenshot(feature, type = SCREENSHOT_TYPES.SNAPSHOT, drawBoundaryLine = true, developableArea = null, showDevelopableArea = true) {
  if (!feature || !LAYER_CONFIGS[type]) return null;
  
  try {
    const config = LAYER_CONFIGS[type];
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    
    // Get Mercator parameters for proper coordinate transformation
    const { bbox, mercatorCoords } = calculateMercatorParams(centerX, centerY, size);
        
    const baseMapImage = config.layerId ? 
      await getWMSImage(LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL], centerX, centerY, size) : 
      null;

    const mainImage = config.layerId ?
      await getArcGISImage(config, centerX, centerY, size) :
      await getWMSImage(config, centerX, centerY, size);

    const canvas = createCanvas(config.width || config.size, config.height || config.size);
    const ctx = canvas.getContext('2d', { alpha: true });

    if (baseMapImage) {
      drawImage(ctx, baseMapImage, canvas.width, canvas.height, 0.7);
    }
    
    drawImage(ctx, mainImage, canvas.width, canvas.height, config.layerId ? 0.7 : 1.0);

    // Add cadastre layer only for property snapshot
    if (type === SCREENSHOT_TYPES.SNAPSHOT) {
      try {
        const cadastreConfig = {
          url: 'https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Cadastre/MapServer',
          layerId: 9,
          size: config.width || config.size,
          padding: config.padding
        };

        const params = new URLSearchParams({
          f: 'image',
          format: 'png32',
          transparent: 'true',
          size: `${cadastreConfig.size},${cadastreConfig.size}`,
          bbox: bbox,  // Use the mercator bbox we already calculated
          bboxSR: 3857,
          imageSR: 3857,
          layers: `show:${cadastreConfig.layerId}`,
          dpi: 300
        });

        const cadastreUrl = `${cadastreConfig.url}/export?${params.toString()}`;
        const cadastreProxyUrl = await proxyRequest(cadastreUrl);
        
        if (cadastreProxyUrl) {
          const cadastreLayer = await loadImage(cadastreProxyUrl);
          // Draw cadastre with reduced opacity to not overwhelm other layers
          drawImage(ctx, cadastreLayer, canvas.width, canvas.height, 1);
        }
      } catch (error) {
        console.warn('Failed to load cadastre layer:', error);
      }
    }

    if (developableArea?.features?.[0] && showDevelopableArea) {
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width || config.size, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    if (drawBoundaryLine && feature.geometry?.coordinates?.[0]) {
      drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width || config.size, {
        strokeStyle: '#FF0000',
        lineWidth: 6
      });
    }

    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.warn('Failed to capture screenshot:', error);
    return null;
  }
}

export function calculateBounds(feature, padding, developableArea = null) {
  // Start with property bounds
  let coordinates = feature.geometry.coordinates[0];
  
  // If we have a developable area, include its coordinates too
  if (developableArea?.features?.[0]) {
    coordinates = [
      ...coordinates,
      ...developableArea.features[0].geometry.coordinates[0]
    ];
  }

  const bounds = coordinates.reduce((acc, coord) => ({
    minX: Math.min(acc.minX, coord[0]),
    minY: Math.min(acc.minY, coord[1]),
    maxX: Math.max(acc.maxX, coord[0]),
    maxY: Math.max(acc.maxY, coord[1])
  }), {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity
  });

  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const width = Math.abs(bounds.maxX - bounds.minX);
  const height = Math.abs(bounds.maxY - bounds.minY);
  const size = Math.max(width, height) * (1 + padding * 2);

  return { centerX, centerY, size };
}

export async function capturePrimarySiteAttributesMap(feature, developableArea = null, showDevelopableArea = true) {
  if (!feature) return null;
  
  try {
    const config = LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL];
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    
    // Create base canvas
    const canvas = createCanvas(config.width || config.size, config.height || config.size);
    const ctx = canvas.getContext('2d', { alpha: true });

    try {
      // 1. Aerial imagery (base)
      const baseMap = await getWMSImage(LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL], centerX, centerY, size);
      drawImage(ctx, baseMap, canvas.width, canvas.height, 0.7);
    } catch (error) {
      console.warn('Failed to load aerial layer:', error);
    }

    try {
      // 2. Zoning
      const zoningLayer = await getArcGISImage(LAYER_CONFIGS[SCREENSHOT_TYPES.ZONING], centerX, centerY, size);
      drawImage(ctx, zoningLayer, canvas.width, canvas.height, 0.3);
    } catch (error) {
      console.warn('Failed to load zoning layer:', error);
    }

    try {
      // 3. Easements layer 
      const easementsConfig = {
        url: 'https://mapuat3.environment.nsw.gov.au/arcgis/rest/services/Common/Admin_3857/MapServer',
        layerId: 25,
        size: 2048,
        padding: 0.2
      };

      const params = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${easementsConfig.size},${easementsConfig.size}`,
        bbox: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        bboxSR: 4326,
        imageSR: 3857,
        layers: `show:${easementsConfig.layerId}`,
        dpi: 96
      });

      // Use proxy service to avoid CORS issues
      const easementsUrl = await proxyRequest(`${easementsConfig.url}/export?${params.toString()}`);
      const easementsLayer = await loadImage(easementsUrl);
      drawImage(ctx, easementsLayer, canvas.width, canvas.height, 1);
    } catch (error) {
      console.warn('Failed to load easements layer:', error);
    }

    try {
      // 4. Biodiversity Values
      const biodiversityConfig = {
        url: 'https://www.lmbc.nsw.gov.au/arcgis/rest/services/BV/BiodiversityValues/MapServer',
        layerId: 0,
        size: 2048,
        padding: 0.2
      };
      const biodiversityUrl = await proxyRequest(`${biodiversityConfig.url}/export?${new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${biodiversityConfig.size},${biodiversityConfig.size}`,
        bbox: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        bboxSR: 4283,
        imageSR: 4283,
        layers: `show:${biodiversityConfig.layerId}`,
        dpi: 96
      })}`);
      const biodiversityLayer = await loadImage(biodiversityUrl);
      drawImage(ctx, biodiversityLayer, canvas.width, canvas.height, 1);
    } catch (error) {
      console.warn('Failed to load biodiversity layer:', error);
    }

    try {
      // 5. High Voltage Power Lines
      const powerLinesConfig = {
        url: 'https://services.ga.gov.au/gis/rest/services/Foundation_Electricity_Infrastructure/MapServer',
        layerId: 2,
        size: 2048,
        padding: 0.2
      };
      const powerLinesUrl = await proxyRequest(`${powerLinesConfig.url}/export?${new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${powerLinesConfig.size},${powerLinesConfig.size}`,
        bbox: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        bboxSR: 4283,
        imageSR: 4283,
        layers: `show:${powerLinesConfig.layerId}`,
        dpi: 96
      })}`);
      const powerLinesLayer = await loadImage(powerLinesUrl);
      drawImage(ctx, powerLinesLayer, canvas.width, canvas.height, 1);
    } catch (error) {
      console.warn('Failed to load power lines layer:', error);
    }

    try {
      // 6. 1AEP Flood Extents from Giraffe layer
      console.log('Starting flood extents capture...');
      const floodConfig = {
        baseUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/nsw_1aep_flood_extents/FeatureServer/0',
        layerId: 5180
      };

      // Get the flood layer data from Giraffe
      console.log('Fetching project layers from Giraffe...');
      const projectLayers = await giraffeState.get('projectLayers');
      const floodLayer = projectLayers?.find(layer => layer.layer === floodConfig.layerId);
      console.log('Found flood layer:', floodLayer);
      
      if (floodLayer) {
        console.log('Calculating Mercator parameters...');
        const { bbox } = calculateMercatorParams(centerX, centerY, size);
        console.log('Bbox:', bbox);
        
        // Extract the actual service URL and token from the vector tiles URL
        const vectorTileUrl = floodLayer.layer_full?.vector_source?.tiles?.[0];
        console.log('Vector tile URL:', vectorTileUrl);
        
        // Decode the URL-encoded portion to extract the token
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

          const url = `${floodConfig.baseUrl}/query?${params.toString()}`;
          console.log('Final flood request URL (with sensitive info removed):', url.replace(extractedToken, 'REDACTED'));
          
          const floodResponse = await proxyRequest(url);
          console.log('Flood response:', floodResponse);

          if (floodResponse.features?.length > 0) {
            console.log(`Drawing ${floodResponse.features.length} flood features...`);
            // Store the flood features and transformation parameters in the feature object
            floodResponse.transformParams = { centerX, centerY, size };
            feature.properties.site_suitability__floodFeatures = floodResponse;
            
            floodResponse.features.forEach((feature, index) => {
              console.log(`Drawing flood feature ${index + 1}...`);
              
              // Handle MultiPolygon geometry type
              if (feature.geometry.type === 'MultiPolygon') {
                feature.geometry.coordinates.forEach(polygonCoords => {
                  // Draw each polygon in the MultiPolygon separately
                  polygonCoords.forEach(coords => {
                    drawBoundary(ctx, coords, centerX, centerY, size, config.size || config.width, {
                      fill: true,
                      strokeStyle: 'rgba(0, 0, 255, 0.6)',
                      fillStyle: 'rgba(0, 0, 255, 0.6)',
                      lineWidth: 2
                    });
                  });
                });
              } else {
                // Handle regular Polygon geometry type
                drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.size || config.width, {
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

    // Always draw boundaries even if some layers fail
    drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.size || config.width, {
      strokeStyle: '#FF0000',
      lineWidth: 6
    });

    if (developableArea?.features?.[0] && showDevelopableArea) {
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Failed to capture primary site attributes map:', error);
    return null; // Return null instead of throwing
  }
}

export async function captureContourMap(feature, developableArea = null, showDevelopableArea = true) {
  if (!feature) return null;
  
  try {
    const config = LAYER_CONFIGS[SCREENSHOT_TYPES.CONTOUR];
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    
    console.log('Raw coordinates:', { centerX, centerY, size });
    
    // Create base canvas
    const canvas = createCanvas(config.width || config.size, config.height || config.size);
    const ctx = canvas.getContext('2d', { alpha: true });

    try {
      // 1. Aerial imagery (base) - Use Mercator coordinates like other working slides
      console.log('Loading aerial layer...');
      const aerialConfig = LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL];
      const { bbox } = calculateMercatorParams(centerX, centerY, size);
      
      const params = new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: '1.3.0',
        REQUEST: 'GetMap',
        BBOX: bbox,
        CRS: 'EPSG:3857',
        WIDTH: aerialConfig.width || aerialConfig.size,
        HEIGHT: aerialConfig.height || aerialConfig.size,
        LAYERS: aerialConfig.layers,
        STYLES: '',
        FORMAT: 'image/png',
        DPI: 300,
        MAP_RESOLUTION: 300,
        FORMAT_OPTIONS: 'dpi:300'
      });

      const url = `${aerialConfig.url}?${params.toString()}`;
      console.log('Aerial request URL:', url);
      const baseMap = await loadImage(url);
      console.log('Aerial layer loaded');
      drawImage(ctx, baseMap, canvas.width, canvas.height, 0.7);
    } catch (error) {
      console.warn('Failed to load aerial layer:', error);
    }

    try {
      // 2. Contour layer with reduced opacity - Use GDA94 coordinates
      console.log('Loading contour layer...');
      const params = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'false',
        size: `${config.size},${config.size}`,
        bboxSR: 4283,
        imageSR: 4283,
        bbox: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        layers: `show:${config.layerId}`,
        dpi: config.dpi || 300
      });

      const url = `${config.url}/export?${params.toString()}`;
      console.log('Contour request URL:', url);
      const proxyUrl = await proxyRequest(url);
      const contourLayer = await loadImage(proxyUrl);
      
      console.log('Contour layer loaded');
      drawImage(ctx, contourLayer, canvas.width, canvas.height, 0.7);
    } catch (error) {
      console.warn('Failed to load contour layer:', error);
    }

    // Draw boundaries - These should use the raw coordinates since we're in GDA94
    drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.size || config.width, {
      strokeStyle: '#FF0000',
      lineWidth: 6
    });

    if (developableArea?.features?.[0] && showDevelopableArea) {
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.size || config.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 6,
        dashArray: [20, 10]
      });
    }

    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Failed to capture contour map:', error);
    return null;
  }
}

export async function captureRegularityMap(feature, developableArea = null, showDevelopableArea = true) {
  if (!feature) return null;
  
  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.3
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    
    // Create base canvas
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d', { alpha: true });

    try {
      // 1. Aerial imagery (base) - Use Mercator coordinates like contour map
      console.log('Loading aerial layer...');
      const aerialConfig = LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL];
      const { bbox } = calculateMercatorParams(centerX, centerY, size);
      
      const params = new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: '1.3.0',
        REQUEST: 'GetMap',
        BBOX: bbox,
        CRS: 'EPSG:3857',
        WIDTH: aerialConfig.width || aerialConfig.size,
        HEIGHT: aerialConfig.height || aerialConfig.size,
        LAYERS: aerialConfig.layers,
        STYLES: '',
        FORMAT: 'image/png',
        DPI: 300,
        MAP_RESOLUTION: 300,
        FORMAT_OPTIONS: 'dpi:300'
      });

      const url = `${aerialConfig.url}?${params.toString()}`;
      console.log('Aerial request URL:', url);
      const baseMap = await loadImage(url);
      console.log('Aerial layer loaded');
      drawImage(ctx, baseMap, canvas.width, canvas.height, 0.7);
    } catch (error) {
      console.warn('Failed to load aerial layer:', error);
    }

    // Draw property boundary
    drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width, {
      strokeStyle: '#FF0000',
      lineWidth: 6
    });

    // Draw developable area if it exists
    if (developableArea?.features?.[0] && showDevelopableArea) {
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Failed to capture regularity map:', error);
    return null;
  }
}

export async function captureHeritageMap(feature, developableArea = null, showDevelopableArea = true) {
  if (!feature) return null;
  
  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.3
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    
    // Create base canvas
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d', { alpha: true });

    try {
      // 1. Aerial imagery (base)
      const aerialConfig = LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL];
      const { bbox } = calculateMercatorParams(centerX, centerY, size);
      
      const params = new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: '1.3.0',
        REQUEST: 'GetMap',
        BBOX: bbox,
        CRS: 'EPSG:3857',
        WIDTH: aerialConfig.width || aerialConfig.size,
        HEIGHT: aerialConfig.height || aerialConfig.size,
        LAYERS: aerialConfig.layers,
        STYLES: '',
        FORMAT: 'image/png',
        DPI: 300,
        MAP_RESOLUTION: 300,
        FORMAT_OPTIONS: 'dpi:300'
      });

      const url = `${aerialConfig.url}?${params.toString()}`;
      const baseMap = await loadImage(url);
      drawImage(ctx, baseMap, canvas.width, canvas.height, 0.7);
    } catch (error) {
      console.warn('Failed to load aerial layer:', error);
    }

    try {
      // 2. Heritage layer
      const heritageConfig = {
        url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer',
        layerId: 0,
        size: 2048,
        padding: 0.3
      };
      
      const heritageUrl = await proxyRequest(`${heritageConfig.url}/export?${new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${heritageConfig.size},${heritageConfig.size}`,
        bbox: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        bboxSR: 4283,
        imageSR: 4283,
        layers: `show:${heritageConfig.layerId}`,
        dpi: 300
      })}`);
      
      const heritageLayer = await loadImage(heritageUrl);
      drawImage(ctx, heritageLayer, canvas.width, canvas.height, 0.8);
    } catch (error) {
      console.warn('Failed to load heritage layer:', error);
    }

    // Draw boundaries
    drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width, {
      strokeStyle: '#FF0000',
      lineWidth: 6
    });

    if (developableArea?.features?.[0] && showDevelopableArea) {
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    try {
      // Load and draw the legend image
      const legendImage = await loadImage('/legends/heritage-layer-legend.png');
      
      // Position the legend in the bottom right with padding
      const padding = 30;
      const legendWidth = 450;  // Match the width from the image
      const legendHeight = 600; // Match the height from the image
      const legendX = canvas.width - legendWidth - padding;
      const legendY = canvas.height - legendHeight - padding;

      // Draw legend background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
      ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

      // Draw the legend image
      ctx.drawImage(legendImage, legendX, legendY, legendWidth, legendHeight);
    } catch (error) {
      console.warn('Failed to load or draw legend image:', error);
    }

    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Failed to capture heritage map:', error);
    return null;
  }
}

export async function captureAcidSulfateMap(feature, developableArea = null, showDevelopableArea = true) {
  if (!feature) return null;
  
  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.3
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    
    // Create base canvas
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d', { alpha: true });

    try {
      // 1. Aerial imagery (base)
      const aerialConfig = LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL];
      const { bbox } = calculateMercatorParams(centerX, centerY, size);
      
      const params = new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: '1.3.0',
        REQUEST: 'GetMap',
        BBOX: bbox,
        CRS: 'EPSG:3857',
        WIDTH: aerialConfig.width || aerialConfig.size,
        HEIGHT: aerialConfig.height || aerialConfig.size,
        LAYERS: aerialConfig.layers,
        STYLES: '',
        FORMAT: 'image/png',
        DPI: 300,
        MAP_RESOLUTION: 300,
        FORMAT_OPTIONS: 'dpi:300'
      });

      const url = `${aerialConfig.url}?${params.toString()}`;
      const baseMap = await loadImage(url);
      drawImage(ctx, baseMap, canvas.width, canvas.height, 0.7);
    } catch (error) {
      console.warn('Failed to load aerial layer:', error);
    }

    try {
      // 2. Acid Sulfate Soils layer
      const acidSulfateConfig = {
        url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/Protection/MapServer',
        layerId: 1,
        size: 2048,
        padding: 0.3
      };
      
      const acidSulfateUrl = await proxyRequest(`${acidSulfateConfig.url}/export?${new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${acidSulfateConfig.size},${acidSulfateConfig.size}`,
        bbox: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        bboxSR: 4283,
        imageSR: 4283,
        layers: `show:${acidSulfateConfig.layerId}`,
        dpi: 300
      })}`);
      
      const acidSulfateLayer = await loadImage(acidSulfateUrl);
      drawImage(ctx, acidSulfateLayer, canvas.width, canvas.height, 0.8);
    } catch (error) {
      console.warn('Failed to load acid sulfate soils layer:', error);
    }

    // Draw boundaries
    drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width, {
      strokeStyle: '#FF0000',
      lineWidth: 6
    });

    if (developableArea?.features?.[0] && showDevelopableArea) {
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    // Add legend
    const legendHeight = 380; // Reduced height to remove extra space
    const legendWidth = 400;
    const padding = 30;
    const lineHeight = 40; // Reduced line height for tighter spacing
    const legendX = canvas.width - legendWidth - padding;
    const legendY = canvas.height - legendHeight - padding;
    const swatchSize = 30;

    // Legend items with their colors (using the exact colors from the renderer)
    const legendItems = [
      { label: 'Class 1', color: 'rgba(0, 197, 255, 255)' },
      { label: 'Class 2', color: 'rgba(255, 0, 197, 255)' },
      { label: 'Class 2b', color: 'rgba(255, 0, 120, 255)' },
      { label: 'Class 3', color: 'rgba(255, 190, 232, 255)' },
      { label: 'Class 4', color: 'rgba(223, 115, 255, 255)' },
      { label: 'Class 5', color: 'rgba(255, 255, 190, 255)' },
      { label: 'Non Standard Values', color: 'rgba(110, 110, 110, 255)', pattern: true }
    ];

    // Draw legend background with border
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

    // Legend title
    ctx.font = 'bold 32px Public Sans';
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'top';
    ctx.fillText('Acid Sulfate Soil Risk', legendX + padding, legendY + padding);

    // Draw legend items
    ctx.textBaseline = 'middle';
    ctx.font = '24px Public Sans';

    legendItems.forEach((item, index) => {
      const y = legendY + padding + 60 + (index * lineHeight);
      
      // Draw color swatch
      ctx.fillStyle = item.color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.fillRect(legendX + padding, y - swatchSize/2, swatchSize, swatchSize);
      ctx.strokeRect(legendX + padding, y - swatchSize/2, swatchSize, swatchSize);

      // Add diagonal pattern for non-standard values
      if (item.pattern) {
        ctx.beginPath();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        
        // Save the current clip region
        ctx.save();
        
        // Create a clipping region that matches the square exactly
        ctx.beginPath();
        ctx.rect(legendX + padding, y - swatchSize/2, swatchSize, swatchSize);
        ctx.clip();
        
        // Draw diagonal lines
        const spacing = 6; // Slightly reduced spacing for more lines
        for (let i = -swatchSize; i <= swatchSize * 2; i += spacing) {
          const x = legendX + padding + i;
          ctx.moveTo(x, y - swatchSize/2);
          ctx.lineTo(x + swatchSize, y + swatchSize/2);
        }
        ctx.stroke();
        
        // Restore the original clip region
        ctx.restore();
      }
      
      // Draw label
      ctx.fillStyle = '#000000';
      ctx.fillText(item.label, legendX + padding + swatchSize + 20, y);
    });

    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Failed to capture acid sulfate soils map:', error);
    return null;
  }
}

export async function captureWaterMainsMap(feature, developableArea = null, showDevelopableArea = true) {
  if (!feature) return null;
  console.log('Starting water mains capture...');

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.2
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    let waterMainsFeatures = [];
    
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
      // 2. Water mains layer
      const waterMainsConfig = {
        baseUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/NSW_Water_Sewer_Infrastructure/FeatureServer/13',
        layerId: 14235
      };

      // Get the water mains layer data from Giraffe
      console.log('Fetching project layers from Giraffe...');
      const projectLayers = await giraffeState.get('projectLayers');
      const waterMainsLayer = projectLayers?.find(layer => layer.layer === waterMainsConfig.layerId);
      console.log('Found water mains layer:', waterMainsLayer);
      
      if (waterMainsLayer) {
        console.log('Calculating Mercator parameters...');
        const { bbox } = calculateMercatorParams(centerX, centerY, size);
        console.log('Bbox:', bbox);
        
        // Extract the actual service URL and token from the vector tiles URL
        const vectorTileUrl = waterMainsLayer.layer_full?.vector_source?.tiles?.[0];
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

          const url = `${waterMainsConfig.baseUrl}/query?${params.toString()}`;
          console.log('Final water mains request URL (with sensitive info removed):', url.replace(extractedToken, 'REDACTED'));
          
          const waterMainsResponse = await proxyRequest(url);
          console.log('Water mains response:', waterMainsResponse);

          if (waterMainsResponse.features?.length > 0) {
            console.log(`Drawing ${waterMainsResponse.features.length} water mains features...`);
            waterMainsFeatures = waterMainsResponse.features;
            
            // Store the features directly in the feature object
            feature.properties.waterFeatures = waterMainsFeatures;
            
            waterMainsFeatures.forEach((feature, index) => {
              console.log(`Drawing water mains feature ${index + 1}...`);
              drawBoundary(ctx, feature.geometry.coordinates, centerX, centerY, size, config.width, {
                strokeStyle: '#0000FF',
                lineWidth: 8
              });
            });
            console.log('Finished drawing water mains features');
          } else {
            console.log('No water mains features found in response');
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load water mains layer:', error);
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

    // Take screenshot
    const screenshot = await canvas.toDataURL();
    feature.properties.waterMainsScreenshot = screenshot;

    return { image: screenshot, features: waterMainsFeatures };
  } catch (error) {
    console.error('Failed to capture water mains map:', error);
    return null;
  }
}

export async function capturePowerMap(feature, developableArea = null, showDevelopableArea = true) {
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
      const wgs84 = 'EPSG:4326'; // Standard latitude/longitude
      const mga56 = '+proj=utm +zone=56 +south=false +ellps=GRS80 +towgs84=-202.33,-154.82,-176.12,0,0,0,0 +units=m +no_defs'; // MGA Zone 56
      const webMercator = 'EPSG:3857'; // Web Mercator

      // Define power config
      const powerConfig = {
        baseUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/NSW_Electricity_Infrastructure/FeatureServer/0',
        layerId: 19976
      };

      // Get the power layer data from Giraffe
      console.log('Fetching project layers from Giraffe...');
      const projectLayers = await giraffeState.get('projectLayers');
      const powerLayer = projectLayers?.find(layer => layer.layer === powerConfig.layerId);
      console.log('Found power layer:', powerLayer);

      if (powerLayer) {
        console.log('Processing Giraffe power layer...');
        const { bbox } = calculateMercatorParams(centerX, centerY, size);
        const vectorTileUrl = powerLayer.layer_full?.vector_source?.tiles?.[0];

        if (vectorTileUrl) {
          const decodedUrl = decodeURIComponent(vectorTileUrl.split('/featureServer/{z}/{x}/{y}/')?.[1] || '');
          const extractedToken = decodedUrl.split('token=')?.[1]?.split('&')?.[0];

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

          const url = `${powerConfig.baseUrl}/query?${params.toString()}`;
          console.log('Final power request URL (with sensitive info removed):', url.replace(extractedToken, 'REDACTED'));

          const powerResponse = await proxyRequest(url);
          console.log('Power response:', powerResponse);

          if (powerResponse.features?.length > 0) {
            console.log(`Drawing ${powerResponse.features.length} Giraffe power features...`);
            powerFeatures = powerFeatures.concat(powerResponse.features);

            powerResponse.features.forEach((feature, index) => {
              console.log(`Drawing Giraffe power feature ${index + 1}...`);

              if (feature.geometry?.coordinates) {
                drawBoundary(ctx, transformedCoordinates, centerX, centerY, size, config.width, {
                  strokeStyle: '#FFBD33',
                  lineWidth: 8
                });
              }
            });
          }
        }
      }

      // Add LUAL power infrastructure layer
      console.log('Loading LUAL power infrastructure layer...');
      const { bbox: mercatorBbox } = calculateMercatorParams(centerX, centerY, size);
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

      const lualUrl = `https://services-ap1.arcgis.com/ug6sGLFkytbXYo4f/arcgis/rest/services/LUAL_Network_LV_Public/FeatureServer/0/query?${lualParams.toString()}`;
      console.log('LUAL request URL:', lualUrl);
      const lualResponse = await proxyRequest(lualUrl);
      console.log('LUAL response:', lualResponse);

      if (lualResponse.features?.length > 0) {
        console.log(`Drawing ${lualResponse.features.length} LUAL power features...`);
        powerFeatures = powerFeatures.concat(lualResponse.features);

        lualResponse.features.forEach((feature, index) => {
          console.log(`Drawing LUAL power feature ${index + 1}...`);
          
          // Handle different geometry types
          let coordinates;
          if (feature.geometry.type === 'MultiLineString') {
            feature.geometry.coordinates.forEach(lineString => {
              const style = feature.properties.ASSET_TYPE === 'OH' ? {
                strokeStyle: '#FFBD33',
                lineWidth: 8
              } : {
                strokeStyle: '#FFBD33',
                lineWidth: 8,
                lineDash: [15, 10]
              };
              drawBoundary(ctx, lineString, centerX, centerY, size, config.width, style);
            });
          } else {
            // Single LineString
            const style = feature.properties.ASSET_TYPE === 'OH' ? {
              strokeStyle: '#FFBD33',
              lineWidth: 8
            } : {
              strokeStyle: '#FFBD33',
              lineWidth: 8,
              lineDash: [15, 10]
            };
            drawBoundary(ctx, feature.geometry.coordinates, centerX, centerY, size, config.width, style);
          }
        });
      }

      // Add LookUpNLive power infrastructure layer
      console.log('Loading LookUpNLive power infrastructure layer...');
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

      const lookupUrl = `https://services.arcgis.com/Gbs1D7TkFBVkx0Nz/ArcGIS/rest/services/LookUpNLive/FeatureServer/2/query?${lookupParams.toString()}`;
      console.log('LookUpNLive request URL:', lookupUrl);
      const lookupResponse = await proxyRequest(lookupUrl);
      console.log('LookUpNLive response:', lookupResponse);

      if (lookupResponse.features?.length > 0) {
        console.log(`Drawing ${lookupResponse.features.length} LookUpNLive power features...`);
        powerFeatures = powerFeatures.concat(lookupResponse.features);

        lookupResponse.features.forEach((feature, index) => {
          console.log(`Drawing LookUpNLive power feature ${index + 1}...`);

          // Handle different geometry types
          let coordinates;
          if (feature.geometry.type === 'MultiLineString') {
            feature.geometry.coordinates.forEach(lineString => {
              const style = {
                strokeStyle: '#FFBD33',
                lineWidth: 8
              };
              drawBoundary(ctx, lineString, centerX, centerY, size, config.width, style);
            });
          } else {
            // Single LineString
            const style = {
              strokeStyle: '#FFBD33',
              lineWidth: 8
            };
            drawBoundary(ctx, feature.geometry.coordinates, centerX, centerY, size, config.width, style);
          }
        });
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

export async function captureSewerMap(feature, developableArea = null, showDevelopableArea = true) {
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

      // Get the sewer layer data from Giraffe
      console.log('Fetching project layers from Giraffe...');
      const projectLayers = await giraffeState.get('projectLayers');
      const sewerLayer = projectLayers?.find(layer => layer.layer === sewerConfig.layerId);
      console.log('Found sewer layer:', sewerLayer);
      
      if (sewerLayer) {
        console.log('Calculating Mercator parameters...');
        const { bbox } = calculateMercatorParams(centerX, centerY, size);
        console.log('Bbox:', bbox);
        
        // Extract the actual service URL and token from the vector tiles URL
        const vectorTileUrl = sewerLayer.layer_full?.vector_source?.tiles?.[0];
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

          const url = `${sewerConfig.baseUrl}/query?${params.toString()}`;
          console.log('Final sewer request URL (with sensitive info removed):', url.replace(extractedToken, 'REDACTED'));
          
          const sewerResponse = await proxyRequest(url);
          console.log('Sewer response:', sewerResponse);

          if (sewerResponse.features?.length > 0) {
            console.log(`Drawing ${sewerResponse.features.length} sewer features...`);
            sewerFeatures = sewerResponse.features;

            // Store the features directly in the feature object
            feature.properties.sewerFeatures = sewerFeatures;

            sewerFeatures.forEach((feature, index) => {
              console.log(`Drawing sewer feature ${index + 1}...`);
              drawBoundary(ctx, feature.geometry.coordinates, centerX, centerY, size, config.width, {
                strokeStyle: '#964B00',
                lineWidth: 8
              });
            });
            console.log('Finished drawing sewer features');
          } else {
            console.log('No sewer features found in response');
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

    return {
      image: canvas.toDataURL('image/png', 1.0),
      features: sewerFeatures
    };

  } catch (error) {
    console.error('Failed to capture sewer infrastructure map:', error);
    return null;
  }
}

export async function captureGeoscapeMap(feature, developableArea = null, showDevelopableArea = true) {
  if (!feature) return null;
  console.log('Starting geoscape capture...');

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.2
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    let geoscapeFeatures = [];
    
    // Create base canvas
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d', { alpha: true });

    try {
      // 1. Aerial imagery (base)
      console.log('Loading aerial base layer...');
      const aerialConfig = LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL];
      const baseMapImage = await getWMSImage(aerialConfig, centerX, centerY, size);
      drawImage(ctx, baseMapImage, canvas.width, canvas.height, 0.7);
    } catch (error) {
      console.warn('Failed to load aerial layer:', error);
    }

    try {
      // 2. Geoscape layer from Giraffe
      console.log('Starting geoscape layer capture...');
      const geoscapeConfig = {
        baseUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/BLDS_Mar24_Geoscape/FeatureServer/0',
        layerId: 20976
      };

      // Get the geoscape layer data from Giraffe
      console.log('Fetching project layers from Giraffe...');
      const projectLayers = await giraffeState.get('projectLayers');
      const geoscapeLayer = projectLayers?.find(layer => layer.layer === geoscapeConfig.layerId);
      console.log('Found geoscape layer:', geoscapeLayer);
      
      if (geoscapeLayer) {
        console.log('Calculating Mercator parameters...');
        const { bbox } = calculateMercatorParams(centerX, centerY, size);
        console.log('Bbox:', bbox);
        
        // Extract the actual service URL and token from the vector tiles URL
        const vectorTileUrl = geoscapeLayer.layer_full?.vector_source?.tiles?.[0];
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

          const url = `${geoscapeConfig.baseUrl}/query?${params.toString()}`;
          console.log('Final geoscape request URL (with sensitive info removed):', url.replace(extractedToken, 'REDACTED'));
          
          const geoscapeResponse = await proxyRequest(url);
          console.log('Geoscape response:', geoscapeResponse);

          if (geoscapeResponse.features?.length > 0) {
            console.log(`Drawing ${geoscapeResponse.features.length} geoscape features...`);
            geoscapeFeatures = geoscapeResponse.features;
            geoscapeFeatures.forEach((feature, index) => {
              console.log(`Drawing geoscape feature ${index + 1}...`);
              drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width, {
                fill: true,
                strokeStyle: 'rgba(255, 165, 0, 0.8)',
                fillStyle: 'rgba(255, 165, 0, 0.6)',
                lineWidth: 2
              });
            });
            console.log('Finished drawing geoscape features');
          } else {
            console.log('No geoscape features found in response');
          }
        }
      } else {
        console.log('Geoscape layer not found in project layers');
      }
    } catch (error) {
      console.error('Failed to load geoscape layer:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }

    // Draw boundaries
    drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width, {
      strokeStyle: '#FF0000',
      lineWidth: 6
    });

    if (developableArea?.features?.[0] && showDevelopableArea) {
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    return {
      image: canvas.toDataURL('image/png', 1.0),
      features: geoscapeFeatures
    };
  } catch (error) {
    console.error('Failed to capture geoscape map:', error);
    return null;
  }
}

export async function captureStreetViewScreenshot(feature) {
  if (!feature) {
    console.log('No feature provided for Street View screenshot');
    return null;
  }

  const API_KEY = 'AIzaSyA39asjosevcj5vdSAlPoTNkrQ0Vmcouts';

  try {
    // Get the coordinates from the feature
    const coordinates = feature.geometry.coordinates[0];
    if (!coordinates || coordinates.length === 0) {
      console.error('Invalid coordinates in feature');
      return null;
    }

    // Calculate center point
    const center = {
      lng: coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length,
      lat: coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length
    };
    
    console.log('Property center:', center);

    // Generate test points at different distances
    const distances = [20, 30, 40, 50]; // meters
    const angles = Array.from({ length: 8 }, (_, i) => i * 45); // 8 directions

    const testPoints = [];
    for (const distance of distances) {
      for (const angle of angles) {
        // Convert angle to radians
        const angleRad = angle * Math.PI / 180;
        
        // Calculate offsets in meters and convert to degrees
        const latOffset = (distance * Math.cos(angleRad)) / 111111; // meters to degrees at equator
        const lngOffset = (distance * Math.sin(angleRad)) / (111111 * Math.cos(center.lat * Math.PI / 180));

        const testPoint = {
          lat: center.lat + latOffset,
          lng: center.lng + lngOffset,
          bearing: (angle + 180) % 360 // Point towards center
        };

        testPoints.push(testPoint);
      }
    }

    // Try each point until we find one with Street View coverage
    for (const point of testPoints) {
      console.log('Trying Street View at point:', point);

      try {
        // First check if Street View is available using the metadata API
        const metadataUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${point.lat},${point.lng}&radius=50&source=outdoor&key=${API_KEY}`;
        const metadataResponse = await fetch(metadataUrl);
        const metadata = await metadataResponse.json();

        if (metadata.status === 'OK') {
          // Calculate bearing from panorama location to property center
          const panoramaLat = metadata.location.lat;
          const panoramaLng = metadata.location.lng;
          
          // Calculate bearing from panorama to center
          const dLng = (center.lng - panoramaLng) * Math.PI / 180;
          const y = Math.sin(dLng) * Math.cos(center.lat * Math.PI / 180);
          const x = Math.cos(panoramaLat * Math.PI / 180) * Math.sin(center.lat * Math.PI / 180) -
                   Math.sin(panoramaLat * Math.PI / 180) * Math.cos(center.lat * Math.PI / 180) * Math.cos(dLng);
          const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

          // Create the street view image
          const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=3840x2160&location=${panoramaLat},${panoramaLng}&heading=${bearing}&pitch=0&fov=90&key=${API_KEY}`;
          console.log('Found valid Street View location, requesting image');
          const streetViewImage = await loadImage(streetViewUrl);

          // Create the mini map image showing camera position
          // Convert coordinates array to path string
          const pathCoords = coordinates.map(coord => `${coord[1]},${coord[0]}`).join('|');
          
          // Calculate appropriate zoom level based on property size
          const bounds = coordinates.reduce((acc, coord) => ({
            minLat: Math.min(acc.minLat, coord[1]),
            maxLat: Math.max(acc.maxLat, coord[1]),
            minLng: Math.min(acc.minLng, coord[0]),
            maxLng: Math.max(acc.maxLng, coord[0])
          }), {
            minLat: Infinity,
            maxLat: -Infinity,
            minLng: Infinity,
            maxLng: -Infinity
          });

          // Calculate center
          const mapCenter = {
            lat: (bounds.minLat + bounds.maxLat) / 2,
            lng: (bounds.minLng + bounds.maxLng) / 2
          };

          // Calculate zoom level based on property size
          const latSpan = bounds.maxLat - bounds.minLat;
          const lngSpan = bounds.maxLng - bounds.minLng;
          const maxSpan = Math.max(latSpan, lngSpan);
          // Reduce zoom level by 1 to add more padding
          const zoom = Math.floor(Math.log2(360 / maxSpan));  // Removed the +1 to zoom out slightly
          
          const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=400x400&key=${API_KEY}`
            + `&path=color:0x02d1b8|weight:4|fillcolor:0x02d1b833|geodesic=true`
            + `&path=color:0x02d1b8|weight:4|fillcolor:0x02d1b833|${pathCoords}`
            + `&markers=anchor:center|icon:https://maps.google.com/mapfiles/dir_${Math.round(bearing/22.5) % 16}.png|${panoramaLat},${panoramaLng}`
            + `&center=${mapCenter.lat},${mapCenter.lng}`
            + `&zoom=${zoom}`  // Using adjusted zoom level
            + '&style=feature:all|element:labels|visibility:off'
            + '&style=feature:landscape|element:geometry|color:0xffffff'
            + '&style=feature:road|element:geometry|color:0xe5e5e5'
            + '&style=feature:road.arterial|element:geometry|color:0xd4d4d4'
            + '&style=feature:road.local|element:geometry|color:0xe5e5e5'
            + '&style=feature:water|element:geometry|visibility:off'
            + '&maptype=roadmap';
          
          console.log('Requesting mini map');
          const miniMapImage = await loadImage(staticMapUrl);

          // Create final canvas with both images
          const canvas = createCanvas(1920, 1080);
          const ctx = canvas.getContext('2d');

          // Draw street view
          ctx.drawImage(streetViewImage, 0, 0, canvas.width, canvas.height);

          // Draw mini map in bottom right corner with solid black border
          const legendHeight = 225;
          const legendWidth = 400;
          const padding = 20;
          const borderWidth = 4;
          
          // Draw solid black border
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = borderWidth;
          ctx.setLineDash([]); // Remove dash pattern
          ctx.strokeRect(
            canvas.width - legendWidth - padding - borderWidth/2, 
            canvas.height - legendHeight - padding - borderWidth/2,
            legendWidth + borderWidth,
            legendHeight + borderWidth
          );

          // Draw mini map
          ctx.drawImage(
            miniMapImage,
            canvas.width - legendWidth - padding,
            canvas.height - legendHeight - padding,
            legendWidth,
            legendHeight
          );
          
          return canvas.toDataURL('image/png', 1.0);
        }
        
        console.log('No Street View at this point, trying next point...');
      } catch (error) {
        console.log('Error checking Street View at this point, trying next point...', error);
        continue;
      }
    }

    console.log('No Street View coverage found at any tested location');
    return null;
  } catch (error) {
    console.error('Failed to capture Street View screenshot:', error);
    return null;
  }
}

async function getRoadFeatures(centerX, centerY, size) {
  console.log('Fetching road features with params:', { centerX, centerY, size });
  
  // Create bbox in GDA94 coordinates
  const bbox = `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`;
  console.log('Query bbox:', bbox);

  const url = 'https://portal.data.nsw.gov.au/arcgis/rest/services/RoadSegment/MapServer/0/query';
  const params = new URLSearchParams({
    f: 'json',
    geometry: bbox,
    geometryType: 'esriGeometryEnvelope',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'ROADNAMEST,FUNCTION,LANECOUNT',
    returnGeometry: true,
    inSR: 4283,  // Input spatial reference (GDA94)
    outSR: 4283  // Output spatial reference (GDA94)
  });

  try {
    const response = await proxyRequest(`${url}?${params}`);
    console.log('Road features response:', response);
    
    if (response?.features?.length > 0) {
      console.log(`Found ${response.features.length} road features`);
      
      // Create a Map to store unique road features based on name and function
      const uniqueRoads = new Map();
      
      // Convert the features to GeoJSON format and deduplicate
      response.features.forEach(feature => {
        const roadKey = `${feature.attributes.roadnamest}|${feature.attributes.function}`;
        
        // Only add if we haven't seen this road name + function combination before
        if (!uniqueRoads.has(roadKey)) {
          uniqueRoads.set(roadKey, {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: feature.geometry.paths?.[0] || []
            },
            properties: {
              ROADNAMEST: feature.attributes.roadnamest,
              FUNCTION: feature.attributes.function,
              LANECOUNT: feature.attributes.lanecount
            }
          });
        }
      });
      
      const features = Array.from(uniqueRoads.values());
      console.log('Converted and deduplicated features:', features);
      return features;
    }
    return [];
  } catch (error) {
    console.error('Error fetching road features:', error);
    return [];
  }
}

export async function captureRoadsMap(feature, developableArea = null, showDevelopableArea = true) {
  if (!feature) return null;
  console.log('Starting roads capture...');

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.2
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    
    // Get road features first
    console.log('Fetching road features...');
    const roadFeatures = await getRoadFeatures(centerX, centerY, size);
    console.log('Retrieved road features:', roadFeatures);
    
    // Store the features in the feature object
    if (feature.properties) {
      feature.properties.roadFeatures = roadFeatures;
    } else {
      feature.properties = { roadFeatures };
    }
    
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
      drawImage(ctx, baseMap, canvas.width, canvas.height, 0.3);
    } catch (error) {
      console.error('Failed to load aerial layer:', error);
    }

    try {
      // 2. Roads layer
      console.log('Loading roads layer...');
      const roadsConfig = {
        url: 'https://portal.data.nsw.gov.au/arcgis/rest/services/RoadSegment/MapServer',
        layerId: 0,
        size: 2048,
        padding: 0.2
      };

      // Convert coordinates to Web Mercator (3857) for better compatibility
      const { bbox: mercatorBbox } = calculateMercatorParams(centerX, centerY, size);
      
      const params = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${roadsConfig.size},${roadsConfig.size}`,
        bbox: mercatorBbox,
        bboxSR: 3857,
        imageSR: 3857,
        layers: 'show:0',
        dpi: 300
      });

      const url = `${roadsConfig.url}/export?${params.toString()}`;
      console.log('Requesting roads layer through proxy...', url);
      
      try {
        const proxyUrl = await proxyRequest(url);
        if (proxyUrl) {
          console.log('Loading roads image from proxy URL...');
          const roadsLayer = await loadImage(proxyUrl);
          console.log('Roads layer loaded successfully');
          // Increase opacity for better visibility
          drawImage(ctx, roadsLayer, canvas.width, canvas.height, 1);
        } else {
          console.warn('Failed to get proxy URL for roads layer');
        }
      } catch (error) {
        console.warn('Failed to load roads layer:', error);
      }
    } catch (error) {
      console.warn('Failed to load roads layer:', error);
    }

    try {
      // 3. Road Labels layer from SIX Maps
      console.log('Loading road labels layer...');
      const labelsConfig = {
        url: 'https://maps.six.nsw.gov.au/arcgis/rest/services/sixmaps/LPI_RasterLabels_1/MapServer',
        layerId: 0,
        size: 2048,
        padding: 0.2
      };

      // Use Web Mercator coordinates for labels layer
      const { bbox: labelsBbox } = calculateMercatorParams(centerX, centerY, size);
      console.log('Labels bbox:', labelsBbox);
      
      const params = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${labelsConfig.size},${labelsConfig.size}`,
        bbox: labelsBbox,
        bboxSR: 3857,
        imageSR: 3857,
        layers: 'show:0',
        dpi: 192  // Increased from 96 to make labels bigger
      });

      const url = `${labelsConfig.url}/export?${params.toString()}`;
      console.log('Requesting road labels through proxy...', url);
      
      const proxyUrl = await proxyRequest(url);
      if (!proxyUrl) {
        throw new Error('Failed to get proxy URL for road labels');
      }
      
      console.log('Loading road labels from proxy URL...');
      const labelsLayer = await loadImage(proxyUrl);
      console.log('Road labels loaded successfully');
      drawImage(ctx, labelsLayer, canvas.width, canvas.height, 1.0);
    } catch (error) {
      console.warn('Failed to load road labels:', error);
    }

    // Draw boundaries AFTER all layers
    if (developableArea?.features?.[0] && showDevelopableArea) {
      console.log('Drawing developable area boundary...');
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width, {
      strokeStyle: '#FF0000',
      lineWidth: 6
    });

    // Add legend with adjusted spacing
    const legendHeight = 600; // Increased from 500
    const legendWidth = 400;
    const padding = 30;
    const lineHeight = 48; // Increased from 44
    const legendX = canvas.width - legendWidth - padding;
    const legendY = canvas.height - legendHeight - padding;

    // Draw legend background with border
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#002664';
    ctx.lineWidth = 2;
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

    // Legend title
    ctx.font = 'bold 32px Public Sans';
    ctx.fillStyle = '#002664';
    ctx.textBaseline = 'top';
    ctx.fillText('Road Classification', legendX + padding, legendY + padding);

    // Legend items - exact colors from MapServer with adjusted line widths
    const legendItems = [
      { label: 'Access Way', color: '#FCECCC', width: 3, style: 'dotted' },  // Increased width
      { label: 'Arterial Road', color: '#9C9C9C', width: 3 },
      { label: 'Dedicated Bus Way', color: '#FF0000', width: 3 },
      { label: 'Distributor Road', color: '#B2B2B2', width: 3 },
      { label: 'Local Road', color: '#CCCCCC', width: 2 },  // Increased width
      { label: 'Motorway', color: '#4E4E4E', width: 5 },
      { label: 'Path', color: '#686868', width: 2, style: 'dashed' },  // Increased width
      { label: 'Primary Road', color: '#4E4E4E', width: 5 },
      { label: 'Sub-Arterial Road', color: '#9C9C9C', width: 3 },
      { label: 'Track-Vehicular', color: '#FFA77F', width: 2, style: 'dashed' },  // Increased width
      { label: 'Urban Service Lane', color: '#CCCCCC', width: 2 }  // Increased width
    ];

    // Draw legend items
    ctx.textBaseline = 'middle';
    ctx.font = '24px Public Sans';

    legendItems.forEach((item, index) => {
      const y = legendY + padding + 60 + (index * lineHeight);
      
      // Draw line sample with increased contrast
      ctx.beginPath();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.width * 2;
      
      if (item.style === 'dotted') {
        ctx.setLineDash([4, 4]);
      } else if (item.style === 'dashed') {
        ctx.setLineDash([12, 8]);
      } else {
        ctx.setLineDash([]);
      }
      
      ctx.moveTo(legendX + padding, y);
      ctx.lineTo(legendX + padding + 60, y);
      ctx.stroke();

      // Reset line dash for text
      ctx.setLineDash([]);
      
      // Draw label
      ctx.fillStyle = '#363636';
      ctx.fillText(item.label, legendX + padding + 80, y);
    });

    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Failed to capture roads map:', error);
    return null;
  }
}

export async function captureFloodMap(feature, developableArea = null, showDevelopableArea = true) {
  if (!feature) return null;
  
  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.3
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    
    // Create base canvas
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d', { alpha: true });

    try {
      // 1. Aerial imagery (base)
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
      drawImage(ctx, baseMap, canvas.width, canvas.height, 0.7);
    } catch (error) {
      console.warn('Failed to load aerial layer:', error);
    }

    try {
      // 2. Flood layer from Giraffe
      const floodConfig = {
        baseUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/nsw_1aep_flood_extents/FeatureServer/0',
        layerId: 5180
      };

      // Get the flood layer data from Giraffe
      console.log('Fetching project layers from Giraffe...');
      const projectLayers = await giraffeState.get('projectLayers');
      const floodLayer = projectLayers?.find(layer => layer.layer === floodConfig.layerId);
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

          const url = `${floodConfig.baseUrl}/query?${params.toString()}`;
          console.log('Final flood request URL (with sensitive info removed):', url.replace(extractedToken, 'REDACTED'));
          
          const floodResponse = await proxyRequest(url);
          console.log('Flood response:', floodResponse);

          if (floodResponse.features?.length > 0) {
            console.log(`Drawing ${floodResponse.features.length} flood features...`);
            // Store the flood features and transformation parameters
            floodResponse.transformParams = { centerX, centerY, size };
            feature.properties.site_suitability__floodFeatures = floodResponse;
            
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

    // Draw boundaries
    drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width, {
      strokeStyle: '#FF0000',
      lineWidth: 6
    });

    if (developableArea?.features?.[0] && showDevelopableArea) {
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    // Store the screenshot
    const screenshot = canvas.toDataURL('image/png', 1.0);
    feature.properties.floodMapScreenshot = screenshot;

    return screenshot;
  } catch (error) {
    console.error('Failed to capture flood map:', error);
    return null;
  }
}

export async function captureBushfireMap(feature, developableArea = null, showDevelopableArea = true) {
  if (!feature) return null;
  console.log('Starting bushfire map capture...');

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.3
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    
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
      drawImage(ctx, baseMap, canvas.width, canvas.height, 0.7);
    } catch (error) {
      console.error('Failed to load aerial layer:', error);
    }

    let bushfireFeatures = [];
    try {
      // 2. Bushfire layer
      console.log('Loading bushfire layer...');
      const bushfireConfig = {
        url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Hazard/MapServer',
        layerId: 229,
        size: 2048,
        padding: 0.3
      };

      // First get the features
      const { bbox } = calculateMercatorParams(centerX, centerY, size);
      const queryParams = new URLSearchParams({
        where: '1=1',
        geometry: bbox,
        geometryType: 'esriGeometryEnvelope',
        inSR: 3857,
        spatialRel: 'esriSpatialRelIntersects',
        outFields: '*',
        returnGeometry: true,
        f: 'geojson'
      });

      const queryUrl = `${bushfireConfig.url}/${bushfireConfig.layerId}/query?${queryParams.toString()}`;
      const bushfireResponse = await proxyRequest(queryUrl);
      if (bushfireResponse?.features?.length > 0) {
        bushfireFeatures = bushfireResponse.features;
        // Store the features in the feature properties
        feature.properties.site_suitability__bushfireFeatures = bushfireResponse;
      }

      // Then get the image
      const params = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${bushfireConfig.size},${bushfireConfig.size}`,
        bbox: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        bboxSR: 4283,
        imageSR: 4283,
        layers: `show:${bushfireConfig.layerId}`,
        dpi: 96
      });

      const url = `${bushfireConfig.url}/export?${params.toString()}`;
      console.log('Requesting bushfire layer through proxy...', url);
      
      const proxyUrl = await proxyRequest(url);
      if (!proxyUrl) {
        throw new Error('Failed to get proxy URL for bushfire layer');
      }
      
      console.log('Loading bushfire image from proxy URL...');
      const bushfireLayer = await loadImage(proxyUrl);
      console.log('Bushfire layer loaded successfully');
      drawImage(ctx, bushfireLayer, canvas.width, canvas.height, 0.8);
    } catch (error) {
      console.warn('Failed to load bushfire layer:', error);
    }

    // Draw boundaries
    drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width, {
      strokeStyle: '#FF0000',
      lineWidth: 6
    });

    if (developableArea?.features?.[0] && showDevelopableArea) {
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    // Add legend
    const legendHeight = 240; // Reduced height since we removed source text
    const legendWidth = 500;
    const padding = 20;
    const legendX = canvas.width - legendWidth - padding;
    const legendY = canvas.height - legendHeight - padding;

    // Draw legend background with border
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#002664';
    ctx.lineWidth = 2;
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

    // Legend title
    ctx.font = 'bold 28px Public Sans';
    ctx.fillStyle = '#002664';
    ctx.textBaseline = 'top';
    ctx.fillText('Bushfire Prone Land', legendX + padding, legendY + padding);

    // Legend items
    const legendItems = [
      { color: '#FF0000', label: 'Vegetation Category 1' },
      { color: '#FFD200', label: 'Vegetation Category 2' },
      { color: '#FF8000', label: 'Vegetation Category 3' },
      { color: '#FFFF73', label: 'Vegetation Buffer' }
    ];

    ctx.textBaseline = 'middle';
    ctx.font = '22px Public Sans';

    legendItems.forEach((item, index) => {
      const y = legendY + padding + 60 + (index * 45); // Increased spacing between items
      
      // Draw color box
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX + padding, y - 10, 20, 20);
      ctx.strokeStyle = '#363636';
      ctx.lineWidth = 1;
      ctx.strokeRect(legendX + padding, y - 10, 20, 20);
      
      // Draw label
      ctx.fillStyle = '#363636';
      ctx.fillText(item.label, legendX + padding + 35, y);
    });

    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Failed to capture bushfire map:', error);
    return null;
  }
}

// Add helper function for drawing rounded rectangle text boxes
function drawRoundedTextBox(ctx, text, x, y, padding = 10, cornerRadius = 5) {
  // Offset the y position up by half the box height to center on point
  const yOffset = -15; // Half of box height (30/2)
  y = y + yOffset;

  // Measure text width
  const textMetrics = ctx.measureText(text);
  const boxWidth = textMetrics.width + (padding * 2);
  const boxHeight = 30; // Fixed height for consistency
  
  // Center the box horizontally on the point
  x = x - (boxWidth / 2);
  
  // Draw rounded rectangle background
  ctx.beginPath();
  ctx.moveTo(x + cornerRadius, y);
  ctx.lineTo(x + boxWidth - cornerRadius, y);
  ctx.quadraticCurveTo(x + boxWidth, y, x + boxWidth, y + cornerRadius);
  ctx.lineTo(x + boxWidth, y + boxHeight - cornerRadius);
  ctx.quadraticCurveTo(x + boxWidth, y + boxHeight, x + boxWidth - cornerRadius, y + boxHeight);
  ctx.lineTo(x + cornerRadius, y + boxHeight);
  ctx.quadraticCurveTo(x, y + boxHeight, x, y + boxHeight - cornerRadius);
  ctx.lineTo(x, y + cornerRadius);
  ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
  ctx.closePath();
  
  // Fill white background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fill();
  
  // Draw orange stroke
  ctx.strokeStyle = 'rgba(255, 165, 0, 0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Draw text
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padding, y + (boxHeight / 2));
}

export async function captureUDPPrecinctMap(feature, developableArea = null, showDevelopableArea = true) {
  if (!feature) return null;
  console.log('Starting UDP precinct map capture...');

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 5
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    
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
      // 2. UDP Precincts layer
      console.log('Loading UDP precincts...');
      const udpResponse = await fetch('/UDP_Precincts.geojson');
      const udpData = await udpResponse.json();
      
      if (udpData.features?.length > 0) {
        console.log(`Drawing ${udpData.features.length} UDP precinct features...`);
        
        // Store the features in the feature object for scoring
        if (feature.properties) {
          feature.properties.udpPrecincts = udpData.features;
        } else {
          feature.properties = { udpPrecincts: udpData.features };
        }

        // Set font for labels before drawing features
        ctx.font = 'bold 24px Public Sans';

        udpData.features.forEach((precinctFeature, index) => {
          console.log(`Drawing UDP precinct feature ${index + 1}...`);
          if (precinctFeature.geometry?.coordinates) {
            // For MultiPolygon, draw each polygon
            if (precinctFeature.geometry.type === 'MultiPolygon') {
              precinctFeature.geometry.coordinates.forEach(polygonCoords => {
                polygonCoords.forEach(coords => {
                  drawBoundary(ctx, coords, centerX, centerY, size, config.width, {
                    fill: true,
                    strokeStyle: 'rgba(255, 165, 0, 0.8)',
                    fillStyle: 'rgba(255, 165, 0, 0.5)',
                    lineWidth: 2
                  });
                });
              });
            } else if (precinctFeature.geometry.type === 'Polygon') {
              // For single Polygon
              precinctFeature.geometry.coordinates.forEach(coords => {
                drawBoundary(ctx, coords, centerX, centerY, size, config.width, {
                  fill: true,
                  strokeStyle: 'rgba(255, 165, 0, 0.8)',
                  fillStyle: 'rgba(255, 165, 0, 0.5)',
                  lineWidth: 2
                });
              });
            }

            // Calculate centroid for label placement
            let bounds = {
              minX: Infinity,
              minY: Infinity,
              maxX: -Infinity,
              maxY: -Infinity
            };

            const updateBounds = (coords) => {
              coords.forEach(coord => {
                bounds.minX = Math.min(bounds.minX, coord[0]);
                bounds.minY = Math.min(bounds.minY, coord[1]);
                bounds.maxX = Math.max(bounds.maxX, coord[0]);
                bounds.maxY = Math.max(bounds.maxY, coord[1]);
              });
            };

            if (precinctFeature.geometry.type === 'MultiPolygon') {
              precinctFeature.geometry.coordinates.forEach(polygonCoords => {
                polygonCoords.forEach(coords => {
                  updateBounds(coords);
                });
              });
            } else {
              precinctFeature.geometry.coordinates.forEach(coords => {
                updateBounds(coords);
              });
            }

            // Calculate centroid from bounds
            const centroidX = (bounds.minX + bounds.maxX) / 2;
            const centroidY = (bounds.minY + bounds.maxY) / 2;

            // Convert centroid to canvas coordinates
            const canvasX = ((centroidX - (centerX - size/2)) / size) * config.width;
            const canvasY = config.height - ((centroidY - (centerY - size/2)) / size) * config.height;

            // Draw label if precinct name exists
            if (precinctFeature.properties?.precinct_name) {
              console.log(`Drawing label for ${precinctFeature.properties.Precinct_Name} at (${canvasX}, ${canvasY})`);
              drawRoundedTextBox(ctx, precinctFeature.properties.Precinct_Name, canvasX, canvasY);
            }
          }
        });
      }
    } catch (error) {
      console.error('Failed to load UDP precincts:', error);
    }

    // Draw boundaries
    drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width, {
      strokeStyle: '#FF0000',
      lineWidth: 6
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
    const legendWidth = 400;
    const padding = 20;
    const legendX = canvas.width - legendWidth - padding;
    const legendY = canvas.height - legendHeight - padding;

    // Draw legend background with border
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#002664';
    ctx.lineWidth = 2;
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

    // Legend title
    ctx.font = 'bold 28px Public Sans';
    ctx.fillStyle = '#002664';
    ctx.textBaseline = 'top';
    ctx.fillText('UDP Growth Precincts', legendX + padding, legendY + padding);

    // Legend items
    const legendItems = [
      { color: 'rgba(255, 165, 0, 0.5)', label: 'UDP Growth Precinct' }
    ];

    ctx.textBaseline = 'middle';
    ctx.font = '22px Public Sans';

    legendItems.forEach((item, index) => {
      const y = legendY + padding + 60 + (index * 45);
      
      // Draw color box
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX + padding, y - 10, 20, 20);
      ctx.strokeStyle = '#363636';
      ctx.lineWidth = 1;
      ctx.strokeRect(legendX + padding, y - 10, 20, 20);
      
      // Draw label
      ctx.fillStyle = '#363636';
      ctx.fillText(item.label, legendX + padding + 35, y);
    });

    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Failed to capture UDP precinct map:', error);
    return null;
  }
}

export async function capturePTALMap(feature, developableArea = null, showDevelopableArea = true) {
  if (!feature) {
    console.log('No feature provided, returning null');
    return null;
  }
  console.log('Starting PTAL map capture with feature:', {
    featureId: feature.id,
    featureType: feature.geometry?.type,
    coordinates: feature.geometry?.coordinates?.length,
    developableArea: developableArea ? 'provided' : 'not provided'
  });

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 1 
    };
    console.log('Using config:', config);
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    console.log('Calculated bounds:', { centerX, centerY, size });
    
    let ptalFeatures = [];
    
    // Create base canvas
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d', { alpha: true });
    console.log('Created canvas with dimensions:', { width: canvas.width, height: canvas.height });

    // Prepare parameters for both layers
    const { bbox } = calculateMercatorParams(centerX, centerY, size);
    console.log('Calculated Mercator bbox:', bbox);
    
    // Prepare aerial layer parameters
    const aerialParams = new URLSearchParams({
      SERVICE: 'WMS',
      VERSION: '1.3.0',
      REQUEST: 'GetMap',
      BBOX: bbox,
      CRS: 'EPSG:3857',
      WIDTH: config.width,
      HEIGHT: config.height,
      LAYERS: LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL].layers,
      STYLES: '',
      FORMAT: 'image/png',
      DPI: 300,
      MAP_RESOLUTION: 300,
      FORMAT_OPTIONS: 'dpi:300'
    });
    console.log('Prepared aerial parameters:', Object.fromEntries(aerialParams.entries()));

    // Prepare PTAL layer parameters
    const ptalConfig = {
      layerId: 28919
    };
    console.log('Using PTAL config:', ptalConfig);

    // Get the PTAL layer data from Giraffe
    console.log('Fetching project layers from Giraffe...');
    const projectLayers = await giraffeState.get('projectLayers');
    console.log('Retrieved project layers count:', projectLayers?.length);
    
    const ptalLayer = projectLayers?.find(layer => layer.layer === ptalConfig.layerId);
    console.log('Found PTAL layer:', {
      found: !!ptalLayer,
      id: ptalLayer?.layer,
      name: ptalLayer?.layer_full?.name,
      defaultGroup: ptalLayer?.layer_full?.default_group,
      vectorSource: ptalLayer?.layer_full?.vector_source ? 'present' : 'missing'
    });
    
    if (!ptalLayer) {
      console.error('PTAL layer not found in project layers');
      return null;
    }

    // Color mapping for PTAL values
    const ptalColors = {
      '1 - Low': '#ff000080',
      '2 - Low-Medium': '#ff7f0e80',
      '3 - Medium': '#f2ff0080',
      '4 - Medium-High': '#0e9aff80',
      '5 - High': '#a8ff7f80',
      '6 - Very High': '#1d960480'
    };

    // Extract the actual service URL and token from the vector tiles URL
    const vectorTileUrl = ptalLayer.layer_full?.vector_source?.tiles?.[0];
    console.log('Vector tile URL:', vectorTileUrl);
    
    if (!vectorTileUrl) {
      console.error('No vector tile URL found in PTAL layer');
      return null;
    }

    const decodedUrl = decodeURIComponent(vectorTileUrl.split('/featureServer/{z}/{x}/{y}/')?.[1] || '');
    console.log('Decoded URL:', decodedUrl);
    
    // Extract the base URL from the decoded URL - it's everything before the query parameters
    const urlMatch = decodedUrl.match(/(https:\/\/[^?]+)/);
    if (!urlMatch) {
      console.error('Could not extract base URL from decoded URL');
      return null;
    }
    const baseUrl = urlMatch[1];
    console.log('Using exact URL from vector tiles:', baseUrl);
    
    const extractedToken = decodedUrl.split('token=')?.[1]?.split('&')?.[0];
    console.log('Extracted token:', extractedToken ? `${extractedToken.substring(0, 10)}...` : 'null');

    if (!extractedToken) {
      console.error('Could not extract token from vector tile URL');
      return null;
    }

    const ptalParams = new URLSearchParams({
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
    console.log('Prepared PTAL parameters:', {
      ...Object.fromEntries(ptalParams.entries()),
      token: '***redacted***'
    });

    // Log the full URLs we're about to request
    console.log('Preparing to request:', {
      aerialUrl: `${LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL].url}?${aerialParams.toString()}`,
      ptalUrl: `${baseUrl}/query?${ptalParams.toString().replace(extractedToken, '***redacted***')}`
    });

    // Load both layers in parallel
    console.log('Loading aerial and PTAL layers in parallel...');
    const [baseMap, ptalResponse] = await Promise.all([
      // Load aerial base layer
      loadImage(`${LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL].url}?${aerialParams.toString()}`),
      // Load PTAL data
      proxyRequest(`${baseUrl}/query?${ptalParams.toString()}`)
    ]);
    console.log('Loaded both layers:', {
      baseMapLoaded: !!baseMap,
      ptalResponseFeatures: ptalResponse?.features?.length
    });

    // Draw base map
    drawImage(ctx, baseMap, canvas.width, canvas.height, 0.5);
    console.log('Drew base map');

    // Process PTAL data if available
    if (ptalResponse?.features?.length > 0) {
      console.log(`Processing ${ptalResponse.features.length} PTAL features...`);
      ptalFeatures = ptalResponse.features;

      // Create developable area polygon for intersection check if provided
      let developablePolygon = null;
      if (developableArea?.features?.[0]) {
        developablePolygon = turf.polygon(developableArea.features[0].geometry.coordinates);
        console.log('Created developable area polygon for intersection checks');
      }

      // Find intersecting features for scoring only
      const intersectingPtalFeatures = developablePolygon 
        ? ptalFeatures.filter(ptalFeature => {
            try {
              const ptalPolygon = turf.polygon(ptalFeature.geometry.coordinates);
              const intersects = turf.booleanIntersects(developablePolygon, ptalPolygon);
              return intersects;
            } catch (error) {
              console.error('Error checking PTAL intersection:', error);
              return false;
            }
          })
        : ptalFeatures;
      
      console.log('Filtered PTAL features for scoring:', {
        total: ptalFeatures.length,
        intersecting: intersectingPtalFeatures.length
      });

      // Store only the intersecting features in the feature object for scoring
      const ptalValues = intersectingPtalFeatures.map(f => f.properties.legend || f.properties.ptal_desc || f.properties.ptal);
      if (feature.properties) {
        feature.properties.ptalValues = ptalValues;
      } else {
        feature.properties = { ptalValues };
      }
      console.log('Stored PTAL values:', ptalValues);

      // Draw ALL PTAL features, not just intersecting ones
      console.log('Drawing all PTAL features...');
      ptalFeatures.forEach((ptalFeature, index) => {
        const ptalValue = ptalFeature.properties.legend || ptalFeature.properties.ptal_desc || ptalFeature.properties.ptal;
        const color = ptalColors[ptalValue] || '#808080';
        console.log(`Drawing PTAL feature ${index + 1}/${ptalFeatures.length}:`, {
          value: ptalValue,
          color
        });

        drawBoundary(ctx, ptalFeature.geometry.coordinates[0], centerX, centerY, size, config.width, {
          fill: true,
          strokeStyle: '#000000',
          fillStyle: color,
          lineWidth: 2
        });
      });
    } else {
      console.log('No PTAL features found in response');
    }

    // Draw boundaries
    console.log('Drawing site boundary...');
    drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width, {
      strokeStyle: '#FF0000',
      lineWidth: 6
    });

    if (developableArea?.features?.[0] && showDevelopableArea) {
      console.log('Drawing developable area boundary...');
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    console.log('PTAL map capture completed successfully');
    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Failed to capture PTAL map:', error);
    console.error('Error stack:', error.stack);
    return null;
  }
}

export async function captureContaminationMap(feature, developableArea = null, showDevelopableArea = true) {
  if (!feature) return null;
  console.log('Starting contamination map capture...');

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.3
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    let contaminationFeatures = [];
    
    // Create base canvas
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d', { alpha: true });

    // Load the contamination icon once
    console.log('Loading contamination icon...');
    let contaminationIcon;
    try {
      contaminationIcon = await loadImage('./images/contaminationIcon.webp');
      console.log('Contamination icon loaded successfully');
    } catch (error) {
      console.error('Failed to load contamination icon, trying alternate path:', error);
      try {
        contaminationIcon = await loadImage('/images/contaminationIcon.webp');
        console.log('Contamination icon loaded successfully from alternate path');
      } catch (error) {
        console.error('Failed to load contamination icon from both paths:', error);
        return null;
      }
    }

    // Helper function to draw point features
    const drawPointFeatures = (features, centerX, centerY, size, canvasWidth) => {
      console.log('Drawing point features, count:', features.length);
      
      // Helper function to convert lat/lon to Web Mercator
      const toWebMercator = (lon, lat) => {
        const x = lon * 20037508.34 / 180;
        const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180) * 20037508.34 / 180;
        return [x, y];
      };

      // Helper function to draw rounded rectangle text box
      const drawRoundedTextBox = (ctx, text, x, y, padding = 10) => {
        const cornerRadius = 5;
        
        // Set font and measure text
        const fontSize = 32;
        ctx.font = `normal ${fontSize}px "Public Sans", "Public Sans Regular", sans-serif`;
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;
        const textHeight = fontSize; // Height matches font size
        
        const boxWidth = textWidth + (padding * 2);
        const boxHeight = textHeight + (padding * 2);
        
        // Calculate x position to center the box
        const boxX = x - (boxWidth / 2);
        
        // Draw the rounded rectangle
        ctx.beginPath();
        ctx.moveTo(boxX + cornerRadius, y);
        ctx.lineTo(boxX + boxWidth - cornerRadius, y);
        ctx.quadraticCurveTo(boxX + boxWidth, y, boxX + boxWidth, y + cornerRadius);
        ctx.lineTo(boxX + boxWidth, y + boxHeight - cornerRadius);
        ctx.quadraticCurveTo(boxX + boxWidth, y + boxHeight, boxX + boxWidth - cornerRadius, y + boxHeight);
        ctx.lineTo(boxX + cornerRadius, y + boxHeight);
        ctx.quadraticCurveTo(boxX, y + boxHeight, boxX, y + boxHeight - cornerRadius);
        ctx.lineTo(boxX, y + cornerRadius);
        ctx.quadraticCurveTo(boxX, y, boxX + cornerRadius, y);
        ctx.closePath();
        
        // Fill with light yellow
        ctx.fillStyle = '#f8d265';
        ctx.fill();
        
        // Add black stroke
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Add text - centered in the box
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.fillText(text, boxX + (boxWidth / 2), y + padding + textHeight - 8);
        ctx.textAlign = 'left'; // Reset text alignment
      };

      features.forEach((feature, index) => {
        // Check if coordinates are in properties (EPSG:4283)
        if (feature.properties?.Latitude && feature.properties?.Longitude) {
          console.log(`Drawing point ${index} from properties:`, {
            lon: feature.properties.Longitude,
            lat: feature.properties.Latitude,
            name: feature.properties.SiteName
          });
          
          // Get the point coordinates
          const [x, y] = toWebMercator(feature.properties.Longitude, feature.properties.Latitude);
          
          // Get the center coordinates in Web Mercator
          const [centerMercX, centerMercY] = toWebMercator(centerX, centerY);
          
          // Calculate the size in Web Mercator units (approximate)
          const mercatorSize = size * (20037508.34 / 180);

          // Convert to canvas coordinates
          const canvasX = Math.round(((x - (centerMercX - mercatorSize/2)) / mercatorSize) * canvasWidth);
          const canvasY = Math.round(canvasWidth - ((y - (centerMercY - mercatorSize/2)) / mercatorSize) * canvasWidth);
          
          // Draw the icon (doubled size)
          const iconSize = 96; // Doubled from 48
          ctx.drawImage(
            contaminationIcon,
            canvasX - iconSize/2,  // Center the icon on the point
            canvasY - iconSize/2,
            iconSize,
            iconSize
          );

          // Draw the label below the icon
          if (feature.properties.SiteName) {
            drawRoundedTextBox(
              ctx,
              feature.properties.SiteName,
              canvasX, // Pass center point directly
              canvasY + iconSize/2 + 10 // Position below icon
            );
          }
        }
        // Also handle any features that might have geometry points
        else if (feature.geometry?.type === 'Point') {
          const [lon, lat] = feature.geometry.coordinates;
          
          // Get the point coordinates
          const [x, y] = toWebMercator(lon, lat);
          
          // Get the center coordinates in Web Mercator
          const [centerMercX, centerMercY] = toWebMercator(centerX, centerY);
          
          // Calculate the size in Web Mercator units (approximate)
          const mercatorSize = size * (20037508.34 / 180);

          // Convert to canvas coordinates
          const canvasX = Math.round(((x - (centerMercX - mercatorSize/2)) / mercatorSize) * canvasWidth);
          const canvasY = Math.round(canvasWidth - ((y - (centerMercY - mercatorSize/2)) / mercatorSize) * canvasWidth);
          
          // Draw the icon (ensure consistent size)
          const iconSize = 96; // Make sure this matches the size above
          ctx.drawImage(
            contaminationIcon,
            canvasX - iconSize/2,  // Center the icon on the point
            canvasY - iconSize/2,
            iconSize,
            iconSize
          );

          // Draw the label below the icon if name exists
          if (feature.properties?.SiteName) {
            drawRoundedTextBox(
              ctx,
              feature.properties.SiteName,
              canvasX, // Pass center point directly
              canvasY + iconSize/2 + 10 // Position below icon
            );
          }
        }
      });
    };

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
        WIDTH: aerialConfig.width || aerialConfig.size,
        HEIGHT: aerialConfig.height || aerialConfig.size,
        LAYERS: aerialConfig.layers,
        STYLES: '',
        FORMAT: 'image/png',
        DPI: 300,
        MAP_RESOLUTION: 300,
        FORMAT_OPTIONS: 'dpi:300'
      });

      const url = `${aerialConfig.url}?${params.toString()}`;
      const baseMap = await loadImage(url);
      drawImage(ctx, baseMap, canvas.width, canvas.height, 0.7);
    } catch (error) {
      console.error('Failed to load aerial layer:', error);
    }

    try {
      // 2. Contamination layer
      console.log('Loading contamination layer...');
      const contaminationConfig = {
        url: 'https://maptest2.environment.nsw.gov.au/arcgis/rest/services/EPA/EPACS/MapServer',
        layerId: 1,
        size: 2048,
        padding: 0.3
      };

      // First get the features
      const { bbox } = calculateMercatorParams(centerX, centerY, size);
      const queryParams = new URLSearchParams({
        where: '1=1',
        geometry: bbox,
        geometryType: 'esriGeometryEnvelope',
        inSR: 3857,
        spatialRel: 'esriSpatialRelIntersects',
        outFields: '*',
        returnGeometry: true,
        f: 'geojson'
      });

      const queryUrl = `${contaminationConfig.url}/${contaminationConfig.layerId}/query?${queryParams.toString()}`;
      console.log('Querying contamination features from:', queryUrl);
      const contaminationResponse = await proxyRequest(queryUrl);
      console.log('Contamination Response:', contaminationResponse);
      
      if (contaminationResponse?.features?.length > 0) {
        contaminationFeatures = contaminationResponse.features;
        // Store the features in the feature object
        if (!feature.properties) {
          feature.properties = {};
        }
        feature.properties.site_suitability__contaminationFeatures = contaminationResponse;
        console.log('Stored contamination features:', contaminationFeatures.length);
      }

      // Add the new contamination layer
      try {
        console.log('Loading additional contamination layer...');
        const additionalContaminationConfig = {
          url: 'https://mapprod2.environment.nsw.gov.au/arcgis/rest/services/EPA/Contaminated_land_notified_sites/MapServer',
          layerId: 0,
          size: 2048,
          padding: 0.3
        };

        // Query additional contamination features
        const additionalQueryParams = new URLSearchParams({
          where: '1=1',
          geometry: bbox,
          geometryType: 'esriGeometryEnvelope',
          inSR: 3857,
          spatialRel: 'esriSpatialRelIntersects',
          outFields: '*',
          returnGeometry: true,
          f: 'geojson'
        });

        const additionalQueryUrl = `${additionalContaminationConfig.url}/${additionalContaminationConfig.layerId}/query?${additionalQueryParams.toString()}`;
        console.log('Querying additional contamination features from:', additionalQueryUrl);
        const additionalContaminationResponse = await proxyRequest(additionalQueryUrl);
        console.log('Additional Contamination Response:', additionalContaminationResponse);

        if (additionalContaminationResponse?.features?.length > 0) {
          // Merge with existing features
          contaminationFeatures = [...contaminationFeatures, ...additionalContaminationResponse.features];
          // Store the combined features
          if (!feature.properties) {
            feature.properties = {};
          }
          feature.properties.site_suitability__additionalContaminationFeatures = additionalContaminationResponse;
          console.log('Stored additional contamination features:', additionalContaminationResponse.features.length);
        }
      } catch (error) {
        console.warn('Failed to load additional contamination layer:', error);
      }

      // Then get the image for both layers
      const params = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${contaminationConfig.size},${contaminationConfig.size}`,
        bbox: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        bboxSR: 4283,
        imageSR: 4283,
        layers: `show:${contaminationConfig.layerId}`,
        dpi: 300
      });

      const url = `${contaminationConfig.url}/export?${params.toString()}`;
      console.log('Requesting contamination layer through proxy...', url);
      
      const proxyUrl = await proxyRequest(url);
      if (!proxyUrl) {
        throw new Error('Failed to get proxy URL for contamination layer');
      }
      
      console.log('Loading contamination image from proxy URL...');
      const contaminationLayer = await loadImage(proxyUrl);
      console.log('Contamination layer loaded successfully');
      drawImage(ctx, contaminationLayer, canvas.width, canvas.height, 0.8);

      // Add the additional contamination layer image
      const additionalParams = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${contaminationConfig.size},${contaminationConfig.size}`,
        bbox: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        bboxSR: 4283,
        imageSR: 4283,
        layers: 'show:0',
        dpi: 300
      });

      const additionalUrl = `${additionalContaminationConfig.url}/export?${additionalParams.toString()}`;
      console.log('Requesting additional contamination layer through proxy...', additionalUrl);
      
      const additionalProxyUrl = await proxyRequest(additionalUrl);
      if (additionalProxyUrl) {
        console.log('Loading additional contamination image from proxy URL...');
        const additionalContaminationLayer = await loadImage(additionalProxyUrl);
        console.log('Additional contamination layer loaded successfully');
        drawImage(ctx, additionalContaminationLayer, canvas.width, canvas.height, 0.8);
      }
    } catch (error) {
      console.warn('Failed to load contamination layer:', error);
    }

    // Draw boundaries
    drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width, {
      strokeStyle: '#FF0000',
      lineWidth: 6
    });

    if (developableArea?.features?.[0] && showDevelopableArea) {
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    // Draw point features from both contamination sources
    if (contaminationFeatures.length > 0) {
      console.log('Drawing contamination point features...');
      drawPointFeatures(contaminationFeatures, centerX, centerY, size, config.width);
    }

    return {
      image: canvas.toDataURL('image/png', 1.0),
      features: contaminationFeatures
    };
  } catch (error) {
    console.error('Failed to capture contamination map:', error);
    return null;
  }
}

export async function captureOpenStreetMap(feature, developableArea = null) {
  if (!feature) return null;
  console.log('Starting OpenStreetMap capture...');

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.2
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    
    // Convert center and size to Web Mercator for consistent coordinate system
    const [mercatorCenterX, mercatorCenterY] = gda94ToWebMercator(centerX, centerY);
    const [mercatorMinX, mercatorMinY] = gda94ToWebMercator(centerX - size/2, centerY - size/2);
    const [mercatorMaxX, mercatorMaxY] = gda94ToWebMercator(centerX + size/2, centerY + size/2);
    const mercatorSize = Math.max(
      Math.abs(mercatorMaxX - mercatorMinX),
      Math.abs(mercatorMaxY - mercatorMinY)
    );
    
    // Create base canvas
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d', { alpha: true });
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, config.width, config.height);

    try {
      // Convert Web Mercator to WGS84 for tile calculations
      const [minLon, minLat] = mercatorToWGS84(mercatorMinX, mercatorMinY);
      const [maxLon, maxLat] = mercatorToWGS84(mercatorMaxX, mercatorMaxY);
      
      // Calculate zoom level
      const latSpan = Math.abs(maxLat - minLat);
      const lonSpan = Math.abs(maxLon - minLon);
      const maxSpan = Math.max(latSpan, lonSpan);
      const zoomLevel = Math.min(18, Math.floor(Math.log2(360 / maxSpan)));
      
      // Calculate tile coordinates
      const tileSize = 256;
      const minTileX = lon2tile(minLon, zoomLevel);
      const maxTileX = lon2tile(maxLon, zoomLevel);
      const minTileY = lat2tile(maxLat, zoomLevel);
      const maxTileY = lat2tile(minLat, zoomLevel);

      // Calculate dimensions
      const tilesX = maxTileX - minTileX + 1;
      const tilesY = maxTileY - minTileY + 1;
      const totalWidth = tilesX * tileSize;
      const totalHeight = tilesY * tileSize;
      
      // Calculate scale to fill the canvas
      const scale = Math.max(
        config.width / totalWidth,
        config.height / totalHeight
      );
      
      const offsetX = (config.width - totalWidth * scale) / 2;
      const offsetY = (config.height - totalHeight * scale) / 2;

      // Load and draw tiles
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      const maxRetries = 3;
      for (let x = minTileX; x <= maxTileX; x++) {
        for (let y = minTileY; y <= maxTileY; y++) {
          const url = `https://tile.openstreetmap.org/${zoomLevel}/${x}/${y}.png`;
          
          let retryCount = 0;
          while (retryCount < maxRetries) {
            try {
              const tile = await loadImage(url);
              const tileX = (x - minTileX) * tileSize;
              const tileY = (y - minTileY) * tileSize;
              ctx.drawImage(tile, tileX, tileY, tileSize, tileSize);
              break;
            } catch (tileError) {
              retryCount++;
              if (retryCount === maxRetries) {
                console.error(`Failed to load tile at ${x},${y} after ${maxRetries} attempts`);
              } else {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }
        }
      }

      ctx.restore();
    
    // Transform coordinates function that handles GDA94 to Web Mercator conversion
    const transformCoord = (coord) => {
      const [mercX, mercY] = gda94ToWebMercator(coord[0], coord[1]);
      
      // Scale to canvas coordinates
        const x = ((mercX - mercatorMinX) / mercatorSize) * totalWidth * scale + offsetX;
        const y = ((mercatorMaxY - mercY) / mercatorSize) * totalHeight * scale + offsetY;
      return [x, y];
    };

      // Draw developable area
      if (developableArea?.features?.[0]?.geometry?.coordinates?.[0]) {
        ctx.beginPath();
        ctx.strokeStyle = '#02d1b8';
        ctx.lineWidth = 8;
        ctx.setLineDash([20, 10]);
        
        const coords = developableArea.features[0].geometry.coordinates[0];
        coords.forEach((coord, i) => {
          const [x, y] = transformCoord(coord);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw property boundary
      ctx.beginPath();
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 6;
      
      const coords = feature.geometry.coordinates[0];
      coords.forEach((coord, i) => {
        const [x, y] = transformCoord(coord);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      
      ctx.closePath();
      ctx.stroke();

      return canvas.toDataURL('image/png', 1.0);
    } catch (error) {
      console.error('Failed to load OpenStreetMap layer:', error);
      return null;
    }
  } catch (error) {
    console.error('Failed to capture OpenStreetMap:', error);
    return null;
  }
}

export async function captureTECMap(feature, developableArea = null, showDevelopableArea = true) {
  if (!feature) {
    console.log('No feature provided for TEC map capture');
    return null;
  }
  console.log('Starting TEC map capture...', { feature, developableArea });

  try {
    const config = LAYER_CONFIGS[SCREENSHOT_TYPES.TEC];
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    console.log('Calculated bounds:', { centerX, centerY, size });
    
    // Calculate bbox early for both Mercator and GDA94
    const { bbox: mercatorBbox } = calculateMercatorParams(centerX, centerY, size);
    const gda94Bbox = `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`;
    console.log('Calculated bboxes:', { mercatorBbox, gda94Bbox });
    
    // Create base canvas
    const canvas = createCanvas(config.width || config.size, config.height || config.size);
    const ctx = canvas.getContext('2d', { alpha: true });
    
    try {
      // 1. Aerial imagery (base)
      console.log('Loading aerial base layer...');
      const aerialConfig = LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL];
      
      const params = new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: '1.3.0',
        REQUEST: 'GetMap',
        BBOX: mercatorBbox,
        CRS: 'EPSG:3857',
        WIDTH: config.width || config.size,
        HEIGHT: config.height || config.size,
        LAYERS: aerialConfig.layers,
        STYLES: '',
        FORMAT: 'image/png',
        DPI: config.dpi,
        MAP_RESOLUTION: config.dpi,
        FORMAT_OPTIONS: `dpi:${config.dpi}`
      });

      const url = `${aerialConfig.url}?${params.toString()}`;
      const baseMap = await loadImage(url);
      drawImage(ctx, baseMap, canvas.width, canvas.height, 0.7);
    } catch (error) {
      console.error('Failed to load aerial layer:', error);
    }

    let tecFeatures = [];

    try {
      // 2. TEC layer
      console.log('Loading TEC layer...');
      
      // First get the features using proxy
      const queryParams = new URLSearchParams({
        where: '1=1',
        geometry: gda94Bbox,
        geometryType: 'esriGeometryEnvelope',
        inSR: config.spatialReference,
        spatialRel: 'esriSpatialRelIntersects',
        outFields: '*',
        returnGeometry: true,
        f: 'geojson'
      });

      const queryUrl = `${config.url}/${config.layerId}/query?${queryParams.toString()}`;
      console.log('Querying TEC features through proxy:', queryUrl);
      
      try {
        const tecResponse = await proxyRequest(queryUrl);
        console.log('TEC Response:', tecResponse);
        
        if (tecResponse?.features?.length > 0) {
          tecFeatures = tecResponse.features;
          // Store both the features and response
          if (!feature.properties) {
            feature.properties = {};
          }
          feature.properties.site_suitability__tecFeatures = tecResponse;
          feature.properties.tecFeatures = tecFeatures;
          console.log('Stored TEC features:', tecFeatures.length);
        } else {
          console.log('No TEC features found in response');
          if (!feature.properties) {
            feature.properties = {};
          }
          feature.properties.site_suitability__tecFeatures = { type: 'FeatureCollection', features: [] };
          feature.properties.tecFeatures = [];
        }
      } catch (error) {
        console.error('Error querying TEC features:', error);
      }

      // Then get the image using proxy
      const imageParams = new URLSearchParams({
        f: 'image',
        format: config.format,
        transparent: config.transparent.toString(),
        size: `${config.size},${config.size}`,
        bbox: gda94Bbox,
        bboxSR: config.spatialReference,
        imageSR: config.spatialReference,
        layers: `show:${config.layerId}`,
        dpi: config.dpi
      });

      const imageUrl = `${config.url}/export?${imageParams.toString()}`;
      console.log('Requesting TEC layer image through proxy:', imageUrl);
      
      try {
        const proxyUrl = await proxyRequest(imageUrl);
        if (!proxyUrl) {
          throw new Error('Failed to get proxy URL for TEC layer');
        }

        console.log('Loading TEC image from proxy URL...');
        const tecLayer = await loadImage(proxyUrl);
        console.log('TEC layer loaded successfully');
        drawImage(ctx, tecLayer, canvas.width, canvas.height, 0.7);
      } catch (error) {
        console.error('Error loading TEC layer image:', error);
      }
    } catch (error) {
      console.warn('Failed to process TEC layer:', error);
    }

    // Draw boundaries
    console.log('Drawing boundaries...');
    if (feature.geometry?.coordinates?.[0]) {
      console.log('Drawing site boundary');
      drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width || config.size, {
        strokeStyle: '#FF0000',
        lineWidth: 6
      });
    }

    // Draw developable area if provided
    if (developableArea?.features?.[0]?.geometry?.coordinates?.[0] && showDevelopableArea) {
      console.log('Drawing developable area boundary');
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width || config.size, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Failed to capture TEC map:', error);
    return null;
  }
}

export async function captureBiodiversityMap(feature, developableArea = null, showDevelopableArea = true) {
  if (!feature) return null;
  console.log('Starting biodiversity map capture...', { feature, developableArea });

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.3
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    console.log('Calculated bounds:', { centerX, centerY, size });
    
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
      drawImage(ctx, baseMap, canvas.width, canvas.height, 0.7);
      console.log('Aerial base layer loaded successfully');
    } catch (error) {
      console.error('Failed to load aerial layer:', error);
    }

    try {
      // 2. Biodiversity Values layer
      console.log('Loading biodiversity layer...');
      const biodiversityConfig = {
        url: 'https://www.lmbc.nsw.gov.au/arcgis/rest/services/BV/BiodiversityValues/MapServer',
        layerId: 0,
        size: 2048,
        padding: 0.3
      };

      // First get the features for overlap calculation
      const { bbox: mercatorBbox } = calculateMercatorParams(centerX, centerY, size);
      const queryParams = new URLSearchParams({
        where: '1=1',
        geometry: mercatorBbox,
        geometryType: 'esriGeometryEnvelope',
        inSR: 3857,
        spatialRel: 'esriSpatialRelIntersects',
        outFields: '*',
        returnGeometry: true,
        f: 'geojson'
      });

      const queryUrl = `${biodiversityConfig.url}/${biodiversityConfig.layerId}/query?${queryParams.toString()}`;
      console.log('Querying biodiversity features from:', queryUrl);
      const bioResponse = await proxyRequest(queryUrl);
      console.log('Biodiversity Response:', bioResponse);
      
      if (bioResponse?.features?.length > 0) {
        if (!feature.properties) {
          feature.properties = {};
        }
        feature.properties.site_suitability__biodiversityFeatures = bioResponse;
        console.log('Stored biodiversity features:', bioResponse.features.length);
      }

      // Then get the image
      const params = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${biodiversityConfig.size},${biodiversityConfig.size}`,
        bbox: mercatorBbox,
        bboxSR: 3857,
        imageSR: 3857,
        layers: `show:${biodiversityConfig.layerId}`,
        dpi: 96
      });

      const url = `${biodiversityConfig.url}/export?${params.toString()}`;
      console.log('Requesting biodiversity layer through proxy...', url);
      
      const proxyUrl = await proxyRequest(url);
      if (!proxyUrl) {
        throw new Error('Failed to get proxy URL for biodiversity layer');
      }
      
      console.log('Loading biodiversity image from proxy URL...');
      const biodiversityLayer = await loadImage(proxyUrl);
      console.log('Biodiversity layer loaded successfully');
      drawImage(ctx, biodiversityLayer, canvas.width, canvas.height, 0.8);
    } catch (error) {
      console.warn('Failed to load biodiversity layer:', error);
      console.error('Error details:', error);
    }

    // Draw boundaries
    if (feature.geometry) {
      drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width, {
        strokeStyle: '#FF0000',
        lineWidth: 6
      });
      console.log('Added site boundary');
    }

    // Draw developable area with more prominent styling
    if (developableArea?.features?.[0] && showDevelopableArea) {
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
      console.log('Added developable area boundary');
    }

    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Failed to capture biodiversity map:', error);
    return null;
  }
}

// Helper functions for tile calculations
function long2tile(lon, zoom) {
  const n = Math.pow(2, zoom);
  return Math.floor(((lon + 180) / 360) * n);
}

function lat2tile(lat, zoom) {
  const n = Math.pow(2, zoom);
  const latRad = lat * Math.PI / 180;
  return Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
}

// Convert Web Mercator to WGS84
function mercatorToWGS84(x, y) {
  const lon = (x / 20037508.34) * 180;
  const lat = (Math.atan(Math.exp(y / 20037508.34 * Math.PI)) * 360 / Math.PI) - 90;
  return [lon, lat];
}



export async function captureHistoricalImagery(feature, developableArea = null, showDevelopableArea = true) {
  if (!feature) return null;
  console.log('Starting historical imagery capture...');

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.4
    };

    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    const { bbox } = calculateMercatorParams(centerX, centerY, size);

    // Try each layer in order from oldest to newest
    const layersToTry = [...HISTORICAL_LAYERS].reverse();
    for (const layerInfo of layersToTry) {
      try {
        console.log(`Trying Metromap layer from ${layerInfo.year} (${layerInfo.region}): ${layerInfo.layer}`);
        
        const canvas = createCanvas(config.width, config.height);
        const ctx = canvas.getContext('2d', { alpha: true });
        
        // Fill with white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, config.width, config.height);

        const params = new URLSearchParams({
          ...METROMAP_CONFIG.defaultParams,
          BBOX: bbox,
          WIDTH: config.width,
          HEIGHT: config.height,
          LAYERS: layerInfo.layer
        });

        const url = `${METROMAP_CONFIG.baseUrl}?${params.toString()}`;
        console.log(`Requesting Metromap imagery for ${layerInfo.year} (${layerInfo.region})`);
        
        const image = await loadImage(url);
        
        // Create a temporary canvas to check image content
        const tempCanvas = createCanvas(config.width, config.height);
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(image, 0, 0, config.width, config.height);
        
        // Check if image has content
        const imageData = tempCtx.getImageData(0, 0, config.width, config.height).data;
        let hasContent = false;
        
        for (let i = 0; i < imageData.length; i += 4) {
          if (imageData[i + 3] > 0) {
            hasContent = true;
            break;
          }
        }
        
        if (!hasContent) {
          console.log(`Layer ${layerInfo.layer} returned empty/transparent image, trying next layer...`);
          continue;
        }

        // If we get here, we found a valid layer with content
        console.log(`Found valid historical imagery from ${layerInfo.year} (${layerInfo.region})`);
        
        // Draw the image
        drawImage(ctx, image, canvas.width, canvas.height, 1.0);

        // Draw boundaries
        drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width, {
          strokeStyle: '#FF0000',
          lineWidth: 6
        });

        if (developableArea?.features?.[0] && showDevelopableArea) {
          drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width, {
            strokeStyle: '#02d1b8',
            lineWidth: 12,
            dashArray: [20, 10]
          });
        }

        // Add source attribution
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#002664';
        const sourceText = `Source: Metromap ${layerInfo.region} (${layerInfo.year})`;
        const textWidth = ctx.measureText(sourceText).width;
        const padding = 20;
        
        // Draw semi-transparent background for text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(
          canvas.width - textWidth - padding * 2,
          canvas.height - 40 - padding,
          textWidth + padding * 2,
          40
        );
        
        // Draw text
        ctx.fillStyle = '#002664';
        ctx.fillText(sourceText, canvas.width - textWidth - padding, canvas.height - padding - 10);

        // Return single image result
        return [{
          image: canvas.toDataURL('image/png', 1.0),
          year: layerInfo.year,
          type: 'metromap',
          layer: layerInfo.layer,
          region: layerInfo.region,
          source: 'Metromap'
        }];
      } catch (error) {
        console.warn(`Failed to load ${layerInfo.year} ${layerInfo.region} layer:`, error.message);
        continue;
      }
    }

    console.log('No valid historical imagery found');
    return null;
  } catch (error) {
    console.error('Failed to capture historical imagery:', error);
    return null;
  }
}