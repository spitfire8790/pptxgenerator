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

export async function createScoringSlide(pres, feature, developableArea) {
  const slide = pres.addSlide({ masterName: 'NSW_MASTER' });

  try {
    // Add title with fallback for missing address
    slide.addText([
      { text: feature?.properties?.site__address || 'Address not available', options: { color: styles.title.color } },
      { text: ' ', options: { breakLine: true } },
      { text: 'Scoring - NOTE THIS IS WIP', options: { color: styles.subtitle.color } }
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

    // Calculate scores with default values if data is missing
    const scores = {
      developableArea: getScoreValue(scoringCriteria.developableArea.calculateScore(feature?.properties?.developableAreaSize || 0)),
      siteContour: getScoreValue(scoringCriteria.contours.calculateScore(feature?.properties?.elevationChange || 0)),
      siteRegularity: getScoreValue(scoringCriteria.siteRegularity.calculateScore(feature || {})),
      zoning: getScoreValue(scoringCriteria.planning.calculateScore(feature?.properties?.zones || [], feature?.properties?.fsr || 0, feature?.properties?.hob || 0)),
      heritage: getScoreValue(scoringCriteria.heritage.calculateScore(feature?.properties?.heritageData || null)),
      acidSulphateSoil: getScoreValue(scoringCriteria.acidSulfateSoils.calculateScore(feature?.properties?.soilsData || null)),
      servicing: getScoreValue(scoringCriteria.servicing.calculateScore(
        getScoreValue(scoringCriteria.water.calculateScore(feature?.properties?.waterFeatures || [], developableArea || null)),
        getScoreValue(scoringCriteria.sewer.calculateScore(feature?.properties?.sewerFeatures || [], developableArea || null)),
        getScoreValue(scoringCriteria.power.calculateScore(feature?.properties?.powerFeatures || [], developableArea || null))
      )),
      access: getScoreValue(scoringCriteria.roads.calculateScore(feature?.properties?.roadFeatures || [], developableArea || null)),
      proximityToStrategicCentre: getScoreValue(scoringCriteria.udpPrecincts.calculateScore(feature?.properties?.udpPrecincts || [], developableArea || null)),
      ptal: getScoreValue(scoringCriteria.ptal.calculateScore(feature?.properties?.ptalValues || [])),
      builtForm: getScoreValue(scoringCriteria.geoscape.calculateScore(feature?.properties?.geoscapeFeatures || [], developableArea || null)),
      floodRisk: getScoreValue(scoringCriteria.flood.calculateScore(feature?.properties?.site_suitability__floodFeatures || null, developableArea || null)),
      bushfireRisk: getScoreValue(scoringCriteria.bushfire.calculateScore(feature?.properties?.site_suitability__bushfireFeatures || null, developableArea || null)),
      contaminatedSites: getScoreValue(scoringCriteria.contamination.calculateScore(feature?.properties?.site_suitability__contaminationFeatures || null, developableArea || null)),
      siteRemediation: 2,
      tec: getScoreValue(scoringCriteria.tec.calculateScore(feature?.properties?.tecFeatures || [], developableArea || null))
    };

    // Calculate total score
    const totalScore = Object.values(scores).reduce((sum, score) => sum + (parseInt(score) || 0), 0);
    const maxScore = 48;
    const percentage = ((totalScore / maxScore) * 100).toFixed(2);

    // Create scoring table with proper row merging
    const tableData = [
      // Headers
      ['Group', 'Criteria', 'Scoring'],
      // Primary Site Attributes
      ['Primary Site Attributes', 'Developable Area', scores.developableArea],
      // Secondary Site Attributes
      ['Secondary Site Attributers', 'Site Contour', scores.siteContour],
      ['', 'Site Regularity', scores.siteRegularity],
      // Planning
      ['Planning', 'Zoning', scores.zoning],
      ['', 'Heritage', scores.heritage],
      ['', 'Acid Sulphate Soil', scores.acidSulphateSoil],
      // Access & Services
      ['Access & Services', 'Servicing', scores.servicing],
      ['', 'Access', scores.access],
      ['', 'Proximity to Strategic Centre', scores.proximityToStrategicCentre],
      ['', 'Public Transport Access Level (PTAL)', scores.ptal],
      // Utilisation & Improvements
      ['Utilisation & Improvements', 'Built Form', scores.builtForm],
      // Hazards
      ['Hazards', 'Flood risk (1% AEP)', scores.floodRisk],
      ['', 'Bushfire Risk', scores.bushfireRisk],
      // Site Contamination
      ['Site Contamination', 'Contaminated sites Register', scores.contaminatedSites],
      ['', 'Usage & potential site remediation', scores.siteRemediation],
      // Environmental
      ['Environmental', 'Threatened Ecological Communities', scores.tec],
      // Total Score
      ['Total Score', '', `${totalScore}/${maxScore}\n(${percentage}%)`]
    ];

    // Add table with styling and score-based colors
    slide.addTable(tableData, {
      x: '5%',
      y: '20%',
      w: '63%',
      colW: [2, 3.5, 0.7],
      border: { type: 'solid', color: '363636', pt: 0.5 },
      align: 'left',
      fontFace: 'Public Sans',
      fontSize: 8,
      color: '363636',
      valign: 'middle',
      autoPage: false,
      // Add header row styling
      firstRow: {
        options: {
          fill: '002664',
          color: 'FFFFFF',
          fontFace: 'Public Sans',
          fontSize: 8,
          valign: 'middle'
        }
      },
      // Add row merging
      rowMerge: [
        { row: 1, col: 0, rowspan: 1 },  // Primary Site Attributes
        { row: 2, col: 0, rowspan: 2 },  // Secondary Site Attributes
        { row: 4, col: 0, rowspan: 3 },  // Planning
        { row: 7, col: 0, rowspan: 4 },  // Access & Services
        { row: 11, col: 0, rowspan: 1 }, // Utilisation & Improvements
        { row: 12, col: 0, rowspan: 2 }, // Hazards
        { row: 14, col: 0, rowspan: 2 }, // Site Contamination
        { row: 16, col: 0, rowspan: 1 }, // Environmental
      ],
      // Add cell-specific styling based on scores
      rows: tableData.map((row, rowIndex) => {
        // Skip header row
        if (rowIndex === 0) return {};

        // Get the score from the last column if it exists
        const scoreValue = parseInt(row[2]);
        if (!isNaN(scoreValue)) {
          return {
            cells: [
              {}, // First column - no special styling
              {}, // Second column - no special styling
              {
                fill: scoringCriteria.planning.getScoreColor(scoreValue) // Use the color from scoringLogic
              }
            ]
          };
        }
        return {}; // Default to no special styling
      })
    });

    // Move recommendation box to align with wider table
    const recommendationBox = slide.addShape('rect', {
      x: '71%',  // Moved slightly right to accommodate wider table
      y: '20%',
      w: '25%',
      h: '30%',
      fill: { color: 'F5F5F5' },
      line: { color: '363636', width: 0.5 }
    });

    // Add recommendation title
    slide.addText('Recommendation:', {
      x: '71%',
      y: '21%',
      w: '23%',
      fontSize: 14,
      fontFace: 'Public Sans',
      bold: true,
      color: '363636'
    });

    // Add placeholder recommendation text
    slide.addText('Please add recommendation and rationale', {
      x: '71%',
      y: '25%',
      w: '23%',
      fontSize: 12,
      fontFace: 'Public Sans',
      color: '363636',
      bullet: true
    });

    // Add key reasons title
    slide.addText('Key Reasons:', {
      x: '71%',
      y: '35%',
      w: '23%',
      fontSize: 14,
      fontFace: 'Public Sans',
      bold: true,
      color: '363636'
    });

    // Add placeholder key reasons text
    slide.addText('Please add recommendation and rationale', {
      x: '71%',
      y: '39%',
      w: '23%',
      fontSize: 12,
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