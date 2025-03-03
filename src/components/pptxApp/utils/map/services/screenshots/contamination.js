// Contamination map screenshot functionality
import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';
import { createCanvas, drawImage, drawBoundary } from '../../utils/canvas';
import { loadImage } from '../../utils/image';
import { calculateMercatorParams } from '../../utils/coordinates';
import { calculateBounds } from '../screenshot';
import { LAYER_CONFIGS } from '../../config/layerConfigs';
import { proxyRequest } from '../../../services/proxyService';

/**
 * Captures a contamination map screenshot for the given feature
 * 
 * @param {object} feature - The GeoJSON feature
 * @param {object} developableArea - Optional developable area GeoJSON
 * @param {boolean} showDevelopableArea - Whether to show the developable area
 * @returns {Promise<object>} - The screenshot result with image and features
 */
export async function captureContaminationMap(feature, developableArea = null, showDevelopableArea = true) {
  if (!feature) return null;
  console.log('Starting contamination map capture...');

  try {
    const config = {
      width: 2048,
      height: 2048,
      padding: 0.3
    };
    
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea);
    let contaminationFeatures = [];
    
    // Create base canvas
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d', { alpha: true });

    // Load the contamination icon once
    console.log('Loading contamination icon...');
    let contaminationIcon;
    try {
      contaminationIcon = await loadImage('./images/contaminationIcon.webp');
      console.log('Contamination icon loaded successfully');
    } catch (error) {
      console.error('Failed to load contamination icon, trying alternate path:', error);
      try {
        contaminationIcon = await loadImage('/images/contaminationIcon.webp');
        console.log('Contamination icon loaded successfully from alternate path');
      } catch (error) {
        console.error('Failed to load contamination icon from both paths:', error);
        return null;
      }
    }

    // Helper function to draw point features
    const drawPointFeatures = (features, centerX, centerY, size, canvasWidth) => {
      console.log('Drawing point features, count:', features.length);
      
      // Helper function to convert lat/lon to Web Mercator
      const toWebMercator = (lon, lat) => {
        const x = lon * 20037508.34 / 180;
        const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180) * 20037508.34 / 180;
        return [x, y];
      };

      // Helper function to draw rounded rectangle text box
      const drawRoundedTextBox = (ctx, text, x, y, padding = 10) => {
        const cornerRadius = 5;
        
        // Set font and measure text
        const fontSize = 32;
        ctx.font = `normal ${fontSize}px "Public Sans", "Public Sans Regular", sans-serif`;
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;
        const textHeight = fontSize; // Height matches font size
        
        const boxWidth = textWidth + (padding * 2);
        const boxHeight = textHeight + (padding * 2);
        
        // Calculate x position to center the box
        const boxX = x - (boxWidth / 2);
        
        // Draw the rounded rectangle
        ctx.beginPath();
        ctx.moveTo(boxX + cornerRadius, y);
        ctx.lineTo(boxX + boxWidth - cornerRadius, y);
        ctx.quadraticCurveTo(boxX + boxWidth, y, boxX + boxWidth, y + cornerRadius);
        ctx.lineTo(boxX + boxWidth, y + boxHeight - cornerRadius);
        ctx.quadraticCurveTo(boxX + boxWidth, y + boxHeight, boxX + boxWidth - cornerRadius, y + boxHeight);
        ctx.lineTo(boxX + cornerRadius, y + boxHeight);
        ctx.quadraticCurveTo(boxX, y + boxHeight, boxX, y + boxHeight - cornerRadius);
        ctx.lineTo(boxX, y + cornerRadius);
        ctx.quadraticCurveTo(boxX, y, boxX + cornerRadius, y);
        ctx.closePath();
        
        // Fill with light yellow
        ctx.fillStyle = '#f8d265';
        ctx.fill();
        
        // Add black stroke
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Add text - centered in the box
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.fillText(text, boxX + (boxWidth / 2), y + padding + textHeight - 8);
        ctx.textAlign = 'left'; // Reset text alignment
      };

      features.forEach((feature, index) => {
        // Check if coordinates are in properties (EPSG:4283)
        if (feature.properties?.Latitude && feature.properties?.Longitude) {
          console.log(`Drawing point ${index} from properties:`, {
            lon: feature.properties.Longitude,
            lat: feature.properties.Latitude,
            name: feature.properties.SiteName
          });
          
          // Get the point coordinates
          const [x, y] = toWebMercator(feature.properties.Longitude, feature.properties.Latitude);
          
          // Get the center coordinates in Web Mercator
          const [centerMercX, centerMercY] = toWebMercator(centerX, centerY);
          
          // Calculate the size in Web Mercator units (approximate)
          const mercatorSize = size * (20037508.34 / 180);

          // Convert to canvas coordinates
          const canvasX = Math.round(((x - (centerMercX - mercatorSize/2)) / mercatorSize) * canvasWidth);
          const canvasY = Math.round(canvasWidth - ((y - (centerMercY - mercatorSize/2)) / mercatorSize) * canvasWidth);
          
          // Draw the icon (doubled size)
          const iconSize = 96; // Doubled from 48
          ctx.drawImage(
            contaminationIcon,
            canvasX - iconSize/2,  // Center the icon on the point
            canvasY - iconSize/2,
            iconSize,
            iconSize
          );

          // Draw the label below the icon
          if (feature.properties.SiteName) {
            drawRoundedTextBox(
              ctx,
              feature.properties.SiteName,
              canvasX, // Pass center point directly
              canvasY + iconSize/2 + 10 // Position below icon
            );
          }
        }
        // Also handle any features that might have geometry points
        else if (feature.geometry?.type === 'Point') {
          const [lon, lat] = feature.geometry.coordinates;
          
          // Get the point coordinates
          const [x, y] = toWebMercator(lon, lat);
          
          // Get the center coordinates in Web Mercator
          const [centerMercX, centerMercY] = toWebMercator(centerX, centerY);
          
          // Calculate the size in Web Mercator units (approximate)
          const mercatorSize = size * (20037508.34 / 180);

          // Convert to canvas coordinates
          const canvasX = Math.round(((x - (centerMercX - mercatorSize/2)) / mercatorSize) * canvasWidth);
          const canvasY = Math.round(canvasWidth - ((y - (centerMercY - mercatorSize/2)) / mercatorSize) * canvasWidth);
          
          // Draw the icon (ensure consistent size)
          const iconSize = 96; // Make sure this matches the size above
          ctx.drawImage(
            contaminationIcon,
            canvasX - iconSize/2,  // Center the icon on the point
            canvasY - iconSize/2,
            iconSize,
            iconSize
          );

          // Draw the label below the icon if name exists
          if (feature.properties?.SiteName) {
            drawRoundedTextBox(
              ctx,
              feature.properties.SiteName,
              canvasX, // Pass center point directly
              canvasY + iconSize/2 + 10 // Position below icon
            );
          }
        }
      });
    };

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
      console.error('Failed to load aerial layer:', error);
    }

    try {
      // 2. Contamination layer
      console.log('Loading contamination layer...');
      const contaminationConfig = {
        url: 'https://maptest2.environment.nsw.gov.au/arcgis/rest/services/EPA/EPACS/MapServer',
        layerId: 1,
        size: 2048,
        padding: 0.3
      };

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

      const queryUrl = `${contaminationConfig.url}/${contaminationConfig.layerId}/query?${queryParams.toString()}`;
      console.log('Querying contamination features from:', queryUrl);
      const contaminationResponse = await proxyRequest(queryUrl);
      console.log('Contamination Response:', contaminationResponse);
      
      if (contaminationResponse?.features?.length > 0) {
        contaminationFeatures = contaminationResponse.features;
        // Store the features in the feature object
        if (!feature.properties) {
          feature.properties = {};
        }
        feature.properties.site_suitability__contaminationFeatures = contaminationResponse;
        console.log('Stored contamination features:', contaminationFeatures.length);
      }

      // Add the new contamination layer
      try {
        console.log('Loading additional contamination layer...');
        const additionalContaminationConfig = {
          url: 'https://mapprod2.environment.nsw.gov.au/arcgis/rest/services/EPA/Contaminated_land_notified_sites/MapServer',
          layerId: 0,
          size: 2048,
          padding: 0.3
        };

        // Query additional contamination features
        const additionalQueryParams = new URLSearchParams({
          where: '1=1',
          geometry: bbox,
          geometryType: 'esriGeometryEnvelope',
          inSR: 3857,
          spatialRel: 'esriSpatialRelIntersects',
          outFields: '*',
          returnGeometry: true,
          f: 'geojson'
        });

        const additionalQueryUrl = `${additionalContaminationConfig.url}/${additionalContaminationConfig.layerId}/query?${additionalQueryParams.toString()}`;
        console.log('Querying additional contamination features from:', additionalQueryUrl);
        const additionalContaminationResponse = await proxyRequest(additionalQueryUrl);
        console.log('Additional Contamination Response:', additionalContaminationResponse);

        if (additionalContaminationResponse?.features?.length > 0) {
          // Merge with existing features
          contaminationFeatures = [...contaminationFeatures, ...additionalContaminationResponse.features];
          // Store the combined features
          if (!feature.properties) {
            feature.properties = {};
          }
          feature.properties.site_suitability__additionalContaminationFeatures = additionalContaminationResponse;
          console.log('Stored additional contamination features:', additionalContaminationResponse.features.length);
        }
      } catch (error) {
        console.warn('Failed to load additional contamination layer:', error);
      }

      // Then get the image for both layers
      const params = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${contaminationConfig.size},${contaminationConfig.size}`,
        bbox: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        bboxSR: 4283,
        imageSR: 4283,
        layers: `show:${contaminationConfig.layerId}`,
        dpi: 300
      });

      const url = `${contaminationConfig.url}/export?${params.toString()}`;
      console.log('Requesting contamination layer through proxy...', url);
      
      const proxyUrl = await proxyRequest(url);
      if (!proxyUrl) {
        throw new Error('Failed to get proxy URL for contamination layer');
      }
      
      console.log('Loading contamination image from proxy URL...');
      const contaminationLayer = await loadImage(proxyUrl);
      console.log('Contamination layer loaded successfully');
      drawImage(ctx, contaminationLayer, canvas.width, canvas.height, 0.8);

      // Add the additional contamination layer image
      const additionalParams = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${contaminationConfig.size},${contaminationConfig.size}`,
        bbox: `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`,
        bboxSR: 4283,
        imageSR: 4283,
        layers: 'show:0',
        dpi: 300
      });

      const additionalUrl = `${additionalContaminationConfig.url}/export?${additionalParams.toString()}`;
      console.log('Requesting additional contamination layer through proxy...', additionalUrl);
      
      const additionalProxyUrl = await proxyRequest(additionalUrl);
      if (additionalProxyUrl) {
        console.log('Loading additional contamination image from proxy URL...');
        const additionalContaminationLayer = await loadImage(additionalProxyUrl);
        console.log('Additional contamination layer loaded successfully');
        drawImage(ctx, additionalContaminationLayer, canvas.width, canvas.height, 0.8);
      }
    } catch (error) {
      console.warn('Failed to load contamination layer:', error);
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

    // Draw point features from both contamination sources
    if (contaminationFeatures.length > 0) {
      console.log('Drawing contamination point features...');
      drawPointFeatures(contaminationFeatures, centerX, centerY, size, config.width);
    }

    return {
      image: canvas.toDataURL('image/png', 1.0),
      features: contaminationFeatures
    };
  } catch (error) {
    console.error('Failed to capture contamination map:', error);
    return null;
  }
} 