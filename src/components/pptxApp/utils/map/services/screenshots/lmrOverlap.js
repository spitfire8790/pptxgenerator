import { LAYER_CONFIGS } from '../../config/layerConfigs';
import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';
import { calculateMercatorParams } from '../../utils/coordinates';
import { createCanvas, drawImage, drawBoundary } from '../../utils/canvas';
import { loadImage } from '../../utils/image';
import { proxyRequest } from '../../../services/proxyService';

/**
 * Checks if a feature overlaps with LMR (Local, Metropolitan, Regional) zones
 * and returns the overlap information.
 * 
 * @param {Object} feature - GeoJSON feature to check
 * @param {number} centerX - Center X coordinate
 * @param {number} centerY - Center Y coordinate
 * @param {number} size - Size of the area to check
 * @returns {Object} Overlap information including hasOverlap, primaryOverlap, and pixelCounts
 */
export async function checkLMROverlap(feature, centerX, centerY, size) {
  if (!feature) return { hasOverlap: false, primaryOverlap: null, pixelCounts: {} };
  
  console.log('Checking LMR overlap...');
  
  try {
    const config = {
      width: 1024,
      height: 1024,
      padding: 0.3
    };
    
    // Create canvas for analysis
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d', { alpha: true });
    
    // Define LMR zones configuration
    const lmrConfig = {
      url: 'https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Planning_Layers/MapServer',
      layerId: 10, // Adjust this if needed based on the actual layer ID for LMR zones
      size: config.width,
      padding: config.padding
    };
    
    try {
      // Load LMR zones layer
      console.log('Loading LMR zones layer...');
      const { bbox } = calculateMercatorParams(centerX, centerY, size);
      
      const lmrUrl = await proxyRequest(`${lmrConfig.url}/export?${new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${lmrConfig.size},${lmrConfig.size}`,
        bbox: bbox,
        bboxSR: 3857,
        imageSR: 3857,
        layers: `show:${lmrConfig.layerId}`,
        dpi: 96
      })}`);
      
      const lmrLayer = await loadImage(lmrUrl);
      drawImage(ctx, lmrLayer, canvas.width, canvas.height, 1.0);
      
      // Draw feature boundary for analysis
      drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width, {
        fill: true,
        strokeStyle: 'rgba(255, 0, 0, 0)',
        fillStyle: 'rgba(255, 0, 0, 1)',
        lineWidth: 0
      });
      
      // Analyze pixel data to determine overlap
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixelData = imageData.data;
      
      // Define color mappings for different LMR zones
      const colorMappings = {
        'Local Centre': [255, 255, 0], // Yellow
        'Metropolitan Centre': [255, 0, 0], // Red
        'Regional Centre': [0, 0, 255], // Blue
        // Add more mappings as needed
      };
      
      // Count pixels for each zone type
      const pixelCounts = {};
      let totalFeaturePixels = 0;
      let maxCount = 0;
      let primaryOverlap = null;
      
      for (let i = 0; i < pixelData.length; i += 4) {
        // Red channel at full intensity indicates our feature
        if (pixelData[i] === 255 && pixelData[i+1] === 0 && pixelData[i+2] === 0 && pixelData[i+3] === 255) {
          totalFeaturePixels++;
          
          // Check surrounding pixels for LMR zone colors
          const x = (i / 4) % canvas.width;
          const y = Math.floor((i / 4) / canvas.width);
          
          // Sample a small area around the feature pixel
          for (let offsetY = -2; offsetY <= 2; offsetY++) {
            for (let offsetX = -2; offsetX <= 2; offsetX++) {
              const sampleX = x + offsetX;
              const sampleY = y + offsetY;
              
              if (sampleX >= 0 && sampleX < canvas.width && sampleY >= 0 && sampleY < canvas.height) {
                const sampleIndex = (sampleY * canvas.width + sampleX) * 4;
                const r = pixelData[sampleIndex];
                const g = pixelData[sampleIndex + 1];
                const b = pixelData[sampleIndex + 2];
                const a = pixelData[sampleIndex + 3];
                
                // Skip transparent pixels
                if (a < 50) continue;
                
                // Check against known LMR zone colors
                for (const [zoneName, color] of Object.entries(colorMappings)) {
                  const [zoneR, zoneG, zoneB] = color;
                  
                  // Allow some color tolerance
                  if (Math.abs(r - zoneR) < 30 && Math.abs(g - zoneG) < 30 && Math.abs(b - zoneB) < 30) {
                    pixelCounts[zoneName] = (pixelCounts[zoneName] || 0) + 1;
                    
                    if (pixelCounts[zoneName] > maxCount) {
                      maxCount = pixelCounts[zoneName];
                      primaryOverlap = zoneName;
                    }
                    
                    break;
                  }
                }
              }
            }
          }
        }
      }
      
      // Determine if there's a significant overlap
      const hasOverlap = maxCount > (totalFeaturePixels * 0.05); // 5% threshold
      
      console.log('LMR overlap analysis results:', {
        hasOverlap,
        primaryOverlap: hasOverlap ? primaryOverlap : null,
        pixelCounts,
        totalFeaturePixels
      });
      
      // Store the results in the feature properties
      if (!feature.properties) {
        feature.properties = {};
      }
      
      feature.properties.lmrOverlap = {
        hasOverlap,
        primaryOverlap: hasOverlap ? primaryOverlap : null,
        pixelCounts
      };
      
      return feature.properties.lmrOverlap;
      
    } catch (error) {
      console.error('Failed to load or analyze LMR zones layer:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      
      // Return default no-overlap result
      return { hasOverlap: false, primaryOverlap: null, pixelCounts: {} };
    }
  } catch (error) {
    console.error('Failed to check LMR overlap:', error);
    return { hasOverlap: false, primaryOverlap: null, pixelCounts: {} };
  }
} 