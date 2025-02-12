import { LAYER_CONFIGS } from '../../config/layerConfigs';
import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';
import { calculateMercatorParams } from '../../utils/coordinates';
import { calculateBounds } from '../screenshot';
import { getWMSImage } from '../wmsService';
import { getArcGISImage } from '../arcgisService';
import { createCanvas, drawImage, drawBoundary, drawPolyline } from '../../utils/canvas';
import { proxyRequest } from '../../../services/proxyService';
import { loadImage } from '../../utils/image';
import { giraffeState } from '@gi-nx/iframe-sdk';
import proj4 from 'proj4';
import { getPTALToken } from '../tokenService';
import * as turf from '@turf/turf';

// Add GDA94 definition
const GDA94 = '+proj=longlat +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +no_defs +type=crs';

async function generateGPRToken() {
  try {
    console.log('Requesting GPR token...');
    const url = 'https://arcgis.paggis.nsw.gov.au/arcgis/tokens/generateToken?username=GPX_User&password=GP^_U$3R';
    
    const response = await fetch(url, {
      method: 'POST'
    });

    const token = await response.text();
    console.log('Token response (raw):', token);
    
    if (!token || token.includes('error')) {
      console.error('Token generation failed:', token);
      throw new Error(`Token generation failed: ${token}`);
    }

    // Remove any whitespace or newlines
    const cleanToken = token.trim();
    console.log('Successfully generated token');
    return cleanToken;
  } catch (error) {
    console.error('Failed to generate GPR token:', error);
    throw error;
  }
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

export async function captureGPRMap(feature, developableArea = null) {
  if (!feature) {
    console.log('No feature provided to captureGPRMap');
    return null;
  }
  console.log('Starting GPR capture with feature:', feature);

  try {
    // Convert array of coordinates to GeoJSON feature if necessary
    const geoJSONFeature = Array.isArray(feature) ? {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [feature]
      }
    } : feature;

    const config = {
      width: 2048,
      height: 2048,
      padding: 0.2  // Increased padding for more context
    };
    
    console.log('Calculating bounds...');
    const { centerX, centerY, size } = calculateBounds(geoJSONFeature, config.padding, developableArea);
    console.log('Calculated bounds:', { centerX, centerY, size });
    
    let gprFeatures = [];
    
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
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }

    try {
      // 2. GPR layer from ArcGIS
      console.log('Starting GPR layer capture...');
      const gprConfig = {
        url: 'https://arcgis.paggis.nsw.gov.au/arcgis/rest/services/GPR/GPR_shared/MapServer',
        layers: '2',
        width: config.width,
        height: config.height
      };

      // Get fresh token
      console.log('Generating fresh GPR token...');
      const token = await generateGPRToken();
      console.log('Raw token received:', token);
      gprConfig.token = token;
      console.log('Token set in config:', gprConfig.token);

      console.log('Calculating Mercator parameters...');
      const mercatorParams = calculateMercatorParams(centerX, centerY, size);
      console.log('Mercator parameters:', mercatorParams);
      const { bbox } = mercatorParams;

      // Transform bbox from Web Mercator to GDA94
      const [minX, minY, maxX, maxY] = bbox.split(',').map(Number);
      const transformPoint = (x, y) => {
        const [lon, lat] = proj4('EPSG:3857', GDA94, [x, y]);
        return [lon, lat];
      };

      const [minLon, minLat] = transformPoint(minX, minY);
      const [maxLon, maxLat] = transformPoint(maxX, maxY);
      const gda94Bbox = `${minLon},${minLat},${maxLon},${maxLat}`;

      console.log('Transformed bbox to GDA94:', {
        original: bbox,
        transformed: gda94Bbox
      });

      // Get the GPR layer image using GDA94 coordinates
      console.log('Getting GPR image...');
      if (!gprConfig.token) {
        throw new Error('No token available for GPR request');
      }
      
      const arcGISUrl = `${gprConfig.url}/export?bbox=${gda94Bbox}&size=${config.width},${config.height}&dpi=96&format=png&transparent=true&layers=show:${gprConfig.layers}&token=${gprConfig.token}&f=image&bboxSR=4283&imageSR=3857`;
      console.log('GPR request URL:', arcGISUrl);
      
      try {
        const response = await fetch(arcGISUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        const gprImage = await loadImage(imageUrl);
        URL.revokeObjectURL(imageUrl);
        
        console.log('GPR image received');
        drawImage(ctx, gprImage, canvas.width, canvas.height, 0.8);
        console.log('GPR layer drawn');
      } catch (error) {
        console.error('Failed to load GPR image:', error);
      }

      // Get the features for scoring using GDA94 coordinates
      const params = new URLSearchParams({
        where: '1=1',
        geometry: gda94Bbox,
        geometryType: 'esriGeometryEnvelope',
        inSR: 4283,
        outSR: 4283,
        spatialRel: 'esriSpatialRelIntersects',
        outFields: 'AGENCY_NAME,PROPERTY_NAME,PRIMARY_USE_TYPE,IMPROVEMENTS,OBJECTID',
        returnGeometry: true,
        f: 'geojson',
        token: gprConfig.token
      });

      const url = `${gprConfig.url}/2/query?${params.toString()}`;
      console.log('Making GPR feature request...');
      
      const gprResponse = await proxyRequest(url);
      console.log('GPR feature response received:', {
        hasFeatures: !!gprResponse?.features,
        featureCount: gprResponse?.features?.length,
        type: gprResponse?.type,
        status: gprResponse?.status
      });

      if (gprResponse?.features?.length > 0) {
        console.log(`Found ${gprResponse.features.length} GPR features`);
        // Process features to extract properties
        gprFeatures = gprResponse.features.map(feature => ({
          ...feature,
          properties: {
            ...feature.properties,
            AGENCY_NAME: feature.properties?.AGENCY_NAME || 'Unknown Agency',
            PROPERTY_NAME: feature.properties?.PROPERTY_NAME || 'Unnamed Property',
            PRIMARY_USE_TYPE: feature.properties?.PRIMARY_USE_TYPE || 'Unknown Use',
            IMPROVEMENTS: feature.properties?.IMPROVEMENTS || 'No improvements data'
          }
        }));
      } else {
        console.warn('No GPR features found in response');
      }
    } catch (error) {
      console.error('Failed to load GPR layer:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }

    // Draw boundaries
    console.log('Drawing main feature boundary...');
    if (geoJSONFeature?.geometry?.coordinates?.[0]) {
      drawBoundary(ctx, geoJSONFeature.geometry.coordinates[0], centerX, centerY, size, config.width, {
        strokeStyle: '#FF0000',
        lineWidth: 6
      });
    } else {
      console.warn('No valid coordinates found for boundary drawing');
    }

    if (developableArea?.features?.[0]?.geometry?.coordinates?.[0]) {
      console.log('Drawing developable area boundary...');
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    // Calculate centroid of developable area and draw pin - moved to end and fixed CRS
    if (developableArea?.features?.[0]?.geometry?.coordinates?.[0]) {
      console.log('Calculating developable area centroid...');
      // First transform the coordinates from Web Mercator to GDA94
      const coordinates = developableArea.features[0].geometry.coordinates[0].map(coord => {
        return proj4('EPSG:3857', GDA94, coord);
      });
      
      // Create polygon with GDA94 coordinates
      const polygon = turf.polygon([coordinates]);
      const centroid = turf.centroid(polygon);
      
      // Transform centroid back to Web Mercator
      const [mercX, mercY] = proj4(GDA94, 'EPSG:3857', centroid.geometry.coordinates);
      
      console.log('Coordinate debug:', {
        originalCoords: developableArea.features[0].geometry.coordinates[0][0],
        gda94Coords: coordinates[0],
        centroidGDA94: centroid.geometry.coordinates,
        centroidMercator: [mercX, mercY],
        mapCenter: [centerX, centerY],
        mapSize: size
      });

      // Convert Web Mercator coordinates to pixel coordinates
      const pixelX = Math.round(((mercX - (centerX - size/2)) / size) * config.width),
            pixelY = Math.round(config.height - ((mercY - (centerY - size/2)) / size) * config.height);
      
      console.log('Drawing map pin at:', { 
        pixelX, 
        pixelY,
        canvasSize: { width: config.width, height: config.height }
      });

      // Only draw if the coordinates are within the canvas
      if (pixelX >= 0 && pixelX <= config.width && pixelY >= 0 && pixelY <= config.height) {
        // Clear a small area around the pin to ensure visibility
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(pixelX, pixelY - 100, 100, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Draw the pin with shadow and white outline
        drawMapPin(ctx, pixelX, pixelY, '#FF0000', 120);
      } else {
        console.warn('Pin coordinates outside canvas bounds:', { pixelX, pixelY });
      }
    }

    console.log('Converting canvas to image...');
    const image = canvas.toDataURL('image/png', 1.0);
    console.log('Canvas conversion complete:', {
      imageLength: image?.length || 0,
      startsWithData: image?.startsWith('data:') || false,
      imageType: typeof image
    });

    console.log('Returning result with', {
      hasImage: !!image,
      featureCount: gprFeatures.length,
      imageLength: image?.length || 0
    });

    return {
      image,
      features: gprFeatures
    };
  } catch (error) {
    console.error('Failed to capture GPR map:', error);
    console.error('Full error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return null;
  }
}

export async function captureServicesAndAmenitiesMap(feature, developableArea = null) {
  if (!feature) {
    console.log('No feature provided to captureServicesAndAmenitiesMap');
    return null;
  }
  console.log('Starting services and amenities capture with feature:', feature);

  try {
    // Convert array of coordinates to GeoJSON feature if necessary
    const geoJSONFeature = Array.isArray(feature) ? {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [feature]
      }
    } : feature;

    const config = {
      width: 2048,
      height: 2048,
      padding: 0.3  // Increased padding for more context
    };
    
    console.log('Calculating bounds...');
    const { centerX, centerY, size } = calculateBounds(geoJSONFeature, config.padding, developableArea);
    console.log('Calculated bounds:', { centerX, centerY, size });
    
    let poiFeatures = [];
    let servicesData = 'No services or amenities found in the immediate vicinity.';
    
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

    try {
      // 2. POI layer from ArcGIS
      console.log('Starting POI layer capture...');
      const poiConfig = {
        url: 'https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_POI/MapServer',
        layerId: 0
      };

      console.log('Calculating Mercator parameters...');
      const mercatorParams = calculateMercatorParams(centerX, centerY, size);
      console.log('Mercator parameters:', mercatorParams);
      const { bbox } = mercatorParams;

      // Transform bbox from Web Mercator to GDA94
      const [minX, minY, maxX, maxY] = bbox.split(',').map(Number);
      const transformPoint = (x, y) => {
        const [lon, lat] = proj4('EPSG:3857', GDA94, [x, y]);
        return [lon, lat];
      };

      const [minLon, minLat] = transformPoint(minX, minY);
      const [maxLon, maxLat] = transformPoint(maxX, maxY);
      const gda94Bbox = `${minLon},${minLat},${maxLon},${maxLat}`;

      console.log('Transformed bbox to GDA94:', {
        original: bbox,
        transformed: gda94Bbox
      });

      // Get the POI features for the description
      const params = new URLSearchParams({
        where: '1=1',
        geometry: gda94Bbox,
        geometryType: 'esriGeometryEnvelope',
        inSR: 4283,
        outSR: 4283,
        spatialRel: 'esriSpatialRelIntersects',
        outFields: 'poiname,poitype,poigroup',
        returnGeometry: true,
        f: 'json'
      });

      const url = `${poiConfig.url}/${poiConfig.layerId}/query?${params.toString()}`;
      console.log('Making POI feature request...');
      
      try {
        const poiResponse = await proxyRequest(url);
        console.log('Raw POI response:', poiResponse);
        
        // Parse response if it's a string
        let parsedResponse = poiResponse;
        if (typeof poiResponse === 'string') {
          try {
            parsedResponse = JSON.parse(poiResponse);
            console.log('Parsed POI response:', parsedResponse);
          } catch (parseError) {
            console.error('Failed to parse POI response:', parseError);
            throw parseError;
          }
        }
        
        if (parsedResponse?.features?.length > 0) {
          console.log(`Found ${parsedResponse.features.length} POI features`);
          
          // Draw each POI point on the canvas
          parsedResponse.features.forEach(feature => {
            // The coordinates are already in GDA94, convert them to Web Mercator
            const [mercX, mercY] = proj4(GDA94, 'EPSG:3857', [feature.geometry.x, feature.geometry.y]);
            
            // Convert mercator coordinates to pixel coordinates
            const pixelX = Math.round(((mercX - (centerX - size/2)) / size) * config.width),
                  pixelY = Math.round(config.height - ((mercY - (centerY - size/2)) / size) * config.height);
            
            // Get color based on POI group
            let color;
            switch(feature.attributes.poigroup) {
              case 1: // Community
                color = '#FF6B6B';
                break;
              case 2: // Education
                color = '#4ECDC4';
                break;
              case 3: // Recreation
                color = '#45B7D1';
                break;
              case 4: // Transport
                color = '#96CEB4';
                break;
              default:
                color = '#666666';
            }
            
            console.log('Drawing POI:', {
              name: feature.attributes.poiname || '(Unnamed)',
              type: feature.attributes.poitype,
              group: feature.attributes.poigroup,
              color,
              coords: [feature.geometry.x, feature.geometry.y],
              mercator: [mercX, mercY],
              pixel: [pixelX, pixelY]
            });
            
            // Draw POI marker
            if (pixelX >= 0 && pixelX <= config.width && pixelY >= 0 && pixelY <= config.height) {
              drawMapPin(ctx, pixelX, pixelY, color, 60);
              
              // Add label if name exists
              if (feature.attributes.poiname) {
                ctx.save();
                ctx.font = 'bold 24px Public Sans';
                ctx.fillStyle = '#000000';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                
                // Draw text background
                const text = feature.attributes.poiname;
                const metrics = ctx.measureText(text);
                const padding = 4;
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillRect(
                  pixelX - metrics.width/2 - padding,
                  pixelY - 80,
                  metrics.width + padding * 2,
                  30
                );
                
                // Draw text
                ctx.fillStyle = '#000000';
                ctx.fillText(text, pixelX, pixelY - 75);
                ctx.restore();
              }
            }
          });

          // Store features for the description
          poiFeatures = parsedResponse.features.map(feature => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [feature.geometry.x, feature.geometry.y]
            },
            properties: {
              poiname: feature.attributes.poiname || '(Unnamed)',
              poitype: feature.attributes.poitype,
              poigroup: feature.attributes.poigroup
            }
          }));

          // Update servicesData to use poitype for grouping
          const poiGroups = poiFeatures.reduce((acc, feature) => {
            const type = feature.properties.poitype;
            if (!acc[type]) {
              acc[type] = [];
            }
            if (feature.properties.poiname) {
              acc[type].push(feature.properties.poiname);
            } else {
              // For unnamed POIs, just increment a counter
              acc[type].unnamed = (acc[type].unnamed || 0) + 1;
            }
            return acc;
          }, {});

          servicesData = Object.entries(poiGroups)
            .map(([type, data]) => {
              const namedLocations = data.filter(name => typeof name === 'string');
              const unnamedCount = data.unnamed || 0;
              
              let description = type;
              if (namedLocations.length > 0) {
                description += `: ${namedLocations.join(', ')}`;
              }
              if (unnamedCount > 0) {
                description += `${namedLocations.length > 0 ? ', plus ' : ': '}${unnamedCount} unnamed location${unnamedCount > 1 ? 's' : ''}`;
              }
              return description;
            })
            .join('\n');
        } else {
          console.warn('No POI features found in response');
        }
      } catch (error) {
        console.error('Failed to fetch POI data:', error);
        servicesData = 'Error loading services and amenities data.';
      }
    } catch (error) {
      console.error('Failed to load POI layer:', error);
    }

    // Draw boundaries
    console.log('Drawing main feature boundary...');
    if (geoJSONFeature?.geometry?.coordinates?.[0]) {
      drawBoundary(ctx, geoJSONFeature.geometry.coordinates[0], centerX, centerY, size, config.width, {
        strokeStyle: '#FF0000',
        lineWidth: 6
      });
    }

    if (developableArea?.features?.[0]?.geometry?.coordinates?.[0]) {
      console.log('Drawing developable area boundary...');
      drawBoundary(ctx, developableArea.features[0].geometry.coordinates[0], centerX, centerY, size, config.width, {
        strokeStyle: '#02d1b8',
        lineWidth: 12,
        dashArray: [20, 10]
      });
    }

    console.log('Converting canvas to image...');
    const image = canvas.toDataURL('image/png', 1.0);

    return {
      image,
      servicesData
    };
  } catch (error) {
    console.error('Failed to capture services and amenities map:', error);
    return null;
  }
}
