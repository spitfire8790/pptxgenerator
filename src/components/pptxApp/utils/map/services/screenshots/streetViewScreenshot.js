import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';
import { LAYER_CONFIGS } from '../../config/layerConfigs';
import { calculateBounds } from './baseScreenshot';
import { createCanvas, drawImage, drawBoundary } from '../../utils/canvas';
import { getWMSImage } from '../wmsService';
import { proxyRequest } from '../../../services/proxyService';
import { loadImage } from '../../utils/image';
import * as turf from '@turf/turf';

export async function captureStreetViewScreenshot(feature) {
  if (!feature) return null;
  
  try {
    // Get the center point of the feature
    const center = turf.center(feature);
    const [centerX, centerY] = center.geometry.coordinates;
    
    // Create a canvas for the street view image
    const canvas = createCanvas(2048, 1024);
    const ctx = canvas.getContext('2d', { alpha: true });
    
    // Fill with a placeholder color
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    try {
      // Get the nearest road to the center point
      const nearestRoad = await getNearestRoad(centerX, centerY);
      
      if (nearestRoad) {
        // Calculate the heading from the center to the nearest road
        const heading = calculateHeading(centerX, centerY, nearestRoad.x, nearestRoad.y);
        
        // Construct the Google Street View API URL
        // Note: This requires a Google API key with Street View Static API enabled
        const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=2048x1024&location=${centerY},${centerX}&heading=${heading}&pitch=0&key=YOUR_API_KEY`;
        
        // Use proxy service to avoid CORS issues
        const proxyStreetViewUrl = await proxyRequest(streetViewUrl);
        
        // Load and draw the street view image
        const streetViewImage = await loadImage(proxyStreetViewUrl);
        drawImage(ctx, streetViewImage, canvas.width, canvas.height, 1.0);
        
        // Add a caption with the address
        ctx.font = 'bold 40px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.fillText(`Street View at ${centerY.toFixed(6)}, ${centerX.toFixed(6)}`, canvas.width / 2, canvas.height - 30);
      } else {
        // Draw a message if no street view is available
        ctx.font = 'bold 60px Arial';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.fillText('No Street View Available for this Location', canvas.width / 2, canvas.height / 2);
      }
    } catch (error) {
      console.warn('Failed to load street view:', error);
      
      // Draw a message if street view loading failed
      ctx.font = 'bold 60px Arial';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.fillText('Street View Loading Failed', canvas.width / 2, canvas.height / 2);
    }
    
    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.warn('Failed to capture street view screenshot:', error);
    return null;
  }
}

// Helper function to get the nearest road to a point
async function getNearestRoad(centerX, centerY) {
  try {
    // This is a placeholder. In a real implementation, you would use a roads API
    // to find the nearest road to the given coordinates.
    // For now, we'll just return a point slightly offset from the center
    return {
      x: centerX + 0.001,
      y: centerY + 0.001
    };
  } catch (error) {
    console.warn('Failed to get nearest road:', error);
    return null;
  }
}

// Helper function to calculate the heading from one point to another
function calculateHeading(fromX, fromY, toX, toY) {
  const dLon = toX - fromX;
  const y = Math.sin(dLon) * Math.cos(toY);
  const x = Math.cos(fromY) * Math.sin(toY) - Math.sin(fromY) * Math.cos(toY) * Math.cos(dLon);
  const heading = Math.atan2(y, x) * 180 / Math.PI;
  return (heading + 360) % 360;
} 