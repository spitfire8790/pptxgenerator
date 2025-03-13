import { LAYER_CONFIGS } from '../../config/layerConfigs';
import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';
import { calculateBounds } from '../screenshot';
import { getWMSImage } from '../wmsService';
import { createCanvas, drawImage, drawBoundary } from '../../utils/canvas';
import proj4 from 'proj4';
import * as turf from '@turf/turf';
import { lgaMapping } from '../../utils/councilLgaMapping';

// SVG paths for Lucide icons (exact paths from Lucide React)
const HOUSE_PATH = "M 2 22 L 2 11 L 12 2 L 22 11 L 22 22 L 14 22 L 14 15 L 10 15 L 10 22 L 2 22 Z"; // Home icon
const BUILDING_PATH = "M 6 2 L 18 2 C 19.1046 2 20 2.89543 20 4 L 20 20 C 20 21.1046 19.1046 22 18 22 L 6 22 C 4.89543 22 4 21.1046 4 20 L 4 4 C 4 2.89543 4.89543 2 6 2 Z M 7 8 L 17 8 M 7 12 L 17 12 M 7 16 L 17 16"; // Building icon

// Add GDA94 definition
const GDA94 = '+proj=longlat +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +no_defs +type=crs';

// Keep track of used label spaces
let usedLabelSpaces = [];

const RESIDENTIAL_TYPES = new Set([
  'Dwelling',
  'Dwelling house',
  'Secondary dwelling',
  'Dual occupancy',
  'Dual occupancy (attached)',
  'Dual occupancy (detached)',
  'Residential flat building',
  'Multi-dwelling housing',
  'Multi-dwelling housing (terraces)',
  'Semi-attached dwelling',
  'Attached dwelling',
  'Semi-detached dwelling',
  'Shop top housing',
  'Boarding house',
  'Seniors housing',
  'Group homes',
  'Group home',
  'Group home (permanent)',
  'Group home (transitional)',
  'Build-to-rent',
  'Co-living',
  'Co-living housing',
  'Manufactured home',
  'Moveable dwelling',
  "Rural worker's dwelling",
  'Independent living units',
  'Manor house',
  'Medium Density Housing',
  'Non-standard Housing',
  'Residential Accommodation',
  'Manor houses'
]);

// Helper function to check if rectangles overlap
function doRectanglesOverlap(rect1, rect2) {
  return !(rect1.x + rect1.width < rect2.x ||
           rect2.x + rect2.width < rect1.x ||
           rect1.y + rect1.height < rect2.y ||
           rect2.y + rect2.height < rect1.y);
}

// Helper function to find best label position
function findBestLabelPosition(x, y, labelWidth, labelHeight, canvasWidth, canvasHeight) {
  const iconSize = 24 * 1.8; // Match the icon scale
  const iconRadius = 14 * 1.8; // Match the circle radius after scaling
  const minDistance = iconRadius + 20; // Minimum distance from icon center to label
  const padding = 10; // Padding from canvas edges
  
  // Possible positions to try (clockwise from top-right, with more options)
  const positions = [
    { x: x + minDistance, y: y - labelHeight / 2 },              // Right center
    { x: x + minDistance, y: y - labelHeight - minDistance },    // Top right
    { x: x - labelWidth - minDistance, y: y - labelHeight / 2 }, // Left center
    { x: x - labelWidth - minDistance, y: y + minDistance },     // Bottom left
    { x: x + minDistance, y: y + minDistance },                  // Bottom right
    { x: x - labelWidth / 2, y: y - labelHeight - minDistance }, // Top center
    { x: x - labelWidth / 2, y: y + minDistance },              // Bottom center
    { x: x - labelWidth - minDistance, y: y - labelHeight - minDistance } // Top left
  ];

  // Try each position
  for (const pos of positions) {
    // Check if label would be within canvas bounds with padding
    if (pos.x < padding || pos.x + labelWidth > canvasWidth - padding ||
        pos.y < padding || pos.y + labelHeight > canvasHeight - padding) {
      continue;
    }

    // Create rectangle for this position
    const newRect = {
      x: pos.x,
      y: pos.y,
      width: labelWidth,
      height: labelHeight
    };

    // Check if this position overlaps with any existing labels
    let hasOverlap = false;
    for (const usedSpace of usedLabelSpaces) {
      if (doRectanglesOverlap(newRect, usedSpace)) {
        hasOverlap = true;
        break;
      }
    }

    // If no overlap found, use this position
    if (!hasOverlap) {
      // Add both the label space and the icon space to used spaces
      usedLabelSpaces.push(newRect);
      usedLabelSpaces.push({
        x: x - iconSize/2,
        y: y - iconSize/2,
        width: iconSize,
        height: iconSize
      });
      return pos;
    }
  }

  // If all standard positions fail, try positions with increased distance
  const fallbackDistances = [minDistance * 1.5, minDistance * 2, minDistance * 2.5];
  
  for (const distance of fallbackDistances) {
    for (const basePos of positions) {
      const adjustedPos = {
        x: x + (basePos.x - x) * (distance / minDistance),
        y: y + (basePos.y - y) * (distance / minDistance)
      };

      // Check canvas bounds
      if (adjustedPos.x < padding || adjustedPos.x + labelWidth > canvasWidth - padding ||
          adjustedPos.y < padding || adjustedPos.y + labelHeight > canvasHeight - padding) {
        continue;
      }

      const newRect = {
        x: adjustedPos.x,
        y: adjustedPos.y,
        width: labelWidth,
        height: labelHeight
      };

      let hasOverlap = false;
      for (const usedSpace of usedLabelSpaces) {
        if (doRectanglesOverlap(newRect, usedSpace)) {
          hasOverlap = true;
          break;
        }
      }

      if (!hasOverlap) {
        usedLabelSpaces.push(newRect);
        usedLabelSpaces.push({
          x: x - iconSize/2,
          y: y - iconSize/2,
          width: iconSize,
          height: iconSize
        });
        return adjustedPos;
      }
    }
  }

  // If all else fails, return a position that's at least within the canvas bounds
  const fallbackPos = {
    x: Math.max(padding, Math.min(canvasWidth - labelWidth - padding, x + minDistance)),
    y: Math.max(padding, Math.min(canvasHeight - labelHeight - padding, y - labelHeight - minDistance))
  };

  usedLabelSpaces.push({
    x: fallbackPos.x,
    y: fallbackPos.y,
    width: labelWidth,
    height: labelHeight
  });
  usedLabelSpaces.push({
    x: x - iconSize/2,
    y: y - iconSize/2,
    width: iconSize,
    height: iconSize
  });
  return fallbackPos;
}

// Add function to draw map pin
function drawMapPin(ctx, x, y, color = '#FF0000', size = 40) {
  // Save context state
  ctx.save();
  
  // Move to pin location
  ctx.translate(x, y);
  
  // Draw shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 5;
  
  // Draw pin stem
  ctx.beginPath();
  ctx.lineWidth = size/8;
  ctx.lineCap = 'round';
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -size);
  ctx.strokeStyle = color;
  ctx.stroke();
  
  // Draw pin head
  ctx.beginPath();
  ctx.arc(0, -size, size/2.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = size/10;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();
  
  // Draw inner circle for more visibility
  ctx.beginPath();
  ctx.arc(0, -size, size/5, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  
  // Restore context state
  ctx.restore();
}

// Helper function to format cost
function formatCost(cost) {
  if (cost >= 1000000) {
    return `$${(cost / 1000000).toFixed(1)}M`;
  }
  return `$${Math.round(cost / 1000)}K`;
}

// Helper function to fetch all DA pages
async function fetchAllDAs(councilName) {
  const allDAs = [];
  let pageNumber = 1;
  const pageSize = 1000; // Fetch maximum records at a time
  
  try {
    const API_BASE_URL = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:5173'
      : 'https://proxy-server.jameswilliamstrutt.workers.dev';

    // Format the filters object according to the API requirements
    const apiFilters = {
      CouncilName: [councilName],
      CostOfDevelopmentFrom: 500000, // Filter DAs with cost >= $500,000
      ApplicationType: ['Development Application'],
      LodgementDateFrom: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 24 months ago in YYYY-MM-DD format
    };

    console.log('Making DA API request with filters:', {
      councilName,
      costThreshold: apiFilters.CostOfDevelopmentFrom,
      applicationType: apiFilters.ApplicationType,
      pageSize,
      pageNumber,
      apiFilters
    });

    const requestBody = {
      url: 'https://api.apps1.nsw.gov.au/eplanning/data/v0/OnlineDA',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'PageSize': pageSize.toString(),
        'PageNumber': pageNumber.toString(),
        'filters': JSON.stringify({ filters: apiFilters })
      }
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${API_BASE_URL}${process.env.NODE_ENV === 'development' ? '/api/proxy' : ''}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText
      });
      throw new Error(`Failed to fetch DAs: ${response.statusText}. Response: ${errorText}`);
    }

    const responseText = await response.text();
    console.log('Raw API Response:', responseText);

    const data = JSON.parse(responseText);
    console.log('Parsed API Response:', {
      totalPages: data.TotalPages,
      applicationCount: data.Application?.length || 0,
      firstApplication: data.Application?.[0],
      lastApplication: data.Application?.[data.Application?.length - 1]
    });

    if (!data || !data.Application) {
      throw new Error('Invalid response format from DA API');
    }

    // Add all applications from this page
    allDAs.push(...data.Application);

    // If there are more pages, fetch them
    if (data.TotalPages > 1) {
      console.log(`Fetching remaining ${data.TotalPages - 1} pages...`);
      const pagePromises = [];
      for (let page = 2; page <= data.TotalPages; page++) {
        pagePromises.push(
          fetch(`${API_BASE_URL}${process.env.NODE_ENV === 'development' ? '/api/proxy' : ''}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              url: 'https://api.apps1.nsw.gov.au/eplanning/data/v0/OnlineDA',
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'PageSize': pageSize.toString(),
                'PageNumber': page.toString(),
                'filters': JSON.stringify({ filters: apiFilters })
              }
            })
          }).then(res => res.json())
        );
      }

      const remainingPages = await Promise.all(pagePromises);
      remainingPages.forEach(page => {
        if (page.Application) {
          allDAs.push(...page.Application);
        }
      });
    }

    return allDAs;
  } catch (error) {
    console.error('Error fetching DAs:', error);
    return [];
  }
}

// Helper function to check if any of the development types are residential
function hasResidentialType(developmentTypes) {
  if (!developmentTypes || !Array.isArray(developmentTypes)) return false;
  return developmentTypes.some(type => RESIDENTIAL_TYPES.has(type.DevelopmentType));
}

// Helper function to draw icon
function drawIcon(ctx, x, y, path, color) {
  const scale = 1.8; // Increased from 1.5 to 1.8 for better visibility
  const size = 24 * scale;
  
  ctx.save();
  ctx.translate(x - size/2, y - size/2);
  ctx.scale(scale, scale);
  
  // Draw icon background (white circle with colored border)
  ctx.beginPath();
  ctx.arc(12, 12, 16, 0, Math.PI * 2); // Increased radius from 14 to 16
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  
  // Draw icon
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Create a new Path2D object from the SVG path
  const iconPath = new Path2D(path);
  ctx.stroke(iconPath);
  
  ctx.restore();
}

// Helper function to draw leader line
function drawLeaderLine(ctx, startX, startY, endX, endY, color) {
  // Calculate angle for line offset
  const angle = Math.atan2(endY - startY, endX - startX);
  
  // Calculate the start point offset from the icon's edge
  const iconRadius = 16 * 1.8; // Match the increased circle radius after scaling
  const startOffsetX = Math.cos(angle) * iconRadius;
  const startOffsetY = Math.sin(angle) * iconRadius;
  
  // Draw white background line (thicker)
  ctx.beginPath();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3; // Increased from 2 to 3 for better visibility
  ctx.moveTo(startX + startOffsetX, startY + startOffsetY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  
  // Draw colored line on top (thinner)
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5; // Increased from 1 to 1.5 for better visibility
  ctx.moveTo(startX + startOffsetX, startY + startOffsetY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
}

// Helper function to draw DA point and label
function drawDAPoint(ctx, x, y, da) {
  const colors = {
    'Lodged': '#FFA500',      // Orange
    'Under Assessment': '#0000FF', // Blue
    'On Exhibition': '#800080',    // Purple
    'Determined': '#008000',   // Green
    'Withdrawn': '#FF0000',    // Red
    'default': '#666666'       // Grey
  };

  const color = colors[da.ApplicationStatus] || colors.default;
  const isResidential = hasResidentialType(da.DevelopmentType);
  
  ctx.save();
  
  // Draw appropriate icon based on development type
  drawIcon(ctx, x, y, isResidential ? HOUSE_PATH : BUILDING_PATH, color);
  
  // Helper function to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', { 
      day: 'numeric',
      month: 'short',
      year: '2-digit'
    });
  };

  // Draw label background
  const labelText = [
    da.Location[0].FullAddress,
    `Type: ${da.DevelopmentType?.map(t => t.DevelopmentType).join(', ') || 'Not specified'}`,
    ...(da.NumberOfNewDwellings ? [`Dwellings: ${da.NumberOfNewDwellings}`] : []),
    `Lodged: ${formatDate(da.LodgementDate)}`,
    `Status: ${da.ApplicationStatus}`,
    `Cost: ${formatCost(da.CostOfDevelopment)}`
  ];

  // Set font and measure text
  const regularFont = '22px "Public Sans", sans-serif';  // Increased from 18px
  const boldFont = 'bold 22px "Public Sans", sans-serif';  // Increased from 18px
  
  const lineHeight = 30;  // Increased from 24
  const padding = 12;  // Increased from 10
  
  // Measure text with appropriate fonts
  ctx.font = boldFont;
  const addressWidth = ctx.measureText(labelText[0]).width;
  
  ctx.font = regularFont;
  const otherWidths = labelText.slice(1).map(line => ctx.measureText(line).width);
  
  const labelWidth = Math.max(addressWidth, ...otherWidths) + (padding * 2);
  const labelHeight = (lineHeight * labelText.length) + (padding * 2);
  
  // Find best position for label
  const { x: labelX, y: labelY } = findBestLabelPosition(x, y, labelWidth, labelHeight, ctx.canvas.width, ctx.canvas.height);
  
  // Draw leader line from circle to label
  const pointCenterX = x;
  const pointCenterY = y;
  const labelCenterX = labelX + labelWidth / 2;
  const labelCenterY = labelY + labelHeight / 2;
  
  // Draw leader line with arrow
  drawLeaderLine(ctx, pointCenterX, pointCenterY, labelCenterX, labelCenterY, color);
  
  // Draw label background with shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 5);
  ctx.fill();
  
  // Draw text with first line bold
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#000000';
  
  // Draw address in bold
  ctx.font = boldFont;
  ctx.fillText(labelText[0], labelX + padding, labelY + padding + lineHeight);
  
  // Draw remaining lines in regular weight
  ctx.font = regularFont;
  labelText.slice(1).forEach((line, index) => {
    ctx.fillText(line, labelX + padding, labelY + padding + lineHeight * (index + 2));
  });
  
  ctx.restore();
}

// Helper function to fetch all CC pages
async function fetchAllCCs(councilName) {
  const allCCs = [];
  let pageNumber = 1;
  const pageSize = 1000; // Fetch maximum records at a time
  
  try {
    const API_BASE_URL = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:5173'
      : 'https://proxy-server.jameswilliamstrutt.workers.dev';

    // Format the filters object according to the API requirements
    const apiFilters = {
      CouncilName: [councilName],
      CostOfDevelopmentFrom: 500000, // Filter CCs with cost >= $500,000
      ApplicationType: ['Construction Certificate'],
      LodgementDateFrom: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 24 months ago in YYYY-MM-DD format
    };

    console.log('Making CC API request with filters:', {
      councilName,
      costThreshold: apiFilters.CostOfDevelopmentFrom,
      applicationType: apiFilters.ApplicationType,
      pageSize,
      pageNumber,
      apiFilters
    });

    const requestBody = {
      url: 'https://api.apps1.nsw.gov.au/eplanning/data/v0/OnlineCC',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'PageSize': pageSize.toString(),
        'PageNumber': pageNumber.toString(),
        'filters': JSON.stringify({ filters: apiFilters })
      }
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${API_BASE_URL}${process.env.NODE_ENV === 'development' ? '/api/proxy' : ''}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText
      });
      throw new Error(`Failed to fetch CCs: ${response.statusText}. Response: ${errorText}`);
    }

    const responseText = await response.text();
    console.log('Raw API Response:', responseText);

    const data = JSON.parse(responseText);
    console.log('Parsed API Response:', {
      totalPages: data.TotalPages,
      applicationCount: data.Application?.length || 0,
      firstApplication: data.Application?.[0],
      lastApplication: data.Application?.[data.Application?.length - 1]
    });

    if (!data || !data.Application) {
      throw new Error('Invalid response format from CC API');
    }

    // Add all applications from this page
    allCCs.push(...data.Application);

    // If there are more pages, fetch them
    if (data.TotalPages > 1) {
      console.log(`Fetching remaining ${data.TotalPages - 1} pages...`);
      const pagePromises = [];
      for (let page = 2; page <= data.TotalPages; page++) {
        pagePromises.push(
          fetch(`${API_BASE_URL}${process.env.NODE_ENV === 'development' ? '/api/proxy' : ''}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              url: 'https://api.apps1.nsw.gov.au/eplanning/data/v0/OnlineCC',
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'PageSize': pageSize.toString(),
                'PageNumber': page.toString(),
                'filters': JSON.stringify({ filters: apiFilters })
              }
            })
          }).then(res => res.json())
        );
      }

      const remainingPages = await Promise.all(pagePromises);
      remainingPages.forEach(page => {
        if (page.Application) {
          allCCs.push(...page.Application);
        }
      });
    }

    return allCCs;
  } catch (error) {
    console.error('Error fetching CCs:', error);
    return [];
  }
}

export async function captureDevelopmentApplicationsMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false) {
  // Reset used label spaces at the start of each capture
  usedLabelSpaces = [];
  
  if (!feature) {
    console.log('No feature provided to captureDevelopmentApplicationsMap');
    return null;
  }
  console.log('Starting development applications map capture with feature:', feature);

  try {
    // Convert array of coordinates to GeoJSON feature if necessary
    let geoJSONFeature;
    
    if (Array.isArray(feature)) {
      // Check if this is a simple array of coordinates or an array of coordinate arrays (multiple features)
      if (feature.length > 0 && Array.isArray(feature[0]) && feature[0].length === 2 && typeof feature[0][0] === 'number') {
        // This is a single polygon's coordinates array
        geoJSONFeature = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [feature]
          }
        };
      } else {
        // This is likely an array of separate feature coordinates
        // Create a FeatureCollection with multiple features
        geoJSONFeature = {
          type: 'FeatureCollection',
          features: feature.map(coords => ({
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [coords]
            }
          }))
        };
      }
    } else {
      // Use the feature as is, but ensure it has valid structure
      geoJSONFeature = feature;
      
      // Validate feature structure and add default values if needed
      if (!geoJSONFeature.type) {
        console.warn('Feature missing type property, defaulting to "Feature"');
        geoJSONFeature.type = 'Feature';
      }
      
      if (!geoJSONFeature.geometry) {
        console.warn('Feature missing geometry property, creating empty geometry');
        geoJSONFeature.geometry = { type: 'Polygon', coordinates: [] };
      } else if (!geoJSONFeature.geometry.coordinates) {
        console.warn('Feature geometry missing coordinates, creating empty coordinates');
        geoJSONFeature.geometry.coordinates = [];
      }
    }

    // Create turf polygons for all property boundaries to check if DAs are within any of them
    let propertyPolygons = [];
    
    if (geoJSONFeature.type === 'FeatureCollection' && geoJSONFeature.features) {
      // Multiple features
      propertyPolygons = geoJSONFeature.features
        .filter(feat => feat.geometry && Array.isArray(feat.geometry.coordinates) && feat.geometry.coordinates.length > 0)
        .map(feat => turf.polygon(feat.geometry.coordinates));
    } else if (geoJSONFeature.geometry && Array.isArray(geoJSONFeature.geometry.coordinates) && geoJSONFeature.geometry.coordinates.length > 0) {
      // Single feature with valid coordinates
      propertyPolygons = [turf.polygon(geoJSONFeature.geometry.coordinates)];
    } else {
      console.warn('No valid geometry coordinates found for property polygons');
    }

    const config = {
      width: 2048,
      height: 2048,
      padding: 0.5
    };
    
    console.log('Calculating bounds...');
    const { centerX, centerY, size } = calculateBounds(geoJSONFeature, config.padding, developableArea, useDevelopableAreaForBounds);
    console.log('Calculated bounds:', { centerX, centerY, size });
    
    // Create base canvas
    console.log('Creating canvas...');
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d', { alpha: true });

    try {
      // 1. Aerial imagery (base)
      console.log('Loading aerial base layer...');
      const aerialConfig = LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL];
      console.log('Aerial config:', aerialConfig);
      const baseMapImage = await getWMSImage(aerialConfig, centerX, centerY, size);
      console.log('Base map image loaded successfully');
      drawImage(ctx, baseMapImage, canvas.width, canvas.height, 0.7);
    } catch (error) {
      console.error('Failed to load aerial layer:', error);
    }

    // Draw boundaries for all features
    console.log('Drawing feature boundaries...');
    if (geoJSONFeature.type === 'FeatureCollection' && geoJSONFeature.features) {
      // Draw each feature in the collection
      geoJSONFeature.features.forEach((feat, index) => {
        if (feat && feat.geometry && Array.isArray(feat.geometry.coordinates) && 
            feat.geometry.coordinates.length > 0 && Array.isArray(feat.geometry.coordinates[0])) {
          console.log(`Drawing feature ${index} boundary`);
          drawBoundary(ctx, feat.geometry.coordinates[0], centerX, centerY, size, config.width, {
            strokeStyle: '#FF0000',
            lineWidth: 6
          });
        } else {
          console.warn(`Feature ${index} has invalid or missing coordinates, skipping boundary drawing`);
        }
      });
    } else if (geoJSONFeature.geometry && Array.isArray(geoJSONFeature.geometry.coordinates) && 
               geoJSONFeature.geometry.coordinates.length > 0 && Array.isArray(geoJSONFeature.geometry.coordinates[0])) {
      // Draw single feature
      console.log('Drawing single feature boundary');
      drawBoundary(ctx, geoJSONFeature.geometry.coordinates[0], centerX, centerY, size, config.width, {
        strokeStyle: '#FF0000',
        lineWidth: 6
      });
    } else {
      console.warn('Feature has invalid or missing coordinates, cannot draw boundary');
    }

    // Draw all developable area features if they exist and should be shown
    if (developableArea?.features?.length > 0 && showDevelopableArea) {
      console.log(`Drawing ${developableArea.features.length} developable area boundaries...`);
      developableArea.features.forEach(feature => {
        drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.width, {
          strokeStyle: '#02d1b8',
          lineWidth: 12,
          dashArray: [20, 10]
        });
      });
    }

    // Fetch and draw DA points
    let daFeatures = [];
    let dasWithinBoundary = [];
    try {
      // Get LGA name from properties - use the first feature's properties if it's a collection
      let lgaName;
      
      if (geoJSONFeature.type === 'FeatureCollection' && geoJSONFeature.features && geoJSONFeature.features.length > 0) {
        // Try to get LGA from the first feature that has it
        for (const feat of geoJSONFeature.features) {
          if (feat.properties?.site_suitability__LGA) {
            lgaName = feat.properties.site_suitability__LGA;
            console.log('Found LGA name in feature collection:', lgaName);
            break;
          }
        }
      } else if (geoJSONFeature.properties?.site_suitability__LGA) {
        lgaName = geoJSONFeature.properties.site_suitability__LGA;
        console.log('Found LGA name in single feature:', lgaName);
      }
      
      if (!lgaName) {
        // If we still don't have an LGA name, check if it's directly in the feature
        if (feature.site_suitability__LGA) {
          lgaName = feature.site_suitability__LGA;
          console.log('Found LGA name directly in feature:', lgaName);
        } else {
          console.warn('No LGA name found in feature properties');
        }
      }
        
      if (lgaName) {
        // Find the council name from the mapping
        const councilName = Object.entries(lgaMapping).find(([council, lga]) => 
          lga.toLowerCase() === lgaName.toLowerCase()
        )?.[0];

        if (councilName) {
          console.log('Fetching DAs for council:', councilName);
          daFeatures = await fetchAllDAs(councilName);
          
          // Filter DAs to only those within any of the property boundaries
          dasWithinBoundary = daFeatures.filter(da => {
            if (da.Location?.[0]?.X && da.Location?.[0]?.Y) {
              const point = turf.point([parseFloat(da.Location[0].X), parseFloat(da.Location[0].Y)]);
              // Check if the point is within any of the property polygons
              return propertyPolygons.some(polygon => turf.booleanPointInPolygon(point, polygon));
            }
            return false;
          });

          console.log(`Found ${dasWithinBoundary.length} DAs within property boundaries out of ${daFeatures.length} total DAs`);
          
          // Draw DA points for all DAs in the council area
          daFeatures.forEach((da, index) => {
            if (da.Location?.[0]?.X && da.Location?.[0]?.Y) {
              // Convert DA coordinates to pixel coordinates
              const x = parseFloat(da.Location[0].X);
              const y = parseFloat(da.Location[0].Y);
              
              console.log(`\nProcessing DA ${index + 1}/${daFeatures.length}`);
              console.log('Original GDA94 coordinates:', {
                address: da.Location[0].FullAddress,
                x,
                y,
                status: da.ApplicationStatus
              });
              
              // Convert from GDA94 to Web Mercator
              const [mercX, mercY] = proj4(GDA94, 'EPSG:3857', [x, y]);
              
              // Convert viewport bounds to Web Mercator
              const [viewportLeft, viewportBottom] = proj4(GDA94, 'EPSG:3857', [centerX - (size / 2), centerY - (size / 2)]);
              const [viewportRight, viewportTop] = proj4(GDA94, 'EPSG:3857', [centerX + (size / 2), centerY + (size / 2)]);
              
              console.log('Viewport bounds in Web Mercator:', {
                left: viewportLeft,
                right: viewportRight,
                top: viewportTop,
                bottom: viewportBottom,
                width: viewportRight - viewportLeft,
                height: viewportTop - viewportBottom
              });

              // Check if point is within viewport bounds
              const isInBounds = mercX >= viewportLeft && mercX <= viewportRight && 
                               mercY >= viewportBottom && mercY <= viewportTop;
              console.log('Point in viewport bounds?', isInBounds);
              
              // Calculate normalized coordinates (0-1 range)
              const viewportWidth = viewportRight - viewportLeft;
              const viewportHeight = viewportTop - viewportBottom;
              const relativeX = (mercX - viewportLeft) / viewportWidth;
              const relativeY = (viewportTop - mercY) / viewportHeight;

              console.log('Normalized coordinates (should be 0-1):', {
                relativeX,
                relativeY,
                viewportWidth,
                viewportHeight
              });

              // Convert to pixel coordinates
              const pixelX = Math.round(relativeX * config.width);
              const pixelY = Math.round(relativeY * config.height);
              console.log('Final pixel coordinates:', {
                pixelX,
                pixelY,
                inCanvas: pixelX >= 0 && pixelX <= config.width && pixelY >= 0 && pixelY <= config.height
              });
              
              if (pixelX >= 0 && pixelX <= config.width && pixelY >= 0 && pixelY <= config.height) {
                console.log('Drawing point at:', pixelX, pixelY);
                drawDAPoint(ctx, pixelX, pixelY, da);
              } else {
                console.log('Point outside canvas bounds:', {
                  address: da.Location[0].FullAddress,
                  pixelX,
                  pixelY,
                  width: config.width,
                  height: config.height
                });
              }
            }
          });
        } else {
          console.warn('Could not find council name mapping for LGA:', lgaName);
        }
      } else {
        console.warn('No LGA name found in feature properties');
      }
    } catch (error) {
      console.error('Error fetching or drawing DAs:', error);
    }

    console.log('Converting canvas to image...');
    const image = canvas.toDataURL('image/png', 1.0);
    console.log('Canvas conversion complete');

    return {
      image,
      daFeatures: dasWithinBoundary // Return only DAs within the boundary
    };
  } catch (error) {
    console.error('Failed to capture development applications map:', error);
    return null;
  }
}

export async function captureConstructionCertificatesMap(feature, developableArea = null) {
  if (!feature) {
    console.log('No feature provided to captureConstructionCertificatesMap');
    return null;
  }
  console.log('Starting construction certificates analysis with feature:', feature);

  try {
    // Validate the feature structure
    if (!feature.type) {
      console.warn('Feature missing type property');
    }
    
    if (!feature.properties && !feature.site_suitability__LGA) {
      console.warn('Feature missing properties, LGA information may be unavailable');
    }
    
    // Get LGA name from properties - use the first feature's properties if it's a collection
    let lgaName;
    
    if (feature.type === 'FeatureCollection' && feature.features && feature.features.length > 0) {
      // Try to get LGA from the first feature that has it
      for (const feat of feature.features) {
        if (feat.properties?.site_suitability__LGA) {
          lgaName = feat.properties.site_suitability__LGA;
          console.log('Found LGA name in feature collection:', lgaName);
          break;
        }
      }
    } else if (feature.properties?.site_suitability__LGA) {
      lgaName = feature.properties.site_suitability__LGA;
      console.log('Found LGA name in single feature:', lgaName);
    }
    
    if (!lgaName) {
      // If we still don't have an LGA name, check if it's directly in the feature
      if (feature.site_suitability__LGA) {
        lgaName = feature.site_suitability__LGA;
        console.log('Found LGA name directly in feature:', lgaName);
      } else {
        console.warn('No LGA name found in feature properties');
        return null;
      }
    }

    // Find the council name from the mapping
    const councilName = Object.entries(lgaMapping).find(([council, lga]) => 
      lga.toLowerCase() === lgaName.toLowerCase()
    )?.[0];

    if (!councilName) {
      console.warn('Could not find council name mapping for LGA:', lgaName);
      return null;
    }

    // Fetch all CCs for the council
    console.log('Fetching CCs for council:', councilName);
    const ccFeatures = await fetchAllCCs(councilName);
    console.log(`Found ${ccFeatures.length} CCs for council ${councilName}`);

    // Filter for residential types
    const residentialCCs = ccFeatures.filter(cc => hasResidentialType(cc.DevelopmentType));
    console.log(`Found ${residentialCCs.length} residential CCs`);

    // Helper function to calculate median
    const calculateMedian = (numbers) => {
      const sorted = numbers.filter(n => n !== undefined && n !== null && !isNaN(n)).sort((a, b) => a - b);
      const middle = Math.floor(sorted.length / 2);
      if (sorted.length === 0) return null;
      if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
      }
      return sorted[middle];
    };

    // Group CCs by development type and calculate statistics
    const typeStats = new Map();
    residentialCCs.forEach(cc => {
      cc.DevelopmentType?.forEach(type => {
        if (RESIDENTIAL_TYPES.has(type.DevelopmentType)) {
          const stats = typeStats.get(type.DevelopmentType) || {
            count: 0,
            gfaPerDwelling: [],
            costPerDwelling: [],
            costPerM2: [],
            builders: new Map()
          };

          stats.count++;

          // Calculate metrics only if we have valid numbers
          if (cc.ProposedGrossFloorArea && cc.UnitsProposed && cc.UnitsProposed > 0) {
            stats.gfaPerDwelling.push(cc.ProposedGrossFloorArea / cc.UnitsProposed);
          }

          if (cc.CostOfDevelopment && cc.UnitsProposed && cc.UnitsProposed > 0) {
            stats.costPerDwelling.push(cc.CostOfDevelopment / cc.UnitsProposed);
          }

          if (cc.CostOfDevelopment && cc.ProposedGrossFloorArea && cc.ProposedGrossFloorArea > 0) {
            stats.costPerM2.push(cc.CostOfDevelopment / cc.ProposedGrossFloorArea);
          }

          // Track builders
          if (cc.BuilderLegalName) {
            stats.builders.set(
              cc.BuilderLegalName,
              (stats.builders.get(cc.BuilderLegalName) || 0) + 1
            );
          }

          typeStats.set(type.DevelopmentType, stats);
        }
      });
    });

    // Convert to final format
    const result = {
      typeStats: Array.from(typeStats.entries()).map(([type, stats]) => {
        // Find top builder
        const topBuilder = Array.from(stats.builders.entries())
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

        return {
          type,
          count: stats.count,
          medianGFAPerDwelling: calculateMedian(stats.gfaPerDwelling),
          medianCostPerDwelling: calculateMedian(stats.costPerDwelling),
          medianCostPerM2: calculateMedian(stats.costPerM2),
          topBuilder
        };
      }),
      totalCount: residentialCCs.length,
      totalCost: residentialCCs.reduce((sum, cc) => sum + (cc.CostOfDevelopment || 0), 0)
    };

    console.log('CC Statistics:', result);
    return result;
  } catch (error) {
    console.error('Failed to analyze construction certificates:', error);
    return null;
  }
}
