import { convertCmValues } from '../utils/units';
import scoringCriteria from './scoringLogic';
import { proxyRequest } from '../utils/services/proxyService';
import * as turf from '@turf/turf';

const getElevationData = async (geometry) => {
  const url = 'https://spatial.industry.nsw.gov.au/arcgis/rest/services/PUBLIC/Contours/MapServer/0/query';
  const params = new URLSearchParams({
    f: 'json',
    geometryType: 'esriGeometryPolygon',
    geometry: JSON.stringify(geometry),
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'elevation',
    returnGeometry: false
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await proxyRequest(`${url}?${params}`);
    clearTimeout(timeoutId);

    if (response.features && response.features.length > 0) {
      const elevations = response.features.map(f => f.attributes.elevation);
      return {
        min: Math.min(...elevations),
        max: Math.max(...elevations)
      };
    }
    return null;
  } catch (error) {
    console.error('Error querying elevation data:', error);
    return null;
  }
};

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
    sizing: {
      type: 'contain',
      align: 'center',
      valign: 'middle'
    }
  },
  descriptionText: {
    fontSize: 9,
    color: '363636',
    fontFace: 'Public Sans',
    align: 'left',
    valign: 'top',
    wrap: true,
    h: '12%',
  },
  sourceText: {
    fontSize: 8,
    color: '363636',
    fontFace: 'Public Sans Light',
    italic: true,
    align: 'left',
    wrap: true,
    h: '3%',
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
  },
  scoreText: {
    x: '5%',
    y: '85%',
    w: '90%',
    h: '6%',
    fontSize: 8,
    color: '363636',
    fontFace: 'Public Sans',
    align: 'left',
    valign: 'middle'
  }
};

export async function addSecondaryAttributesSlide(pptx, properties) {
  const slide = pptx.addSlide({ masterName: 'NSW_MASTER' });
  
  try {
    // Add title
    slide.addText([
      { text: properties.formatted_address || properties.site__address, options: { color: styles.title.color } },
      { text: ' ', options: { breakLine: true } },
      { text: 'Secondary Site Attributes', options: { color: styles.subtitle.color } }
    ], convertCmValues(styles.title));

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
    slide.addText('4', convertCmValues(styles.pageNumber));

    // Add left map container (Site Contour)
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '5%',
      y: '18%',
      w: '40%',
      h: '61%',
      fill: 'FFFFFF',
      line: { color: '002664', width: 1.5 }
    }));
    
    // First add the blue vertical bars
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '5%',
      y: '18%',
      w: '6%',
      h: '61%',
      fill: '002664'
    }));

    // Then add the rotated text on top with correct positioning
    slide.addText('Site Contour', convertCmValues({
      x: '-22.5%',    // Negative x to account for rotation
      y: '45%',     // Centered vertically
      w: '61%',     // Original height becomes width when rotated
      h: '6%',      // Original width becomes height when rotated
      color: 'FFFFFF',
      fontSize: 14,
      fontFace: 'Public Sans',
      align: 'center',
      valign: 'middle',
      rotate: 270    // Use rotate instead of transform
    }));

    // Add left map
    console.log('Contour screenshot data:', {
      exists: !!properties.contourScreenshot,
      type: properties.contourScreenshot ? typeof properties.contourScreenshot : 'undefined',
      length: properties.contourScreenshot ? properties.contourScreenshot.length : 0
    });

    if (properties.contourScreenshot) {
      try {
        slide.addImage({
          data: properties.contourScreenshot,
          ...convertCmValues({
            x: '11%',
            y: '18%',
            w: '34%',
            h: '61%',
            sizing: {
              type: 'contain',
              align: 'center',
              valign: 'middle'
            }
          })
        });
        console.log('Successfully added contour map image');
      } catch (error) {
        console.error('Failed to add contour map image:', error);
      }
    } else {
      console.warn('No contour screenshot available');
      // Add placeholder or error message
      slide.addText('Contour map unavailable', convertCmValues({
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

    // Add left description box with gap
    let elevationText = 'Elevation data unavailable.';
    let contourScore = 0;
    let elevationChange = 0;

    if (properties.developableArea && properties.developableArea.length > 0) {
      try {
        // Process all developable areas instead of just the first one
        let allElevations = [];
        let hasElevationData = false;
        
        // Query elevation data for each developable area
        for (const area of properties.developableArea) {
          if (area.geometry && area.geometry.coordinates && area.geometry.coordinates[0]) {
            const geometry = {
              rings: [area.geometry.coordinates[0]]
            };
            const elevationData = await getElevationData(geometry);
            
            if (elevationData && elevationData.min !== undefined && elevationData.max !== undefined) {
              hasElevationData = true;
              // Add all elevations to our collection
              allElevations.push(elevationData.min, elevationData.max);
            }
          }
        }
        
        if (hasElevationData && allElevations.length > 0) {
          // Calculate overall min and max from all developable areas
          const minElevation = Math.min(...allElevations);
          const maxElevation = Math.max(...allElevations);
          elevationChange = maxElevation - minElevation;
          
          contourScore = scoringCriteria.contours.calculateScore(elevationChange);
          elevationText = `The developable area${properties.developableArea.length > 1 ? 's have' : ' has'} a minimum elevation of ${minElevation} metres, maximum elevation of ${maxElevation} metres, and change in elevation of ${elevationChange} metres.`;
        } else {
          // No contours found - site is flat
          contourScore = 3;
          elevationText = `The developable area${properties.developableArea.length > 1 ? 's are' : ' is'} flat with no change in elevation.`;
        }
      } catch (error) {
        console.error('Error processing developable area elevation data:', error);
        // Fallback to site geometry
        if (properties.site__geometry) {
          const geometry = {
            rings: [properties.site__geometry]
          };
          const elevationData = await getElevationData(geometry);
          if (elevationData === null) {
            // No contours found - site is flat
            contourScore = 3;
            elevationText = 'The site is flat with no change in elevation.';
          } else {
            elevationChange = elevationData.max - elevationData.min;
            contourScore = scoringCriteria.contours.calculateScore(elevationChange);
            elevationText = `The site has a minimum elevation of ${elevationData.min} metres, maximum elevation of ${elevationData.max} metres, and change in elevation of ${elevationChange} metres.`;
          }
        }
      }
    } else if (properties.site__geometry) {
      // Fallback to site geometry if no developable area
      const geometry = {
        rings: [properties.site__geometry]
      };
      const elevationData = await getElevationData(geometry);
      if (elevationData === null) {
        // No contours found - site is flat
        contourScore = 3;
        elevationText = 'The site is flat with no change in elevation.';
      } else {
        elevationChange = elevationData.max - elevationData.min;
        contourScore = scoringCriteria.contours.calculateScore(elevationChange);
        elevationText = `The site has a minimum elevation of ${elevationData.min} metres, maximum elevation of ${elevationData.max} metres, and change in elevation of ${elevationChange} metres.`;
      }
    }

    // Store the contour score
    properties.scores.contours = contourScore;

    // Update the box color based on score
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '5%',
      y: '80%',
      w: '40%',
      h: '12%',
      fill: scoringCriteria.contours.getScoreColor(contourScore).replace('#', ''),
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // Add description text and score separately
    slide.addText(elevationText, convertCmValues({
      x: '5%',
      y: '80%',
      w: '40%',
      h: '8%',  // Reduced height for main text
      fontSize: 7,
      color: '363636',
      fontFace: 'Public Sans',
      align: 'left',
      valign: 'top',
      wrap: true
    }));

    // Add score text separately
    slide.addText(`Score: ${contourScore}/3`, convertCmValues({
      x: '5%',
      y: '86%',  // Position just above the line
      w: '40%',
      h: '4%',
      fontSize: 7,
      color: '363636',
      fontFace: 'Public Sans',
      bold: true,
      align: 'right'
    }));

    // For Contour section (left) - Add before the source text
    slide.addShape(pptx.shapes.LINE, convertCmValues({
      x: '6%',
      y: '88.5%',
      w: '34%',
      h: 0,
      line: { color: '8C8C8C', width: 0.4 }
    }));

    // Add source text for contour
    slide.addText('Source: NSW 2M Elevation Contours, NSW Department of Customer Service, 2024', convertCmValues({
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

    // Right map container (Site Regularity)
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '50%',
      y: '18%',
      w: '40%',
      h: '61%',
      fill: 'FFFFFF',
      line: { color: '002664', width: 1.5 }
    }));

    // First add the blue vertical bars
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '50%',
      y: '18%',
      w: '6%',
      h: '61%',
      fill: '002664'
    }));

    // Then add the rotated text on top with correct positioning
    slide.addText('Site Regularity', convertCmValues({
      x: '22.5%',     // Adjusted x position for right side
      y: '45%',     // Centered vertically
      w: '61%',     // Original height becomes width when rotated
      h: '6%',      // Original width becomes height when rotated
      color: 'FFFFFF',
      fontSize: 14,
      fontFace: 'Public Sans',
      align: 'center',
      valign: 'middle',
      rotate: 270    // Use rotate instead of transform
    }));

    // Add right map
    console.log('Regularity screenshot data:', {
      exists: !!properties.regularityScreenshot,
      type: properties.regularityScreenshot ? typeof properties.regularityScreenshot : 'undefined',
      length: properties.regularityScreenshot ? properties.regularityScreenshot.length : 0
    });

    if (properties.regularityScreenshot) {
      try {
        slide.addImage({
          data: properties.regularityScreenshot,
          ...convertCmValues({
            x: '56%',
            y: '18%',
            w: '34%',
            h: '61%',
            sizing: {
              type: 'contain',
              align: 'center',
              valign: 'middle'
            }
          })
        });
      } catch (error) {
        console.error('Failed to add regularity map image:', error);
        addErrorMessage();
      }
    } else {
      console.warn('No regularity screenshot available');
      addErrorMessage();
    }

    function addErrorMessage() {
      slide.addText('Regularity map unavailable', convertCmValues({
        x: '56%',
        y: '18%',
        w: '34%',
        h: '61%',
        fontSize: 12,
        color: 'FF0000',
        align: 'center',
        valign: 'middle'
      }));
    }

    // Calculate regularity score
    let regularityScore = 0;
    let regularityText = 'Site regularity could not be assessed.';

    if (properties.developableArea && properties.developableArea.length > 0) {
      try {
        // If there are multiple developable areas, we need to assess each one
        if (properties.developableArea.length > 1) {
          // Calculate scores for each developable area
          const areaScores = [];
          const areaDetails = [];
          
          console.log(`Calculating regularity for ${properties.developableArea.length} developable areas`);
          
          for (let i = 0; i < properties.developableArea.length; i++) {
            const area = properties.developableArea[i];
            if (area.geometry) {
              const geometry = {
                type: 'Feature',
                geometry: area.geometry
              };
              
              console.log(`Processing developable area ${i+1}/${properties.developableArea.length}`);
              
              // Calculate area in square meters for reference
              const areaInSqM = turf.area(geometry);
              
              const areaScore = scoringCriteria.siteRegularity.calculateScore(geometry);
              areaScores.push(areaScore);
              
              // Store details for logging
              areaDetails.push({
                index: i,
                score: areaScore,
                areaInSqM: Math.round(areaInSqM),
                vertexCount: area.geometry.coordinates[0].length
              });
              
              console.log(`Area ${i+1} score: ${areaScore}/3 (${areaInSqM.toFixed(2)} sq m)`);
            }
          }
          
          console.log('Developable area regularity scores:', areaDetails);
          
          // Use the average score rounded to nearest integer
          if (areaScores.length > 0) {
            const avgScore = areaScores.reduce((sum, score) => sum + score, 0) / areaScores.length;
            regularityScore = Math.round(avgScore);
            
            console.log(`Average regularity score: ${avgScore.toFixed(2)}, rounded to: ${regularityScore}`);
            
            // Create appropriate text based on multiple areas
            regularityText = `The developable areas have varying regularity with an average score of ${avgScore.toFixed(1)}/3.`;
          }
        } else {
          // Single developable area - use existing logic
          const geometry = {
            type: 'Feature',
            geometry: properties.developableArea[0].geometry
          };
          
          // Calculate area in square meters for reference
          const areaInSqM = turf.area(geometry);
          
          console.log('Single developable area geometry:', JSON.stringify(geometry));
          console.log('Developable area geometry details:', {
            type: geometry.type,
            coordinates: geometry.geometry.coordinates,
            holes: geometry.geometry.coordinates.length > 1 ? 'Yes' : 'No',
            vertexCount: geometry.geometry.coordinates[0].length,
            areaInSqM: Math.round(areaInSqM)
          });
          
          regularityScore = scoringCriteria.siteRegularity.calculateScore(geometry);
          console.log(`Single area regularity score: ${regularityScore}/3 (${areaInSqM.toFixed(2)} sq m)`);
          
          regularityText = `The developable area is ${regularityScore === 3 ? 'highly regular' : regularityScore === 2 ? 'moderately regular' : 'irregular'} in shape.`;
        }
      } catch (error) {
        console.error('Error calculating site regularity:', error);
        // Fallback to site geometry
        if (properties.site__geometry) {
          const geometry = {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [properties.site__geometry]
            }
          };
          regularityScore = scoringCriteria.siteRegularity.calculateScore(geometry);
          regularityText = `The site is ${regularityScore === 3 ? 'highly regular' : regularityScore === 2 ? 'moderately regular' : 'irregular'} in shape.`;
        }
      }
    } else if (properties.site__geometry) {
      const geometry = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [properties.site__geometry]
        }
      };
      regularityScore = scoringCriteria.siteRegularity.calculateScore(geometry);
      regularityText = `The site is ${regularityScore === 3 ? 'highly regular' : regularityScore === 2 ? 'moderately regular' : 'irregular'} in shape.`;
    }

    // Store the regularity score
    properties.scores.siteRegularity = regularityScore;

    // Add right description box with gap
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '50%',
      y: '80%',
      w: '40%',
      h: '12%',  // Match contours height
      fill: scoringCriteria.siteRegularity.getScoreColor(regularityScore).replace('#', ''),
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // Add description text
    slide.addText(regularityText, convertCmValues({
      x: '50%',
      y: '80%',
      w: '40%',
      h: '8%',  // Match contours text height
      fontSize: 7,
      color: '363636',
      fontFace: 'Public Sans',
      align: 'left',
      valign: 'top',
      wrap: true
    }));

    // Add score text
    slide.addText(`Score: ${regularityScore}/3`, convertCmValues({
      x: '50%',
      y: '86%',  // Match contours score position
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
      x: '51%',
      y: '88.5%',  // Match contours line position
      w: '34%',
      h: 0,
      line: { color: '8C8C8C', width: 0.4 }
    }));

    // Add source text
    slide.addText('Source: Land IQ - Metromap by Aerometrex', convertCmValues({
      x: '50%',
      y: '88%',  // Match contours source position
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
    console.error('Error generating secondary attributes slide:', error);
    slide.addText('Error generating secondary attributes slide: ' + error.message, {
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