import { convertCmValues } from '../utils/units';
import scoringCriteria from './scoringLogic';
import { proxyRequest } from '../utils/services/proxyService';

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

const getHeritageData = async (geometry) => {
    const url = 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/0/query';
    const params = new URLSearchParams({
        f: 'json',
        geometryType: 'esriGeometryPolygon',
        geometry: JSON.stringify(geometry),
        spatialRel: 'esriSpatialRelIntersects',
        outFields: 'SIG, LAY_CLASS, H_NAME',
        returnGeometry: false
    });

    return makeGeometryRequest(url, params);
};

const getAcidSulfateSoilsData = async (geometry) => {
    const url = 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/Protection/MapServer/1/query';
    const params = new URLSearchParams({
        f: 'json',
        geometryType: 'esriGeometryPolygon',
        geometry: JSON.stringify(geometry),
        spatialRel: 'esriSpatialRelIntersects',
        outFields: 'LAY_CLASS',
        returnGeometry: false
    });

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);  
        const response = await proxyRequest(`${url}?${params}`);
        clearTimeout(timeoutId);    

        if (response.features && response.features.length > 0) {
            return response.features[0].attributes;
        }
        return null;
    } catch (error) {
        console.error('Error querying acid sulfate soils data:', error);
        return null;
    }
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

export async function addPlanningSlide2(pptx, properties) {
  const slide = pptx.addSlide({ masterName: 'NSW_MASTER' });
  let scores = {
    sepp: 0,
    biodiversity: 0,
    aboriginalCulturalHeritage: 0
  };

  try {
    // Add title
    slide.addText([
    { text: properties.site__address, options: { color: styles.title.color } },
    { text: ' ', options: { breakLine: true } },
    { text: 'Heritage & Acid Sulfate Soils', options: { color: styles.subtitle.color } }
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
   slide.addText('6', convertCmValues(styles.pageNumber));

   // Add left map container (Heritage)
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
   slide.addText('Heritage', convertCmValues({
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
   console.log('Heritage screenshot data:', {
    exists: !!properties.heritageScreenshot,
    type: properties.heritageScreenshot ? typeof properties.heritageScreenshot : 'undefined',
    length: properties.heritageScreenshot ? properties.heritageScreenshot.length : 0
   });

   if (properties.heritageScreenshot) {
     try {
       slide.addImage({
        data: properties.heritageScreenshot,
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
      console.log('Successfully added heritage map image');    
    } catch (error) {
      console.error('Error adding heritage screenshot:', error);
    }
  } else {
     console.warn('No heritage screenshot available');
     // Add placeholder or error message
     slide.addText('Heritage map unavailable', convertCmValues({
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
  let heritageText = 'Heritage data unavailable.';
  let heritageScore = 0;

  if (properties.developableArea && properties.developableArea[0]) {
    const geometry = {
      rings: [properties.developableArea[0].geometry.coordinates[0]]
    };
        
   try {
    const heritageData = await getHeritageData(geometry);
    heritageScore = scoringCriteria.heritage.calculateScore(heritageData);
    heritageText = scoringCriteria.heritage.getScoreDescription(heritageScore);
          
    // Add additional heritage information if heritage is found (scores 1 or 2)
    if (heritageData && (heritageScore === 1 || heritageScore === 2)) {
      if (heritageData.LAY_CLASS) {
        heritageText += `\n\nClass: ${heritageData.LAY_CLASS}`;
        }
            if (heritageData.H_NAME) {
              heritageText += `\nName: ${heritageData.H_NAME}`;
            }
          }
        } catch (error) {
          console.error('Error getting heritage data:', error);
          heritageText = 'Error retrieving heritage data.';
          heritageScore = 0;
        }
      } else if (properties.site__geometry) {
        // Fallback to site geometry if no developable area
        const geometry = {
          rings: [properties.site__geometry]
        };
        
        try {
          const heritageData = await getHeritageData(geometry);
          heritageScore = scoringCriteria.heritage.calculateScore(heritageData);
          heritageText = scoringCriteria.heritage.getScoreDescription(heritageScore);
          
          // Add additional heritage information if heritage is found (scores 1 or 2)
          if (heritageData && (heritageScore === 1 || heritageScore === 2)) {
            if (heritageData.LAY_CLASS) {
              heritageText += `\n\nClass: ${heritageData.LAY_CLASS}`;
            }
            if (heritageData.H_NAME) {
              heritageText += `\nName: ${heritageData.H_NAME}`;
            }
          }
        } catch (error) {
          console.error('Error getting heritage data:', error);
          heritageText = 'Error retrieving heritage data.';
          heritageScore = 0;
        }
      }

      // Update the box color based on score
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
        x: '5%',
        y: '80%',
        w: '40%',
        h: '12%',
        fill: scoringCriteria.heritage.getScoreColor(heritageScore).replace('#', ''),
        line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
      }));

      // Add description text
      slide.addText(heritageText, convertCmValues({
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
      slide.addText(`Score: ${heritageScore}/3`, convertCmValues({
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
      slide.addText('Source: NSW Department of Planning, Housing and Infrastructure, 2024', convertCmValues({
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

      // Right map container (Acid Sulfate Soils)
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
        x: '50%',
        y: '18%',
        w: '40%',
        h: '61%',
        fill: 'FFFFFF',
        line: { color: '002664', width: 1.5 }
      }));

      // Add blue vertical bars
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
        x: '50%',
        y: '18%',
        w: '6%',
        h: '61%',
        fill: '002664'
      }));  

      // Then add the rotated text on top with correct positioning
      slide.addText('Acid Sulfate Soils', convertCmValues({
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

      // Add right map  
      console.log('Acid Sulfate Soils screenshot data:', {
        exists: !!properties.acidSulfateSoilsScreenshot,
        type: properties.acidSulfateSoilsScreenshot ? typeof properties.acidSulfateSoilsScreenshot : 'undefined',
        length: properties.acidSulfateSoilsScreenshot ? properties.acidSulfateSoilsScreenshot.length : 0
      });

      if (properties.acidSulfateSoilsScreenshot) {
        try {
          slide.addImage({
            data: properties.acidSulfateSoilsScreenshot,
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
            }

            )
          });
        } catch (error) {
          console.error('Error adding acid sulfate soils screenshot:', error);
          addErrorMessage();
        }
      } else {
        console.warn('No acid sulfate soils screenshot available');
        addErrorMessage();
      }

      function addErrorMessage() {
        slide.addText('Acid Sulfate Soils map unavailable', convertCmValues({
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

      // Calculate acid sulfate soils score
      let acidSulfateSoilsText = 'Acid sulfate soils data unavailable.';
      let acidSulfateSoilsScore = 0;

      if (properties.developableArea && properties.developableArea[0]) {
        const geometry = {
          rings: [properties.developableArea[0].geometry.coordinates[0]]
        };
        
        try {
          const soilsData = await getAcidSulfateSoilsData(geometry);
          acidSulfateSoilsScore = scoringCriteria.acidSulfateSoils.calculateScore(soilsData);
          acidSulfateSoilsText = scoringCriteria.acidSulfateSoils.getScoreDescription(acidSulfateSoilsScore, soilsData);
        } catch (error) {
          console.error('Error getting acid sulfate soils data:', error);
          acidSulfateSoilsText = 'Error retrieving acid sulfate soils data.';
          acidSulfateSoilsScore = 0;
        }
      } else if (properties.site__geometry) {
        // Fallback to site geometry if no developable area
        const geometry = {
          rings: [properties.site__geometry]
        };
        
        try {
          const soilsData = await getAcidSulfateSoilsData(geometry);
          acidSulfateSoilsScore = scoringCriteria.acidSulfateSoils.calculateScore(soilsData);
          acidSulfateSoilsText = scoringCriteria.acidSulfateSoils.getScoreDescription(acidSulfateSoilsScore, soilsData);
        } catch (error) {
          console.error('Error getting acid sulfate soils data:', error);
          acidSulfateSoilsText = 'Error retrieving acid sulfate soils data.';
          acidSulfateSoilsScore = 0;
        }
      }

      // Add description box
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
        x: '50%',
        y: '80%',
        w: '40%',
        h: '12%',
        fill: scoringCriteria.acidSulfateSoils.getScoreColor(acidSulfateSoilsScore).replace('#', ''),
        line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
      }));

      // Add description text
      slide.addText(acidSulfateSoilsText, convertCmValues({
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

      // Add score text
      slide.addText(`Score: ${acidSulfateSoilsScore}/3`, convertCmValues({
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

      // Add source text
      slide.addText('Source: NSW Department of Planning, Housing and Infrastructure, 2024', convertCmValues({
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

      // Calculate SEPP score
      const seppResult = scoringCriteria.sepp.calculateScore(properties.seppData || null);
      scores.sepp = seppResult.score;

      // Calculate biodiversity score
      const biodiversityResult = scoringCriteria.biodiversity.calculateScore(properties.biodiversityData || null);
      scores.biodiversity = biodiversityResult.score;

      // Calculate aboriginal cultural heritage score
      const aboriginalHeritageResult = scoringCriteria.aboriginalCulturalHeritage.calculateScore(properties.aboriginalHeritageData || null);
      scores.aboriginalCulturalHeritage = aboriginalHeritageResult.score;

      return { slide, scores };
    } catch (error) {
      console.error('Error generating planning slide 2:', error);
      slide.addText('Error generating planning slide 2: ' + error.message, {
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
