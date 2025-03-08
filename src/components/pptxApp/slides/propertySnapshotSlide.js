import { convertCmValues } from '../utils/units';
import * as turf from '@turf/turf';
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
      y: '39%',
      w: 0.4,
      h: 0.4,
      sizing: { type: 'contain' }
    },
    building: {
      x: '5.3%',
      y: '66%',
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

// Helper function to format Lot/DP with spaces after commas
const formatLotDP = (lotDP) => {
  if (!lotDP) return 'Not specified';
  return lotDP.replace(/,/g, ', ');
};

// Helper function to get unique values from an array of properties for a given key
const getUniqueValues = (properties, key, formatter = null) => {
  if (!properties || properties.length === 0 || !key) return 'Not specified';
  
  // Extract values, handling the case where the value might be in copiedFrom
  const values = properties
    .map(prop => {
      const value = prop.copiedFrom?.[key] || prop[key];
      return formatter ? formatter(value) : value;
    })
    .filter(val => val && val !== 'Not specified' && val !== 'Unknown' && val !== 'N/A');
  
  // Return unique values
  const uniqueValues = [...new Set(values)];
  
  if (uniqueValues.length === 0) return 'Not specified';
  if (uniqueValues.length === 1) return uniqueValues[0];
  
  return uniqueValues.join(', ');
};

// Helper function to format string values with labels (A, B, C...)
const formatStringValuesWithLabels = (properties, key, formatter = null) => {
  if (!properties || properties.length === 0 || !key) return 'Not specified';
  
  // Extract values
  const values = properties
    .map((prop, index) => {
      const value = prop.copiedFrom?.[key] || prop[key];
      if (!value) return null;
      
      // Format the value if a formatter function is provided
      const formattedValue = formatter ? formatter(value) : value;
      
      // Use letters as labels (A, B, C...)
      const label = String.fromCharCode(65 + index); // A=65, B=66, etc.
      return { label, formattedValue };
    })
    .filter(item => item !== null);
  
  if (values.length === 0) return 'Not specified';
  
  // If there's only one property, don't use labels
  if (values.length === 1) {
    return values[0].formattedValue;
  }
  
  // Format each value with label
  return values.map(item => `${item.label}: ${item.formattedValue}`).join(', ');
};

// Helper function to format numerical values with labels (A, B, C...) and optional bold total
const formatNumericalValuesWithLabels = (properties, key, unit = '', formatFn = null, showTotal = false) => {
  if (!properties || properties.length === 0 || !key) return 'Not specified';
  
  // Extract numerical values
  const values = properties
    .map((prop, index) => {
      const value = prop.copiedFrom?.[key] || prop[key];
      const numValue = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(numValue)) return null;
      
      // Format the value if a formatter function is provided
      const formattedValue = formatFn ? formatFn(numValue) : numValue.toLocaleString();
      
      // Use letters as labels (A, B, C...)
      const label = String.fromCharCode(65 + index); // A=65, B=66, etc.
      return { label, value: numValue, formattedValue };
    })
    .filter(item => item !== null);
  
  if (values.length === 0) return 'Not specified';
  
  // If there's only one property, don't use labels
  if (values.length === 1) {
    return `${values[0].formattedValue}${unit}`;
  }
  
  // Format each value with label
  const formattedValues = values.map(item => `${item.label}: ${item.formattedValue}${unit}`).join(', ');
  
  // Add total only if requested (for Site Area)
  if (showTotal) {
    // Calculate total for numerical values
    const total = values.reduce((sum, item) => sum + item.value, 0);
    const formattedTotal = formatFn ? formatFn(total) : total.toLocaleString();
    return `${formattedValues}, Total: ${formattedTotal}${unit}`;
  }
  
  return formattedValues;
};

// Format area values with labels (wrapper for backward compatibility)
const formatAreaWithLabels = (properties, key) => {
  return formatNumericalValuesWithLabels(properties, key, ' sqm', null, true);
};

// Helper function to aggregate numerical values
const aggregateNumericalValues = (properties, key, formatFn = null) => {
  if (!properties || properties.length === 0 || !key) return 'Not specified';
  
  // Extract numerical values
  const values = properties
    .map(prop => {
      const value = prop.copiedFrom?.[key] || prop[key];
      return typeof value === 'number' ? value : parseFloat(value);
    })
    .filter(val => !isNaN(val));
  
  if (values.length === 0) return 'Not specified';
  if (values.length === 1) return formatFn ? formatFn(values[0]) : values[0].toString();
  
  // Calculate total
  const total = values.reduce((sum, val) => sum + val, 0);
  
  // Format the total
  return formatFn ? formatFn(total) : `${total.toLocaleString()} (total)`;
};

export function addPropertySnapshotSlide(pptx, properties) {
  const slide = pptx.addSlide({ masterName: 'NSW_MASTER' });
  
  // Determine if we're dealing with multiple properties
  const isMultipleProperties = properties.isMultipleProperties || 
                              (properties.site__multiple_addresses && 
                              Array.isArray(properties.site__multiple_addresses) && 
                              properties.site__multiple_addresses.length > 1);
  
  // Use the pre-formatted address if available, otherwise fall back to the old logic
  const addressText = properties.formatted_address || 
                      (isMultipleProperties 
                        ? formatAddresses(properties.site__multiple_addresses)
                        : properties.site__address);
  
  // Prepare an array of all property data for multi-property scenarios
  let allProperties = [];
  if (isMultipleProperties && properties.allProperties) {
    allProperties = properties.allProperties;
  } else {
    allProperties = [properties];
  }
  
  // Add title with line break
  slide.addText([
    { text: addressText, options: { color: styles.title.color } },
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

  // Get values for table based on whether we have multiple properties
  const lgaValue = isMultipleProperties 
    ? getUniqueValues(allProperties, 'site_suitability__LGA')
    : properties.site_suitability__LGA || 'Not specified';
    
  const electorateValue = isMultipleProperties
    ? getUniqueValues(allProperties, 'site_suitability__electorate') 
    : properties.site_suitability__electorate || 'Not specified';
    
  const landOwningAgencyValue = isMultipleProperties
    ? getUniqueValues(allProperties, 'site_suitability__NSW_government_agency', 
        val => val ? val.split(':')[0].replace(/[\[\]]/g, '') : 'N/A')
    : properties.site_suitability__NSW_government_agency 
      ? properties.site_suitability__NSW_government_agency.split(':')[0].replace(/[\[\]]/g, '') 
      : 'N/A';
      
  // Use the new formatStringValuesWithLabels function for Lot/DP when multiple properties
  const lotDpValue = isMultipleProperties && allProperties.length > 1
    ? formatStringValuesWithLabels(allProperties, 'site__related_lot_references', formatLotDP)
    : formatLotDP(properties.site__related_lot_references) || 'Not specified';
    
  // Use the appropriate formatting function based on whether we have multiple properties
  // Only show total for Site Area
  const areaValue = isMultipleProperties && allProperties.length > 1
    ? formatAreaWithLabels(allProperties, 'site_suitability__area')
    : `${properties.site_suitability__area ? properties.site_suitability__area.toLocaleString() : 'Not specified'} sqm`;
    
  // Format site width with labels if multiple properties, but no total
  const siteWidthValue = isMultipleProperties && allProperties.length > 1
    ? formatNumericalValuesWithLabels(allProperties, 'site_suitability__site_width', ' m', 
        val => parseFloat(val).toFixed(1), false)
    : `${properties.site_suitability__site_width ? properties.site_suitability__site_width.toFixed(1) : 'Not specified'} m`;
    
  const ptalValue = isMultipleProperties
    ? getUniqueValues(allProperties, 'site_suitability__public_transport_access_level_AM',
        val => val ? val.split(':')[0].replace(/[\[\]]/g, '') : 'Not specified')
    : properties.site_suitability__public_transport_access_level_AM 
      ? properties.site_suitability__public_transport_access_level_AM.split(':')[0].replace(/[\[\]]/g, '') 
      : 'Not specified';
      
  const zoningValue = isMultipleProperties
    ? getUniqueValues(allProperties, 'site_suitability__principal_zone_identifier', formatZoning)
    : formatZoning(properties.site_suitability__principal_zone_identifier);
    
  // Format FSR with labels if multiple properties, but no total
  const fsrValue = isMultipleProperties && allProperties.length > 1
    ? formatNumericalValuesWithLabels(allProperties, 'site_suitability__floorspace_ratio', ':1', null, false)
    : properties.site_suitability__floorspace_ratio ? `${properties.site_suitability__floorspace_ratio}:1` : 'Not specified';
    
  // Format HOB with labels if multiple properties, but no total
  const hobValue = isMultipleProperties && allProperties.length > 1
    ? formatNumericalValuesWithLabels(allProperties, 'site_suitability__height_of_building', 'm', null, false)
    : properties.site_suitability__height_of_building ? `${properties.site_suitability__height_of_building}m` : 'Not specified';

  // Build table data with unique/aggregated values
  const tableData = [
    // Headers
    [{ text: 'Category', options: { fill: '002664', color: 'FFFFFF' } }, 
     { text: 'Item', options: { fill: '002664', color: 'FFFFFF' } }, 
     { text: 'Details', options: { fill: '002664', color: 'FFFFFF' } }],
    // Property Particulars
    [{ 
      text: 'Property Particulars\n\n',
      options: { 
        rowspan: 8,
        valign: 'middle'
      }
    }, 'Address', addressText],
    ['LGA', lgaValue],
    ['Electorate', electorateValue],
    ['Land Owning Agency', landOwningAgencyValue],
    ['Lot/DP', lotDpValue],
    ['Site Area', areaValue],
    ['Site Width', siteWidthValue],
    ['Public Transport Accessibility', ptalValue],
    // Current Use
    [{ 
      text: 'Current Use\n\n',
      options: { 
        rowspan: 3,
        valign: 'middle'
      }
    }, 'Site Description', { 
      text: properties.site__description || 'Please insert site description',
      options: { italic: true, color: 'FF0000' }
    }],
    ['Current Use', { 
      text: properties.site_suitability__current_government_land_use ? 
        properties.site_suitability__current_government_land_use.split(':')[0].replace(/[\[\]]/g, '') : 
        'Please insert current use',
      options: { italic: true, color: 'FF0000' }
    }],
    ['Restrictions', { 
      text: properties.site__restrictions || 'Please insert restrictions',
      options: { italic: true, color: 'FF0000' }
    }],
    // Planning Controls
    [{ 
      text: 'Planning Controls\n\n',
      options: { 
        rowspan: 3,
        valign: 'middle'
      }
    }, 'Primary Zoning', zoningValue],
    ['FSR', fsrValue],
    ['HOB', hobValue]
  ];

  slide.addTable(tableData, {
    ...convertCmValues(styles.table),
    colW: [0.95, 1.3, 4.1],
    border: { type: 'solid', color: '363636', pt: 0.5 },
    rowH: [
      0.27, // Header row
      0.27, 0.27, 0.27, 0.27, 0.27, 0.27, 0.27, 0.27, // Property Particulars (8 rows)
      0.7, 0.7, 0.6,  // Current Use (3 rows with increased height)
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