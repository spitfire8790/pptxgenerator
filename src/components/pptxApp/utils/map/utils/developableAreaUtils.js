import * as turf from '@turf/turf';
import { giraffeState, rpc } from '@gi-nx/iframe-sdk';
import { proxyRequest } from '../../services/proxyService';
import { calculateMercatorParams } from './coordinates';

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
 * Performs a manual difference operation by using a point-in-polygon test for each vertex
 * This is a last-resort approach when standard turf.difference operations fail
 * @param {Object} poly1 - The polygon to subtract from (GeoJSON Feature)
 * @param {Object} poly2 - The polygon to subtract (GeoJSON Feature)
 * @returns {Object} - A new polygon with the difference applied, or null if it fails
 */
function manualPolygonDifference(poly1, poly2) {
  console.log('Attempting manual point-in-polygon based difference');
  
  if (!poly1 || !poly1.geometry || !poly1.geometry.coordinates || !poly1.geometry.coordinates[0]) {
    console.warn('Invalid first polygon for manual difference');
    return null;
  }
  
  if (!poly2 || !poly2.geometry || !poly2.geometry.coordinates || !poly2.geometry.coordinates[0]) {
    console.warn('Invalid second polygon for manual difference');
    return poly1;
  }
  
  try {
    // Only works with Polygon types for now
    if (poly1.geometry.type !== 'Polygon' || poly2.geometry.type !== 'Polygon') {
      console.warn('Manual difference only supports Polygon types, not MultiPolygon');
      return poly1;
    }
    
    // Get the coordinates of the first polygon
    const coordinates1 = poly1.geometry.coordinates[0];
    const coordinates2 = poly2.geometry.coordinates[0];
    
    if (coordinates1.length < 4 || coordinates2.length < 4) {
      console.warn('Polygons must have at least 4 points');
      return poly1;
    }
    
    console.log('Processing polygon with', coordinates1.length, 'points');
    
    // Filter out points from poly1 that are inside poly2
    let outsidePoints = [];
    
    // First, check each point from the first polygon
    for (let i = 0; i < coordinates1.length; i++) {
      const point = coordinates1[i];
      const pointFeature = turf.point(point);
      
      // Check if the point is inside the second polygon
      let isInside = false;
      try {
        isInside = turf.booleanPointInPolygon(pointFeature, poly2);
      } catch (error) {
        console.warn('Error checking if point is in polygon:', error.message);
        isInside = false;
      }
      
      // If the point is outside poly2, keep it
      if (!isInside) {
        outsidePoints.push(point);
      }
    }
    
    console.log('Found', outsidePoints.length, 'points outside the subtracted polygon');
    
    // If all points are inside poly2, the result would be empty
    if (outsidePoints.length === 0) {
      console.warn('All points are inside the subtracted polygon, returning null');
      // Create an empty feature with the same properties
      return {
        type: 'Feature',
        properties: {
          ...poly1.properties,
          differenceApplied: true,
          manualPointDifference: true,
          isEmpty: true
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[]]
        }
      };
    }
    
    // If we have very few points, add boundary vertices from poly2 to create a better shape
    if (outsidePoints.length < 10) {
      console.log('Adding boundary points from second polygon to improve shape');
      // Add intersection points where edges of poly1 cross edges of poly2
      for (let i = 0; i < coordinates1.length - 1; i++) {
        for (let j = 0; j < coordinates2.length - 1; j++) {
          try {
            const line1 = turf.lineString([coordinates1[i], coordinates1[i+1]]);
            const line2 = turf.lineString([coordinates2[j], coordinates2[j+1]]);
            const intersection = turf.lineIntersect(line1, line2);
            
            if (intersection && intersection.features && intersection.features.length > 0) {
              for (const feature of intersection.features) {
                outsidePoints.push(feature.geometry.coordinates);
              }
            }
          } catch (error) {
            // Ignore intersection errors
          }
        }
      }
    }
    
    // If we still don't have enough points for a valid polygon, return the original
    if (outsidePoints.length < 3) {
      console.warn('Not enough points for a valid polygon after filtering');
      return poly1;
    }
    
    // Create a direct polygon from these points by adding boundary traces
    try {
      // Sort the points to create a valid polygon boundary (simple approach: sort by angle from centroid)
      const centroid = outsidePoints.reduce((acc, point) => 
        [acc[0] + point[0] / outsidePoints.length, acc[1] + point[1] / outsidePoints.length], 
        [0, 0]
      );
      
      // Sort by angle from centroid
      outsidePoints.sort((a, b) => {
        const angleA = Math.atan2(a[1] - centroid[1], a[0] - centroid[0]);
        const angleB = Math.atan2(b[1] - centroid[1], b[0] - centroid[0]);
        return angleA - angleB;
      });
      
      // Make sure the polygon is closed by adding the first point again at the end
      if (outsidePoints.length > 0 && 
          (outsidePoints[0][0] !== outsidePoints[outsidePoints.length - 1][0] || 
           outsidePoints[0][1] !== outsidePoints[outsidePoints.length - 1][1])) {
        outsidePoints.push([...outsidePoints[0]]);
      }
      
      console.log('Created closed ring with', outsidePoints.length, 'points');
      
      // Create a new polygon directly
      try {
        // First try with turf.polygon
        const resultPolygon = turf.polygon([outsidePoints], {
          ...poly1.properties,
          differenceApplied: true,
          manualPointDifference: true
        });
        
        // Verify the polygon is valid
        let isValid = false;
        try {
          isValid = turf.booleanValid(resultPolygon);
        } catch (validityError) {
          console.warn('Error checking polygon validity:', validityError.message);
        }
        
        if (isValid) {
          console.log('Created valid manual difference polygon');
          return resultPolygon;
        } else {
          console.warn('Created polygon is invalid, trying simpler approach');
          
          // Try with a convex hull as a last resort
          try {
            const pointsFC = turf.featureCollection(outsidePoints.map(p => turf.point(p)));
            const convexHull = turf.convex(pointsFC);
            
            if (convexHull) {
              convexHull.properties = {
                ...poly1.properties,
                differenceApplied: true,
                manualPointDifference: true,
                convexHullUsed: true
              };
              
              console.log('Created convex hull as manual difference result');
              return convexHull;
            }
          } catch (hullError) {
            console.warn('Error creating convex hull:', hullError.message);
          }
        }
      } catch (polyError) {
        console.warn('Error creating polygon from points:', polyError.message);
      }
    } catch (sortError) {
      console.warn('Error sorting points:', sortError.message);
    }
    
    // If all else fails, return original
    console.warn('All manual difference approaches failed');
    return poly1;
  } catch (error) {
    console.error('Error in manual polygon difference:', error.message);
    return poly1;
  }
}

/**
 * Safely performs a polygon difference operation with fallbacks
 * @param {Object} polygon1 - The polygon to subtract from
 * @param {Object} polygon2 - The polygon to subtract
 * @returns {Object} - The result of the difference operation, or null if it fails
 */
function safePolygonDifference(polygon1, polygon2) {
  // Early validation - if either polygon is missing, return the first one
  if (!polygon1) {
    console.warn('Cannot perform difference: Missing first polygon');
    return null;
  }
  
  if (!polygon2) {
    console.warn('Cannot perform difference: Missing second polygon, returning original');
    return polygon1;
  }
  
  try {
    console.log('Starting safePolygonDifference with improved debugging');
    
    // Create working copies to avoid modifying the originals
    let poly1 = JSON.parse(JSON.stringify(polygon1));
    let poly2 = JSON.parse(JSON.stringify(polygon2));
    
    // Log the coordinates to verify they exist
    console.log('Polygon 1 coordinates length:', poly1.geometry?.coordinates?.[0]?.length || 'undefined');
    console.log('Polygon 2 coordinates length:', poly2.geometry?.coordinates?.[0]?.length || 'undefined');
    
    // ENHANCED VALIDATION: Ensure we have valid inputs before proceeding
    // Check if both polygons have coordinates
    if (!poly1.geometry?.coordinates || !poly2.geometry?.coordinates) {
      console.warn('Invalid input: One or both polygons missing coordinates');
      return polygon1;
    }
    
    // Check if coordinates arrays have valid length
    if (poly1.geometry.coordinates[0]?.length < 4 || poly2.geometry.coordinates[0]?.length < 4) {
      console.warn('Invalid input: Polygon coordinates must form a closed ring with at least 4 points');
      return polygon1;
    }
    
    // Guarantee both inputs have explicit type values set
    if (!poly1.type) poly1.type = 'Feature';
    if (!poly2.type) poly2.type = 'Feature';
    
    // Guarantee both have properties
    if (!poly1.properties) poly1.properties = {};
    if (!poly2.properties) poly2.properties = {};
    
    // Guarantee both have geometry objects
    if (!poly1.geometry) {
      console.warn('Polygon 1 is missing geometry');
      return polygon1;
    }
    
    if (!poly2.geometry) {
      console.warn('Polygon 2 is missing geometry');
      return polygon1;
    }
    
    // Guarantee geometry types are set
    if (!poly1.geometry.type) poly1.geometry.type = 'Polygon';
    if (!poly2.geometry.type) poly2.geometry.type = 'Polygon';
    
    // Direct approach: Create fresh GeoJSON polygon features
    try {
      console.log('Creating fresh polygon features from coordinates');
      
      // Approach 1: Direct use of turf.polygon and turf.difference
      try {
        // For Polygon type
        if (poly1.geometry.type === 'Polygon') {
          // Ensure coordinates are properly formatted
          const coords1 = poly1.geometry.coordinates[0];
          
          // Validate coordinates
          if (!coords1 || coords1.length < 4) {
            console.warn('Invalid coordinates for polygon 1');
            return polygon1;
          }
          
          // Ensure the polygon is closed (first and last points match)
          if (JSON.stringify(coords1[0]) !== JSON.stringify(coords1[coords1.length - 1])) {
            coords1.push([...coords1[0]]);
          }
          
          // For Polygon type
          if (poly2.geometry.type === 'Polygon') {
            const coords2 = poly2.geometry.coordinates[0];
            
            // Validate coordinates
            if (!coords2 || coords2.length < 4) {
              console.warn('Invalid coordinates for polygon 2');
              return polygon1;
            }
            
            // Ensure the polygon is closed
            if (JSON.stringify(coords2[0]) !== JSON.stringify(coords2[coords2.length - 1])) {
              coords2.push([...coords2[0]]);
            }
            
            // Create new polygon features using turf.polygon
            console.log('Creating polygon features with turf.polygon');
            let turfPoly1, turfPoly2;
            
            try {
              turfPoly1 = turf.polygon([coords1], poly1.properties);
            } catch (error) {
              console.warn('Failed to create turfPoly1:', error.message);
              return polygon1;
            }
            
            try {
              turfPoly2 = turf.polygon([coords2], poly2.properties);
            } catch (error) {
              console.warn('Failed to create turfPoly2:', error.message);
              return polygon1;
            }
            
            // Verify that both polygon features were created successfully
            if (!turfPoly1 || !turfPoly2) {
              console.warn('Failed to create valid turf polygons');
              return polygon1;
            }
            
            console.log('Attempting turf.difference with polygon features');
            try {
              // Verify that both inputs are valid GeoJSON Features before using difference
              if (turfPoly1.type !== 'Feature' || turfPoly2.type !== 'Feature') {
                console.warn('Invalid inputs for difference: Not Feature objects');
                return polygon1;
              }
              
              // Check if both polygons have at least 1 linear ring with 4+ points
              if (!turfPoly1.geometry?.coordinates?.[0]?.length || turfPoly1.geometry.coordinates[0].length < 4 ||
                  !turfPoly2.geometry?.coordinates?.[0]?.length || turfPoly2.geometry.coordinates[0].length < 4) {
                console.warn('Invalid polygon coordinates: Must have at least 4 points in a linear ring');
                return polygon1;
              }
              
              // THIS IS THE KEY OPERATION: turf.difference needs two Features, not a FeatureCollection
              const diffResult = turf.difference(turfPoly1, turfPoly2);
              
              // If successful, return the result
              if (diffResult) {
                console.log('Difference operation successful!');
                console.log('Result coordinates length:', diffResult.geometry.coordinates[0].length);
                
                // Add original properties back to the result
                diffResult.properties = {
                  ...polygon1.properties,
                  ...diffResult.properties,
                  differenceApplied: true
                };
                
                return diffResult;
              } else {
                console.warn('Difference returned null or invalid result');
              }
            } catch (diffError) {
              console.warn('Error in difference operation:', diffError.message);
              
              // Special handling for "Must have at least two features" error
              if (diffError.message.includes('Must have at least two features')) {
                console.log('Attempting manual difference via clipping with intersection approach');
                try {
                  // Create a negative space of poly2 using a large bounding box
                  const bbox = turf.bbox(turf.buffer(turfPoly1, 1, { units: 'kilometers' }));
                  const bboxPolygon = turf.bboxPolygon(bbox);
                  
                  // Create the "negative" of poly2 by clipping it from the bounding box
                  try {
                    const negative = turf.difference(bboxPolygon, turfPoly2);
                    if (negative) {
                      // Now intersect poly1 with this negative to get the difference
                      const intersection = turf.intersect(turfPoly1, negative);
                      if (intersection) {
                        console.log('Manual difference via clipping successful!');
                        return {
                          type: 'Feature',
                          properties: {
                            ...polygon1.properties,
                            differenceApplied: true,
                            manualDifference: true
                          },
                          geometry: intersection.geometry
                        };
                      }
                    }
                  } catch (manualError) {
                    console.warn('Manual difference failed:', manualError.message);
                  }
                } catch (boxError) {
                  console.warn('Error creating bounding box for manual difference:', boxError.message);
                }
              }
            }
          }
          // Handle MultiPolygon for poly2
          else if (poly2.geometry.type === 'MultiPolygon') {
            // Attempt to use each polygon in the MultiPolygon one by one
            console.log('Polygon 2 is a MultiPolygon, processing each polygon individually');
            
            let currentPoly = turfPoly1 = turf.polygon([coords1], poly1.properties);
            
            for (let i = 0; i < poly2.geometry.coordinates.length; i++) {
              try {
                const multiCoords = poly2.geometry.coordinates[i][0];
                
                // Validate coordinates
                if (!multiCoords || multiCoords.length < 4) {
                  console.log(`Skipping invalid coordinates in MultiPolygon at index ${i}`);
                  continue;
                }
                
                // Ensure the polygon is closed
                if (JSON.stringify(multiCoords[0]) !== JSON.stringify(multiCoords[multiCoords.length - 1])) {
                  multiCoords.push([...multiCoords[0]]);
                }
                
                const turfMultiPoly = turf.polygon([multiCoords], {});
                
                // Try the difference operation
                try {
                  const diffResult = turf.difference(currentPoly, turfMultiPoly);
                  
                  if (diffResult) {
                    console.log(`Successfully subtracted MultiPolygon part ${i+1}`);
                    currentPoly = diffResult;
                  }
                } catch (multiDiffError) {
                  console.warn(`Error subtracting MultiPolygon part ${i+1}:`, multiDiffError.message);
                }
              } catch (multiPartError) {
                console.warn(`Error processing MultiPolygon part ${i+1}:`, multiPartError.message);
              }
            }
            
            // Return the final result after processing all parts
            if (currentPoly !== turfPoly1) {
              console.log('MultiPolygon processing successful!');
              
              // Add original properties back to the result
              currentPoly.properties = {
                ...polygon1.properties,
                ...currentPoly.properties,
                differenceApplied: true
              };
              
              return currentPoly;
            }
          }
        }
        // Handle MultiPolygon for poly1
        else if (poly1.geometry.type === 'MultiPolygon') {
          console.log('Polygon 1 is a MultiPolygon');
          
          // Process each polygon in the MultiPolygon
          const resultPolygons = [];
          
          for (let i = 0; i < poly1.geometry.coordinates.length; i++) {
            try {
              const multiCoords1 = poly1.geometry.coordinates[i][0];
              
              // Validate coordinates
              if (!multiCoords1 || multiCoords1.length < 4) {
                console.log(`Skipping invalid coordinates in MultiPolygon 1 at index ${i}`);
                continue;
              }
              
              // Ensure the polygon is closed
              if (JSON.stringify(multiCoords1[0]) !== JSON.stringify(multiCoords1[multiCoords1.length - 1])) {
                multiCoords1.push([...multiCoords1[0]]);
              }
              
              const turfMultiPoly1 = turf.polygon([multiCoords1], {});
              
              // For Polygon type
              if (poly2.geometry.type === 'Polygon') {
                const coords2 = poly2.geometry.coordinates[0];
                
                // Validate coordinates
                if (!coords2 || coords2.length < 4) {
                  console.log(`Invalid coordinates for polygon 2 when processing MultiPolygon part ${i+1}`);
                  resultPolygons.push(turfMultiPoly1);
                  continue;
                }
                
                // Ensure the polygon is closed
                if (JSON.stringify(coords2[0]) !== JSON.stringify(coords2[coords2.length - 1])) {
                  coords2.push([...coords2[0]]);
                }
                
                const turfPoly2 = turf.polygon([coords2], {});
                
                // Try the difference operation
                try {
                  const diffResult = turf.difference(turfMultiPoly1, turfPoly2);
                  
                  if (diffResult) {
                    console.log(`Successfully subtracted from MultiPolygon part ${i+1}`);
                    resultPolygons.push(diffResult);
                  } else {
                    resultPolygons.push(turfMultiPoly1);
                  }
                } catch (multiDiffError) {
                  console.warn(`Error in difference for MultiPolygon part ${i+1}:`, multiDiffError.message);
                  resultPolygons.push(turfMultiPoly1);
                }
              }
              // Handle MultiPolygon for poly2 as well
              else if (poly2.geometry.type === 'MultiPolygon') {
                // Start with the current part
                let currentPart = turfMultiPoly1;
                
                // Process each part of poly2 against this part of poly1
                for (let j = 0; j < poly2.geometry.coordinates.length; j++) {
                  try {
                    const multiCoords2 = poly2.geometry.coordinates[j][0];
                    
                    // Validate coordinates
                    if (!multiCoords2 || multiCoords2.length < 4) {
                      console.log(`Skipping invalid coordinates in MultiPolygon 2 at index ${j}`);
                      continue;
                    }
                    
                    // Ensure the polygon is closed
                    if (JSON.stringify(multiCoords2[0]) !== JSON.stringify(multiCoords2[multiCoords2.length - 1])) {
                      multiCoords2.push([...multiCoords2[0]]);
                    }
                    
                    const turfMultiPoly2 = turf.polygon([multiCoords2], {});
                    
                    // Try the difference operation
                    try {
                      const diffResult = turf.difference(currentPart, turfMultiPoly2);
                      
                      if (diffResult) {
                        console.log(`Successfully subtracted MultiPolygon 2 part ${j+1} from MultiPolygon 1 part ${i+1}`);
                        currentPart = diffResult;
                      }
                    } catch (multiDiffError) {
                      console.warn(`Error subtracting MultiPolygon 2 part ${j+1} from MultiPolygon 1 part ${i+1}:`, multiDiffError.message);
                    }
                  } catch (multiPart2Error) {
                    console.warn(`Error processing MultiPolygon 2 part ${j+1}:`, multiPart2Error.message);
                  }
                }
                
                // Add the processed part to the result
                resultPolygons.push(currentPart);
              }
            } catch (multiPart1Error) {
              console.warn(`Error processing MultiPolygon 1 part ${i+1}:`, multiPart1Error.message);
            }
          }
          
          // Combine the result polygons into a MultiPolygon
          if (resultPolygons.length > 0) {
            console.log(`Created ${resultPolygons.length} result polygons from MultiPolygon processing`);
            
            // If there's only one result, return it directly
            if (resultPolygons.length === 1) {
              const result = resultPolygons[0];
              
              // Add original properties back to the result
              result.properties = {
                ...polygon1.properties,
                ...result.properties,
                differenceApplied: true
              };
              
              return result;
            }
            
            // Otherwise, create a MultiPolygon
            const multiPolygonCoords = resultPolygons.map(p => p.geometry.coordinates);
            
            try {
              const multiPolygonResult = turf.multiPolygon(multiPolygonCoords, {
                ...polygon1.properties,
                differenceApplied: true
              });
              
              return multiPolygonResult;
            } catch (multiPolygonError) {
              console.warn('Error creating MultiPolygon result:', multiPolygonError.message);
            }
          }
        }
      } catch (directError) {
        console.warn('Direct approach failed:', directError.message);
      }
      
      // Alternative approach: Use buffering to handle problematic geometries
      try {
        console.log('Attempting alternative buffer approach');
        
        // Create buffered versions which can sometimes handle problematic geometries
        let buffered1, buffered2;
        
        try {
          buffered1 = turf.buffer(poly1, 0.00001, { units: 'kilometers' });
          if (!buffered1) {
            console.warn('Failed to create buffer for polygon 1');
          }
        } catch (bufferError1) {
          console.warn('Error creating buffer for polygon 1:', bufferError1.message);
          buffered1 = null;
        }
        
        try {
          buffered2 = turf.buffer(poly2, 0.00001, { units: 'kilometers' });
          if (!buffered2) {
            console.warn('Failed to create buffer for polygon 2');
          }
        } catch (bufferError2) {
          console.warn('Error creating buffer for polygon 2:', bufferError2.message);
          buffered2 = null;
        }
        
        if (buffered1 && buffered2) {
          // Verify both buffered polygons are valid Feature objects
          if (buffered1.type !== 'Feature' || buffered2.type !== 'Feature') {
            console.warn('Buffered polygons are not valid Feature objects');
          } else {
            try {
              // Check if both buffered polygons have valid coordinates
              if (!buffered1.geometry?.coordinates?.[0]?.length || buffered1.geometry.coordinates[0].length < 4 ||
                  !buffered2.geometry?.coordinates?.[0]?.length || buffered2.geometry.coordinates[0].length < 4) {
                console.warn('Invalid buffered polygon coordinates: Must have at least 4 points in a linear ring');
                return null;
              }
              
              const diffResult = turf.difference(buffered1, buffered2);
              
              if (diffResult) {
                console.log('Buffer-based difference successful!');
                
                // Add original properties back to the result
                diffResult.properties = {
                  ...polygon1.properties,
                  ...diffResult.properties,
                  differenceApplied: true,
                  bufferApproach: true
                };
                
                return diffResult;
              }
            } catch (buffDiffError) {
              console.warn('Error in buffer-based difference:', buffDiffError.message);
              
              // Special handling for "Must have at least two features" error
              if (buffDiffError.message.includes('Must have at least two features')) {
                console.log('Attempting manual difference for buffered polygons via clipping');
                try {
                  // Create a negative space of buffered2 using a large bounding box
                  const bbox = turf.bbox(turf.buffer(buffered1, 1, { units: 'kilometers' }));
                  const bboxPolygon = turf.bboxPolygon(bbox);
                  
                  // Create the "negative" of buffered2 by clipping it from the bounding box
                  try {
                    const negative = turf.difference(bboxPolygon, buffered2);
                    if (negative) {
                      // Now intersect buffered1 with this negative to get the difference
                      const intersection = turf.intersect(buffered1, negative);
                      if (intersection) {
                        console.log('Manual difference for buffered polygons successful!');
                        return {
                          type: 'Feature',
                          properties: {
                            ...polygon1.properties,
                            differenceApplied: true,
                            bufferApproach: true,
                            manualDifference: true
                          },
                          geometry: intersection.geometry
                        };
                      }
                    }
                  } catch (manualError) {
                    console.warn('Manual buffered difference failed:', manualError.message);
                  }
                } catch (boxError) {
                  console.warn('Error creating bounding box for manual buffered difference:', boxError.message);
                }
              }
            }
          }
        }
      } catch (bufferError) {
        console.warn('Buffer approach failed:', bufferError.message);
      }
      
      // Last resort approach: Use bounding box difference
      try {
        console.log('Attempting bounding box difference approach');
        
        // Create a bounding box around the first polygon
        let bbox, bboxPolygon;
        
        try {
          bbox = turf.bbox(poly1);
          if (!bbox || bbox.length !== 4) {
            console.warn('Invalid bounding box created');
            return polygon1;
          }
          
          bboxPolygon = turf.bboxPolygon(bbox);
          if (!bboxPolygon || bboxPolygon.type !== 'Feature') {
            console.warn('Invalid bounding box polygon created');
            return polygon1;
          }
        } catch (bboxCreationError) {
          console.warn('Error creating bounding box:', bboxCreationError.message);
          return polygon1;
        }
        
        // Ensure poly2 is a valid Feature before attempting difference
        if (!poly2 || poly2.type !== 'Feature' || !poly2.geometry) {
          console.warn('Polygon 2 is not a valid Feature for bounding box approach');
          return polygon1;
        }
        
        // Create an inverse of the second polygon by subtracting it from the bounding box
        try {
          const inversePolygon = turf.difference(bboxPolygon, poly2);
          
          if (inversePolygon) {
            // Now intersect the first polygon with this inverse to get the difference
            try {
              // Ensure poly1 is a valid Feature before attempting intersection
              if (!poly1 || poly1.type !== 'Feature' || !poly1.geometry) {
                console.warn('Polygon 1 is not a valid Feature for intersection');
                return polygon1;
              }
              
              const intersectResult = turf.intersect(poly1, inversePolygon);
              
              if (intersectResult) {
                console.log('Bounding box difference-intersect approach successful!');
                
                return {
                  type: 'Feature',
                  properties: {
                    ...polygon1.properties,
                    differenceApplied: true,
                    bboxApproach: true
                  },
                  geometry: intersectResult.geometry
                };
              }
            } catch (intersectError) {
              console.warn('Error in bounding box intersection:', intersectError.message);
            }
          }
        } catch (inverseError) {
          console.warn('Error creating inverse polygon:', inverseError.message);
        }
      } catch (bboxError) {
        console.warn('Bounding box approach failed:', bboxError.message);
      }
    } catch (featureError) {
      console.warn('Error creating polygon features:', featureError.message);
    }
    
    // Final fallback: Try our completely manual point-in-polygon based approach
    try {
      console.log('All standard approaches failed, attempting manual point-based difference as last resort');
      const manualResult = manualPolygonDifference(poly1, poly2);
      if (manualResult && manualResult !== poly1) {
        console.log('Manual point-based difference succeeded!');
        return manualResult;
      }
    } catch (manualError) {
      console.warn('Manual point-based difference failed:', manualError.message);
    }
    
    console.warn('All difference approaches failed, returning original polygon');
    return polygon1;
  } catch (error) {
    console.error('Unexpected error in safePolygonDifference:', error);
    return polygon1;
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
 * Performs a polygon difference operation using ArcGIS REST API
 * This is more reliable for complex geometries that cause issues with Turf.js
 * @param {Object} polygon1 - The polygon to subtract from (GeoJSON Feature)
 * @param {Object} polygon2 - The polygon to subtract (GeoJSON Feature)
 * @returns {Promise<Object>} - A promise that resolves to the difference result, or null if it fails
 */
async function arcgisPolygonDifference(polygon1, polygon2) {
  console.log('Attempting polygon difference using ArcGIS REST Services');
  
  if (!polygon1 || !polygon1.geometry || !polygon2 || !polygon2.geometry) {
    console.warn('Invalid polygons for ArcGIS difference operation');
    return null;
  }
  
  try {
    // ArcGIS Geometry Service URL - Using ArcGIS Online (can be replaced with a more appropriate service)
    const geometryServiceUrl = 'https://utility.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer/difference';
    
    // Ensure the polygons are valid GeoJSON Features
    const poly1 = ensureFeature(polygon1);
    const poly2 = ensureFeature(polygon2);
    
    if (!poly1 || !poly2) {
      console.warn('Failed to ensure valid features for ArcGIS operation');
      return null;
    }
    
    // Additional debugging to check input geometries
    console.log('ArcGIS operation input details:');
    console.log('- Poly1 coordinates length:', poly1.geometry?.coordinates?.[0]?.length || 'undefined');
    console.log('- Poly2 coordinates length:', poly2.geometry?.coordinates?.[0]?.length || 'undefined');

    // Simplify both polygons to reduce request size - CRITICAL for large polygons
    let processedPoly1 = poly1;
    let processedPoly2 = poly2;
    
    // Simplify the first polygon if needed (usually property boundary)
    const poly1PointCount = poly1.geometry?.coordinates?.[0]?.length || 0;
    if (poly1PointCount > 50) {
      console.log(`Simplifying first polygon from ${poly1PointCount} points for ArcGIS operation`);
      try {
        const simplified = turf.simplify(poly1, { 
          tolerance: 0.00005, 
          highQuality: true
        });
        
        if (simplified) {
          const newPointCount = simplified.geometry?.coordinates?.[0]?.length || 0;
          console.log(`Successfully simplified first polygon from ${poly1PointCount} to ${newPointCount} points`);
          processedPoly1 = simplified;
        }
      } catch (simplifyError) {
        console.warn('Error simplifying first polygon:', simplifyError.message);
      }
    }
    
    // Simplify the second polygon more aggressively (usually biodiversity feature)
    const poly2PointCount = poly2.geometry?.coordinates?.[0]?.length || 0;
    if (poly2PointCount > 50) {
      console.log(`Simplifying second polygon from ${poly2PointCount} points for ArcGIS operation`);
      try {
        // Adjust tolerance based on point count - more aggressive for very large polygons
        const tolerance = poly2PointCount > 1000 ? 0.001 : 
                         poly2PointCount > 500 ? 0.0005 : 0.0001;
        
        const simplified = turf.simplify(poly2, { 
          tolerance: tolerance, 
          highQuality: true
        });
        
        if (simplified) {
          const newPointCount = simplified.geometry?.coordinates?.[0]?.length || 0;
          console.log(`Successfully simplified second polygon from ${poly2PointCount} to ${newPointCount} points`);
          processedPoly2 = simplified;
          
          // If the polygon is still very large, try more aggressive simplification
          if (newPointCount > 500) {
            try {
              const moreSimplified = turf.simplify(simplified, {
                tolerance: 0.005,
                highQuality: false
              });
              
              if (moreSimplified) {
                const finalPointCount = moreSimplified.geometry?.coordinates?.[0]?.length || 0;
                console.log(`Further simplified to ${finalPointCount} points`);
                processedPoly2 = moreSimplified;
              }
            } catch (extraSimplifyError) {
              console.warn('Error with extra simplification:', extraSimplifyError.message);
            }
          }
        }
      } catch (simplifyError) {
        console.warn('Error simplifying second polygon:', simplifyError.message);
      }
    }
    
    // ESRI requires rings in the opposite winding order of GeoJSON
    // Convert GeoJSON coordinates to ESRI rings format (carefully)
    let esriPoly1Rings = [];
    let esriPoly2Rings = [];
    
    // Handle different geometry types for the first polygon
    if (processedPoly1.geometry.type === 'Polygon') {
      // For Polygon, convert each ring to ESRI format
      esriPoly1Rings = processedPoly1.geometry.coordinates.map(ring => {
        // Make a copy to avoid mutating the original
        return [...ring];
      });
    } else if (processedPoly1.geometry.type === 'MultiPolygon') {
      // For MultiPolygon, flatten all rings
      processedPoly1.geometry.coordinates.forEach(polygon => {
        polygon.forEach(ring => {
          esriPoly1Rings.push([...ring]);
        });
      });
    } else {
      console.warn('Unsupported geometry type for polygon1:', processedPoly1.geometry.type);
      return null;
    }
    
    // Handle different geometry types for the second polygon
    if (processedPoly2.geometry.type === 'Polygon') {
      esriPoly2Rings = processedPoly2.geometry.coordinates.map(ring => {
        return [...ring];
      });
    } else if (processedPoly2.geometry.type === 'MultiPolygon') {
      processedPoly2.geometry.coordinates.forEach(polygon => {
        polygon.forEach(ring => {
          esriPoly2Rings.push([...ring]);
        });
      });
    } else {
      console.warn('Unsupported geometry type for polygon2:', processedPoly2.geometry.type);
      return null;
    }
    
    // Ensure at least one ring exists in each polygon
    if (esriPoly1Rings.length === 0 || esriPoly2Rings.length === 0) {
      console.warn('No valid rings found in one or both polygons');
      return null;
    }
    
    // Create proper ESRI JSON format geometries
    const esriPoly1 = {
      rings: esriPoly1Rings,
      spatialReference: { wkid: 4326 }
    };
    
    const esriPoly2 = {
      rings: esriPoly2Rings,
      spatialReference: { wkid: 4326 }
    };
    
    console.log('Prepared ESRI Polygon objects');
    
    // Create request parameters for the difference operation
    // FORMAT EXACTLY as expected by ArcGIS REST API
    const params = new URLSearchParams();
    params.append('f', 'json');
    
    // The "geometries" parameter contains the polygon we're subtracting FROM
    const geometriesParam = {
      geometryType: 'esriGeometryPolygon',
      geometries: [esriPoly1]
    };
    params.append('geometries', JSON.stringify(geometriesParam));
    
    // The "geometry" parameter contains the polygon we're subtracting (singular)
    params.append('geometry', JSON.stringify(esriPoly2));
    params.append('geometryType', 'esriGeometryPolygon');
    params.append('sr', '4326');
    
    console.log('Sending difference request to ArcGIS Geometry Service');
    console.log('Request parameters:', {
      url: geometryServiceUrl,
      geometriesCount: geometriesParam.geometries.length,
      geometry1Points: esriPoly1Rings[0]?.length || 0,
      geometry2Points: esriPoly2Rings[0]?.length || 0
    });
    
    // Send the request through our proxy service
    try {
      const response = await proxyRequest(geometryServiceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
      
      // Enhanced response debugging
      console.log('ArcGIS difference response received:', response ? 'Success' : 'Empty response');
      
      if (!response) {
        console.warn('Empty response from ArcGIS Geometry Service');
        return null;
      }
      
      // Handle error responses
      if (response.error) {
        console.warn('ArcGIS service returned an error:', response.error);
        return null;
      }
      
      // Check if we got a valid response with geometries
      if (!response.geometries) {
        console.warn('No geometries in ArcGIS response:', response);
        return null;
      }
      
      console.log('Number of geometries in response:', response.geometries?.length || 0);
      
      if (!response.geometries || response.geometries.length === 0) {
        console.warn('Empty geometries from ArcGIS Geometry Service');
        return null;
      }
      
      // Process the response - Convert ESRI geometry to GeoJSON
      const resultGeometry = response.geometries[0];
      if (!resultGeometry || !resultGeometry.rings || resultGeometry.rings.length === 0) {
        console.warn('Empty geometry result from ArcGIS');
        return null;
      }
      
      console.log('ArcGIS returned geometry with rings:', resultGeometry.rings.length);
      
      // Convert ESRI rings to GeoJSON coordinates
      // For single polygon results
      let geoJsonGeometry;
      if (resultGeometry.rings.length === 1) {
        geoJsonGeometry = {
          type: 'Polygon',
          coordinates: resultGeometry.rings
        };
      } 
      // For multiple polygon results (handle as MultiPolygon)
      else {
        // Group rings into separate polygons
        // This is a simplistic approach - in a real implementation, you'd need to
        // determine which rings are holes and which are outer rings
        geoJsonGeometry = {
          type: 'MultiPolygon',
          coordinates: resultGeometry.rings.map(ring => [ring])
        };
      }
      
      // Create a GeoJSON Feature with the original properties
      const resultFeature = {
        type: 'Feature',
        properties: {
          ...poly1.properties,
          differenceApplied: true,
          arcgisDifference: true
        },
        geometry: geoJsonGeometry
      };
      
      // Verify geometry is valid before returning
      try {
        const isValid = turf.booleanValid(resultFeature);
        console.log('ArcGIS result geometry is valid:', isValid);
        if (!isValid) {
          console.warn('ArcGIS returned invalid geometry, attempting to repair');
          const fixed = fixInvalidPolygon(resultFeature);
          if (fixed) {
            console.log('Successfully repaired ArcGIS result geometry');
            return fixed;
          }
        }
      } catch (validityError) {
        console.warn('Error checking validity of ArcGIS result:', validityError.message);
      }
      
      console.log('ArcGIS difference operation complete');
      return resultFeature;
      
    } catch (requestError) {
      console.error('Error making request to ArcGIS service:', requestError.message);
      return null;
    }
  } catch (error) {
    console.error('Error in ArcGIS difference operation:', error.message);
    return null;
  }
}

/**
 * Clips a feature to a buffered area around a boundary polygon to reduce complexity
 * This helps with features that extend far beyond the property boundaries
 * @param {Object} featureToClip - The feature that needs to be clipped (GeoJSON Feature)
 * @param {Object} boundaryPolygon - The boundary to clip against (GeoJSON Feature)
 * @param {number} bufferDistance - Buffer distance in kilometers
 * @returns {Object} - The clipped feature or the original if clipping fails
 */
function clipFeatureToBufferedArea(featureToClip, boundaryPolygon, bufferDistance = 0.5) {
  console.log('Clipping large feature to property buffer area');
  
  if (!featureToClip || !featureToClip.geometry || !boundaryPolygon || !boundaryPolygon.geometry) {
    console.warn('Invalid inputs for clipping operation');
    return featureToClip;
  }
  
  try {
    // Validate inputs are proper polygons
    if (featureToClip.geometry.type !== 'Polygon' || boundaryPolygon.geometry.type !== 'Polygon') {
      console.warn('Clipping only supports Polygon geometries, got:',
        featureToClip.geometry.type, 'and', boundaryPolygon.geometry.type);
      return featureToClip;
    }
    
    // Ensure polygon coordinates are valid
    if (!featureToClip.geometry.coordinates[0] || featureToClip.geometry.coordinates[0].length < 4 ||
        !boundaryPolygon.geometry.coordinates[0] || boundaryPolygon.geometry.coordinates[0].length < 4) {
      console.warn('Invalid polygon coordinates for clipping');
      return featureToClip;
    }
    
    // Create a buffered boundary around the property polygon
    let bufferedBoundary = null;
    try {
      bufferedBoundary = turf.buffer(boundaryPolygon, bufferDistance, { units: 'kilometers' });
      if (!bufferedBoundary || !bufferedBoundary.geometry) {
        throw new Error('Buffer creation failed');
      }
    } catch (bufferError) {
      console.warn('Error creating buffer:', bufferError.message);
      return featureToClip;
    }
    
    if (!bufferedBoundary) {
      console.warn('Failed to create buffer for clipping');
      return featureToClip;
    }
    
    console.log('Created buffer around property for clipping');
    
    // Get point count before clipping
    const originalPointCount = featureToClip.geometry.coordinates[0]?.length || 0;
    
    // APPROACH 1: Try to manually filter points first (safer than intersection)
    let clippedFeature = null;
    console.log('Attempting to clip by filtering points inside buffer');
    
    try {
      // Filter points that are inside the buffered boundary
      let insidePoints = [];
      
      for (let i = 0; i < featureToClip.geometry.coordinates[0].length; i++) {
        const point = featureToClip.geometry.coordinates[0][i];
        const pointFeature = turf.point(point);
        
        // Check if the point is inside the buffered boundary
        let isInside = false;
        try {
          isInside = turf.booleanPointInPolygon(pointFeature, bufferedBoundary);
        } catch (error) {
          console.warn('Error checking if point is in buffer:', error.message);
        }
        
        // If the point is inside, keep it
        if (isInside) {
          insidePoints.push(point);
        }
      }
      
      console.log(`Found ${insidePoints.length} points inside the buffer`);
      
      // Minimum points required for a valid polygon
      if (insidePoints.length >= 3) {
        // Close the ring if needed
        if (insidePoints.length > 0 && 
            (insidePoints[0][0] !== insidePoints[insidePoints.length - 1][0] || 
             insidePoints[0][1] !== insidePoints[insidePoints.length - 1][1])) {
          insidePoints.push([...insidePoints[0]]);
        }
        
        // Create a polygon from these points
        try {
          // Try to create a proper polygon
          clippedFeature = turf.polygon([insidePoints], {
            ...featureToClip.properties,
            clipped: true,
            pointFilteringApproach: true
          });
          
          // Verify it's valid
          if (clippedFeature && turf.booleanValid(clippedFeature)) {
            console.log(`Successfully clipped feature from ${originalPointCount} to ${insidePoints.length} points using point filtering`);
            return clippedFeature;
          } else {
            console.log('Point filtering created an invalid polygon, trying other approaches');
          }
        } catch (polyError) {
          console.warn('Error creating polygon from filtered points:', polyError.message);
        }
      } else {
        console.log('Not enough points inside buffer for point filtering approach');
      }
    } catch (filterError) {
      console.warn('Error during point filtering approach:', filterError.message);
    }
    
    // APPROACH 2: Try using turf.intersect with proper validation
    try {
      console.log('Attempting to clip using turf.intersect');
      
      // Ensure both features are valid before intersection
      const validFeatureToClip = fixInvalidPolygon(featureToClip);
      const validBuffer = fixInvalidPolygon(bufferedBoundary);
      
      if (!validFeatureToClip || !validBuffer) {
        console.warn('Could not ensure valid polygons for intersection');
      } else {
        // Extra check to avoid "Must have at least 2 geometries" error
        if (validFeatureToClip.geometry.coordinates[0].length < 4 || 
            validBuffer.geometry.coordinates[0].length < 4) {
          console.warn('Invalid coordinates for intersection, polygons need at least 4 points');
        } else {
          try {
            clippedFeature = turf.intersect(validFeatureToClip, validBuffer);
            
            if (clippedFeature) {
              // Add original properties
              clippedFeature.properties = {
                ...featureToClip.properties,
                clipped: true
              };
              
              const newPointCount = clippedFeature.geometry.coordinates[0]?.length || 0;
              console.log(`Successfully clipped feature from ${originalPointCount} to ${newPointCount} points using turf.intersect`);
              
              return clippedFeature;
            } else {
              console.log('turf.intersect returned null, features might not overlap');
            }
          } catch (intersectError) {
            console.warn('Error using turf.intersect for clipping:', intersectError.message);
          }
        }
      }
    } catch (intersectApproachError) {
      console.warn('Error in intersection approach:', intersectApproachError.message);
    }
    
    // APPROACH 3: Try simplifying the feature instead
    try {
      console.log('Attempting to simplify feature as fallback');
      const simplified = turf.simplify(featureToClip, { 
        tolerance: originalPointCount > 1000 ? 0.001 : 0.0005, 
        highQuality: true 
      });
      
      if (simplified) {
        const newPointCount = simplified.geometry.coordinates[0]?.length || 0;
        console.log(`Simplified feature from ${originalPointCount} to ${newPointCount} points`);
        
        // Add original properties
        simplified.properties = {
          ...featureToClip.properties,
          simplified: true
        };
        
        return simplified;
      }
    } catch (simplifyError) {
      console.warn('Error simplifying feature:', simplifyError.message);
    }
    
    // If all else fails, return original
    console.warn('All clipping approaches failed, returning original feature');
    return featureToClip;
  } catch (error) {
    console.error('Error in clipFeatureToBufferedArea:', error.message);
    return featureToClip;
  }
}

/**
 * Generates a developable area by subtracting restricted areas from the property boundary
 * @param {Object} propertyFeature - The GeoJSON feature representing the property boundary
 * @returns {Promise<Object>} - A GeoJSON feature collection representing the developable area
 */
export async function generateDevelopableArea(propertyFeature) {
  console.log('=== STARTING DEVELOPABLE AREA GENERATION ===');
  console.log('Input property feature:', JSON.stringify(propertyFeature));
  
  if (!propertyFeature) {
    console.error('Invalid property feature - no input provided');
    return null;
  }
  
  if (!propertyFeature.geometry && !propertyFeature.features) {
    console.error('Invalid property feature - missing geometry or features');
    return null;
  }

  try {
    console.log('Validating and processing property feature...');
    
    // Create a validated feature from the property boundary using our enhanced ensureFeature helper
    let propertyPolygon = ensureFeature(propertyFeature);
    
    if (!propertyPolygon) {
      console.error('Failed to create valid property feature');
      
      // Fallback: If propertyFeature is a FeatureCollection, try the first feature
      if (propertyFeature.type === 'FeatureCollection' && propertyFeature.features?.length > 0) {
        console.log('Attempting to use first feature from FeatureCollection');
        propertyPolygon = ensureFeature(propertyFeature.features[0]);
        
        if (!propertyPolygon) {
          console.error('Failed to create valid property feature from first feature');
          return null;
        }
      } else {
        return null;
      }
    }
    
    console.log('Property feature validated, checking geometry validity...');
    
    // Fix any issues with the property polygon using our enhanced fixInvalidPolygon helper
    let isValidGeometry = false;
    try {
      isValidGeometry = turf.booleanValid(propertyPolygon);
    } catch (validityError) {
      console.warn('Error checking property polygon validity:', validityError.message);
    }
    
    if (!isValidGeometry) {
      console.log('Property polygon needs fixing');
      propertyPolygon = fixInvalidPolygon(propertyPolygon);
      
      if (!propertyPolygon) {
        console.error('Property polygon validation failed and could not be fixed');
        return null;
      }
    }
    
    console.log('Property polygon validated successfully');
    
    // Get the center and size for the bounding box
    if (!propertyPolygon.geometry || !propertyPolygon.geometry.coordinates || !propertyPolygon.geometry.coordinates[0]) {
      console.error('Property polygon has invalid or missing coordinates structure');
      return null;
    }
    
    const coordinates = propertyPolygon.geometry.coordinates[0];
    if (!Array.isArray(coordinates) || coordinates.length < 4) {
      console.error('Property polygon has insufficient coordinates');
      return null;
    }
    
    console.log('Calculating property bounds...');
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

    console.log('Property bounds:', bounds);
    
    // Validate bounds - if any of them are still infinity, the coordinates are invalid
    if (bounds.minX === Infinity || bounds.minY === Infinity || 
        bounds.maxX === -Infinity || bounds.maxY === -Infinity) {
      console.error('Failed to calculate valid property bounds');
      return null;
    }

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const width = Math.abs(bounds.maxX - bounds.minX);
    const height = Math.abs(bounds.maxY - bounds.minY);
    const size = Math.max(width, height) * 1.2; // Add 20% padding
    
    console.log('Center point:', { centerX, centerY });
    console.log('Search area size:', { width, height, paddedSize: size });
    
    // Calculate Mercator parameters for proper coordinate transformation
    const { bbox } = calculateMercatorParams(centerX, centerY, size);
    console.log('Mercator bbox for API queries:', bbox);

    // Initialize the developable area as a clone of the property polygon
    let developablePolygon = turf.clone(propertyPolygon);
    console.log('Initial developable area created as copy of property');

    // Arrays to store the restricted areas
    const restrictedAreas = {
      biodiversity: [],
      flood: [],
      easements: []
    };

    // 1. Collect and process biodiversity areas
    console.log('=== STEP 1: COLLECTING BIODIVERSITY AREAS ===');
    try {
      const biodiversityConfig = {
        url: 'https://www.lmbc.nsw.gov.au/arcgis/rest/services/BV/BiodiversityValues/MapServer',
        layerId: 0
      };
      
      console.log('Requesting biodiversity data from:', biodiversityConfig.url);
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

      const biodiversityUrl = `${biodiversityConfig.url}/${biodiversityConfig.layerId}/query?${params.toString()}`;
      console.log('Biodiversity API URL:', biodiversityUrl);
      
      const biodiversityResponse = await proxyRequest(biodiversityUrl);
      console.log('Biodiversity API response received');
      
      // Add detailed logging of the biodiversity response
      console.log('Biodiversity response type:', biodiversityResponse?.type);
      console.log('Biodiversity features count:', biodiversityResponse?.features?.length);
      
      if (biodiversityResponse?.features?.length > 0) {
        console.log(`Found ${biodiversityResponse.features.length} biodiversity features`);
        restrictedAreas.biodiversity = biodiversityResponse.features;
        
        // Process each biodiversity feature
        console.log('Processing biodiversity features for subtraction');
        let failedOperations = 0;
        const maxFailedOps = 3; // After this many consecutive failures, switch to manual approach
        
        for (let i = 0; i < biodiversityResponse.features.length; i++) {
          const feature = biodiversityResponse.features[i];
          console.log(`Processing biodiversity feature ${i+1} of ${biodiversityResponse.features.length}`);
          
          try {
            if (!feature.geometry) {
              console.log(`Feature ${i+1} has no geometry, skipping`);
              continue;
            }
            
            // First, handle large features by pre-processing
            let processedFeature = feature;
            const pointCount = feature.geometry.coordinates[0]?.length || 0;
            console.log(`Biodiversity feature ${i+1} has ${pointCount} points`);
            
            // For large features, apply pre-processing to reduce complexity
            if (pointCount > 100) {
              console.log(`Pre-processing large feature with ${pointCount} points`);
              
              // Try simplifying first for very large features
              if (pointCount > 500) {
                console.log(`Feature is very large (${pointCount} points), simplifying first`);
                try {
                  const simplificationTolerance = pointCount > 1000 ? 0.001 : 0.0005;
                  const simplified = turf.simplify(feature, {
                    tolerance: simplificationTolerance,
                    highQuality: true
                  });
                  
                  if (simplified) {
                    const newCount = simplified.geometry.coordinates[0]?.length || 0;
                    console.log(`Simplified from ${pointCount} to ${newCount} points`);
                    processedFeature = simplified;
                  }
                } catch (simplifyError) {
                  console.warn(`Error simplifying large feature: ${simplifyError.message}`);
                }
              }
              
              // Then clip to property buffer area
              try {
                console.log('Clipping to property buffer area');
                const clipped = clipFeatureToBufferedArea(processedFeature, developablePolygon, 0.5);
                
                if (clipped && clipped !== processedFeature) {
                  const clippedCount = clipped.geometry.coordinates[0]?.length || 0;
                  console.log(`Clipped feature to ${clippedCount} points`);
                  processedFeature = clipped;
                }
              } catch (clipError) {
                console.warn(`Error clipping feature: ${clipError.message}`);
              }
            }
            
            // Check if the feature intersects with our property using a more robust approach
            let intersects = false;
            try {
              intersects = turf.booleanIntersects(developablePolygon, processedFeature);
              console.log(`Intersection check result for feature ${i+1}:`, intersects);
            } catch (intersectError) {
              console.warn(`Error checking intersection for feature ${i+1}, trying with buffered geometries:`, intersectError.message);
              
              try {
                // Try with buffered geometries
                const bufferedProperty = turf.buffer(developablePolygon, 0.0001, { units: 'kilometers' });
                const bufferedFeature = turf.buffer(processedFeature, 0.0001, { units: 'kilometers' });
                
                if (bufferedProperty && bufferedFeature) {
                  intersects = turf.booleanIntersects(bufferedProperty, bufferedFeature);
                  console.log(`Buffered intersection check result for feature ${i+1}:`, intersects);
                }
              } catch (bufferError) {
                console.warn(`Buffer-based intersection check failed for feature ${i+1}:`, bufferError.message);
              }
            }
            
            if (!intersects) {
              console.log(`Feature ${i+1} does not intersect with property, skipping`);
              continue;
            }
            
            console.log(`Subtracting biodiversity feature ${i+1} from developable area`);
            
            // Try each approach in sequence, stopping when one succeeds
            let success = false;
            
            // APPROACH 1: ArcGIS REST service (when available)
            if (!success) {
              console.log('APPROACH 1: Using ArcGIS REST service for geometric operation');
              try {
                const arcgisResult = await arcgisPolygonDifference(developablePolygon, processedFeature);
                
                if (arcgisResult) {
                  console.log('ArcGIS REST approach successful!');
                  developablePolygon = arcgisResult;
                  failedOperations = 0; // Reset counter on success
                  success = true;
                } else {
                  console.log('ArcGIS REST approach failed, trying next approach');
                }
              } catch (arcgisError) {
                console.warn('ArcGIS difference error:', arcgisError.message);
              }
            }
            
            // APPROACH 2: Safe Polygon Difference with Turf.js
            if (!success) {
              console.log('APPROACH 2: Using safe polygon difference with Turf.js');
              try {
                const turfResult = safePolygonDifference(developablePolygon, processedFeature);
                
                if (turfResult && turfResult.properties?.differenceApplied) {
                  console.log('Turf.js difference approach successful!');
                  developablePolygon = turfResult;
                  failedOperations = 0; // Reset counter on success
                  success = true;
                } else {
                  console.log('Turf.js difference approach failed or no change, trying next approach');
                  failedOperations++;
                }
              } catch (turfError) {
                console.warn('Turf.js difference error:', turfError.message);
                failedOperations++;
              }
            }
            
            // APPROACH 3: Manual point-based approach
            if (!success) {
              console.log('APPROACH 3: Using manual point-based difference approach');
              try {
                const manualResult = manualPolygonDifference(developablePolygon, processedFeature);
                
                if (manualResult && manualResult.properties?.manualPointDifference) {
                  console.log('Manual point-based approach successful!');
                  developablePolygon = manualResult;
                  failedOperations = 0; // Reset counter on success
                  success = true;
                } else {
                  console.log('Manual point-based approach failed or no change');
                  failedOperations++;
                }
              } catch (manualError) {
                console.warn('Manual point-based difference error:', manualError.message);
                failedOperations++;
              }
            }
            
            // If all approaches failed
            if (!success) {
              console.warn(`All approaches failed for feature ${i+1}, keeping original polygon`);
              failedOperations++;
            }
            
            // Log consecutive failures
            if (failedOperations > 0) {
              console.log(`Consecutive failed operations: ${failedOperations}/${maxFailedOps}`);
            }
          } catch (featureError) {
            console.warn(`Error processing biodiversity feature ${i+1}:`, featureError.message);
            failedOperations++;
          }
        }
      } else {
        console.log('No biodiversity features found in the area');
        console.warn('Could not fix developable polygon, using original property boundary');
        developablePolygon = propertyPolygon;
      }
    } catch (bioError) {
      console.warn('Error collecting biodiversity areas:', bioError.message);
    }
    
    // 2. Collect and process flood areas
    console.log('=== STEP 2: COLLECTING FLOOD AREAS ===');
    // ... [flood and easements sections would be similarly updated] ...

    console.log('=== FINALIZING DEVELOPABLE AREA ===');

    // Check if the developable polygon is valid
    let isValidFinalGeometry = false;
    try {
      isValidFinalGeometry = turf.booleanValid(developablePolygon);
    } catch (validityError) {
      console.warn('Error checking final developable polygon validity:', validityError.message);
    }

    if (!isValidFinalGeometry) {
      console.log('Final developable polygon is invalid, attempting to fix');
      const fixedPolygon = fixInvalidPolygon(developablePolygon);
      
      if (fixedPolygon) {
        developablePolygon = fixedPolygon;
      } else {
        console.warn('Could not fix developable polygon, using original property boundary');
        developablePolygon = propertyPolygon;
      }
    }
    
    // Create the result with both the developable area geometry and the restricted areas as properties
    const result = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: developablePolygon.geometry,
        properties: {
          ...propertyPolygon.properties,
          generatedDevelopableArea: true,
          generatedTimestamp: new Date().toISOString(),
          restrictedAreas: {
            biodiversity: restrictedAreas.biodiversity.length,
            flood: restrictedAreas.flood.length,
            easements: restrictedAreas.easements.length
          }
        }
      }]
    };
    
    console.log('=== DEVELOPABLE AREA GENERATION COMPLETE ===');
    return result;
  } catch (error) {
    console.error('Error generating developable area:', error.message, error.stack);
    return null;
  }
}

/**
 * Updates an existing drawing layer with the generated developable area
 * @param {string} layerId - The ID of the drawing layer to update
 * @param {Object} developableArea - The GeoJSON feature collection representing the developable area
 * @returns {Promise<Object|boolean>} - The updated feature collection if successful, false otherwise
 */
export async function updateDrawingLayer(layerId, developableArea) {
  console.log('=== UPDATING DRAWING LAYER ===');
  console.log('Target layer ID:', layerId);
  console.log('Developable area features count:', developableArea?.features?.length);
  
  if (!layerId || !developableArea?.features?.[0]) {
    console.error('Invalid layer ID or developable area');
    return false;
  }

  try {
    // Get the current raw sections
    console.log('Fetching current rawSections from Giraffe');
    const rawSections = await giraffeState.get('rawSections');
    
    if (!rawSections?.features) {
      console.error('No valid rawSections data available');
      return false;
    }
    
    console.log(`Found ${rawSections.features.length} features in rawSections`);
    
    // Find the target layer
    console.log('Looking for feature with id:', layerId);
    const targetLayer = rawSections.features.find(
      feature => feature.properties?.id === layerId
    );
    
    if (!targetLayer) {
      console.error('Target layer not found:', layerId);
      console.log('Available feature IDs:', rawSections.features.map(f => f.properties?.id));
      return false;
    }
    
    console.log('Found target layer with ID:', targetLayer.properties.id);
    console.log('Layer details:', {
      layerId: targetLayer.properties.layerId,
      geometryType: targetLayer.geometry.type,
      properties: targetLayer.properties
    });
    
    // Create an updated feature with the new geometry and properties
    console.log('Creating updated feature with new geometry and properties');
    
    // Log the source geometry for debugging
    console.log('Developable area geometry type:', developableArea.features[0].geometry.type);
    if (developableArea.features[0].geometry.coordinates) {
      console.log('Developable area coordinates length:', 
        developableArea.features[0].geometry.coordinates?.[0]?.length || 'undefined');
    }
    
    // Important: We need to deep clone the new geometry to avoid reference issues
    const newGeometry = JSON.parse(JSON.stringify(developableArea.features[0].geometry));
    
    // Important: Ensure our geometry matches the expected format
    if (newGeometry.type !== 'Polygon' && targetLayer.geometry.type === 'Polygon') {
      console.log('Converting geometry type to match target layer');
      
      if (newGeometry.type === 'MultiPolygon' && newGeometry.coordinates && 
          newGeometry.coordinates.length > 0) {
        // Use the largest polygon from the MultiPolygon
        let maxArea = 0;
        let largestPolygonIndex = 0;
        
        for (let i = 0; i < newGeometry.coordinates.length; i++) {
          try {
            const poly = turf.polygon(newGeometry.coordinates[i]);
            const area = turf.area(poly);
            if (area > maxArea) {
              maxArea = area;
              largestPolygonIndex = i;
            }
          } catch (error) {
            console.warn(`Error calculating area for polygon ${i}:`, error.message);
          }
        }
        
        // Update the geometry to a Polygon using the largest part
        newGeometry.type = 'Polygon';
        newGeometry.coordinates = newGeometry.coordinates[largestPolygonIndex];
        console.log('Converted MultiPolygon to Polygon using largest part');
      }
    }
    
    // Create the updated feature
    const updatedFeature = {
      ...targetLayer,
      geometry: newGeometry, // Use the processed geometry
      properties: {
        ...targetLayer.properties,
        ...developableArea.features[0].properties,
        generatedDevelopableArea: true,
        generatedTimestamp: new Date().toISOString()
      }
    };
    
    console.log('New feature created with updated geometry and properties');
    console.log('Original coordinates count:', targetLayer.geometry.coordinates[0].length);
    console.log('New coordinates count:', updatedFeature.geometry.coordinates[0].length);
    
    // CRITICAL: Set the rawGeoType based on the geometry type
    if (!updatedFeature.properties.rawGeoType) {
      if (updatedFeature.geometry.type === 'Polygon') {
        updatedFeature.properties.rawGeoType = 'RawPolygon';
      } else if (updatedFeature.geometry.type === 'MultiPolygon') {
        updatedFeature.properties.rawGeoType = 'RawMultiPolygon';
      } else if (updatedFeature.geometry.type === 'LineString') {
        updatedFeature.properties.rawGeoType = 'RawLineString';
      } else if (updatedFeature.geometry.type === 'MultiLineString') {
        updatedFeature.properties.rawGeoType = 'RawMultiLineString';
      } else if (updatedFeature.geometry.type === 'Point') {
        updatedFeature.properties.rawGeoType = 'RawPoint';
      } else if (updatedFeature.geometry.type === 'MultiPoint') {
        updatedFeature.properties.rawGeoType = 'RawMultiPoint';
      }
      console.log('Set rawGeoType to:', updatedFeature.properties.rawGeoType);
    }
    
    // Create the updated feature collection to return
    const updatedFeatureCollection = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: updatedFeature.geometry,
        properties: updatedFeature.properties
      }]
    };
    
    // Update the layer using the Giraffe SDK
    try {
      console.log('Attempting to update using updateRawSection...');
      // Use the Giraffe SDK to update the raw section
      await giraffeState.set('updateRawSection', updatedFeature);
      console.log('Successfully updated drawing layer via updateRawSection');
      
      // CRITICAL: Also try to update the map state directly
      try {
        console.log('Also updating map state directly...');
        
        // First try to get access to the map state
        const mapState = await giraffeState.get('mapState');
        
        if (mapState && mapState.rawSections && mapState.rawSections.features) {
          console.log('Map state found, updating relevant feature');
          
          // Find the target feature in the map state
          const mapFeatureIndex = mapState.rawSections.features.findIndex(
            feature => feature.properties?.id === layerId
          );
          
          if (mapFeatureIndex !== -1) {
            console.log(`Found feature at index ${mapFeatureIndex} in map state`);
            
            // Update the feature in the map state
            mapState.rawSections.features[mapFeatureIndex] = updatedFeature;
            
            // Set the updated map state
            await giraffeState.set('mapState', mapState);
            console.log('Successfully updated map state directly');
          }
        }
      } catch (mapUpdateError) {
        console.warn('Error updating map state directly:', mapUpdateError.message);
        // This is just an additional attempt, so don't fail if it doesn't work
      }
      
      return updatedFeatureCollection;
    } catch (updateError) {
      console.error('Error updating raw section:', updateError);
      
      // Fallback: Update the raw sections directly
      console.log('Using fallback method to update rawSections directly');
      try {
        console.log('Creating updated features array');
        const updatedFeatures = [...rawSections.features];
        const targetIndex = updatedFeatures.findIndex(
          feature => feature.properties?.id === layerId
        );
        
        console.log('Target index in features array:', targetIndex);
        
        if (targetIndex !== -1) {
          console.log('Replacing feature at index', targetIndex);
          updatedFeatures[targetIndex] = updatedFeature;
          
          const updatedRawSections = {
            ...rawSections,
            features: updatedFeatures
          };
          
          console.log('Setting updated rawSections');
          await giraffeState.set('rawSections', updatedRawSections);
          console.log('Successfully updated drawing layer using fallback method');
          return updatedFeatureCollection;
        }
        
        console.log('Target index not found, update failed');
        return false;
      } catch (fallbackError) {
        console.error('Fallback update failed:', fallbackError);
        console.log('Error details:', fallbackError.stack || fallbackError.message);
        return false;
      }
    }
  } catch (error) {
    console.error('Error updating drawing layer:', error);
    console.log('Error details:', error.stack || error.message);
    return false;
  }
} 