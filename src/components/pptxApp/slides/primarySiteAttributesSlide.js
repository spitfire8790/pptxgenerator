import { convertCmValues } from '../utils/units';
import scoringCriteria from './scoringLogic';
import { area } from '@turf/area';

const calculateFontSize = (text, maxLength = 50) => {
  if (!text) return 8; // Default font size
  // Start reducing font size if text is longer than maxLength
  if (text.length > maxLength) {
    const reduction = Math.floor((text.length - maxLength) / 50); // Reduce size for every 50 extra characters
    return Math.max(6, 8 - reduction); // Don't go smaller than 6pt
  }
  return 8;
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
  developableAreaBox: {
    x: '9%',
    y: '20%',
    w: '35%',
    h: '12%',
    fill: 'F5F9F5',
    line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
  },
  developableAreaIcon: {
    x: '4%',
    y: '22%',
    w: '0.5',
    h: '0.5'
  },
  developableAreaText: {
    x: '9%',
    y: '20%',
    w: '35%',
    h: '12%',
    fontSize: 9,
    color: '002664',
    fontFace: 'Public Sans',
    lineSpacing: 14
  },
  attributeIcons: {
    x: '4%',
    y: index => `${35 + (index * 9.5)}%`,
    w: '0.4',
    h: '0.4'
  },
  attributeBoxes: {
    x: '9%',
    y: index => `${34 + (index * 9.5)}%`,
    w: '38%',
    h: '8%',
    fill: 'F0F6FF',
    line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
  },
  attributeText: {
    fontSize: 9,
    color: '363636',
    fontFace: 'Public Sans'
  },
  map: {
    x: '45%',
    y: '20%',
    w: '39%',
    h: '70%',
    line: { color: '002664', width: 1.5 }
  },
  scoreContainer: {
    x: '9%',
    y: '22%',
    w: '34%',
    h: '8%',
    fill: '4CAF50'
  },
  scoreText: {
    x: '34.5%',
    y: '22%',
    w: '35%',
    h: '8%',
    color: '000000',
    fontSize: 11,
    bold: true,
    fontFace: 'Public Sans'
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
  mapLegend: {
    x: '87%',
    y: '20%',
    w: '16%',
    h: '72%',
    align: 'left'
  },
  legendContainer: {
    x: '85%',
    y: '20%',
    w: '10%',
    h: '30%',
    fill: 'FFFFFF',
    line: { color: '002664', width: 1.5 }
  },
  legendHeader: {
    x: '85%',
    y: '21%',
    w: '10%',
    h: '3%',
    fontSize: 10,
    color: '002664',
    bold: true,
    fontFace: 'Public Sans',
    align: 'left'
  },
  legendItem: {
    iconSize: 0.15,
    textStyle: {
      fontSize: 7,
      color: '363636',
      fontFace: 'Public Sans',
      lineSpacing: 10
    },
    spacing: 4,
    containerPadding: 1.5
  }
};

const calculateDevelopableArea = (geometry) => {
  if (!geometry) return 0;
  const areaInSqMeters = area(geometry);
  return Math.round(areaInSqMeters);
};

const icons = {
  developableArea: '/images/developable-area-icon.svg',
  flood: '/images/flood.svg',
  biodiversity: '/images/biodiversity.svg',
  physical: '/images/physical.svg',
  exclusionaryZoning: '/images/exclusionary_zoning.svg',
  infrastructure: '/images/infra.svg',
  builtForm: '/images/built_form.svg'
};

const addLegend = (slide, pptx) => {
  slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.legendContainer));

  slide.addText('Legend', convertCmValues(styles.legendHeader));

  const legendItems = [
    { 
      symbol: 'rectangle', 
      text: 'Site Boundary',
      style: { line: { color: 'FF0000', width: 1.5 }, fill: 'FFFFFF' }
    },
    { 
      symbol: 'rectangle', 
      text: 'Developable Area',
      style: { line: { color: '00FFFF', width: 1.5, dashType: 'dash' }, fill: 'FFFFFF' }
    },
    { 
      symbol: 'line', 
      text: 'HV Powerlines',
      style: { line: { color: '#E41A1C', width: 2 } }
    },
    { 
      symbol: 'line', 
      text: 'Easements',
      style: { line: { color: 'FCC3EC', width: 2 } }
    },
    { 
      symbol: 'rectangle', 
      text: 'Biodiversity',
      style: { fill: 'DDA0DD', line: { color: 'DDA0DD', width: 1 } }
    },
    { 
      symbol: 'rectangle', 
      text: '1AEP Flood',
      style: { fill: '0000FF', line: { color: '0000FF', width: 1 } }
    }
  ];

  legendItems.forEach((item, index) => {
    const yOffset = (index * styles.legendItem.spacing) + styles.legendItem.containerPadding;
    const iconY = parseFloat(styles.legendContainer.y) + 5 + yOffset;
    
    if (item.symbol === 'rectangle') {
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
        x: `${parseFloat(styles.legendContainer.x) + styles.legendItem.containerPadding}%`,
        y: `${iconY}%`,
        w: styles.legendItem.iconSize,
        h: styles.legendItem.iconSize,
        ...item.style
      }));
    } else if (item.symbol === 'line') {
      const lineY = iconY + (styles.legendItem.iconSize / 2);
      
      slide.addShape(pptx.shapes.LINE, convertCmValues({
        x: `${parseFloat(styles.legendContainer.x) + styles.legendItem.containerPadding}%`,
        y: `${lineY}%`,
        w: styles.legendItem.iconSize,
        h: 0,
        ...item.style
      }));
    }

    slide.addText(item.text, convertCmValues({
      x: `${parseFloat(styles.legendContainer.x) + styles.legendItem.containerPadding + 1}%`,
      y: `${iconY}%`,
      w: '8%',
      h: styles.legendItem.iconSize,
      ...styles.legendItem.textStyle,
      valign: 'middle'
    }));
  });
};

export async function addPrimarySiteAttributesSlide(pptx, properties) {
  const slide = pptx.addSlide({ masterName: 'NSW_MASTER' });

  // Add title with line break
  slide.addText([
    { text: properties.site__address, options: { color: styles.title.color } },
    { text: ' ', options: { breakLine: true } },
    { text: 'Primary Site Attributes', options: { color: styles.subtitle.color } }
  ], convertCmValues({
    ...styles.title,
    color: undefined
  }));
  
  // Add horizontal line under title
  slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.titleLine));

  // Add header elements
  slide.addText("SENSITIVE: NSW GOVERNMENT", convertCmValues(styles.sensitiveText));
  slide.addImage({
    path: "/images/NSW-Government-official-logo.jpg",
    ...convertCmValues(styles.nswLogo)
  });

  // Add developable area section with score-based color
  const developableArea = properties.developableArea ? 
    calculateDevelopableArea(properties.developableArea[0]?.geometry) : 0;
  const score = scoringCriteria.developableArea.calculateScore(developableArea);

  slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
    ...styles.developableAreaBox,
    fill: scoringCriteria.developableArea.getScoreColor(score).replace('#', '') // Remove # from hex color
  }));

  slide.addImage({
    path: "/images/developable-area-icon.svg",
    ...convertCmValues(styles.developableAreaIcon)
  });

  slide.addText([
    { 
      text: 'Developable Area ', 
      options: { color: '002664', bold: true } 
    },
    { 
      text: `is approx. ${developableArea.toLocaleString()} sqm.`,
      options: { color: '363636' } 
    },
    {
      text: `${score}/3 Points`,
      options: { color: '363636', bold: true, align: 'right' }
    },
    { 
      text: '\n\nNote: The developable area defined is indicative only for the purposes of desktop assessment. The exact developable area is subject to further due diligence.', 
      options: { fontSize: 7, italic: true, color: '666666', lineSpacing: 10 } 
    }
  ], convertCmValues({
    ...styles.developableAreaText,
    lineSpacing: 14
  }));

  // Add attribute sections
  const attributes = [
    { 
      title: 'Flood', 
      value: properties.floodImpact || 'Please describe any area deducted or else \'Nil area deducted.\'', 
      icon: icons.flood 
    },
    { 
      title: 'Biodiversity', 
      value: properties.biodiversityImpact || 'Please describe any area deducted or else \'Nil area deducted.\'', 
      icon: icons.biodiversity 
    },
    { 
      title: 'Physical Features', 
      value: properties.physicalFeatures || 'Please describe any area deducted or else \'Nil area deducted.\'', 
      icon: icons.physical 
    },
    { 
      title: 'Exclusionary Zonings & Attributes', 
      value: properties.zoningImpact || 'Please describe any area deducted or else \'Nil area deducted.\'', 
      icon: icons.exclusionaryZoning 
    },
    { 
      title: 'Major Infrastructure', 
      value: properties.infrastructureImpact || 'Please describe any area deducted or else \'Nil area deducted.\'', 
      icon: icons.infrastructure 
    },
    { 
      title: 'Existing Built-Form', 
      value: properties.builtForm || 'Please describe any area deducted or else \'Nil area deducted.\'', 
      icon: icons.builtForm 
    }
  ];

  attributes.forEach((attr, index) => {
    // Add icon
    slide.addImage({
      path: attr.icon,
      ...convertCmValues({
        x: '4%',
        y: `${35 + (index * 9.5)}%`,
        w: '0.5',
        h: '0.5'
      })
    });

    // Add box
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '9%',
      y: `${34 + (index * 9.5)}%`,
      w: '35%',
      h: '8%',
      fill: 'F0F6FF',
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // Add text with title and placeholder on separate lines
    slide.addText([
      { text: attr.title, options: { bold: true, breakLine: true } },
      { 
        text: attr.value, 
        options: { 
          italic: !properties[attr.key],
          color: properties[attr.key] ? '363636' : '808080',
          breakLine: true
        } 
      }
    ], convertCmValues({
      x: '9%',
      y: `${34 + (index * 9.5)}%`,
      w: '34%',
      h: '8%',
      fontSize: 8,
      fontFace: 'Public Sans',
      lineSpacing: 14
    }));
  });

  // Add before the map section
  console.log('Map screenshot data:', properties.compositeMapScreenshot ? 'Present' : 'Missing');

  // Update map section with error handling
  if (properties.compositeMapScreenshot) {
    try {
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
        x: '45%',
        y: '20%',
        w: '39%',
        h: '70%',
        fill: 'FFFFFF',
        line: { color: '002664', width: 1.5 }
      }));

      slide.addImage({
        data: properties.compositeMapScreenshot,
        ...convertCmValues({
          x: '45%',
          y: '20%',
          w: '39%',
          h: '70%',
          sizing: {
            type: 'contain',
            align: 'center',
            valign: 'middle'
          }
        })
      });
    } catch (error) {
      console.error('Error adding map image:', error);
    }
  } else {
    console.warn('No composite map screenshot available - check if capturePrimarySiteAttributesMap was called');
  }

  // Add map legend
  addLegend(slide, pptx);

  // Add footer elements
  slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.footerLine));
  slide.addText('Property and Development NSW', convertCmValues(styles.footer));
  slide.addText('3', convertCmValues(styles.pageNumber));

  return slide;
} 