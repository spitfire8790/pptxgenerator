import { convertCmValues } from '../utils/units';
import scoringCriteria from './scoringLogic';
import { proxyRequest } from '../utils/services/proxyService';
import { captureRoadsMap, captureUDPPrecinctMap, capturePTALMap } from '../utils/map/services/screenshot';

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
  }
};

export async function addAccessSlide(pptx, propertyData) {
  try {
    console.log('Starting to add access slide...');
    
    // Format developableArea consistently for both scoring and screenshots
    const formattedDevelopableArea = propertyData.developableArea?.length ? {
      type: 'FeatureCollection',
      features: propertyData.developableArea.map(area => ({
        type: 'Feature',
        geometry: area.geometry
      }))
    } : null;
    
    // Use the combinedGeometry if it exists (for multiple properties), otherwise create a single feature
    const featureToUse = propertyData.combinedGeometry || {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [propertyData.site__geometry]
      },
      properties: propertyData
    };

    // If we don't have valid geometry, throw an error
    if (!featureToUse) {
      throw new Error('No valid geometry data found in property data');
    }
    
    // Calculate scores and descriptions first
    const roadsScoreResult = scoringCriteria.roads.calculateScore(
      propertyData.roadFeatures, 
      propertyData.developableArea,
      propertyData.isMultipleProperties ? propertyData.allProperties : null
    );
    const roadsDescription = scoringCriteria.roads.getScoreDescription(roadsScoreResult);
    
    // Get roads map showing all features and developable areas
    const roadsScreenshot = await captureRoadsMap(
      featureToUse, 
      formattedDevelopableArea, 
      true, // Always show developable areas for roads map
      false
    );
    
    // Get UDP precincts map with LMR layers - don't show developable areas
    const udpMapFeature = featureToUse;
    const udpScreenshot = await captureUDPPrecinctMap(
      udpMapFeature, 
      formattedDevelopableArea, 
      false, // Don't show developable areas
      false
    );
    
    // Get the LMR overlap information from the updated feature after map capture
    const lmrOverlap = udpMapFeature.properties?.lmrOverlap || { 
      hasOverlap: false, 
      primaryOverlap: null,
      pixelCounts: {}
    };
    
    // Get developable area LMR overlap information
    const developableAreaLmrOverlap = udpMapFeature.properties?.developableAreaLmrOverlap || [];
    
    console.log('LMR overlap data for scoring:', lmrOverlap);
    console.log('Developable area LMR overlap for scoring:', developableAreaLmrOverlap);
    
    // Store LMR status in propertyData for use by other slides
    propertyData.isInLMRArea = lmrOverlap.hasOverlap || developableAreaLmrOverlap.some(o => o.hasOverlap);
    propertyData.lmrOverlap = lmrOverlap;  // Store full overlap data for reference
    propertyData.developableAreaLmrOverlap = developableAreaLmrOverlap;
    
    // Calculate UDP score using the enhanced scoring logic that includes LMR overlap
    const udpScoreResult = scoringCriteria.udpPrecincts.calculateScore(
      { 
        ...propertyData.udpPrecincts, 
        lmrOverlap,
        developableAreaLmrOverlap
      }, 
      propertyData.developableArea
    );
    const udpDescription = scoringCriteria.udpPrecincts.getScoreDescription(udpScoreResult);

    // Get PTAL map showing all features but not developable areas
    const ptalMapFeature = featureToUse;
    const ptalScreenshot = await capturePTALMap(
      ptalMapFeature, 
      formattedDevelopableArea, 
      false, // Don't show developable areas
      false
    );
    
    // Get PTAL values from the updated feature after map capture
    const ptalValues = ptalMapFeature.properties?.ptalValues || [];
    const featurePTALs = ptalMapFeature.properties?.featurePTALs || [];
    
    // Calculate PTAL score based on the best PTAL for different features
    const ptalScoreResult = scoringCriteria.ptal.calculateScore(ptalValues, featurePTALs);
    const ptalDescription = scoringCriteria.ptal.getScoreDescription(ptalScoreResult, ptalValues, featurePTALs);

    // Ensure scores object exists and store the scores
    if (!propertyData.scores) {
        propertyData.scores = {};
    }
    propertyData.scores.roads = roadsScoreResult.score;
    propertyData.scores.udpPrecincts = udpScoreResult.score;
    propertyData.scores.ptal = ptalScoreResult;
    
    // Create slide
    const slide = pptx.addSlide({ masterName: 'NSW_MASTER' });

    // Add title
    slide.addText([
      { text: propertyData.site__address, options: { color: styles.title.color } },
      { text: ' ', options: { breakLine: true } },
      { text: 'Access and Proximity to Strategic Centres', options: { color: styles.subtitle.color } }
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

    // Section 1 - Roads (Left)
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '5%',
      y: '18%',
      w: '28%',
      h: '56%',
      fill: 'FFFFFF',
      line: { color: '002664', width: 1 }
    }));

    // Roads Title
    slide.addText('Roads (by classification)', convertCmValues({
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

    // Add roads map
    if (roadsScreenshot) {
      slide.addImage({
        data: roadsScreenshot,
        ...convertCmValues({
          x: '5%',
          y: '24%',
          w: '28%',
          h: '50%',
          sizing: { type: 'contain', align: 'center', valign: 'middle' }
        })
      });
    }

    // Roads description box
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '5%',
      y: '75%',
      w: '28%',
      h: '12%',
      fill: scoringCriteria.roads.getScoreColor(roadsScoreResult.score).replace('#', ''),
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // Roads description text
    slide.addText(roadsDescription, convertCmValues({
      x: '5%',
      y: '75%',
      w: '28%',
      h: '8%',
      fontSize: 7,
      color: '363636',
      fontFace: 'Public Sans',
      align: 'left',
      valign: 'top',
      wrap: true
    }));

    // Roads score text
    slide.addText(`Score: ${roadsScoreResult.score}/3`, convertCmValues({
      x: '5%',
      y: '80%',
      w: '28%',
      h: '4%',
      fontSize: 7,
      color: '363636',
      fontFace: 'Public Sans',
      bold: true,
      align: 'right'
    }));

    // Roads line
    slide.addShape(pptx.shapes.LINE, convertCmValues({
      x: '6%',
      y: '83.5%',
      w: '26%',
      h: 0,
      line: { color: '8C8C8C', width: 0.4 }
    }));

    // Roads source text
    slide.addText('Source: NSW Road Segments, DPHI, 2024', convertCmValues({
      x: '5%',
      y: '83%',
      w: '28%',
      h: '3%',
      fontSize: 6,
      color: '363636',
      fontFace: 'Public Sans Light',
      italic: true,
      align: 'left',
      wrap: true
    }));

    // For Roads section (left)
    slide.addShape(pptx.shapes.LINE, convertCmValues({
      x: '6%',
      y: '86%',
      w: '26%',
      h: 0,
      line: { color: '8C8C8C', width: 0.4 }
    }));

    // Section 2 - Strategic (Middle)
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '36%',
      y: '18%',
      w: '28%',
      h: '56%',
      fill: 'FFFFFF',
      line: { color: '002664', width: 1 }
    }));

    // Strategic Title
    slide.addText('Proximity to Strategic Centre', convertCmValues({
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

    // Add UDP precincts map
    if (udpScreenshot) {
      slide.addImage({
        data: udpScreenshot,
        ...convertCmValues({
          x: '36%',
          y: '24%',
          w: '28%',
          h: '50%',
          sizing: { type: 'contain', align: 'center', valign: 'middle' }
        })
      });
    }

    // UDP Precincts description box
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '36%',
      y: '75%',
      w: '28%',
      h: '12%',
      fill: scoringCriteria.udpPrecincts.getScoreColor(udpScoreResult.score).replace('#', ''),
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // UDP Precincts description text
    slide.addText(udpDescription, convertCmValues({
      x: '36%',
      y: '75%',
      w: '28%',
      h: '8%',
      fontSize: 7,
      color: '363636',
      fontFace: 'Public Sans',
      align: 'left',
      valign: 'top',
      wrap: true
    }));

    // UDP Precincts score text
    slide.addText(`Score: ${udpScoreResult.score}/3`, convertCmValues({
      x: '36%',
      y: '80%',
      w: '28%',
      h: '4%',
      fontSize: 7,
      color: '363636',
      fontFace: 'Public Sans',
      bold: true,
      align: 'right'
    }));

    // UDP Precincts line
    slide.addShape(pptx.shapes.LINE, convertCmValues({
      x: '37%',
      y: '83.5%',
      w: '26%',
      h: 0,
      line: { color: '8C8C8C', width: 0.4 }
    }));

    // UDP Precincts source text
    slide.addText('Source: Urban Development Program, DPHI, 2024', convertCmValues({
      x: '36%',
      y: '83%',
      w: '28%',
      h: '3%',
      fontSize: 6,
      color: '363636',
      fontFace: 'Public Sans Light',
      italic: true,
      align: 'left',
      wrap: true
    }));

    // For UDP Precincts section (middle)
    slide.addShape(pptx.shapes.LINE, convertCmValues({
      x: '37%',
      y: '86%',
      w: '26%',
      h: 0,
      line: { color: '8C8C8C', width: 0.4 }
    }));

    // Section 3 - PTAL (Right)
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '67%',
      y: '18%',
      w: '28%',
      h: '56%',
      fill: 'FFFFFF',
      line: { color: '002664', width: 1 }
    }));

    // PTAL Title
    slide.addText('Public Transport Access Level (PTAL)', convertCmValues({
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

    // Add PTAL map
    if (ptalScreenshot) {
      slide.addImage({
        data: ptalScreenshot,
        ...convertCmValues({
          x: '67%',
          y: '24%',
          w: '28%',
          h: '50%',
          sizing: { type: 'contain', align: 'center', valign: 'middle' }
        })
      });

      // Add PTAL legend background
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
        x: '87%',
        y: '64%',
        w: '7%',
        h: '10%',
        fill: 'FFFFFF',
        line: { color: '363636', width: 0.5 }
      }));

      // Add PTAL legend items
      const ptalLegendItems = [
        { label: 'Very High', color: '1d9604' },
        { label: 'High', color: 'a8ff7f' },
        { label: 'Medium-High', color: '0e9aff' },
        { label: 'Medium', color: 'f2ff00' },
        { label: 'Low-Medium', color: 'ff7f0e' },
        { label: 'Low', color: 'ff0000' }
      ];

      ptalLegendItems.forEach((item, index) => {
        // Add colored square
        slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
          x: '87.5%',
          y: `${64.5 + (index * 1.5)}%`,
          w: '0.56%',
          h: '1%',
          fill: item.color,
          line: { color: '363636', width: 0.5 }
        }));

        // Add label
        slide.addText(item.label, convertCmValues({
          x: '88%',
          y: `${64.5 + (index * 1.5)}%`,
          w: '6.5%',
          h: '1%',
          fontSize: 4,
          color: '363636',
          fontFace: 'Public Sans',
          align: 'left',
          valign: 'middle'
        }));
      });
    }

    // PTAL description box
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '67%',
      y: '75%',
      w: '28%',
      h: '12%',
      fill: scoringCriteria.ptal.getScoreColor(ptalScoreResult).replace('#', ''),
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // PTAL description text
    slide.addText(ptalDescription, convertCmValues({
      x: '67%',
      y: '75%',
      w: '28%',
      h: '8%',
      fontSize: 7,
      color: '363636',
      fontFace: 'Public Sans',
      align: 'left',
      valign: 'top',
      wrap: true
    }));

    // PTAL score text
    slide.addText(`Score: ${ptalScoreResult}/3`, convertCmValues({
      x: '67%',
      y: '80%',
      w: '28%',
      h: '4%',
      fontSize: 7,
      color: '363636',
      fontFace: 'Public Sans',
      bold: true,
      align: 'right'
    }));

    // PTAL line
    slide.addShape(pptx.shapes.LINE, convertCmValues({
      x: '68%',
      y: '83.5%',
      w: '26%',
      h: 0,
      line: { color: '8C8C8C', width: 0.4 }
    }));

    // PTAL source text
    slide.addText('Source: Transport for NSW, 2024', convertCmValues({
      x: '67%',
      y: '83%',
      w: '28%',
      h: '3%',
      fontSize: 6,
      color: '363636',
      fontFace: 'Public Sans Light',
      italic: true,
      align: 'left',
      wrap: true
    }));

    // For PTAL section (right)
    slide.addShape(pptx.shapes.LINE, convertCmValues({
      x: '68%',
      y: '86%',
      w: '26%',
      h: 0,
      line: { color: '8C8C8C', width: 0.4 }
    }));

    // Add footer line
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.footerLine));

    // Add footer text and page number
    slide.addText('Property and Development NSW', convertCmValues(styles.footer));
    slide.addText('9', convertCmValues(styles.pageNumber));

    return slide;
  } catch (error) {
    console.error('Error adding access slide:', error);
    try {
      const errorSlide = pptx.addSlide({ masterName: 'NSW_MASTER' });
      errorSlide.addText('Error generating access slide: ' + error.message, {
        x: '10%',
        y: '45%',
        w: '80%',
        h: '10%',
        fontSize: 14,
        color: 'FF0000',
        align: 'center'
      });
      return errorSlide;
    } catch (slideError) {
      console.error('Failed to add error message to slide:', slideError);
      throw error; // Re-throw the original error
    }
  }
}
