import { convertToWebMercator, calculateMercatorParams } from './coordinates';
import { drawBoundary } from './canvas';
import * as turf from '@turf/turf';

/**
 * Draws feature boundaries on a canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} feature - GeoJSON feature
 * @param {Number} centerX - Center X coordinate
 * @param {Number} centerY - Center Y coordinate
 * @param {Number} size - Size of the view
 * @param {Number} canvasWidth - Width of the canvas
 * @param {Object} options - Drawing options
 */
export function drawFeatureBoundaries(ctx, feature, centerX, centerY, size, canvasWidth, options = {}) {
  const defaultOptions = {
    strokeStyle: '#FF0000',
    lineWidth: 6,
    showLabels: false
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  // Check if we have multiple features (feature collection with more than 1 feature)
  const hasMultipleFeatures = 
    feature.type === 'FeatureCollection' && 
    feature.features && 
    feature.features.length > 1;
  
  let isVisible = false;
  
  if (feature.type === 'FeatureCollection' && feature.features) {
    // Draw each feature in the collection separately
    feature.features.forEach((featureItem, index) => {
      if (featureItem.geometry?.coordinates?.[0]) {
        // Draw boundary for all features
        const featureVisible = drawBoundary(ctx, featureItem.geometry.coordinates[0], centerX, centerY, size, canvasWidth, {
          strokeStyle: mergedOptions.strokeStyle,
          lineWidth: mergedOptions.lineWidth,
          fillStyle: mergedOptions.fillStyle
        });
        
        // If any feature is visible, set isVisible to true
        if (featureVisible) {
          isVisible = true;
        }
        
        // Add label on centroid ONLY if there are multiple features AND showLabels is true
        if (hasMultipleFeatures && mergedOptions.showLabels) {
          const label = String.fromCharCode(65 + index); // A=65, B=66, etc.
          try {
            // Use visual center for better label placement
            const visualCenter = calculateVisualCenter(featureItem.geometry.coordinates[0]);
            
            if (visualCenter) {
              const [lon, lat] = visualCenter;
              const [mercX, mercY] = convertToWebMercator(lon, lat);
              const { centerMercX, centerMercY, sizeInMeters } = calculateMercatorParams(centerX, centerY, size);
              
              // Transform to canvas coordinates
              const x = ((mercX - (centerMercX - sizeInMeters/2)) / sizeInMeters) * canvasWidth;
              const y = ((centerMercY + sizeInMeters/2 - mercY) / sizeInMeters) * canvasWidth;
              
              // Draw white circle with red stroke
              ctx.beginPath();
              ctx.arc(x, y, 40, 0, Math.PI * 2);
              ctx.fillStyle = '#FFFFFF';
              ctx.fill();
              ctx.strokeStyle = mergedOptions.strokeStyle;
              ctx.lineWidth = 3;
              ctx.stroke();
              
              // Draw label text
              ctx.fillStyle = mergedOptions.strokeStyle;
              ctx.font = 'bold 48px "Public Sans"';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(label, x, y);
            }
          } catch (error) {
            console.warn('Error adding visual center label:', error);
          }
        }
      }
    });
  } else if (feature.geometry?.coordinates?.[0]) {
    // Draw a single feature
    isVisible = drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, canvasWidth, {
      strokeStyle: mergedOptions.strokeStyle,
      lineWidth: mergedOptions.lineWidth,
      fillStyle: mergedOptions.fillStyle
    });
    
    // Add label if needed for single feature
    if (mergedOptions.showLabels && feature.properties) {
      const visualCenter = calculateVisualCenter(feature.geometry.coordinates[0]);
      
      if (visualCenter) {
        const [lon, lat] = visualCenter;
        const [mercX, mercY] = convertToWebMercator(lon, lat);
        const { centerMercX, centerMercY, sizeInMeters } = calculateMercatorParams(centerX, centerY, size);
        
        // Transform to canvas coordinates
        const x = ((mercX - (centerMercX - sizeInMeters/2)) / sizeInMeters) * canvasWidth;
        const y = ((centerMercY + sizeInMeters/2 - mercY) / sizeInMeters) * canvasWidth;
        
        // Draw label
        const label = feature.properties.address || 'Subject Site';
        drawRoundedTextBox(ctx, label, x, y, 10, 5, {
          bgColor: 'rgba(255, 0, 0, 0.7)',
          textColor: 'white',
          fontSize: '14px'
        });
      }
    }
  }
  
  return isVisible;
}

/**
 * Draws developable area boundaries on a canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} developableArea - GeoJSON feature collection
 * @param {Number} centerX - Center X coordinate
 * @param {Number} centerY - Center Y coordinate
 * @param {Number} size - Size of the view
 * @param {Number} canvasWidth - Width of the canvas
 * @param {Boolean} showLabels - Whether to show labels
 */
export function drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, canvasWidth, showLabels = true) {
  if (!developableArea?.features?.length) return;
  
  const hasMultipleAreas = developableArea.features.length > 1;
  
  // Draw all developable area features
  developableArea.features.forEach((feature, index) => {
    if (feature.geometry?.coordinates?.[0]) {
      // Draw boundary for all features
      drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, canvasWidth, {
        strokeStyle: '#00FFFF',
        lineWidth: 12,
        dashArray: [20, 10]
      });
      
      // Add label on centroid ONLY if there are multiple areas AND showLabels is true
      if (hasMultipleAreas && showLabels) {
        const label = String.fromCharCode(65 + index); // A=65, B=66, etc.
        try {
          // Use visual center for better label placement
          const visualCenter = calculateVisualCenter(feature.geometry.coordinates[0]);
          
          if (visualCenter) {
            const [lon, lat] = visualCenter;
            const [mercX, mercY] = convertToWebMercator(lon, lat);
            const { centerMercX, centerMercY, sizeInMeters } = calculateMercatorParams(centerX, centerY, size);
            
            // Transform to canvas coordinates
            const x = ((mercX - (centerMercX - sizeInMeters/2)) / sizeInMeters) * canvasWidth;
            const y = ((centerMercY + sizeInMeters/2 - mercY) / sizeInMeters) * canvasWidth;
            
            // Draw white circle with teal stroke
            ctx.beginPath();
            ctx.arc(x, y, 40, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            ctx.strokeStyle = '#00FFFF';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Draw label text
            ctx.fillStyle = '#00FFFF';
            ctx.font = 'bold 48px "Public Sans"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, x, y);
          }
        } catch (error) {
          console.warn('Error adding developable area visual center label:', error);
        }
      } else if (showLabels) {
        // Single developable area with label
        const visualCenter = calculateVisualCenter(feature.geometry.coordinates[0]);
        
        if (visualCenter) {
          const [lon, lat] = visualCenter;
          const [mercX, mercY] = convertToWebMercator(lon, lat);
          const { centerMercX, centerMercY, sizeInMeters } = calculateMercatorParams(centerX, centerY, size);
          
          // Transform to canvas coordinates
          const x = ((mercX - (centerMercX - sizeInMeters/2)) / sizeInMeters) * canvasWidth;
          const y = ((centerMercY + sizeInMeters/2 - mercY) / sizeInMeters) * canvasWidth;
          
          // Draw label
          const label = feature.properties?.name || 'Developable Area';
          drawRoundedTextBox(ctx, label, x, y, 10, 5, {
            bgColor: 'rgba(0, 255, 255, 0.7)',
            textColor: 'white',
            fontSize: '14px'
          });
        }
      }
    }
  });
}

/**
 * Draws a rounded text box on the canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {String} text - Text to display
 * @param {Number} x - X coordinate
 * @param {Number} y - Y coordinate
 * @param {Number} padding - Padding around text
 * @param {Number} cornerRadius - Radius for rounded corners
 * @param {Object} options - Additional styling options
 */
export function drawRoundedTextBox(ctx, text, x, y, padding = 10, cornerRadius = 5, options = {}) {
  const { 
    bgColor = 'rgba(0, 0, 0, 0.7)', 
    textColor = 'white',
    fontSize = '12px',
    fontFamily = 'Arial, sans-serif'
  } = options;

  ctx.font = `${fontSize} ${fontFamily}`;
  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  const textHeight = parseInt(fontSize) * 1.2;

  const boxWidth = textWidth + padding * 2;
  const boxHeight = textHeight + padding * 2;

  // Draw rounded rectangle
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.moveTo(x - boxWidth / 2 + cornerRadius, y - boxHeight / 2);
  ctx.lineTo(x + boxWidth / 2 - cornerRadius, y - boxHeight / 2);
  ctx.arcTo(x + boxWidth / 2, y - boxHeight / 2, x + boxWidth / 2, y - boxHeight / 2 + cornerRadius, cornerRadius);
  ctx.lineTo(x + boxWidth / 2, y + boxHeight / 2 - cornerRadius);
  ctx.arcTo(x + boxWidth / 2, y + boxHeight / 2, x + boxWidth / 2 - cornerRadius, y + boxHeight / 2, cornerRadius);
  ctx.lineTo(x - boxWidth / 2 + cornerRadius, y + boxHeight / 2);
  ctx.arcTo(x - boxWidth / 2, y + boxHeight / 2, x - boxWidth / 2, y + boxHeight / 2 - cornerRadius, cornerRadius);
  ctx.lineTo(x - boxWidth / 2, y - boxHeight / 2 + cornerRadius);
  ctx.arcTo(x - boxWidth / 2, y - boxHeight / 2, x - boxWidth / 2 + cornerRadius, y - boxHeight / 2, cornerRadius);
  ctx.closePath();
  ctx.fill();

  // Draw text
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

/**
 * Calculate the visual center of a polygon
 * @param {Array} coordinates - Array of coordinate pairs
 * @returns {Array} [x, y] center coordinates
 */
export function calculateVisualCenter(coordinates) {
  if (!coordinates || coordinates.length === 0) return null;
  
  // Use the first ring of coordinates for calculation
  const points = coordinates.map(coord => ({ x: coord[0], y: coord[1] }));
  
  // Calculate centroid
  let sumX = 0;
  let sumY = 0;
  
  points.forEach(point => {
    sumX += point.x;
    sumY += point.y;
  });
  
  return [sumX / points.length, sumY / points.length];
}