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
    w: '32%',
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
    h: '5%',
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
      { text: properties.site__address, options: { color: styles.title.color } },
      { text: ' ', options: { breakLine: true } },
      { text: 'Secondary Attributes', options: { color: styles.subtitle.color } }
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
    slide.addText('4', convertCmValues(styles.pageNumber));

    // Add left map container (Site Contour)
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '5%',
      y: '18%',
      w: '43%',
      h: '70%',
      fill: 'FFFFFF',
      line: { color: '002664', width: 1 }
    }));
    
    // Add left map title
    slide.addText('Site Contour', convertCmValues({
      x: '5%',
      y: '18%',
      w: '43%',
      h: '6%',
      fill: '002664',
      color: 'FFFFFF',
      fontSize: 14,
      fontFace: 'Public Sans',
      align: 'center',
      valign: 'middle'
    }));

    // Add left map
    if (properties.contourScreenshot) {
      slide.addImage({
        data: properties.contourScreenshot,
        ...convertCmValues({
          x: '5%',
          y: '24%',
          w: '43%',
          h: '50%',
          sizing: {
            type: 'contain',
            align: 'center',
            valign: 'middle'
          }
        })
      });
    }

    // Add left description box
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '5%',
      y: '75%',
      w: '43%',
      h: '9%',
      fill: 'FFFBF2',
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // Add left description text
    slide.addText('The site is relatively flat.', convertCmValues({
      x: '5%',
      y: '75%',
      w: '43%',
      h: '5%',
      fontSize: 7,
      color: '363636',
      fontFace: 'Public Sans',
      align: 'left',
      valign: 'top',
      wrap: true
    }));

    // Add left source text
    slide.addText('Source: NSW 2M Elevation Contours, NSW Spatial Portal, 2024', convertCmValues({
      x: '5%',
      y: '81%',
      w: '43%',
      h: '3%',
      fontSize: 6,
      color: '363636',
      fontFace: 'Public Sans Light',
      italic: true,
      align: 'left',
      wrap: true
    }));

    // Add right map container (Site Regularity)
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '52%',
      y: '18%',
      w: '43%',
      h: '70%',
      fill: 'FFFFFF',
      line: { color: '002664', width: 1 }
    }));
    
    // Add right map title
    slide.addText('Site Regularity', convertCmValues({
      x: '52%',
      y: '18%',
      w: '43%',
      h: '6%',
      fill: '002664',
      color: 'FFFFFF',
      fontSize: 14,
      fontFace: 'Public Sans',
      align: 'center',
      valign: 'middle'
    }));

    // Add right map
    if (properties.regularityScreenshot) {
      slide.addImage({
        data: properties.regularityScreenshot,
        ...convertCmValues({
          x: '52%',
          y: '24%',
          w: '43%',
          h: '50%',
          sizing: {
            type: 'contain',
            align: 'center',
            valign: 'middle'
          }
        })
      });
    }

    // Add right description box
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '52%',
      y: '75%',
      w: '43%',
      h: '9%',
      fill: 'FFFBF2',
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // Add right description text
    slide.addText('The site is regular in shape.', convertCmValues({
      x: '52%',
      y: '75%',
      w: '43%',
      h: '5%',
      fontSize: 7,
      color: '363636',
      fontFace: 'Public Sans',
      align: 'left',
      valign: 'top',
      wrap: true
    }));

    // Add right source text
    slide.addText('Source: Land ID Metromap by Aerometrex', convertCmValues({
      x: '52%',
      y: '81%',
      w: '43%',
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