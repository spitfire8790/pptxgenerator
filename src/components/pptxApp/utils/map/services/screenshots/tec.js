// TEC Map Screenshot Module

import { createCanvas, drawImage, drawBoundary } from '../../utils/canvas';
import { loadImage } from '../../utils/image';
import { calculateMercatorParams } from '../../utils/coordinates';
import { LAYER_CONFIGS } from '../../config/layerConfigs';
import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';
import { proxyRequest } from '../../../services/proxyService';
import { calculateBounds } from '../screenshot';

/**
 * Captures a screenshot of the Threatened Ecological Communities (TEC) map
 * 
 * @param {Object} feature - The GeoJSON feature representing the site
 * @param {Object} developableArea - Optional GeoJSON representing the developable area
 * @param {boolean} showDevelopableArea - Whether to show the developable area on the map
 * @returns {Promise<string>} - A promise that resolves to a data URL of the screenshot
 */
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