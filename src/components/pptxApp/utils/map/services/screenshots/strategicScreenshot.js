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

// Layer configurations
const LAYER_CONFIG_AERIAL = {
  url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service',
  layers: 'Australia_latest',
  opacity: 0.5,
  width: 2048,
  height: 2048,
  padding: 0.2,
  dpi: 300
};

const LAYER_CONFIG_LMR = {
  url: 'https://spatialportalarcgis.dpie.nsw.gov.au/sarcgis/rest/services/LMR/LMR/MapServer',
  size: 2048,
  width: 2048, 
  height: 2048,
  padding: 6,
  dpi: 300
};

/**
 * Utility function to draw a rounded text box
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to display
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} padding - Padding around text
 * @param {number} cornerRadius - Corner radius
 * @param {Object} options - Additional options
 */
function drawRoundedTextBox(ctx, text, x, y, padding = 10, cornerRadius = 5, options = {}) {
  // Default options
  const opts = {
    bgColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: '#002664',
    textColor: '#002664',
    borderWidth: 2,
    font: 'bold 24px Public Sans',
    textAlign: 'center',
    textBaseline: 'middle',
    ...options
  };

  // Set font to measure text
  ctx.font = opts.font;
  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  const textHeight = parseInt(opts.font.match(/\d+/)[0]);

  // Calculate box dimensions
  const boxWidth = textWidth + (padding * 2);
  const boxHeight = textHeight + (padding * 2);

  // Calculate positions to center the box on the point
  const boxX = x - (boxWidth / 2);
  const boxY = y - (boxHeight / 2);

  // Draw rounded rectangle
  ctx.beginPath();
  ctx.moveTo(boxX + cornerRadius, boxY);
  ctx.lineTo(boxX + boxWidth - cornerRadius, boxY);
  ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + cornerRadius);
  ctx.lineTo(boxX + boxWidth, boxY + boxHeight - cornerRadius);
  ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - cornerRadius, boxY + boxHeight);
  ctx.lineTo(boxX + cornerRadius, boxY + boxHeight);
  ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - cornerRadius);
  ctx.lineTo(boxX, boxY + cornerRadius);
  ctx.quadraticCurveTo(boxX, boxY, boxX + cornerRadius, boxY);
  ctx.closePath();

  // Fill and stroke
  ctx.fillStyle = opts.bgColor;
  ctx.fill();
  ctx.strokeStyle = opts.borderColor;
  ctx.lineWidth = opts.borderWidth;
  ctx.stroke();

  // Draw text
  ctx.fillStyle = opts.textColor;
  ctx.textAlign = opts.textAlign;
  ctx.textBaseline = opts.textBaseline;
  ctx.fillText(text, x, y);
}

/**
 * Captures a UDP precinct map with the specified feature
 * @param {Object} feature - GeoJSON feature to display
 * @param {Object} developableArea - Optional developable area to display
 * @param {boolean} showDevelopableArea - Whether to show developable areas
 * @param {boolean} useDevelopableAreaForBounds - Whether to use developable area for bounds calculation
 * @param {boolean} showLabels - Whether to show feature labels
 * @param {boolean} showDevelopableAreaLabels - Whether to show developable area labels
 * @returns {Promise<Object>} Object containing the dataURL and udpFeatures
 */
export async function captureUDPPrecinctMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false, showLabels = true, showDevelopableAreaLabels = false) {
  if (!feature) return null;
  console.log('Starting UDP precinct map capture...', {
    featureType: feature.type,
    hasMultipleFeatures: feature.type === 'FeatureCollection' && feature.features?.length > 1,
    developableArea: developableArea ? 'provided' : 'not provided',
    useDevelopableAreaForBounds
  });

  try {
    const config = {
      width: LAYER_CONFIG_LMR.width,
      height: LAYER_CONFIG_LMR.height,
      padding: LAYER_CONFIG_LMR.padding
    };
    
    // Use the useDevelopableAreaForBounds parameter instead of hardcoding to false
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
    console.log('Calculated bounds:', { centerX, centerY, size });
    
    // Create base canvas
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d', { alpha: true });
    
    // Start with a white background to prevent transparency issues
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    try {
      // 1. Aerial imagery (base)
      console.log('Loading aerial base layer...');
      const aerialConfig = LAYER_CONFIG_AERIAL;
      const { bbox } = calculateMercatorParams(centerX, centerY, size);
      console.log('Calculated Mercator bbox:', bbox);
      
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
      console.log('Requesting aerial base layer:', url);
      const baseMap = await loadImage(url);
      drawImage(ctx, baseMap, canvas.width, canvas.height, 0.5);
      console.log('Aerial base layer loaded and drawn');
    } catch (error) {
      console.error('Failed to load aerial layer:', error);
      // Continue with white background
    }

    // Store feature reference for returning
    if (!feature.properties) {
      feature.properties = {};
    }

    try {
      // 1.5. LMR layers from ArcGIS REST service
      console.log('Loading LMR layers...');
      const lmrConfig = LAYER_CONFIG_LMR;
      
      // Create GDA94 bbox for the LMR service
      const gda94Bbox = `${centerX - size/2},${centerY - size/2},${centerX + size/2},${centerY + size/2}`;
      console.log('Using GDA94 bbox for LMR service:', gda94Bbox);
      
      const lmrParams = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        size: `${lmrConfig.size},${lmrConfig.size}`,
        bbox: gda94Bbox,
        bboxSR: 4283, // GDA94
        imageSR: 3857, // Web Mercator
        layers: 'show:0,1,2,3,4', // Show all LMR layers
        dpi: lmrConfig.dpi
      });

      // Create a POST request for the LMR service instead of GET
      const lmrUrl = `${lmrConfig.url}/export`;
      console.log('Requesting LMR layers through proxy...', `${lmrUrl}?${lmrParams.toString()}`);
      
      const lmrProxyUrl = await proxyRequest(lmrUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'image/png,*/*'
        },
        body: lmrParams.toString(),
        timeout: 300000 // 5 minutes timeout for LMR service
      });
      
      if (lmrProxyUrl) {
        console.log('Loading LMR image from proxy URL...');
        const lmrLayer = await loadImage(lmrProxyUrl);
        console.log('LMR layers loaded successfully');
        drawImage(ctx, lmrLayer, canvas.width, canvas.height, 0.7); // Adjust opacity as needed
      } else {
        console.warn('Failed to get proxy URL for LMR layers');
      }
    } catch (error) {
      console.warn('Failed to load LMR layers:', error);
    }
    
    // Initialize variable to store UDP features
    let udpFeatures = [];
    
    try {
      // 2. UDP Precincts layer
      console.log('Loading UDP precincts...');
      const udpResponse = await fetch('/UDP_Precincts.geojson');
      const udpData = await udpResponse.json();
      
      if (udpData.features?.length > 0) {
        console.log(`Drawing ${udpData.features.length} UDP precinct features...`);
        
        // Store the features for return
        udpFeatures = udpData.features;
        
        // Set font for labels before drawing features
        ctx.font = 'bold 24px Public Sans';

        // Create a Set to track already labeled precinct names to avoid duplicates
        const labeledPrecincts = new Set();
        
        // Define the visible bounds of the map for label visibility check
        const mapBounds = {
          minX: centerX - size/2,
          minY: centerY - size/2,
          maxX: centerX + size/2,
          maxY: centerY + size/2
        };

        udpData.features.forEach((precinctFeature, index) => {
          console.log(`Drawing UDP precinct feature ${index + 1}...`);
          if (precinctFeature.geometry?.coordinates) {
            // For MultiPolygon, draw each polygon
            if (precinctFeature.geometry.type === 'MultiPolygon') {
              precinctFeature.geometry.coordinates.forEach(polygonCoords => {
                polygonCoords.forEach(coords => {
                  drawBoundary(ctx, coords, centerX, centerY, size, config.width, {
                    fill: true,
                    strokeStyle: 'rgba(4, 170, 229, 0.8)',
                    fillStyle: 'rgba(4, 170, 229, 0.3)',
                    lineWidth: 2
                  });
                });
              });
            } else if (precinctFeature.geometry.type === 'Polygon') {
              // For single Polygon
              precinctFeature.geometry.coordinates.forEach(coords => {
                drawBoundary(ctx, coords, centerX, centerY, size, config.width, {
                  fill: true,
                  strokeStyle: 'rgba(4, 170, 229, 0.8)',
                  fillStyle: 'rgba(4, 170, 229, 0.3)',
                  lineWidth: 2
                });
              });
            }

            // Get precinct name
            const precinctName = precinctFeature.properties?.precinct_name || precinctFeature.properties?.Precinct_Name;
            
            // Skip if this precinct has already been labeled or has no name
            if (!precinctName || labeledPrecincts.has(precinctName)) {
              return;
            }

            // Calculate centroid for label placement
            let bounds = {
              minX: Infinity,
              minY: Infinity,
              maxX: -Infinity,
              maxY: -Infinity
            };

            const updateBounds = (coords) => {
              coords.forEach(coord => {
                bounds.minX = Math.min(bounds.minX, coord[0]);
                bounds.minY = Math.min(bounds.minY, coord[1]);
                bounds.maxX = Math.max(bounds.maxX, coord[0]);
                bounds.maxY = Math.max(bounds.maxY, coord[1]);
              });
            };

            if (precinctFeature.geometry.type === 'MultiPolygon') {
              precinctFeature.geometry.coordinates.forEach(polygonCoords => {
                polygonCoords.forEach(coords => {
                  updateBounds(coords);
                });
              });
            } else {
              precinctFeature.geometry.coordinates.forEach(coords => {
                updateBounds(coords);
              });
            }

            // Calculate centroid from bounds
            const centroidX = (bounds.minX + bounds.maxX) / 2;
            const centroidY = (bounds.minY + bounds.maxY) / 2;

            // Check if centroid is within map bounds before drawing label
            if (centroidX >= mapBounds.minX && centroidX <= mapBounds.maxX && 
                centroidY >= mapBounds.minY && centroidY <= mapBounds.maxY) {
              
              // Convert centroid to canvas coordinates
              const canvasX = ((centroidX - (centerX - size/2)) / size) * config.width;
              const canvasY = config.height - ((centroidY - (centerY - size/2)) / size) * config.height;

              // Draw label
              console.log(`Drawing label for ${precinctName} at (${canvasX}, ${canvasY})`);
              drawRoundedTextBox(ctx, `${precinctName} UDP Precinct`, canvasX, canvasY);
              
              // Add to set of labeled precincts to avoid duplicates
              labeledPrecincts.add(precinctName);
            }
          }
        });
        
        // Store UDP precincts in feature properties for reference only
        feature.properties.udpPrecincts = udpData.features;
      }
    } catch (error) {
      console.error('Failed to load UDP precincts:', error);
    }

    // IMPORTANT: Draw developable area and feature boundaries AFTER all other layers
    
    // Draw developable areas if they exist and are requested to be shown
    if (developableArea?.features?.length > 0 && showDevelopableArea) {
      console.log('Drawing developable area boundaries...');
      drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width, showDevelopableAreaLabels, {
        strokeStyle: 'rgba(0, 150, 136, 0.9)', // Custom teal color
        lineWidth: 3, 
        lineDash: [10, 5] // Dashed line pattern
      });
    }

    // Draw all features with increased visibility
    if (feature.type === 'FeatureCollection' && feature.features?.length > 0) {
      console.log('Drawing multiple features:', feature.features.length);
      feature.features.forEach((f, index) => {
        drawFeatureBoundaries(ctx, f, centerX, centerY, size, config.width, {
          showLabels: showLabels, // Use the showLabels parameter
          strokeStyle: 'rgba(255, 0, 0, 0.9)', // More opaque red
          lineWidth: 6 // Keep thick line width for visibility
        });
      });
    } else {
      // Single feature case
      console.log('Drawing single feature');
      drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width, {
        showLabels: showLabels, // Use the showLabels parameter
        strokeStyle: 'rgba(255, 0, 0, 0.9)', // More opaque red
        lineWidth: 6 // Keep thick line width for visibility
      });
    }

    // Add legend - increased size to accommodate all items
    const legendHeight = 380; // Increased height
    const legendWidth = 450; // Increased width
    const padding = 20;
    const legendX = canvas.width - legendWidth - padding;
    const legendY = canvas.height - legendHeight - padding;

    // Calculate icon size and spacing
    const iconSize = 20;
    const iconTextGap = 30; // Increased from 15 to 30 to prevent text overlap with icons
    const itemVerticalSpacing = 45; // Space between legend items

    // Draw legend background with border
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#002664';
    ctx.lineWidth = 2;
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

    // Define text position for all legend items including title
    const textX = legendX + padding + iconSize + iconTextGap;

    // Legend title
    ctx.font = 'bold 28px Public Sans';
    ctx.fillStyle = '#002664';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText('Planning Precincts', textX, legendY + padding);

    // Legend items - include both UDP and LMR layers
    const legendItems = [
      { color: 'rgba(4, 170, 229, 0.5)', label: 'UDP Growth Precinct' },
      { color: 'rgb(118, 117, 114)', label: 'LMR Station', type: 'point' },
      { color: 'rgb(209, 225, 240)', label: 'LMR Centre', type: 'point' },
      { color: 'rgb(182, 154, 177)', label: 'TOD Accelerated Rezoning Area', type: 'area' },
      { color: 'rgb(208, 181, 204)', label: 'TOD Area', type: 'area' },
      { color: 'rgb(239, 216, 175)', label: 'Indicative LMR Housing Area', type: 'area' }
    ];

    ctx.textBaseline = 'middle';
    ctx.font = '22px Public Sans';

    legendItems.forEach((item, index) => {
      const y = legendY + padding + 60 + (index * itemVerticalSpacing);
      
      if (item.type === 'point') {
        // Draw circle for point features
        ctx.beginPath();
        ctx.arc(legendX + padding + (iconSize/2), y, iconSize/2, 0, 2 * Math.PI);
        ctx.fillStyle = item.color;
        ctx.fill();
        ctx.strokeStyle = '#363636';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // Draw color box for area features
        ctx.fillStyle = item.color;
        ctx.fillRect(legendX + padding, y - (iconSize/2), iconSize, iconSize);
        ctx.strokeStyle = '#363636';
        ctx.lineWidth = 1;
        ctx.strokeRect(legendX + padding, y - (iconSize/2), iconSize, iconSize);
      }
      
      // Draw label with more space between icon and text
      ctx.fillStyle = '#363636';
      ctx.textAlign = 'left'; // Ensure text alignment is explicitly set to left
      ctx.fillText(item.label, legendX + padding + iconSize + iconTextGap, y);
    });

    // Return the screenshot and UDP features
    return {
      dataURL: canvas.toDataURL('image/png', 1.0),
      udpFeatures: udpFeatures
    };
  } catch (error) {
    console.error('Failed to capture UDP precinct map:', error);
    console.error('Error stack:', error.stack);
    return null;
  }
}