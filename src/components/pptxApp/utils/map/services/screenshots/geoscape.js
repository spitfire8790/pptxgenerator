import { LAYER_CONFIGS } from '../../config/layerConfigs';
import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';
import { getWMSImage } from '../wmsService';
import { createCanvas, drawImage, drawBoundary } from '../../utils/canvas';
import { calculateBounds } from '../screenshot';
import { proxyRequest } from '../../../services/proxyService';

// Geoscape configuration
const GEOSCAPE_CONFIG = {
  baseUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/BLDS_Mar24_Geoscape/FeatureServer/0',
  layerId: 20976
};

/**
 * Capture a geoscape map screenshot
 * @param {Object} feature - GeoJSON feature
 * @param {Object} developableArea - Optional developable area GeoJSON
 * @param {Boolean} showDevelopableArea - Whether to show the developable area
 * @param {String} boundsSource - Source for bounds calculation (default: 'feature')
 * @returns {Promise<Object>} Object containing the screenshot data URL and detected features
 */
export async function captureGeoscapeMap(feature, developableArea = null, showDevelopableArea = true, boundsSource = 'feature') {
  if (!feature) return null;
  
  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.3
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, boundsSource);
    let geoscapeFeatures = [];
    
    // Create base canvas
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d', { alpha: true });

    try {
      // 1. Aerial imagery (base)
      const aerialConfig = LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL];
      const baseMapImage = await getWMSImage(aerialConfig, centerX, centerY, size);
      drawImage(ctx, baseMapImage, canvas.width, canvas.height, 0.7);
    } catch (error) {
      console.warn('Failed to load aerial layer:', error);
    }

    try {
      // 2. Query Geoscape layer directly without relying on giraffeState
      // Convert the project bounds to a GeoJSON feature for querying
      const xmin = centerX - size / 2;
      const ymin = centerY - size / 2;
      const xmax = centerX + size / 2;
      const ymax = centerY + size / 2;

      const boundaryPolygon = {
        type: 'Polygon',
        coordinates: [[
          [xmin, ymin],
          [xmax, ymin],
          [xmax, ymax],
          [xmin, ymax],
          [xmin, ymin]
        ]]
      };

      // Create the query URL with parameters
      const params = new URLSearchParams({
        f: 'json',
        geometry: JSON.stringify(boundaryPolygon),
        geometryType: 'esriGeometryPolygon',
        inSR: 4326,
        outSR: 4326,
        spatialRel: 'esriSpatialRelIntersects',
        outFields: '*',
        returnGeometry: true
      });

      const queryUrl = `${GEOSCAPE_CONFIG.baseUrl}/query?${params.toString()}`;
      
      // Use proxy service to handle CORS issues
      const responseData = await proxyRequest(queryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      if (responseData && responseData.features && responseData.features.length > 0) {
        geoscapeFeatures = responseData.features;
        
        // Draw each geoscape feature on the canvas
        geoscapeFeatures.forEach(geoscapeFeature => {
          if (geoscapeFeature.geometry && geoscapeFeature.geometry.rings) {
            // Convert ESRI format to GeoJSON format if needed
            const coordinates = geoscapeFeature.geometry.rings[0];
            drawBoundary(ctx, coordinates, centerX, centerY, size, config.width, {
              fill: true,
              strokeStyle: 'rgba(255, 165, 0, 0.8)',
              fillStyle: 'rgba(255, 165, 0, 0.6)',
              lineWidth: 2
            });
          } else if (geoscapeFeature.geometry && geoscapeFeature.geometry.coordinates) {
            // Already in GeoJSON format
            drawBoundary(ctx, geoscapeFeature.geometry.coordinates[0], centerX, centerY, size, config.width, {
              fill: true,
              strokeStyle: 'rgba(255, 165, 0, 0.8)',
              fillStyle: 'rgba(255, 165, 0, 0.6)',
              lineWidth: 2
            });
          }
        });
      }
    } catch (error) {
      console.error('Failed to load geoscape layer:', error);
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