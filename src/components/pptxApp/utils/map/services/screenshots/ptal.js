import { createCanvas, drawImage, drawBoundary } from '../../utils/canvas';
import { loadImage } from '../../utils/image';
import { calculateMercatorParams } from '../../utils/coordinates';
import { calculateBounds } from '../screenshot';
import { LAYER_CONFIGS } from '../../config/layerConfigs';
import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';
import { proxyRequest } from '../../../services/proxyService';
import { getPTALToken } from '../tokenService';

/**
 * Captures a screenshot of the PTAL (Public Transport Accessibility Level) map
 * @param {Object} feature - GeoJSON feature
 * @param {Object} developableArea - Optional developable area GeoJSON
 * @param {boolean} showDevelopableArea - Whether to show the developable area
 * @param {string} boundsSource - Source for calculating bounds ('feature' or 'developableArea')
 * @returns {Promise<Object>} Object containing the image data URL and PTAL features
 */
export async function capturePTALMap(feature, developableArea = null, showDevelopableArea = true, boundsSource = 'feature') {
  if (!feature) return null;
  console.log('Starting PTAL map capture...');
  
  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.3
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, boundsSource);
    
    // Create base canvas
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d', { alpha: true });

    let ptalFeatures = [];

    try {
      // 1. Aerial imagery (base)
      console.log('Loading aerial base layer...');
      const aerialConfig = LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL];
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
      const baseMap = await loadImage(url);
      drawImage(ctx, baseMap, canvas.width, canvas.height, 0.7);
    } catch (error) {
      console.warn('Failed to load aerial layer:', error);
    }

    try {
      // 2. PTAL layer
      console.log('Loading PTAL layer...');
      const ptalConfig = {
        baseUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/ptal_dec20_gdb__(1)/FeatureServer/0',
      };

      // Color mapping for PTAL values
      const ptalColors = {
        '1 - Low': 'rgba(255, 255, 0, 0.7)',       // Yellow
        '2 - Low-Medium': 'rgba(255, 200, 0, 0.7)', // Orange-Yellow
        '3 - Medium': 'rgba(255, 150, 0, 0.7)',     // Orange
        '4 - Medium-High': 'rgba(255, 100, 0, 0.7)', // Dark Orange
        '5 - High': 'rgba(255, 50, 0, 0.7)',        // Red-Orange
        '6 - Very High': 'rgba(255, 0, 0, 0.7)',    // Red
        'default': 'rgba(128, 128, 128, 0.7)'       // Gray (default)
      };

      // Get the PTAL features
      const { bbox } = calculateMercatorParams(centerX, centerY, size);
      
      // Get token for PTAL service
      const token = await getPTALToken();
      
      const params = new URLSearchParams({
        where: '1=1',
        geometry: bbox,
        geometryType: 'esriGeometryEnvelope',
        inSR: 3857,
        spatialRel: 'esriSpatialRelIntersects',
        outFields: '*',
        returnGeometry: true,
        f: 'geojson',
        token: token
      });

      const url = `${ptalConfig.baseUrl}/query?${params.toString()}`;
      console.log('PTAL request URL:', url.replace(token, 'REDACTED'));
      
      const ptalResponse = await proxyRequest(url);
      console.log('PTAL response:', ptalResponse);

      if (ptalResponse?.features?.length > 0) {
        console.log(`Drawing ${ptalResponse.features.length} PTAL features...`);
        ptalFeatures = ptalResponse.features;
        
        // Store the PTAL values in the feature properties
        feature.properties.ptalValues = ptalFeatures.map(f => f.properties.ptal);
        
        ptalFeatures.forEach((ptalFeature, index) => {
          console.log(`Drawing PTAL feature ${index + 1}...`);
          const ptalValue = ptalFeature.properties.ptal;
          const fillColor = ptalColors[ptalValue] || ptalColors.default;
          
          // Handle MultiPolygon geometry type
          if (ptalFeature.geometry.type === 'MultiPolygon') {
            ptalFeature.geometry.coordinates.forEach(polygonCoords => {
              // Draw each polygon in the MultiPolygon separately
              polygonCoords.forEach(coords => {
                drawBoundary(ctx, coords, centerX, centerY, size, config.width, {
                  fill: true,
                  strokeStyle: fillColor,
                  fillStyle: fillColor,
                  lineWidth: 2
                });
              });
            });
          } else {
            // Handle regular Polygon geometry type
            drawBoundary(ctx, ptalFeature.geometry.coordinates[0], centerX, centerY, size, config.width, {
              fill: true,
              strokeStyle: fillColor,
              fillStyle: fillColor,
              lineWidth: 2
            });
          }
        });
        console.log('Finished drawing PTAL features');
      } else {
        console.log('No PTAL features found in response');
      }
    } catch (error) {
      console.warn('Failed to load PTAL layer:', error);
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
    try {
      console.log('Adding PTAL legend...');
      const legendWidth = 300;
      const legendHeight = 200;
      const legendX = config.width - legendWidth - 20;
      const legendY = config.height - legendHeight - 20;
      
      // Draw legend background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);
      
      // Draw legend title
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 20px Arial';
      ctx.fillText('PTAL Legend', legendX + 10, legendY + 30);
      
      // Draw legend items
      const legendItems = [
        { label: '6 - Very High', color: ptalColors['6 - Very High'] },
        { label: '5 - High', color: ptalColors['5 - High'] },
        { label: '4 - Medium-High', color: ptalColors['4 - Medium-High'] },
        { label: '3 - Medium', color: ptalColors['3 - Medium'] },
        { label: '2 - Low-Medium', color: ptalColors['2 - Low-Medium'] },
        { label: '1 - Low', color: ptalColors['1 - Low'] }
      ];
      
      ctx.font = '16px Arial';
      legendItems.forEach((item, index) => {
        const itemY = legendY + 60 + (index * 22);
        
        // Draw color box
        ctx.fillStyle = item.color;
        ctx.fillRect(legendX + 10, itemY - 15, 20, 20);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(legendX + 10, itemY - 15, 20, 20);
        
        // Draw label
        ctx.fillStyle = '#000000';
        ctx.fillText(item.label, legendX + 40, itemY);
      });
    } catch (error) {
      console.warn('Failed to add legend:', error);
    }

    // Take screenshot
    const screenshot = canvas.toDataURL('image/png', 1.0);
    
    return {
      image: screenshot,
      features: ptalFeatures
    };
  } catch (error) {
    console.error('Failed to capture PTAL map:', error);
    return null;
  }
} 