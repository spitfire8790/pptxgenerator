import { convertCmValues } from '../utils/units';
import scoringCriteria from './scoringLogic';

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

export async function addHazardsSlide(pptx, properties) {
  const slide = pptx.addSlide({ masterName: 'NSW_MASTER' });

  try {
    // Add title
    slide.addText([
      { text: properties.site__address, options: { color: styles.title.color } },
      { text: ' ', options: { breakLine: true } },
      { text: 'Natural Hazards', options: { color: styles.subtitle.color } }
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
    slide.addText('7', convertCmValues(styles.pageNumber));

    // Add left map container (Flood Risk)
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

    // Then add the rotated text on top with correct positioning
    slide.addText('Flood Risk', convertCmValues({
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
    console.log('Aerial screenshot data:', {
      exists: !!properties.floodMapScreenshot,
      type: properties.floodMapScreenshot ? typeof properties.floodMapScreenshot : 'undefined',
      length: properties.floodMapScreenshot ? properties.floodMapScreenshot.length : 0
    });

    if (properties.floodMapScreenshot) {
      try {
        // Add the flood map which has aerial + flood layers
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
          data: properties.floodMapScreenshot,
          ...imageOptions
        });

        console.log('Successfully added flood risk map');    
      } catch (error) {
        console.error('Error adding flood risk map:', error);
      }
    } else {
      console.warn('No flood map screenshot available');
      slide.addText('Flood risk map unavailable', convertCmValues({
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

    // Calculate flood score using the same flood features from primary site attributes
    let floodScore = 0;
    let floodText = 'Flood data unavailable.';

    // Use the flood features that were already captured for the primary site attributes
    if (properties.developableArea && properties.site_suitability__floodFeatures) {
      try {
        console.log('=== Starting Flood Score Calculation ===');
        console.log('Developable area geometry:', JSON.stringify(properties.developableArea[0].geometry));
        console.log(`Processing ${properties.site_suitability__floodFeatures.features.length} flood features...`);
        
        properties.site_suitability__floodFeatures.features.forEach((feature, index) => {
          console.log(`\nFlood Feature ${index + 1}:`);
          console.log('Type:', feature.geometry.type);
          if (feature.geometry.type === 'MultiPolygon') {
            console.log('Number of polygons:', feature.geometry.coordinates.length);
            feature.geometry.coordinates.forEach((polygon, pIndex) => {
              console.log(`  Polygon ${pIndex + 1} coordinates:`, JSON.stringify(polygon[0].slice(0, 3) + '...'));
            });
          } else {
            console.log('Coordinates:', JSON.stringify(feature.geometry.coordinates[0].slice(0, 3) + '...'));
          }
        });

        const result = scoringCriteria.flood.calculateScore(properties.site_suitability__floodFeatures, properties.developableArea);
        console.log('\nScore Calculation Result:');
        console.log('- Score:', result.score);
        console.log('- Distance to nearest flood:', result.minDistance ? `${result.minDistance.toFixed(2)}m` : 'N/A');
        console.log('- Intersects with flood:', result.minDistance === 0);
        console.log('- Description:', scoringCriteria.flood.getScoreDescription(result));
        console.log('=== End Flood Score Calculation ===\n');
        
        floodScore = result.score;
        floodText = scoringCriteria.flood.getScoreDescription(result);
      } catch (error) {
        console.error('Error calculating flood score:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          developableArea: properties.developableArea ? 'exists' : 'missing',
          floodFeatures: properties.site_suitability__floodFeatures ? 'exists' : 'missing'
        });
        floodText = 'Error calculating flood risk.';
      }
    } else {
      console.log('Missing required data for flood score:', {
        developableArea: properties.developableArea ? 'exists' : 'missing',
        floodFeatures: properties.site_suitability__floodFeatures ? 'exists' : 'missing'
      });
    }

    // Update the box color based on score
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '5%',
      y: '80%',
      w: '40%',
      h: '12%',
      fill: scoringCriteria.flood.getScoreColor(floodScore).replace('#', ''),
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // Add description text
    slide.addText(floodText, convertCmValues({
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
    slide.addText(`Score: ${floodScore}/3`, convertCmValues({
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
    slide.addText('Source: NSW 1AEP Flood Extents (Strategic), SES and DPHI, 2022', convertCmValues({
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

    // Right side - Bushfire Risk
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
    slide.addText('Bushfire Risk', convertCmValues({
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

    // Add bushfire map
    if (properties.bushfireMapScreenshot) {
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
          data: properties.bushfireMapScreenshot,
          ...imageOptions
        });

        console.log('Successfully added bushfire risk map');    
      } catch (error) {
        console.error('Error adding bushfire risk map:', error);
      }
    } else {
      console.warn('No bushfire map screenshot available');
      slide.addText('Bushfire risk map unavailable', convertCmValues({
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

    // Calculate bushfire score
    let bushfireScore = 0;
    let bushfireText = 'Bushfire data unavailable.';

    if (properties.developableArea && properties.site_suitability__bushfireFeatures) {
      try {
        console.log('=== Starting Bushfire Score Calculation ===');
        console.log('Developable area geometry:', JSON.stringify(properties.developableArea[0].geometry));
        console.log(`Processing bushfire features...`);
        
        const result = scoringCriteria.bushfire.calculateScore(properties.site_suitability__bushfireFeatures, properties.developableArea);
        console.log('\nScore Calculation Result:');
        console.log('- Score:', result.score);
        console.log('- Distance to nearest bushfire area:', result.minDistance ? `${result.minDistance.toFixed(2)}m` : 'N/A');
        console.log('- Intersects with bushfire area:', result.minDistance === 0);
        console.log('- Description:', scoringCriteria.bushfire.getScoreDescription(result));
        console.log('=== End Bushfire Score Calculation ===\n');
        
        bushfireScore = result.score;
        bushfireText = scoringCriteria.bushfire.getScoreDescription(result);
      } catch (error) {
        console.error('Error calculating bushfire score:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          developableArea: properties.developableArea ? 'exists' : 'missing',
          bushfireFeatures: properties.site_suitability__bushfireFeatures ? 'exists' : 'missing'
        });
        bushfireText = 'Error calculating bushfire risk.';
      }
    } else {
      console.log('Missing required data for bushfire score:', {
        developableArea: properties.developableArea ? 'exists' : 'missing',
        bushfireFeatures: properties.site_suitability__bushfireFeatures ? 'exists' : 'missing'
      });
    }

    // Update the box color based on score
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '50%',
      y: '80%',
      w: '40%',
      h: '12%',
      fill: scoringCriteria.bushfire.getScoreColor(bushfireScore).replace('#', ''),
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // Add description text
    slide.addText(bushfireText, convertCmValues({
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

    // Add score text
    slide.addText(`Score: ${bushfireScore}/3`, convertCmValues({
      x: '50%',
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
      x: '51%',
      y: '88.5%',
      w: '34%',
      h: 0,
      line: { color: '8C8C8C', width: 0.4 }
    }));

    // Add source text
    slide.addText('Source: NSW Planning Portal Bushfire Prone Land Map, 2023', convertCmValues({
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
    console.error('Error generating hazards slide:', error);
    slide.addText('Error generating hazards slide: ' + error.message, {
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