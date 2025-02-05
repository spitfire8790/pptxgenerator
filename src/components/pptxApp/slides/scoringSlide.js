import scoringCriteria from './scoringLogic';
import nswLogo from '../../../../public/images/NSW-Government-official-logo.jpg';

export async function createScoringSlide(pres, feature, developableArea) {
  // Create slide
  const slide = pres.addSlide();

  // Add title
  slide.addText('Scoring', {
    x: '5%',
    y: '5%',
    fontSize: 36,
    fontFace: 'Public Sans',
    bold: true,
    color: '002664'
  });

  // Add NSW Government logo
  slide.addImage({
    path: nswLogo,
    x: '85%',
    y: '5%',
    w: '10%',
    h: '5%'
  });

  // Add sensitive text
  slide.addText('SENSITIVE: NSW GOVERNMENT', {
    x: '70%',
    y: '5%',
    fontSize: 12,
    fontFace: 'Public Sans',
    color: 'FF0000'
  });

  // Helper function to extract score value
  const getScoreValue = (scoreResult) => {
    if (scoreResult === null || scoreResult === undefined) return 0;
    if (typeof scoreResult === 'number') return scoreResult;
    if (typeof scoreResult === 'object' && 'score' in scoreResult) return scoreResult.score;
    return 0;
  };

  // Calculate scores using existing scoring criteria
  const scores = {
    developableArea: getScoreValue(scoringCriteria.developableArea.calculateScore(feature.properties?.developableAreaSize)),
    siteContour: getScoreValue(scoringCriteria.contours.calculateScore(feature.properties?.elevationChange)),
    siteRegularity: getScoreValue(scoringCriteria.siteRegularity.calculateScore(feature)),
    zoning: getScoreValue(scoringCriteria.planning.calculateScore(feature.properties?.zones, feature.properties?.fsr, feature.properties?.hob)),
    heritage: getScoreValue(scoringCriteria.heritage.calculateScore(feature.properties?.heritageData)),
    acidSulphateSoil: getScoreValue(scoringCriteria.acidSulfateSoils.calculateScore(feature.properties?.soilsData)),
    servicing: getScoreValue(scoringCriteria.servicing.calculateScore(
      getScoreValue(scoringCriteria.water.calculateScore(feature.properties?.waterFeatures, developableArea)),
      getScoreValue(scoringCriteria.sewer.calculateScore(feature.properties?.sewerFeatures, developableArea)),
      getScoreValue(scoringCriteria.power.calculateScore(feature.properties?.powerFeatures, developableArea))
    )),
    access: getScoreValue(scoringCriteria.roads.calculateScore(feature.properties?.roadFeatures, developableArea)),
    proximityToStrategicCentre: getScoreValue(scoringCriteria.udpPrecincts.calculateScore(feature.properties?.udpPrecincts, developableArea)),
    ptal: getScoreValue(scoringCriteria.ptal.calculateScore(feature.properties?.ptalValues)),
    builtForm: getScoreValue(scoringCriteria.geoscape.calculateScore(feature.properties?.geoscapeFeatures, developableArea)),
    floodRisk: getScoreValue(scoringCriteria.flood.calculateScore(feature.properties?.site_suitability__floodFeatures, developableArea)),
    bushfireRisk: getScoreValue(scoringCriteria.bushfire.calculateScore(feature.properties?.site_suitability__bushfireFeatures, developableArea)),
    contaminatedSites: getScoreValue(scoringCriteria.contamination.calculateScore(feature.properties?.site_suitability__contaminationFeatures, developableArea)),
    siteRemediation: 2, // This appears to be a fixed score in the example
    tec: getScoreValue(scoringCriteria.tec.calculateScore(feature.properties?.tecFeatures, developableArea))
  };

  // Create scoring table
  const tableData = [
    ['Group', 'Criteria', 'Scoring'],
    ['Primary Site Attributes', 'Developable Area', scores.developableArea],
    ['Secondary Site Attributers', 'Site Contour', scores.siteContour],
    ['', 'Site Regularity', scores.siteRegularity],
    ['Planning', 'Zoning', scores.zoning],
    ['', 'Heritage', scores.heritage],
    ['', 'Acid Sulphate Soil', scores.acidSulphateSoil],
    ['Access & Services', 'Servicing', scores.servicing],
    ['', 'Access', scores.access],
    ['', 'Proximity to Strategic Centre', scores.proximityToStrategicCentre],
    ['', 'Public Transport Access Level (PTAL)', scores.ptal],
    ['Utilisation & Improvements', 'Built Form', scores.builtForm],
    ['Hazards', 'Flood risk (1% AEP)', scores.floodRisk],
    ['', 'Bushfire Risk', scores.bushfireRisk],
    ['Site Contamination', 'Contaminated sites Register', scores.contaminatedSites],
    ['', 'Usage & potential site remediation', scores.siteRemediation],
    ['Environmental', 'Threatened Ecological Communities', scores.tec]
  ];

  // Calculate total score
  const totalScore = Object.values(scores).reduce((sum, score) => sum + (parseInt(score) || 0), 0);
  const maxScore = 48;
  const percentage = ((totalScore / maxScore) * 100).toFixed(2);

  // Add total score row
  tableData.push(['Total Score', '', `${totalScore}/${maxScore}\n(${percentage}%)`]);

  // Add table
  slide.addTable(tableData, {
    x: '5%',
    y: '15%',
    w: '60%',
    colW: [3, 4, 1.5],
    border: { type: 'solid', color: '363636', pt: 1 },
    align: 'left',
    fontFace: 'Public Sans',
    fontSize: 11,
    color: '363636',
    valign: 'middle',
    rowH: 0.3,
    autoPage: true
  });

  // Add recommendation box
  const recommendationBox = slide.addShape('rect', {
    x: '70%',
    y: '15%',
    w: '25%',
    h: '30%',
    fill: { color: 'F5F5F5' },
    line: { color: '363636', width: 1 }
  });

  // Add recommendation title
  slide.addText('Recommendation:', {
    x: '71%',
    y: '16%',
    w: '23%',
    fontSize: 14,
    fontFace: 'Public Sans',
    bold: true,
    color: '363636'
  });

  // Add placeholder recommendation text
  slide.addText('Please add recommendation and rationale', {
    x: '71%',
    y: '20%',
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
} 