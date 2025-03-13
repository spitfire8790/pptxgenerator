import { convertCmValues } from '../utils/units';
import scoringCriteria from './scoringLogic';
import { proxyRequest } from '../utils/services/proxyService';
import { captureRoadsMap, captureUDPPrecinctMap, capturePTALMap } from '../utils/map/services/screenshot';
import { formatAddresses } from '../utils/addressFormatting';

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

function ensureCorrectCRS(geometry) {
  // Here we're checking if coordinates appear to be in the wrong CRS
  // Basic check: If coordinates are outside reasonable GDA94 bounds for Australia
  if (!geometry || !geometry.coordinates) return geometry;
  
  // Check first coordinate of first ring (for polygons)
  if (geometry.type === 'Polygon' && geometry.coordinates[0]?.[0]) {
    const [lon, lat] = geometry.coordinates[0][0];
    // If coordinates look like they're already in Web Mercator or another projected system
    if (Math.abs(lon) > 180 || Math.abs(lat) > 90) {
      console.warn('Detected potential CRS issue in developable area geometry - skipping this geometry');
      return null; // Skip this geometry as it's likely in the wrong CRS
    }
  }
  
  return geometry;
}

export async function addAccessSlide(pptx, propertyData) {
  try {
    console.log('Starting to add access slide...');
    
    // Format developableArea consistently for both scoring and screenshots
    const formattedDevelopableArea = propertyData.developableArea?.length ? {
      type: 'FeatureCollection',
      features: propertyData.developableArea
        .map(area => {
          const validGeometry = ensureCorrectCRS(area.geometry);
          return validGeometry ? {
            type: 'Feature',
            geometry: validGeometry
          } : null;
        })
        .filter(Boolean) // Remove null entries
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
    
    // Create an object to store all screenshots
    const screenshots = {};
    
    // Run all map operations in parallel
    console.log('Generating access maps in parallel...');
    
    // First get the roads map and features
    const roadsResult = await captureRoadsMap(
      featureToUse, 
      formattedDevelopableArea, 
      true, // Always show developable areas for roads map
      false, // Don't use developable area for bounds
      true   // Show feature boundaries
    );

    // Store the road features in propertyData
    if (roadsResult?.roadFeatures) {
      console.log('Road features extracted from map:', roadsResult.roadFeatures);
      propertyData.roadFeatures = roadsResult.roadFeatures;
    } else {
      console.warn('No road features found in roadsResult:', roadsResult);
      // Try to get road features from the feature properties if available
      if (featureToUse.properties?.roadFeatures) {
        console.log('Using road features from feature properties');
        propertyData.roadFeatures = featureToUse.properties.roadFeatures;
      } else {
        console.warn('No road features found in feature properties either');
        propertyData.roadFeatures = []; // Initialize with empty array to avoid undefined
      }
    }

    // Log the road features before scoring
    console.log('Road features before scoring:', propertyData.roadFeatures);

    // Now calculate the roads score with the loaded features
    const roadsScoreResult = scoringCriteria.roads.calculateScore(
      propertyData.roadFeatures, 
      propertyData.developableArea,
      propertyData.isMultipleProperties ? propertyData.allProperties : null
    );
    const roadsDescription = scoringCriteria.roads.getScoreDescription(roadsScoreResult);

    // Get the remaining maps in parallel
    const [udpScreenshot, ptalScreenshot] = await Promise.all([
      // Get UDP precincts map with LMR layers
      captureUDPPrecinctMap(
        featureToUse, 
        formattedDevelopableArea, 
        true, // Show developable areas
        false, // Don't use developable area for bounds
        true   // Show feature boundaries
      ),
      
      // Get PTAL map
      capturePTALMap(
        featureToUse, 
        formattedDevelopableArea, 
        true, // Show developable areas 
        false, // Don't use developable area for bounds
        true   // Show feature boundaries
      )
    ]);
    
    // Store the map screenshots
    screenshots.roadsScreenshot = roadsResult?.dataURL;
    screenshots.udpScreenshot = udpScreenshot?.dataURL || udpScreenshot;
    screenshots.ptalScreenshot = ptalScreenshot?.dataURL || ptalScreenshot;
    
    // Store UDP features data for scoring
    if (udpScreenshot?.udpFeatures) {
      propertyData.udpFeatures = udpScreenshot.udpFeatures;
      
      // If we have LMR overlap data from UDP map, update property data
      if (featureToUse.properties?.lmrOverlap) {
        propertyData.lmrOverlap = featureToUse.properties.lmrOverlap;
      }
    }
    
    // Calculate strategic centre score with town centre buffer data if available
    const strategicCentreScore = scoringCriteria.strategicCentre.calculateScore(propertyData);
    const strategicCentreDescription = scoringCriteria.strategicCentre.getScoreDescription(strategicCentreScore);
    
    // Ensure we have valid image data for each map
    const roadsImageData = roadsResult?.dataURL || roadsResult;
    const udpImageData = udpScreenshot?.dataURL || udpScreenshot;
    const ptalImageData = ptalScreenshot?.dataURL || ptalScreenshot;
    
    // Log image data types for debugging
    console.log('Roads image data type:', typeof roadsImageData);
    console.log('UDP image data type:', typeof udpImageData);
    console.log('PTAL image data type:', typeof ptalImageData);
    
    // Get the LMR overlap information from the updated feature after map capture
    const lmrOverlap = featureToUse.properties?.lmrOverlap || { 
      hasOverlap: false, 
      primaryOverlap: null
    };
    
    // Get developable area LMR overlap information
    const developableAreaLmrOverlap = featureToUse.properties?.developableAreaLmrOverlap || [];
    
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

    // Ensure UDP description is properly formatted and reflects actual status
    if (udpDescription.includes("Undefined") || !udpDescription.trim()) {
      const formattedDistance = udpScoreResult.minDistance >= 1000 
        ? `${(udpScoreResult.minDistance / 1000).toFixed(1)} kilometres` 
        : `${Math.round(udpScoreResult.minDistance)} metres`;
      
      if (udpScoreResult.score === 1) {
        udpScoreResult.description = `All developable areas are greater than 1.6 kilometres from a UDP precinct.`;
      } else if (udpScoreResult.lmrOverlap?.hasOverlap) {
        udpScoreResult.description = `The site is in proximity to a ${udpScoreResult.lmrOverlap.primaryOverlap || 'strategic center'}.`;
      } else {
        udpScoreResult.description = `The closest developable area is within ${formattedDistance} of a strategic center.`;
      }
    }

    // Get PTAL values from the updated feature after map capture
    const ptalValues = featureToUse.properties?.ptalValues || [];
    const featurePTALs = featureToUse.properties?.featurePTALs || [];
    
    console.log('PTAL values for scoring:', ptalValues);
    console.log('Feature PTALs for scoring:', featurePTALs);
    
    // Calculate PTAL score based on the best PTAL for different features
    const ptalScoreResult = scoringCriteria.ptal.calculateScore(ptalValues, featurePTALs);
    const ptalDescription = scoringCriteria.ptal.getScoreDescription(ptalScoreResult, ptalValues, featurePTALs);

    console.log('PTAL score result:', ptalScoreResult);
    console.log('PTAL description:', ptalDescription);

    // Ensure scores object exists and store the scores
    if (!propertyData.scores) {
        propertyData.scores = {};
    }
    propertyData.scores.roads = roadsScoreResult.score;
    propertyData.scores.udpPrecincts = udpScoreResult.score;
    propertyData.scores.ptal = ptalScoreResult;
    
    // Create slide
    const slide = pptx.addSlide({ masterName: 'NSW_MASTER' });

    // Determine if we're dealing with multiple properties
    const isMultipleProperties = propertyData.isMultipleProperties || 
                               (propertyData.site__multiple_addresses && 
                               Array.isArray(propertyData.site__multiple_addresses) && 
                               propertyData.site__multiple_addresses.length > 1);
    
    // Use the pre-formatted address if available, otherwise fall back to the old logic
    const addressText = propertyData.formatted_address || 
                      (isMultipleProperties 
                        ? formatAddresses(propertyData.site__multiple_addresses)
                        : propertyData.site__address);

    // Add title
    slide.addText([
      { text: addressText, options: { color: styles.title.color } },
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
    if (roadsImageData) {
      slide.addImage({
        data: roadsImageData,
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
    if (udpImageData) {
      slide.addImage({
        data: udpImageData,
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
      fill: scoringCriteria.udpPrecincts.getScoreColor(3).replace('#', ''),
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // UDP Precincts description text
    slide.addText("Please update commentary and score based on screenshot.", convertCmValues({
      x: '36%',
      y: '75%',
      w: '28%',
      h: '8%',
      fontSize: 7,
      color: 'FF0000',  // Red color
      fontFace: 'Public Sans',
      align: 'left',
      valign: 'top',
      wrap: true,
      italic: true  // Italics
    }));

    // UDP Precincts score text - hardcoded to 3/3 as placeholder 
    slide.addText(`Score: 3/3`, convertCmValues({
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
    slide.addText('Source: Department of Planning, Housing and Infrastructure, 2025', convertCmValues({
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
    if (ptalImageData) {
      slide.addImage({
        data: ptalImageData,
        ...convertCmValues({
          x: '67%',
          y: '24%',
          w: '28%',
          h: '50%',
          sizing: { type: 'contain', align: 'center', valign: 'middle' }
        })
      });
      
      // Legend removed as it's already captured in the screenshot
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
