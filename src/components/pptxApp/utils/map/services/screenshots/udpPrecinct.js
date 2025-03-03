import { LAYER_CONFIGS } from '../../config/layerConfigs';
import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';
import { calculateMercatorParams } from '../../utils/coordinates';
import { createCanvas, drawImage, drawBoundary } from '../../utils/canvas';
import { loadImage } from '../../utils/image';
import { proxyRequest } from '../../../services/proxyService';
import { giraffeState } from '@gi-nx/iframe-sdk';
import { checkLMROverlap } from './lmrOverlap';

/**
 * Captures a screenshot of the UDP (Urban Development Program) precinct map
 * with the property boundary and optional developable area.
 * 
 * @param {Object} feature - GeoJSON feature representing the property
 * @param {Object} developableArea - Optional GeoJSON feature collection for developable area
 * @param {boolean} showDevelopableArea - Whether to show the developable area on the map
 * @param {string} boundsSource - Source for calculating bounds ('feature' or 'developableArea')
 * @returns {Object} Object containing the image data URL and UDP precinct features
 */
export async function captureUDPPrecinctMap(feature, developableArea = null, showDevelopableArea = true, boundsSource = 'feature') {
  if (!feature) return null;
  console.log('Starting UDP precinct map capture...');
  
  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.3
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, boundsSource);
    let udpFeatures = [];
    
    // Create base canvas
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d', { alpha: true });

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
      drawImage(ctx, baseMap, canvas.width, canvas.height, 0.5);
    } catch (error) {
      console.error('Failed to load aerial layer:', error);
    }

    try {
      // 2. UDP Precincts layer
      console.log('Loading UDP precincts...');
      const udpConfig = {
        baseUrl: 'https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Planning_Layers/MapServer',
        layerId: 8, // Adjust this if needed based on the actual layer ID for UDP precincts
        size: config.width,
        padding: config.padding
      };
      
      // Get UDP precincts data
      const udpUrl = await proxyRequest(`${udpConfig.baseUrl}/${udpConfig.layerId}/query?${new URLSearchParams({
        where: '1=1',
        geometry: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        geometryType: 'esriGeometryEnvelope',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: '*',
        returnGeometry: true,
        f: 'geojson'
      })}`);
      
      const udpData = await udpUrl;
      
      if (udpData.features?.length > 0) {
        console.log(`Drawing ${udpData.features.length} UDP precinct features...`);
        udpFeatures = udpData.features;
        
        // Store the features directly in the feature object
        if (!feature.properties) {
          feature.properties = {};
        }
        feature.properties.udpFeatures = udpFeatures;
        
        // Draw UDP precincts with different colors based on type
        udpFeatures.forEach((udpFeature, index) => {
          console.log(`Drawing UDP precinct feature ${index + 1}...`);
          
          // Determine color based on precinct type
          const precinctType = udpFeature.properties?.PRECINCT_TYPE || '';
          let fillStyle = 'rgba(255, 165, 0, 0.6)'; // Default orange
          let strokeStyle = 'rgba(255, 165, 0, 0.8)';
          
          if (precinctType.includes('Priority')) {
            fillStyle = 'rgba(255, 0, 0, 0.6)'; // Red for priority precincts
            strokeStyle = 'rgba(255, 0, 0, 0.8)';
          } else if (precinctType.includes('Growth')) {
            fillStyle = 'rgba(0, 128, 0, 0.6)'; // Green for growth areas
            strokeStyle = 'rgba(0, 128, 0, 0.8)';
          }
          
          drawBoundary(ctx, udpFeature.geometry.coordinates[0], centerX, centerY, size, config.width, {
            fill: true,
            strokeStyle: strokeStyle,
            fillStyle: fillStyle,
            lineWidth: 2
          });
        });
        console.log('Finished drawing UDP precinct features');
      } else {
        console.log('No UDP precinct features found in response');
      }
      
      // Draw UDP precinct layer from ArcGIS service for visual reference
      const udpLayerUrl = await proxyRequest(`${udpConfig.baseUrl}/export?${new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${config.width},${config.height}`,
        bbox: bbox,
        bboxSR: 3857,
        imageSR: 3857,
        layers: `show:${udpConfig.layerId}`,
        dpi: 96
      })}`);
      
      const udpLayer = await loadImage(udpLayerUrl);
      drawImage(ctx, udpLayer, canvas.width, canvas.height, 0.7);
      
    } catch (error) {
      console.error('Failed to load UDP precincts:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    
    // Check for LMR zone overlaps
    try {
      console.log('Checking LMR zone overlaps...');
      const lmrOverlap = await checkLMROverlap(feature, centerX, centerY, size);
      console.log('LMR overlap result:', lmrOverlap);
    } catch (error) {
      console.error('Failed to check LMR overlaps:', error);
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
      // Draw legend background
      const legendWidth = 300;
      const legendHeight = 200;
      const padding = 20;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.fillRect(
        canvas.width - legendWidth - padding,
        canvas.height - legendHeight - padding,
        legendWidth,
        legendHeight
      );
      ctx.strokeRect(
        canvas.width - legendWidth - padding,
        canvas.height - legendHeight - padding,
        legendWidth,
        legendHeight
      );
      
      // Add legend title
      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = '#000000';
      ctx.fillText('Legend', canvas.width - legendWidth - padding + 10, canvas.height - legendHeight - padding + 30);
      
      // Add legend items
      const legendItems = [
        { color: '#FF0000', label: 'Property Boundary' },
        { color: '#02d1b8', label: 'Developable Area' },
        { color: 'rgba(255, 165, 0, 0.8)', label: 'UDP Precinct' },
        { color: 'rgba(255, 0, 0, 0.8)', label: 'Priority Precinct' },
        { color: 'rgba(0, 128, 0, 0.8)', label: 'Growth Area' }
      ];
      
      legendItems.forEach((item, index) => {
        const y = canvas.height - legendHeight - padding + 60 + (index * 25);
        
        // Draw color box
        ctx.fillStyle = item.color;
        ctx.fillRect(canvas.width - legendWidth - padding + 20, y - 15, 20, 20);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(canvas.width - legendWidth - padding + 20, y - 15, 20, 20);
        
        // Draw label
        ctx.font = '16px Arial';
        ctx.fillStyle = '#000000';
        ctx.fillText(item.label, canvas.width - legendWidth - padding + 50, y);
      });
    } catch (error) {
      console.warn('Failed to draw legend:', error);
    }

    // Take screenshot
    const screenshot = await canvas.toDataURL('image/png', 1.0);
    
    // Store the screenshot in the feature properties
    if (!feature.properties) {
      feature.properties = {};
    }
    feature.properties.udpPrecinctScreenshot = screenshot;

    return {
      image: screenshot,
      features: udpFeatures
    };
  } catch (error) {
    console.error('Failed to capture UDP precinct map:', error);
    return null;
  }
}

/**
 * Helper function to calculate bounds for the map
 * 
 * @param {Object} feature - GeoJSON feature
 * @param {number} padding - Padding factor
 * @param {Object} developableArea - Optional developable area
 * @param {string} boundsSource - Source for calculating bounds
 * @returns {Object} Object with centerX, centerY, and size
 */
function calculateBounds(feature, padding = 0.3, developableArea = null, boundsSource = 'feature') {
  // Implementation would be imported from shared.js
  // This is a placeholder for the function
  return {
    centerX: 0,
    centerY: 0,
    size: 1000
  };
} 