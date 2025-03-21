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
const LAYER_CONFIG_ROADS = {
  url: 'https://portal.data.nsw.gov.au/arcgis/rest/services/RoadSegment/MapServer',
  layerId: 0,
  size: 2048,
  width: 2048,
  height: 2048,
  padding: 0.5,
  dpi: 300,
  format: 'png32',
  transparent: true
};

const LAYER_CONFIG_ROAD_LABELS = {
  url: 'https://maps.six.nsw.gov.au/arcgis/rest/services/sixmaps/LPI_RasterLabels_1/MapServer',
  layerId: 0,
  size: 2048,
  width: 2048,
  height: 2048,
  padding: 0.2,
  dpi: 300,
  format: 'png32',
  transparent: true
};

const LAYER_CONFIG_AERIAL = {
  url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service',
  layers: 'Australia_latest',
  opacity: 0.3,
  width: 2048,
  height: 2048,
  padding: 0.2,
  dpi: 300
};

/**
 * Fetches road features from the NSW road segment service
 * @param {number} centerX - Center X coordinate
 * @param {number} centerY - Center Y coordinate
 * @param {number} size - Size of the bounding box
 * @returns {Promise<Array>} Array of road features
 */
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

/**
 * Captures a road map with the specified feature
 * @param {Object} feature - GeoJSON feature to display
 * @param {Object} developableArea - Optional developable area to display
 * @param {boolean} showDevelopableArea - Whether to show developable areas
 * @param {boolean} useDevelopableAreaForBounds - Whether to use developable area for bounds calculation
 * @param {boolean} showLabels - Whether to show feature labels
 * @param {boolean} showDevelopableAreaLabels - Whether to show developable area labels
 * @returns {Promise<Object>} Object containing dataURL and roadFeatures
 */
export async function captureRoadsMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false, showLabels = true, showDevelopableAreaLabels = false) {
  if (!feature) return null;
  console.log('Starting roads capture...', {
    featureType: feature.type,
    hasMultipleFeatures: feature.type === 'FeatureCollection' && feature.features?.length > 1,
    developableAreaFeatures: developableArea?.features?.length,
    useDevelopableAreaForBounds,
    showLabels,
    showDevelopableAreaLabels
  });

  try {
    const config = {
      width: LAYER_CONFIG_ROADS.width,
      height: LAYER_CONFIG_ROADS.height,
      padding: LAYER_CONFIG_ROADS.padding
    };
    
    // Validate feature geometry early
    if (feature.type === 'Feature' && (!feature.geometry || !feature.geometry.coordinates)) {
      console.warn('Feature has invalid or missing geometry');
      return null;
    }
    
    // For feature collections, validate each feature
    if (feature.type === 'FeatureCollection' && Array.isArray(feature.features)) {
      const validFeatures = feature.features.filter(f => 
        f && f.geometry && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates.length > 0
      );
      
      if (validFeatures.length === 0) {
        console.warn('FeatureCollection has no valid features with coordinates');
        return null;
      }
      
      // Replace with only valid features
      feature.features = validFeatures;
    }
    
    // Validate developable area if provided
    if (developableArea && developableArea.type === 'FeatureCollection') {
      if (!Array.isArray(developableArea.features) || developableArea.features.length === 0) {
        console.warn('DevelopableArea has no features, ignoring it');
        developableArea = null;
      } else {
        // Filter out invalid features
        const validDevelopableFeatures = developableArea.features.filter(f => 
          f && f.geometry && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates.length > 0
        );
        
        if (validDevelopableFeatures.length === 0) {
          console.warn('DevelopableArea has no valid features with coordinates, ignoring it');
          developableArea = null;
        } else {
          // Replace with only valid features
          developableArea.features = validDevelopableFeatures;
        }
      }
    }
    
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
      const roadsConfig = LAYER_CONFIG_ROADS;

      // Convert coordinates to Web Mercator (3857) for better compatibility
      const { bbox: mercatorBbox } = calculateMercatorParams(centerX, centerY, size);
      
      const params = new URLSearchParams({
        f: 'image',
        format: roadsConfig.format,
        transparent: roadsConfig.transparent.toString(),
        size: `${roadsConfig.size},${roadsConfig.size}`,
        bbox: mercatorBbox,
        bboxSR: 3857,
        imageSR: 3857,
        layers: `show:${roadsConfig.layerId}`,
        dpi: roadsConfig.dpi
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
      const labelsConfig = LAYER_CONFIG_ROAD_LABELS;

      // Use Web Mercator coordinates for labels layer
      const { bbox: labelsBbox } = calculateMercatorParams(centerX, centerY, size);
      console.log('Labels bbox:', labelsBbox);
      
      const params = new URLSearchParams({
        f: 'image',
        format: labelsConfig.format,
        transparent: labelsConfig.transparent.toString(),
        size: `${labelsConfig.size},${labelsConfig.size}`,
        bbox: labelsBbox,
        bboxSR: 3857,
        imageSR: 3857,
        layers: `show:${labelsConfig.layerId}`,
        dpi: labelsConfig.dpi
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

    // IMPORTANT: Draw boundaries AFTER all other layers to ensure visibility

    // Draw all developable areas AFTER all layers if they exist
    if (developableArea?.features?.length > 0 && showDevelopableArea) {
      console.log('Drawing developable area boundaries...');
      // Draw all developable areas with proper labels parameter
      drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width, showDevelopableAreaLabels, {
        strokeStyle: 'rgba(0, 150, 136, 0.9)', // Custom teal color
        lineWidth: 3,
        lineDash: [10, 5] // Dashed line pattern
      });
    }

    // Draw feature boundaries with increased visibility - last so they appear on top
    console.log('Drawing feature boundaries...');
    if (feature.type === 'FeatureCollection' && feature.features?.length > 0) {
      feature.features.forEach(f => {
        drawFeatureBoundaries(ctx, f, centerX, centerY, size, config.width, {
          showLabels: showLabels,
          strokeStyle: 'rgba(255, 0, 0, 0.9)',  // More opaque red boundary 
          lineWidth: 4  // Thicker line
        });
      });
    } else {
      // Single feature case
      drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width, {
        showLabels: showLabels,
        strokeStyle: 'rgba(255, 0, 0, 0.9)',  // More opaque red boundary
        lineWidth: 4  // Thicker line
      });
    }

    // Draw road classification legend
    try {
      // Background
      const legendWidth = 300; 
      const legendHeight = 350;
      const padding = 20;
      // Position at bottom right
      const legendX = canvas.width - legendWidth - padding;
      const legendY = canvas.height - legendHeight - padding;
      
      // Legend background with border
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.strokeStyle = '#002664';
      ctx.lineWidth = 2;
      ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
      ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

      // Legend title
      ctx.font = 'bold 24px Public Sans';
      ctx.fillStyle = '#002664';
      ctx.textBaseline = 'top';
      ctx.fillText('Road Classification', legendX + padding, legendY + padding);

      // Road legend items
      const roadLegendItems = [
        { value: 'Access Way', color: '#909090' },
        { value: 'Arterial Road', color: '#9C9C9C' },
        { value: 'Bus Way', color: '#9C9C9C', dash: [10, 10] },
        { value: 'Distributor Road', color: '#B2B2B2' },
        { value: 'Local Road', color: '#CCCCCC' }, 
        { value: 'Motorway', color: '#4E4E4E', width: 6 },
        { value: 'Path', color: '#CCCCCC', dash: [5, 5] },
        { value: 'Primary Road', color: '#4E4E4E' },
        { value: 'Subdistributor Road', color: '#B2B2B2' },
        { value: 'Track-Vehicular', color: '#CCCCCC', dash: [2, 5] },
        { value: 'Urban Service Lane', color: '#CCCCCC', dash: [2, 5] }
      ];

      // Legend settings
      const lineLength = 40;
      const lineSpacing = 25; 
      const textPadding = 20;

      ctx.textBaseline = 'middle';
      ctx.font = '16px Public Sans';
      ctx.textAlign = 'left';

      roadLegendItems.forEach((item, index) => {
        const y = legendY + padding + 60 + (index * lineSpacing);
        
        // Set line style
        ctx.strokeStyle = item.color || '#000000';
        ctx.lineWidth = item.width || 3;
        
        // Draw line
        ctx.beginPath();
        ctx.moveTo(legendX + padding, y);
        ctx.lineTo(legendX + padding + lineLength, y);
        
        // Apply dash if specified
        if (item.dash) {
          ctx.setLineDash(item.dash);
        } else {
          ctx.setLineDash([]);
        }
        
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash
        
        // Draw label
        ctx.fillStyle = '#363636';
        ctx.fillText(item.value, legendX + padding + lineLength + textPadding, y);
      });
    } catch (legendError) {
      console.warn('Error drawing road legend:', legendError);
    }

    // Create screenshot
    const screenshot = canvas.toDataURL('image/png', 1.0);
    
    // Store the screenshot in all feature properties
    if (feature.type === 'FeatureCollection' && feature.features?.length > 0) {
      feature.features.forEach(f => {
        if (!f.properties) {
          f.properties = {};
        }
        f.properties.roadMapScreenshot = screenshot;
      });
    } else {
      // Single feature case
      if (!feature.properties) {
        feature.properties = {};
      }
      feature.properties.roadMapScreenshot = screenshot;
    }

    // Return both the screenshot and the road features
    return {
      dataURL: screenshot,
      roadFeatures: roadFeatures // Return the roadFeatures variable directly
    };
  } catch (error) {
    console.error('Failed to capture roads map:', error);
    return null;
  }
}