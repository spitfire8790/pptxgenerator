import { 
  createCanvas,
  drawBoundary,
  drawImage
} from '../../utils/canvas';
import {
  calculateMercatorParams
} from '../../utils/coordinates';
import { calculateBounds } from './shared';
import { loadImage } from '../../utils/image';
import { proxyRequest } from '../../../services/proxyService';
import { LAYER_CONFIGS } from '../../config/layerConfigs';
import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';

/**
 * Captures a biodiversity map screenshot of a specified feature
 * 
 * @param {Object} feature - GeoJSON feature representing the property
 * @param {Object} developableArea - GeoJSON feature collection representing developable area (optional)
 * @param {boolean} showDevelopableArea - Whether to display the developable area on the map
 * @returns {Promise<string>} - Promise resolving to base64 encoded PNG image
 */
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