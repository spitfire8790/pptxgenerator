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
const LAYER_CONFIG_BUSHFIRE = {
  url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Hazard/MapServer',
  layerId: 229,
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

export async function captureBushfireMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false, showLabels = false, showDevelopableArealabels = false) {
  if (!feature) return null;
  console.log('Starting bushfire map capture...');

  try {
    const config = LAYER_CONFIG_BUSHFIRE;
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
    
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
    } catch (error) {
      console.error('Failed to load aerial layer:', error);
    }

    let bushfireFeatures = [];
    try {
      // 2. Bushfire layer
      console.log('Loading bushfire layer...');

      // First get the features
      const { bbox } = calculateMercatorParams(centerX, centerY, size);
      const queryParams = new URLSearchParams({
        where: '1=1',
        geometry: bbox,
        geometryType: 'esriGeometryEnvelope',
        inSR: 3857,
        spatialRel: 'esriSpatialRelIntersects',
        outFields: '*',
        returnGeometry: true,
        f: 'geojson'
      });

      const queryUrl = `${config.url}/${config.layerId}/query?${queryParams.toString()}`;
      const bushfireResponse = await proxyRequest(queryUrl);
      if (bushfireResponse?.features?.length > 0) {
        bushfireFeatures = bushfireResponse.features;
        // Store the features in the feature properties
        feature.properties.site_suitability__bushfireFeatures = bushfireResponse;
      }

      // Then get the image
      const params = new URLSearchParams({
        f: 'image',
        format: config.format,
        transparent: config.transparent.toString(),
        size: `${config.width},${config.height}`,
        bbox: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        bboxSR: 4283,
        imageSR: 4283,
        layers: `show:${config.layerId}`,
        dpi: config.dpi
      });

      const url = `${config.url}/export?${params.toString()}`;
      console.log('Requesting bushfire layer through proxy...', url);
      
      const proxyUrl = await proxyRequest(url);
      if (!proxyUrl) {
        throw new Error('Failed to get proxy URL for bushfire layer');
      }
      
      console.log('Loading bushfire image from proxy URL...');
      const bushfireLayer = await loadImage(proxyUrl);
      console.log('Bushfire layer loaded successfully');
      drawImage(ctx, bushfireLayer, canvas.width, canvas.height, 0.8);
    } catch (error) {
      console.warn('Failed to load bushfire layer:', error);
    }

    // Draw boundaries
    drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width, { showLabels: false });

    if (developableArea?.features?.length > 0 && showDevelopableArea) {
      // Use the helper function to draw developable areas with labels
      drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width, showDevelopableArealabels);
    }

    // Add legend
    const legendHeight = 240; // Reduced height since we removed source text
    const legendWidth = 500;
    const padding = 20;
    const legendX = canvas.width - legendWidth - padding;
    const legendY = canvas.height - legendHeight - padding;

    // Draw legend background with border
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#002664';
    ctx.lineWidth = 2;
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

    // Legend title
    ctx.font = 'bold 28px Public Sans';
    ctx.fillStyle = '#002664';
    ctx.textBaseline = 'top';
    ctx.fillText('Bushfire Prone Land', legendX + padding, legendY + padding);

    // Legend items
    const legendItems = [
      { color: '#FF0000', label: 'Vegetation Category 1' },
      { color: '#FFD200', label: 'Vegetation Category 2' },
      { color: '#FF8000', label: 'Vegetation Category 3' },
      { color: '#FFFF73', label: 'Vegetation Buffer' }
    ];

    ctx.textBaseline = 'middle';
    ctx.font = '22px Public Sans';

    legendItems.forEach((item, index) => {
      const y = legendY + padding + 60 + (index * 45); // Increased spacing between items
      
      // Draw color box
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX + padding, y - 10, 20, 20);
      ctx.strokeStyle = '#363636';
      ctx.lineWidth = 1;
      ctx.strokeRect(legendX + padding, y - 10, 20, 20);
      
      // Draw label
      ctx.fillStyle = '#363636';
      ctx.fillText(item.label, legendX + padding + 35, y);
    });

    // Return both the screenshot and properties with the features
    const screenshot = canvas.toDataURL('image/png', 1.0);
    return {
      dataURL: screenshot,
      properties: feature.properties
    };
  } catch (error) {
    console.error('Failed to capture bushfire map:', error);
    return null;
  }
}

// Add helper function for drawing rounded rectangle text boxes
function drawRoundedTextBox(ctx, text, x, y, padding = 10, cornerRadius = 5, options = {}) {
  const defaultOptions = {
    backgroundFill: 'white',
    borderColor: 'black',
    textColor: 'black',
    font: '16px Arial',
    canvasWidth: 2048, // Default canvas size
    canvasHeight: 2048
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  ctx.font = mergedOptions.font;
  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  const textHeight = parseInt(mergedOptions.font.split('px')[0]) * 1.2; // Approximate text height
  
  const boxWidth = textWidth + (padding * 2);
  const boxHeight = textHeight + (padding * 2);
  
  // Adjust position to ensure the label is fully visible within canvas boundaries
  let adjustedX = x;
  let adjustedY = y;
  
  // Check horizontal boundaries
  if (x - boxWidth/2 < 10) {
    // Too close to left edge, move right
    adjustedX = boxWidth/2 + 10;
  } else if (x + boxWidth/2 > mergedOptions.canvasWidth - 10) {
    // Too close to right edge, move left
    adjustedX = mergedOptions.canvasWidth - boxWidth/2 - 10;
  }
  
  // Check vertical boundaries
  if (y - boxHeight/2 < 10) {
    // Too close to top edge, move down
    adjustedY = boxHeight/2 + 10;
  } else if (y + boxHeight/2 > mergedOptions.canvasHeight - 10) {
    // Too close to bottom edge, move up
    adjustedY = mergedOptions.canvasHeight - boxHeight/2 - 10;
  }
  
  // Draw rounded rectangle background
  ctx.fillStyle = mergedOptions.backgroundFill;
  ctx.beginPath();
  ctx.moveTo(adjustedX - boxWidth/2 + cornerRadius, adjustedY - boxHeight/2);
  ctx.lineTo(adjustedX + boxWidth/2 - cornerRadius, adjustedY - boxHeight/2);
  ctx.quadraticCurveTo(adjustedX + boxWidth/2, adjustedY - boxHeight/2, adjustedX + boxWidth/2, adjustedY - boxHeight/2 + cornerRadius);
  ctx.lineTo(adjustedX + boxWidth/2, adjustedY + boxHeight/2 - cornerRadius);
  ctx.quadraticCurveTo(adjustedX + boxWidth/2, adjustedY + boxHeight/2, adjustedX + boxWidth/2 - cornerRadius, adjustedY + boxHeight/2);
  ctx.lineTo(adjustedX - boxWidth/2 + cornerRadius, adjustedY + boxHeight/2);
  ctx.quadraticCurveTo(adjustedX - boxWidth/2, adjustedY + boxHeight/2, adjustedX - boxWidth/2, adjustedY + boxHeight/2 - cornerRadius);
  ctx.lineTo(adjustedX - boxWidth/2, adjustedY - boxHeight/2 + cornerRadius);
  ctx.quadraticCurveTo(adjustedX - boxWidth/2, adjustedY - boxHeight/2, adjustedX - boxWidth/2 + cornerRadius, adjustedY - boxHeight/2);
  ctx.closePath();
  ctx.fill();
  
  // Draw border
  ctx.strokeStyle = mergedOptions.borderColor;
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Draw text
  ctx.fillStyle = mergedOptions.textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, adjustedX, adjustedY);
}

// Add helper function for bushfire legend
function drawBushfireLegend(ctx, canvasWidth, canvasHeight) {
  // Draw legend in bottom right corner
  const legendHeight = 90;
  const legendWidth = 300;
  const padding = 20;
  const legendX = canvasWidth - legendWidth - padding;
  const legendY = canvasHeight - legendHeight - padding;

  // Draw legend background with border
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.strokeStyle = '#002664';
  ctx.lineWidth = 2;
  ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
  ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

  // Draw legend title
  ctx.font = 'bold 14px "Public Sans Light"';
  ctx.fillStyle = '#002664';
  ctx.textAlign = 'left';
  ctx.fillText('Bushfire Prone Land', legendX + 10, legendY + 20);

  // Draw color box for bushfire
  ctx.fillStyle = 'rgba(213, 35, 49, 0.7)';
  ctx.fillRect(legendX + 10, legendY + 35, 30, 20);
  ctx.strokeStyle = 'rgba(213, 35, 49, 1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(legendX + 10, legendY + 35, 30, 20);

  // Draw label for bushfire
  ctx.font = '12px "Public Sans Light"';
  ctx.fillStyle = '#333333';
  ctx.textAlign = 'left';
  ctx.fillText('Bushfire Prone Land', legendX + 50, legendY + 48);
}