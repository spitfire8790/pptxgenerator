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
import { HISTORICAL_LAYERS, METROMAP_CONFIG } from '../../config/historicalLayers';

// Layer configurations
const LAYER_CONFIG_HISTORICAL = {
  width: 2048,
  height: 2048,
  padding: 0.4
};

export async function captureHistoricalImagery(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false, showLabels = false, showDevelopableArealabels = false) {
  if (!feature) return null;
  console.log('Starting historical imagery capture...');

  try {
    const config = LAYER_CONFIG_HISTORICAL;

    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
    const { bbox } = calculateMercatorParams(centerX, centerY, size);

    // Try each layer in order from oldest to newest
    const layersToTry = [...HISTORICAL_LAYERS].reverse();
    for (const layerInfo of layersToTry) {
      try {
        console.log(`Trying Metromap layer from ${layerInfo.year} (${layerInfo.region}): ${layerInfo.layer}`);
        
        const canvas = createCanvas(config.width, config.height);
        const ctx = canvas.getContext('2d', { alpha: true });
        
        // Fill with white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, config.width, config.height);

        const params = new URLSearchParams({
          ...METROMAP_CONFIG.defaultParams,
          BBOX: bbox,
          WIDTH: config.width,
          HEIGHT: config.height,
          LAYERS: layerInfo.layer
        });

        const url = `${METROMAP_CONFIG.baseUrl}?${params.toString()}`;
        console.log(`Requesting Metromap imagery for ${layerInfo.year} (${layerInfo.region})`);
        
        const image = await loadImage(url);
        
        // Create a temporary canvas to check image content
        const tempCanvas = createCanvas(config.width, config.height);
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(image, 0, 0, config.width, config.height);
        
        // Check if image has content
        const imageData = tempCtx.getImageData(0, 0, config.width, config.height).data;
        let hasContent = false;
        
        for (let i = 0; i < imageData.length; i += 4) {
          if (imageData[i + 3] > 0) {
            hasContent = true;
            break;
          }
        }
        
        if (!hasContent) {
          console.log(`Layer ${layerInfo.layer} returned empty/transparent image, trying next layer...`);
          continue;
        }

        // If we get here, we found a valid layer with content
        console.log(`Found valid historical imagery from ${layerInfo.year} (${layerInfo.region})`);
        
        // Draw the image
        drawImage(ctx, image, canvas.width, canvas.height, 1.0);

        // Draw boundaries
        drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width, { showLabels });

        if (developableArea?.features?.length > 0 && showDevelopableArea) {
          drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width, showDevelopableArealabels);
        }

        // Add source attribution
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#002664';
        const sourceText = `Source: Metromap ${layerInfo.region} (${layerInfo.year})`;
        const textWidth = ctx.measureText(sourceText).width;
        const padding = 20;
        
        // Draw semi-transparent background for text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(
          canvas.width - textWidth - padding * 2,
          canvas.height - 40 - padding,
          textWidth + padding * 2,
          40
        );
        
        // Draw text
        ctx.fillStyle = '#002664';
        ctx.fillText(sourceText, canvas.width - textWidth - padding, canvas.height - padding - 10);

        // Return single image result
        return [{
          image: canvas.toDataURL('image/png', 1.0),
          year: layerInfo.year,
          type: 'metromap',
          layer: layerInfo.layer,
          region: layerInfo.region,
          source: 'Metromap'
        }];
      } catch (error) {
        console.warn(`Failed to load ${layerInfo.year} ${layerInfo.region} layer:`, error.message);
        continue;
      }
    }

    console.log('No valid historical imagery found');
    return null;
  } catch (error) {
    console.error('Failed to capture historical imagery:', error);
    return null;
  }
}