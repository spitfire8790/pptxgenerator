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
const LAYER_CONFIG_ACID_SULFATE = {
  url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/Protection/MapServer',
  layerId: 1,
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

export async function captureAcidSulfateMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false) {
    if (!feature) return null;
    
    try {
      const config = LAYER_CONFIG_ACID_SULFATE;
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
        // 2. Acid Sulfate Soils layer - Use arcgisService for consistent CRS handling
        console.log('Loading acid sulfate soils layer...');
        const acidSulfateLayer = await getArcGISImage(config, centerX, centerY, size);
        console.log('Acid sulfate soils layer loaded');
        drawImage(ctx, acidSulfateLayer, canvas.width, canvas.height, 0.8);
      } catch (error) {
        console.warn('Failed to load acid sulfate soils layer:', error);
      }
  
      // Draw boundaries without labels
      drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.size || config.width, {
        strokeStyle: '#FF0000',
        lineWidth: 6,
        showLabels: false
      });
  
      if (developableArea?.features?.length > 0 && showDevelopableArea) {
        // Use the helper function to draw developable areas without labels
        drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.size || config.width, false);
      }
  
      // Add legend
      const legendHeight = 380;
      const legendWidth = 400;
      const padding = 30;
      const lineHeight = 40;
      const legendX = canvas.width - legendWidth - padding;
      const legendY = canvas.height - legendHeight - padding;
      const swatchSize = 30;
  
      // Legend items with their colors (using the exact colors from the renderer)
      const legendItems = [
        { label: 'Class 1', color: 'rgba(0, 197, 255, 255)' },
        { label: 'Class 2', color: 'rgba(255, 0, 197, 255)' },
        { label: 'Class 2b', color: 'rgba(255, 0, 120, 255)' },
        { label: 'Class 3', color: 'rgba(255, 190, 232, 255)' },
        { label: 'Class 4', color: 'rgba(223, 115, 255, 255)' },
        { label: 'Class 5', color: 'rgba(255, 255, 190, 255)' },
        { label: 'Non Standard Values', color: 'rgba(110, 110, 110, 255)', pattern: true }
      ];
  
      // Draw legend background with border
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
      ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);
  
      // Legend title
      ctx.font = 'bold 32px Public Sans';
      ctx.fillStyle = '#000000';
      ctx.textBaseline = 'top';
      ctx.fillText('Acid Sulfate Soil Risk', legendX + padding, legendY + padding);
  
      // Draw legend items
      ctx.textBaseline = 'middle';
      ctx.font = '24px Public Sans';
  
      legendItems.forEach((item, index) => {
        const y = legendY + padding + 60 + (index * lineHeight);
        
        // Draw color swatch
        ctx.fillStyle = item.color;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.fillRect(legendX + padding, y - swatchSize/2, swatchSize, swatchSize);
        ctx.strokeRect(legendX + padding, y - swatchSize/2, swatchSize, swatchSize);
  
        // Add diagonal pattern for non-standard values
        if (item.pattern) {
          ctx.beginPath();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          
          // Save the current clip region
          ctx.save();
          
          // Create a clipping region that matches the square exactly
          ctx.beginPath();
          ctx.rect(legendX + padding, y - swatchSize/2, swatchSize, swatchSize);
          ctx.clip();
          
          // Draw diagonal lines
          const spacing = 6; // Slightly reduced spacing for more lines
          for (let i = -swatchSize; i <= swatchSize * 2; i += spacing) {
            const x = legendX + padding + i;
            ctx.moveTo(x, y - swatchSize/2);
            ctx.lineTo(x + swatchSize, y + swatchSize/2);
          }
          ctx.stroke();
          
          // Restore the original clip region
          ctx.restore();
        }
        
        // Draw label
        ctx.fillStyle = '#000000';
        ctx.fillText(item.label, legendX + padding + swatchSize + 20, y);
      });
  
      return canvas.toDataURL('image/png', 1.0);
    } catch (error) {
      console.error('Failed to capture acid sulfate soils map:', error);
      return null;
    }
  }