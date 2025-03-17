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
        drawImage(ctx, baseMap, canvas.width, canvas.height, 0.4);
      } catch (error) {
        console.warn('Failed to load aerial layer:', error);
      }
  
      try {
        // 2. Contour layer - Use arcgisService for consistent CRS handling
        console.log('Loading contour layer...');
        const contourLayer = await getArcGISImage(config, centerX, centerY, size);
        console.log('Contour layer loaded');
        drawImage(ctx, contourLayer, canvas.width, canvas.height, 0.9);
      } catch (error) {
        console.warn('Failed to load contour layer:', error);
      }
  
      // Draw boundaries - These should use the raw coordinates since we're in GDA94
      drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.size || config.width, {
        strokeStyle: '#FF0000',
        lineWidth: 6,
        showLabels: showLabels
      });
  
      if (developableArea?.features?.length > 0 && showDevelopableArea) {
        drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.size || config.width, showDevelopableAreaLabels);
      }
  
      return canvas.toDataURL('image/png', 1.0);
    } catch (error) {
      console.error('Failed to capture contour map:', error);
      return null;
    }
  }