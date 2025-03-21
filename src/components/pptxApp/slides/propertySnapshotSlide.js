import { convertCmValues } from '../utils/units';


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
  table: {
    x: '5%',
    y: '20%',
    w: '35%',
    h: '70%',
    fontFace: 'Public Sans',
    fontSize: 8,
    color: '363636',
    border: { type: 'solid', color: '363636', pt: 0.5 },
    align: 'left'
  },
  icons: {
    property: { path: "/images/property.svg", w: 0.3, h: 0.3 },
    building: { path: "/images/building.svg", w: 0.3, h: 0.3 },
    planning: { path: "/images/planning.svg", w: 0.3, h: 0.3 }
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
  categoryIcons: {
    property: {
      x: '5.3%',
      y: '37%',
      w: 0.4,
      h: 0.4,
      sizing: { type: 'contain' }
    },
    building: {
      x: '5.3%',
      y: '64%',
      w: 0.4,
      h: 0.4,
      sizing: { type: 'contain' }
    },
    planning: {
      x: '5.3%',
      y: '85%',
      w: 0.4,
      h: 0.4,
      sizing: { type: 'contain' }
    }
  }
};

// Helper function to format zoning string
const formatZoning = (zoning) => {
  if (!zoning) return 'Not specified';
  
  // Remove square brackets
  const cleanZoning = zoning.replace(/[\[\]]/g, '');
  
  // Split by colon to separate zone and details
  const [zone, details] = cleanZoning.split(':');
  
  // Format details with proper spacing and parentheses
  const formattedDetails = details ? `: ${details.split(';').join(' (')}%)` : '';
  
  return `${zone}${formattedDetails}`;
};

export function addPropertySnapshotSlide(pptx, properties) {
  const slide = pptx.addSlide({ masterName: 'NSW_MASTER' });
  
  // Add title with line break
  slide.addText([
    { text: properties.site__address, options: { color: styles.title.color } },
    { text: ' ', options: { breakLine: true } },
    { text: 'Property Snapshot', options: { color: styles.subtitle.color } }
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

  const tableData = [
    // Headers
    [{ text: 'Category', options: { fill: '002664', color: 'FFFFFF' } }, 
     { text: 'Item', options: { fill: '002664', color: 'FFFFFF' } }, 
     { text: 'Details', options: { fill: '002664', color: 'FFFFFF' } }],
    // Property Particulars
    [{ 
      text: 'Property Particulars\n\n',
      options: { 
        rowspan: 7,
        valign: 'middle'
      }
    }, 'Address', properties.site__address],
    ['LGA', properties.site_suitability__LGA || 'Not specified'],
    ['Land Owning Agency', properties.site_suitability__NSW_government_agency ? 
      properties.site_suitability__NSW_government_agency.split(':')[0].replace(/[\[\]]/g, '') : 'Not NSW Government-owned land'],
    ['Lot/DP', properties.site__related_lot_references || 'Not specified'],
    ['Site Area', `${properties.site_suitability__area ? properties.site_suitability__area.toLocaleString() : 'Not specified'} sqm`],
    ['Site Width', `${properties.site_suitability__site_width ? properties.site_suitability__site_width.toFixed(1) : 'Not specified'} m`],
    ['Public Transport Accessibility', properties.site_suitability__public_transport_access_level_AM ? 
      properties.site_suitability__public_transport_access_level_AM.split(':')[0].replace(/[\[\]]/g, '') : 'Not specified'],
    // Current Use
    [{ 
      text: 'Current Use\n\n',
      options: { 
        rowspan: 3,
        valign: 'middle'
      }
    }, 'Site Description', { 
      text: properties.site__description || 'Please insert site description',
      options: { italic: true, color: '808080' }
    }],
    ['Current Use', { 
      text: properties.site_suitability__current_government_land_use ? 
        properties.site_suitability__current_government_land_use.split(':')[0].replace(/[\[\]]/g, '') : 
        'Please insert current use',
      options: { italic: true, color: '808080' }
    }],
    ['Restrictions', { 
      text: properties.site__restrictions || 'Please insert restrictions',
      options: { italic: true, color: '808080' }
    }],
    // Planning Controls
    [{ 
      text: 'Planning Controls\n\n',
      options: { 
        rowspan: 3,
        valign: 'middle'
      }
    }, 'Primary Zoning', formatZoning(properties.site_suitability__principal_zone_identifier)],
    ['FSR', properties.site_suitability__floorspace_ratio ? `${properties.site_suitability__floorspace_ratio}:1` : 'Not specified'],
    ['HOB', properties.site_suitability__height_of_building ? `${properties.site_suitability__height_of_building}m` : 'Not specified']
  ];

  slide.addTable(tableData, {
    ...convertCmValues(styles.table),
    colW: [0.95, 1.3, 4.1],
    border: { type: 'solid', color: '363636', pt: 0.5 },
    rowH: [
      0.27, // Header row
      0.27, 0.27, 0.27, 0.27, 0.27, 0.27, 0.27, // Property Particulars (7 rows)
      0.8, 0.8, 0.6,  // Current Use (3 rows with increased height)
      0.27, 0.27, 0.27 // Planning Controls (3 rows)
    ],
    align: 'left',
    valign: 'middle',
    fontSize: 8,
    color: '363636',
    bold: false,
    autoPage: false
  });

  // Add category icons
  slide.addImage({
    path: styles.icons.property.path,
    ...convertCmValues(styles.categoryIcons.property)
  });

  slide.addImage({
    path: styles.icons.building.path,
    ...convertCmValues(styles.categoryIcons.building)
  });

  slide.addImage({
    path: styles.icons.planning.path,
    ...convertCmValues(styles.categoryIcons.planning)
  });

  // Add aerial image if it exists
  if (properties.snapshotScreenshot) {
    console.log('[PropertySnapshotSlide] Rendering snapshot image');
    console.log('[PropertySnapshotSlide] Screenshot data length:', 
      typeof properties.snapshotScreenshot === 'string' 
        ? properties.snapshotScreenshot.length 
        : 'Not a string');

    // First add white background rectangle
    const bgRect = {
      x: '56%',
      y: '20%',
      w: '39%',
      h: '70%',
      fill: 'FFFFFF',
      line: { color: '002664', width: 1.5 }
    };
    console.log('[PropertySnapshotSlide] Background rectangle dimensions:', bgRect);
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(bgRect));

    // Then add the image with 'contain' sizing
    const imageConfig = {
      data: properties.snapshotScreenshot,
      ...convertCmValues({
        x: '56%',
        y: '20%',
        w: '39%',
        h: '70%',
        sizing: {
          type: 'contain',
          align: 'center',
          valign: 'middle'
        }
      })
    };
    console.log('[PropertySnapshotSlide] Image configuration:', {
      ...imageConfig,
      data: imageConfig.data ? 'Data present' : 'No data'
    });
    
    try {
      slide.addImage(imageConfig);
      console.log('[PropertySnapshotSlide] Image added successfully');
    } catch (error) {
      console.error('[PropertySnapshotSlide] Error adding image:', error);
      throw error;
    }
  } else {
    console.log('[PropertySnapshotSlide] No snapshot image provided');
  }

  // Add footer line and text
  slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.footerLine));
  slide.addText('Property and Development NSW', convertCmValues(styles.footer));
  slide.addText('2', convertCmValues(styles.pageNumber));

  return slide;
} 