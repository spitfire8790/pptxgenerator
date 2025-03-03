import { LAYER_CONFIGS } from '../../config/layerConfigs';
import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';
import { getWMSImage } from '../wmsService';
import { getArcGISImage } from '../arcgisService';
import { createCanvas, drawImage, drawBoundary, drawPolyline } from '../../utils/canvas';
import { proxyRequest } from '../../../services/proxyService';
import { loadImage } from '../../utils/image';
import { calculateBounds } from '../screenshot';
import * as turf from '@turf/turf';

/**
 * Regularity map configuration
 */
export const REGULARITY_CONFIG = {
  size: 2048,
  width: 2048,
  height: 2048,
  padding: 0.3,
  dpi: 300
};

/**
 * Capture a regularity map screenshot showing plot regularity
 * @param {Object} feature - GeoJSON feature
 * @param {Object} developableArea - Optional developable area GeoJSON
 * @param {Boolean} showDevelopableArea - Whether to show the developable area
 * @returns {Promise<String>} Screenshot as a data URL
 */
export async function captureRegularityMap(feature, developableArea = null, showDevelopableArea = true) {
  if (!feature) return null;
  
  try {
    const config = REGULARITY_CONFIG;
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    
    // Create base canvas
    const canvas = createCanvas(config.width || config.size, config.height || config.size);
    const ctx = canvas.getContext('2d', { alpha: true });

    try {
      // 1. Aerial imagery (base)
      const baseMap = await getWMSImage(LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL], centerX, centerY, size);
      drawImage(ctx, baseMap, canvas.width, canvas.height, 0.7);
    } catch (error) {
      console.warn('Failed to load aerial layer:', error);
    }

    try {
      // 2. Cadastre layer
      const cadastreConfig = {
        url: 'https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Cadastre/MapServer',
        layerId: 9,
        size: config.width || config.size,
        padding: config.padding
      };

      const { bbox } = calculateMercatorParams(centerX, centerY, size);
      
      const params = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${cadastreConfig.size},${cadastreConfig.size}`,
        bbox: bbox,
        bboxSR: 3857,
        imageSR: 3857,
        layers: `show:${cadastreConfig.layerId}`,
        dpi: 300
      });

      const cadastreUrl = `${cadastreConfig.url}/export?${params.toString()}`;
      const cadastreProxyUrl = await proxyRequest(cadastreUrl);
      
      if (cadastreProxyUrl) {
        const cadastreLayer = await loadImage(cadastreProxyUrl);
        drawImage(ctx, cadastreLayer, canvas.width, canvas.height, 1);
      }
    } catch (error) {
      console.warn('Failed to load cadastre layer:', error);
    }

    try {
      // 3. Calculate and draw minimum bounding rectangle
      if (feature.geometry?.coordinates) {
        const coords = feature.geometry.coordinates[0];
        
        // Convert to turf format
        const points = coords.map(coord => [coord[0], coord[1]]);
        const polygon = turf.polygon([points]);
        
        // Get the bounding box and convert to polygon
        const bbox = turf.bbox(polygon);
        const mbr = turf.bboxPolygon(bbox);
        
        // Draw the MBR with a dashed green line
        if (mbr && mbr.geometry && mbr.geometry.coordinates) {
          drawBoundary(ctx, mbr.geometry.coordinates[0], centerX, centerY, size, config.width, {
            strokeStyle: '#00FF00',
            lineWidth: 3,
            dashArray: [10, 10]
          });
        }
        
        // Calculate regularity ratio: area of polygon / area of MBR
        const polygonArea = turf.area(polygon);
        const mbrArea = turf.area(mbr);
        const regularityRatio = polygonArea / mbrArea;
        
        // Convert to percentage
        const regularityPercentage = Math.round(regularityRatio * 100);
        
        // Draw regularity score in the top right
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        
        const text = `Regularity: ${regularityPercentage}%`;
        const textWidth = ctx.measureText(text).width;
        
        // First draw black outline
        ctx.strokeText(text, canvas.width - textWidth - 30, 50);
        // Then fill with white
        ctx.fillText(text, canvas.width - textWidth - 30, 50);

        // Store regularity score in the feature for use in report
        feature.properties.regularityScore = regularityPercentage;
      }
    } catch (error) {
      console.warn('Failed to calculate/draw regularity:', error);
    }

    // Draw property boundary
    if (feature.geometry?.coordinates?.[0]) {
      drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width || config.size, {
        strokeStyle: '#FF0000',
        lineWidth: 6
      });
    }

    // Draw developable area if available
    if (developableArea?.features?.[0] && showDevelopableArea) {
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width || config.size, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Failed to capture regularity map:', error);
    return null;
  }
}

// Helper function for mercator projection calculations
function calculateMercatorParams(centerX, centerY, size) {
  // Convert center point to Web Mercator
  const mercatorCenter = [
    centerX * 20037508.34 / 180, 
    Math.log(Math.tan((90 + centerY) * Math.PI / 360)) / (Math.PI / 180) * 20037508.34 / 180
  ];
  
  // Calculate mercator bbox
  const mercatorSize = size * 20037508.34 / 180;
  const bbox = [
    mercatorCenter[0] - mercatorSize/2,
    mercatorCenter[1] - mercatorSize/2,
    mercatorCenter[0] + mercatorSize/2,
    mercatorCenter[1] + mercatorSize/2
  ].join(',');
  
  // Convert all coordinates to Web Mercator for display
  const mercatorCoords = [];
  
  return { bbox, mercatorCoords };
} 