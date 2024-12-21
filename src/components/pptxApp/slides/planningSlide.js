import { convertCmValues } from '../utils/units';

const styles = {
  title: {
    x: '4%',
    y: '6%',
    w: '80%',
    h: '8%',
    fontSize: 22,
    color: '002664',
    fontFace: 'Public Sans Light',
    autoFit: true,
    breakLine: false
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
    x: (index) => `${5 + (index * 31.5)}%`,
    y: '25%',
    w: '29%',
    h: '60%'
  },
  mapTitle: {
    h: '10%',
    fill: '002664',
    color: 'FFFFFF',
    fontSize: 14,
    fontFace: 'Public Sans',
    align: 'center',
    valign: 'middle'
  },
  mapImage: {
    y: '10%',
    w: '100%',
    h: '55%',
    sizing: { type: 'fill' }
  },
  textBox: {
    y: '65%',
    w: '100%',
    h: '35%',
    fill: 'FFFBF2',
    line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
  },
  descriptionText: {
    x: '5%',
    y: '5%',
    w: '90%',
    h: '60%',
    fontSize: 10,
    color: '363636',
    fontFace: 'Public Sans',
    align: 'left',
    valign: 'top'
  },
  sourceText: {
    x: '5%',
    y: '70%',
    w: '90%',
    h: '20%',
    fontSize: 8,
    color: '363636',
    fontFace: 'Public Sans Light',
    italic: true,
    align: 'left'
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
    x: '5%',
    y: '95%',
    w: '90%',
    h: '4%',
    fontSize: 10,
    color: '002664',
    fontFace: 'Public Sans',
    align: 'left'
  },
  pageNumber: {
    x: '96%',
    y: '95%',
    w: '4%',
    h: '4%',
    fontSize: 8,
    color: '002664',
    fontFace: 'Public Sans',
    align: 'right'
  }
};

const createMapSection = (pptx, slide, title, index, imageData, text, source) => {
  const containerX = styles.mapContainer.x(index);
  const containerY = styles.mapContainer.y;
  const containerW = styles.mapContainer.w;
  const containerH = styles.mapContainer.h;

  // Add title
  slide.addText(title, {
    ...convertCmValues({
      ...styles.mapTitle,
      x: containerX,
      y: containerY,
      w: containerW
    })
  });

  // Add map image
  if (imageData) {
    console.log(`Adding map image for ${title}`);
    slide.addImage({
      data: imageData,
      ...convertCmValues({
        x: containerX,
        y: `${parseInt(containerY) + parseInt(styles.mapImage.y)}%`,
        w: containerW,
        h: styles.mapImage.h
      })
    });
  } else {
    console.warn(`No image data for ${title}`);
  }

  // Add text box
  slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
    x: containerX,
    y: `${parseInt(containerY) + parseInt(styles.textBox.y)}%`,
    w: containerW,
    h: styles.textBox.h,
    fill: styles.textBox.fill,
    line: styles.textBox.line
  }));

  // Add description text inside text box
  slide.addText(text, convertCmValues({
    x: `${parseInt(containerX) + parseInt(styles.descriptionText.x)}%`,
    y: `${parseInt(containerY) + parseInt(styles.textBox.y) + parseInt(styles.descriptionText.y)}%`,
    w: `${parseInt(containerW) - 2 * parseInt(styles.descriptionText.x)}%`,
    h: styles.descriptionText.h,
    ...styles.descriptionText
  }));

  // Add source text inside text box
  slide.addText(source, convertCmValues({
    x: `${parseInt(containerX) + parseInt(styles.sourceText.x)}%`,
    y: `${parseInt(containerY) + parseInt(styles.textBox.y) + parseInt(styles.sourceText.y)}%`,
    w: `${parseInt(containerW) - 2 * parseInt(styles.sourceText.x)}%`,
    h: styles.sourceText.h,
    ...styles.sourceText
  }));
};

export function addPlanningSlide(pptx, data) {
  console.log('Adding planning slide with data:', {
    zoningScreenshot: data.zoningScreenshot ? 'Present' : 'Missing',
    fsrScreenshot: data.fsrScreenshot ? 'Present' : 'Missing',
    hobScreenshot: data.hobScreenshot ? 'Present' : 'Missing'
  });

  const slide = pptx.addSlide({ masterName: 'NSW_MASTER' });

  // Add title with line break
  slide.addText(`${data.site__address}\nPlanning`, convertCmValues(styles.title));

  // Add horizontal line under title
  slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.titleLine));

  // Add sensitive text
  slide.addText("SENSITIVE: NSW GOVERNMENT", convertCmValues(styles.sensitiveText));

  // Add NSW Logo
  slide.addImage({
    path: "/images/NSW-Government-official-logo.jpg",
    ...convertCmValues(styles.nswLogo)
  });

  // Add the three map sections
  createMapSection(
    pptx,
    slide,
    'Zoning',
    0,
    data.zoningScreenshot,
    'The site is predominantly zoned R3 – Medium Density Residential, and part of the site is zoned SP2 - Infrastructure.',
    'Source: Land Zoning NSW, DPE, 2023'
  );

  createMapSection(
    pptx,
    slide,
    'Floorspace Ratio (FSR)',
    1,
    data.fsrScreenshot,
    'The site has no FSR specified.',
    'Source: EPI Floor Space Ratio (n:1) NSW, DPE, 2023'
  );

  createMapSection(
    pptx,
    slide,
    'Height of Building (HoB)',
    2,
    data.hobScreenshot,
    'The site HoB is 14 metres.',
    'Source: EPI Height of Building NSW, DPE, 2023'
  );

  // Add footer line
  slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.footerLine));

  // Add footer text
  slide.addText('Property and Development NSW', convertCmValues(styles.footer));

  // Add page number
  slide.addText('5', convertCmValues(styles.pageNumber));
}
