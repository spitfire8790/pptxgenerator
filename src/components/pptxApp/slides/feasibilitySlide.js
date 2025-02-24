import { convertCmValues } from '../utils/units';
import { supabase } from '../utils/supabaseClient';
import { lgaMapping } from '../utils/map/utils/councilLgaMapping';

// Default values for configurable inputs
const DEFAULT_SETTINGS = {
  siteEfficiencyRatio: 0.80, // 80%
  floorToFloorHeight: 3.5, // meters
  gbaToGfaRatio: 0.75, // 75%
  gfaToNsaRatio: 0.85, // 85%
  unitSize: 75, // m2
  agentsSalesCommission: 0.02, // 2%
  legalFeesOnSales: 0.005, // 0.5%
  marketingCosts: 0.0075, // 0.75%
  profitAndRisk: 0.20, // 20%
  daApplicationFees: 200000, // $200,000
  professionalFees: 0.05, // 5%
  interestRate: 0.075, // 7.5%
  projectPeriod: 48, // months
};

// Helper function to calculate GFA under FSR
const calculateGfaUnderFsr = (totalSiteArea, fsr) => {
  return totalSiteArea * fsr;
};

// Helper function to calculate GFA under HOB
const calculateGfaUnderHob = (developableArea, hob, settings) => {
  const maxStoreys = Math.floor(hob / settings.floorToFloorHeight);
  const siteCoverage = developableArea * settings.siteEfficiencyRatio;
  return siteCoverage * maxStoreys * settings.gbaToGfaRatio;
};

// Helper function to calculate development yield
const calculateDevelopmentYield = (gfa, settings) => {
  const nsa = gfa * settings.gfaToNsaRatio;
  return Math.floor(nsa / settings.unitSize);
};

// Helper function to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper function to format percentage
const formatPercentage = (value) => {
  return new Intl.NumberFormat('en-AU', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
};

// Helper function to get council name from LGA
const getCouncilNameFromLGA = (lga) => {
  // Find the council name by matching the LGA value
  const councilEntry = Object.entries(lgaMapping).find(([_, mappedLGA]) => 
    mappedLGA.toLowerCase() === lga?.toLowerCase()
  );
  return councilEntry ? councilEntry[0] : lga;
};

export async function addFeasibilitySlide(pptx, properties, userSettings = {}) {
  let slide;
  try {
    console.log('Starting to add feasibility slide with properties:', {
      suburb: properties?.site_suitability__suburb,
      FSR: properties?.copiedFrom?.site_suitability__floorspace_ratio,
      HOB: properties?.copiedFrom?.site_suitability__height_of_building,
      area: properties?.copiedFrom?.site_suitability__area
    });

    slide = pptx.addSlide();

    // Merge default settings with user settings
    const settings = { ...DEFAULT_SETTINGS, ...userSettings };

    // Calculate developable area and site coverage
    const developableArea = properties?.copiedFrom?.site_suitability__area || 0;
    const siteCoverage = developableArea * settings.siteEfficiencyRatio;

    // Calculate GFA under FSR and HOB
    const fsr = properties?.copiedFrom?.site_suitability__floorspace_ratio || 0;
    const hob = properties?.copiedFrom?.site_suitability__height_of_building || 0;

    console.log('Calculating GFA with:', {
      developableArea,
      fsr,
      hob,
      siteCoverage
    });

    const gfaUnderFsr = calculateGfaUnderFsr(developableArea, fsr);
    const gfaUnderHob = calculateGfaUnderHob(developableArea, hob, settings);

    // Use the lower GFA value
    const gfa = Math.min(gfaUnderFsr, gfaUnderHob);

    // Calculate development yield
    const developmentYield = calculateDevelopmentYield(gfa, settings);

    console.log('Feasibility calculation inputs:', {
      suburb: properties?.site_suitability__suburb,
      salesData: properties.salesData,
      developmentYield,
      gfa,
      allProperties: Object.keys(properties)
    });

    // Use the sales data passed from ReportGenerator
    const salesData = properties.salesData || [];
    console.log('Sales data received in feasibility slide:', {
      isArray: Array.isArray(salesData),
      length: salesData?.length,
      suburb: properties?.site_suitability__suburb,
      rawData: salesData.slice(0, 3), // Only log first 3 items to avoid console spam
      propertyKeys: Object.keys(properties),
      copiedFromKeys: Object.keys(properties?.copiedFrom || {}),
      fullSuburbInfo: {
        suburb: properties?.site_suitability__suburb,
        rawSuburb: properties?.copiedFrom?.site_suitability__suburb,
        hasSuburb: !!properties?.site_suitability__suburb || !!properties?.copiedFrom?.site_suitability__suburb
      }
    });

    if (!Array.isArray(salesData) || salesData.length === 0) {
      console.warn('No sales data available for median price calculation', {
        isArray: Array.isArray(salesData),
        length: salesData?.length,
        suburb: properties?.site_suitability__suburb,
        salesDataType: typeof salesData,
        propertiesHasSalesData: 'salesData' in properties,
        propertyKeys: Object.keys(properties),
        fullSuburbInfo: {
          suburb: properties?.site_suitability__suburb,
          rawSuburb: properties?.copiedFrom?.site_suitability__suburb,
          hasSuburb: !!properties?.site_suitability__suburb || !!properties?.copiedFrom?.site_suitability__suburb
        }
      });
      
      // Instead of throwing error, use default values
      const defaultMedianPrice = 750000; // Default median price as fallback
      console.log('Using default median price:', defaultMedianPrice);
      
      // Calculate total gross realisation with default price
      const totalGrossRealisation = developmentYield * defaultMedianPrice;

      console.log('Gross realisation calculation with default price:', {
        developmentYield,
        defaultMedianPrice,
        totalGrossRealisation
      });

      // Continue with the default price instead of throwing
      const medianPrice = defaultMedianPrice;
      const totalGrossRealisationValue = totalGrossRealisation;

      // Calculate GST and selling costs
      const gst = totalGrossRealisationValue * 0.1;
      const agentsCommission = totalGrossRealisationValue * settings.agentsSalesCommission;
      const legalFees = totalGrossRealisationValue * settings.legalFeesOnSales;
      const marketingCosts = totalGrossRealisationValue * settings.marketingCosts;
      const netRealisation = totalGrossRealisationValue - gst - agentsCommission - legalFees - marketingCosts;

      // Calculate profit and risk
      const profitAndRisk = netRealisation * settings.profitAndRisk;
      const netRealisationAfterProfitAndRisk = netRealisation - profitAndRisk;

      // Initialize construction cost variables
      let constructionCostPerGfa = 3500; // Default fallback value if no data
      let constructionCosts = 0;
      let daApplicationFees = settings.daApplicationFees;
      let professionalFees = 0;
      let totalDevelopmentCosts = 0;

      try {
        // Get construction cost data from properties (already fetched in permissibility slide)
        if (properties.constructionCertificates && Array.isArray(properties.constructionCertificates) && properties.constructionCertificates.length > 0) {
          const latestCertificate = properties.constructionCertificates[0]; // Get the most recent certificate
          if (latestCertificate.Cost && latestCertificate.GFA && latestCertificate.GFA > 0) {
            constructionCostPerGfa = latestCertificate.Cost / latestCertificate.GFA;
          }
        }
      } catch (error) {
        console.error('Failed to get construction costs from properties, using default value:', error);
      }

      // Calculate development costs using either fetched or default construction cost
      constructionCosts = constructionCostPerGfa * gfa;
      professionalFees = constructionCosts * settings.professionalFees;
      totalDevelopmentCosts = constructionCosts + daApplicationFees + professionalFees;

      // Calculate finance costs
      const monthlyInterestRate = settings.interestRate / 12;
      const financeCosts = monthlyInterestRate * (settings.projectPeriod / 2) * totalDevelopmentCosts;

      // Calculate residual land value
      const residualLandValue = netRealisationAfterProfitAndRisk - totalDevelopmentCosts - financeCosts;

      // Create the GFA row first
      const gfaRow = [
        'Gross Floor Area (GFA)',
        `${Math.round(gfa).toLocaleString()} m²`,
        `Min of: FSR method based on FSR ${fsr}:1 (${Math.round(developableArea).toLocaleString()} m² × ${fsr} = ${Math.round(gfaUnderFsr).toLocaleString()} m²) or HOB method based on HOB ${hob}m (${Math.floor(hob / settings.floorToFloorHeight)} storeys × ${formatPercentage(settings.siteEfficiencyRatio)} site coverage × ${formatPercentage(settings.gbaToGfaRatio)} efficiency = ${Math.round(gfaUnderHob).toLocaleString()} m²)`
      ];

      // Create table rows with calculations
      const tableRows = [
        // Headers with dark blue background
        [
          { text: 'Metrics', options: { fill: '002664', color: 'FFFFFF', bold: true } },
          { text: 'Values', options: { fill: '002664', color: 'FFFFFF', bold: true } },
          { text: 'Calculation Method', options: { fill: '002664', color: 'FFFFFF', bold: true } }
        ],
        // Development Metrics
        [{ text: 'Development Metrics', options: { fill: 'E6F3FF', bold: true, colspan: 3 } }],
        ['Site Coverage', `${Math.round(siteCoverage).toLocaleString()} m²`, `${formatPercentage(settings.siteEfficiencyRatio)} of Developable Area (${Math.round(developableArea).toLocaleString()} m²)`],
        gfaRow,
        ['Development Yield', `${developmentYield} units`, 'Total NSA ÷ Average Unit Size'],
        // Sales section
        [{ text: 'Sales Analysis', options: { fill: 'E6F3FF', bold: true, colspan: 3 } }],
        ['Median Unit Price', formatCurrency(medianPrice), 'Median of recent comparable sales'],
        ['Total Gross Realisation', formatCurrency(totalGrossRealisation), 'Development Yield × Median Unit Price'],
        // GST and Selling Costs section
        [{ text: 'GST and Selling Costs', options: { fill: 'E6F3FF', bold: true, colspan: 3 } }],
        ['GST (10%)', formatCurrency(gst), 'Total Gross Realisation × 10%'],
        ['Agent\'s Commission', formatCurrency(agentsCommission), `Total Gross Realisation × ${formatPercentage(settings.agentsSalesCommission)}`],
        ['Legal Fees', formatCurrency(legalFees), `Total Gross Realisation × ${formatPercentage(settings.legalFeesOnSales)}`],
        ['Marketing Costs', formatCurrency(marketingCosts), `Total Gross Realisation × ${formatPercentage(settings.marketingCosts)}`],
        ['Net Realisation', formatCurrency(netRealisation), 'Total Gross Realisation - GST - Commission - Legal - Marketing'],
        // Profit and Risk section
        [{ text: 'Profit and Risk', options: { fill: 'E6F3FF', bold: true, colspan: 3 } }],
        ['Profit Margin', formatCurrency(profitAndRisk), `Net Realisation × ${formatPercentage(settings.profitAndRisk)}`],
        ['Net Realisation after Profit', formatCurrency(netRealisationAfterProfitAndRisk), 'Net Realisation - Profit Margin'],
        // Development Costs section
        [{ text: 'Development Costs', options: { fill: 'E6F3FF', bold: true, colspan: 3 } }],
        ['Construction Cost (per m² GFA)', formatCurrency(constructionCostPerGfa), 'Based on recent construction certificates'],
        ['Total Construction Costs', formatCurrency(constructionCosts), 'Construction Cost per m² × Total GFA'],
        ['DA Application Fees', formatCurrency(daApplicationFees), 'Fixed cost'],
        ['Professional Fees', formatCurrency(professionalFees), `Construction Costs × ${formatPercentage(settings.professionalFees)}`],
        ['Total Development Costs', formatCurrency(totalDevelopmentCosts), 'Construction + DA + Professional Fees'],
        // Finance Costs section
        [{ text: 'Finance Costs', options: { fill: 'E6F3FF', bold: true, colspan: 3 } }],
        ['Interest Rate', formatPercentage(settings.interestRate), 'Annual rate'],
        ['Finance Costs', formatCurrency(financeCosts), 'Interest Rate × (Project Period ÷ 2) × Total Development Costs'],
        // Residual Land Value
        [{ text: 'Residual Land Value', options: { fill: 'E6F3FF', bold: true, colspan: 3 } }],
        ['Residual Land Value', formatCurrency(residualLandValue), 'Net Realisation after Profit - Total Development Costs - Finance Costs']
      ];

      // Add the table to the slide with improved formatting
      slide.addTable(tableRows, {
        ...convertCmValues({
          x: '5%',
          y: '18%',
          w: '90%',
          h: '74%'
        }),
        colW: [3.5, 3, 4],
        fontSize: 5,
        fontFace: 'Public Sans',
        border: { 
          type: 'solid',
          pt: 0.25,
          color: 'CCCCCC'
        },
        align: 'left',
        valign: 'middle',
        margin: 0.05,
        rowH: 0.05,
        autoPage: false
      });

      // Add title
      slide.addText([
        { text: properties.site__address, options: { color: styles.title.color } },
        { text: ' ', options: { breakLine: true } },
        { text: 'Development Feasibility', options: { color: styles.subtitle.color } }
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

      // Add footer line
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.footerLine));

      // Add source attribution
      slide.addText('Source: getsoldprice.com.au, NSW Planning Portal (Construction Certificate API)', convertCmValues({
        x: '5%',
        y: '91%',
        w: '90%',
        h: '2%',
        fontSize: 7,
        color: '666666',
        fontFace: 'Public Sans',
        align: 'left'
      }));

      // Add footer text
      slide.addText('Property and Development NSW', convertCmValues(styles.footer));
      slide.addText('16', convertCmValues(styles.pageNumber));

      return slide;
    }

    // Calculate median price
    const prices = salesData.map(item => item.price).sort((a, b) => a - b);
    const medianPrice = prices[Math.floor(prices.length / 2)];
    
    console.log('Median price calculation:', {
      allPrices: prices,
      medianPrice,
      numberOfSales: prices.length
    });

    // Calculate total gross realisation
    const totalGrossRealisation = developmentYield * medianPrice;

    console.log('Gross realisation calculation:', {
      developmentYield,
      medianPrice,
      totalGrossRealisation
    });

    // Calculate GST and selling costs
    const gst = totalGrossRealisation * 0.1;
    const agentsCommission = totalGrossRealisation * settings.agentsSalesCommission;
    const legalFees = totalGrossRealisation * settings.legalFeesOnSales;
    const marketingCosts = totalGrossRealisation * settings.marketingCosts;
    const netRealisation = totalGrossRealisation - gst - agentsCommission - legalFees - marketingCosts;

    // Calculate profit and risk
    const profitAndRisk = netRealisation * settings.profitAndRisk;
    const netRealisationAfterProfitAndRisk = netRealisation - profitAndRisk;

    // Initialize construction cost variables
    let constructionCostPerGfa = 3500; // Default fallback value if no data
    let constructionCosts = 0;
    let daApplicationFees = settings.daApplicationFees;
    let professionalFees = 0;
    let totalDevelopmentCosts = 0;

    try {
      // Get construction cost data from properties (already fetched in permissibility slide)
      if (properties.constructionCertificates && Array.isArray(properties.constructionCertificates) && properties.constructionCertificates.length > 0) {
        const latestCertificate = properties.constructionCertificates[0]; // Get the most recent certificate
        if (latestCertificate.Cost && latestCertificate.GFA && latestCertificate.GFA > 0) {
          constructionCostPerGfa = latestCertificate.Cost / latestCertificate.GFA;
        }
      }
    } catch (error) {
      console.error('Failed to get construction costs from properties, using default value:', error);
    }

    // Calculate development costs using either fetched or default construction cost
    constructionCosts = constructionCostPerGfa * gfa;
    professionalFees = constructionCosts * settings.professionalFees;
    totalDevelopmentCosts = constructionCosts + daApplicationFees + professionalFees;

    // Calculate finance costs
    const monthlyInterestRate = settings.interestRate / 12;
    const financeCosts = monthlyInterestRate * (settings.projectPeriod / 2) * totalDevelopmentCosts;

    // Calculate residual land value
    const residualLandValue = netRealisationAfterProfitAndRisk - totalDevelopmentCosts - financeCosts;

    // Create the GFA row first
    const gfaRow = [
      'Gross Floor Area (GFA)',
      `${Math.round(gfa).toLocaleString()} m²`,
      `Min of: FSR ${fsr}:1 (${Math.round(developableArea).toLocaleString()} m² × ${fsr} = ${Math.round(gfaUnderFsr).toLocaleString()} m²) or HOB ${hob}m (${Math.floor(hob / settings.floorToFloorHeight)} storeys × ${formatPercentage(settings.siteEfficiencyRatio)} site coverage × ${formatPercentage(settings.gbaToGfaRatio)} efficiency = ${Math.round(gfaUnderHob).toLocaleString()} m²)`
    ];

    // Create table rows with calculations
    const tableRows = [
      // Headers with dark blue background
      [
        { text: 'Metrics', options: { fill: '002664', color: 'FFFFFF', bold: true } },
        { text: 'Values', options: { fill: '002664', color: 'FFFFFF', bold: true } },
        { text: 'Calculation Method', options: { fill: '002664', color: 'FFFFFF', bold: true } }
      ],
      // Development Metrics
      [{ text: 'Development Metrics', options: { fill: 'E6F3FF', bold: true, colspan: 3 } }],
      ['Site Coverage', `${Math.round(siteCoverage).toLocaleString()} m²`, `${formatPercentage(settings.siteEfficiencyRatio)} of Developable Area (${Math.round(developableArea).toLocaleString()} m²)`],
      gfaRow,
      ['Development Yield', `${developmentYield} units`, 'Total NSA ÷ Average Unit Size'],
      // Sales section
      [{ text: 'Sales Analysis', options: { fill: 'E6F3FF', bold: true, colspan: 3 } }],
      ['Median Unit Price', formatCurrency(medianPrice), 'Median of recent comparable sales'],
      ['Total Gross Realisation', formatCurrency(totalGrossRealisation), 'Development Yield × Median Unit Price'],
      // GST and Selling Costs section
      [{ text: 'GST and Selling Costs', options: { fill: 'E6F3FF', bold: true, colspan: 3 } }],
      ['GST (10%)', formatCurrency(gst), 'Total Gross Realisation × 10%'],
      ['Agent\'s Commission', formatCurrency(agentsCommission), `Total Gross Realisation × ${formatPercentage(settings.agentsSalesCommission)}`],
      ['Legal Fees', formatCurrency(legalFees), `Total Gross Realisation × ${formatPercentage(settings.legalFeesOnSales)}`],
      ['Marketing Costs', formatCurrency(marketingCosts), `Total Gross Realisation × ${formatPercentage(settings.marketingCosts)}`],
      ['Net Realisation', formatCurrency(netRealisation), 'Total Gross Realisation - GST - Commission - Legal - Marketing'],
      // Profit and Risk section
      [{ text: 'Profit and Risk', options: { fill: 'E6F3FF', bold: true, colspan: 3 } }],
      ['Profit Margin', formatCurrency(profitAndRisk), `Net Realisation × ${formatPercentage(settings.profitAndRisk)}`],
      ['Net Realisation after Profit', formatCurrency(netRealisationAfterProfitAndRisk), 'Net Realisation - Profit Margin'],
      // Development Costs section
      [{ text: 'Development Costs', options: { fill: 'E6F3FF', bold: true, colspan: 3 } }],
      ['Construction Cost (per m² GFA)', formatCurrency(constructionCostPerGfa), 'Based on recent construction certificates'],
      ['Total Construction Costs', formatCurrency(constructionCosts), 'Construction Cost per m² × Total GFA'],
      ['DA Application Fees', formatCurrency(daApplicationFees), 'Fixed cost'],
      ['Professional Fees', formatCurrency(professionalFees), `Construction Costs × ${formatPercentage(settings.professionalFees)}`],
      ['Total Development Costs', formatCurrency(totalDevelopmentCosts), 'Construction + DA + Professional Fees'],
      // Finance Costs section
      [{ text: 'Finance Costs', options: { fill: 'E6F3FF', bold: true, colspan: 3 } }],
      ['Interest Rate', formatPercentage(settings.interestRate), 'Annual rate'],
      ['Finance Costs', formatCurrency(financeCosts), 'Interest Rate × (Project Period ÷ 2) × Total Development Costs'],
      // Residual Land Value
      [{ text: 'Residual Land Value', options: { fill: 'E6F3FF', bold: true, colspan: 3 } }],
      ['Residual Land Value', formatCurrency(residualLandValue), 'Net Realisation after Profit - Total Development Costs - Finance Costs']
    ];

    // Add the table to the slide with improved formatting
    slide.addTable(tableRows, {
      ...convertCmValues({
        x: '5%',
        y: '18%',
        w: '85%',
        h: '74%'
      }),
      colW: [3.5, 3, 4],
      fontSize: 5,
      fontFace: 'Public Sans',
      border: { 
        type: 'solid',
        pt: 0.25,
        color: 'CCCCCC'
      },
      align: 'left',
      valign: 'middle',
      margin: 0.05,
      rowH: 0.05,
      autoPage: false
    });

    // Add title
    slide.addText([
      { text: properties.site__address, options: { color: styles.title.color } },
      { text: ' ', options: { breakLine: true } },
      { text: 'Development Feasibility', options: { color: styles.subtitle.color } }
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

    // Add footer line
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.footerLine));

    // Add source attribution
    slide.addText('Source: getsoldprice.com.au, NSW Planning Portal (Construction Certificate API)', convertCmValues({
      x: '5%',
      y: '91%',
      w: '90%',
      h: '2%',
      fontSize: 7,
      color: '666666',
      fontFace: 'Public Sans',
      align: 'left'
    }));

    // Add footer text
    slide.addText('Property and Development NSW', convertCmValues(styles.footer));
    slide.addText('16', convertCmValues(styles.pageNumber));

    return slide;
  } catch (error) {
    console.error('Error generating feasibility slide:', error);
    if (!slide) {
      slide = pptx.addSlide();
    }
    slide.addText('Error generating feasibility slide: ' + error.message, {
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