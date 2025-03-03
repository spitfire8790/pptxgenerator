import { 
  createCanvas,
  drawBoundary,
  drawImage
} from '../../utils/canvas';
import {
  calculateMercatorParams
} from '../../utils/coordinates';
import { calculateBounds } from './shared';
import { loadImage } from '../../utils/image';
import { HISTORICAL_LAYERS, METROMAP_CONFIG } from '../../config/historicalLayers';

// Helper functions for tile calculations
function long2tile(lon, zoom) {
  const n = Math.pow(2, zoom);
  return Math.floor(((lon + 180) / 360) * n);
}

function lat2tile(lat, zoom) {
  const n = Math.pow(2, zoom);
  const latRad = lat * Math.PI / 180;
  return Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
}

// Convert Web Mercator to WGS84
function mercatorToWGS84(x, y) {
  const lon = (x / 20037508.34) * 180;
  const lat = (Math.atan(Math.exp(y / 20037508.34 * Math.PI)) * 360 / Math.PI) - 90;
  return [lon, lat];
}

/**
 * Captures a historical imagery map screenshot of a specified feature
 * 
 * @param {Object} feature - GeoJSON feature representing the property
 * @param {Object} developableArea - GeoJSON feature collection representing developable area (optional)
 * @param {boolean} showDevelopableArea - Whether to display the developable area on the map
 * @returns {Promise<Array>} - Promise resolving to array of historical imagery objects with base64 encoded PNG images
 */
export async function captureHistoricalImagery(feature, developableArea = null, showDevelopableArea = true) {
  if (!feature) return null;
  console.log('Starting historical imagery capture...');

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.4
    };

    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
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