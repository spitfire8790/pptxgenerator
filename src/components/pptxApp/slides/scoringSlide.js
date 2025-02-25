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
    slide.addText('13', styles.pageNumber);

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

    // Initialize scores object if it doesn't exist
    if (!propertyData?.scores) {
      console.warn('propertyData.scores is undefined, initializing empty object');
      propertyData.scores = {};
    }

    // Calculate scores with default values if data is missing
    const scores = {
      developableArea: getScoreValue(propertyData.scores?.developableArea),
      contours: getScoreValue(propertyData.scores?.contours),
      siteRegularity: getScoreValue(propertyData.scores?.siteRegularity),
      zoning: getScoreValue(propertyData.scores?.zoning),
      heritage: getScoreValue(propertyData.scores?.heritage),
      acidSulfateSoils: getScoreValue(propertyData.scores?.acidSulfateSoils),
      servicing: getScoreValue(propertyData.scores?.servicing),
      roads: getScoreValue(propertyData.scores?.roads),
      udpPrecincts: getScoreValue(propertyData.scores?.udpPrecincts),
      ptal: getScoreValue(propertyData.scores?.ptal),
      geoscape: getScoreValue(propertyData.scores?.geoscape),
      flood: getScoreValue(propertyData.scores?.flood),
      bushfire: getScoreValue(propertyData.scores?.bushfire),
      contamination: getScoreValue(propertyData.scores?.contamination),
      tec: getScoreValue(propertyData.site_suitability__scores?.tec),
      historicalImagery: getScoreValue(propertyData.site_suitability__scores?.historicalImagery)
    };

    // Log all scores for debugging
    console.log('All scores after initialization:', JSON.stringify(scores, null, 2));

    // Calculate total score
    const totalScore = Object.values(scores).reduce((sum, score) => sum + (parseInt(score) || 0), 0);
    const maxScore = 17 * 3;  // 17 criteria, each with a max score of 3
    const percentage = Math.round((totalScore / maxScore) * 100);

    console.log('Creating table with scores:', scores);

    // Create scoring table with proper row merging
    const tableData = [
      // Headers
      [{ text: 'Group', options: { fill: '002664', color: 'FFFFFF' } }, 
       { text: 'Criteria', options: { fill: '002664', color: 'FFFFFF' } }, 
       { text: 'Scoring', options: { fill: '002664', color: 'FFFFFF' } }],
      // Primary Site Attributes
      [formatGroupCell('Primary Site Attributes\n\n', 1), 
       formatCriteriaCell('Developable Area'), formatScoreWithColor(scores.developableArea)],
      // Secondary Site Attributes
      [formatGroupCell('Secondary Site Attributes\n\n', 2), 
       formatCriteriaCell('Site Contour'), formatScoreWithColor(scores.contours)],
      [null, formatCriteriaCell('Site Regularity'), formatScoreWithColor(scores.siteRegularity)],
      // Planning
      [formatGroupCell('Planning\n\n', 3), 
       formatCriteriaCell('Zoning'), formatScoreWithColor(scores.zoning)],
      [null, formatCriteriaCell('Heritage'), formatScoreWithColor(scores.heritage)],
      [null, formatCriteriaCell('Acid Sulfate Soils'), formatScoreWithColor(scores.acidSulfateSoils)],
      // Access & Services
      [formatGroupCell('Access & Services\n\n', 4), 
       formatCriteriaCell('Servicing'), formatScoreWithColor(scores.servicing)],
      [null, formatCriteriaCell('Access'), formatScoreWithColor(scores.roads)],
      [null, formatCriteriaCell('Proximity to Strategic Centre'), formatScoreWithColor(scores.udpPrecincts)],
      [null, formatCriteriaCell('Public Transport Access Level (PTAL)'), formatScoreWithColor(scores.ptal)],
      // Utilisation & Improvements
      [formatGroupCell('Utilisation & Improvements\n\n', 1), 
       formatCriteriaCell('Built Form'), formatScoreWithColor(scores.geoscape)],
      // Hazards
      [formatGroupCell('Hazards\n\n', 2), 
       formatCriteriaCell('Flood risk (1% AEP)'), formatScoreWithColor(scores.flood)],
      [null, formatCriteriaCell('Bushfire Risk'), formatScoreWithColor(scores.bushfire)],
      // Site Contamination
      [formatGroupCell('Site Contamination\n\n', 2), 
       formatCriteriaCell('Contaminated sites Register'), formatScoreWithColor(scores.contamination)],
      [null, formatCriteriaCell('Usage & potential site remediation'), formatScoreWithColor(scores.historicalImagery)],
      // Environmental
      [formatGroupCell('Environmental\n\n', 1), 
       formatCriteriaCell('Threatened Ecological Communities'), formatScoreWithColor(scores.tec)],
      // Total Score
      [{ text: 'Total Score\n\n', options: { rowspan: 1, valign: 'middle', bold: true }}, 
       { text: '', options: {} }, 
       { text: `${totalScore}/${maxScore} (${percentage}%)`, options: { bold: true, align: 'center' }}]
    ];

    // Filter out any undefined or null values from the table data
    const cleanTableData = tableData.map(row => 
      row.map(cell => cell === null ? { text: '', options: {} } : cell)
    );

    console.log('Table data structure:', JSON.stringify(cleanTableData, null, 2));

    // Add table with styling
    slide.addTable(cleanTableData, {
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