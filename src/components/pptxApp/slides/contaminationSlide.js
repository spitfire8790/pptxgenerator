import { convertCmValues } from '../utils/units';
import scoringCriteria from './scoringLogic';
import { captureContaminationMap, captureOpenStreetMap } from '../utils/map/services/screenshot';

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

export async function addContaminationSlide(pptx, properties) {
  const slide = pptx.addSlide({ masterName: 'NSW_MASTER' });

  try {
    // Add title
    slide.addText([
      { text: properties.site__address, options: { color: styles.title.color } },
      { text: ' ', options: { breakLine: true } },
      { text: 'Site Contamination', options: { color: styles.subtitle.color } }
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
    slide.addText('11', convertCmValues(styles.pageNumber));

    // Add left map container (Contaminated Sites Register)
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
    slide.addText('Contaminated Sites Register', convertCmValues({
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

    // Capture and add contamination map
    try {
      const feature = {
        geometry: {
          coordinates: [properties.site__geometry]
        },
        properties: properties
      };
      const mapScreenshot = await captureContaminationMap(feature, properties.developableArea);
      
      if (mapScreenshot) {
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
          data: mapScreenshot,
          ...imageOptions
        });

        console.log('Successfully added contamination map');    
      } else {
        throw new Error('Map screenshot capture returned null');
      }
    } catch (error) {
      console.error('Error capturing/adding contamination map:', error);
      slide.addText('Contamination map unavailable', convertCmValues({
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

    // Calculate contamination score
    let contaminationScore = 0;
    let contaminationText = 'Contamination data unavailable.';

    if (properties.developableArea && properties.site_suitability__contaminationFeatures) {
      try {
        console.log('=== Starting Contamination Score Calculation ===');
        console.log('Developable area geometry:', JSON.stringify(properties.developableArea[0].geometry));
        console.log(`Processing contamination features...`);
        
        const result = scoringCriteria.contamination.calculateScore(properties.site_suitability__contaminationFeatures, properties.developableArea);
        console.log('\nScore Calculation Result:');
        console.log('- Score:', result.score);
        console.log('- Description:', scoringCriteria.contamination.getScoreDescription(result));
        console.log('=== End Contamination Score Calculation ===\n');
        
        contaminationScore = result.score;
        contaminationText = scoringCriteria.contamination.getScoreDescription(result);
      } catch (error) {
        console.error('Error calculating contamination score:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          developableArea: properties.developableArea ? 'exists' : 'missing',
          contaminationFeatures: properties.site_suitability__contaminationFeatures ? 'exists' : 'missing'
        });
        contaminationText = 'Error calculating contamination risk.';
      }
    } else {
      console.log('Missing required data for contamination score:', {
        developableArea: properties.developableArea ? 'exists' : 'missing',
        contaminationFeatures: properties.site_suitability__contaminationFeatures ? 'exists' : 'missing'
      });
    }

    // Update the box color based on score
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '5%',
      y: '80%',
      w: '40%',
      h: '12%',
      fill: scoringCriteria.contamination.getScoreColor(contaminationScore).replace('#', ''),
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // Add description text
    slide.addText(contaminationText, convertCmValues({
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
    slide.addText(`Score: ${contaminationScore}/3`, convertCmValues({
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
    slide.addText('Source: EPA Contaminated Land Register. Note that absence of being on the register does not mean the site is free from contamination.', convertCmValues({
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

    // Right side - Usage and Potential Site Remediation
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
    slide.addText('Usage and Potential Site Remediation', convertCmValues({
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

    // Add OpenStreetMap view
    try {
      const feature = {
        geometry: {
          coordinates: [properties.site__geometry]
        },
        properties: properties
      };
      const mapScreenshot = await captureOpenStreetMap(feature, properties.developableArea);
      
      if (mapScreenshot) {
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
          data: mapScreenshot,
          ...imageOptions
        });

        console.log('Successfully added OpenStreetMap view');    
      } else {
        throw new Error('Map screenshot capture returned null');
      }
    } catch (error) {
      console.error('Error capturing/adding OpenStreetMap view:', error);
      slide.addText('Map unavailable', convertCmValues({
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

    // Add description box
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '50%',
      y: '80%',
      w: '40%',
      h: '12%',
      fill: 'FFFFFF',
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // Add description text
    slide.addText('The site may require remediation works depending on the extent and type of contamination present. Further investigation and a detailed site assessment would be required to determine the full scope of any necessary remediation.', convertCmValues({
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
    slide.addText('Source: OpenStreetMap Contributors', convertCmValues({
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
    console.error('Error generating contamination slide:', error);
    slide.addText('Error generating contamination slide: ' + error.message, {
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
