import { LAYER_CONFIGS } from '../../config/layerConfigs';
import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';
import { calculateMercatorParams } from '../../utils/coordinates';
import { createCanvas, drawImage, drawBoundary } from '../../utils/canvas';
import { proxyRequest } from '../../../services/proxyService';
import { loadImage } from '../../utils/image';
import { calculateBounds } from './shared';

/**
 * Acid Sulfate Soils map configuration
 */
export const ACID_SULFATE_CONFIG = {
  url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Planning_Layers/MapServer',
  layerId: 10,
  size: 2048,
  width: 2048,
  height: 2048,
  padding: 0.3,
  dpi: 300
};

/**
 * Capture an acid sulfate soils map screenshot
 * @param {Object} feature - GeoJSON feature
 * @param {Object} developableArea - Optional developable area GeoJSON
 * @param {Boolean} showDevelopableArea - Whether to show the developable area
 * @returns {Promise<String>} Screenshot as a data URL
 */
export async function captureAcidSulfateMap(feature, developableArea = null, showDevelopableArea = true) {
  if (!feature) return null;
  
  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.3
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    
    // Create base canvas
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d', { alpha: true });

    try {
      // 1. Aerial imagery (base)
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
      const baseMap = await loadImage(url);
      drawImage(ctx, baseMap, canvas.width, canvas.height, 0.7);
    } catch (error) {
      console.warn('Failed to load aerial layer:', error);
    }

    try {
      // 2. Acid Sulfate Soils layer
      const acidSulfateConfig = {
        url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/Protection/MapServer',
        layerId: 1,
        size: 2048,
        padding: 0.3
      };
      
      const acidSulfateUrl = await proxyRequest(`${acidSulfateConfig.url}/export?${new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${acidSulfateConfig.size},${acidSulfateConfig.size}`,
        bbox: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        bboxSR: 4283,
        imageSR: 4283,
        layers: `show:${acidSulfateConfig.layerId}`,
        dpi: 300
      })}`);
      
      const acidSulfateLayer = await loadImage(acidSulfateUrl);
      drawImage(ctx, acidSulfateLayer, canvas.width, canvas.height, 0.8);
    } catch (error) {
      console.warn('Failed to load acid sulfate soils layer:', error);
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

    // Add legend
    const legendHeight = 380;
    const legendWidth = 400;
    const padding = 30;
    const lineHeight = 40;
    const legendX = canvas.width - legendWidth - padding;
    const legendY = canvas.height - legendHeight - padding;
    const swatchSize = 30;

    // Legend items with their colors
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
        const spacing = 6;
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