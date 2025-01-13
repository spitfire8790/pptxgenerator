import { convertCmValues } from '../utils/units';
import { captureWaterMainsMap, captureSewerMap, capturePowerMap } from '../utils/map/services/screenshot';

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
      if (properties.waterMainsScreenshot) {
        slide.addImage({
          data: properties.waterMainsScreenshot,
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
      if (properties.sewerScreenshot) {
        slide.addImage({
          data: properties.sewerScreenshot,
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
      if (properties.powerScreenshot?.image) {
        slide.addImage({
          data: properties.powerScreenshot.image,
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

    // Add footer elements
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.footerLine));
    slide.addText('Property and Development NSW', convertCmValues(styles.footer));
    slide.addText('7', convertCmValues(styles.pageNumber));

    return slide;

  } catch (error) {
    console.error('Error generating servicing slide:', error);
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