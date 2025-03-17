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
import * as turf from '@turf/turf';

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

const LAYER_CONFIG_PTAL = {
  layerId: 28919,
  width: 2048,
  height: 2048,
  padding: 1,
  dpi: 300
};

/**
 * Captures a PTAL (Public Transport Accessibility Level) map with the specified feature
 * @param {Object} feature - GeoJSON feature to display
 * @param {Object} developableArea - Optional developable area to display
 * @param {boolean} showDevelopableArea - Whether to show developable areas
 * @param {boolean} useDevelopableAreaForBounds - Whether to use developable area for bounds calculation
 * @param {boolean} showLabels - Whether to show feature labels
 * @param {boolean} showDevelopableAreaLabels - Whether to show developable area labels
 * @returns {Promise<Object>} Object containing the dataURL and ptalFeatures
 */
export async function capturePTALMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false, showLabels = true, showDevelopableAreaLabels = false) {
  if (!feature) {
    console.log('No feature provided, returning null');
    return null;
  }
  
  // Validate feature geometry early
  if (feature.type === 'Feature' && (!feature.geometry || !feature.geometry.coordinates)) {
    console.warn('Feature has invalid or missing geometry');
    return null;
  }
  
  // For feature collections, validate each feature
  if (feature.type === 'FeatureCollection' && Array.isArray(feature.features)) {
    const validFeatures = feature.features.filter(f => 
      f && f.geometry && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates.length > 0
    );
    
    if (validFeatures.length === 0) {
      console.warn('FeatureCollection has no valid features with coordinates');
      return null;
    }
    
    // Replace with only valid features
    feature.features = validFeatures;
  }
  
  console.log('Starting PTAL map capture with feature:', {
    featureType: feature.type,
    hasMultipleFeatures: feature.type === 'FeatureCollection' && feature.features?.length > 1,
    developableArea: developableArea ? 'provided' : 'not provided',
    useDevelopableAreaForBounds
  });

  try {
    const config = {
      width: LAYER_CONFIG_PTAL.width,
      height: LAYER_CONFIG_PTAL.height,
      padding: LAYER_CONFIG_PTAL.padding
    };
    console.log('Using config:', config);
    
    // Validate developable area if provided
    if (developableArea && developableArea.type === 'FeatureCollection') {
      if (!Array.isArray(developableArea.features) || developableArea.features.length === 0) {
        console.warn('DevelopableArea has no features, ignoring it');
        developableArea = null;
      } else {
        // Filter out invalid features
        const validDevelopableFeatures = developableArea.features.filter(f => 
          f && f.geometry && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates.length > 0
        );
        
        if (validDevelopableFeatures.length === 0) {
          console.warn('DevelopableArea has no valid features with coordinates, ignoring it');
          developableArea = null;
        } else {
          // Replace with only valid features
          developableArea.features = validDevelopableFeatures;
        }
      }
    }
    
    // Use the useDevelopableAreaForBounds parameter instead of hardcoding to false
    const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
    console.log('Calculated bounds:', { centerX, centerY, size });
    
    let ptalFeatures = [];
    
    // Create base canvas
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d', { alpha: true });
    console.log('Created canvas with dimensions:', { width: canvas.width, height: canvas.height });
    
    // Start with a white background to prevent transparency issues
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Prepare parameters for both layers
    const { bbox } = calculateMercatorParams(centerX, centerY, size);
    console.log('Calculated Mercator bbox:', bbox);
    
    // Prepare aerial layer parameters
    const aerialParams = new URLSearchParams({
      SERVICE: 'WMS',
      VERSION: '1.3.0',
      REQUEST: 'GetMap',
      BBOX: bbox,
      CRS: 'EPSG:3857',
      WIDTH: config.width,
      HEIGHT: config.height,
      LAYERS: LAYER_CONFIG_AERIAL.layers,
      STYLES: '',
      FORMAT: 'image/png',
      DPI: LAYER_CONFIG_AERIAL.dpi,
      MAP_RESOLUTION: LAYER_CONFIG_AERIAL.dpi,
      FORMAT_OPTIONS: `dpi:${LAYER_CONFIG_AERIAL.dpi}`
    });
    console.log('Prepared aerial parameters:', Object.fromEntries(aerialParams.entries()));

    // Load aerial base layer first, then proceed with PTAL data
    try {
      console.log('Loading aerial base layer...');
      const baseMap = await loadImage(`${LAYER_CONFIG_AERIAL.url}?${aerialParams.toString()}`);
      
      // Draw base map
      drawImage(ctx, baseMap, canvas.width, canvas.height, LAYER_CONFIG_AERIAL.opacity);
      console.log('Drew base map');
    } catch (aerialError) {
      console.error('Failed to load aerial base layer:', aerialError);
      // Continue with white background
    }

    // Prepare PTAL layer parameters
    const ptalConfig = LAYER_CONFIG_PTAL;
    console.log('Using PTAL config:', ptalConfig);

    try {
      // Get the PTAL layer data from Giraffe
      console.log('Fetching project layers from Giraffe...');
      const projectLayers = await giraffeState.get('projectLayers');
      console.log('Retrieved project layers count:', projectLayers?.length);
      
      const ptalLayer = projectLayers?.find(layer => layer.layer === ptalConfig.layerId);
      console.log('Found PTAL layer:', {
        found: !!ptalLayer,
        id: ptalLayer?.layer,
        name: ptalLayer?.layer_full?.name,
        defaultGroup: ptalLayer?.layer_full?.default_group,
        vectorSource: ptalLayer?.layer_full?.vector_source ? 'present' : 'missing'
      });
      
      if (!ptalLayer) {
        console.error('PTAL layer not found in project layers');
        // Continue without PTAL layer - just draw the features
      } else {
        // Color mapping for PTAL values
        const ptalColors = {
          '1 - Low': '#ff000080',
          '2 - Low-Medium': '#ff7f0e80',
          '3 - Medium': '#f2ff0080',
          '4 - Medium-High': '#0e9aff80',
          '5 - High': '#a8ff7f80',
          '6 - Very High': '#1d960480'
        };

        // Extract the actual service URL and token from the vector tiles URL
        const vectorTileUrl = ptalLayer.layer_full?.vector_source?.tiles?.[0];
        console.log('Vector tile URL:', vectorTileUrl);
        
        if (!vectorTileUrl) {
          console.error('No vector tile URL found in PTAL layer');
        } else {
          const decodedUrl = decodeURIComponent(vectorTileUrl.split('/featureServer/{z}/{x}/{y}/')?.[1] || '');
          console.log('Decoded URL:', decodedUrl);
          
          // Extract the base URL from the decoded URL - it's everything before the query parameters
          const urlMatch = decodedUrl.match(/(https:\/\/[^?]+)/);
          if (!urlMatch) {
            console.error('Could not extract base URL from decoded URL');
          } else {
            const baseUrl = urlMatch[1];
            console.log('Using exact URL from vector tiles:', baseUrl);
            
            const extractedToken = decodedUrl.split('token=')?.[1]?.split('&')?.[0];
            console.log('Extracted token:', extractedToken ? `${extractedToken.substring(0, 10)}...` : 'null');

            if (!extractedToken) {
              console.error('Could not extract token from vector tile URL');
            } else {
              const ptalParams = new URLSearchParams({
                where: '1=1',
                geometry: bbox,
                geometryType: 'esriGeometryEnvelope',
                inSR: 3857,
                spatialRel: 'esriSpatialRelIntersects',
                outFields: '*',
                returnGeometry: true,
                f: 'geojson',
                token: extractedToken
              });
              console.log('Prepared PTAL parameters:', {
                ...Object.fromEntries(ptalParams.entries()),
                token: '***redacted***'
              });

              // Log the full URL we're about to request
              console.log('Preparing to request:', {
                ptalUrl: `${baseUrl}/query?${ptalParams.toString().replace(extractedToken, '***redacted***')}`
              });

              try {
                // Load PTAL data
                const ptalResponse = await proxyRequest(`${baseUrl}/query?${ptalParams.toString()}`);
                
                // Process PTAL data if available
                if (ptalResponse?.features?.length > 0) {
                  console.log(`Processing ${ptalResponse.features.length} PTAL features...`);
                  ptalFeatures = ptalResponse.features;

                  // Find PTAL values for each feature if it's a collection
                  if (feature.type === 'FeatureCollection' && feature.features?.length > 0) {
                    console.log('Finding PTAL values for each feature in collection...');
                    const featureBestPTALs = [];
                    
                    // Process each feature
                    for (let featureIndex = 0; featureIndex < feature.features.length; featureIndex++) {
                      const f = feature.features[featureIndex];
                      try {
                        // Skip features without valid geometry
                        if (!f.geometry?.coordinates) {
                          console.warn(`Feature ${featureIndex} has no valid coordinates`);
                          continue; 
                        }
                        
                        const featurePolygon = turf.polygon(f.geometry.coordinates);
                        const intersectingPtalFeatures = [];
                        
                        // Check each PTAL feature for intersection
                        for (const ptalFeature of ptalFeatures) {
                          try {
                            if (!ptalFeature.geometry?.coordinates) continue;
                            const ptalPolygon = turf.polygon(ptalFeature.geometry.coordinates);
                            if (turf.booleanIntersects(featurePolygon, ptalPolygon)) {
                              intersectingPtalFeatures.push(ptalFeature);
                            }
                          } catch (intersectionError) {
                            console.warn('Error checking PTAL intersection:', intersectionError);
                          }
                        }
                        
                        const ptalValues = intersectingPtalFeatures.map(f => 
                          f.properties.legend || f.properties.ptal_desc || f.properties.ptal
                        );
                        
                        console.log(`Feature ${featureIndex+1} has PTAL values:`, ptalValues);
                        featureBestPTALs.push({
                          featureIndex,
                          ptalValues
                        });
                        
                        // Store PTAL values in the feature for scoring
                        if (!f.properties) f.properties = {};
                        f.properties.ptalValues = ptalValues;
                      } catch (featureError) {
                        console.warn(`Error processing feature ${featureIndex}:`, featureError);
                      }
                    }
                    
                    // Store overall collection of PTAL values in the feature's properties
                    if (!feature.properties) feature.properties = {};
                    feature.properties.featurePTALs = featureBestPTALs;
                    // Store combined unique values only for the collection, not all values in the map
                    const allIntersectingValues = [];
                    featureBestPTALs.forEach(featurePTAL => {
                      featurePTAL.ptalValues.forEach(value => {
                        if (!allIntersectingValues.includes(value)) {
                          allIntersectingValues.push(value);
                        }
                      });
                    });
                    feature.properties.ptalValues = allIntersectingValues;
                    console.log('Collection has intersecting PTAL values:', allIntersectingValues);
                  } else {
                    // Single feature case
                    try {
                      // Store only intersecting PTAL values
                      if (!feature.geometry?.coordinates || !Array.isArray(feature.geometry.coordinates)) {
                        console.warn('Feature has no valid coordinates');
                        if (!feature.properties) feature.properties = {};
                        feature.properties.ptalValues = [];
                      } else {
                        try {
                          const featurePolygon = turf.polygon(feature.geometry.coordinates);
                          const intersectingPtalFeatures = [];
                        
                          // Check each PTAL feature for intersection
                          for (const ptalFeature of ptalFeatures) {
                            try {
                              if (!ptalFeature.geometry?.coordinates) continue;
                              const ptalPolygon = turf.polygon(ptalFeature.geometry.coordinates);
                              if (turf.booleanIntersects(featurePolygon, ptalPolygon)) {
                                intersectingPtalFeatures.push(ptalFeature);
                              }
                            } catch (intersectionError) {
                              console.warn('Error checking PTAL intersection for single feature:', intersectionError);
                            }
                          }
                          
                          const ptalValues = intersectingPtalFeatures.map(f => 
                            f.properties.legend || f.properties.ptal_desc || f.properties.ptal
                          );
                          
                          if (!feature.properties) feature.properties = {};
                          feature.properties.ptalValues = ptalValues;
                          console.log('Single feature has intersecting PTAL values:', ptalValues);
                        } catch (singleFeatureError) {
                          console.warn('Error storing PTAL values for single feature:', singleFeatureError);
                          if (!feature.properties) feature.properties = {};
                          feature.properties.ptalValues = [];
                        }
                      }
                    } catch (singleFeatureError) {
                      console.warn('Error storing PTAL values for single feature:', singleFeatureError);
                      if (!feature.properties) feature.properties = {};
                      feature.properties.ptalValues = [];
                    }
                  }

                  // Draw ALL PTAL features
                  console.log('Drawing all PTAL features...');
                  ptalFeatures.forEach((ptalFeature, index) => {
                    try {
                      const ptalValue = ptalFeature.properties.legend || ptalFeature.properties.ptal_desc || ptalFeature.properties.ptal;
                      const color = ptalColors[ptalValue] || '#808080';
                      
                      if (ptalFeature.geometry?.coordinates?.[0]) {
                        drawBoundary(ctx, ptalFeature.geometry.coordinates[0], centerX, centerY, size, config.width, {
                          fill: true,
                          strokeStyle: '#000000',
                          fillStyle: color,
                          lineWidth: 2
                        });
                      }
                    } catch (drawError) {
                      console.warn(`Error drawing PTAL feature ${index}:`, drawError);
                    }
                  });
                } else {
                  console.log('No PTAL features found in response');
                }
              } catch (ptalRequestError) {
                console.error('Failed to fetch PTAL data:', ptalRequestError);
              }
            }
          }
        }
      }
    } catch (giraffError) {
      console.error('Failed to get PTAL data from Giraffe:', giraffError);
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
        try {
          drawFeatureBoundaries(ctx, f, centerX, centerY, size, config.width, {
            showLabels: showLabels, // Use showLabels parameter 
            strokeStyle: 'rgba(255, 0, 0, 0.9)', // More opaque red for visibility
            lineWidth: 6  // Thick line for visibility
          });
        } catch (drawError) {
          console.warn(`Error drawing feature ${index}:`, drawError);
        }
      });
    } else {
      // Single feature case
      console.log('Drawing single feature');
      try {
        drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width, {
          showLabels: showLabels, // Use showLabels parameter
          strokeStyle: 'rgba(255, 0, 0, 0.9)', // More opaque red for visibility
          lineWidth: 6 // Thick line for visibility
        });
      } catch (drawError) {
        console.warn('Error drawing feature:', drawError);
      }
    }

    // Add PTAL legend
    try {
      // Draw legend background
      const legendHeight = 220;
      const legendWidth = 180;
      const padding = 20;
      // Position at bottom right
      const legendX = canvas.width - legendWidth - padding;
      const legendY = canvas.height - legendHeight - padding;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.strokeStyle = '#002664';
      ctx.lineWidth = 2;
      ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
      ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

      // Legend title
      ctx.font = 'bold 22px Public Sans';
      ctx.fillStyle = '#002664';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText('PTAL Ratings', legendX + padding, legendY + padding);

      // PTAL legend items - simplified to match the attached image
      const ptalLegendItems = [
        { value: 'Low', color: '#ff0000' },
        { value: 'Medium', color: '#ff7f0e' },
        { value: 'Medium-High', color: '#0e9aff' },
        { value: 'High', color: '#a8ff7f' },
        { value: 'Very High', color: '#1d9604' }
      ];

      ctx.textBaseline = 'middle';
      ctx.font = '16px Public Sans';

      ptalLegendItems.forEach((item, index) => {
        const y = legendY + padding + 50 + (index * 30);
        
        // Draw color box
        ctx.fillStyle = item.color;
        ctx.fillRect(legendX + padding, y - 10, 20, 20);
        ctx.strokeStyle = '#363636';
        ctx.lineWidth = 1;
        ctx.strokeRect(legendX + padding, y - 10, 20, 20);
        
        // Draw label
        ctx.fillStyle = '#363636';
        ctx.fillText(item.value, legendX + padding + 30, y);
      });
    } catch (legendError) {
      console.warn('Error drawing PTAL legend:', legendError);
    }

    console.log('PTAL map capture completed successfully');
    
    // Return both the image data URL and the PTAL features
    return {
      dataURL: canvas.toDataURL('image/png', 1.0),
      ptalFeatures: ptalFeatures
    };
  } catch (error) {
    console.error('Failed to capture PTAL map:', error);
    console.error('Error stack:', error.stack);
    return null;
  }
}