import { convertCmValues } from '../utils/units';
import scoringCriteria from './scoringLogic';
import { captureGPRMap, captureServicesAndAmenitiesMap } from '../utils/map/services/screenshots/contextScreenshot';

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

export async function addContextSlide(pptx, properties) {
  const slide = pptx.addSlide({ masterName: 'NSW_MASTER' });

  try {
    // Add title
    slide.addText([
      { text: properties.site__address, options: { color: styles.title.color } },
      { text: ' ', options: { breakLine: true } },
      { text: 'Site Context', options: { color: styles.subtitle.color } }
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
    slide.addText('13', convertCmValues(styles.pageNumber));

    // Add left map container (Government Property Register)
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
    slide.addText('Government Property Register', convertCmValues({
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

   // Capture GPR map and features
   const gprResult = await captureGPRMap(properties.site__geometry, properties.developableArea);
   console.log('GPR capture result:', {
    hasImage: !!gprResult?.image,
    featureCount: gprResult?.features?.length || 0,
    imageLength: gprResult?.image?.length || 0,
    imageType: typeof gprResult?.image
   });

   if (gprResult?.image) {
     try {
       console.log('Adding GPR image to slide with dimensions:', {
         x: '11%',
         y: '18%',
         w: '34%',
         h: '61%'
       });
       
       // Ensure the image data is properly formatted
       const imageData = gprResult.image.startsWith('data:') 
         ? gprResult.image 
         : `data:image/png;base64,${gprResult.image}`;

       slide.addImage({
        data: imageData,
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
      console.log('Successfully added GPR map image to slide');    
    } catch (error) {
      console.error('Error adding GPR screenshot to slide:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      // Add error message to slide
      slide.addText('Error rendering GPR map: ' + error.message, convertCmValues({
        x: '11%',
        y: '18%',
        w: '34%',
        h: '61%',
        fontSize: 12,
        color: 'FF0000',
        align: 'center',
        valign: 'middle'
      }));
    }
  } else {
     console.warn('No GPR screenshot available');
     // Add placeholder or error message
     slide.addText('GPR map unavailable', convertCmValues({
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

  // Add description text
  const generateGPRDescription = (gprResult) => {
    if (!gprResult?.features?.length) {
      return 'No Government Property Register data available for this area.';
    }

    // Filter out the current property if it exists in the features
    const nearbyProperties = gprResult.features.filter(feature => 
      feature.properties?.PROPERTY_NAME?.toLowerCase() !== properties.site__address?.toLowerCase()
    );

    if (!nearbyProperties.length) {
      return 'No other government properties found in the immediate vicinity.';
    }

    // Group properties by agency
    const agencyGroups = nearbyProperties.reduce((acc, feature) => {
      const agency = feature.properties.AGENCY_NAME;
      if (!acc[agency]) {
        acc[agency] = [];
      }
      acc[agency].push(feature);
      return acc;
    }, {});

    // Create summary text
    const summaryParts = [];
    for (const [agency, properties] of Object.entries(agencyGroups)) {
      const propertyCount = properties.length;
      
      // Count occurrences of each property name
      const propertyNameCounts = properties
        .map(p => p.properties.PROPERTY_NAME)
        .filter(Boolean)
        .reduce((acc, name) => {
          acc[name] = (acc[name] || 0) + 1;
          return acc;
        }, {});

      // Format property names with counts
      const formattedPropertyNames = Object.entries(propertyNameCounts)
        .map(([name, count]) => count > 1 ? `${name} (${count})` : name)
        .join(', ');
      
      summaryParts.push(
        `${agency} (${propertyCount} ${propertyCount === 1 ? 'property' : 'properties'})` +
        (formattedPropertyNames ? ` - ${formattedPropertyNames}` : '')
      );
    }

    return 'Nearby Government Properties:\n' + summaryParts.join('\n');
  };

  // Add GPR description box with dashed outline
  slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
    x: '5%',
    y: '80%',
    w: '40%',
    h: '12%',
    fill: 'FFFBF2',
    line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
  }));

  slide.addText(generateGPRDescription(gprResult), convertCmValues({
    x: '5%',
    y: '80%',
    w: '40%',
    h: '8%',
    fontSize: 6,
    color: '363636',
    fontFace: 'Public Sans',
    align: 'left',
    valign: 'top',
    wrap: true
  }));

  // Right side - Services and Amenities
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
  slide.addText('Services and Amenities', convertCmValues({
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

  // Add services and amenities map
  const servicesResult = await captureServicesAndAmenitiesMap(properties.site__geometry, properties.developableArea);
  if (servicesResult?.image) {
    try {
      // Add the image with correct dimensions
      slide.addImage({
        data: servicesResult.image,
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

    } catch (error) {
      console.error('Error adding services and amenities map:', error);
      addServicesErrorMessage();
    }
  } else {
    console.warn('No services and amenities map available');
    addServicesErrorMessage();
  }

  function addServicesErrorMessage() {
    slide.addText('Services and amenities map unavailable', convertCmValues({
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

  // Add description box for services and amenities
  slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
    x: '50%',
    y: '80%',
    w: '40%',
    h: '12%',
    fill: 'E2EFD9',  // Light green background
    line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
  }));

  // Add description text for services
  const servicesText = servicesResult?.servicesData 
    ? `Nearby Services:\n${servicesResult.servicesData}`
    : 'Please update with details about nearby services and amenities including:\n- Public transport\n- Schools and education\n- Shopping centers\n- Medical facilities\n- Parks and recreation';

  slide.addText(servicesText, convertCmValues({
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

  // Add line
  slide.addShape(pptx.shapes.LINE, convertCmValues({
    x: '51%',
    y: '88.5%',
    w: '34%',
    h: 0,
    line: { color: '8C8C8C', width: 0.4 }
  }));

  // Add source text at bottom
  slide.addText('Source: NSW Planning Portal', convertCmValues({
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

    return slide;
  } catch (error) {
    console.error('Error generating context slide:', error);
    slide.addText('Error generating context slide: ' + error.message, {
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