import { convertCmValues } from '../utils/units';
import scoringCriteria from './scoringLogic';
import { captureWaterMainsMap } from '../utils/map/services/screenshot';

export async function addServicingSlide(pptx, properties) {
  const slide = pptx.addSlide({ masterName: 'NSW_MASTER' });

  try {
    // Add title
    slide.addText([
      { text: properties.site__address, options: { color: styles.title.color } },
      { text: ' ', options: { breakLine: true } },
      { text: 'Servicing', options: { color: styles.subtitle.color } }
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

    // Section 1 - Water (Left)
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '5%',
      y: '18%',
      w: '28%',
      h: '56%',
      fill: 'FFFFFF',
      line: { color: '002664', width: 1 }
    }));

    // Water Title
    slide.addText('Water', convertCmValues({
      x: '5%',
      y: '18%',
      w: '28%',
      h: '6%',
      fill: '002664',
      color: 'FFFFFF',
      fontSize: 14,
      fontFace: 'Public Sans',
      align: 'center',
      valign: 'middle'
    }));

    // Capture and add water map
    try {
      const waterScreenshot = await captureWaterMainsMap(properties.geometry, properties.developableArea);
      if (waterScreenshot) {
        slide.addImage({
          data: waterScreenshot,
          ...convertCmValues({
            x: '5%',
            y: '24%',
            w: '28%',
            h: '50%',
            sizing: {
              type: 'contain',
              align: 'center',
              valign: 'middle'
            }
          })
        });
      } else {
        addErrorMessage(slide, 'Water', '5%');
      }
    } catch (error) {
      console.error('Error adding water map:', error);
      addErrorMessage(slide, 'Water', '5%');
    }

    // Section 2 - Sewer (Middle)
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '36%',
      y: '18%',
      w: '28%',
      h: '56%',
      fill: 'FFFFFF',
      line: { color: '002664', width: 1 }
    }));

    // Sewer Title
    slide.addText('Sewer', convertCmValues({
      x: '36%',
      y: '18%',
      w: '28%',
      h: '6%',
      fill: '002664',
      color: 'FFFFFF',
      fontSize: 14,
      fontFace: 'Public Sans',
      align: 'center',
      valign: 'middle'
    }));

    // Add sewer map
    if (properties.sewerScreenshot) {
      slide.addImage({
        data: properties.sewerScreenshot,
        ...convertCmValues({
          x: '36%',
          y: '24%',
          w: '28%',
          h: '50%',
          sizing: {
            type: 'contain',
            align: 'center',
            valign: 'middle'
          }
        })
      });
    }

    // Section 3 - Power (Right)
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '67%',
      y: '18%',
      w: '28%',
      h: '56%',
      fill: 'FFFFFF',
      line: { color: '002664', width: 1 }
    }));

    // Power Title
    slide.addText('Power', convertCmValues({
      x: '67%',
      y: '18%',
      w: '28%',
      h: '6%',
      fill: '002664',
      color: 'FFFFFF',
      fontSize: 14,
      fontFace: 'Public Sans',
      align: 'center',
      valign: 'middle'
    }));

    // Add power map
    if (properties.powerScreenshot) {
      slide.addImage({
        data: properties.powerScreenshot,
        ...convertCmValues({
          x: '67%',
          y: '24%',
          w: '28%',
          h: '50%',
          sizing: {
            type: 'contain',
            align: 'center',
            valign: 'middle'
          }
        })
      });
    }

    // Add description boxes for each section
    // Water description box
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '5%',
      y: '75%',
      w: '28%',
      h: '9%',
      fill: 'FFFBF2',
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // Sewer description box
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '36%',
      y: '75%',
      w: '28%',
      h: '9%',
      fill: 'FFFBF2',
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // Power description box
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '67%',
      y: '75%',
      w: '28%',
      h: '9%',
      fill: 'FFFBF2',
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // Calculate overall servicing score
    const servicingScore = Math.round((waterScore + sewerScore + powerScore) / 3);
    const scoreDescription = scoringCriteria.servicing.getScoreDescription(servicingScore);

    // Store the score in properties for later use in summary slide
    properties.scores = properties.scores || {};
    properties.scores.servicing = servicingScore;

    // Add score container with dynamic color based on score
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '5%',
      y: '92%',
      w: '90%',
      h: '3%',
      fill: scoringCriteria.servicing.getScoreColor(servicingScore).replace('#', ''),
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // Add score text
    slide.addText([
      { text: 'Servicing Score: ', options: { bold: true } },
      { text: `${servicingScore}/3`, options: { bold: true } },
      { text: ' - ' },
      { text: scoreDescription }
    ], convertCmValues({
      x: '5%',
      y: '92%',
      w: '90%',
      h: '3%',
      fontSize: 8,
      color: '363636',
      fontFace: 'Public Sans',
      align: 'left',
      valign: 'middle'
    }));

    // Add footer elements
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.footerLine));
    slide.addText('Property and Development NSW', convertCmValues(styles.footer));
    slide.addText('7', convertCmValues(styles.pageNumber));

    return slide;

  } catch (error) {
    console.error('Error generating servicing slide:', error);
    slide.addText('Error generating servicing slide: ' + error.message, {
      x: '10%',
      y: '45%',
      w: '80%',
      h: '10%',
      fontSize: 14,
      color: 'FF0000',
      align: 'center'
    });
  }

  return slide;
}

// Helper function for error messages
function addErrorMessage(slide, service, xPosition) {
  slide.addText(`${service} map unavailable`, convertCmValues({
    x: xPosition,
    y: '24%',
    w: '28%',
    h: '50%',
    fontSize: 12,
    color: 'FF0000',
    align: 'center',
    valign: 'middle'
  }));
}

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
    color: '363636'
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
  footerLine: {
    x: '5%',
    y: '95%',
    w: '90%',
    h: 0.01,
    line: { color: '002664', width: 0.7 },
    fill: { color: '002664' }
  },
  footer: {
    x: '5%',
    y: '95.5%',
    w: '50%',
    h: '3%',
    fontSize: 8,
    color: '002664',
    fontFace: 'Public Sans'
  },
  pageNumber: {
    x: '90%',
    y: '95.5%',
    w: '5%',
    h: '3%',
    fontSize: 8,
    color: '002664',
    fontFace: 'Public Sans',
    align: 'right'
  }
}; 