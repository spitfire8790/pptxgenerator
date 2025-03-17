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
const LAYER_CONFIG_BIODIVERSITY = {
  url: 'https://www.lmbc.nsw.gov.au/arcgis/rest/services/BV/BiodiversityValues/MapServer',
  layerId: 0,
  size: 2048,
  width: 2048,
  height: 2048,
  padding: 0.3,
  dpi: 96,
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

export async function captureBiodiversityMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false, showLabels = false, showDevelopableArealabels = false) {
  if (!feature) return null;
  console.log('Starting biodiversity map capture...', { feature, developableArea });

  try {
    const config = LAYER_CONFIG_BIODIVERSITY;
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
    console.log('Calculated bounds:', { centerX, centerY, size });
    
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
        DPI: aerialConfig.dpi,
        MAP_RESOLUTION: aerialConfig.dpi,
        FORMAT_OPTIONS: `dpi:${aerialConfig.dpi}`
      });

      const url = `${aerialConfig.url}?${params.toString()}`;
      const baseMap = await loadImage(url);
      drawImage(ctx, baseMap, canvas.width, canvas.height, aerialConfig.opacity);
      console.log('Aerial base layer loaded successfully');
    } catch (error) {
      console.error('Failed to load aerial layer:', error);
    }

    let biodiversityFeatureCollection = null;
    
    try {
      // 2. Biodiversity Values layer
      console.log('Loading biodiversity layer...');

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

      const queryUrl = `${config.url}/${config.layerId}/query?${queryParams.toString()}`;
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
        format: config.format,
        transparent: config.transparent.toString(),
        size: `${config.width},${config.height}`,
        bbox: mercatorBbox,
        bboxSR: 3857,
        imageSR: 3857,
        layers: `show:${config.layerId}`,
        dpi: config.dpi
      });

      const url = `${config.url}/export?${params.toString()}`;
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
      drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width, false);
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