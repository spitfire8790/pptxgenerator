import { convertCmValues } from '../utils/units';
import { captureDevelopmentApplicationsMap, captureConstructionCertificatesMap } from '../utils/map/services/screenshots/developmentScreenshot';

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
    color: '363636'
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
    fontSize: 13,
    color: '002664',
    fontFace: 'Public Sans',
    align: 'left'
  }
};

export async function addDevelopmentSlide(pptx, properties) {
  try {
    console.log('Creating development slide...');
    const slide = pptx.addSlide({ masterName: 'NSW_MASTER' });

    // Prepare feature data for screenshots
    // Use the combinedGeometry if it exists (for multiple properties), otherwise create a single feature
    const featureToUse = properties.combinedGeometry || {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [properties.site__geometry]
      },
      properties: properties
    };

    // If we have a FeatureCollection, make sure each feature has the necessary properties
    if (featureToUse.type === 'FeatureCollection' && featureToUse.features) {
      featureToUse.features.forEach(feature => {
        if (!feature.properties) {
          feature.properties = {};
        }
        // Ensure each feature has the LGA property
        if (!feature.properties.site_suitability__LGA && properties.site_suitability__LGA) {
          feature.properties.site_suitability__LGA = properties.site_suitability__LGA;
        }
      });
    }

    // Also add the LGA directly to the feature for fallback
    if (properties.site_suitability__LGA) {
      featureToUse.site_suitability__LGA = properties.site_suitability__LGA;
    }

    // Format developableArea consistently for screenshots
    const formattedDevelopableArea = properties.developableArea?.length ? {
      type: 'FeatureCollection',
      features: properties.developableArea.map(area => ({
        type: 'Feature',
        geometry: area.geometry
      }))
    } : null;

    // Capture both screenshots
    const daMapResult = await captureDevelopmentApplicationsMap(
      featureToUse,
      formattedDevelopableArea,
      true, // Show developable area
      false // Don't use developable area for bounds
    );

    const ccMapResult = await captureConstructionCertificatesMap(
      featureToUse,
      formattedDevelopableArea
    );

    // Store construction certificates data in properties for use in feasibility slide
    if (ccMapResult) {
      properties.constructionCertificates = ccMapResult.typeStats.map(stat => ({
        Cost: stat.medianCostPerDwelling * stat.count, // Total cost
        GFA: stat.medianGFAPerDwelling * stat.count // Total GFA
      }));
    }

    // Add title
    slide.addText([
      { text: properties.site__address, options: { color: styles.title.color } },
      { text: ' ', options: { breakLine: true } },
      { text: 'Development', options: { color: styles.subtitle.color } }
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

    // Left section - Development Applications
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '5%',
      y: '18%',
      w: '40%',
      h: '61%',
      fill: 'FFFFFF',
      line: { color: '002664', width: 1.5 }
    }));

    // Add blue vertical bar for left side
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '5%',
      y: '18%',
      w: '6%',
      h: '61%',
      fill: '002664'
    }));

    // Add rotated text for left side
    slide.addText('Development Applications', convertCmValues({
      x: '-22.5%',
      y: '45%',
      w: '61%',
      h: '6%',
      color: 'FFFFFF',
      fontSize: 14,
      fontFace: 'Public Sans',
      align: 'center',
      valign: 'middle',
      rotate: 270
    }));

    // Add Development Applications Map
    if (daMapResult?.image) {
      slide.addImage({
        data: daMapResult.image,
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
    }

    // Development Applications Content Box
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '5%',
      y: '80%',
      w: '40%',
      h: '12%',
      fill: 'FFFBF2',
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // Development Applications Text
    const daText = daMapResult?.daFeatures?.length > 0 
      ? (() => {
          // Sort DAs by lodgement date in descending order
          const sortedDAs = [...daMapResult.daFeatures].sort((a, b) => 
            new Date(b.LodgementDate) - new Date(a.LodgementDate)
          );
          
          // If there's only one DA, use the existing text format
          if (sortedDAs.length === 1) {
            const da = sortedDAs[0];
            let text = `There is a development application on the property. The proposed use is ${da.DevelopmentType?.map(t => t.DevelopmentType).join(', ')} and its current status is ${da.ApplicationStatus}.`;
            
            // Add dwelling count if available and not zero
            if (da.NumberOfNewDwellings && da.NumberOfNewDwellings !== '0') {
              text += ` The number of proposed dwellings is ${da.NumberOfNewDwellings}.`;
            }
            
            return text;
          } else {
            // For multiple DAs, create a summary
            let text = `There are ${sortedDAs.length} development applications on the property. `;
            
            // Group DAs by status
            const statusGroups = {};
            sortedDAs.forEach(da => {
              if (!statusGroups[da.ApplicationStatus]) {
                statusGroups[da.ApplicationStatus] = [];
              }
              statusGroups[da.ApplicationStatus].push(da);
            });
            
            // Add status summary
            const statusSummary = Object.entries(statusGroups)
              .map(([status, das]) => `${das.length} ${status.toLowerCase()}`)
              .join(', ');
            
            text += `Current status: ${statusSummary}. `;
            
            // Add details about the most recent DA
            const mostRecentDA = sortedDAs[0];
            text += `The most recent application was lodged on ${new Date(mostRecentDA.LodgementDate).toLocaleDateString('en-AU')} for ${mostRecentDA.DevelopmentType?.map(t => t.DevelopmentType).join(', ')}.`;
            
            // Add total dwelling count if available
            const totalDwellings = sortedDAs.reduce((sum, da) => sum + (parseInt(da.NumberOfNewDwellings) || 0), 0);
            if (totalDwellings > 0) {
              text += ` Total proposed dwellings across all applications: ${totalDwellings}.`;
            }
            
            return text;
          }
        })()
      : 'There are no development applications associated with the property.';

    // Development Applications Description Text
    slide.addText(daText, convertCmValues({
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

    // Development Applications Source Text (bottom right)
    slide.addText('Source: NSW Development Application API. Filtered for cost >$500k and lodged within last 2 years.', convertCmValues({
      x: '5%',
      y: '88%',
      w: '40%',
      h: '4%',
      fontSize: 5,
      color: '363636',
      fontFace: 'Public Sans',
      italic: true,
      align: 'right',
      valign: 'bottom'
    }));

    // Right section - Construction Certificates
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '50%',
      y: '18%',
      w: '45%',
      h: '61%',
      fill: 'FFFFFF',
      line: { color: '002664', width: 1.5 }
    }));

    // Add blue vertical bar for right side
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '50%',
      y: '18%',
      w: '6%',
      h: '61%',
      fill: '002664'
    }));

    // Add rotated text for right side
    slide.addText('Construction Certificates', convertCmValues({
      x: '22.5%',
      y: '45%',
      w: '61%',
      h: '6%',
      color: 'FFFFFF',
      fontSize: 14,
      fontFace: 'Public Sans',
      align: 'center',
      valign: 'middle',
      rotate: 270
    }));

    // Add Construction Certificates Table
    if (ccMapResult && ccMapResult.typeStats.length > 0) {
      // Format numbers for display
      const formatCurrency = (value) => {
        if (!value) return 'N/A';
        return new Intl.NumberFormat('en-AU', {
          style: 'currency',
          currency: 'AUD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      };

      const formatArea = (value) => {
        if (!value) return 'N/A';
        return `${Math.round(value)}m²`;
      };

      const formatCostPerM2 = (value) => {
        if (!value) return 'N/A';
        return `$${Math.round(value).toLocaleString()}`;
      };

      // Helper function to group and aggregate stats
      const groupAndAggregateStats = (stats) => {
        const groupMap = {
          'Dwelling': ['Dwelling', 'Dwelling house'],
          'Dual Occupancy': ['Dual occupancy', 'Dual occupancy (attached)', 'Dual occupancy (detached)'],
          'Multi-Dwelling Housing': ['Multi-dwelling housing', 'Multi-dwelling housing (terraces)', 'Medium Density Housing']
        };

        // Create reverse mapping for quick lookups
        const typeToGroup = {};
        Object.entries(groupMap).forEach(([group, types]) => {
          types.forEach(type => typeToGroup[type] = group);
        });

        // Group the stats
        const groupedStats = stats.reduce((acc, stat) => {
          const groupName = typeToGroup[stat.type] || stat.type;
          
          if (!acc[groupName]) {
            acc[groupName] = {
              type: groupName,
              count: 0,
              gfaValues: [],
              costM2Values: [],
              builders: new Map()
            };
          }
          
          acc[groupName].count += stat.count;
          
          if (stat.medianGFAPerDwelling) {
            acc[groupName].gfaValues.push(stat.medianGFAPerDwelling);
          }
          
          if (stat.medianCostPerM2) {
            acc[groupName].costM2Values.push(stat.medianCostPerM2);
          }
          
          if (stat.topBuilder && stat.topBuilder !== 'Unknown') {
            acc[groupName].builders.set(
              stat.topBuilder,
              (acc[groupName].builders.get(stat.topBuilder) || 0) + stat.count
            );
          }
          
          return acc;
        }, {});

        // Convert to array and calculate medians
        return Object.values(groupedStats)
          .map(group => ({
            type: group.type,
            count: group.count,
            medianGFAPerDwelling: group.gfaValues.length > 0 
              ? group.gfaValues.reduce((a, b) => a + b) / group.gfaValues.length 
              : null,
            medianCostPerM2: group.costM2Values.length > 0
              ? group.costM2Values.reduce((a, b) => a + b) / group.costM2Values.length
              : null,
            topBuilder: Array.from(group.builders.entries())
              .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown'
          }))
          .sort((a, b) => a.type.localeCompare(b.type)); // Sort alphabetically
      };

      const groupedStats = groupAndAggregateStats(ccMapResult.typeStats);

      // Table data
      const tableData = {
        x: '57%',
        y: '21%',
        w: '34%',
        h: '55%',
        colW: [1.4, 0.6, 1.0, 1.0, 1.0],
        color: '363636',
        fontSize: 6,
        border: { pt: 0.5, color: '002664' },
        align: 'left',
        valign: 'middle',
        rowH: 0.3,
        header: {
          rows: [1],
          options: { 
            fill: { color: '002664' },
            color: 'FFFFFF',
            bold: true,
            fontSize: 6
          }
        },
        data: [
          [
            { text: 'Development Type', options: { align: 'left', bold: true } },
            { text: 'Count', options: { align: 'center', bold: true } },
            { text: 'GFA/Dwelling', options: { align: 'center', bold: true } },
            { text: 'Cost ($/m²)', options: { align: 'center', bold: true } },
            { text: 'Top Builder', options: { align: 'left', bold: true } }
          ],
          ...groupedStats.map(stat => [
            { text: stat.type, options: { align: 'left', fill: 'E6F3FF' } }, // Light blue background
            { text: stat.count.toString(), options: { align: 'center' } },
            { text: formatArea(stat.medianGFAPerDwelling), options: { align: 'center' } },
            { text: formatCostPerM2(stat.medianCostPerM2), options: { align: 'center' } },
            { text: stat.topBuilder, options: { align: 'left', fontSize: 5 } }
          ])
        ]
      };

      // Add table title
      slide.addText('Residential Construction Certificates Analysis', convertCmValues({
        x: '56%',
        y: '18%',
        w: '34%',
        h: '2%',
        fontSize: 8,
        color: '002664',
        bold: true,
        align: 'left'
      }));

      // Add table
      slide.addTable(tableData.data, convertCmValues(tableData));

    } else {
      // Show message when no data is available
      slide.addText('No construction certificates found.', convertCmValues({
        x: '56%',
        y: '38%',
        w: '34%',
        h: '15%',
        fontSize: 12,
        color: '363636',
        fontFace: 'Public Sans',
        align: 'center',
        valign: 'middle'
      }));
    }

    // Construction Certificates Content Box
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '50%',
      y: '80%',
      w: '45%',
      h: '12%',
      fill: 'FFFBF2',
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // Construction Certificates Text
    const ccText = ccMapResult 
      ? `Over the last two years there have been ${ccMapResult.totalCount} residential construction certificates in ${properties.site_suitability__LGA || 'this LGA'} with a total value of $${Math.round(ccMapResult.totalCost / 1000000).toLocaleString()} million. The most common type is ${
          ccMapResult.typeStats.sort((a, b) => b.count - a.count)[0]?.type || 'unknown'
        }.`
      : 'No construction certificates found.';

    slide.addText(ccText, convertCmValues({
      x: '50%',
      y: '80%',
      w: '45%',
      h: '8%',
      fontSize: 6,
      color: '363636',
      fontFace: 'Public Sans',
      align: 'left',
      valign: 'top',
      wrap: true
    }));

    // Add source text
    slide.addText('Source: NSW Construction Certificate API. Filtered for cost >$500k and lodged within last 2 years.', convertCmValues({
      x: '50%',
      y: '88%',
      w: '45%',
      h: '4%',
      fontSize: 5,
      color: '363636',
      fontFace: 'Public Sans',
      italic: true,
      align: 'right',
      valign: 'bottom'
    }));

    // Add footer line
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.footerLine));

    // Add footer text and page number
    slide.addText('Property and Development NSW', convertCmValues(styles.footer));
    
    // Use the page number from properties if available, otherwise use the default
    const pageNumber = properties.pageNumbers?.development || '16';
    slide.addText(pageNumber, convertCmValues(styles.pageNumber));

    return slide;
  } catch (error) {
    console.error('Error creating development slide:', error);
    throw error;
  }
} 