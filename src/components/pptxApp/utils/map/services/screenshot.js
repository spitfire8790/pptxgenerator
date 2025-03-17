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
  } else if (feature.geometry?.type === 'Polygon') {
    // For single Polygon features - handle different coordinate formats
    if (feature.geometry?.coordinates) {
      if (Array.isArray(feature.geometry.coordinates[0]) && 
          Array.isArray(feature.geometry.coordinates[0][0]) &&
          feature.geometry.coordinates[0][0].length === 2) {
        // Standard GeoJSON format: [[[x,y], [x,y], ...]]
        allCoordinates = [...feature.geometry.coordinates[0]];
      } else if (Array.isArray(feature.geometry.coordinates) && 
                 Array.isArray(feature.geometry.coordinates[0]) && 
                 feature.geometry.coordinates[0].length === 2) {
        // Direct coordinates format: [[x,y], [x,y], ...]
        allCoordinates = [...feature.geometry.coordinates];
      } else {
        console.warn('Invalid Polygon coordinates structure:', { 
          type: feature.geometry.type, 
          hasCoordinates: !!feature.geometry.coordinates,
          firstElem: feature.geometry.coordinates && feature.geometry.coordinates[0] 
        });
      }
    } else {
      console.warn('Polygon feature missing coordinates', feature);
    }
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
  
  let isVisible = false;
  
  if (feature.type === 'FeatureCollection' && feature.features) {
    // Draw each feature in the collection separately
    feature.features.forEach((featureItem, index) => {
      if (featureItem.geometry?.coordinates?.[0]) {
        // Draw boundary for all features
        const featureVisible = drawBoundary(ctx, featureItem.geometry.coordinates[0], centerX, centerY, size, canvasWidth, {
          strokeStyle: mergedOptions.strokeStyle,
          lineWidth: mergedOptions.lineWidth,
          fillStyle: mergedOptions.fillStyle
        });
        
        // If any feature is visible, set isVisible to true
        if (featureVisible) {
          isVisible = true;
        }
        
        // Add label on centroid ONLY if there are multiple features AND showLabels is true
        if (hasMultipleFeatures && mergedOptions.showLabels) {
          const label = String.fromCharCode(65 + index); // A=65, B=66, etc.
          try {
            const polygon = turf.polygon([featureItem.geometry.coordinates[0]]);
            // Use visual center instead of centroid for better label placement
            const visualCenter = calculateVisualCenter(featureItem.geometry.coordinates[0]);
            
            if (visualCenter && visualCenter.geometry && visualCenter.geometry.coordinates) {
              const [lon, lat] = visualCenter.geometry.coordinates;
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
            console.warn('Error adding visual center label:', error);
          }
        }
      }
    });
  } else if (feature.geometry?.coordinates?.[0]) {
    // Draw a single feature
    isVisible = drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, canvasWidth, {
      strokeStyle: mergedOptions.strokeStyle,
      lineWidth: mergedOptions.lineWidth,
      fillStyle: mergedOptions.fillStyle
    });
  }
  
  return isVisible;
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
          // Use visual center instead of centroid for better label placement
          const visualCenter = calculateVisualCenter(feature.geometry.coordinates[0]);
          
          if (visualCenter && visualCenter.geometry && visualCenter.geometry.coordinates) {
            const [lon, lat] = visualCenter.geometry.coordinates;
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
          console.warn('Error adding developable area visual center label:', error);
        }
      }
    }
  });
}

/**
 * Calculate the Pole of Inaccessibility (visual center) of a polygon
 * This finds the most distant internal point from the polygon boundary
 * @param {Array} coordinates - Array of polygon coordinates [lon, lat]
 * @returns {Object} Point with coordinates in [lon, lat] format
 */
function calculateVisualCenter(coordinates) {
  try {
    // First try to use turf.pointOnFeature which often gives better results than centroid
    const polygon = turf.polygon([coordinates]);
    
    // Use pointOnFeature which finds a point guaranteed to be inside the polygon
    // This is often more visually appealing than centroid for irregular shapes
    const point = turf.pointOnFeature(polygon);
    
    // Further improve the point by running a simple pole of inaccessibility algorithm
    // This tries to find a point that's as far from the boundary as possible
    const boundaryDistance = (pt) => {
      // Calculate minimum distance to any segment of the boundary
      let minDistance = Infinity;
      
      for (let i = 0; i < coordinates.length - 1; i++) {
        const start = coordinates[i];
        const end = coordinates[i + 1];
        const distance = turf.pointToLineDistance(
          turf.point(pt.geometry.coordinates),
          turf.lineString([start, end])
        );
        minDistance = Math.min(minDistance, distance);
      }
      
      return minDistance;
    };
    
    // Start from the point inside the polygon
    let bestPoint = point;
    let bestDistance = boundaryDistance(bestPoint);
    
    // Try some small adjustments to find better placement
    const delta = 0.0001; // Small coordinate adjustment
    const directions = [
      [delta, 0], [-delta, 0], [0, delta], [0, -delta],
      [delta, delta], [-delta, delta], [delta, -delta], [-delta, -delta]
    ];
    
    // Try each direction to see if we get a better point
    for (let i = 0; i < directions.length; i++) {
      const [dx, dy] = directions[i];
      const newCoords = [
        bestPoint.geometry.coordinates[0] + dx,
        bestPoint.geometry.coordinates[1] + dy
      ];
      
      // Make sure the new point is inside the polygon
      if (turf.booleanPointInPolygon(turf.point(newCoords), polygon)) {
        const newPoint = turf.point(newCoords);
        const distance = boundaryDistance(newPoint);
        
        if (distance > bestDistance) {
          bestPoint = newPoint;
          bestDistance = distance;
        }
      }
    }
    
    return bestPoint;
  } catch (error) {
    console.warn('Error calculating visual center, falling back to centroid:', error);
    const polygon = turf.polygon([coordinates]);
    return turf.centroid(polygon);
  }
}