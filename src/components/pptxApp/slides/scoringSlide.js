import scoringCriteria from './scoringLogic';
import nswLogo from '../../../../public/images/NSW-Government-official-logo.jpg';

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

export async function createScoringSlide(pres, propertyData) {
  console.log('Creating scoring slide with propertyData:', {
    address: propertyData?.site__address,
    scores: propertyData?.scores
  });

  const slide = pres.addSlide({ masterName: 'NSW_MASTER' });

  try {
    // Add title with fallback for missing address
    slide.addText([
      { text: propertyData?.site__address || 'Address not available', options: { color: styles.title.color } },
      { text: ' ', options: { breakLine: true } },
      { text: 'Scoring', options: { color: styles.subtitle.color } }
    ], styles.title);
    
    // Add horizontal line under title
    slide.addShape(pres.shapes.RECTANGLE, styles.titleLine);
    
    // Add sensitive text
    slide.addText("SENSITIVE: NSW GOVERNMENT", styles.sensitiveText);
    
    // Add NSW Logo
    slide.addImage({
      path: nswLogo,
      ...styles.nswLogo
    });
    
    // Add footer elements
    slide.addShape(pres.shapes.RECTANGLE, styles.footerLine);
    slide.addText('Property and Development NSW', styles.footer);
    slide.addText('14', styles.pageNumber);

    // Helper function to extract score value with better error handling
    const getScoreValue = (scoreResult) => {
      try {
        if (scoreResult === null || scoreResult === undefined) return 0;
        if (typeof scoreResult === 'number') return scoreResult;
        if (typeof scoreResult === 'object' && 'score' in scoreResult) return scoreResult.score;
        return 0;
      } catch (error) {
        console.warn('Error getting score value:', error);
        return 0;
      }
    };

    // Helper function to format score with color
    const formatScoreWithColor = (score) => {
      let fill;
      switch (parseInt(score)) {
        case 1:
          fill = 'FFE6E6'; // Light red
          break;
        case 2:
          fill = 'FFF3E0'; // Light orange
          break;
        case 3:
          fill = 'E6FFE6'; // Light green
          break;
        default:
          fill = 'FFFFFF'; // White
      }
      return {
        text: score.toString(),
        options: { 
          align: 'center',
          bold: true,
          fill: fill,
          color: '363636'  // Keep text color consistent
        }
      };
    };

    // Helper function to format criteria cell
    const formatCriteriaCell = (text) => {
      return {
        text: text,
        options: { align: 'left' }
      };
    };

    // Helper function to format group cell
    const formatGroupCell = (text, rowspan) => {
      return text ? {
        text: text,
        options: { rowspan, valign: 'middle' }
      } : {
        text: '',
        options: { rowspan: 1 }
      };
    };

    // Calculate scores with default values if data is missing
    const scores = {
      developableArea: getScoreValue(propertyData.scores.developableArea),
      contours: getScoreValue(propertyData.scores.contours),
      siteRegularity: getScoreValue(propertyData.scores.siteRegularity),
      zoning: getScoreValue(propertyData.scores.zoning),
      heritage: getScoreValue(propertyData.scores.heritage),
      acidSulfateSoils: getScoreValue(propertyData.scores.acidSulfateSoils),
      servicing: getScoreValue(propertyData.scores.servicing),
      roads: getScoreValue(propertyData.scores.roads),
      udpPrecincts: getScoreValue(propertyData.scores.udpPrecincts),
      ptal: getScoreValue(propertyData.scores.ptal),
      geoscape: getScoreValue(propertyData.scores.geoscape),
      flood: getScoreValue(propertyData.scores.flood),
      bushfire: getScoreValue(propertyData.scores.bushfire),
      contamination: getScoreValue(propertyData.scores.contamination),
      tec: getScoreValue(propertyData.site_suitability__scores?.tec),
      historicalImagery: getScoreValue(propertyData.site_suitability__scores?.historicalImagery)
    };

    // Calculate total score
    const totalScore = Object.values(scores).reduce((sum, score) => sum + (parseInt(score) || 0), 0);
    const maxScore = 51;  // Updated to include historical imagery score
    const percentage = Math.round((totalScore / maxScore) * 100);

    console.log('Creating table with scores:', scores);

    // Create scoring table with proper row merging
    const tableData = [
      // Headers
      [{ text: 'Group', options: { fill: '002664', color: 'FFFFFF' } }, 
       { text: 'Criteria', options: { fill: '002664', color: 'FFFFFF' } }, 
       { text: 'Scoring', options: { fill: '002664', color: 'FFFFFF' } }],
      // Primary Site Attributes
      [{ text: 'Primary Site Attributes\n\n', options: { rowspan: 1, valign: 'middle' }}, 
       'Developable Area', formatScoreWithColor(scores.developableArea)],
      // Secondary Site Attributes
      [{ text: 'Secondary Site Attributes\n\n', options: { rowspan: 2, valign: 'middle' }}, 
       'Site Contour', formatScoreWithColor(scores.contours)],
      ['Site Regularity', formatScoreWithColor(scores.siteRegularity)],
      // Planning
      [{ text: 'Planning\n\n', options: { rowspan: 3, valign: 'middle' }}, 
       'Zoning', formatScoreWithColor(scores.zoning)],
      ['Heritage', formatScoreWithColor(scores.heritage)],
      ['Acid Sulfate Soils', formatScoreWithColor(scores.acidSulfateSoils)],
      // Access & Services
      [{ text: 'Access & Services\n\n', options: { rowspan: 4, valign: 'middle' }}, 
       'Servicing', formatScoreWithColor(scores.servicing)],
      ['Access', formatScoreWithColor(scores.roads)],
      ['Proximity to Strategic Centre', formatScoreWithColor(scores.udpPrecincts)],
      ['Public Transport Access Level (PTAL)', formatScoreWithColor(scores.ptal)],
      // Utilisation & Improvements
      [{ text: 'Utilisation & Improvements\n\n', options: { rowspan: 1, valign: 'middle' }}, 
       'Built Form', formatScoreWithColor(scores.geoscape)],
      // Hazards
      [{ text: 'Hazards\n\n', options: { rowspan: 2, valign: 'middle' }}, 
       'Flood risk (1% AEP)', formatScoreWithColor(scores.flood)],
      ['Bushfire Risk', formatScoreWithColor(scores.bushfire)],
      // Site Contamination
      [{ text: 'Site Contamination\n\n', options: { rowspan: 2, valign: 'middle' }}, 
       'Contaminated sites Register', formatScoreWithColor(scores.contamination)],
      ['Usage & potential site remediation', formatScoreWithColor(scores.historicalImagery)],
      // Environmental
      [{ text: 'Environmental\n\n', options: { rowspan: 1, valign: 'middle' }}, 
       'Threatened Ecological Communities', formatScoreWithColor(scores.tec)],
      // Total Score
      [{ text: 'Total Score\n\n', options: { rowspan: 1, valign: 'middle', bold: true }}, 
       '', { text: `${totalScore}/${maxScore} (${percentage}%)`, options: { bold: true, align: 'center' }}]
    ];

    console.log('Table data structure:', JSON.stringify(tableData, null, 2));

    // Add table with styling
    slide.addTable(tableData, {
      x: '5%',
      y: '18%',
      w: '62%',
      colW: [2, 5, 1],
      border: { type: 'solid', color: '363636', pt: 0.5 },
      rowH: 0.25,  // Single value instead of array
      align: 'left',
      valign: 'middle',
      fontSize: 7,
      fontFace: 'Public Sans',
      color: '363636',
      autoPage: false,
      margin: 2
    });

    // Move recommendation box to align with table
    const recommendationBox = slide.addShape('rect', {
      x: '69%',
      y: '18%',
      w: '27%',
      h: '69%',  // Match scoring table height
      fill: { color: 'FFFFFF' },
      line: { color: '363636', width: 0.5 }
    });

    // Add recommendation header with blue background
    slide.addShape('rect', {
      x: '69%',
      y: '18%',
      w: '27%',
      h: '4%',  // Slightly taller header
      fill: { color: '002664' },
      line: { color: '363636', width: 0.5 }
    });

    // Add recommendation title in white text
    slide.addText('Recommendation', {
      x: '70%',
      y: '18%',
      w: '25%',
      h: '4%',  // Match header height
      fontSize: 9,  // Increased font size
      fontFace: 'Public Sans',
      color: 'FFFFFF',
      bold: true,
      valign: 'middle',
      align: 'left'
    });

    // Add placeholder recommendation text
    slide.addText('Please add recommendation and rationale', {
      x: '70%',
      y: '24%',
      w: '25%',
      fontSize: 9,  // Increased font size
      fontFace: 'Public Sans',
      color: '363636',
      bullet: true
    });

    // Add key reasons header with blue background
    slide.addShape('rect', {
      x: '69%',
      y: '45%',
      w: '27%',
      h: '4%',
      fill: { color: '002664' },
      line: { color: '363636', width: 0.5 }
    });

    // Add key reasons title in white text
    slide.addText('Key Reasons', {
      x: '70%',
      y: '45%',
      w: '25%',
      h: '4%',  // Match header height
      fontSize: 9,  // Increased font size
      fontFace: 'Public Sans',
      color: 'FFFFFF',
      bold: true,
      valign: 'middle',
      align: 'left'
    });

    // Add placeholder key reasons text
    slide.addText('Please add recommendation and rationale', {
      x: '70%',
      y: '51%',
      w: '25%',
      fontSize: 9,  // Increased font size
      fontFace: 'Public Sans',
      color: '363636',
      bullet: true
    });

    return slide;
  } catch (error) {
    console.error('Error creating scoring slide:', error);
    return null;
  }
} 