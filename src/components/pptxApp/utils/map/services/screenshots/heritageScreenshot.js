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

// Layer configurations
const LAYER_CONFIG_HERITAGE = {
  url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer',
  layerId: 0,
  size: 2048,
  width: 2048,
  height: 2048,
  padding: 0.3,
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
  padding: 0.3,
  dpi: 300,
  fallbackUrl: 'https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Imagery/MapServer',
  fallbackFormat: 'png32',
  fallbackTransparent: false,
  fallbackSpatialReference: 102100
};

export async function captureHeritageMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false) {
    if (!feature) return null;
    
    try {
      const config = LAYER_CONFIG_HERITAGE;
      const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
      
      console.log('Raw coordinates:', { centerX, centerY, size });
      
      // Create base canvas
      const canvas = createCanvas(config.width || config.size, config.height || config.size);
      const ctx = canvas.getContext('2d', { alpha: true });
  
      try {
        // 1. Aerial imagery (base) - Use Mercator coordinates
        console.log('Loading aerial layer...');
        const aerialConfig = LAYER_CONFIG_AERIAL;
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
        // 2. Heritage layer - Use arcgisService for consistent CRS handling
        console.log('Loading heritage layer...');
        const heritageLayer = await getArcGISImage(config, centerX, centerY, size);
        console.log('Heritage layer loaded');
        drawImage(ctx, heritageLayer, canvas.width, canvas.height, 0.8);
      } catch (error) {
        console.warn('Failed to load heritage layer:', error);
      }
  
      // Draw boundaries
      drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.size || config.width, {
        strokeStyle: '#FF0000',
        lineWidth: 6,
        showLabels: false
      });
  
      if (developableArea?.features?.length > 0 && showDevelopableArea) {
        drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.size || config.width, false);
      }
  
      try {
        // Load and draw the legend image
        console.log('Loading legend image...');
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
        console.log('Legend image drawn');
      } catch (error) {
        console.warn('Failed to load or draw legend image:', error);
      }
  
      return canvas.toDataURL('image/png', 1.0);
    } catch (error) {
      console.error('Failed to capture heritage map:', error);
      return null;
    }
  }