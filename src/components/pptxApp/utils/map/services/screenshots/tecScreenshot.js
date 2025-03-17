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
const LAYER_CONFIG_TEC = {
  url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Environmental/MapServer',
  layerId: 20,
  size: 2048,
  width: 2048,
  height: 2048,
  padding: 0.3,
  dpi: 96,
  format: 'png32',
  transparent: true,
  showBoundary: true,
  spatialReference: 4283
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

export async function captureTECMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false, showLabels = false, showDevelopableArealabels = false) {
  if (!feature) {
    console.log('No feature provided for TEC map capture');
    return null;
  }
  console.log('Starting TEC map capture...', { feature, developableArea });

  try {
    const config = LAYER_CONFIG_TEC;
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
    console.log('Calculated bounds:', { centerX, centerY, size });
    
    // Calculate bbox early for both Mercator and GDA94
    const { bbox: mercatorBbox } = calculateMercatorParams(centerX, centerY, size);
    const gda94Bbox = `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`;
    console.log('Calculated bboxes:', { mercatorBbox, gda94Bbox });
    
    // Create base canvas
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d', { alpha: true });
    
    try {
      // 1. Aerial imagery (base)
      console.log('Loading aerial base layer...');
      const aerialConfig = LAYER_CONFIG_AERIAL;
      
      const params = new URLSearchParams({
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
        DPI: aerialConfig.dpi,
        MAP_RESOLUTION: aerialConfig.dpi,
        FORMAT_OPTIONS: `dpi:${aerialConfig.dpi}`
      });

      const url = `${aerialConfig.url}?${params.toString()}`;
      const baseMap = await loadImage(url);
      drawImage(ctx, baseMap, canvas.width, canvas.height, aerialConfig.opacity);
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
        size: `${config.width},${config.height}`,
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
    drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width, { showLabels: false });
    console.log('Drew site boundary');

    // Draw developable area if provided
    if (developableArea?.features?.length > 0 && showDevelopableArea) {
      console.log('Drawing developable area boundary');
      // Draw each developable area feature
      drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width, false);
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