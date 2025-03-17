import { LAYER_CONFIGS } from '../../config/layerConfigs';
import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';
import { calculateMercatorParams } from '../../utils/coordinates';
import { getWMSImage } from '../wmsService';
import { getArcGISImage } from '../arcgisService';
import { createCanvas, drawImage, drawBoundary, drawPolyline } from '../../utils/canvas';
import { proxyRequest } from '../../../services/proxyService';
import { loadImage } from '../../utils/image';
import { giraffeState } from '@gi-nx/iframe-sdk';
import proj4 from 'proj4';
import { getPTALToken } from '../tokenService';
import * as turf from '@turf/turf';
import { calculateBounds } from '../../utils/boundsUtils';
import { drawFeatureBoundaries, drawDevelopableAreaBoundaries, drawRoundedTextBox } from '../../utils/drawingUtils';

// Helper function to handle Giraffe layers proxy requests with fallback
async function fetchFromGiraffeLayers(url) {
  try {
    // First try direct fetch (which may fail with CORS)
    console.log('Attempting direct fetch from Giraffe layers:', url);
    const response = await fetch(url);
    if (response.ok) {
      console.log('Direct fetch from Giraffe layers succeeded');
      return await response.json();
    }
    throw new Error('Direct fetch failed');
  } catch (error) {
    console.warn('Direct fetch from Giraffe layers failed, falling back to proxy:', error.message);
    // Fall back to proxy
    try {
      return await proxyRequest(url);
    } catch (proxyError) {
      console.error('Proxy fetch also failed:', proxyError);
      throw proxyError;
    }
  }
}

// Layer configurations
const LAYER_CONFIG_POWER = {
  baseUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/NSW_Electricity_Infrastructure/FeatureServer/0',
  layerId: 19976,
  width: 2048,
  height: 2048,
  padding: 0.2,
  dpi: 300,
  format: 'png32',
  transparent: true,
  showBoundary: true
};

const LAYER_CONFIG_AERIAL = {
  url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service',
  layers: 'Australia_latest',
  opacity: 1,
  width: 2048,
  height: 2048,
  padding: 0.2,
  dpi: 300,
  fallbackUrl: 'https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Imagery/MapServer',
  fallbackFormat: 'png32',
  fallbackTransparent: false,
  fallbackSpatialReference: 102100
};

// LUAL configuration
const LAYER_CONFIG_LUAL = {
  baseUrl: 'https://services-ap1.arcgis.com/ug6sGLFkytbXYo4f/arcgis/rest/services/LUAL_Network_LV_Public/FeatureServer/0',
  width: 2048,
  height: 2048,
  padding: 0.2,
  format: 'geojson'
};

// LookUpNLive configuration
const LAYER_CONFIG_LOOKUP = {
  baseUrl: 'https://services.arcgis.com/Gbs1D7TkFBVkx0Nz/ArcGIS/rest/services/LookUpNLive/FeatureServer/2',
  width: 2048,
  height: 2048,
  padding: 0.2,
  format: 'geojson'
};

export async function capturePowerMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false) {
  if (!feature) return null;
  console.log('Starting power infrastructure capture...');

  try {
    const config = LAYER_CONFIG_POWER;
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
    let powerFeatures = [];
    
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
        drawImage(ctx, baseMap, canvas.width, canvas.height, 0.4);
      } catch (loadError) {
        console.warn('Failed to load aerial layer directly, trying with proxy:', loadError);
        // Try with proxy if direct load fails
        const proxyUrl = await proxyRequest(url);
        const baseMap = await loadImage(proxyUrl);
        drawImage(ctx, baseMap, canvas.width, canvas.height, 0.4);
      }
    } catch (error) {
      console.error('Failed to load aerial layer:', error);
    }

    try {
      // 2. Power infrastructure layers from Giraffe
      console.log('Loading power infrastructure layers...');
      
      // Get the power layer data from Giraffe
      console.log('Fetching project layers from Giraffe...');
      const projectLayers = await giraffeState.get('projectLayers');
      const powerLayer = projectLayers?.find(layer => layer.layer === config.layerId);
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

          const url = `${config.baseUrl}/query?${params.toString()}`;
          console.log('Final power request URL (with sensitive info removed):', url.replace(extractedToken, 'REDACTED'));

          // Use fetchFromGiraffeLayers for better error handling
          const powerResponse = await fetchFromGiraffeLayers(url);
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
        outSR: 4283,  // Request coordinates in GDA94
        spatialRel: 'esriSpatialRelIntersects',
        outFields: '*',
        returnGeometry: true,
        f: 'geojson'
      });

      const lualUrl = `${LAYER_CONFIG_LUAL.baseUrl}/query?${lualParams.toString()}`;
      console.log('LUAL request URL:', lualUrl);
      // Use fetchFromGiraffeLayers for better error handling
      const lualResponse = await fetchFromGiraffeLayers(lualUrl);
      console.log('LUAL response:', lualResponse);

      if (lualResponse.features?.length > 0) {
        console.log(`Drawing ${lualResponse.features.length} LUAL power features...`);
        powerFeatures = powerFeatures.concat(lualResponse.features);

        lualResponse.features.forEach((feature, index) => {
          console.log(`Drawing LUAL power feature ${index + 1}...`);
          
          // Handle different geometry types
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
          } else if (feature.geometry.type === 'LineString') {
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

      const lookupUrl = `${LAYER_CONFIG_LOOKUP.baseUrl}/query?${lookupParams.toString()}`;
      console.log('LookUpNLive request URL:', lookupUrl);
      // Use fetchFromGiraffeLayers for better error handling
      const lookupResponse = await fetchFromGiraffeLayers(lookupUrl);
      console.log('LookUpNLive response:', lookupResponse);

      if (lookupResponse.features?.length > 0) {
        console.log(`Drawing ${lookupResponse.features.length} LookUpNLive power features...`);
        powerFeatures = powerFeatures.concat(lookupResponse.features);

        lookupResponse.features.forEach((feature, index) => {
          console.log(`Drawing LookUpNLive power feature ${index + 1}...`);

          // Handle different geometry types
          if (feature.geometry.type === 'MultiLineString') {
            feature.geometry.coordinates.forEach(lineString => {
              const style = {
                strokeStyle: '#FFBD33',
                lineWidth: 8
              };
              drawBoundary(ctx, lineString, centerX, centerY, size, config.width, style);
            });
          } else if (feature.geometry.type === 'LineString') {
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
      strokeStyle: '#FF0000',
      lineWidth: 6,
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