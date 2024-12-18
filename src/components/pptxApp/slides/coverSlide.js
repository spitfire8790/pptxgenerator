import pptxgen from 'pptxgenjs';
import { convertCmValues } from '../utils/units';

const styles = {
  imageContainer: {
    x: 0,
    y: 0,
    w: '33%',
    h: '100%',
    fill: { type: 'solid', color: '002664' }
  },
  image: {
    x: 0,
    y: 0,
    w: '33%',
    h: '100%',
    sizing: { type: 'contain', w: '33%', h: '100%' }
  },
  dividerLine: {
    x: '34%',
    y: '5%',
    w: 0.005,
    h: '90%',
    line: { color: '002664', width: 0.005 },
    fill: { color: '002664' }
  },
  sensitiveText: {
    x: '70%',
    y: '2%',
    w: '25%',
    h: '3%',
    fontSize: 9,
    color: 'FF3B3B',
    bold: true,
    align: 'right',
    fontFace: 'Public Sans'
  },
  header: {
    x: '38%',
    y: '10%',
    w: '57%',
    h: '5%',
    fontSize: 12,
    color: '002664',
    bold: false,
    fontFace: 'Public Sans'
  },
  title: {
    x: '38%',
    y: '20%',
    w: '57%',
    h: '15%',
    fontSize: 30,
    color: '002664',
    bold: false,
    lineSpacing: 30,
    fontFace: 'Public Sans Light'
  },
  subtitle: {
    x: '38%',
    y: '60%',
    w: '57%',
    h: '5%',
    fontSize: 16,
    color: '002664',
    bold: true,
    fontFace: 'Public Sans Light'
  },
  address: {
    x: '38%',
    y: '68%',
    w: '57%',
    h: '5%',
    fontSize: 16,
    color: 'FFCC31',
    bold: true,
    fontFace: 'Public Sans Light'
  },
  date: {
    x: '38%',
    y: '90%',
    w: '57%',
    h: '5%',
    fontSize: 14,
    color: '363636',
    fontFace: 'Public Sans Light'
  },
  nswLogo: {
    x: '85%',
    y: '5%',
    w: '12%',
    h: '8%',
    sizing: { type: 'contain' }
  }
};

export function addCoverSlide(pptx, properties) {
  const slide = pptx.addSlide({ masterName: 'NSW_MASTER' });
  
  if (properties.screenshot) {
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.imageContainer));
    
    slide.addImage({
      data: properties.screenshot,
      ...convertCmValues(styles.image)
    });
  }

  slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.dividerLine));

  slide.addText("SENSITIVE: NSW GOVERNMENT", convertCmValues(styles.sensitiveText));

  slide.addImage({
    path: "/images/NSW-Government-official-logo.jpg",
    ...convertCmValues(styles.nswLogo)
  });

  slide.addText("Property and Development NSW", convertCmValues(styles.header));
  slide.addText("Audit of Government\nLand For Housing", convertCmValues(styles.title));
  slide.addText("Desktop Due Diligence Report", convertCmValues(styles.subtitle));
  slide.addText(properties.site__address, convertCmValues(styles.address));
  slide.addText(properties.reportDate, convertCmValues(styles.date));
}
