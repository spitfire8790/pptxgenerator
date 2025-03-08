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
import { convertToWebMercator } from '../utils/coordinates';


console.log('Aerial config:', LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL]);

export async function captureMapScreenshot(
  feature, 
  type = SCREENSHOT_TYPES.SNAPSHOT, 
  drawBoundaryLine = true, 
  developableArea = null, 
  showDevelopableArea = true, 
  useDevelopableAreaForBounds = false, 
  showLabels = true,
  showDevelopableAreaLabels = true
) {
  if (!feature || !LAYER_CONFIGS[type]) {
    console.error(`captureMapScreenshot: Invalid feature or missing layer config for type ${type}`);
    return null;
  }
  
  try {
    console.log(`captureMapScreenshot: Starting to capture ${type} screenshot`);
    const config = LAYER_CONFIGS[type];
    console.log(`captureMapScreenshot: Using config:`, config);
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
    console.log(`captureMapScreenshot: Calculated bounds - centerX: ${centerX}, centerY: ${centerY}, size: ${size}`);
    
    // Get Mercator parameters for proper coordinate transformation
    const { bbox, mercatorCoords } = calculateMercatorParams(centerX, centerY, size);
    console.log(`captureMapScreenshot: Calculated mercator params - bbox: ${bbox}`);
        
    const baseMapImage = config.layerId ? 
      await getWMSImage(LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL], centerX, centerY, size) : 
      null;
    console.log(`captureMapScreenshot: Base map image ${baseMapImage ? 'captured' : 'not captured or not needed'}`);

    console.log(`captureMapScreenshot: Getting main image for ${type}`);
    const mainImage = config.layerId ?
      await getArcGISImage(config, centerX, centerY, size) :
      await getWMSImage(config, centerX, centerY, size);
    console.log(`captureMapScreenshot: Main image ${mainImage ? 'captured' : 'failed to capture'}`);

    if (!mainImage) {
      console.error(`captureMapScreenshot: Failed to capture main image for ${type}`);
      return null;
    }

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
          drawImage(ctx, cadastreLayer, canvas.width, canvas.height, 0.4);
        }
      } catch (error) {
        console.warn('Failed to load cadastre layer:', error);
      }
    }

    if (developableArea?.features?.length > 0 && showDevelopableArea) {
      // Use the new helper function to draw developable areas with labels
      drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width || config.size, showDevelopableAreaLabels);
    }

    if (drawBoundaryLine) {
      drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width || config.size, {
        showLabels: showLabels
      });
    }

    console.log(`captureMapScreenshot: Successfully captured ${type} screenshot`);
    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error(`captureMapScreenshot: Failed to capture ${type} screenshot:`, error);
    return null;
  }
}

export function calculateBounds(feature, padding, developableArea = null, useDevelopableAreaForBounds = false) {
  let allCoordinates = [];
  
  // Handle feature coordinates based on type
  if (feature.type === 'FeatureCollection' && feature.features && feature.features.length > 0) {
    // For feature collections, collect coordinates from all features
    feature.features.forEach(featureItem => {
      if (featureItem.geometry?.type === 'Polygon' && featureItem.geometry?.coordinates?.[0]) {
        allCoordinates.push(...featureItem.geometry.coordinates[0]);
      } else if (featureItem.geometry?.type === 'MultiPolygon' && featureItem.geometry?.coordinates) {
        featureItem.geometry.coordinates.forEach(polygon => {
          if (polygon[0]) {
            allCoordinates.push(...polygon[0]);
          }
        });
      }
    });
  } else if (feature.geometry?.type === 'Polygon' && feature.geometry?.coordinates?.[0]) {
    // For single Polygon features
    allCoordinates = [...feature.geometry.coordinates[0]];
  } else if (feature.geometry?.type === 'MultiPolygon' && feature.geometry?.coordinates) {
    // For single MultiPolygon features
    feature.geometry.coordinates.forEach(polygon => {
      if (polygon[0]) {
        allCoordinates.push(...polygon[0]);
      }
    });
  } else {
    console.warn('Invalid feature geometry for bounds calculation', feature);
  }
  
  // Add developable area coordinates if needed
  if (developableArea?.features?.length > 0) {
    const devAreaCoords = [];
    developableArea.features.forEach(devFeature => {
      if (devFeature.geometry?.type === 'Polygon' && devFeature.geometry?.coordinates?.[0]) {
        devAreaCoords.push(...devFeature.geometry.coordinates[0]);
      } else if (devFeature.geometry?.type === 'MultiPolygon' && devFeature.geometry?.coordinates) {
        devFeature.geometry.coordinates.forEach(polygon => {
          if (polygon[0]) {
            devAreaCoords.push(...polygon[0]);
          }
        });
      }
    });
    
    // Determine which coordinates to use based on the useDevelopableAreaForBounds flag
    if (useDevelopableAreaForBounds) {
      // Use only developable areas for bounds calculation
      allCoordinates = devAreaCoords;
    } else {
      // Use both property and all developable areas for bounds calculation
      allCoordinates = [...allCoordinates, ...devAreaCoords];
    }
  }

  if (!allCoordinates || allCoordinates.length === 0) {
    console.error('No valid coordinates found for bounds calculation');
    // Provide default bounds
    return { centerX: 151.2093, centerY: -33.8688, size: 1000 }; // Default to Sydney CBD
  }

  const bounds = allCoordinates.reduce((acc, coord) => ({
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

// Helper function to draw feature boundaries (single or multiple)
function drawFeatureBoundaries(ctx, feature, centerX, centerY, size, canvasWidth, options = {}) {
  const defaultOptions = {
    strokeStyle: '#FF0000',
    lineWidth: 6,
    showLabels: true
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  // Check if we have multiple features (feature collection with more than 1 feature)
  const hasMultipleFeatures = 
    feature.type === 'FeatureCollection' && 
    feature.features && 
    feature.features.length > 1;
  
  if (feature.type === 'FeatureCollection' && feature.features) {
    // Draw each feature in the collection separately
    feature.features.forEach((featureItem, index) => {
      if (featureItem.geometry?.coordinates?.[0]) {
        // Draw boundary for all features
        drawBoundary(ctx, featureItem.geometry.coordinates[0], centerX, centerY, size, canvasWidth, {
          strokeStyle: mergedOptions.strokeStyle,
          lineWidth: mergedOptions.lineWidth
        });
        
        // Add label on centroid ONLY if there are multiple features AND showLabels is true
        if (hasMultipleFeatures && mergedOptions.showLabels) {
          const label = String.fromCharCode(65 + index); // A=65, B=66, etc.
          try {
            const polygon = turf.polygon([featureItem.geometry.coordinates[0]]);
            const centroid = turf.centroid(polygon);
            
            if (centroid && centroid.geometry && centroid.geometry.coordinates) {
              const [lon, lat] = centroid.geometry.coordinates;
              const [mercX, mercY] = convertToWebMercator(lon, lat);
              const { centerMercX, centerMercY, sizeInMeters } = calculateMercatorParams(centerX, centerY, size);
              
              // Transform to canvas coordinates
              const x = ((mercX - (centerMercX - sizeInMeters/2)) / sizeInMeters) * canvasWidth;
              const y = ((centerMercY + sizeInMeters/2 - mercY) / sizeInMeters) * canvasWidth;
              
              // Draw white circle with red stroke
              ctx.beginPath();
              ctx.arc(x, y, 40, 0, Math.PI * 2);
              ctx.fillStyle = '#FFFFFF';
              ctx.fill();
              ctx.strokeStyle = mergedOptions.strokeStyle;
              ctx.lineWidth = 3;
              ctx.stroke();
              
              // Draw label text
              ctx.fillStyle = mergedOptions.strokeStyle;
              ctx.font = 'bold 48px "Public Sans"';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(label, x, y);
            }
          } catch (error) {
            console.warn('Error adding centroid label:', error);
          }
        }
      }
    });
  } else if (feature.geometry?.coordinates?.[0]) {
    // Draw a single feature
    drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, canvasWidth, {
      strokeStyle: mergedOptions.strokeStyle,
      lineWidth: mergedOptions.lineWidth
    });
  }
}

export async function capturePrimarySiteAttributesMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false) {
  if (!feature) return null;
  
  try {
    const config = LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL];
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
    
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
            
            // Ensure feature.properties exists before setting properties
            if (!feature.properties) {
              feature.properties = {};
            }
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
    drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width || config.size, {
      showLabels: false
    });

    if (developableArea?.features?.length > 0 && showDevelopableArea) {
      // Use the new helper function to draw developable areas with labels
      drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width || config.size, true);
    }

    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Failed to capture primary site attributes map:', error);
    return null; // Return null instead of throwing
  }
}

export async function captureContourMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false, showLabels = false, showDevelopableAreaLabels = false) {
  if (!feature) return null;
  
  try {
    const config = LAYER_CONFIGS[SCREENSHOT_TYPES.CONTOUR];
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
    
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
    drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.size || config.width, {
      showLabels: showLabels
    });

    if (developableArea?.features?.length > 0 && showDevelopableArea) {
      // Use the new helper function to draw developable areas with labels
      drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.size || config.width, showDevelopableAreaLabels);
    }

    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Failed to capture contour map:', error);
    return null;
  }
}

export async function captureRegularityMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false, showLabels = false, showDevelopableAreaLabels = false) {
  if (!feature) return null;
  
  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.3
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
    
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
    drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width, {
      showLabels: showLabels
    });

    // Draw developable areas if they exist
    if (developableArea?.features?.length > 0 && showDevelopableArea) {
      // Use the new helper function to draw developable areas with labels
      drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width, showDevelopableAreaLabels);
    }

    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Failed to capture regularity map:', error);
    return null;
  }
}

export async function captureHeritageMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false) {
  if (!feature) return null;
  
  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.3
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
    
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

    // Draw boundaries without labels
    drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width, {
      showLabels: false
    });

    if (developableArea?.features?.length > 0 && showDevelopableArea) {
      // Use the helper function to draw developable areas without labels
      drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width, false);
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

export async function captureAcidSulfateMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false) {
  if (!feature) return null;
  
  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.3
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
    
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

    // Draw boundaries without labels
    drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width, {
      showLabels: false
    });

    if (developableArea?.features?.length > 0 && showDevelopableArea) {
      // Use the helper function to draw developable areas without labels
      drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width, false);
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

export async function captureWaterMainsMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false) {
  if (!feature) return null;
  console.log('Starting water mains capture...');

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.2
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
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
            if (!feature.properties) {
              feature.properties = {};
            }
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

    // Draw boundaries without labels
    drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width, {
      showLabels: false
    });

    if (developableArea?.features?.length > 0 && showDevelopableArea) {
      // Use the helper function to draw developable areas without labels
      drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width, false);
    }

    // Take screenshot
    const screenshot = await canvas.toDataURL();
    
    // Ensure feature.properties exists before setting waterMainsScreenshot
    if (!feature.properties) {
      feature.properties = {};
    }
    feature.properties.waterMainsScreenshot = screenshot;

    return { image: screenshot, features: waterMainsFeatures };
  } catch (error) {
    console.error('Failed to capture water mains map:', error);
    return null;
  }
}

export async function capturePowerMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false) {
  if (!feature) return null;
  console.log('Starting power infrastructure capture...');

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.2
    };

    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
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

    // Draw boundaries without labels
    drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width, {
      showLabels: false
    });

    if (developableArea?.features?.length > 0 && showDevelopableArea) {
      // Use the helper function to draw developable areas without labels
      drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width, false);
    }

    // Ensure feature.properties exists before setting powerFeatures
    if (!feature.properties) {
      feature.properties = {};
    }
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

export async function captureSewerMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false) {
  if (!feature) return null;
  console.log('Starting sewer infrastructure capture...');

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.2
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
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
            if (!feature.properties) {
              feature.properties = {};
            }
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

    // Draw boundaries without labels
    drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width, {
      showLabels: false
    });

    if (developableArea?.features?.length > 0 && showDevelopableArea) {
      // Use the helper function to draw developable areas without labels
      drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width, false);
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

export async function captureGeoscapeMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false) {
  if (!feature) return null;
  console.log('Starting geoscape capture...');

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.2
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
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

    // Draw boundaries without labels
    drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width, {
      showLabels: false
    });

    if (developableArea?.features?.length > 0 && showDevelopableArea) {
      // Draw developable areas without labels
      drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width, false);
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

export async function captureStreetViewScreenshot(feature, developableArea = null) {
  // Use developableArea if provided, otherwise use the feature
  const featureToUse = developableArea && developableArea.features && developableArea.features.length > 0 
    ? developableArea.features[0] 
    : feature;
    
  if (!featureToUse) {
    console.log('No feature or developable area provided for Street View screenshot');
    return null;
  }

  const API_KEY = 'AIzaSyA39asjosevcj5vdSAlPoTNkrQ0Vmcouts';

  try {
    // Get the coordinates from the feature
    const coordinates = featureToUse.geometry.coordinates[0];
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

          // Create the mini map image showing camera position and all developable areas
          // First, prepare the path for the feature we're using for Street View
          const pathCoords = coordinates.map(coord => `${coord[1]},${coord[0]}`).join('|');
          
          // Prepare static map URL with the main feature
          let staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=400x400&key=${API_KEY}`
            + `&path=color:0x02d1b8|weight:4|fillcolor:0x02d1b833|geodesic=true|${pathCoords}`;
          
          // Add all developable areas to the map if they exist
          if (developableArea && developableArea.features && developableArea.features.length > 0) {
            // Add each developable area as a separate path with different color
            developableArea.features.forEach((devArea, index) => {
              if (devArea.geometry && devArea.geometry.coordinates && devArea.geometry.coordinates[0]) {
                const devAreaCoords = devArea.geometry.coordinates[0].map(coord => 
                  `${coord[1]},${coord[0]}`
                ).join('|');
                
                // Use a different color for developable areas
                staticMapUrl += `&path=color:0xFF9900|weight:3|fillcolor:0xFF990033|${devAreaCoords}`;
              }
            });
          }
          
          // Calculate appropriate zoom level based on all features
          let allCoordinates = [...coordinates];
          
          // Include coordinates from all developable areas
          if (developableArea && developableArea.features) {
            developableArea.features.forEach(devArea => {
              if (devArea.geometry && devArea.geometry.coordinates && devArea.geometry.coordinates[0]) {
                allCoordinates = [...allCoordinates, ...devArea.geometry.coordinates[0]];
              }
            });
          }
          
          // Calculate bounds based on all coordinates
          const bounds = allCoordinates.reduce((acc, coord) => ({
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

          // Calculate center of all features
          const mapCenter = {
            lat: (bounds.minLat + bounds.maxLat) / 2,
            lng: (bounds.minLng + bounds.maxLng) / 2
          };

          // Calculate zoom level based on the size of all features
          const latSpan = bounds.maxLat - bounds.minLat;
          const lngSpan = bounds.maxLng - bounds.minLng;
          const maxSpan = Math.max(latSpan, lngSpan);
          // Reduce zoom level by 1 to add more padding
          const zoom = Math.floor(Math.log2(360 / maxSpan)) - 1;  // Further reduced to show more context
          
          // Add remaining parameters to the static map URL
          staticMapUrl += `&markers=anchor:center|icon:https://maps.google.com/mapfiles/dir_${Math.round(bearing/22.5) % 16}.png|${panoramaLat},${panoramaLng}`
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
    // Pass a longer timeout option (120 seconds instead of the default 30)
    const response = await proxyRequest(`${url}?${params}`, { timeout: 120000 });
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

export async function captureRoadsMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false) {
  if (!feature) return null;
  console.log('Starting roads capture...', {
    featureType: feature.type,
    hasMultipleFeatures: feature.type === 'FeatureCollection' && feature.features?.length > 1,
    developableAreaFeatures: developableArea?.features?.length
  });

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.2  
    };
    
    // Calculate bounds considering all features and all developable areas
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
    console.log('Roads map bounds calculated:', { centerX, centerY, size });
    
    // Get road features first
    console.log('Fetching road features...');
    const roadFeatures = await getRoadFeatures(centerX, centerY, size);
    console.log('Retrieved road features:', roadFeatures);
    
    // Store the features in feature properties - handle both collection and single feature
    if (feature.type === 'FeatureCollection') {
      feature.features.forEach(f => {
        if (!f.properties) {
          f.properties = {};
        }
        f.properties.roadFeatures = roadFeatures;
      });
    } else {
      // Single feature case
      if (!feature.properties) {
        feature.properties = {};
      }
      feature.properties.roadFeatures = roadFeatures;
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
      try {
        const baseMap = await loadImage(url);
        drawImage(ctx, baseMap, canvas.width, canvas.height, 0.3);  
      } catch (error) {
        console.error('Failed to load aerial layer:', error);
        // Continue with a white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    } catch (error) {
      console.error('Failed to load aerial layer:', error);
      // Ensure we have a white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
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
          try {
            const roadsLayer = await loadImage(proxyUrl);
            console.log('Roads layer loaded successfully');
            // Ensure full opacity for better visibility
            drawImage(ctx, roadsLayer, canvas.width, canvas.height, 1);
          } catch (imgError) {
            console.warn('Failed to load roads layer image:', imgError);
          }
        } else {
          console.warn('Failed to get proxy URL for roads layer');
        }
      } catch (proxyError) {
        console.warn('Failed to proxy roads layer request:', proxyError);
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
        dpi: 300  
      });

      const url = `${labelsConfig.url}/export?${params.toString()}`;
      console.log('Requesting road labels through proxy...', url);
      
      try {
        // Add a longer timeout (3 minutes) for the road labels request
        const proxyUrl = await proxyRequest(url, { timeout: 180000 });
        if (proxyUrl) {
          console.log('Loading road labels from proxy URL...');
          try {
            const labelsLayer = await loadImage(proxyUrl);
            console.log('Road labels loaded successfully');
            drawImage(ctx, labelsLayer, canvas.width, canvas.height, 1.0);
          } catch (imgError) {
            console.warn('Failed to load road labels image:', imgError);
          }
        } else {
          console.warn('Failed to get proxy URL for road labels');
        }
      } catch (proxyError) {
        console.warn('Failed to proxy road labels request:', proxyError);
      }
    } catch (error) {
      console.warn('Failed to load road labels:', error);
    }

    // Draw all developable areas AFTER all layers if they exist
    if (developableArea?.features?.length > 0 && showDevelopableArea) {
      console.log('Drawing developable area boundaries...');
      // Draw all developable areas without labels
      drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width, false);
    }

    // Draw boundaries with increased visibility
    drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width, {
      showLabels: false,
      strokeStyle: 'rgba(255, 0, 0, 0.8)',  // Red boundary for better visibility
      lineWidth: 3  // Thicker line
    });

    if (developableArea?.features?.length > 0 && showDevelopableArea) {
      // Draw developable areas without labels
      drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width, false);
    }

    // Add legend with adjusted spacing and formatting
    const legendHeight = 500; // Reduced height to be more compact
    const legendWidth = 300; // Slightly reduced width
    const padding = 20; // Reduced padding
    const lineHeight = 36; // Reduced line height for more compact layout
    const legendX = canvas.width - legendWidth - padding;
    const legendY = canvas.height - legendHeight - padding;
    const swatchLength = 40; // Shorter line sample
    const swatchPadding = 15; // Reduced space between swatch and label

    // Draw legend background with border
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#002664';
    ctx.lineWidth = 2;
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

    // Legend title
    ctx.font = 'bold 24px Public Sans'; // Reduced font size
    ctx.fillStyle = '#002664';
    ctx.textBaseline = 'top';
    ctx.fillText('Road Classification', legendX + padding, legendY + padding);

    // Legend items with exact colors from the image
    const legendItems = [
      { label: 'Access Way', color: '#FCECCC', width: 3, style: 'dotted' },
      { label: 'Arterial Road', color: '#9C9C9C', width: 4 },
      { label: 'Dedicated Bus Way', color: '#FF0000', width: 4 },
      { label: 'Distributor Road', color: '#B2B2B2', width: 4 },
      { label: 'Local Road', color: '#CCCCCC', width: 3 },
      { label: 'Motorway', color: '#4E4E4E', width: 6 },
      { label: 'Path', color: '#686868', width: 2, style: 'dashed' },
      { label: 'Primary Road', color: '#4E4E4E', width: 6 },
      { label: 'Sub-Arterial Road', color: '#9C9C9C', width: 4 },
      { label: 'Track-Vehicular', color: '#FFA77F', width: 2, style: 'dashed' },
      { label: 'Urban Service Lane', color: '#CCCCCC', width: 3 }
    ];

    // Draw legend items
    ctx.textBaseline = 'middle';
    ctx.font = '20px Public Sans'; 

    legendItems.forEach((item, index) => {
      const y = legendY + padding + 50 + (index * lineHeight); // Adjusted starting position
      
      // Draw line sample
      ctx.beginPath();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.width * 1.5; // Slightly reduced multiplier
      
      if (item.style === 'dotted') {
        ctx.setLineDash([3, 3]); // Smaller dots
      } else if (item.style === 'dashed') {
        ctx.setLineDash([8, 6]); // Smaller dashes
      } else {
        ctx.setLineDash([]);
      }
      
      ctx.moveTo(legendX + padding, y);
      ctx.lineTo(legendX + padding + swatchLength, y);
      ctx.stroke();

      // Reset line dash for text
      ctx.setLineDash([]);
      
      // Draw label with consistent padding
      ctx.fillStyle = '#363636';
      ctx.fillText(item.label, legendX + padding + swatchLength + swatchPadding, y);
    });

    // Return both the screenshot and the road features
    return {
      dataURL: canvas.toDataURL('image/png', 1.0),
      roadFeatures: roadFeatures // Return the roadFeatures variable directly
    };
  } catch (error) {
    console.error('Failed to capture roads map:', error);
    return null;
  }
}

export async function captureFloodMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false, showLabels = false, showDevelopableArealabels = false) {
  if (!feature) return null;
  
  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.3
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
    
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
            
            // Ensure feature.properties exists before setting properties
            if (!feature.properties) {
              feature.properties = {};
            }
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
    drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width, { showLabels: false });

    if (developableArea?.features?.length > 0 && showDevelopableArea) {
      // Use the new helper function to draw developable areas with labels
      drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width, showDevelopableArealabels);
    }

    // Store the screenshot
    const screenshot = canvas.toDataURL('image/png', 1.0);
    feature.properties.floodMapScreenshot = screenshot;

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

export async function captureBushfireMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false, showLabels = false, showDevelopableArealabels = false) {
  if (!feature) return null;
  console.log('Starting bushfire map capture...');

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.3
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
    
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
    drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width, { showLabels: false });

    if (developableArea?.features?.length > 0 && showDevelopableArea) {
      // Use the new helper function to draw developable areas with labels
      drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width, showDevelopableArealabels);
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

    // Return both the screenshot and properties with the features
    const screenshot = canvas.toDataURL('image/png', 1.0);
    return {
      dataURL: screenshot,
      properties: feature.properties
    };
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

// Add helper function for bushfire legend
function drawBushfireLegend(ctx, canvasWidth, canvasHeight) {
  // Draw legend in bottom right corner
  const legendHeight = 90;
  const legendWidth = 300;
  const padding = 20;
  const legendX = canvasWidth - legendWidth - padding;
  const legendY = canvasHeight - legendHeight - padding;

  // Draw legend background with border
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.strokeStyle = '#002664';
  ctx.lineWidth = 2;
  ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
  ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

  // Draw legend title
  ctx.font = 'bold 14px "Public Sans"';
  ctx.fillStyle = '#002664';
  ctx.textAlign = 'left';
  ctx.fillText('Bushfire Prone Land', legendX + 10, legendY + 20);

  // Draw color box for bushfire
  ctx.fillStyle = 'rgba(213, 35, 49, 0.7)';
  ctx.fillRect(legendX + 10, legendY + 35, 30, 20);
  ctx.strokeStyle = 'rgba(213, 35, 49, 1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(legendX + 10, legendY + 35, 30, 20);

  // Draw label for bushfire
  ctx.font = '12px "Public Sans"';
  ctx.fillStyle = '#333333';
  ctx.textAlign = 'left';
  ctx.fillText('Bushfire Prone Land', legendX + 50, legendY + 48);
}

/**
 * Checks if a feature overlaps with LMR areas by directly querying the mapservers
 * @param {Object} feature - The GeoJSON feature to check
 * @returns {Promise<Object>} - Overlap information
 */
export async function checkLMROverlap(feature) {
  console.log('Checking LMR overlap for feature using direct mapserver query...');
  
  if (!feature || !feature.geometry) {
    console.warn('Invalid feature for LMR overlap check:', feature);
    return { hasOverlap: false, overlaps: {}, primaryOverlap: null };
  }
  
  try {
    // Define the LMR layers to check with their respective mapserver details
    const lmrLayers = [
      { 
        id: 4, 
        name: 'Indicative LMR Housing Area',
        url: 'https://spatialportalarcgis.dpie.nsw.gov.au/sarcgis/rest/services/LMR/LMR/MapServer'
      },
      { 
        id: 2, 
        name: 'TOD Accelerated Rezoning Area',
        url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/SEPP_Housing_2021/MapServer'
      },
      { 
        id: 3, 
        name: 'TOD Area',
        url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/SEPP_Housing_2021/MapServer'
      }
    ];
    
    // Convert feature to ESRI JSON format for the query
    const esriGeometry = featureToEsriGeometry(feature);
    if (!esriGeometry) {
      console.warn('Failed to convert feature to ESRI geometry');
      return { hasOverlap: false, overlaps: {}, primaryOverlap: null };
    }
    
    // Track overlap results for each layer
    const results = {
      hasOverlap: false,
      overlaps: {},
      primaryOverlap: null,
      featureCounts: {}
    };
    
    // Initialize overlap status for each layer
    lmrLayers.forEach(layer => {
      results.overlaps[layer.name] = false;
      results.featureCounts[layer.name] = 0;
    });
    
    // Query each LMR layer for intersection
    const queryPromises = lmrLayers.map(async layer => {
      try {
        console.log(`Querying ${layer.name} (Layer ID: ${layer.id}) for overlap...`);
        
        const queryParams = new URLSearchParams({
          f: 'json',
          where: '1=1',
          geometry: JSON.stringify(esriGeometry),
          geometryType: 'esriGeometryPolygon',
          inSR: 4326,  // WGS84
          outSR: 4283, // GDA94 - as per the user's note
          spatialRel: 'esriSpatialRelIntersects',
          outFields: '*',
          returnCountOnly: true
        });
        
        const queryUrl = `${layer.url}/${layer.id}/query?${queryParams.toString()}`;
        console.log('Query URL:', queryUrl);
        
        const response = await proxyRequest(queryUrl, { timeout: 120000 });
        console.log(`${layer.name} overlap response:`, response);
        
        if (response && response.count !== undefined) {
          const hasLayerOverlap = response.count > 0;
          results.overlaps[layer.name] = hasLayerOverlap;
          results.featureCounts[layer.name] = response.count;
          
          if (hasLayerOverlap) {
            results.hasOverlap = true;
          }
        }
      } catch (layerError) {
        console.warn(`Error querying ${layer.name}:`, layerError);
        // Don't fail the whole process if one layer query fails
      }
    });
    
    // Wait for all queries to complete
    await Promise.all(queryPromises);
    
    // Determine which area has the most overlap (by feature count)
    let maxCount = 0;
    
    Object.entries(results.featureCounts).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        results.primaryOverlap = name;
      }
    });
    
    console.log('LMR overlap results:', results);
    return results;
  } catch (error) {
    console.error('Error checking LMR overlap:', error);
    return {
      hasOverlap: false,
      overlaps: {},
      primaryOverlap: null,
      featureCounts: {}
    };
  }
}

/**
 * Helper function to convert a GeoJSON feature to ESRI JSON format
 * @param {Object} feature - GeoJSON feature
 * @returns {Object} - ESRI JSON geometry
 */
function featureToEsriGeometry(feature) {
  try {
    if (!feature || !feature.geometry) {
      return null;
    }
    
    let rings = [];
    
    // Extract coordinates based on geometry type
    if (feature.geometry.type === 'Polygon' && feature.geometry.coordinates?.[0]) {
      // For Polygon geometry
      rings = feature.geometry.coordinates.map(ring => [...ring]);
    } else if (feature.geometry.type === 'MultiPolygon' && feature.geometry.coordinates?.[0]?.[0]) {
      // For MultiPolygon geometry, flatten all rings
      feature.geometry.coordinates.forEach(polygon => {
        polygon.forEach(ring => {
          rings.push([...ring]);
        });
      });
    } else {
      console.warn('Unsupported geometry type for ESRI conversion:', feature.geometry.type);
      return null;
    }
    
    // Check if we have valid rings
    if (rings.length === 0) {
      console.warn('No valid rings found in the feature geometry');
      return null;
    }
    
    // Create ESRI JSON format geometry
    return {
      rings: rings,
      spatialReference: { wkid: 4326 }  // WGS84
    };
  } catch (error) {
    console.error('Error converting feature to ESRI geometry:', error);
    return null;
  }
}

/**
 * Helper function to check if a feature overlaps with ArcGIS features
 * Updated to use spatial queries instead of simple presence checks
 * @param {Object} feature - The GeoJSON feature to check for overlap
 * @param {Array} arcgisFeatures - The ArcGIS features (for backward compatibility)
 * @param {Object} options - Optional params like layerUrl and layerId for direct query
 * @returns {Boolean} - Whether the feature overlaps with any of the ArcGIS features
 */
async function checkFeatureOverlap(feature, arcgisFeatures, options = {}) {
  // First, check if we have the feature and arcgisFeatures as a fallback
  if (!feature) {
    console.warn('Invalid feature for overlap check');
    return false;
  }
  
  // If we have direct query options, use them
  if (options.layerUrl && options.layerId !== undefined) {
    try {
      // Convert feature to ESRI JSON format
      const esriGeometry = featureToEsriGeometry(feature);
      if (!esriGeometry) {
        console.warn('Failed to convert feature to ESRI geometry');
        return false;
      }
      
      // Build query parameters for spatial intersection
      const queryParams = new URLSearchParams({
        f: 'json',
        where: '1=1',
        geometry: JSON.stringify(esriGeometry),
        geometryType: 'esriGeometryPolygon',
        inSR: 4326,  // WGS84
        outSR: 4283, // GDA94
        spatialRel: 'esriSpatialRelIntersects',
        returnCountOnly: true
      });
      
      const queryUrl = `${options.layerUrl}/${options.layerId}/query?${queryParams.toString()}`;
      console.log(`Checking feature overlap with layer ${options.layerId}...`);
      
      const response = await proxyRequest(queryUrl, { timeout: 60000 });
      console.log(`Layer ${options.layerId} overlap response:`, response);
      
      return response && response.count > 0;
    } catch (error) {
      console.warn(`Error checking direct feature overlap for layer ${options.layerId}:`, error);
      // Fall back to the backup method if direct query fails
    }
  }
  
  // Fallback to the old method if direct query is not possible or fails
  if (!arcgisFeatures || arcgisFeatures.length === 0) return false;
  
  console.log('Using fallback overlap detection method - presence check only');
  return arcgisFeatures.length > 0;
}

/**
 * Helper function to check if a feature is within any isochrone
 * Updated to use spatial queries instead of simple presence checks
 * @param {Object} feature - The GeoJSON feature to check for overlap
 * @param {Array} isochrones - The isochrone features (for backward compatibility)
 * @param {Object} options - Optional params like layerUrl and layerId for direct query
 * @returns {Boolean} - Whether the feature is within any isochrone
 */
async function checkIschroneOverlap(feature, isochrones, options = {}) {
  // Reuse the checkFeatureOverlap function with isochrone-specific defaults
  return await checkFeatureOverlap(feature, isochrones, {
    layerUrl: options.layerUrl || 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/SEPP_Housing_2021/MapServer',
    layerId: options.layerId || 6,
    ...options
  });
}

export async function captureUDPPrecinctMap(feature, developableArea = null, showDevelopableArea = false, useDevelopableAreaForBounds = false) {
  console.log('Capturing UDP Precinct Map...');
  
  try {
    // Create a canvas for the map
    const config = {
      width: 2048,
      height: 2048
    };
    
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d');
    
    // Fill the canvas with a white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, config.width, config.height);
    
    // Calculate the bounds of the feature with increased padding
    const { centerX, centerY, size } = calculateBounds(feature, 4.0, developableArea, useDevelopableAreaForBounds);
    
    // Calculate the bbox in Web Mercator (EPSG:3857) coordinates for querying
    const { bbox: mercatorBbox, centerMercX, centerMercY, sizeInMeters } = calculateMercatorParams(centerX, centerY, size);
    console.log('Mercator bbox for UDP query:', mercatorBbox);
    
    // Also calculate GDA94 bbox for services that require it
    const gda94Bbox = `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`;
    console.log('GDA94 bbox for UDP query:', gda94Bbox);
    
    // FIRST: Load aerial base layer with improved opacity
    try {
      console.log('Loading aerial base layer...');
      const aerialConfig = LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL];
      
      const aerialParams = new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: '1.3.0',
        REQUEST: 'GetMap',
        BBOX: mercatorBbox,
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

      const aerialUrl = `${aerialConfig.url}?${aerialParams.toString()}`;
      try {
        const baseMap = await loadImage(aerialUrl);
        drawImage(ctx, baseMap, canvas.width, canvas.height, 0.4);
        console.log('Aerial base layer loaded successfully');
      } catch (aerialError) {
        console.error('Failed to load aerial layer:', aerialError);
        // Continue with white background
      }
    } catch (error) {
      console.error('Failed to setup aerial layer:', error);
    }
    
    // Layer configuration - keep all existing layer configs
    const layerConfig = {
      todAreas: {
        url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/SEPP_Housing_2021/MapServer',
        layerId: 3,
        color: 'rgba(0, 77, 168, 0.5)',
        strokeColor: 'rgba(0, 77, 168, 0.8)',
        label: 'TOD Area'
      },
      todAcceleratedAreas: {
        url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/SEPP_Housing_2021/MapServer',
        layerId: 2,
        color: 'rgba(128, 0, 128, 0.5)',
        strokeColor: 'rgba(128, 0, 128, 0.8)',
        label: 'TOD Accelerated Rezoning Area'
      },
      townCentres: {
        url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/SEPP_Housing_2021/MapServer',
        layerId: 6,
        color: 'transparent',
        strokeColor: 'rgba(0, 0, 255, 0.8)',
        label: 'Town Centre'
      },
      railLines: {
        url: 'https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Transport_Theme/MapServer',
        layerId: 7,
        color: 'transparent',
        strokeColor: 'rgba(128, 0, 0, 0.8)',
        lineWidth: 3,
        label: 'Rail Line'
      },
      trainStations: {
        url: 'https://portal.spatial.nsw.gov.au/server/rest/services/NSW_FOI_Transport_Facilities/MapServer',
        layerId: 1,
        iconPath: 'public/images/railIcon.png',
        labelField: 'generalname',
        label: 'Train Station'
      }
    };
    
    // Arrays to store the features for overlap checking
    let todAreas = [];
    let todAcceleratedAreas = [];
    let isochrones = [];
    let railLines = [];
    let trainStations = [];
    
    // IMPORTANT: First fetch and render all rail lines - they're important background features
    try {
      console.log('Loading Rail Lines using export image...');
      
      const railLinesParams = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${config.width},${config.height}`,
        bbox: mercatorBbox,
        bboxSR: 3857,
        imageSR: 3857,
        layers: `show:${layerConfig.railLines.layerId}`,
        dpi: 96
      });
      
      const railLinesUrl = `${layerConfig.railLines.url}/export?${railLinesParams.toString()}`;
      console.log('Rail Lines export URL:', railLinesUrl);
      
      const railLinesProxyUrl = await proxyRequest(railLinesUrl, { timeout: 180000 });
      
      if (railLinesProxyUrl) {
        try {
          console.log('Loading rail lines from proxy URL...');
          const railLinesLayer = await loadImage(railLinesProxyUrl);
          console.log('Rail lines layer loaded successfully');
          // Ensure full opacity and visibility for rail lines
          drawImage(ctx, railLinesLayer, canvas.width, canvas.height, 1.0);
        } catch (imgError) {
          console.warn('Failed to load rail lines image:', imgError);
        }
      } else {
        console.warn('Failed to get proxy URL for rail lines layer');
      }
      
      // Also get the feature data for scoring
      const railLinesQueryUrl = `${layerConfig.railLines.url}/${layerConfig.railLines.layerId}/query`;
      const railLinesQueryParams = new URLSearchParams({
        f: 'json',
        where: '1=1',  // Return all features
        outFields: '*',
        returnGeometry: 'true',
        outSR: '3857',  // Web Mercator
        spatialRel: 'esriSpatialRelIntersects',
        geometry: mercatorBbox,
        geometryType: 'esriGeometryEnvelope',
        geometryPrecision: 3
      });
      
      // Construct the URL correctly
      const railLinesQueryFullUrl = `${railLinesQueryUrl}?${railLinesQueryParams.toString()}`;
      
      const railLinesQueryProxyUrl = await proxyRequest(railLinesQueryFullUrl, { timeout: 180000 });
      
      if (railLinesQueryProxyUrl) {
        try {
          const response = await fetch(railLinesQueryProxyUrl);
          const text = await response.text();
          try {
            if (!text.trim().startsWith('<!DOCTYPE') && !text.trim().startsWith('<html')) {
              const railLinesData = JSON.parse(text);
              console.log('Rail Lines features loaded successfully:', railLinesData);
              
              if (railLinesData.features && railLinesData.features.length > 0) {
                railLines = railLinesData.features;
              }
            }
          } catch (jsonError) {
            console.warn('Failed to parse Rail Lines JSON:', jsonError);
          }
        } catch (dataError) {
          console.warn('Failed to process Rail Lines data:', dataError);
        }
      }
    } catch (error) {
      console.warn('Failed to load Rail Lines:', error);
    }
    
    // Get TOD Areas using export image
    try {
      console.log('Loading TOD Areas using export image...');
      
      const todExportParams = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${config.width},${config.height}`,
        bbox: gda94Bbox, // Using GDA94 for these services
        bboxSR: 4283,    // GDA94
        imageSR: 3857,   
        layers: `show:${layerConfig.todAreas.layerId}`,
        dpi: 300
      });
      
      const todExportUrl = `${layerConfig.todAreas.url}/export?${todExportParams.toString()}`;
      console.log('TOD Areas export URL:', todExportUrl);
      
      const todExportProxyUrl = await proxyRequest(todExportUrl, { timeout: 180000 });
      
      if (todExportProxyUrl) {
        try {
          console.log('Loading TOD areas from proxy URL...');
          const todLayer = await loadImage(todExportProxyUrl);
          console.log('TOD areas layer loaded successfully');
          drawImage(ctx, todLayer, canvas.width, canvas.height, 0.8);
        } catch (imgError) {
          console.warn('Failed to load TOD areas image:', imgError);
        }
      } else {
        console.warn('Failed to get proxy URL for TOD areas layer');
      }
      
      // Also get the feature data for scoring
      const todQueryUrl = `${layerConfig.todAreas.url}/${layerConfig.todAreas.layerId}/query`;
      const todParams = new URLSearchParams({
        f: 'json',
        where: '1=1',  // Return all features
        outFields: '*',
        returnGeometry: 'true',
        outSR: '4283',  // GDA94
        spatialRel: 'esriSpatialRelIntersects',
        geometry: gda94Bbox,
        geometryType: 'esriGeometryEnvelope'
      });
      
      const todQueryFullUrl = `${todQueryUrl}?${todParams.toString()}`;
      
      const todQueryProxyUrl = await proxyRequest(todQueryFullUrl, { timeout: 180000 });
      
      if (todQueryProxyUrl) {
        try {
          const response = await fetch(todQueryProxyUrl);
          const text = await response.text();
          try {
            if (!text.trim().startsWith('<!DOCTYPE') && !text.trim().startsWith('<html')) {
              const todData = JSON.parse(text);
              console.log('TOD Areas features loaded successfully:', todData);
              
              if (todData.features && todData.features.length > 0) {
                todAreas = todData.features;
              }
            }
          } catch (jsonError) {
            console.warn('Failed to parse TOD Areas JSON:', jsonError);
          }
        } catch (dataError) {
          console.warn('Failed to process TOD Areas data:', dataError);
        }
      }
    } catch (queryError) {
      console.warn('Failed to query TOD Areas:', queryError);
    }
    
    // Get TOD Accelerated Areas using export image
    try {
      console.log('Loading TOD Accelerated Areas using export image...');
      
      const todAccExportParams = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${config.width},${config.height}`,
        bbox: gda94Bbox, // Using GDA94 for these services
        bboxSR: 4283,    // GDA94
        imageSR: 3857,   // GDA94
        layers: `show:${layerConfig.todAcceleratedAreas.layerId}`,
        dpi: 300
      });
      
      const todAccExportUrl = `${layerConfig.todAcceleratedAreas.url}/export?${todAccExportParams.toString()}`;
      console.log('TOD Accelerated Areas export URL:', todAccExportUrl);
      
      const todAccExportProxyUrl = await proxyRequest(todAccExportUrl, { timeout: 120000 });
      
      if (todAccExportProxyUrl) {
        try {
          console.log('Loading TOD accelerated areas from proxy URL...');
          const todAccLayer = await loadImage(todAccExportProxyUrl);
          console.log('TOD accelerated areas layer loaded successfully');
          drawImage(ctx, todAccLayer, canvas.width, canvas.height, 0.8);
        } catch (imgError) {
          console.warn('Failed to load TOD accelerated areas image:', imgError);
        }
      } else {
        console.warn('Failed to get proxy URL for TOD accelerated areas layer');
      }
      
      // Also get the feature data for scoring
      const todAccQueryUrl = `${layerConfig.todAcceleratedAreas.url}/${layerConfig.todAcceleratedAreas.layerId}/query`;
      const todAccParams = new URLSearchParams({
        f: 'json',
        where: '1=1',  // Return all features
        outFields: '*',
        returnGeometry: 'true',
        outSR: '4283',  // GDA94
        spatialRel: 'esriSpatialRelIntersects',
        geometry: gda94Bbox,
        geometryType: 'esriGeometryEnvelope'
      });
      
      const todAccQueryFullUrl = `${todAccQueryUrl}?${todAccParams.toString()}`;
      
      const todAccQueryProxyUrl = await proxyRequest(todAccQueryFullUrl, { timeout: 120000 });
      
      if (todAccQueryProxyUrl) {
        try {
          const response = await fetch(todAccQueryProxyUrl);
          const text = await response.text();
          try {
            if (!text.trim().startsWith('<!DOCTYPE') && !text.trim().startsWith('<html')) {
              const todAccData = JSON.parse(text);
              console.log('TOD Accelerated Areas features loaded successfully:', todAccData);
              
              if (todAccData.features && todAccData.features.length > 0) {
                todAcceleratedAreas = todAccData.features;
              }
            }
          } catch (jsonError) {
            console.warn('Failed to parse TOD Accelerated Areas JSON:', jsonError);
          }
        } catch (dataError) {
          console.warn('Failed to process TOD Accelerated Areas data:', dataError);
        }
      }
    } catch (error) {
      console.warn('Failed to load TOD Accelerated Areas:', error);
    }
    
    // Get Town Centres (isochrones) using export image
    try {
      console.log('Loading Town Centres using export image...');
      
      const townCentresExportParams = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${config.width},${config.height}`,
        bbox: gda94Bbox, // Using GDA94 for these services
        bboxSR: 4283,    // GDA94
        imageSR: 4283,   // GDA94
        layers: `show:${layerConfig.townCentres.layerId}`,
        dpi: 300
      });
      
      const townCentresExportUrl = `${layerConfig.townCentres.url}/export?${townCentresExportParams.toString()}`;
      console.log('Town Centres export URL:', townCentresExportUrl);
      
      const townCentresExportProxyUrl = await proxyRequest(townCentresExportUrl, { timeout: 120000 });
      
      if (townCentresExportProxyUrl) {
        try {
          console.log('Loading town centres from proxy URL...');
          const townCentresLayer = await loadImage(townCentresExportProxyUrl);
          console.log('Town centres layer loaded successfully');
          drawImage(ctx, townCentresLayer, canvas.width, canvas.height, 1.0);
        } catch (imgError) {
          console.warn('Failed to load town centres image:', imgError);
        }
      } else {
        console.warn('Failed to get proxy URL for town centres layer');
      }
      
      // Also get the feature data for scoring
      const townCentresQueryUrl = `${layerConfig.townCentres.url}/${layerConfig.townCentres.layerId}/query`;
      const townCentresParams = new URLSearchParams({
        f: 'json',
        where: '1=1',  // Return all features
        outFields: '*',
        returnGeometry: 'true',
        outSR: '4283',  // GDA94
        spatialRel: 'esriSpatialRelIntersects',
        geometry: gda94Bbox,
        geometryType: 'esriGeometryEnvelope'
      });
      
      const townCentresQueryFullUrl = `${townCentresQueryUrl}?${townCentresParams.toString()}`;
      
      const townCentresQueryProxyUrl = await proxyRequest(townCentresQueryFullUrl, { timeout: 120000 });
      
      if (townCentresQueryProxyUrl) {
        try {
          const response = await fetch(townCentresQueryProxyUrl);
          const text = await response.text();
          try {
            if (!text.trim().startsWith('<!DOCTYPE') && !text.trim().startsWith('<html')) {
              const townCentresData = JSON.parse(text);
              console.log('Town Centres features loaded successfully:', townCentresData);
              
              if (townCentresData.features && townCentresData.features.length > 0) {
                isochrones = townCentresData.features;
              }
            }
          } catch (jsonError) {
            console.warn('Failed to parse Town Centres JSON:', jsonError);
          }
        } catch (dataError) {
          console.warn('Failed to process Town Centres data:', dataError);
        }
      }
    } catch (error) {
      console.warn('Failed to load Town Centres:', error);
    }
    
    // Get train stations using export image
    try {
      console.log('Loading Train Stations using export image...');
      
      const trainStationsParams = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${config.width},${config.height}`,
        bbox: mercatorBbox,
        bboxSR: 3857,
        imageSR: 3857,
        layers: `show:${layerConfig.trainStations.layerId}`,
        dpi: 300
      });
      
      const trainStationsUrl = `${layerConfig.trainStations.url}/export?${trainStationsParams.toString()}`;
      console.log('Train Stations export URL:', trainStationsUrl);
      
      const trainStationsProxyUrl = await proxyRequest(trainStationsUrl, { timeout: 120000 });
      
      if (trainStationsProxyUrl) {
        try {
          console.log('Loading train stations from proxy URL...');
          const trainStationsLayer = await loadImage(trainStationsProxyUrl);
          console.log('Train stations layer loaded successfully');
          drawImage(ctx, trainStationsLayer, canvas.width, canvas.height, 1.0);
        } catch (imgError) {
          console.warn('Failed to load train stations image:', imgError);
        }
      } else {
        console.warn('Failed to get proxy URL for train stations layer');
      }
      
      // Also get the feature data for scoring
      const trainStationsQueryUrl = `${layerConfig.trainStations.url}/${layerConfig.trainStations.layerId}/query`;
      const trainStationsQueryParams = new URLSearchParams({
        f: 'json',
        where: '1=1',  // Return all features
        outFields: '*',
        returnGeometry: 'true',
        outSR: '3857',  // Web Mercator
        spatialRel: 'esriSpatialRelIntersects',
        geometry: mercatorBbox,
        geometryType: 'esriGeometryEnvelope'
      });
      
      const trainStationsQueryFullUrl = `${trainStationsQueryUrl}?${trainStationsQueryParams.toString()}`;
      
      const trainStationsQueryProxyUrl = await proxyRequest(trainStationsQueryFullUrl, { timeout: 120000 });
      
      if (trainStationsQueryProxyUrl) {
        try {
          const response = await fetch(trainStationsQueryProxyUrl);
          const text = await response.text();
          try {
            if (!text.trim().startsWith('<!DOCTYPE') && !text.trim().startsWith('<html')) {
              const trainStationsData = JSON.parse(text);
              console.log('Train Stations features loaded successfully:', trainStationsData);
              
              if (trainStationsData.features && trainStationsData.features.length > 0) {
                trainStations = trainStationsData.features;
              }
            }
          } catch (jsonError) {
            console.warn('Failed to parse Train Stations JSON:', jsonError);
          }
        } catch (dataError) {
          console.warn('Failed to process Train Stations data:', dataError);
        }
      }
    } catch (error) {
      console.warn('Failed to load Train Stations:', error);
    }
    
    // Draw developable area if provided and requested
    if (developableArea && showDevelopableArea) {
      drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width);
    }
    
    // Draw the feature boundary
    if (feature.type === 'FeatureCollection') {
      feature.features.forEach(f => {
        drawFeatureBoundaries(ctx, f, centerX, centerY, size, config.width, {
          strokeStyle: 'rgba(255, 0, 0, 0.8)',
          lineWidth: 3
        });
      });
    } else {
      drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width, {
        strokeStyle: 'rgba(255, 0, 0, 0.8)',
        lineWidth: 3
      });
    }
    
    // Check if features overlap with TOD areas, TOD Accelerated areas, or isochrones
    // This is for scoring purposes
    if (feature.type === 'FeatureCollection') {
      // Process each feature in the collection
      const lmrOverlapPromises = feature.features.map(async (f, index) => {
        try {
          if (!f.properties) f.properties = {};
          
          // Use LMR overlap check for comprehensive overlap information
          console.log(`Checking LMR overlaps for feature ${index}...`);
          const lmrOverlapResults = await checkLMROverlap(f);
          
          // Update the feature properties with the results
          f.properties.inTOD = lmrOverlapResults.overlaps['TOD Area'] || false;
          f.properties.inTODAccelerated = lmrOverlapResults.overlaps['TOD Accelerated Rezoning Area'] || false;
          f.properties.inLMRHousingArea = lmrOverlapResults.overlaps['Indicative LMR Housing Area'] || false;
          
          // Store the LMR overlap information
          f.properties.lmrOverlap = {
            hasOverlap: lmrOverlapResults.hasOverlap,
            primaryOverlap: lmrOverlapResults.primaryOverlap,
            overlaps: lmrOverlapResults.overlaps
          };
          
          // Store train station information - using direct query if we have this data
          // This is a lightweight approach as the full LMR check already does most of the heavy lifting
          if (trainStations.length > 0) {
            f.properties.nearbyTrainStations = trainStations
              .map(station => ({
                name: station.attributes[layerConfig.trainStations.labelField] || 'Unknown Station',
                x: station.geometry.x,
                y: station.geometry.y
              }));
          } else {
            // If we don't have train stations data from earlier loading, 
            // we could query it directly here if needed
            f.properties.nearbyTrainStations = [];
          }
            
          return f;
        } catch (error) {
          console.error(`Error processing feature ${index} overlaps:`, error);
          return f; // Return the original feature if there's an error
        }
      });
      
      // Wait for all overlap checks to complete
      await Promise.all(lmrOverlapPromises);
      
    } else {
      // Single feature case
      if (!feature.properties) feature.properties = {};
      
      // Use LMR overlap check for comprehensive overlap information
      console.log('Checking LMR overlaps for single feature...');
      const lmrOverlapResults = await checkLMROverlap(feature);
      
      // Update the feature properties with the results
      feature.properties.inTOD = lmrOverlapResults.overlaps['TOD Area'] || false;
      feature.properties.inTODAccelerated = lmrOverlapResults.overlaps['TOD Accelerated Rezoning Area'] || false;
      feature.properties.inLMRHousingArea = lmrOverlapResults.overlaps['Indicative LMR Housing Area'] || false;
      
      // Store the LMR overlap information
      feature.properties.lmrOverlap = {
        hasOverlap: lmrOverlapResults.hasOverlap,
        primaryOverlap: lmrOverlapResults.primaryOverlap,
        overlaps: lmrOverlapResults.overlaps
      };
      
      // Store train station information - using direct query if we have this data
      if (trainStations.length > 0) {
        feature.properties.nearbyTrainStations = trainStations
          .map(station => ({
            name: station.attributes[layerConfig.trainStations.labelField] || 'Unknown Station',
            x: station.geometry.x,
            y: station.geometry.y
          }));
      } else {
        // If we don't have train stations data from earlier loading, 
        // we could query it directly here if needed
        feature.properties.nearbyTrainStations = [];
      }
    }
    
    // Add a legend with better styling
    ctx.font = '24px Arial';
    ctx.fillStyle = 'black';
    
    // Create a semi-transparent background for the legend
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(40, 40, 400, 220); // Increased height for additional items
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, 400, 220);
    
    // Title for legend
    ctx.font = 'bold 26px Public Sans';
    ctx.fillStyle = '#002664';
    ctx.fillText('Proximity to Strategic Centre', 60, 75);
    
    // TOD Areas
    ctx.font = '20px Public Sans';
    ctx.fillStyle = layerConfig.todAreas.color;
    ctx.fillRect(60, 90, 30, 30);
    ctx.strokeStyle = layerConfig.todAreas.strokeColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 90, 30, 30);
    ctx.fillStyle = 'black';
    ctx.fillText(layerConfig.todAreas.label, 110, 110);
    
    // TOD Accelerated Areas
    ctx.fillStyle = layerConfig.todAcceleratedAreas.color;
    ctx.fillRect(60, 130, 30, 30);
    ctx.strokeStyle = layerConfig.todAcceleratedAreas.strokeColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 130, 30, 30);
    ctx.fillStyle = 'black';
    ctx.fillText(layerConfig.todAcceleratedAreas.label, 110, 150);
    
    // Town Centres
    ctx.strokeStyle = layerConfig.townCentres.strokeColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 170, 30, 30);
    ctx.fillStyle = 'blue';
    ctx.beginPath();
    ctx.arc(75, 185, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.fillText(layerConfig.townCentres.label, 110, 190);
    
    // Rail Lines
    ctx.beginPath();
    ctx.moveTo(60, 225);
    ctx.lineTo(90, 225);
    ctx.strokeStyle = layerConfig.railLines.strokeColor;
    ctx.lineWidth = layerConfig.railLines.lineWidth || 3;
    ctx.stroke();
    ctx.fillStyle = 'black';
    ctx.fillText(layerConfig.railLines.label, 110, 230);
    
    // Collect all the UDP data for scoring
    const udpData = {
      todAreas,
      todAcceleratedAreas,
      isochrones,
      railLines,
      trainStations,
      lmrOverlap: feature.properties?.lmrOverlap || null,
      nearbyTrainStations: feature.properties?.nearbyTrainStations || []
    };
    
    // Return both the image and the data for property scoring
    try {
      const dataURL = canvas.toDataURL('image/png');
      return {
        dataURL: dataURL,
        udpFeatures: udpData
      };
    } catch (canvasError) {
      console.error('Error converting canvas to data URL:', canvasError);
      return null;
    }
  } catch (error) {
    console.error('Error capturing UDP Precinct Map:', error);
    return null;
  }
}

export async function captureTECMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false, showLabels = false, showDevelopableArealabels = false) {
  if (!feature) {
    console.log('No feature provided for TEC map capture');
    return null;
  }
  console.log('Starting TEC map capture...', { feature, developableArea });

  try {
    const config = LAYER_CONFIGS[SCREENSHOT_TYPES.TEC];
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
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
    let tecFeatureCollection = null;

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
          tecFeatureCollection = tecResponse;
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
          tecFeatureCollection = { type: 'FeatureCollection', features: [] };
          feature.properties.site_suitability__tecFeatures = tecFeatureCollection;
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
    drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width || config.size, { showLabels: false });
    console.log('Drew site boundary');

    // Draw developable area if provided
    if (developableArea?.features?.length > 0 && showDevelopableArea) {
      console.log('Drawing developable area boundary');
      // Draw each developable area feature
      drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width || config.size, showDevelopableArealabels);
      console.log('Drew developable area boundaries');
    }

    const screenshot = canvas.toDataURL('image/png', 1.0);
    
    // Return both the screenshot and the TEC features
    return {
      dataURL: screenshot,
      tecFeatures: tecFeatureCollection
    };
  } catch (error) {
    console.error('Failed to capture TEC map:', error);
    return null;
  }
}

export async function captureBiodiversityMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false, showLabels = false, showDevelopableArealabels = false) {
  if (!feature) return null;
  console.log('Starting biodiversity map capture...', { feature, developableArea });

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.3
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
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

    let biodiversityFeatureCollection = null;
    
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
        biodiversityFeatureCollection = bioResponse;
        feature.properties.site_suitability__biodiversityFeatures = bioResponse;
        console.log('Stored biodiversity features:', bioResponse.features.length);
      } else {
        if (!feature.properties) {
          feature.properties = {};
        }
        biodiversityFeatureCollection = { type: 'FeatureCollection', features: [] };
        feature.properties.site_suitability__biodiversityFeatures = biodiversityFeatureCollection;
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
    drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width, { showLabels: false });
    console.log('Added site boundary');

    // Draw developable area with more prominent styling
    if (developableArea?.features?.length > 0 && showDevelopableArea) {
      // Draw each developable area feature
      drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width, showDevelopableArealabels);
      console.log('Added developable area boundaries');
    }

    const screenshot = canvas.toDataURL('image/png', 1.0);
    
    // Return both the screenshot and the biodiversity features
    return {
      dataURL: screenshot,
      biodiversityFeatures: biodiversityFeatureCollection
    };
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



export async function captureHistoricalImagery(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false, showLabels = false, showDevelopableArealabels = false) {
  if (!feature) return null;
  console.log('Starting historical imagery capture...');

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.4
    };

    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
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
        drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width, { showLabels });

        if (developableArea?.features?.length > 0 && showDevelopableArea) {
          drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width, showDevelopableArealabels);
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

// Helper function to draw developable area boundaries with labels
function drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, canvasWidth, showLabels = true) {
  if (!developableArea?.features?.length) return;
  
  const hasMultipleAreas = developableArea.features.length > 1;
  
  // Draw all developable area features
  developableArea.features.forEach((feature, index) => {
    if (feature.geometry?.coordinates?.[0]) {
      // Draw boundary for all features
      drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, canvasWidth, {
        strokeStyle: '#00FFFF',
        lineWidth: 12,
        dashArray: [20, 10]
      });
      
      // Add label on centroid ONLY if there are multiple areas AND showLabels is true
      if (hasMultipleAreas && showLabels) {
        const label = String.fromCharCode(65 + index); // A=65, B=66, etc.
        try {
          const polygon = turf.polygon([feature.geometry.coordinates[0]]);
          const centroid = turf.centroid(polygon);
          
          if (centroid && centroid.geometry && centroid.geometry.coordinates) {
            const [lon, lat] = centroid.geometry.coordinates;
            const [mercX, mercY] = convertToWebMercator(lon, lat);
            const { centerMercX, centerMercY, sizeInMeters } = calculateMercatorParams(centerX, centerY, size);
            
            // Transform to canvas coordinates
            const x = ((mercX - (centerMercX - sizeInMeters/2)) / sizeInMeters) * canvasWidth;
            const y = ((centerMercY + sizeInMeters/2 - mercY) / sizeInMeters) * canvasWidth;
            
            // Draw white circle with teal stroke
            ctx.beginPath();
            ctx.arc(x, y, 40, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            ctx.strokeStyle = '#00FFFF';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Draw label text
            ctx.fillStyle = '#00FFFF';
            ctx.font = 'bold 48px "Public Sans"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, x, y);
          }
        } catch (error) {
          console.warn('Error adding developable area centroid label:', error);
        }
      }
    }
  });
}

export async function capturePTALMap(feature, developableArea = null, showDevelopableArea = false, useDevelopableAreaForBounds = false) {
  if (!feature) {
    console.log('No feature provided, returning null');
    return null;
  }
  console.log('Starting PTAL map capture with feature:', {
    featureType: feature.type,
    hasMultipleFeatures: feature.type === 'FeatureCollection' && feature.features?.length > 1,
    developableArea: developableArea ? 'provided' : 'not provided'
  });

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 1 
    };
    console.log('Using config:', config);
    
    // Always use feature geometry for PTAL map, ignoring useDevelopableAreaForBounds parameter
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, false);
    console.log('Calculated bounds:', { centerX, centerY, size });
    
    let ptalFeatures = [];
    
    // Create base canvas
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d', { alpha: true });
    console.log('Created canvas with dimensions:', { width: canvas.width, height: canvas.height });
    
    // Start with a white background to prevent transparency issues
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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

    // Load aerial base layer first, then proceed with PTAL data
    try {
      console.log('Loading aerial base layer...');
      const baseMap = await loadImage(`${LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL].url}?${aerialParams.toString()}`);
      
      // Draw base map
      drawImage(ctx, baseMap, canvas.width, canvas.height, 0.5);
      console.log('Drew base map');
    } catch (aerialError) {
      console.error('Failed to load aerial base layer:', aerialError);
      // Continue with white background
    }

    // Prepare PTAL layer parameters
    const ptalConfig = {
      layerId: 28919
    };
    console.log('Using PTAL config:', ptalConfig);

    try {
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
        // Continue without PTAL layer - just draw the features
      } else {
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
        } else {
          const decodedUrl = decodeURIComponent(vectorTileUrl.split('/featureServer/{z}/{x}/{y}/')?.[1] || '');
          console.log('Decoded URL:', decodedUrl);
          
          // Extract the base URL from the decoded URL - it's everything before the query parameters
          const urlMatch = decodedUrl.match(/(https:\/\/[^?]+)/);
          if (!urlMatch) {
            console.error('Could not extract base URL from decoded URL');
          } else {
            const baseUrl = urlMatch[1];
            console.log('Using exact URL from vector tiles:', baseUrl);
            
            const extractedToken = decodedUrl.split('token=')?.[1]?.split('&')?.[0];
            console.log('Extracted token:', extractedToken ? `${extractedToken.substring(0, 10)}...` : 'null');

            if (!extractedToken) {
              console.error('Could not extract token from vector tile URL');
            } else {
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

              // Log the full URL we're about to request
              console.log('Preparing to request:', {
                ptalUrl: `${baseUrl}/query?${ptalParams.toString().replace(extractedToken, '***redacted***')}`
              });

              try {
                // Load PTAL data
                const ptalResponse = await proxyRequest(`${baseUrl}/query?${ptalParams.toString()}`);
                
                // Process PTAL data if available
                if (ptalResponse?.features?.length > 0) {
                  console.log(`Processing ${ptalResponse.features.length} PTAL features...`);
                  ptalFeatures = ptalResponse.features;

                  // Find PTAL values for each feature if it's a collection
                  if (feature.type === 'FeatureCollection' && feature.features?.length > 0) {
                    console.log('Finding PTAL values for each feature in collection...');
                    const featureBestPTALs = [];
                    
                    // Process each feature
                    for (let featureIndex = 0; featureIndex < feature.features.length; featureIndex++) {
                      const f = feature.features[featureIndex];
                      try {
                        // Skip features without valid geometry
                        if (!f.geometry?.coordinates) {
                          console.warn(`Feature ${featureIndex} has no valid coordinates`);
                          continue; 
                        }
                        
                        const featurePolygon = turf.polygon(f.geometry.coordinates);
                        const intersectingPtalFeatures = [];
                        
                        // Check each PTAL feature for intersection
                        for (const ptalFeature of ptalFeatures) {
                          try {
                            if (!ptalFeature.geometry?.coordinates) continue;
                            const ptalPolygon = turf.polygon(ptalFeature.geometry.coordinates);
                            if (turf.booleanIntersects(featurePolygon, ptalPolygon)) {
                              intersectingPtalFeatures.push(ptalFeature);
                            }
                          } catch (intersectionError) {
                            console.warn('Error checking PTAL intersection:', intersectionError);
                          }
                        }
                        
                        const ptalValues = intersectingPtalFeatures.map(f => 
                          f.properties.legend || f.properties.ptal_desc || f.properties.ptal
                        );
                        
                        console.log(`Feature ${featureIndex+1} has PTAL values:`, ptalValues);
                        featureBestPTALs.push({
                          featureIndex,
                          ptalValues
                        });
                        
                        // Store PTAL values in the feature for scoring
                        if (!f.properties) f.properties = {};
                        f.properties.ptalValues = ptalValues;
                      } catch (featureError) {
                        console.warn(`Error processing feature ${featureIndex}:`, featureError);
                      }
                    }
                    
                    // Store overall collection of PTAL values in the feature's properties
                    if (!feature.properties) feature.properties = {};
                    feature.properties.featurePTALs = featureBestPTALs;
                    feature.properties.allPtalValues = ptalFeatures.map(f => 
                      f.properties.legend || f.properties.ptal_desc || f.properties.ptal
                    );
                  } else {
                    // Original approach for single feature
                    try {
                      // Store all PTAL values in the feature object for scoring (not just intersecting ones)
                      const ptalValues = ptalFeatures.map(f => 
                        f.properties.legend || f.properties.ptal_desc || f.properties.ptal
                      );
                      if (!feature.properties) {
                        feature.properties = {};
                      }
                      feature.properties.ptalValues = ptalValues;
                      console.log('Stored PTAL values:', ptalValues);
                    } catch (singleFeatureError) {
                      console.warn('Error storing PTAL values for single feature:', singleFeatureError);
                    }
                  }

                  // Draw ALL PTAL features
                  console.log('Drawing all PTAL features...');
                  ptalFeatures.forEach((ptalFeature, index) => {
                    try {
                      const ptalValue = ptalFeature.properties.legend || ptalFeature.properties.ptal_desc || ptalFeature.properties.ptal;
                      const color = ptalColors[ptalValue] || '#808080';
                      
                      if (ptalFeature.geometry?.coordinates?.[0]) {
                        drawBoundary(ctx, ptalFeature.geometry.coordinates[0], centerX, centerY, size, config.width, {
                          fill: true,
                          strokeStyle: '#000000',
                          fillStyle: color,
                          lineWidth: 2
                        });
                      }
                    } catch (drawError) {
                      console.warn(`Error drawing PTAL feature ${index}:`, drawError);
                    }
                  });
                } else {
                  console.log('No PTAL features found in response');
                }
              } catch (ptalRequestError) {
                console.error('Failed to fetch PTAL data:', ptalRequestError);
              }
            }
          }
        }
      }
    } catch (giraffError) {
      console.error('Failed to get PTAL data from Giraffe:', giraffError);
    }

    // Draw all features
    if (feature.type === 'FeatureCollection' && feature.features?.length > 0) {
      console.log('Drawing multiple features:', feature.features.length);
      feature.features.forEach((f, index) => {
        try {
          drawFeatureBoundaries(ctx, f, centerX, centerY, size, config.width, {
            showLabels: true, // Always show labels for multiple features
            strokeStyle: '#FF0000',
            lineWidth: 6
          });
        } catch (drawError) {
          console.warn(`Error drawing feature ${index}:`, drawError);
        }
      });
    } else {
      // Single feature case
      console.log('Drawing single feature');
      try {
        drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width);
      } catch (drawError) {
        console.warn('Error drawing feature:', drawError);
      }
    }

    // Add PTAL legend
    try {
      // Draw legend background
      const legendHeight = 350;
      const legendWidth = 300;
      const padding = 20;
      const legendX = canvas.width - legendWidth - padding;
      const legendY = canvas.height - legendHeight - padding;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.strokeStyle = '#002664';
      ctx.lineWidth = 2;
      ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
      ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

      // Legend title
      ctx.font = 'bold 24px Public Sans';
      ctx.fillStyle = '#002664';
      ctx.textBaseline = 'top';
      ctx.fillText('PTAL Ratings', legendX + padding, legendY + padding);

      // PTAL legend items
      const ptalLegendItems = [
        { value: '1 - Low', color: '#ff000080' },
        { value: '2 - Low-Medium', color: '#ff7f0e80' },
        { value: '3 - Medium', color: '#f2ff0080' },
        { value: '4 - Medium-High', color: '#0e9aff80' },
        { value: '5 - High', color: '#a8ff7f80' },
        { value: '6 - Very High', color: '#1d960480' }
      ];

      ctx.textBaseline = 'middle';
      ctx.font = '18px Public Sans';

      ptalLegendItems.forEach((item, index) => {
        const y = legendY + padding + 60 + (index * 40);
        
        // Draw color box
        ctx.fillStyle = item.color;
        ctx.fillRect(legendX + padding, y - 10, 30, 20);
        ctx.strokeStyle = '#363636';
        ctx.lineWidth = 1;
        ctx.strokeRect(legendX + padding, y - 10, 30, 20);
        
        // Draw label
        ctx.fillStyle = '#363636';
        ctx.fillText(item.value, legendX + padding + 40, y);
      });
    } catch (legendError) {
      console.warn('Error drawing PTAL legend:', legendError);
    }

    console.log('PTAL map capture completed successfully');
    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Failed to capture PTAL map:', error);
    console.error('Error stack:', error.stack);
    return null;
  }
}

export async function captureContaminationMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false, showLabels = false, showDevelopableArealabels = false) {
  if (!feature) return null;
  console.log('Starting contamination map capture...');

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.3
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
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
    if (feature.type === 'FeatureCollection') {
      console.log('Drawing multiple features:', feature.features.length);
      feature.features.forEach((f, index) => {
        drawFeatureBoundaries(ctx, f, centerX, centerY, size, config.width, {
          showLabels: false,
          strokeStyle: '#FF0000',
          lineWidth: 6
        });
      });
    } else {
      drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width, { showLabels: false });
    }

    if (developableArea?.features?.length > 0 && showDevelopableArea) {
      drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width, showDevelopableArealabels);
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

// Helper function to calculate centroid of a polygon
function calculatePolygonCentroid(points) {
  if (!points || points.length === 0) return [0, 0];
  
  let sumX = 0;
  let sumY = 0;
  
  points.forEach(point => {
    sumX += point[0];
    sumY += point[1];
  });
  
  return [sumX / points.length, sumY / points.length];
}

// Helper function to generate circle points for simplified isochrone
function generateCirclePoints(centerX, centerY, radius, numPoints = 60) {
  const points = [];
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    points.push([x, y]);
  }
  
  // Close the circle
  points.push([...points[0]]);
  
  return points;
}