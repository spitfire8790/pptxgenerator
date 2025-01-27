// Import utility functions for converting coordinates between different mapping systems
import { convertToWebMercator, calculateMercatorParams } from './coordinates';

// Creates and returns a new HTML canvas element with specified dimensions
export function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// Draws an image onto a canvas context with optional opacity
// ctx: Canvas 2D rendering context
// image: The image to draw
// width/height: Dimensions to draw the image
// opacity: Optional transparency value (default 1.0 = fully opaque)
export function drawImage(ctx, image, width, height, opacity = 1.0) {
  ctx.globalAlpha = opacity;
  ctx.drawImage(image, 0, 0, width, height);
  ctx.globalAlpha = 1.0;
}

// Draws a boundary/polygon on the canvas using geographic coordinates
// ctx: Canvas 2D rendering context
// coordinates: Array of [longitude, latitude] pairs forming the boundary
// centerX/centerY: Center point of the map view
// size: Zoom level or scale factor
// canvasSize: Size of the canvas (assumed square)
// style: Optional object containing visual properties (strokeStyle, lineWidth, dashArray)
export function drawBoundary(ctx, coordinates, centerX, centerY, size, canvasSize, style = {}) {
  if (!coordinates || !Array.isArray(coordinates)) {
    console.error('Invalid coordinates:', coordinates);
    return;
  }

  const { scale = 1, offsetX = 0, offsetY = 0 } = style;

  // Save current context state
  ctx.save();

  // Apply transformations if provided
  if (scale !== 1 || offsetX !== 0 || offsetY !== 0) {
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
  }

  // Set up line styling with defaults
  ctx.strokeStyle = style.strokeStyle || '#FF0000';
  ctx.lineWidth = style.lineWidth !== undefined ? style.lineWidth : Math.max(canvasSize / 256, 5);
  
  // Set fill style if specified
  if (style.fillStyle) {
    ctx.fillStyle = style.fillStyle;
  }
  
  // Apply dashed line pattern if specified
  if (style.dashArray) {
    ctx.setLineDash(style.dashArray);
  }
  
  // Begin drawing the boundary path
  ctx.beginPath();

  // Process each coordinate pair
  coordinates.forEach((coord, i) => {
    if (!Array.isArray(coord) || coord.length < 2) {
      console.warn('Invalid coordinate pair:', coord);
      return;
    }
    // Convert geographic coordinates to Web Mercator projection
    const [mercX, mercY] = convertToWebMercator(coord[0], coord[1]);
    // Calculate Web Mercator parameters for the current view
    const { centerMercX, centerMercY, sizeInMeters } = calculateMercatorParams(centerX, centerY, size);
    
    // Transform Web Mercator coordinates to canvas pixel coordinates
    const x = ((mercX - (centerMercX - sizeInMeters/2)) / sizeInMeters) * canvasSize;
    const y = ((centerMercY + sizeInMeters/2 - mercY) / sizeInMeters) * canvasSize;
    
    // First point starts the path, subsequent points connect to previous point
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  // Close the path
  ctx.closePath();
  
  // Fill if fillStyle is specified
  if (style.fill && style.fillStyle) {
    ctx.fill();
  }
  
  // Stroke the path
  ctx.stroke();
  
  // Reset dash pattern
  ctx.setLineDash([]);

  // Restore context state
  ctx.restore();
}

export function drawPolyline(ctx, coordinates, centerX, centerY, size, canvasSize, style = {}, isWebMercator = false) {
  if (!coordinates || !Array.isArray(coordinates)) {
    console.error('Invalid coordinates:', coordinates);
    return;
  }

  ctx.strokeStyle = style.strokeStyle || '#0000FF';
  ctx.lineWidth = style.lineWidth !== undefined ? style.lineWidth : Math.max(canvasSize / 256, 3);
  
  if (style.dashArray) {
    ctx.setLineDash(style.dashArray);
  }
  
  ctx.beginPath();

  coordinates.forEach((coord, i) => {
    if (!Array.isArray(coord) || coord.length < 2) {
      console.warn('Invalid coordinate pair:', coord);
      return;
    }
    
    // Convert geographic coordinates to Web Mercator projection if they aren't already
    const [webMercX, webMercY] = convertToWebMercator(coord[0], coord[1]);
    const { centerMercX, centerMercY, sizeInMeters } = calculateMercatorParams(centerX, centerY, size);
    
    // Transform Web Mercator coordinates to canvas pixel coordinates
    const x = ((webMercX - (centerMercX - sizeInMeters/2)) / sizeInMeters) * canvasSize;
    const y = ((centerMercY + sizeInMeters/2 - webMercY) / sizeInMeters) * canvasSize;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  
  ctx.stroke();
  ctx.setLineDash([]);
}
