import { rpc, giraffeState } from '@gi-nx/iframe-sdk';
import * as turf from '@turf/turf';
import { calculateMercatorParams } from './map/utils/coordinates';
import { proxyRequest } from './services/proxyService';
import { createDrawingFromFeature, createStyledDrawingFromFeature } from './mapUtils';

// Counter to track how many developable areas have been generated
let developableAreaCount = 0;

// List of zone codes to exclude from developable areas
const EXCLUDED_ZONE_CODES = ['IN3', 'IN4', 'E3', 'E4', 'RU3', 'C1', 'C2', 'C3', 'W1', 'W2', 'W3'];

/**
 * Generates a developable area automatically by subtracting biodiversity features from the site boundary
 * @param {Object} siteFeature - The GeoJSON feature representing the site boundary (can be a single Feature or a FeatureCollection)
 * @param {Function} setNotification - Function to set notification state
 * @param {Function} setIsGenerating - Function to update the generating state
 * @param {String} namePrefix - Prefix for the generated drawing layer name
 * @returns {Promise<Object>} - A promise that resolves to the generated developable area
 */
export const generateAutoDevelopableArea = async (siteFeature, setNotification, setIsGenerating = () => {}) => {
  try {
    setIsGenerating(true);
    
    console.log('Original site feature:', JSON.stringify(siteFeature, null, 2));
    
    if (!siteFeature) {
      console.log('No site selected');
      setIsGenerating(false);
      return null;
    }
    
    // Log the operation start instead of showing notification
    console.log('Generating developable area...');

    // Handle case when siteFeature is a FeatureCollection
    if (siteFeature.type === 'FeatureCollection' && siteFeature.features && siteFeature.features.length > 0) {
      console.log('Processing a FeatureCollection with', siteFeature.features.length, 'features');
      
      // Process each feature individually and then combine the results
      const allResults = [];
      
      for (let i = 0; i < siteFeature.features.length; i++) {
        console.log(`Processing feature ${i+1} of ${siteFeature.features.length}`);
        const currentFeature = siteFeature.features[i];
        
        // Process single feature
        const singleResult = await generateAutoDevelopableArea(
          currentFeature,
          (notification) => {
            // Add feature number to notification
            if (notification) {
              const modifiedNotification = {
                ...notification,
                message: `Feature ${i+1}: ${notification.message}`
              };
              setNotification(modifiedNotification);
            }
          },
          setIsGenerating
        );
        
        if (singleResult && singleResult.developableArea) {
          allResults.push(singleResult);
        }
      }
      
      // Combine all results into a single FeatureCollection
      if (allResults.length > 0) {
        console.log(`Combining results from ${allResults.length} features`);
        
        const combinedFeatures = allResults.flatMap(
          result => result.developableArea.features
        );
        
        const combinedResult = {
          developableArea: {
            type: 'FeatureCollection',
            features: combinedFeatures
          },
          drawingResults: allResults.flatMap(result => result.drawingResults)
        };
        
        setNotification({
          type: 'success',
          message: `Generated developable areas for ${allResults.length} sites successfully!`
        });
        
        return combinedResult;
      }
      
      return null;
    }
    
    // Continue with single feature processing
    // Validate site geometry
    if (!siteFeature.geometry || !siteFeature.geometry.coordinates || !siteFeature.geometry.coordinates[0]) {
      console.log('Site has invalid geometry');
      setIsGenerating(false);
      return null;
    }
    
    // Create a clean copy of the site boundary
    const propertyPolygon = {
      type: 'Feature',
      properties: siteFeature.properties || {},
      geometry: {
        type: 'Polygon',
        coordinates: JSON.parse(JSON.stringify(siteFeature.geometry.coordinates))
      }
    };
    
    // Calculate bounds for API query
    const coordinates = propertyPolygon.geometry.coordinates[0];
    const bounds = coordinates.reduce((acc, coord) => ({
      minX: Math.min(acc.minX, coord[0]),
      minY: Math.min(acc.minY, coord[1]),
      maxX: Math.max(acc.maxX, coord[0]),
      maxY: Math.max(acc.maxY, coord[1])
    }), {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity
    });

    // Calculate center and size for API queries
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const width = Math.abs(bounds.maxX - bounds.minX);
    const height = Math.abs(bounds.maxY - bounds.minY);
    // Increase the padding for larger query area to ensure we catch all features
    const size = Math.max(width, height) * 2.0; // Increase from 1.5 to 2.0 (100% padding)
    
    // Calculate Mercator parameters for API query
    const { bbox } = calculateMercatorParams(centerX, centerY, size);
    
    // Initialize the developable area
    let developablePolygon = turf.buffer(propertyPolygon, 0, { units: 'kilometers' });
    
    // Create a buffered property for more reliable operations - use larger buffer
    const bufferedProperty = turf.buffer(propertyPolygon, 0.0005, { units: 'kilometers' }); // Increased from 0.00001
    
    // =========================================
    // 1. FETCH AND PROCESS BIODIVERSITY DATA
    // =========================================
    console.log('Fetching biodiversity data...');
    
    try {
      // Configure biodiversity API request
      const biodiversityConfig = {
        url: 'https://www.lmbc.nsw.gov.au/arcgis/rest/services/BV/BiodiversityValues/MapServer',
        layerId: 0
      };
      
      const params = new URLSearchParams({
        where: '1=1',
        geometry: bbox,
        geometryType: 'esriGeometryEnvelope',
        inSR: 3857,
        spatialRel: 'esriSpatialRelIntersects',
        outFields: '*',
        returnGeometry: true,
        f: 'geojson'
      });

      // Fetch biodiversity data
      const biodiversityUrl = `${biodiversityConfig.url}/${biodiversityConfig.layerId}/query?${params.toString()}`;
      console.log('Requesting biodiversity data from URL:', biodiversityUrl);
      
      const biodiversityResponse = await proxyRequest(biodiversityUrl);
      console.log('Biodiversity API response structure:', {
        type: biodiversityResponse?.type,
        featuresCount: biodiversityResponse?.features?.length || 0
      });
      
      if (biodiversityResponse?.features?.length > 0) {
        console.log(`Processing ${biodiversityResponse.features.length} biodiversity features...`);
        
        // Process biodiversity features in batches to improve stability
        const batchSize = 5; // Process 5 features at a time
        const totalFeatures = biodiversityResponse.features.length;
        
        // Keep track of features that failed to process for a second pass
        const failedFeatures = [];
        
        // First pass - process features in batches
        for (let i = 0; i < totalFeatures; i += batchSize) {
          const endIdx = Math.min(i + batchSize, totalFeatures);
          console.log(`Processing biodiversity features batch ${i/batchSize + 1} (features ${i+1} to ${endIdx})`);
          
          // Process each feature in the current batch
          for (let j = i; j < endIdx; j++) {
            const bioFeature = biodiversityResponse.features[j];
            
            // Skip invalid features
            if (!bioFeature || !bioFeature.geometry || !bioFeature.geometry.coordinates) {
              console.log(`Skipping feature ${j+1}: Invalid geometry`);
              continue;
            }
            
            // Simplify the process:
            // 1. Create a clean biodiversity feature with explicit 2D coordinates
            const cleanBioFeature = {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: bioFeature.geometry.coordinates.map(ring => {
                  // Log a sample of coordinates to see their structure
                  if (ring.length > 0) {
                    console.log(`Sample coordinates from feature ${j+1}:`, 
                      JSON.stringify(ring.slice(0, 3)));
                  }
                  
                  // Process coordinates: filter out any invalid entries and ensure we use only X,Y
                  const validCoords = ring.map(coord => {
                    if (!Array.isArray(coord) || coord.length < 2) {
                      console.log(`Invalid coordinate in feature ${j+1}:`, coord);
                      return null;
                    }
                    // Ensure we only take the first two values (X,Y)
                    return [parseFloat(coord[0]), parseFloat(coord[1])];
                  }).filter(coord => coord !== null);
                  
                  // For rings with fewer than 3 points, we need to expand them into a valid polygon
                  if (validCoords.length < 3) {
                    console.log(`Ring in feature ${j+1} has insufficient points, using buffer approach`);
                    
                    // If we have at least one valid point, we can create a buffer around it
                    if (validCoords.length > 0) {
                      const centerX = validCoords.reduce((sum, c) => sum + c[0], 0) / validCoords.length;
                      const centerY = validCoords.reduce((sum, c) => sum + c[1], 0) / validCoords.length;
                      
                      // Create a small box around the center point (approximately 10m buffer)
                      const buffer = 0.0001; 
                      const boxCoords = [
                        [centerX - buffer, centerY - buffer],
                        [centerX + buffer, centerY - buffer],
                        [centerX + buffer, centerY + buffer],
                        [centerX - buffer, centerY + buffer],
                        [centerX - buffer, centerY - buffer] // Close the ring
                      ];
                      
                      return boxCoords;
                    } else {
                      return null;
                    }
                  }
                  
                  // Ensure the ring is closed (first = last)
                  const first = validCoords[0];
                  const last = validCoords[validCoords.length - 1];
                  
                  if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
                    console.log(`Closing ring in feature ${j+1}`);
                    return [...validCoords, [...first]];
                  }
                  
                  return validCoords;
                }).filter(ring => ring !== null) // Remove any null rings
              }
            };
            
            // Skip features with invalid geometry after cleaning
            if (!cleanBioFeature.geometry.coordinates || cleanBioFeature.geometry.coordinates.length === 0) {
              console.log(`Feature ${j+1} has no valid coordinates after cleaning`);
              continue;
            }
            
            // 2. Check if it intersects with our property using multiple methods for reliability
            let intersects = false;
            try {
              // First try standard intersection check
              intersects = turf.booleanIntersects(bufferedProperty, cleanBioFeature);
              
              // Even if not directly intersecting, check if it's very close to the property
              if (!intersects) {
                // Create a buffer around the biodiversity feature to check for proximity
                const proximityBuffer = turf.buffer(cleanBioFeature, 0.01, { units: 'kilometers' }); // 10m buffer
                intersects = turf.booleanIntersects(bufferedProperty, proximityBuffer);
                if (intersects) {
                  console.log(`Feature ${j+1} is close to property boundary, including it`);
                }
              }
            } catch (err) {
              console.log(`Primary intersection check error for feature ${j+1}: ${err.message}`);
              
              // Try a more robust approach with buffers
              try {
                // Create a buffer around the feature to help with intersection checks
                const bioBuffer = turf.buffer(cleanBioFeature, 0.01, { units: 'kilometers' }); // Increased from 0.0001
                intersects = turf.booleanIntersects(bufferedProperty, bioBuffer);
              } catch (bufferErr) {
                console.log(`Buffer intersection check also failed for feature ${j+1}`);
                
                // Final attempt - try a point-in-polygon test if we have a valid point
                try {
                  // Get multiple points from the feature, not just center
                  try {
                    // Try to use the feature's points directly
                    if (cleanBioFeature.geometry.coordinates && 
                        cleanBioFeature.geometry.coordinates[0] && 
                        cleanBioFeature.geometry.coordinates[0].length > 0) {
                      
                      // Check if any point of the biodiversity feature is within the property
                      for (let pointIdx = 0; pointIdx < Math.min(10, cleanBioFeature.geometry.coordinates[0].length); pointIdx++) {
                        const point = {
                          type: 'Feature',
                          geometry: {
                            type: 'Point',
                            coordinates: cleanBioFeature.geometry.coordinates[0][pointIdx]
                          }
                        };
                        
                        if (turf.booleanPointInPolygon(point, bufferedProperty)) {
                          intersects = true;
                          console.log(`Point ${pointIdx} of feature ${j+1} is within property`);
                          break;
                        }
                      }
                    }
                  } catch (pointsErr) {
                    console.log(`Error checking feature points: ${pointsErr.message}`);
                  }
                  
                  // If still not intersecting, try center point
                  if (!intersects) {
                    const center = turf.centerOfMass(cleanBioFeature);
                    // Check if this point is within the property
                    intersects = turf.booleanPointInPolygon(center, bufferedProperty);
                  }
                } catch (pointErr) {
                  console.log(`All intersection tests failed for feature ${j+1}`);
                  
                  // More aggressive approach - if all else fails, check if it's even near the bounding box
                  try {
                    const bioBox = turf.bbox(cleanBioFeature);
                    const propertyBox = turf.bbox(propertyPolygon);
                    
                    // Check if bounding boxes are close
                    const boxIntersects = !(
                      bioBox[2] < propertyBox[0] || // bio max X < property min X
                      bioBox[0] > propertyBox[2] || // bio min X > property max X
                      bioBox[3] < propertyBox[1] || // bio max Y < property min Y
                      bioBox[1] > propertyBox[3]    // bio min Y > property max Y
                    );
                    
                    if (boxIntersects) {
                      console.log(`Feature ${j+1} bounding box is near property, including it`);
                      intersects = true;
                    }
                  } catch (boxErr) {
                    // Add to failed features in case we missed something
                    failedFeatures.push({ index: j, feature: cleanBioFeature });
                    continue;
                  }
                }
              }
            }
            
            if (!intersects) {
              console.log(`Feature ${j+1} doesn't intersect with property`);
              continue;
            }
            
            console.log(`Processing biodiversity feature ${j+1} (intersects with property)`);
            
            // 3. Try to subtract it from the developable area with robust error handling
            try {
              // Use an enlarged biodiversity feature for better extraction
              const enlargedBioFeature = turf.buffer(cleanBioFeature, 0.001, { units: 'kilometers' });
              
              // First try direct difference with the enlarged feature
              console.log(`Attempting difference for feature ${j+1}`);
              
              // Use a standalone difference attempt with robust error handling
              const diffResult = tryDifference(developablePolygon, enlargedBioFeature);
              
              if (diffResult) {
                console.log(`Successfully subtracted feature ${j+1}`);
                developablePolygon = diffResult;
              } else {
                console.log(`Standard difference failed for feature ${j+1}, using circular approximation`);
                
                // If direct difference fails, use circular approximation
                const fallbackResult = createCircularDifference(developablePolygon, cleanBioFeature);
                if (fallbackResult) {
                  console.log(`Circular approximation succeeded for feature ${j+1}`);
                  developablePolygon = fallbackResult;
                } else {
                  console.log(`Circular approximation failed for feature ${j+1}, will retry in second pass`);
                  // Add to failed features for second pass with more aggressive handling
                  failedFeatures.push({ index: j, feature: cleanBioFeature });
                }
              }
            } catch (error) {
              console.log(`Error processing feature ${j+1}: ${error.message}`);
              // Add to failed features
              failedFeatures.push({ index: j, feature: cleanBioFeature });
            }
          }
        }
        
        // Second pass - retry failed features with more aggressive processing
        if (failedFeatures.length > 0) {
          console.log(`Starting second pass processing for ${failedFeatures.length} failed biodiversity features`);
          
          for (let k = 0; k < failedFeatures.length; k++) {
            const { index, feature } = failedFeatures[k];
            
            console.log(`Second pass - processing failed feature ${index+1}`);
            
            // Try a more aggressive buffer approach with larger radius
            try {
              // Create a larger buffer to ensure coverage
              const center = turf.center(feature);
              const area = turf.area(feature);
              // Use a much larger buffer radius, at least 50 meters and 2x the original size
              const radius = Math.max(0.05, Math.sqrt(area / Math.PI) * 2.0) / 1000; // in km
              
              console.log(`Creating aggressive buffer with radius ${radius}km for feature ${index+1}`);
              const largeBuffer = turf.buffer(center, radius, { units: 'kilometers' });
              
              // Create intersection with the property to ensure we only remove within bounds
              let intersectingBuffer;
              try {
                // Use a buffered property for intersection to ensure we catch features
                // that might be just at the boundary
                const expandedProperty = turf.buffer(propertyPolygon, 0.005, { units: 'kilometers' });
                
                // Use intersection to ensure we're only affecting within the property
                const fcForIntersection = turf.featureCollection([largeBuffer, expandedProperty]);
                intersectingBuffer = turf.intersect(fcForIntersection);
                
                if (!intersectingBuffer) {
                  console.log(`No valid intersection found with property for feature ${index+1}`);
                  // Try an alternate approach - use the buffer directly but clipped to the property bbox
                  try {
                    const propertyBox = turf.bbox(propertyPolygon);
                    const clippedBuffer = turf.bboxClip(largeBuffer, propertyBox);
                    
                    if (clippedBuffer) {
                      console.log(`Using bbox-clipped buffer for feature ${index+1}`);
                      intersectingBuffer = clippedBuffer;
                    } else {
                      continue;
                    }
                  } catch (clipErr) {
                    console.log(`Error clipping buffer: ${clipErr.message}`);
                    continue;
                  }
                }
              } catch (intersectErr) {
                console.log(`Error creating intersection for feature ${index+1}: ${intersectErr.message}`);
                
                // Try a simpler approach if intersection fails
                try {
                  // Just create a smaller buffer that's more likely to be fully within the property
                  const smallerRadius = radius * 0.8;
                  console.log(`Falling back to smaller buffer with radius ${smallerRadius}km`);
                  intersectingBuffer = turf.buffer(center, smallerRadius, { units: 'kilometers' });
                } catch (bufferErr) {
                  console.log(`Error creating fallback buffer: ${bufferErr.message}`);
                  continue;
                }
              }
              
              // Now subtract this intersecting buffer from developable area
              try {
                console.log(`Applying aggressive difference for feature ${index+1}`);
                const fcForDifference = turf.featureCollection([developablePolygon, intersectingBuffer]);
                const aggressiveResult = turf.difference(fcForDifference);
                
                if (aggressiveResult) {
                  console.log(`Aggressive subtraction succeeded for feature ${index+1}`);
                  developablePolygon = aggressiveResult;
                } else {
                  console.log(`Aggressive subtraction failed for feature ${index+1}`);
                  
                  // Last resort: try using a simple circle shape instead
                  try {
                    console.log(`Trying simple circle approach for feature ${index+1}`);
                    const simpleCircle = turf.circle(center.geometry.coordinates, radius, { units: 'kilometers' });
                    const fcForSimpleDifference = turf.featureCollection([developablePolygon, simpleCircle]);
                    const simpleResult = turf.difference(fcForSimpleDifference);
                    
                    if (simpleResult) {
                      console.log(`Simple circle subtraction succeeded for feature ${index+1}`);
                      developablePolygon = simpleResult;
                    }
                  } catch (circleErr) {
                    console.log(`Error with simple circle approach: ${circleErr.message}`);
                  }
                }
              } catch (diffErr) {
                console.log(`Error in aggressive difference for feature ${index+1}: ${diffErr.message}`);
                
                // Try a different turf approach with a simplified feature
                try {
                  console.log(`Attempting with simplified geometries for feature ${index+1}`);
                  const simpleDevelopable = turf.simplify(developablePolygon, { tolerance: 0.0001 });
                  const simpleBuffer = turf.simplify(intersectingBuffer, { tolerance: 0.0001 });
                  const simpleFc = turf.featureCollection([simpleDevelopable, simpleBuffer]);
                  const simpleResult = turf.difference(simpleFc);
                  
                  if (simpleResult) {
                    console.log(`Simplified geometry difference succeeded for feature ${index+1}`);
                    developablePolygon = simpleResult;
                  }
                } catch (simplifyErr) {
                  console.log(`Error with simplified approach: ${simplifyErr.message}`);
                }
              }
            } catch (bufferErr) {
              console.log(`Failed to create aggressive buffer for feature ${index+1}: ${bufferErr.message}`);
            }
          }
        }
      } else {
        console.log('No biodiversity features found');
      }
    } catch (error) {
      console.error('Error processing biodiversity data:', error);
      // Replace notification with console.warn
      console.warn(`Warning: Could not process biodiversity data: ${error.message}`);
    }
    
    // =========================================
    // 2. FETCH AND PROCESS EASEMENT DATA
    // =========================================
    console.log('Fetching easement data...');
    
    try {
      // Configure easements API request
      const easementsConfig = {
        url: 'https://mapuat3.environment.nsw.gov.au/arcgis/rest/services/Common/Admin_3857/MapServer',
        layerId: 25
      };
      
      const params = new URLSearchParams({
        where: '1=1',
        geometry: bbox,
        geometryType: 'esriGeometryEnvelope',
        inSR: 3857,
        spatialRel: 'esriSpatialRelIntersects',
        outFields: '*',
        returnGeometry: true,
        f: 'geojson'
      });

      // Fetch easements data
      const easementsUrl = `${easementsConfig.url}/${easementsConfig.layerId}/query?${params.toString()}`;
      console.log('Requesting easements data from URL:', easementsUrl);
      
      const easementsResponse = await proxyRequest(easementsUrl);
      console.log('Easements API response structure:', {
        type: easementsResponse?.type,
        featuresCount: easementsResponse?.features?.length || 0
      });
      
      if (easementsResponse?.features?.length > 0) {
        console.log(`Processing ${easementsResponse.features.length} easement features...`);
        
        // Process one easement feature at a time
        for (let i = 0; i < easementsResponse.features.length; i++) {
          const easementFeature = easementsResponse.features[i];
          
          // Skip invalid features
          if (!easementFeature || !easementFeature.geometry || !easementFeature.geometry.coordinates) {
            console.log(`Skipping easement feature ${i+1}: Invalid geometry`);
            continue;
          }
          
          // Use the feature EXACTLY as it comes from the API - no modifications
          console.log(`Processing easement feature ${i+1} - using exact coordinates`);
          
          // Check if it intersects with our property
          let intersects = false;
          try {
            intersects = turf.booleanIntersects(propertyPolygon, easementFeature);
          } catch (err) {
            console.log(`Easement intersection check error for feature ${i+1}: ${err.message}`);
            continue;
          }
          
          if (!intersects) {
            console.log(`Easement feature ${i+1} doesn't intersect with property`);
            continue;
          }
          
          // Subtract it directly from the developable area - no preprocessing
          try {
            console.log(`Performing direct difference with exact coordinates for easement ${i+1}`);
            // Create a FeatureCollection with both polygons
            const fc = turf.featureCollection([developablePolygon, easementFeature]);
            // Apply difference using the FeatureCollection
            const diffResult = turf.difference(fc);
            
            if (diffResult) {
              console.log(`Successfully subtracted easement feature ${i+1}`);
              developablePolygon = diffResult;
            } else {
              console.log(`Failed to subtract easement feature ${i+1} - skipping`);
            }
          } catch (error) {
            console.log(`Error processing easement feature ${i+1}: ${error.message}`);
          }
        }
      } else {
        console.log('No easement features found');
      }
    } catch (error) {
      console.error('Error processing easement data:', error);
      // Replace notification with console.warn
      console.warn(`Warning: Could not process easement data: ${error.message}`);
    }
    
    // =========================================
    // 3. FETCH AND PROCESS POWER LINES DATA
    // =========================================
    console.log('Fetching power lines data...');
    
    try {
      // Configure power lines API request
      const powerLinesConfig = {
        url: 'https://services.ga.gov.au/gis/rest/services/Foundation_Electricity_Infrastructure/MapServer',
        layerId: 2
      };
      
      const params = new URLSearchParams({
        where: '1=1',
        geometry: bbox,
        geometryType: 'esriGeometryEnvelope',
        inSR: 3857,
        outSR: 3857, // Explicitly request output in EPSG:3857 to match other data
        spatialRel: 'esriSpatialRelIntersects',
        outFields: '*',
        returnGeometry: true,
        f: 'geojson'
      });

      // Fetch power lines data
      const powerLinesUrl = `${powerLinesConfig.url}/${powerLinesConfig.layerId}/query?${params.toString()}`;
      console.log('Requesting power lines data from URL:', powerLinesUrl);
      
      const powerLinesResponse = await proxyRequest(powerLinesUrl);
      console.log('Power lines API response structure:', {
        type: powerLinesResponse?.type,
        featuresCount: powerLinesResponse?.features?.length || 0
      });
      
      if (powerLinesResponse?.features?.length > 0) {
        // Replace notification with console.log
        console.log(`Processing ${powerLinesResponse.features.length} power line features...`);
        
        // Process one power line feature at a time
        for (let i = 0; i < powerLinesResponse.features.length; i++) {
          const powerLineFeature = powerLinesResponse.features[i];
          
          // Skip invalid features
          if (!powerLineFeature || !powerLineFeature.geometry) {
            console.log(`Skipping power line feature ${i+1}: Invalid geometry`);
            continue;
          }
          
          // Add explicit coordinate validation and transformation if needed
          if (powerLineFeature.geometry.coordinates) {
            console.log(`Validating coordinates for power line feature ${i+1}`);
            // No need for explicit transformation as we requested outSR=3857 in the API call
          }
          
          // For power lines, we still need a buffer as they're line features
          let powerLineBuffer;
          try {
            // Simply use a fixed 10m buffer for all power lines
            const bufferDistance = 0.01; // 10m buffer
            powerLineBuffer = turf.buffer(powerLineFeature, bufferDistance, { units: 'kilometers' });
            console.log(`Created 10m buffer for power line feature ${i+1}`);
          } catch (err) {
            console.log(`Error creating buffer for power line feature ${i+1}: ${err.message}`);
            continue;
          }
          
          // Check if it intersects with our property
          let intersects = false;
          try {
            intersects = turf.booleanIntersects(propertyPolygon, powerLineBuffer);
          } catch (err) {
            console.log(`Power line intersection check error for feature ${i+1}: ${err.message}`);
            continue;
          }
          
          if (!intersects) {
            console.log(`Power line feature ${i+1} doesn't intersect with property`);
            continue;
          }
          
          // Subtract it directly from the developable area
          try {
            console.log(`Performing direct difference for power line feature ${i+1}`);
            // Create a FeatureCollection with both polygons
            const fc = turf.featureCollection([developablePolygon, powerLineBuffer]);
            // Apply difference using the FeatureCollection
            const diffResult = turf.difference(fc);
            
            if (diffResult) {
              console.log(`Successfully subtracted power line feature ${i+1}`);
              developablePolygon = diffResult;
            } else {
              console.log(`Failed to subtract power line feature ${i+1} - skipping`);
            }
          } catch (error) {
            console.log(`Error processing power line feature ${i+1}: ${error.message}`);
          }
        }
      } else {
        console.log('No power line features found');
      }
    } catch (error) {
      console.error('Error processing power lines data:', error);
      // Replace notification with console.warn
      console.warn(`Warning: Could not process power lines data: ${error.message}`);
    }
    
    // =========================================
    // 4. FETCH AND PROCESS FLOOD DATA
    // =========================================
    console.log('Fetching flood data...');
    
    try {
      // Get flood layer from Giraffe project layers
      console.log('Fetching project layers from Giraffe...');
      const projectLayers = await giraffeState.get('projectLayers');
      console.log('Project layers count:', projectLayers?.length || 0);
      
      const floodConfig = {
        baseUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/nsw_1aep_flood_extents/FeatureServer/0',
        layerId: 5180
      };
      
      // Find the flood layer in the project layers
      const floodLayer = projectLayers?.find(layer => layer.layer === floodConfig.layerId);
      console.log('Found flood layer:', floodLayer ? 'Yes' : 'No');
      
      if (floodLayer) {
        // Extract the actual service URL and token from the vector tiles URL
        const vectorTileUrl = floodLayer.layer_full?.vector_source?.tiles?.[0];
        console.log('Vector tile URL exists:', vectorTileUrl ? 'Yes' : 'No');
        
        if (vectorTileUrl) {
          // Use exactly the same token extraction as floodScreenshot.js
          const decodedUrl = decodeURIComponent(vectorTileUrl.split('/featureServer/{z}/{x}/{y}/')?.[1] || '');
          console.log('Decoded URL exists:', decodedUrl ? 'Yes' : 'No');
          
          const extractedToken = decodedUrl.split('token=')?.[1]?.split('&')?.[0];
          console.log('Extracted token exists:', extractedToken ? 'Yes' : 'No');
          
          if (!extractedToken) {
            console.error('No token found for flood data');
            // Replace with console log instead of notification
            console.warn('Could not get authorization token for flood data');
          } else {
            // Use exact same query params structure as floodScreenshot.js
            const params = new URLSearchParams({
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
            
            const url = `${floodConfig.baseUrl}/query?${params.toString()}`;
            console.log('Requesting flood data with token (redacted)');
            
            const floodResponse = await proxyRequest(url);
            console.log('Flood response structure:', {
              type: floodResponse?.type,
              featuresCount: floodResponse?.features?.length || 0
            });
            
            if (floodResponse?.features?.length > 0) {
              // Replace notification with console.log
              console.log(`Processing ${floodResponse.features.length} flood features...`);
              
              // Process one flood feature at a time
              for (let i = 0; i < floodResponse.features.length; i++) {
                const floodFeature = floodResponse.features[i];
                
                // Skip invalid features
                if (!floodFeature || !floodFeature.geometry) {
                  console.log(`Skipping flood feature ${i+1}: Invalid geometry`);
                  continue;
                }
                
                // Check if it intersects with our property
                let intersects = false;
                try {
                  intersects = turf.booleanIntersects(propertyPolygon, floodFeature);
                } catch (err) {
                  console.log(`Flood intersection check error for feature ${i+1}: ${err.message}`);
                  continue;
                }
                
                if (!intersects) {
                  console.log(`Flood feature ${i+1} doesn't intersect with property`);
                  continue;
                }
                
                console.log(`Processing flood feature ${i+1} (intersects with property)`);
                
                // Handle the feature based on its geometry type - similar to floodScreenshot.js
                try {
                  if (floodFeature.geometry.type === 'MultiPolygon') {
                    console.log(`Processing MultiPolygon flood feature ${i+1}`);
                    
                    // Process each polygon in the MultiPolygon separately
                    for (let polyIndex = 0; polyIndex < floodFeature.geometry.coordinates.length; polyIndex++) {
                      const polygonCoords = floodFeature.geometry.coordinates[polyIndex];
                      
                      // Create a simple feature for this polygon part
                      const singlePolygonFeature = {
                        type: 'Feature',
                        properties: {},
                        geometry: {
                          type: 'Polygon',
                          coordinates: polygonCoords
                        }
                      };
                      
                      // Check if this polygon part intersects
                      let partIntersects = false;
                      try {
                        partIntersects = turf.booleanIntersects(propertyPolygon, singlePolygonFeature);
                      } catch (err) {
                        console.log(`Part ${polyIndex} intersection check error: ${err.message}`);
                        continue;
                      }
                      
                      if (!partIntersects) {
                        console.log(`MultiPolygon part ${polyIndex} doesn't intersect with property`);
                        continue;
                      }
                      
                      // Process this polygon part - direct difference
                      console.log(`Performing direct difference for MultiPolygon part ${polyIndex}`);
                      try {
                        // Create a FeatureCollection with both polygons
                        const fc = turf.featureCollection([developablePolygon, singlePolygonFeature]);
                        // Apply difference using the FeatureCollection
                        const diffResult = turf.difference(fc);
                        
                        if (diffResult) {
                          console.log(`Successfully subtracted MultiPolygon part ${polyIndex}`);
                          developablePolygon = diffResult;
                        } else {
                          console.log(`Failed to subtract MultiPolygon part ${polyIndex} - skipping`);
                        }
                      } catch (diffError) {
                        console.log(`Error in difference operation for MultiPolygon part ${polyIndex}: ${diffError.message}`);
                      }
                    }
                  } else {
                    // Handle regular Polygon geometry type
                    console.log(`Processing standard Polygon flood feature ${i+1}`);
                    
                    // Direct difference - no processing
                    console.log(`Performing direct difference for flood feature ${i+1}`);
                    try {
                      // Create a FeatureCollection with both polygons
                      const fc = turf.featureCollection([developablePolygon, floodFeature]);
                      // Apply difference using the FeatureCollection
                      const diffResult = turf.difference(fc);
                      
                      if (diffResult) {
                        console.log(`Successfully subtracted flood feature ${i+1}`);
                        developablePolygon = diffResult;
                      } else {
                        console.log(`Failed to subtract flood feature ${i+1} - skipping`);
                      }
                    } catch (diffError) {
                      console.log(`Error in difference operation for flood feature ${i+1}: ${diffError.message}`);
                    }
                  }
                } catch (error) {
                  console.log(`Error processing flood feature ${i+1}: ${error.message}`);
                }
              }
            } else {
              console.log('No flood features found');
            }
          }
        } else {
          console.log('No vector tile URL found for flood layer');
          // Replace with console log instead of notification
          console.warn('Could not find vector tile URL for flood layer');
        }
      } else {
        console.log('Flood layer not found in project layers');
        // Replace with console log instead of notification
        console.warn('Flood layer not found in project layers');
      }
    } catch (error) {
      console.error('Error processing flood data:', error);
      // Replace notification with console.warn
      console.warn(`Warning: Could not process flood data: ${error.message}`);
    }
    
    // =========================================
    // FINALIZE DEVELOPABLE AREA
    // =========================================
    
    // Make sure the final polygon is valid without changing its shape
    let finalGeometry = developablePolygon;
    
    try {
      // Skip any extra processing - use the exact geometry
      if (!finalGeometry || !finalGeometry.geometry) {
        console.log('No valid developable polygon, using original property');
        finalGeometry = propertyPolygon;
      }
      
      console.log('Using exact developable area geometry without modifications');
      
      // =========================================
      // 5. FETCH AND PROCESS ZONING DATA TO EXCLUDE CERTAIN ZONES
      // =========================================
      console.log('Checking for excluded zones...');
      
      try {
        // Setup the URL for zoning data
        const zoningConfig = {
          url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer',
          layerId: 2 // Zoning layer
        };
        
        const params = new URLSearchParams({
          where: `SYM_CODE IN ('${EXCLUDED_ZONE_CODES.join("','")}')`,
          geometry: bbox,
          geometryType: 'esriGeometryEnvelope',
          inSR: 3857,
          spatialRel: 'esriSpatialRelIntersects',
          outFields: 'SYM_CODE',
          returnGeometry: true,
          f: 'geojson'
        });
        
        // Fetch zoning data for excluded zones
        const zoningUrl = `${zoningConfig.url}/${zoningConfig.layerId}/query?${params.toString()}`;
        console.log('Requesting zoning data for exclusions from URL:', zoningUrl);
        
        const zoningResponse = await proxyRequest(zoningUrl);
        console.log('Zoning API response structure:', {
          type: zoningResponse?.type,
          featuresCount: zoningResponse?.features?.length || 0
        });
        
        if (zoningResponse?.features?.length > 0) {
          // Replace notification with console.log
          console.log(`Processing ${zoningResponse.features.length} excluded zone features...`);
          
          // Process one zone feature at a time
          for (let i = 0; i < zoningResponse.features.length; i++) {
            const zoneFeature = zoningResponse.features[i];
            
            // Skip invalid features
            if (!zoneFeature || !zoneFeature.geometry) {
              console.log(`Skipping zone feature ${i+1}: Invalid geometry`);
              continue;
            }
            
            // Log the zone code
            const zoneCode = zoneFeature.properties?.SYM_CODE;
            console.log(`Processing excluded zone feature ${i+1} with code ${zoneCode}`);
            
            // Check if it intersects with our property/developable area
            let intersects = false;
            try {
              intersects = turf.booleanIntersects(finalGeometry, zoneFeature);
            } catch (err) {
              console.log(`Zone intersection check error for feature ${i+1}: ${err.message}`);
              continue;
            }
            
            if (!intersects) {
              console.log(`Zone feature ${i+1} doesn't intersect with developable area`);
              continue;
            }
            
            // Subtract it from the developable area
            try {
              console.log(`Performing difference for excluded zone ${zoneCode}`);
              // Create a FeatureCollection with both polygons
              const fc = turf.featureCollection([finalGeometry, zoneFeature]);
              // Apply difference using the FeatureCollection
              const diffResult = turf.difference(fc);
              
              if (diffResult) {
                console.log(`Successfully subtracted zone ${zoneCode}`);
                finalGeometry = diffResult;
              } else {
                console.log(`Failed to subtract zone ${zoneCode} - skipping`);
              }
            } catch (error) {
              console.log(`Error processing zone feature ${i+1}: ${error.message}`);
            }
          }
        } else {
          console.log('No excluded zones found within property boundary');
        }
      } catch (error) {
        console.error('Error processing zoning data:', error);
        // Replace notification with console.warn
        console.warn(`Warning: Could not process zoning data: ${error.message}`);
      }
      
      // Check if the result is a MultiPolygon (area has been split by exclusions)
      let polygonParts = [];
      
      if (finalGeometry.geometry.type === 'MultiPolygon') {
        console.log('Developable area has been split into multiple parts by exclusions');
        
        // Extract each polygon from the MultiPolygon
        for (let i = 0; i < finalGeometry.geometry.coordinates.length; i++) {
          const polygonCoords = finalGeometry.geometry.coordinates[i];
          const tempPolygon = {
            type: 'Feature',
            properties: {
              ...propertyPolygon.properties,
              generatedDevelopableArea: true,
              autoGenerated: true,
              usage: 'Developable Area',
              partIndex: i
            },
            geometry: {
              type: 'Polygon',
              coordinates: polygonCoords
            }
          };
          
          // Only filter by size - no coordinate modifications
          const area = turf.area(tempPolygon);
          if (area > 100) { // Only include parts larger than 100 square meters
            polygonParts.push(tempPolygon);
          } else {
            console.log(`Skipping small fragment with area ${area} square meters`);
          }
        }
      } else if (finalGeometry.geometry.type === 'Polygon') {
        // Single polygon case - just add it to our parts array
        const singlePolygon = {
          type: 'Feature',
          properties: {
            ...propertyPolygon.properties,
            generatedDevelopableArea: true,
            autoGenerated: true,
            usage: 'Developable Area',
            partIndex: 0
          },
          geometry: {
            type: 'Polygon',
            coordinates: finalGeometry.geometry.coordinates
          }
        };
        
        polygonParts.push(singlePolygon);
      }
      
      // Sort polygon parts by area (largest first)
      polygonParts.sort((a, b) => {
        const areaA = turf.area(a);
        const areaB = turf.area(b);
        return areaB - areaA; // Descending order
      });
      
      // If no valid parts were found, use the original property
      if (polygonParts.length === 0) {
        console.log('No valid polygon parts extracted, using original property');
        polygonParts.push({
          type: 'Feature',
          properties: {
            ...propertyPolygon.properties,
            generatedDevelopableArea: true,
            autoGenerated: true,
            usage: 'Developable Area',
            partIndex: 0
          },
          geometry: propertyPolygon.geometry
        });
      }
      
      // Create a drawing for each part with appropriate labeling
      const drawingResults = [];
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      
      for (let i = 0; i < polygonParts.length; i++) {
        const suffix = polygonParts.length > 1 ? ` - ${letters[i]}` : '';
        const styleOptions = {
          fillColor: '#0088ff',  // Blue fill for auto-generated areas
          fillOpacity: 0.3,
          outlineColor: '#0066cc',
          namePrefix: `Developable Area - Auto ${++developableAreaCount}${suffix}`,
          description: 'Auto-generated developable area (excluded: biodiversity, easements, power lines, flood zones, and restricted zoning)',
          includeTimestamp: false  // Explicitly set includeTimestamp to false
        };
        
        const result = await createStyledDrawingFromFeature(
          polygonParts[i],
          styleOptions,
          () => {}, // Empty function to avoid notifications
          () => {}
        );
        
        drawingResults.push(result);
      }
      
      // Final notification of success only at the end
      setNotification({
        type: 'success',
        message: `Developable area${polygonParts.length > 1 ? 's' : ''} generated successfully!`
      });
      
      return {
        developableArea: {
          type: 'FeatureCollection',
          features: polygonParts
        },
        drawingResults
      };
    } catch (error) {
      console.error('Error finalizing developable area:', error);
      // Replace with console.warn instead of notification
      console.warn(`Warning: Error finalizing developable area: ${error.message}. Using original site boundary as fallback.`);
      
      // Use the original property as fallback
      const fallbackPolygon = {
        type: 'Feature',
        properties: {
          ...propertyPolygon.properties,
          generatedDevelopableArea: true,
          autoGenerated: true,
          usage: 'Developable Area'
        },
        geometry: propertyPolygon.geometry
      };
      
      const styleOptions = {
        fillColor: '#0088ff',
        fillOpacity: 0.3,
        outlineColor: '#0066cc',
        namePrefix: `Developable Area - Auto ${++developableAreaCount} (Fallback)`,
        description: 'Auto-generated developable area (fallback to site boundary due to processing error)',
        includeTimestamp: false  // Explicitly set includeTimestamp to false
      };
      
      const result = await createStyledDrawingFromFeature(
        fallbackPolygon,
        styleOptions,
        () => {}, // Empty function to avoid notifications
        () => {}
      );

      // Add success notification for the fallback
      setNotification({
        type: 'success',
        message: `Developable area generated successfully (using site boundary as fallback).`
      });
      
      return {
        developableArea: {
          type: 'FeatureCollection',
          features: [fallbackPolygon]
        },
        drawingResults: [result]
      };
    }
  } catch (error) {
    console.error('Error generating developable area:', error);
    // Keep this critical error notification
    setNotification({
      type: 'error',
      message: `Error generating developable area: ${error.message}`
    });
    return null;
  } finally {
    setIsGenerating(false);
  }
};

/**
 * Helper function to ensure Turf operations work with proper Feature objects
 * @param {Object} feature - The feature to ensure is valid for Turf operations
 * @returns {Object} - A valid feature for Turf operations
 */
function ensureTurfFeature(feature) {
  if (!feature) return null;
  
  try {
    // If this is a feature collection, extract the first feature
    if (feature.type === 'FeatureCollection' && feature.features && feature.features.length > 0) {
      console.log('Converting FeatureCollection to Feature');
      return ensureTurfFeature(feature.features[0]);
    }
    
    // If this is already a Feature, ensure it has the right structure
    if (feature.type === 'Feature' && feature.geometry) {
      // Create a fresh copy with just the essential properties
      return {
        type: 'Feature',
        properties: {},
        geometry: {
          type: feature.geometry.type || 'Polygon',
          coordinates: feature.geometry.coordinates
        }
      };
    }
    
    // If this is just a geometry, convert it to a Feature
    if (feature.type && feature.coordinates) {
      return {
        type: 'Feature',
        properties: {},
        geometry: {
          type: feature.type,
          coordinates: feature.coordinates
        }
      };
    }
    
    // If not recognized, log and return the original
    console.log('Unrecognized feature type:', feature.type);
    return feature;
  } catch (error) {
    console.log('Error in ensureTurfFeature:', error.message);
    return feature;
  }
}

/**
 * Attempts to perform a difference operation with proper error handling
 * @param {Object} polygon1 - The polygon to subtract from
 * @param {Object} polygon2 - The polygon to subtract
 * @returns {Object|null} - The result or null if operation fails
 */
function tryDifference(polygon1, polygon2) {
  try {
    // Make sure we have valid inputs
    if (!polygon1 || !polygon2 || !polygon1.geometry || !polygon2.geometry) {
      console.log('Invalid inputs for difference operation');
      return null;
    }
    
    // Log coordinate details for debugging
    console.log('Polygon1 first few coordinates:', JSON.stringify(polygon1.geometry.coordinates[0].slice(0, 3)));
    console.log('Polygon2 first few coordinates:', JSON.stringify(polygon2.geometry.coordinates[0].slice(0, 3)));
    
    // Create clean copies with explicit 2D coordinates
    const cleanPoly1 = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: polygon1.geometry.coordinates.map(ring => 
          ring.map(coord => [parseFloat(coord[0]), parseFloat(coord[1])])
        )
      }
    };
    
    // For polygon2, we need to ensure it has at least 4 points to form a valid polygon
    // Check if we have fewer than 4 points in polygon2's first ring
    if (polygon2.geometry.coordinates[0] && polygon2.geometry.coordinates[0].length < 4) {
      console.log('Polygon2 has fewer than 4 points, creating expanded polygon');
      // Create a simple box around the points to ensure we have 4+ vertices
      const coords = polygon2.geometry.coordinates[0];
      
      // Calculate center point
      const centerX = coords.reduce((sum, c) => sum + parseFloat(c[0]), 0) / coords.length;
      const centerY = coords.reduce((sum, c) => sum + parseFloat(c[1]), 0) / coords.length;
      
      // Create a small square buffer (10m) around the center point
      const buffer = 0.0001; // ~10 meters
      const boxCoords = [
        [centerX - buffer, centerY - buffer],
        [centerX + buffer, centerY - buffer],
        [centerX + buffer, centerY + buffer],
        [centerX - buffer, centerY + buffer],
        [centerX - buffer, centerY - buffer] // Close the ring
      ];
      
      const cleanPoly2 = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [boxCoords]
        }
      };
      
      // Create a FeatureCollection
      const fc = turf.featureCollection([cleanPoly1, cleanPoly2]);
      
      // Attempt difference operation
      try {
        console.log('Attempting difference with box buffer');
        const result = turf.difference(fc);
        if (result) {
          console.log('Square buffer difference succeeded');
          return result;
        }
      } catch (e) {
        console.log('Square buffer difference failed:', e.message);
      }
      
      return cleanPoly1; // Return original if all operations fail
    }
    
    const cleanPoly2 = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: polygon2.geometry.coordinates.map(ring => 
          ring.map(coord => {
            // Ensure we're only taking the first two elements (x,y) regardless of array length
            if (Array.isArray(coord) && coord.length >= 2) {
              return [parseFloat(coord[0]), parseFloat(coord[1])];
            } else {
              console.log('Invalid coordinate', coord);
              return null;
            }
          }).filter(coord => coord !== null)
        ).filter(ring => ring.length >= 4) // A valid ring needs at least 4 points
      }
    };
    
    // Check if we have valid cleaned polygons
    if (cleanPoly1.geometry.coordinates.length === 0 || cleanPoly2.geometry.coordinates.length === 0) {
      console.log('Cleaning resulted in empty polygon geometries');
      return null;
    }
    
    // Ensure each polygon has closed rings (first point = last point)
    cleanPoly1.geometry.coordinates = cleanPoly1.geometry.coordinates.map(ring => {
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        return [...ring, [...first]]; // Close the ring
      }
      return ring;
    });
    
    cleanPoly2.geometry.coordinates = cleanPoly2.geometry.coordinates.map(ring => {
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        return [...ring, [...first]]; // Close the ring
      }
      return ring;
    });
    
    // Try the difference operation with cleaned geometries
    console.log('Attempting difference with cleaned geometries');
    try {
      // Create a FeatureCollection with both polygons
      const fc = turf.featureCollection([cleanPoly1, cleanPoly2]);
      
      // Apply difference
      const result = turf.difference(fc);
      
      if (result) {
        console.log('Clean difference succeeded');
        return result;
      }
    } catch (diffError) {
      console.log('Difference operation error:', diffError.message);
    }
    
    // If direct difference fails, try with buffered geometries
    try {
      const buffer1 = turf.buffer(cleanPoly1, 0.00001, {units: 'kilometers'});
      const buffer2 = turf.buffer(cleanPoly2, 0.00001, {units: 'kilometers'});
      
      if (!buffer1 || !buffer2) {
        console.log('Failed to create buffer for polygons');
        return null;
      }
      
      // Create a FeatureCollection with both buffered polygons
      const bufferFC = turf.featureCollection([buffer1, buffer2]);
      
      // Apply difference
      const bufferResult = turf.difference(bufferFC);
      
      if (bufferResult) {
        console.log('Buffered difference succeeded');
        return bufferResult;
      }
    } catch (bufferError) {
      console.log('Buffered difference error:', bufferError.message);
    }
    
    console.log('All difference attempts failed');
    return null;
  } catch (error) {
    console.log('Error in tryDifference:', error.message);
    return null;
  }
}

/**
 * Creates a circular approximation of the biodiversity feature and subtracts it
 * @param {Object} property - The property polygon
 * @param {Object} bioFeature - The biodiversity feature
 * @returns {Object} - The result of the difference operation
 */
function createCircularDifference(property, bioFeature) {
  try {
    console.log('Using circular approximation');
    
    // Create a clean property feature
    const cleanProperty = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: property.geometry.coordinates.map(ring => 
          ring.map(coord => [parseFloat(coord[0]), parseFloat(coord[1])])
        )
      }
    };
    
    // Get center point of biodiversity feature - try multiple methods
    let center;
    try {
      // First try centerOfMass
      center = turf.centerOfMass(bioFeature);
    } catch (centerErr) {
      try {
        // Fall back to center (envelope)
        center = turf.center(bioFeature);
      } catch (centerErr2) {
        try {
          // Last resort: centroid
          center = turf.centroid(bioFeature);
        } catch (centerErr3) {
          // Final attempt: use first coordinate
          if (bioFeature.geometry.coordinates[0] && bioFeature.geometry.coordinates[0].length > 0) {
            center = {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [
                  parseFloat(bioFeature.geometry.coordinates[0][0][0]),
                  parseFloat(bioFeature.geometry.coordinates[0][0][1])
                ]
              }
            };
          } else {
            console.log('Cannot determine center point of feature');
            return property;
          }
        }
      }
    }
    
    console.log('Feature center point:', center.geometry.coordinates);
    
    // Calculate area and corresponding radius
    let area;
    try {
      area = turf.area(bioFeature);
    } catch (e) {
      // If area calculation fails, use a moderate default area
      console.log('Area calculation failed, using default');
      area = 2500; // 2500 square meters default (increased from 1000)
    }
    
    // Convert area to radius with a larger minimum size to ensure coverage
    // Increased minimum radius from 0.02 to 0.05 (50m)
    // Increased multiplier from 1.2 to 1.5 for 50% extra coverage
    const radius = Math.max(0.05, Math.sqrt(area / Math.PI) * 1.5) / 1000; // at least 50m, with 50% extra
    console.log(`Creating buffer with radius ${radius}km from area ${area}m²`);
    
    // Create a circular buffer
    const circle = turf.buffer(center, radius, {units: 'kilometers'});
    
    // Create intersection with property to ensure we only remove within property bounds
    // First create a slightly expanded property for better intersection
    const expandedProperty = turf.buffer(propertyPolygon, 0.005, { units: 'kilometers' });
    
    let intersectingCircle;
    try {
      const fcForIntersection = turf.featureCollection([circle, expandedProperty]);
      intersectingCircle = turf.intersect(fcForIntersection);
      
      if (!intersectingCircle) {
        console.log('No valid intersection found between circle and property');
        
        // Try clipping with property bbox instead
        try {
          const propertyBox = turf.bbox(propertyPolygon);
          intersectingCircle = turf.bboxClip(circle, propertyBox);
          
          if (!intersectingCircle) {
            console.log('Bbox clipping also failed, using original circle');
            intersectingCircle = circle;
          }
        } catch (clipErr) {
          console.log('Error clipping with bbox:', clipErr.message);
          intersectingCircle = circle;
        }
      }
    } catch (intersectErr) {
      console.log('Error creating intersection:', intersectErr.message);
      // Fallback to using the original circle
      intersectingCircle = circle;
    }
    
    // Try the difference operation
    try {
      console.log('Attempting difference with circular approximation');
      // Create a FeatureCollection
      const fc = turf.featureCollection([cleanProperty, intersectingCircle]);
      
      // Perform the difference operation
      const result = turf.difference(fc);
      
      if (result) {
        console.log('Circular difference succeeded');
        return result;
      } else {
        console.log('Circular difference returned null result');
      }
    } catch (diffError) {
      console.log('Circular difference failed:', diffError.message);
      
      // Try a second approach with a buffered property
      try {
        console.log('Attempting second difference approach with buffered property');
        // Use a larger buffer for more reliable operation
        const bufferedProperty = turf.buffer(cleanProperty, 0.001, {units: 'kilometers'});
        const fc2 = turf.featureCollection([bufferedProperty, intersectingCircle]);
        const result2 = turf.difference(fc2);
        
        if (result2) {
          console.log('Second circular difference succeeded');
          return result2;
        }
      } catch (diffError2) {
        console.log('Second circular difference failed:', diffError2.message);
        
        // Try a third approach with simplified geometries
        try {
          console.log('Attempting third difference approach with simplified geometries');
          const simplifiedProperty = turf.simplify(cleanProperty, { tolerance: 0.0001 });
          const simplifiedCircle = turf.simplify(intersectingCircle, { tolerance: 0.0001 });
          const fc3 = turf.featureCollection([simplifiedProperty, simplifiedCircle]);
          const result3 = turf.difference(fc3);
          
          if (result3) {
            console.log('Third circular difference succeeded');
            return result3;
          }
        } catch (diffError3) {
          console.log('Third circular difference failed:', diffError3.message);
        }
      }
    }
    
    // If everything fails, try to use a polygon-aware buffer approach
    try {
      console.log('Attempting final polygon-aware buffer approach');
      
      // Create multiple smaller circles around the polygon vertices
      const vertices = bioFeature.geometry.coordinates[0];
      if (vertices && vertices.length > 2) {
        let multibufferPolygon = cleanProperty;
        
        // Use a subset of vertices for performance (max 8 points)
        const step = Math.max(1, Math.floor(vertices.length / 8));
        for (let i = 0; i < vertices.length; i += step) {
          try {
            const vertexPoint = {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: vertices[i]
              }
            };
            
            // Create a small buffer around this vertex
            const vertexBuffer = turf.buffer(vertexPoint, radius * 0.7, {units: 'kilometers'});
            
            // Subtract this buffer from the result
            const fcVertex = turf.featureCollection([multibufferPolygon, vertexBuffer]);
            const vertexResult = turf.difference(fcVertex);
            
            if (vertexResult) {
              multibufferPolygon = vertexResult;
            }
          } catch (vertexErr) {
            // Continue with next vertex
          }
        }
        
        // Check if we've made any changes to the property
        const originalArea = turf.area(cleanProperty);
        const newArea = turf.area(multibufferPolygon);
        
        if (newArea < originalArea * 0.99) {  // At least 1% reduction in area
          console.log('Polygon-aware buffer approach succeeded');
          return multibufferPolygon;
        }
      }
    } catch (polyErr) {
      console.log('Polygon-aware buffer approach failed:', polyErr.message);
    }
    
    // If everything fails, just return the original property
    console.log('All approaches failed, returning original property');
    return property;
  } catch (error) {
    console.log('Error in createCircularDifference:', error.message);
    return property; // Return original property if everything fails
  }
}

/**
 * Ensures the input is a valid GeoJSON Feature object
 * @param {Object} geojson - The input GeoJSON object
 * @returns {Object} - A valid GeoJSON Feature object, or null if conversion fails
 */
function ensureFeature(geojson) {
  if (!geojson) return null;
  
  try {
    // If it's already a Feature, validate and fix if necessary
    if (geojson.type === 'Feature' && geojson.geometry) {
      // Create a working copy to avoid modifying the original
      const feature = JSON.parse(JSON.stringify(geojson));
      
      // Ensure properties exist
      if (!feature.properties) {
        feature.properties = {};
      }
      
      // Ensure geometry type is set
      if (!feature.geometry.type && feature.geometry.coordinates) {
        // Try to determine the correct type based on coordinates structure
        if (Array.isArray(feature.geometry.coordinates)) {
          if (Array.isArray(feature.geometry.coordinates[0])) {
            if (Array.isArray(feature.geometry.coordinates[0][0])) {
              // If it's an array of arrays of coordinates, it's a Polygon
              feature.geometry.type = 'Polygon';
            } else {
              // If it's an array of coordinates, it's a LineString
              feature.geometry.type = 'LineString';
            }
          } else {
            // If it's a single coordinate, it's a Point
            feature.geometry.type = 'Point';
          }
        } else {
          // Default to Polygon if structure can't be determined
          feature.geometry.type = 'Polygon';
        }
      }
      
      // Ensure coordinates are properly structured for Polygon type
      if (feature.geometry.type === 'Polygon') {
        if (!feature.geometry.coordinates) {
          console.warn('Missing coordinates for Polygon geometry');
          return null;
        }
        
        // Make sure coordinates is an array of arrays (rings)
        if (!Array.isArray(feature.geometry.coordinates)) {
          console.warn('Invalid coordinates format for Polygon: not an array');
          return null;
        }
        
        // If coordinates isn't an array of arrays, wrap it
        if (!Array.isArray(feature.geometry.coordinates[0])) {
          feature.geometry.coordinates = [feature.geometry.coordinates];
        }
        
        // Ensure each ring has at least 4 points and is closed
        for (let i = 0; i < feature.geometry.coordinates.length; i++) {
          const ring = feature.geometry.coordinates[i];
          
          if (!Array.isArray(ring)) {
            console.warn(`Invalid ring at index ${i}: not an array`);
            return null;
          }
          
          if (ring.length < 4) {
            console.warn(`Invalid ring at index ${i}: needs at least 4 points`);
            return null;
          }
          
          // Check if the ring is closed (first and last points match)
          const firstPoint = ring[0];
          const lastPoint = ring[ring.length - 1];
          
          if (!firstPoint || !lastPoint || 
              !Array.isArray(firstPoint) || !Array.isArray(lastPoint) ||
              firstPoint.length < 2 || lastPoint.length < 2) {
            console.warn(`Invalid ring points at index ${i}`);
            return null;
          }
          
          // If the ring is not closed, close it
          if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
            ring.push([...firstPoint]);
          }
        }
      }
      
      return feature;
    }
    
    // If it's a FeatureCollection, return the first feature
    if (geojson.type === 'FeatureCollection' && geojson.features && geojson.features.length > 0) {
      // Try to ensure the first feature is valid
      return ensureFeature(geojson.features[0]);
    }
    
    // If it's a geometry object, convert it to a Feature
    if (geojson.type && ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'].includes(geojson.type)) {
      const geometry = JSON.parse(JSON.stringify(geojson));
      
      // Create a new Feature with this geometry
      const feature = {
        type: 'Feature',
        geometry: geometry,
        properties: {}
      };
      
      // Now ensure the feature is valid by recursively calling this function
      return ensureFeature(feature);
    }
    
    // If it has a geometry property but is not a Feature
    if (geojson.geometry) {
      // Create a proper Feature
      const feature = {
        type: 'Feature',
        geometry: JSON.parse(JSON.stringify(geojson.geometry)),
        properties: geojson.properties ? JSON.parse(JSON.stringify(geojson.properties)) : {}
      };
      
      // Now ensure the feature is valid by recursively calling this function
      return ensureFeature(feature);
    }
    
    // If it has coordinates but no proper structure
    if (geojson.coordinates) {
      // Try to create a geometry and then a feature
      const geometry = {
        type: 'Polygon',  // Default to Polygon
        coordinates: JSON.parse(JSON.stringify(geojson.coordinates))
      };
      
      const feature = {
        type: 'Feature',
        geometry: geometry,
        properties: geojson.properties ? JSON.parse(JSON.stringify(geojson.properties)) : {}
      };
      
      // Now ensure the feature is valid by recursively calling this function
      return ensureFeature(feature);
    }
    
    console.warn('Unable to convert input to GeoJSON Feature:', geojson);
    return null;
  } catch (error) {
    console.error('Error ensuring GeoJSON Feature:', error);
    return null;
  }
}

/**
 * Fixes an invalid polygon by applying various repair strategies
 * @param {Object} polygon - The potentially invalid polygon to fix
 * @returns {Object} - The fixed polygon, or null if it cannot be fixed
 */
function fixInvalidPolygon(polygon) {
  if (!polygon) {
    console.warn('Cannot fix invalid polygon: No polygon provided');
    return null;
  }
  
  if (!polygon.geometry) {
    console.warn('Cannot fix invalid polygon: No geometry provided');
    return null;
  }

  try {
    console.log('Attempting to fix invalid polygon');
    
    // First, ensure we have a proper GeoJSON Feature
    const validFeature = ensureFeature(polygon);
    if (!validFeature) {
      console.warn('Cannot create a valid GeoJSON Feature from the input polygon');
      return null;
    }
    
    // Check if the polygon is already valid
    try {
      if (turf.booleanValid(validFeature)) {
        console.log('Polygon is already valid, no fixes needed');
        return validFeature;
      }
    } catch (validityCheckError) {
      console.warn('Error checking polygon validity:', validityCheckError.message);
      // Continue with repair attempts even if validity check fails
    }
    
    let fixedPolygon = null;
    
    // Strategy 1: Try using turf.buffer with a tiny buffer
    try {
      console.log('Strategy 1: Applying small buffer to fix polygon');
      const buffered = turf.buffer(validFeature, 0.0001, { units: 'kilometers' });
      
      if (buffered) {
        // Check if the buffered polygon is valid
        try {
          if (turf.booleanValid(buffered)) {
            console.log('Buffer strategy successful');
            fixedPolygon = buffered;
            return fixedPolygon;
          }
        } catch (validityError) {
          console.warn('Error checking validity of buffered polygon:', validityError.message);
        }
      }
    } catch (bufferError) {
      console.warn('Buffer strategy failed:', bufferError.message);
    }
    
    // Strategy 2: Try using turf.cleanCoords to remove duplicate vertices
    try {
      console.log('Strategy 2: Cleaning coordinates');
      const cleaned = turf.cleanCoords(validFeature);
      
      if (cleaned) {
        // Check if the cleaned polygon is valid
        try {
          if (turf.booleanValid(cleaned)) {
            console.log('Clean coordinates strategy successful');
            fixedPolygon = cleaned;
            return fixedPolygon;
          }
        } catch (validityError) {
          console.warn('Error checking validity of cleaned polygon:', validityError.message);
        }
      }
    } catch (cleanError) {
      console.warn('Clean coordinates strategy failed:', cleanError.message);
    }
    
    // Strategy 3: Try simplifying the polygon slightly
    try {
      console.log('Strategy 3: Simplifying polygon');
      const simplified = turf.simplify(validFeature, { tolerance: 0.0001, highQuality: true });
      
      if (simplified) {
        // Check if the simplified polygon is valid
        try {
          if (turf.booleanValid(simplified)) {
            console.log('Simplify strategy successful');
            fixedPolygon = simplified;
            return fixedPolygon;
          }
        } catch (validityError) {
          console.warn('Error checking validity of simplified polygon:', validityError.message);
        }
      }
    } catch (simplifyError) {
      console.warn('Simplify strategy failed:', simplifyError.message);
    }
    
    // Strategy 4: Try converting to convex hull as a last resort
    try {
      console.log('Strategy 4: Creating convex hull');
      const convexHull = turf.convex(validFeature);
      
      if (convexHull) {
        // Check if the convex hull is valid
        try {
          if (turf.booleanValid(convexHull)) {
            console.log('Convex hull strategy successful');
            fixedPolygon = convexHull;
            return fixedPolygon;
          }
        } catch (validityError) {
          console.warn('Error checking validity of convex hull:', validityError.message);
        }
      }
    } catch (convexError) {
      console.warn('Convex hull strategy failed:', convexError.message);
    }
    
    // If all strategies fail, log the issue and return null
    console.warn('All polygon repair strategies failed');
    return null;
  } catch (error) {
    console.error('Error fixing invalid polygon:', error);
    return null;
  }
}

/**
 * Creates a valid feature from potentially invalid input
 * @param {Object} input - Raw feature data
 * @returns {Object} - A valid GeoJSON feature or null
 */
function ensureValidFeature(input) {
  if (!input || !input.geometry) return null;
  
  try {
    // Create a clean copy
    const feature = {
      type: 'Feature',
      properties: input.properties || {},
      geometry: {
        type: input.geometry.type || 'Polygon',
        coordinates: []
      }
    };
    
    // Normalize and clean coordinates based on geometry type
    if (input.geometry.type === 'Polygon') {
      // Clean each ring of the polygon
      feature.geometry.coordinates = input.geometry.coordinates.map(ring => {
        if (!Array.isArray(ring)) {
          console.warn('Ring is not an array');
          return null;
        }
        
        // Ensure each coordinate is valid and has only X,Y values (remove Z values)
        const cleanedRing = ring.map(coord => {
          if (!Array.isArray(coord)) {
            console.warn('Coordinate is not an array');
            return null;
          }
          
          if (coord.length < 2) {
            console.warn('Coordinate has less than 2 values');
            return null;
          }
          
          // Always use just the first two values (X,Y) regardless of how many are provided
          return [Number(coord[0]), Number(coord[1])];
        }).filter(p => p !== null);
        
        // Ensure the ring has enough points
        if (cleanedRing.length < 3) {
          console.warn('Cleaned ring has less than 3 points');
          return null;
        }
        
        // Ensure the ring is closed (first point equals last point)
        const first = cleanedRing[0];
        const last = cleanedRing[cleanedRing.length - 1];
        
        if (first[0] !== last[0] || first[1] !== last[1]) {
          console.log('Closing the ring by adding the first point to the end');
          return [...cleanedRing, [...first]];
        }
        
        return cleanedRing;
      }).filter(ring => ring !== null && ring.length >= 4);
      
      // If no valid rings, return null
      if (feature.geometry.coordinates.length === 0) {
        console.warn('No valid rings found in Polygon');
        return null;
      }
    } else if (input.geometry.type === 'MultiPolygon') {
      // Process each polygon in the MultiPolygon
      feature.geometry.coordinates = input.geometry.coordinates.map(polygon => {
        if (!Array.isArray(polygon)) {
          console.warn('Polygon is not an array');
          return null;
        }
        
        // Clean each ring of each polygon
        const cleanedPolygon = polygon.map(ring => {
          if (!Array.isArray(ring)) {
            console.warn('Ring is not an array');
            return null;
          }
          
          // Ensure each coordinate is valid and has only X,Y values
          const cleanedRing = ring.map(coord => {
            if (!Array.isArray(coord)) {
              console.warn('Coordinate is not an array');
              return null;
            }
            
            if (coord.length < 2) {
              console.warn('Coordinate has less than 2 values');
              return null;
            }
            
            // Always use just the first two values (X,Y)
            return [Number(coord[0]), Number(coord[1])];
          }).filter(p => p !== null);
          
          // Ensure the ring has enough points
          if (cleanedRing.length < 3) {
            console.warn('Cleaned ring has less than 3 points');
            return null;
          }
          
          // Ensure the ring is closed
          const first = cleanedRing[0];
          const last = cleanedRing[cleanedRing.length - 1];
          
          if (first[0] !== last[0] || first[1] !== last[1]) {
            console.log('Closing the ring by adding the first point to the end');
            return [...cleanedRing, [...first]];
          }
          
          return cleanedRing;
        }).filter(ring => ring !== null && ring.length >= 4);
        
        // Return the cleaned polygon if it has valid rings
        return cleanedPolygon.length > 0 ? cleanedPolygon : null;
      }).filter(polygon => polygon !== null);
      
      // If no valid polygons, return null
      if (feature.geometry.coordinates.length === 0) {
        console.warn('No valid polygons found in MultiPolygon');
        return null;
      }
    } else {
      console.warn(`Unsupported geometry type: ${input.geometry.type}`);
      return null;
    }
    
    // Do a final validity check
    try {
      if (turf.booleanValid(feature)) {
        console.log('Feature is valid after cleanup');
        return feature;
      } else {
        console.warn('Feature is still invalid after cleanup');
      }
    } catch (validityError) {
      console.warn('Error checking validity:', validityError.message);
    }
    
    // If validity check fails, try bufferring to fix
    try {
      console.log('Attempting to fix with buffer');
      const buffered = turf.buffer(feature, 0.0001, { units: 'kilometers' });
      if (buffered) {
        console.log('Successfully fixed with buffer');
        return buffered;
      }
    } catch (bufferError) {
      console.warn('Buffer fix failed:', bufferError.message);
    }
    
    // Final attempt: try creating a convex hull
    try {
      console.log('Attempting to create convex hull');
      const convex = turf.convex(feature);
      if (convex) {
        console.log('Successfully created convex hull');
        return convex;
      }
    } catch (convexError) {
      console.warn('Convex hull creation failed:', convexError.message);
    }
    
    console.warn('All geometry fixes failed');
    return null;
  } catch (error) {
    console.warn('Error in ensureValidFeature:', error.message);
    return null;
  }
}

/**
 * Simplifies a geometry to ensure it works with Turf operations
 * @param {Object} feature - GeoJSON feature to simplify
 * @returns {Object} - Simplified feature
 */
function simplifyGeometry(feature) {
  if (!feature || !feature.geometry) return null;
  
  try {
    // First try standard simplification with a small tolerance
    const simplified = turf.simplify(feature, { tolerance: 0.0001, highQuality: true });
    if (simplified && turf.booleanValid(simplified)) {
      return simplified;
    }
    
    // If that fails, try with a buffer
    const buffered = turf.buffer(feature, 0.0001, { units: 'kilometers' });
    if (buffered && turf.booleanValid(buffered)) {
      return buffered;
    }
    
    // Last resort: try to create a simplified convex hull
    const convex = turf.convex(feature);
    if (convex) {
      return convex;
    }
    
    return null;
  } catch (error) {
    console.warn('Error in simplifyGeometry:', error.message);
    return null;
  }
}

/**
 * A wrapper around turf.difference with detailed logging to diagnose errors
 * @param {Object} polygon1 - The polygon to subtract from
 * @param {Object} polygon2 - The polygon to subtract
 * @returns {Object} - The resulting difference polygon
 */
function safeDifference(polygon1, polygon2) {
  console.log('=== SAFE DIFFERENCE START ===');
  
  try {
    // Log detailed information about input polygons
    console.log('Polygon 1 (target):', {
      type: polygon1.type,
      geometryType: polygon1.geometry?.type,
      validFeature: polygon1.type === 'Feature',
      hasCoordinates: Boolean(polygon1.geometry?.coordinates),
      coordinatesLength: polygon1.geometry?.coordinates?.length,
      firstRingLength: polygon1.geometry?.coordinates?.[0]?.length,
      properties: polygon1.properties
    });
    
    console.log('Polygon 2 (to subtract):', {
      type: polygon2.type,
      geometryType: polygon2.geometry?.type,
      validFeature: polygon2.type === 'Feature',
      hasCoordinates: Boolean(polygon2.geometry?.coordinates),
      coordinatesLength: polygon2.geometry?.coordinates?.length,
      firstRingLength: polygon2.geometry?.coordinates?.[0]?.length,
      properties: polygon2.properties
    });
    
    // Check both inputs are valid Features
    if (polygon1.type !== 'Feature' || polygon2.type !== 'Feature') {
      console.error('One or both inputs are not valid Features');
      return null;
    }
    
    // Check both inputs have Polygon geometry
    if (polygon1.geometry?.type !== 'Polygon' || polygon2.geometry?.type !== 'Polygon') {
      console.error('One or both inputs do not have Polygon geometry');
      
      if (polygon1.geometry?.type === 'MultiPolygon') {
        console.log('First input is MultiPolygon, trying to use first polygon');
        const firstPolygon = {
          type: 'Feature',
          properties: polygon1.properties || {},
          geometry: {
            type: 'Polygon',
            coordinates: polygon1.geometry.coordinates[0]
          }
        };
        
        if (polygon2.geometry?.type === 'MultiPolygon') {
          console.log('Second input is also MultiPolygon, trying to use first polygon');
          const secondPolygon = {
            type: 'Feature',
            properties: polygon2.properties || {},
            geometry: {
              type: 'Polygon',
              coordinates: polygon2.geometry.coordinates[0]
            }
          };
          
          console.log('Attempting difference with extracted polygons');
          const fc = turf.featureCollection([firstPolygon, secondPolygon]);
          return turf.difference(fc);
        }
        
        console.log('Attempting difference with extracted first polygon');
        const fc = turf.featureCollection([firstPolygon, polygon2]);
        return turf.difference(fc);
      }
      
      if (polygon2.geometry?.type === 'MultiPolygon') {
        console.log('Second input is MultiPolygon, trying to use first polygon');
        const secondPolygon = {
          type: 'Feature',
          properties: polygon2.properties || {},
          geometry: {
            type: 'Polygon',
            coordinates: polygon2.geometry.coordinates[0]
          }
        };
        
        console.log('Attempting difference with extracted second polygon');
        const fc = turf.featureCollection([polygon1, secondPolygon]);
        return turf.difference(fc);
      }
      
      return null;
    }
    
    // Verify coordinates and fix/clean if necessary
    let cleanPoly1 = polygon1;
    let cleanPoly2 = polygon2;
    
    // Clean and validate polygon1
    if (polygon1.geometry.coordinates.length === 0 || 
        polygon1.geometry.coordinates[0].length < 4) {
      console.warn('Polygon1 has invalid coordinate structure, attempting to fix');
      cleanPoly1 = fixInvalidPolygon(polygon1) || polygon1;
    }
    
    // Clean and validate polygon2
    if (polygon2.geometry.coordinates.length === 0 ||
        polygon2.geometry.coordinates[0].length < 4) {
      console.warn('Polygon2 has invalid coordinate structure, attempting to fix');
      cleanPoly2 = fixInvalidPolygon(polygon2) || polygon2;
    }
    
    // Check if polygons are valid after cleaning
    let isValid1 = false;
    let isValid2 = false;
    
    try {
      isValid1 = turf.booleanValid(cleanPoly1);
      isValid2 = turf.booleanValid(cleanPoly2);
      console.log(`Validity after cleaning: Polygon1=${isValid1}, Polygon2=${isValid2}`);
    } catch (validityError) {
      console.warn('Error checking validity after cleaning:', validityError.message);
    }
    
    // If still invalid, try more aggressive fixing
    if (!isValid1) {
      console.warn('Polygon1 still invalid, applying aggressive fixing');
      try {
        const buffered = turf.buffer(cleanPoly1, 0.0001, { units: 'kilometers' });
        if (buffered) cleanPoly1 = buffered;
      } catch (bufferError) {
        console.warn('Failed to buffer Polygon1:', bufferError.message);
      }
    }
    
    if (!isValid2) {
      console.warn('Polygon2 still invalid, applying aggressive fixing');
      try {
        const buffered = turf.buffer(cleanPoly2, 0.0001, { units: 'kilometers' });
        if (buffered) cleanPoly2 = buffered;
      } catch (bufferError) {
        console.warn('Failed to buffer Polygon2:', bufferError.message);
      }
    }
    
    // Check for intersection to avoid unnecessary processing
    let intersects = false;
    try {
      intersects = turf.booleanIntersects(cleanPoly1, cleanPoly2);
      console.log(`Polygons intersect: ${intersects}`);
      
      if (!intersects) {
        console.log('No intersection, returning original polygon');
        return cleanPoly1;
      }
    } catch (intersectError) {
      console.warn('Error checking intersection:', intersectError.message);
      // Continue anyway and try the difference
    }
    
    // Try intersecting with property first (if second polygon extends beyond property)
    let poly2ToUse = cleanPoly2;
    try {
      const fcForIntersection = turf.featureCollection([cleanPoly1, cleanPoly2]);
      const intersection = turf.intersect(fcForIntersection);
      
      if (intersection) {
        console.log('Created intersection between polygons, using for difference');
        poly2ToUse = intersection;
      }
    } catch (intersectError) {
      console.warn('Error creating intersection, using original polygon2:', intersectError.message);
    }
    
    // Attempt difference operation
    console.log('Calling turf.difference with cleaned polygons');
    try {
      // Create a FeatureCollection with both polygons
      const fc = turf.featureCollection([cleanPoly1, poly2ToUse]);
      // Apply difference
      const result = turf.difference(fc);
      
      if (result) {
        console.log('Difference successful');
        return result;
      } else {
        console.warn('Difference returned null result, trying buffer approach');
        
        try {
          const buffered1 = turf.buffer(cleanPoly1, 0.0001, { units: 'kilometers' });
          const buffered2 = turf.buffer(poly2ToUse, 0.0001, { units: 'kilometers' });
          const bufferFC = turf.featureCollection([buffered1, buffered2]);
          const bufferResult = turf.difference(bufferFC);
          
          if (bufferResult) {
            console.log('Buffer difference approach succeeded');
            return bufferResult;
          }
        } catch (bufferError) {
          console.warn('Buffer difference approach failed:', bufferError.message);
        }
      }
    } catch (diffError) {
      console.error('Error in difference operation:', diffError.message);
    }
    
    // Final resort - use convex hull and then try difference
    console.log('Trying final approach with convex hull');
    try {
      const convexPoly1 = turf.convex(cleanPoly1);
      const convexPoly2 = turf.convex(poly2ToUse);
      
      if (convexPoly1 && convexPoly2) {
        const convexFC = turf.featureCollection([convexPoly1, convexPoly2]);
        const convexResult = turf.difference(convexFC);
        
        if (convexResult) {
          console.log('Convex hull difference approach succeeded');
          return convexResult;
        }
      }
    } catch (convexError) {
      console.warn('Convex hull approach failed:', convexError.message);
    }
    
    // If all attempts fail, return the original polygon
    console.warn('All difference attempts failed, returning original polygon');
    return cleanPoly1;
  } catch (error) {
    console.error('Error in safeDifference:', error.message);
    return polygon1; // Return original as last resort
  } finally {
    console.log('=== SAFE DIFFERENCE END ===');
  }
}

/**
 * Creates a fallback developable area when standard difference fails
 * @param {Object} propertyFeature - The site boundary feature
 * @param {Array} bioFeatures - Array of biodiversity features that intersect
 * @returns {Object} - A simplified developable area feature
 */
function createFallbackDevelopableArea(propertyFeature, bioFeatures) {
  console.log('Creating fallback developable area');
  
  try {
    // 1. Create simplified versions of all geometries
    let simplifiedProperty;
    try {
      // First try to use the original property but cleaned
      const cleanedProperty = turf.cleanCoords(propertyFeature);
      
      // If cleaning doesn't help, create a convex hull
      if (!turf.booleanValid(cleanedProperty)) {
        console.log('Property not valid after cleaning, creating convex hull');
        simplifiedProperty = turf.convex(propertyFeature);
      } else {
        simplifiedProperty = cleanedProperty;
      }
      
      console.log('Simplified property:', {
        type: simplifiedProperty.type,
        geometryType: simplifiedProperty.geometry?.type,
        coordsLength: simplifiedProperty.geometry?.coordinates?.[0]?.length
      });
    } catch (propertyError) {
      console.warn('Failed to simplify property:', propertyError.message);
      return null;
    }
    
    if (!simplifiedProperty || !simplifiedProperty.geometry) {
      console.warn('Could not create a valid simplified property');
      return null;
    }
    
    // 2. For biodiversity areas, create simpler polygons that roughly represent their location and size
    const simpleBioAreas = [];
    
    for (let i = 0; i < bioFeatures.length; i++) {
      try {
        // Get the area of the bio feature to calculate an appropriate buffer size
        const area = turf.area(bioFeatures[i]);
        const center = turf.center(bioFeatures[i]);
        
        // Convert area to a radius (approximating the area as a circle)
        // Square root of (area / π)
        const approxRadius = Math.sqrt(area / Math.PI) / 1000; // in kilometers
        
        // Create a simple circular buffer
        const simpleCircle = turf.buffer(center, approxRadius, { units: 'kilometers' });
        
        if (simpleCircle) {
          simpleBioAreas.push(simpleCircle);
          console.log(`Created simplified bio area ${i+1} with radius ${approxRadius}km`);
        }
      } catch (bioError) {
        console.warn(`Failed to simplify bio feature ${i+1}:`, bioError.message);
      }
    }
    
    console.log(`Created ${simpleBioAreas.length} simplified bio areas`);
    
    // 3. Combine all bio areas into one
    let combinedBio = null;
    
    if (simpleBioAreas.length === 1) {
      combinedBio = simpleBioAreas[0];
    } else if (simpleBioAreas.length > 1) {
      try {
        // Start with the first area
        combinedBio = simpleBioAreas[0];
        
        // Union with each additional area
        for (let i = 1; i < simpleBioAreas.length; i++) {
          try {
            const unionResult = turf.union(combinedBio, simpleBioAreas[i]);
            if (unionResult) {
              combinedBio = unionResult;
            }
          } catch (unionError) {
            console.warn(`Failed to union bio area ${i}:`, unionError.message);
          }
        }
      } catch (combineError) {
        console.warn('Failed to combine bio areas:', combineError.message);
      }
    }
    
    // If we couldn't create biodiversity areas, return the property as is
    if (!combinedBio) {
      console.log('No valid combined bio area, returning simplified property');
      return simplifiedProperty;
    }
    
    // 4. Perform the difference operation
    try {
      // Ensure valid inputs
      const validProperty = ensureValidFeature(simplifiedProperty);
      const validBio = ensureValidFeature(combinedBio);
      
      if (!validProperty || !validBio) {
        console.warn('Invalid inputs for fallback difference');
        return simplifiedProperty;
      }
      
      // Use larger buffers to ensure robust operation
      const bufferedProperty = turf.buffer(validProperty, 0.001, { units: 'kilometers' });
      const bufferedBio = turf.buffer(validBio, 0.001, { units: 'kilometers' });
      
      // Perform difference
      console.log('Attempting fallback difference operation');
      const result = turf.difference(bufferedProperty, bufferedBio);
      
      if (result) {
        console.log('Fallback difference successful');
        return result;
      } else {
        console.warn('Fallback difference failed, returning simplified property');
        return simplifiedProperty;
      }
    } catch (diffError) {
      console.warn('Error in fallback difference:', diffError.message);
      return simplifiedProperty;
    }
  } catch (error) {
    console.error('Error in createFallbackDevelopableArea:', error.message);
    return propertyFeature; // Return original property as last resort
  }
} 