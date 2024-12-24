import { convertCmValues } from '../utils/units';

const styles = {
  imageContainer: {
    x: 0,
    y: 0,
    w: '50%',
    h: '100%',
    fill: { type: 'solid', color: '002664' }
  },
  dividerLine: {
    x: '52%',
    y: '2%',
    w: 0.01,
    h: '94%',
    line: { color: '002664', width: 0.005 },
    fill: { color: '002664' }
  },
  sensitiveText: {
    x: '53%',
    y: '2%',
    w: '25%',
    h: '3%',
    fontSize: 10,
    color: 'FF3B3B',
    bold: true,
    align: 'left',
    fontFace: 'Public Sans'
  },
  header: {
    x: '53%',
    y: '10%',
    w: '43%',
    h: '5%',
    fontSize: 16,
    color: '002664',
    bold: true,
    fontFace: 'Public Sans'
  },
  title: {
    x: '53%',
    y: '24%',
    w: '43%',
    h: '15%',
    fontSize: 36,
    color: '002664',
    bold: false,
    lineSpacing: 36,
    fontFace: 'Public Sans Light'
  },
  subtitle: {
    x: '53%',
    y: '60%',
    w: '43%',
    h: '5%',
    fontSize: 18,
    color: '002664',
    bold: true,
    fontFace: 'Public Sans Light'
  },
  address: {
    x: '53%',
    y: '68%',
    w: '43%',
    h: '5%',
    fontSize: 18,
    color: 'FFCC31',
    bold: true,
    fontFace: 'Public Sans Light'
  },
  date: {
    x: '53%',
    y: '92%',
    w: '43%',
    h: '5%',
    fontSize: 14,
    color: '363636',
    fontFace: 'Public Sans Light'
  },
  nswLogo: {
    x: '90%',
    y: '5%',
    w: '8%',
    h: '8%',
    sizing: { type: 'contain' }
  }
};

export function addCoverSlide(pptx, properties) {
  const slide = pptx.addSlide({ masterName: 'NSW_MASTER' });
  
  if (properties.screenshot) {
    slide.addImage({
      data: properties.screenshot,
      x: 0,
      y: 0,
      w: '50%',
      h: '100%',
      sizing: {
        type: 'cover',
        position: 'center'
      }
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
