import { LAYER_CONFIGS } from '../config/layerConfigs';
import { SCREENSHOT_TYPES } from '../config/screenshotTypes';
import { calculateMercatorParams } from '../utils/coordinates';
import { getWMSImage } from './wmsService';
import { getArcGISImage } from './arcgisService';
import { createCanvas, drawImage, drawBoundary, drawPolyline } from '../utils/canvas';
import { proxyRequest } from '../../services/proxyService';
import { loadImage } from '../utils/image';
import { giraffeState } from '@gi-nx/iframe-sdk';


console.log('Aerial config:', LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL]);

export async function captureMapScreenshot(feature, type = SCREENSHOT_TYPES.SNAPSHOT, drawBoundaryLine = true, developableArea = null) {
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

    if (developableArea?.features?.[0]) {
      // Remove console.log
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.size || config.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    if (drawBoundaryLine) {
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

function calculateBounds(feature, padding, developableArea = null) {
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

export async function capturePrimarySiteAttributesMap(feature, developableArea = null) {
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
      drawImage(ctx, baseMap, canvas.width, canvas.height, 1.0);
    } catch (error) {
      console.warn('Failed to load aerial layer:', error);
    }

    try {
      // 2. Zoning
      const zoningLayer = await getArcGISImage(LAYER_CONFIGS[SCREENSHOT_TYPES.ZONING], centerX, centerY, size);
      drawImage(ctx, zoningLayer, canvas.width, canvas.height, 0.4);
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
        bboxSR: 3857,  // Changed to Web Mercator since the service is in 3857
        imageSR: 3857,
        layers: `show:${easementsConfig.layerId}`,
        dpi: 96
      });

      // Direct request without proxy since it's a UAT environment
      const easementsLayer = await loadImage(`${easementsConfig.url}/export?${params.toString()}`);
      drawImage(ctx, easementsLayer, canvas.width, canvas.height, 0.7);
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

    if (developableArea?.features?.[0]) {
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.size || config.width, {
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

export async function captureContourMap(feature, developableArea = null) {
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

    if (developableArea?.features?.[0]) {
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

export async function captureRegularityMap(feature, developableArea = null) {
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
    if (developableArea?.features?.[0]) {
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

export async function captureHeritageMap(feature, developableArea = null) {
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

    if (developableArea?.features?.[0]) {
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Failed to capture heritage map:', error);
    return null;
  }
}

export async function captureAcidSulfateMap(feature, developableArea = null) {
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

    if (developableArea?.features?.[0]) {
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Failed to capture acid sulfate soils map:', error);
    return null;
  }
}

export async function captureWaterMainsMap(feature, developableArea = null) {
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

    if (developableArea?.features?.[0]) {
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

export async function capturePowerMap(feature, developableArea = null) {
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
                drawBoundary(ctx, feature.geometry.coordinates, centerX, centerY, size, config.width, {
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
          const style = feature.properties.ASSET_TYPE === 'OH' ? {
            strokeStyle: '#FFBD33',
            lineWidth: 8
          } : {
            strokeStyle: '#FFBD33',
            lineWidth: 8,
            lineDash: [15, 10]
          };
          drawBoundary(ctx, feature.geometry.coordinates, centerX, centerY, size, config.width, style);
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

    if (developableArea?.features?.[0]) {
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

export async function captureSewerMap(feature, developableArea = null) {
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

    if (developableArea?.features?.[0]) {
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

export async function captureGeoscapeMap(feature, developableArea = null) {
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

    if (developableArea?.features?.[0]) {
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

export async function captureRoadsMap(feature, developableArea = null) {
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
    if (developableArea?.features?.[0]) {
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

export async function captureFloodMap(feature, developableArea = null) {
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

    if (developableArea?.features?.[0]) {
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

export async function captureBushfireMap(feature, developableArea = null) {
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

    if (developableArea?.features?.[0]) {
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

export async function captureUDPPrecinctMap(feature, developableArea) {
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

    if (developableArea?.features?.[0]) {
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

export async function capturePTALMap(feature, developableArea = null) {
  if (!feature) return null;
  console.log('Starting PTAL map capture...');

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 1 
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    let ptalFeatures = [];
    
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
      // 2. PTAL layer
      console.log('Loading PTAL layer...');
      const ptalConfig = {
        baseUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/ptal_dec20_gdb__(1)/FeatureServer/0',
        layerId: 0,
        token: 'RozDIqRXAcLFLzwkHdKZBxmJVBySOlFCfJeWynAzm3NST2AXabtqEyX7wVZOb9fqw8lsKJKLwdvvtkEN8Vy_9zVYL6qO27bch0LIveTO8bnY1xh34JaLpzCa1GJcVx-WNx1nx6yQ3HTFPLiYY4I1mNaS0ka8flHfbwhv4gOk5K9ZZb5Wrb2brJEmRebq_NH8wul9ZONEYw1YIzDCVz3lobIPwyx1rMyvzDBXBcuVqsLpAw6iYgCn09TDqjVRijm7'
      };

      // Color mapping for PTAL values
      const ptalColors = {
        '1 - Low': '#ff000080',
        '2 - Low-Medium': '#ff7f0e80',
        '3 - Medium': '#f2ff0080',
        '4 - Medium-High': '#0e9aff80',
        '5 - High': '#a8ff7f80',
        '6 - Very High': '#1d960480'
      };

      // Get the PTAL features
      const { bbox } = calculateMercatorParams(centerX, centerY, size);
      const params = new URLSearchParams({
        where: '1=1',
        geometry: bbox,
        geometryType: 'esriGeometryEnvelope',
        inSR: 3857,
        spatialRel: 'esriSpatialRelIntersects',
        outFields: '*',
        returnGeometry: true,
        f: 'geojson',
        token: ptalConfig.token
      });

      const url = `${ptalConfig.baseUrl}/query?${params.toString()}`;
      console.log('PTAL request URL:', url);
      
      const ptalResponse = await proxyRequest(url);
      console.log('PTAL response:', ptalResponse);

      if (ptalResponse?.features?.length > 0) {
        console.log(`Drawing ${ptalResponse.features.length} PTAL features...`);
        ptalFeatures = ptalResponse.features;

        // Store the features in the feature object for scoring
        if (feature.properties) {
          feature.properties.ptalValues = ptalFeatures.map(f => f.properties.ptal);
        } else {
          feature.properties = { ptalValues: ptalFeatures.map(f => f.properties.ptal) };
        }

        ptalFeatures.forEach((ptalFeature, index) => {
          console.log(`Drawing PTAL feature ${index + 1}...`);
          const ptalValue = ptalFeature.properties.ptal;
          const color = ptalColors[ptalValue] || '#808080'; // Default gray if value not found

          drawBoundary(ctx, ptalFeature.geometry.coordinates[0], centerX, centerY, size, config.width, {
            fill: true,
            strokeStyle: '#000000',
            fillStyle: color,
            lineWidth: 2
          });
        });
      }
    } catch (error) {
      console.warn('Failed to load PTAL layer:', error);
    }

    // Draw boundaries
    drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width, {
      strokeStyle: '#FF0000',
      lineWidth: 6
    });

    if (developableArea?.features?.[0]) {
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    // Add legend
    const legendHeight = 360;
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
    ctx.fillText('PTAL', legendX + padding, legendY + padding);

    // Legend items
    const legendItems = [
      { color: '#ff0000', label: '1 - Low' },
      { color: '#ff7f0e', label: '2 - Low-Medium' },
      { color: '#f2ff00', label: '3 - Medium' },
      { color: '#0e9aff', label: '4 - Medium-High' },
      { color: '#a8ff7f', label: '5 - High' },
      { color: '#1d9604', label: '6 - Very High' }
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
    console.error('Failed to capture PTAL map:', error);
    return null;
  }
}

export async function captureContaminationMap(feature, developableArea = null) {
  if (!feature) return null;
  console.log('Starting contamination map capture...');

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.3
    };
    
    // Pass developableArea to calculateBounds
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

    try {
      // 2. Contamination layer
      console.log('Loading contamination layer...');
      const contaminationConfig = {
        url: 'https://maptest2.environment.nsw.gov.au/arcgis/rest/services/EPA/EPACS/MapServer',
        layerId: 1,
        size: 2048,
        padding: 0.3
      };

      // Get the contamination features
      const { bbox } = calculateMercatorParams(centerX, centerY, size);
      const queryParams = new URLSearchParams({
        f: 'json',
        geometry: bbox,
        geometryType: 'esriGeometryEnvelope',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: 'SiteName',
        returnGeometry: true,
        inSR: 3857,
        outSR: 3857
      });

      const queryUrl = `${contaminationConfig.url}/${contaminationConfig.layerId}/query?${queryParams.toString()}`;
      const contaminationResponse = await proxyRequest(queryUrl);
      
      if (contaminationResponse?.features?.length > 0) {
        console.log(`Drawing ${contaminationResponse.features.length} contamination features...`);
        
        // Convert features from Web Mercator to WGS84
        const convertedFeatures = contaminationResponse.features.map(feature => {
          const rings = feature.geometry.rings.map(ring => 
            ring.map(coord => {
              // Convert from Web Mercator to WGS84
              const lon = (coord[0] * 180) / 20037508.34;
              const lat = (Math.atan(Math.exp(coord[1] * Math.PI / 20037508.34)) * 360 / Math.PI) - 90;
              return [lon, lat];
            })
          );

          return {
            ...feature,
            geometry: {
              type: 'Polygon',
              coordinates: rings
            }
          };
        });
        
        // Store both the features and developableArea for scoring
        if (feature.properties) {
          feature.properties.site_suitability__contaminationFeatures = convertedFeatures;
          if (developableArea) {
            feature.properties.developableArea = developableArea;
          }
        } else {
          feature.properties = { 
            site_suitability__contaminationFeatures: convertedFeatures,
            ...(developableArea && { developableArea })
          };
        }
        
        contaminationResponse.features.forEach((contaminationFeature, index) => {
          console.log(`Drawing contamination feature ${index + 1}...`);
          if (contaminationFeature.geometry?.coordinates) {
            drawBoundary(ctx, contaminationFeature.geometry.coordinates[0], centerX, centerY, size, config.width, {
              fill: true,
              strokeStyle: 'rgba(255, 0, 0, 0.8)',
              fillStyle: 'rgba(255, 0, 0, 0.4)',
              lineWidth: 2
            });
          }
        });
      }

      // Then get the image layer for additional visual elements
      const { bbox: mercatorBbox } = calculateMercatorParams(centerX, centerY, size);
      const params = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${contaminationConfig.size},${contaminationConfig.size}`,
        bbox: mercatorBbox,
        bboxSR: 3857,
        imageSR: 3857,
        layers: `show:${contaminationConfig.layerId}`,
        dpi: 96
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
    } catch (error) {
      console.warn('Failed to load contamination layer:', error);
    }

    // Draw boundaries - Draw these AFTER all other layers for visibility
    console.log('Drawing boundaries...');
    
    // Draw developable area first (underneath property boundary)
    if (developableArea?.features?.[0]) {
      console.log('Drawing developable area boundary...', developableArea.features[0].geometry.coordinates[0]);
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    } else {
      console.log('No developable area to draw');
    }

    // Draw property boundary on top
    console.log('Drawing property boundary...', feature.geometry.coordinates[0]);
    drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width, {
      strokeStyle: '#FF0000',
      lineWidth: 6
    });

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
    ctx.fillText('Contaminated Sites', legendX + padding, legendY + padding);

    // Legend items
    const legendItems = [
      { color: 'rgba(255, 0, 0, 0.4)', label: 'Contaminated Site' }
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

    // Store the screenshot in the feature properties
    const screenshot = canvas.toDataURL('image/png', 1.0);
    feature.properties.contaminationMapScreenshot = screenshot;

    return screenshot;
  } catch (error) {
    console.error('Failed to capture contamination map:', error);
    return null;
  }
}

// Helper functions for tile coordinate calculation
function lon2tile(lon, zoom) {
  if (lon < -180 || lon > 180) {
    console.warn('Invalid longitude:', lon);
    lon = Math.max(-180, Math.min(180, lon));
  }
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
}

function lat2tile(lat, zoom) {
  if (lat < -85.0511 || lat > 85.0511) {
    console.warn('Invalid latitude:', lat);
    lat = Math.max(-85.0511, Math.min(85.0511, lat));
  }
  return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
}

// Convert Web Mercator coordinates to WGS84
function mercatorToWGS84(mercatorX, mercatorY) {
  const lon = (mercatorX / 20037508.34) * 180;
  const lat = (Math.atan(Math.exp((mercatorY / 20037508.34) * Math.PI)) * 360 / Math.PI) - 90;
  return [lon, lat];
}

export async function captureOpenStreetMap(feature, developableArea = null) {
  if (!feature) {
    console.log('No feature provided for OpenStreetMap capture');
    return null;
  }
  console.log('Starting OpenStreetMap capture...', { feature, developableArea });

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.3,
      zoomLevel: 17 // Increased zoom level for better detail
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    console.log('Calculated bounds:', { centerX, centerY, size });
    
    // Create base canvas
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d', { alpha: true });
    ctx.fillStyle = '#FFFFFF'; // Add white background
    ctx.fillRect(0, 0, config.width, config.height);
    console.log('Created canvas with dimensions:', { width: config.width, height: config.height });

    try {
      // Calculate tile coordinates
      const { bbox } = calculateMercatorParams(centerX, centerY, size);
      console.log('Mercator bbox:', bbox);
      
      const [minX, minY, maxX, maxY] = bbox.split(',').map(Number);
      console.log('Parsed bbox coordinates:', { minX, minY, maxX, maxY });
      
      // Convert Mercator coordinates to WGS84
      const [minLon, minLat] = mercatorToWGS84(minX, minY);
      const [maxLon, maxLat] = mercatorToWGS84(maxX, maxY);
      console.log('WGS84 coordinates:', { minLon, minLat, maxLon, maxLat });
      
      // Calculate tile coordinates with adjusted zoom level
      const tileSize = 256;
      
      // Convert bbox to tile coordinates using WGS84 coordinates
      const minTileX = lon2tile(minLon, config.zoomLevel);
      const maxTileX = lon2tile(maxLon, config.zoomLevel);
      const minTileY = lat2tile(maxLat, config.zoomLevel); // Note: maxLat for minTileY
      const maxTileY = lat2tile(minLat, config.zoomLevel); // Note: minLat for maxTileY

      // Calculate the total number of tiles and canvas position adjustments
      const tilesX = maxTileX - minTileX + 1;
      const tilesY = maxTileY - minTileY + 1;
      const totalWidth = tilesX * tileSize;
      const totalHeight = tilesY * tileSize;
      
      // Calculate scaling to fit all tiles within canvas
      const scale = Math.min(config.width / totalWidth, config.height / totalHeight);
      const offsetX = (config.width - totalWidth * scale) / 2;
      const offsetY = (config.height - totalHeight * scale) / 2;

      console.log('Tile calculations:', {
        minTileX, maxTileX, minTileY, maxTileY,
        tilesX, tilesY, scale, offsetX, offsetY
      });

      // Load and draw tiles
      let loadedTiles = 0;
      const totalTiles = tilesX * tilesY;
      console.log(`Starting to load ${totalTiles} tiles...`);

      // Scale context for all drawings
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      const maxRetries = 3;
      for (let x = minTileX; x <= maxTileX; x++) {
        for (let y = minTileY; y <= maxTileY; y++) {
          const url = `https://tile.openstreetmap.org/${config.zoomLevel}/${x}/${y}.png`;
          console.log(`Loading tile at ${url}`);
          
          let retryCount = 0;
          while (retryCount < maxRetries) {
            try {
              const tile = await loadImage(url);
              const tileX = (x - minTileX) * tileSize;
              const tileY = (y - minTileY) * tileSize;
              
              ctx.drawImage(tile, tileX, tileY, tileSize, tileSize);
              loadedTiles++;
              console.log(`Successfully loaded and drew tile ${loadedTiles}/${totalTiles}`);
              break;
            } catch (tileError) {
              retryCount++;
              if (retryCount === maxRetries) {
                console.error(`Failed to load tile at ${x},${y} after ${maxRetries} attempts:`, tileError);
              } else {
                console.warn(`Retry ${retryCount}/${maxRetries} for tile at ${x},${y}`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between retries
              }
            }
          }
        }
      }

      ctx.restore();
      
      console.log(`Finished loading tiles. Successfully loaded ${loadedTiles}/${totalTiles} tiles`);

      // Draw boundaries with adjusted scale
      console.log('Drawing property boundary...');
      drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width, {
        strokeStyle: '#FF0000',
        lineWidth: 3,
        scale,
        offsetX,
        offsetY
      });

      if (developableArea?.features?.[0]) {
        console.log('Drawing developable area boundary...');
        drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width, {
          strokeStyle: '#02d1b8',
          lineWidth: 6,
          dashArray: [10, 5],
          scale,
          offsetX,
          offsetY
        });
      }

      console.log('Converting canvas to data URL...');
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      console.log('Successfully generated OpenStreetMap image');
      return dataUrl;
    } catch (error) {
      console.error('Failed to load OpenStreetMap layer:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      return null;
    }
  } catch (error) {
    console.error('Failed to capture OpenStreetMap:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    return null;
  }
}

export async function captureTECMap(feature, developableArea = null) {
  if (!feature) {
    console.log('No feature provided for TEC map capture');
    return null;
  }
  console.log('Starting TEC map capture...', { feature, developableArea });

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
    ctx.fillStyle = '#FFFFFF'; // Add white background
    ctx.fillRect(0, 0, config.width, config.height);
    console.log('Created canvas with dimensions:', { width: config.width, height: config.height });

    try {
      // 1. Aerial basemap
      const aerialConfig = LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL];
      const aerialUrl = await proxyRequest(`${aerialConfig.url}?${new URLSearchParams({
        service: 'WMS',
        version: '1.3.0',
        request: 'GetMap',
        format: 'image/png',
        transparent: 'true',
        layers: aerialConfig.layers,
        width: config.width,
        height: config.height,
        crs: 'EPSG:4283',
        bbox: `${centerY - size/2},${centerX - size/2},${centerY + size/2},${centerX + size/2}`,
        styles: ''
      })}`);
      const aerialLayer = await loadImage(aerialUrl);
      drawImage(ctx, aerialLayer, canvas.width, canvas.height, 1);
      console.log('Added aerial basemap');
    } catch (error) {
      console.warn('Failed to load aerial basemap:', error);
    }

    try {
      // 2. TEC layer
      const tecConfig = {
        url: 'https://mapprod1.environment.nsw.gov.au/arcgis/rest/services/EDP/TECs_GreaterSydney/MapServer',
        layerId: 0,
        size: 2048,
        padding: 0.2
      };
      const tecUrl = await proxyRequest(`${tecConfig.url}/export?${new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${tecConfig.size},${tecConfig.size}`,
        bbox: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        bboxSR: 4283,
        imageSR: 4283,
        layers: `show:${tecConfig.layerId}`,
        dpi: 96
      })}`);
      const tecLayer = await loadImage(tecUrl);
      drawImage(ctx, tecLayer, canvas.width, canvas.height, 0.7);
      console.log('Added TEC layer');
    } catch (error) {
      console.warn('Failed to load TEC layer:', error);
    }

    // Draw boundary lines
    if (feature.geometry) {
      drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width, {
        strokeStyle: '#FF0000',
        lineWidth: 3
      });
      console.log('Added site boundary');
    }

      // Draw developable area if provided
      if (developableArea?.[0]?.geometry?.coordinates) {
        drawBoundary(ctx, developableArea[0].geometry.coordinates[0], centerX, centerY, size, config.width, {
          strokeStyle: '#00FFFF',
          lineWidth: 2,
          lineDash: [10, 10]
        });
        console.log('Added developable area boundary');
      }

    // Convert canvas to base64 image
    const screenshot = canvas.toDataURL('image/png');
    console.log('Generated TEC map screenshot');

    return screenshot;
  } catch (error) {
    console.error('Failed to capture TEC map:', error);
    return null;
  }
}

export async function captureBiodiversityMap(feature, developableArea = null) {
  if (!feature) return null;
  console.log('Starting biodiversity map capture...');

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

    try {
      // 2. Biodiversity Values layer
      console.log('Loading biodiversity layer...');
      const biodiversityConfig = {
        url: 'https://www.lmbc.nsw.gov.au/arcgis/rest/services/BV/BiodiversityValues/MapServer',
        layerId: 0,
        size: 2048,
        padding: 0.2
      };

      // Get the biodiversity features
      const { bbox: mercatorBbox } = calculateMercatorParams(centerX, centerY, size);
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
    }

    // Draw boundaries
    drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width, {
      strokeStyle: '#FF0000',
      lineWidth: 6
    });

    if (developableArea?.features?.[0]) {
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    // Add legend
    const legendHeight = 240;
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
    ctx.fillText('Biodiversity Values', legendX + padding, legendY + padding);

    // Legend items
    const legendItems = [
      { color: '#FF0000', label: 'Biodiversity Value Area' }
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
    console.error('Failed to capture biodiversity map:', error);
    return null;
  }
}