import { convertCmValues } from '../utils/units';
import scoringCriteria from './scoringLogic';
import * as turf from '@turf/turf';

const styles = {
  title: {
    x: '4%',
    y: '7%',
    w: '80%',
    h: '8%',
    fontSize: 26,
    fontFace: 'Public Sans Light',
    autoFit: true,
    breakLine: false,
    color: '002664',
    lineSpacing: 26
  },
  subtitle: {
    color: '363636',
  },
  titleLine: {
    x: '5%',
    y: '17%',
    w: '90%',
    h: 0.01,
    line: { color: '002664', width: 0.7 },
    fill: { color: '002664' }
  },
  sensitiveText: {
    x: '72%',
    y: '2%',
    w: '25%',
    h: '3%',
    fontSize: 9,
    color: 'FF3B3B',
    bold: true,
    align: 'right',
    fontFace: 'Public Sans'
  },
  nswLogo: {
    x: '90%',
    y: '5%',
    w: '8%',
    h: '8%',
    sizing: { type: 'contain' }
  },
  mapContainer: {
    x: (index) => `${15 + (index * 35)}%`,
    y: '18%',
    w: '50%',
    h: '50%'
  },
  mapTitle: {
    h: '6%',
    fill: '002664',
    color: 'FFFFFF',
    fontSize: 14,
    fontFace: 'Public Sans',
    align: 'center',
    valign: 'middle'
  },
  mapImage: {
    y: '6%',
    w: '100%',
    h: '50%',
    sizing: { type: 'contain', align: 'center', valign: 'middle' }
  },
  descriptionText: {
    fontSize: 9,
    color: '363636',
    fontFace: 'Public Sans',
    align: 'left',
    valign: 'top',
    wrap: true,
    h: '12%'
  },
  sourceText: {
    fontSize: 8,
    color: '363636',
    fontFace: 'Public Sans Light',
    italic: true,
    align: 'left',
    wrap: true,
    h: '3%'
  },
  footerLine: {
    x: '5%',
    y: '93%',
    w: '90%',
    h: 0.01,
    line: { color: '002664', width: 0.7 },
    fill: { color: '002664' }
  },
  footer: {
    x: '4%',
    y: '94%',
    w: '90%',
    h: '4%',
    fontSize: 10,
    color: '002664',
    fontFace: 'Public Sans',
    align: 'left'
  },
  pageNumber: {
    x: '94%',
    y: '94%',
    w: '4%',
    h: '4%',
    fontSize: 8,
    color: '002664',
    fontFace: 'Public Sans',
    align: 'left'
  }
};

export async function addEnviroSlide(pptx, properties) {
  const slide = pptx.addSlide({ masterName: 'NSW_MASTER' });

  try {
    // Add title
    slide.addText([
      { text: properties.site__address, options: { color: styles.title.color } },
      { text: ' ', options: { breakLine: true } },
      { text: 'Environmental', options: { color: styles.subtitle.color } }
    ], convertCmValues({
      ...styles.title,
      color: undefined
    }));
    
    // Add horizontal line under title
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.titleLine));
    
    // Add sensitive text
    slide.addText("SENSITIVE: NSW GOVERNMENT", convertCmValues(styles.sensitiveText));
    
    // Add NSW Logo
    slide.addImage({
      path: "/images/NSW-Government-official-logo.jpg",
      ...convertCmValues(styles.nswLogo)
    });
    
    // Add footer elements
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.footerLine));
    slide.addText('Property and Development NSW', convertCmValues(styles.footer));
    slide.addText('8', convertCmValues(styles.pageNumber));

    // Add left map container (TEC)
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '5%',
      y: '18%',
      w: '40%',
      h: '61%',
      fill: 'FFFFFF',
      line: { color: '002664', width: 1.5 }
    }));

    // Add blue vertical bars
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '5%',
      y: '18%',
      w: '6%',
      h: '61%',
      fill: '002664'  
    }));

    // Add rotated text for TEC
    slide.addText('Threatened Ecological Communities', convertCmValues({
      x: '-22.5%',
      y: '45%',
      w: '61%',
      h: '6%',
      color: 'FFFFFF',
      fontSize: 14,
      fontFace: 'Public Sans',
      align: 'center',
      valign: 'middle',
      rotate: 270
    }));

    // Add TEC map
    if (properties.tecMapScreenshot) {
      try {
        const imageOptions = convertCmValues({
          x: '11%',
          y: '18%',
          w: '34%',
          h: '61%',
          sizing: {
            type: 'contain',
            align: 'center',
            valign: 'middle'
          }
        });

        slide.addImage({
          data: properties.tecMapScreenshot,
          ...imageOptions
        });

        console.log('Successfully added TEC map');    
      } catch (error) {
        console.error('Error adding TEC map:', error);
      }
    } else {
      console.warn('No TEC map screenshot available');
      slide.addText('TEC map unavailable', convertCmValues({
        x: '5%',
        y: '24%',
        w: '40%',
        h: '50%',
        fontSize: 12,
        color: 'FF0000',
        align: 'center',
        valign: 'middle'
      }));
    }

    // Calculate TEC score
    let tecScore = 0;
    let tecText = 'TEC data unavailable.';

    console.log('=== TEC Scoring in Environmental Slide ===');
    console.log('Properties available:', Object.keys(properties));
    console.log('Developable area:', properties.developableArea);
    console.log('Raw TEC features:', properties.site_suitability__tecFeatures);

    // Check if we have the required data
    if (properties.developableArea) {
      try {
        console.log('=== Starting TEC Score Calculation ===');
        console.log('Developable area geometry:', JSON.stringify(properties.developableArea[0].geometry));
        
        // Ensure we have a valid FeatureCollection structure
        const tecFeatureCollection = {
          type: 'FeatureCollection',
          features: properties.site_suitability__tecFeatures?.features || []
        };
        
        console.log('Constructed TEC FeatureCollection:', tecFeatureCollection);
        
        const result = scoringCriteria.tec.calculateScore(tecFeatureCollection, properties.developableArea);
        console.log('\nScore Calculation Result:');
        console.log('- Score:', result.score);
        console.log('- Coverage:', result.coverage ? `${result.coverage.toFixed(2)}%` : 'N/A');
        console.log('- Description:', scoringCriteria.tec.getScoreDescription(result));
        console.log('=== End TEC Score Calculation ===\n');
        
        tecScore = result.score;
        tecText = scoringCriteria.tec.getScoreDescription(result);
      } catch (error) {
        console.error('Error calculating TEC score:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          developableArea: properties.developableArea ? 'exists' : 'missing',
          tecFeatures: properties.site_suitability__tecFeatures ? 'exists' : 'missing'
        });
        tecText = 'Error calculating TEC impact.';
      }
    } else {
      console.log('Missing required data for TEC score:', {
        developableArea: properties.developableArea ? 'exists' : 'missing',
        tecFeatures: properties.site_suitability__tecFeatures ? 'exists' : 'missing'
      });
    }

    // Update the box color based on score
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '5%',
      y: '80%',
      w: '40%',
      h: '12%',
      fill: scoringCriteria.tec.getScoreColor(tecScore).replace('#', ''),
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // Add description text
    slide.addText(tecText, convertCmValues({
      x: '5%',
      y: '80%',
      w: '40%',
      h: '8%',
      fontSize: 7,
      color: '363636',
      fontFace: 'Public Sans',
      align: 'left',
      valign: 'top',
      wrap: true
    }));

    // Add score text
    slide.addText(`Score: ${tecScore}/3`, convertCmValues({
      x: '5%',
      y: '86%',
      w: '40%',
      h: '4%',
      fontSize: 7,
      color: '363636',
      fontFace: 'Public Sans',
      bold: true,
      align: 'right'
    }));

    // Add line
    slide.addShape(pptx.shapes.LINE, convertCmValues({
      x: '6%',
      y: '88.5%',
      w: '34%',
      h: 0,
      line: { color: '8C8C8C', width: 0.4 }
    }));

    // Add source text
    slide.addText('Source: NSW Department of Planning, Housing and Infrastructure, 2025', convertCmValues({
      x: '5%',
      y: '88%',
      w: '40%',
      h: '3%',
      fontSize: 6,
      color: '363636',
      fontFace: 'Public Sans Light',
      italic: true,
      align: 'left',
      wrap: true
    }));

    // Right side - Biodiversity
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '50%',
      y: '18%',
      w: '40%',
      h: '61%',
      fill: 'FFFFFF',
      line: { color: '002664', width: 1.5 }
    }));

    // Add blue vertical bars for right side
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '50%',
      y: '18%',
      w: '6%',
      h: '61%',
      fill: '002664'
    }));

    // Add rotated text for right side
    slide.addText('Biodiversity', convertCmValues({
      x: '22.5%',
      y: '45%',
      w: '61%',
      h: '6%',
      color: 'FFFFFF',
      fontSize: 14,
      fontFace: 'Public Sans',
      align: 'center',
      valign: 'middle',
      rotate: 270
    }));

    // Add biodiversity map
    if (properties.biodiversityMapScreenshot) {
      try {
        const imageOptions = convertCmValues({
          x: '56%',
          y: '18%',
          w: '34%',
          h: '61%',
          sizing: {
            type: 'contain',
            align: 'center',
            valign: 'middle'
          }
        });

        slide.addImage({
          data: properties.biodiversityMapScreenshot,
          ...imageOptions
        });

        console.log('Successfully added biodiversity map');
      } catch (error) {
        console.error('Error adding biodiversity map:', error);
      }
    } else {
      console.warn('No biodiversity map screenshot available');
      slide.addText('Biodiversity map unavailable', convertCmValues({
        x: '50%',
        y: '24%',
        w: '40%',
        h: '50%',
        fontSize: 12,
        color: 'FF0000',
        align: 'center',
        valign: 'middle'
      }));
    }

    // Calculate biodiversity overlap text (improved accuracy)
    let biodiversityText = 'Biodiversity impact not assessed.';
    let coverage = 0;
    
    if (properties.developableArea && properties.site_suitability__biodiversityFeatures) {
      try {
        const bioFeatures = properties.site_suitability__biodiversityFeatures;
        const developableArea = properties.developableArea;

        if (bioFeatures?.features?.length > 0) {
          try {
            // Create a GDA94 polygon from developable area coordinates (already in GDA94)
            const developablePolygon = turf.feature({
              type: 'Polygon',
              coordinates: [developableArea[0].geometry.coordinates[0]]
            });

            // Calculate total area early
            const totalArea = turf.area(developablePolygon);
            console.log('Total developable area:', totalArea, 'square meters');

            // Calculate overlap area with improved accuracy
            let overlapArea = 0;
            console.log('Processing biodiversity features with improved accuracy...');
            
            bioFeatures.features.forEach((feature, index) => {
              try {
                if (!feature.geometry?.coordinates) {
                  console.log(`Feature ${index + 1} has no coordinates`);
                  return;
                }

                try {
                  let bioFeaturePolygon;
                  if (feature.geometry.type === 'Polygon') {
                    try {
                      console.log('Processing Polygon feature:', {
                        coordinates: feature.geometry.coordinates
                      });

                      // Enhanced coordinate cleaning function
                      const cleanAndValidateCoordinates = (coordinates) => {
                        try {
                          // Clean each ring
                          const cleanedRings = coordinates.map(ring => {
                            // Remove Z and M values and filter out any invalid points
                            let cleanedPoints = ring.map(coord => {
                              if (!Array.isArray(coord) || coord.length < 2) {
                                console.warn('Invalid coordinate point:', coord);
                                return null;
                              }
                              return [Number(coord[0]), Number(coord[1])];
                            }).filter(point => point !== null);

                            // Ensure the ring has enough points
                            if (cleanedPoints.length < 3) {
                              console.error('Ring has less than 3 points after cleaning');
                              return null;
                            }

                            // Ensure the ring is closed (first point equals last point)
                            if (cleanedPoints[0][0] !== cleanedPoints[cleanedPoints.length - 1][0] ||
                                cleanedPoints[0][1] !== cleanedPoints[cleanedPoints.length - 1][1]) {
                              console.log('Closing ring by adding first point to end');
                              cleanedPoints.push([...cleanedPoints[0]]);
                            }

                            // If we have too many points, simplify the ring
                            if (cleanedPoints.length > 100) {
                              console.log(`Ring has ${cleanedPoints.length} points, simplifying...`);
                              try {
                                // Create a temporary polygon for simplification
                                const tempPolygon = turf.polygon([cleanedPoints]);
                                // Start with a small tolerance and increase if needed
                                let tolerance = 0.0001;
                                let maxAttempts = 5;
                                let simplifiedPolygon;

                                while (maxAttempts > 0) {
                                  try {
                                    simplifiedPolygon = turf.simplify(tempPolygon, {
                                      tolerance: tolerance,
                                      highQuality: true,
                                      mutate: false
                                    });

                                    if (turf.booleanValid(simplifiedPolygon)) {
                                      console.log(`Successfully simplified ring to ${simplifiedPolygon.geometry.coordinates[0].length} points with tolerance ${tolerance}`);
                                      return simplifiedPolygon.geometry.coordinates[0];
                                    }
                                    tolerance *= 2;
                                    maxAttempts--;
                                  } catch (error) {
                                    console.log(`Simplification failed with tolerance ${tolerance}, trying higher tolerance`);
                                    tolerance *= 2;
                                    maxAttempts--;
                                  }
                                }
                              } catch (error) {
                                console.error('Error during ring simplification:', error);
                              }
                            }

                            return cleanedPoints;
                          }).filter(ring => ring !== null);

                          if (cleanedRings.length === 0) {
                            console.error('No valid rings after cleaning');
                            return null;
                          }

                          console.log('Cleaned coordinates:', cleanedRings);
                          return cleanedRings;
                        } catch (error) {
                          console.error('Error in cleanAndValidateCoordinates:', error);
                          return null;
                        }
                      };

                      // Clean and validate coordinates
                      const cleanedCoordinates = cleanAndValidateCoordinates(feature.geometry.coordinates);
                      
                      if (!cleanedCoordinates) {
                        console.error('Failed to clean coordinates');
                        return;
                      }

                      try {
                        // Create a valid polygon from the cleaned coordinates
                        bioFeaturePolygon = turf.polygon(cleanedCoordinates);
                        console.log('Created polygon feature with cleaned coordinates');

                        // Additional validation
                        if (!turf.booleanValid(bioFeaturePolygon)) {
                          console.error('Created polygon is invalid, attempting to fix winding order');
                          try {
                            // Try to fix winding order
                            const fixedPolygon = turf.rewind(bioFeaturePolygon);
                            
                            // If still invalid, try buffer-based repair
                            if (!turf.booleanValid(fixedPolygon)) {
                              console.log('Winding order fix failed, attempting buffer-based repair');
                              // Create a tiny buffer to fix self-intersections
                              const buffered = turf.buffer(bioFeaturePolygon, 0.000001, { units: 'kilometers' });
                              if (turf.booleanValid(buffered)) {
                                console.log('Successfully repaired polygon using buffer method');
                                bioFeaturePolygon = buffered;
                              } else {
                                console.error('Failed to fix polygon validity');
                                return;
                              }
                            } else {
                              console.log('Successfully fixed polygon winding order');
                              bioFeaturePolygon = fixedPolygon;
                            }
                          } catch (error) {
                            console.error('Error fixing polygon:', error);
                            return;
                          }
                        }

                        // Check intersection
                        const doesIntersect = turf.booleanIntersects(developablePolygon, bioFeaturePolygon);
                        console.log('Intersection check:', doesIntersect);

                        if (doesIntersect) {
                          try {
                            // Calculate intersection using a try-catch block for each method
                            let intersection;
                            try {
                              // Ensure both polygons are valid before intersection
                              if (!turf.booleanValid(developablePolygon) || !turf.booleanValid(bioFeaturePolygon)) {
                                throw new Error('Invalid input polygons for intersection');
                              }
                              
                              // Try intersection with original geometries
                              intersection = turf.intersect(developablePolygon, bioFeaturePolygon);
                            } catch (intersectError) {
                              console.log('Primary intersection method failed, trying alternative...', intersectError);
                              
                              try {
                                // Try with simplified geometries
                                const simplifiedDevelopable = turf.simplify(developablePolygon, { tolerance: 0.0001 });
                                const simplifiedFeature = turf.simplify(bioFeaturePolygon, { tolerance: 0.0001 });
                                
                                if (!turf.booleanValid(simplifiedDevelopable) || !turf.booleanValid(simplifiedFeature)) {
                                  throw new Error('Simplified polygons are invalid');
                                }
                                
                                intersection = turf.intersect(simplifiedDevelopable, simplifiedFeature);
                              } catch (simplifyError) {
                                console.log('Simplified intersection failed, trying buffer method...', simplifyError);
                                
                                // Try with buffered geometries
                                const bufferedDevelopable = turf.buffer(developablePolygon, 0.000001, { units: 'kilometers' });
                                const bufferedFeature = turf.buffer(bioFeaturePolygon, 0.000001, { units: 'kilometers' });
                                
                                if (!turf.booleanValid(bufferedDevelopable) || !turf.booleanValid(bufferedFeature)) {
                                  throw new Error('Buffered polygons are invalid');
                                }
                                
                                intersection = turf.intersect(bufferedDevelopable, bufferedFeature);
                              }
                            }

                            if (intersection) {
                              const intersectionArea = turf.area(intersection);
                              overlapArea += intersectionArea;
                              console.log('Intersection area:', intersectionArea);
                            } else {
                              console.log('No valid intersection found, using estimation method');
                              // Use estimation method
                              const featureArea = turf.area(bioFeaturePolygon);
                              const estimatedIntersectionArea = Math.min(totalArea, featureArea) * 0.1; // Conservative 10% estimate
                              overlapArea += estimatedIntersectionArea;
                              console.log('Using estimated intersection area:', estimatedIntersectionArea);
                            }
                          } catch (error) {
                            console.error('All intersection calculation methods failed:', error);
                            // Use estimation method as last resort
                            const featureArea = turf.area(bioFeaturePolygon);
                            const estimatedIntersectionArea = Math.min(totalArea, featureArea) * 0.1; // Conservative 10% estimate
                            overlapArea += estimatedIntersectionArea;
                            console.log('Using estimated intersection area:', estimatedIntersectionArea);
                          }
                        }

                      } catch (error) {
                        console.error('Error creating polygon:', error);
                        return;
                      }
                    } catch (error) {
                      console.error('Error processing polygon feature:', error);
                    }
                  } else if (feature.geometry.type === 'MultiPolygon') {
                    try {
                      console.log('Processing MultiPolygon feature');
                      feature.geometry.coordinates.forEach((polygonCoords, polyIndex) => {
                        try {
                          const cleanedCoords = cleanAndValidateCoordinates(polygonCoords);
                          if (!cleanedCoords) {
                            console.error(`Invalid coordinates for polygon ${polyIndex} in MultiPolygon`);
                            return;
                          }

                          let polygon;
                          try {
                            polygon = turf.polygon(cleanedCoords);
                            if (!turf.booleanValid(polygon)) {
                              console.log(`Attempting to fix winding order for polygon ${polyIndex}`);
                              polygon = turf.rewind(polygon);
                              if (!turf.booleanValid(polygon)) {
                                console.error(`Failed to create valid polygon ${polyIndex} in MultiPolygon`);
                                return;
                              }
                            }
                          } catch (error) {
                            console.error(`Error creating polygon ${polyIndex}:`, error);
                            return;
                          }

                          const doesIntersect = turf.booleanIntersects(developablePolygon, polygon);
                          if (doesIntersect) {
                            try {
                              let intersection;
                              try {
                                intersection = turf.intersect(developablePolygon, polygon);
                              } catch (intersectError) {
                                console.log('Primary intersection method failed for MultiPolygon, trying alternative...');
                                const simplifiedDevelopable = turf.simplify(developablePolygon, { tolerance: 0.0001 });
                                const simplifiedPolygon = turf.simplify(polygon, { tolerance: 0.0001 });
                                intersection = turf.intersect(simplifiedDevelopable, simplifiedPolygon);
                              }

                              if (intersection) {
                                const intersectionArea = turf.area(intersection);
                                overlapArea += intersectionArea;
                                console.log(`Intersection area for polygon ${polyIndex}:`, intersectionArea);
                              }
                            } catch (intersectError) {
                              console.error(`Intersection calculation failed for polygon ${polyIndex}:`, intersectError);
                              // Estimate intersection area
                              const polygonArea = turf.area(polygon);
                              const estimatedIntersectionArea = Math.min(totalArea, polygonArea) * 0.1;
                              overlapArea += estimatedIntersectionArea;
                              console.log(`Using estimated intersection area for polygon ${polyIndex}:`, estimatedIntersectionArea);
                            }
                          }
                        } catch (polyError) {
                          console.error(`Error processing polygon ${polyIndex} in MultiPolygon:`, polyError);
                        }
                      });
                    } catch (error) {
                      console.error('Error processing MultiPolygon feature:', error);
                    }
                  }
                } catch (error) {
                  console.error(`Error processing feature ${index + 1}:`, error);
                  console.error('Feature geometry:', feature.geometry);
                }
              } catch (error) {
                console.error(`Error processing biodiversity feature ${index + 1}:`, error);
                console.log('Feature processing error details:', error);
              }
            });

            // Calculate percentage and format text with more detail
            coverage = (overlapArea / totalArea) * 100;
            console.log('Biodiversity overlap details:', {
              overlapArea,
              totalArea,
              coverage,
              numFeatures: bioFeatures.features.length,
              coordSystem: 'GDA94 (EPSG:4283)'
            });
            
            if (coverage > 0) {
              biodiversityText = `${Math.round(coverage)}% of the developable area overlaps with mapped biodiversity values.`;
            } else {
              biodiversityText = 'The developable area has no overlap with mapped biodiversity values.';
            }
          } catch (error) {
            console.error('Error calculating biodiversity overlap:', error);
            console.error('Error details:', {
              message: error.message,
              stack: error.stack,
              developableArea: developableArea ? 'exists' : 'missing',
              bioFeatures: bioFeatures ? 'exists' : 'missing'
            });
            biodiversityText = 'Error calculating biodiversity impact.';
          }
        } else {
          biodiversityText = 'No biodiversity values have been identified in the area.';
        }
      } catch (error) {
        console.error('Error calculating biodiversity overlap:', error);
        biodiversityText = 'Error calculating biodiversity impact.';
      }
    }

    // Add biodiversity description box with matching formatting
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '50%',
      y: '80%',
      w: '40%',
      h: '12%',
      fill: coverage > 0 ? 'FFE5E5' : 'E2EFD9',  // Red tint if overlap exists, green if no overlap
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // Add description text with improved formatting
    slide.addText(biodiversityText, convertCmValues({
      x: '50%',
      y: '80%',
      w: '40%',
      h: '8%',
      fontSize: 7,
      color: '363636',
      fontFace: 'Public Sans',
      align: 'left',
      valign: 'top',
      wrap: true
    }));

    // Add line
    slide.addShape(pptx.shapes.LINE, convertCmValues({
      x: '51%',
      y: '88.5%',
      w: '34%',
      h: 0,
      line: { color: '8C8C8C', width: 0.4 }
    }));

    // Add source text
    slide.addText('Source: NSW Biodiversity Values Map, 2023', convertCmValues({
      x: '50%',
      y: '88%',
      w: '40%',
      h: '3%',
      fontSize: 6,
      color: '363636',
      fontFace: 'Public Sans Light',
      italic: true,
      align: 'left',
      wrap: true
    }));

    return slide;
  } catch (error) {
    console.error('Error generating environmental slide:', error);
    slide.addText('Error generating environmental slide: ' + error.message, {
      x: '10%',
      y: '45%',
      w: '80%',
      h: '10%',
      fontSize: 14,
      color: 'FF0000',
      align: 'center'
    });
    return slide;
  }
}
