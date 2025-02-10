import { convertCmValues } from '../utils/units';
import { captureWaterMainsMap, captureSewerMap, capturePowerMap } from '../utils/map/services/screenshot';
import scoringCriteria from './scoringLogic';

export async function addServicingSlide(pptx, propertyData) {
  let slide;
  try {
    console.log('Starting to add servicing slide...');
    slide = pptx.addSlide();

    // Add title
    slide.addText([
      { text: propertyData.site__address, options: { color: styles.title.color } },
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

    // Add infrastructure maps for each section
    try {
      // Water section
      if (propertyData.waterMainsScreenshot) {
        slide.addImage({
          data: propertyData.waterMainsScreenshot,
          ...convertCmValues({
            x: '5%',
            y: '24%',
            w: '28%',
            h: '50%',
            sizing: { type: 'contain', align: 'center', valign: 'middle' }
          })
        });
      }

      // Sewer section
      if (propertyData.sewerScreenshot) {
        slide.addImage({
          data: propertyData.sewerScreenshot,
          ...convertCmValues({
            x: '36%',
            y: '24%',
            w: '28%',
            h: '50%',
            sizing: { type: 'contain', align: 'center', valign: 'middle' }
          })
        });
      }

      // Power section
      if (propertyData.powerScreenshot) {
        slide.addImage({
          data: propertyData.powerScreenshot,
          ...convertCmValues({
            x: '67%',
            y: '24%',
            w: '28%',
            h: '50%',
            sizing: { type: 'contain', align: 'center', valign: 'middle' }
          })
        });
      }
    } catch (error) {
      console.error('Error adding infrastructure maps:', error);
    }

    // Calculate distances along with scores
    console.log('=== Properties Debug ===');
    console.log('Full properties object:', propertyData);
    console.log('Water Features:', propertyData.waterFeatures);
    console.log('Water Features type:', typeof propertyData.waterFeatures);
    console.log('Water Features structure:', JSON.stringify(propertyData.waterFeatures, null, 2));
    console.log('Developable Area:', propertyData.developableArea);
    const waterResult = scoringCriteria.water.calculateScore(propertyData.waterFeatures, propertyData.developableArea);
    console.log('Water Result:', waterResult);
    const sewerResult = scoringCriteria.sewer.calculateScore(propertyData.sewerFeatures, propertyData.developableArea);
    const powerResult = scoringCriteria.power.calculateScore(propertyData.powerFeatures, propertyData.developableArea);

    // Store scores
    const waterScore = waterResult.score;
    const sewerScore = sewerResult.score;
    const powerScore = powerResult.score;

    // Calculate overall servicing score
    const servicingScore = scoringCriteria.servicing.calculateScore(waterScore, sewerScore, powerScore);
    const scoreDescription = scoringCriteria.servicing.getScoreDescription(waterScore, sewerScore, powerScore);

    // Store scores in properties
    propertyData.scores = {
      ...propertyData.scores,
      water: waterScore,
      sewer: sewerScore,
      power: powerScore,
      servicing: servicingScore
    };

    // Store the servicing score in the properties object
    propertyData.scores.servicing = servicingScore;

    // Update the text descriptions with distances
    const waterDescription = scoringCriteria.water.getScoreDescription(waterScore, waterResult.minDistance);
    const sewerDescription = scoringCriteria.sewer.getScoreDescription(sewerScore, sewerResult.minDistance);
    const powerDescription = scoringCriteria.power.getScoreDescription(powerScore, powerResult.minDistance);

    // Water Text Box
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '5%',
      y: '75%',
      w: '28%',
      h: '9%',
      fill: waterScore === 1 ? 'E6F2DE' : 'FFE6EA',  // Light green if 1, light red if 0
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // Water Description
    slide.addText(waterDescription, convertCmValues({
      x: '5%',
      y: '75%',
      w: '28%',
      h: '5%',
      fontSize: 7,
      color: '363636',
      fontFace: 'Public Sans',
      align: 'left',
      valign: 'top',
      wrap: true
    }));

    // Water Source
    slide.addText('Source: NSW Water Mains, Department of Customer Service, 2025', convertCmValues({
      x: '5%',
      y: '81%',
      w: '28%',
      h: '3%',
      fontSize: 6,
      color: '363636',
      fontFace: 'Public Sans Light',
      italic: true,
      align: 'left',
      wrap: true
    }));

    // Water section line
    slide.addShape(pptx.shapes.LINE, convertCmValues({
      x: '6%',
      y: '81%',
      w: '26%',
      h: 0,
      line: { color: '8C8C8C', width: 0.4 }
    }));

    // Sewer Text Box
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '36%',
      y: '75%',
      w: '28%',
      h: '9%',
      fill: sewerScore === 1 ? 'E6F2DE' : 'FFE6EA',  // Light green if 1, light red if 0
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // Sewer Description
    slide.addText(sewerDescription, convertCmValues({
      x: '36%',
      y: '75%',
      w: '28%',
      h: '5%',
      fontSize: 7,
      color: '363636',
      fontFace: 'Public Sans',
      align: 'left',
      valign: 'top',
      wrap: true
    }));

    // Sewer Source
    slide.addText('Source: NSW Sewer Mains, Department of Customer Service, 2025', convertCmValues({
      x: '36%',
      y: '81%',
      w: '28%',
      h: '3%',
      fontSize: 6,
      color: '363636',
      fontFace: 'Public Sans Light',
      italic: true,
      align: 'left',
      wrap: true
    }));

    // Sewer section line
    slide.addShape(pptx.shapes.LINE, convertCmValues({
      x: '37%',
      y: '81%',
      w: '26%',
      h: 0,
      line: { color: '8C8C8C', width: 0.4 }
    }));

    // Power Text Box
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '67%',
      y: '75%',
      w: '28%',
      h: '9%',
      fill: powerScore === 1 ? 'E6F2DE' : 'FFE6EA',  // Light green if 1, light red if 0
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // Power Description
    slide.addText(powerDescription, convertCmValues({
      x: '67%',
      y: '75%',
      w: '28%',
      h: '5%',
      fontSize: 7,
      color: '363636',
      fontFace: 'Public Sans',
      align: 'left',
      valign: 'top',
      wrap: true
    }));

    // Power Source
    slide.addText('Source: NSW Power Lines, Department of Customer Service, 2025', convertCmValues({
      x: '67%',
      y: '81%',
      w: '28%',
      h: '3%',
      fontSize: 6,
      color: '363636',
      fontFace: 'Public Sans Light',
      italic: true,
      align: 'left',
      wrap: true
    }));

    // Power section line
    slide.addShape(pptx.shapes.LINE, convertCmValues({
      x: '68%',
      y: '81%',
      w: '26%',
      h: 0,
      line: { color: '8C8C8C', width: 0.4 }
    }));

    // Add score container with dynamic color based on score
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      ...styles.scoreContainer,
      fill: scoringCriteria.servicing.getScoreColor(servicingScore)
    }));

    // Add score text
    slide.addText([
      { text: 'Servicing Score: ', options: { bold: true } },
      { text: `${servicingScore}/3`, options: { bold: true } },
      { text: ' - ' },
      { text: scoreDescription }
    ], convertCmValues(styles.scoreText));

    // Add footer line
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.footerLine));

    // Update page number text to match style
    slide.addText('Property and Development NSW', convertCmValues(styles.footer));
    slide.addText('7', convertCmValues(styles.pageNumber));

    return slide;

  } catch (error) {
    console.error('Error generating servicing slide:', error);
    // Create an error slide if we haven't created one yet
    if (!slide) {
      slide = pptx.addSlide();
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
  scoreContainer: {
    x: '5%',
    y: '85%',
    w: '90%',
    h: '6%',
    fill: 'FFFBF2',
    line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
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