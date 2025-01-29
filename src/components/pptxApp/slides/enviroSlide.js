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
    console.log('TEC features:', properties.site_suitability__tecFeatures);

    // Check if we have the required data
    if (properties.developableArea) {
      // Even if we have no TEC features, we can still score it (as no impact)
      try {
        console.log('=== Starting TEC Score Calculation ===');
        console.log('Developable area geometry:', JSON.stringify(properties.developableArea[0].geometry));
        
        // Ensure we have a features array, even if empty
        const tecFeatures = properties.site_suitability__tecFeatures || { type: 'FeatureCollection', features: [] };
        console.log(`Processing TEC features:`, tecFeatures);
        
        const result = scoringCriteria.tec.calculateScore(tecFeatures, properties.developableArea);
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

    // Calculate biodiversity overlap text
    let biodiversityText = 'Biodiversity impact not assessed.';
    
    if (properties.developableArea && properties.site_suitability__biodiversityFeatures) {
      try {
        const bioFeatures = properties.site_suitability__biodiversityFeatures;
        const developableArea = properties.developableArea;

        if (bioFeatures?.features?.length > 0) {
          // Create a turf polygon from developable area
          const developablePolygon = {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: developableArea[0].geometry.coordinates
            }
          };
          const totalArea = turf.area(developablePolygon);

          // Calculate overlap area
          let overlapArea = 0;
          console.log('Processing biodiversity features...');
          
          bioFeatures.features.forEach((feature, index) => {
            if (feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon') {
              try {
                let featurePolygon = feature;
                console.log(`Feature ${index + 1} area:`, turf.area(featurePolygon), 'square meters');
                
                // Check both containment and intersection
                const containsFeature = turf.booleanContains(developablePolygon, featurePolygon);
                const intersectsFeature = turf.booleanIntersects(developablePolygon, featurePolygon);
                
                if (containsFeature) {
                  // If developable area contains feature, use entire feature area
                  const featureArea = turf.area(featurePolygon);
                  overlapArea += featureArea;
                  console.log(`Feature ${index + 1} is contained within developable area:`, featureArea);
                } else if (intersectsFeature) {
                  // If features intersect, calculate the intersection area
                  try {
                    const intersection = turf.intersect(developablePolygon, featurePolygon);
                    if (intersection) {
                      const intersectionArea = turf.area(intersection);
                      overlapArea += intersectionArea;
                      console.log(`Feature ${index + 1} intersects developable area:`, intersectionArea);
                    }
                  } catch (intersectError) {
                    console.error(`Error calculating intersection for feature ${index + 1}:`, intersectError);
                  }
                } else {
                  console.log(`Feature ${index + 1} does not overlap with developable area`);
                }
              } catch (error) {
                console.error('Error processing biodiversity feature:', error);
              }
            }
          });

          // Calculate percentage and format text
          const coverage = (overlapArea / totalArea) * 100;
          console.log('Biodiversity overlap:', { overlapArea, totalArea, coverage });
          
          biodiversityText = coverage > 0 
            ? `${Math.round(coverage)}% of developable area overlaps with biodiversity values.`
            : 'Developable area has no overlap with biodiversity values.';
        } else {
          biodiversityText = 'No biodiversity values identified in the area.';
        }
      } catch (error) {
        console.error('Error calculating biodiversity overlap:', error);
        biodiversityText = 'Error calculating biodiversity impact.';
      }
    }

    // Add biodiversity description text
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
