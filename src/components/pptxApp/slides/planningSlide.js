import { convertCmValues } from '../utils/units';
import DevelopableAreaSelector from '../DevelopableAreaSelector';
import scoringCriteria from './scoringLogic';

// Helper function to parse and combine zoning data
const parseZoning = (zoningString, developableAreaZones = []) => {
  let mainZoningDescription = 'Zoning not specified.';
  
  if (zoningString) {
    // Remove brackets and split by comma
    const zones = zoningString
      .replace(/[\[\]]/g, '')
      .split(', ')
      .map(zone => {
        const [name, area, unit, percentage] = zone.split(':');
        return {
          name,
          area: parseFloat(area.replace(/,/g, '')),
          percentage: parseInt(percentage)
        };
      });

    // Combine zones with the same name
    const combinedZones = zones.reduce((acc, zone) => {
      const existing = acc.find(z => z.name === zone.name);
      if (existing) {
        existing.area += zone.area;
        existing.percentage += zone.percentage;
      } else {
        acc.push({ ...zone });
      }
      return acc;
    }, []);

    // Sort by percentage (descending)
    combinedZones.sort((a, b) => b.percentage - a.percentage);

    // Format the description
    const zoneDescriptions = combinedZones.map(zone => 
      `${zone.name} (${Math.round(zone.area).toLocaleString()}m² | ${zone.percentage}%)`
    );

    if (zoneDescriptions.length === 1) {
      mainZoningDescription = `The site is zoned ${zoneDescriptions[0]}.`;
    } else {
      const lastZone = zoneDescriptions.pop();
      mainZoningDescription = `The site is zoned ${zoneDescriptions.join(', ')} and ${lastZone}.`;
    }
  }

  // If developable area zones are available, only return that description
  if (developableAreaZones && developableAreaZones.length > 0) {
    // Remove duplicates from developable area zones
    const uniqueZones = [...new Set(developableAreaZones)];
    
    // Return only the developable area zoning description
    return uniqueZones.length === 1
      ? `The developable area is zoned ${uniqueZones[0]}.`
      : `The developable areas are zoned ${uniqueZones.slice(0, -1).join(', ')} and ${uniqueZones[uniqueZones.length - 1]}.`;
  }

  // Only return the site zoning if no developable area zones
  return mainZoningDescription;
};

// Add new function to query zoning for developable area
const getDevelopableAreaZoning = async (geometry) => {
  console.log('Querying developable area zoning with geometry:', geometry);
  
  const url = 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/2/query';
  const params = new URLSearchParams({
    f: 'json',
    geometryType: 'esriGeometryPolygon',
    geometry: JSON.stringify(geometry),
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'SYM_CODE',
    returnGeometry: false
  });

  try {
    console.log('Sending request to:', `${url}?${params}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`${url}?${params}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    const data = await response.json();
    console.log('Received response:', data);
    
    if (data.features && data.features.length > 0) {
      const uniqueZones = [...new Set(data.features.map(f => f.attributes.SYM_CODE))];
      console.log('Found unique zones:', uniqueZones);
      return uniqueZones;
    }
    console.log('No features found in response');
    return [];
  } catch (error) {
    console.error('Error querying developable area zoning:', error);
    return [];
  }
};

// Add new function to query FSR for developable area
const getDevelopableAreaFSR = async (geometry) => {
  const url = 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/Principal_Planning_Layers/MapServer/4/query';
  const params = new URLSearchParams({
    f: 'json',
    geometryType: 'esriGeometryPolygon',
    geometry: JSON.stringify(geometry),
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'FSR',
    returnGeometry: false
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${url}?${params}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      // Return all FSR values found, not just the first one
      const fsrValues = data.features.map(f => f.attributes.FSR).filter(fsr => fsr !== null);
      return fsrValues.length > 0 ? fsrValues : null;
    }
    return null;
  } catch (error) {
    console.error('Error querying developable area FSR:', error);
    return null;
  }
};

// Add new function to query HoB for developable area
const getDevelopableAreaHoB = async (geometry) => {
  const url = 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/Principal_Planning_Layers/MapServer/7/query';
  const params = new URLSearchParams({
    f: 'json',
    geometryType: 'esriGeometryPolygon',
    geometry: JSON.stringify(geometry),
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'MAX_B_H',
    returnGeometry: false
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${url}?${params}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      // Return all HoB values found, not just the first one
      const hobValues = data.features.map(f => f.attributes.MAX_B_H).filter(hob => hob !== null);
      return hobValues.length > 0 ? hobValues : null;
    }
    return null;
  } catch (error) {
    console.error('Error querying developable area HoB:', error);
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
    x: (index) => `${5 + (index * 31)}%`,
    y: '18%',
    w: '28%',
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
  scoreContainer: {
    x: '5%',
    y: '85%',
    w: '90%',
    h: '6%',
    fill: 'FFFBF2',
    line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
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

export async function addPlanningSlide(pptx, properties) {
  // Create slide first
  const slide = pptx.addSlide({ masterName: 'NSW_MASTER' });
  
  try {
    // Get developable area data if it exists
    let developableAreaZones = [];
    let developableAreaFSRs = [];
    let developableAreaHoBs = [];
    
    if (properties.developableArea && properties.developableArea.length > 0) {
      // Process all developable areas
      const developableAreaPromises = properties.developableArea.map(async (area, index) => {
        const geometry = {
          rings: [area.geometry.coordinates[0]]
        };
        
        console.log(`Processing developable area ${index + 1}/${properties.developableArea.length}`);
        
        try {
          const [zones, fsrValues, hobValues] = await Promise.all([
            getDevelopableAreaZoning(geometry),
            getDevelopableAreaFSR(geometry),
            getDevelopableAreaHoB(geometry)
          ]);
          
          return { 
            zones, 
            fsrValues: fsrValues || [], 
            hobValues: hobValues || [] 
          };
        } catch (error) {
          console.error(`Error getting data for developable area ${index + 1}:`, error);
          return { zones: [], fsrValues: [], hobValues: [] };
        }
      });
      
      // Wait for all promises to resolve
      const developableAreaResults = await Promise.all(developableAreaPromises);
      
      // Combine results from all developable areas
      developableAreaZones = developableAreaResults.flatMap(result => result.zones);
      // Remove duplicates
      developableAreaZones = [...new Set(developableAreaZones)];
      
      // Collect all FSR and HoB values
      developableAreaFSRs = developableAreaResults.flatMap(result => result.fsrValues);
      developableAreaHoBs = developableAreaResults.flatMap(result => result.hobValues);
      
      console.log('Combined developable area data:', {
        zones: developableAreaZones,
        fsrValues: developableAreaFSRs,
        hobValues: developableAreaHoBs
      });
    }

    // Find the maximum FSR and HoB values for scoring and display
    const developableAreaFSR = developableAreaFSRs.length > 0 ? Math.max(...developableAreaFSRs) : null;
    const developableAreaHoB = developableAreaHoBs.length > 0 ? Math.max(...developableAreaHoBs) : null;

    // Add inside the try block after getting developable area data
    const planningScore = scoringCriteria.planning.calculateScore(
      developableAreaZones,
      developableAreaFSR,
      developableAreaHoB
    );

    const scoreDescription = scoringCriteria.planning.getScoreDescription(planningScore);

    // Store the score in the properties object for later use in summary slide
    properties.scores = properties.scores || {};
    properties.scores.planning = planningScore;

    // Generate zoning description after we have the developable area zones
    const zoningDescription = parseZoning(properties.site_suitability__landzone, developableAreaZones);
    console.log('Generated zoning description:', zoningDescription);
    
    // Now add all slide elements
    console.log('Starting to add slide elements...');

    // Add ONLY title (address and 'Planning')
    console.log('Adding title...');
    slide.addText([
      { text: properties.formatted_address || properties.site__address, options: { color: styles.title.color } },
      { text: ' ', options: { breakLine: true } },
      { text: 'Planning', options: { color: styles.subtitle.color } }
    ], convertCmValues(styles.title));

      // Add horizontal line under title
      console.log('Adding title line...');
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.titleLine));

      // Add sensitive text
      console.log('Adding sensitive text...');
      slide.addText("SENSITIVE: NSW GOVERNMENT", convertCmValues(styles.sensitiveText));

      // Add NSW Logo
      console.log('Adding NSW logo...');
      slide.addImage({
        path: "/images/NSW-Government-official-logo.jpg",
        ...convertCmValues(styles.nswLogo)
      });

      // Section 1 - Zoning (Left)
      console.log('Adding zoning section...');
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
        x: '5%',
        y: '18%',
        w: '28%',
        h: '56%',
        fill: 'FFFFFF',
        line: { color: '002664', width: 1 }
      }));

      // Add Zoning Title
      slide.addText('Zoning', convertCmValues({
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

      // Add zoning map
      console.log('Adding zoning map...');
      if (properties.zoningScreenshot) {
        slide.addImage({
          data: properties.zoningScreenshot,
          ...convertCmValues({
            x: '5%',
            y: '24%',
            w: '28%',
            h: '50%',
            sizing: {
              type: 'contain',
              align: 'center',
              valign: 'middle'
            }
          })
        });
      } else {
        console.warn('No zoning screenshot available');
      }

      // Add zoning text box background
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
        x: '5%',
        y: '75%',
        w: '28%',
        h: '9%',
        fill: 'FFFBF2',
        line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
      }));

      // Add zoning description
      console.log('Adding zoning description...');
      slide.addText(zoningDescription, convertCmValues({
        x: '5%',
        y: '75%',
        w: '28%',
        h: '5%',
        fontSize: 7,
        color: '363636',
        fontFace: 'Public Sans',
        align: 'left',
        valign: 'top',
        wrap: true
      }));

      // Zoning Source
      slide.addText('Source: Land Zoning NSW, DPHI, 2024', {
        x: '5%',
        y: '81%',
        w: '28%',
        h: '3%',
        fontSize: 6,
        color: '363636',
        fontFace: 'Public Sans Light',
        italic: true,
        align: 'left',
        wrap: true
      });

      // For Zoning section (left)
      slide.addShape(pptx.shapes.LINE, convertCmValues({
        x: '6%',
        y: '81%',
        w: '26%',
        h: 0,
        line: { color: '8C8C8C', width: 0.4 }
      }));

      // Section 2 - FSR (Middle)
      // Add blue boundary around map and header
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
        x: '36%',
        y: '18%',
        w: '28%',
        h: '56%',
        fill: 'FFFFFF',
        line: { color: '002664', width: 1 }
      }));

      // FSR Title
      slide.addText('Floorspace Ratio (FSR)', convertCmValues({
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

      // FSR Map
      if (properties.fsrScreenshot) {
        slide.addImage({
          data: properties.fsrScreenshot,
          ...convertCmValues({
            x: '36%',
            y: '24%',
            w: '28%',
            h: '50%',
            sizing: {
              type: 'contain',
              align: 'center',
              valign: 'middle'
            }
          })
        });
      }

      // FSR Text Box
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
        x: '36%',
        y: '75%',
        w: '28%',
        h: '9%',
        fill: 'FFFBF2',
        line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
      }));

      // Update FSR Description
      let fsrText = '';
      if (developableAreaFSRs.length > 0) {
        // If we have multiple different FSR values
        if (new Set(developableAreaFSRs).size > 1) {
          const fsrValues = [...new Set(developableAreaFSRs)].sort((a, b) => b - a); // Sort descending
          fsrText = `The developable areas have FSR values of ${fsrValues.join(', ')}:1.`;
        } else {
          fsrText = `The developable area${properties.developableArea.length > 1 ? 's have' : ' has'} a maximum FSR of ${developableAreaFSR}:1.`;
        }
      } else if (properties.site_suitability__floorspace_ratio) {
        fsrText = `The site has a maximum FSR of ${properties.site_suitability__floorspace_ratio}:1.`;
      } else {
        fsrText = 'The site has no FSR specified.';
      }
      
      slide.addText(fsrText, {
        x: '36%',
        y: '75%',
        w: '28%',
        h: '5%',
        fontSize: 7,
        color: '363636',
        fontFace: 'Public Sans',
        align: 'left',
        valign: 'top',
        wrap: true
      });

      // FSR Source
      slide.addText('Source: EPI Floor Space Ratio (n:1) NSW, DPHI, 2024', convertCmValues({
        x: '36%',
        y: '81%',
        w: '28%',
        h: '3%',
        fontSize: 6,
        color: '363636',
        fontFace: 'Public Sans Light',
        italic: true,
        align: 'left',
        wrap: true
      }));

      // For FSR section (middle)
      slide.addShape(pptx.shapes.LINE, convertCmValues({
        x: '37%',
        y: '81%',
        w: '26%',
        h: 0,
        line: { color: '8C8C8C', width: 0.4 }
      }));

  // Section 3 - HoB (Right)
  // Add blue boundary around map and header
  slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
    x: '67%',
    y: '18%',
    w: '28%',
    h: '56%',
    fill: 'FFFFFF',
    line: { color: '002664', width: 1 }
  }));

      // HoB Title
      slide.addText('Height of Building (HoB)', convertCmValues({
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

      // HoB Map
      if (properties.hobScreenshot) {
        slide.addImage({
          data: properties.hobScreenshot,
          ...convertCmValues({
            x: '67%',
            y: '24%',
            w: '28%',
            h: '50%',
            sizing: {
              type: 'contain',
              align: 'center',
              valign: 'middle'
            }
          })
        });
      }

      // HoB Text Box
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
        x: '67%',
        y: '75%',
        w: '28%',
        h: '9%',
        fill: 'FFFBF2',
        line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
      }));

    // Update HoB Description
    let hobText = '';
    if (developableAreaHoBs.length > 0) {
      // If we have multiple different HoB values
      if (new Set(developableAreaHoBs).size > 1) {
        const hobValues = [...new Set(developableAreaHoBs)].sort((a, b) => b - a); // Sort descending
        hobText = `The developable areas have HoB values of ${hobValues.join(', ')} metres.`;
      } else {
        hobText = `The developable area${properties.developableArea.length > 1 ? 's have' : ' has'} a maximum HoB of ${developableAreaHoB} metres.`;
      }
    } else if (properties.site_suitability__height_of_building) {
      hobText = `The site has a maximum HoB of ${properties.site_suitability__height_of_building} metres.`;
    } else {
      hobText = 'The site has no HoB specified.';
    }

    slide.addText(hobText, {
      x: '67%',
      y: '75%',
      w: '28%',
      h: '5%',
      fontSize: 7,
      color: '363636',
      fontFace: 'Public Sans',
      align: 'left',
      valign: 'top',
      wrap: true
    });

      // HoB Source
      slide.addText('Source: EPI Height of Building NSW, DPHI, 2024', convertCmValues({
        x: '67%',
        y: '81%',
        w: '28%',
        h: '3%',
        fontSize: 6,
        color: '363636',
        fontFace: 'Public Sans Light',
        italic: true,
        align: 'left',
        wrap: true
      }));

      // For HoB section (right)
      slide.addShape(pptx.shapes.LINE, convertCmValues({
        x: '68%',
        y: '81%',
        w: '26%',
        h: 0,
        line: { color: '8C8C8C', width: 0.4 }
      }));

      // Add score container with dynamic color based on score
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
        ...styles.scoreContainer,
        fill: scoringCriteria.planning.getScoreColor(planningScore)
      }));

      // Add score text
      slide.addText([
        { text: 'Planning Score: ', options: { bold: true } },
        { text: `${planningScore}/3`, options: { bold: true } },
        { text: ' - ' },
        { text: scoreDescription }
      ], convertCmValues(styles.scoreText));

      // Store the planning score in the properties object
      properties.scores.zoning = planningScore;

      // Add footer line
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.footerLine));

      // Update page number text to match style
      slide.addText('Property and Development NSW', convertCmValues(styles.footer));
      slide.addText('5', convertCmValues(styles.pageNumber));

    console.log('Slide generation completed successfully');
    return slide;

  } catch (error) {
    console.error('Error generating planning slide:', error);
    try {
      slide.addText('Error generating planning slide: ' + error.message, {
        x: '10%',
        y: '45%',
        w: '80%',
        h: '10%',
        fontSize: 14,
        color: 'FF0000',
        align: 'center'
      });
    } catch (finalError) {
      console.error('Failed to add error message to slide:', finalError);
    }
    return slide;
  }
}
