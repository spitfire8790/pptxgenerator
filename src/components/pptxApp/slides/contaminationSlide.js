import { convertCmValues } from '../utils/units';
import scoringCriteria from './scoringLogic';
import { proxyRequest } from '../utils/services/proxyService';
import { captureContaminationMap, captureOpenStreetMap } from '../utils/map/services/screenshot';

const makeGeometryRequest = async (url, params) => {
  try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await proxyRequest(`${url}?${params}`);
      clearTimeout(timeoutId);

      if (response.features?.[0]) {
          return response.features[0].attributes;
      }
      return null;
  } catch (error) {
      console.error('Error querying geometry data:', error);
      return null;
  }
};

const getContaminationData = async (geometry) => {
  const url = 'https://maptest2.environment.nsw.gov.au/arcgis/rest/services/EPA/EPACS/MapServer/1';
  const params = new URLSearchParams({
    f: 'json',
    geometryType: 'esriGeometryPolygon',
    geometry: JSON.stringify(geometry),
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'SiteName, Comment',
    returnGeometry: false
  });

  return makeGeometryRequest(url,params);
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
  let scores = {
    contamination: 0,
    siteRemediation: 3  // Default score as per scoring slide
  };

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

   // Add left map
   console.log('Contamination screenshot data:', {
    exists: !!properties.contaminationMapScreenshot,
    type: properties.contaminationMapScreenshot ? typeof properties.contaminationMapScreenshot : 'undefined',
    length: properties.contaminationMapScreenshot ? properties.contaminationMapScreenshot.length : 0
   });

   if (properties.contaminationMapScreenshot) {
     try {
       slide.addImage({
        data: properties.contaminationMapScreenshot,
        ...convertCmValues({
          x: '11%',
          y: '18%',
          w: '34%',
          h: '61%',
          sizing: {
            type: 'contain',
            align: 'center',
            valign: 'middle'
          }
        })
      });
      console.log('Successfully added contamination map image');    
    } catch (error) {
      console.error('Error adding contamination screenshot:', error);
    }
  } else {
     console.warn('No contamination screenshot available');
     // Add placeholder or error message
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

  // Add left description box with gap
  let contaminationText = 'Contamination data unavailable.';
  let contaminationScore = 0;

  // Use the contamination features that were already captured
  if (properties.contaminationFeatures?.length > 0) {
    try {
      // Calculate contamination score using the new method
      const scoreResult = scoringCriteria.contamination.calculateScore(
        properties.contaminationFeatures,
        properties.developableArea
      );
      contaminationScore = scoreResult.score;
      scores.contamination = scoreResult.score;
      contaminationText = scoringCriteria.contamination.getScoreDescription(scoreResult);
          
      // Add additional contamination information if contamination is found
      if (contaminationScore === 1) {
        const feature = properties.contaminationFeatures[0];
        if (feature.properties?.SiteName) {
          contaminationText += `\n\nSite Name: ${feature.properties.SiteName}`;
        }
        if (feature.properties?.Comment) {
          contaminationText += `\nComments: ${feature.properties.Comment}`;
        }
      }
    } catch (error) {
      console.error('Error processing contamination features:', error);
      contaminationText = 'Error processing contamination data.';
      contaminationScore = 0;
    }
  } else {
    // No contamination features found - site is not on register
    contaminationScore = 3;
    contaminationText = scoringCriteria.contamination.getScoreDescription({ score: 3, minDistance: Infinity });
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
  slide.addText('Source: NSW Environmental Protection Agency (EPA), 2025', convertCmValues({
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

    // Right side - Historical Imagery
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
    slide.addText('Historical Imagery', convertCmValues({
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

    // Add historical imagery
    if (properties.historicalImagery?.[0]) {
      try {
        // Add the image with correct dimensions
        slide.addImage({
          data: properties.historicalImagery[0].image,
          ...convertCmValues({
            x: '56%',
            y: '18%',
            w: '34%',
            h: '61%',
            sizing: {
              type: 'contain',
              align: 'center',
              valign: 'middle'
            }
          })
        });

        // Add year overlay
        slide.addText(`${properties.historicalImagery[0].year}`, convertCmValues({
          x: '82%',  // Moved to right side
          y: '18%',
          w: '8%',   // Smaller width for the year
          h: '5%',   // Slightly smaller height
          fontSize: 18,  // Smaller font size
          color: 'FFD700',  // Yellow color
          fontFace: 'Public Sans',
          bold: true,
          align: 'right',
          valign: 'top'
        }));

      } catch (error) {
        console.error('Error adding historical imagery:', error);
        addHistoricalErrorMessage();
      }
    } else {
      console.warn('No historical imagery available');
      addHistoricalErrorMessage();
    }

    function addHistoricalErrorMessage() {
      slide.addText('Historical imagery unavailable', convertCmValues({
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

    // Add description box with matching green color
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '50%',
      y: '80%',
      w: '40%',
      h: '12%',
      fill: 'E2EFD9',  // Softer green to match contamination side
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // Add description text
    slide.addText('Please update commentary and score to reflect any impact on potential contamination observable via the historical images', convertCmValues({
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

    // Add score text showing 3/3
    slide.addText('Score: 3/3', convertCmValues({
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

    // Add source text at bottom
    slide.addText('Source: Metromap', convertCmValues({
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

    return { slide, scores };
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
    return { slide, scores };
  }
}
