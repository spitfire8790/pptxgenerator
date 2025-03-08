import { convertCmValues } from '../utils/units';
import { supabase } from '../utils/supabaseClient';
import { lgaMapping } from '../utils/map/utils/councilLgaMapping';

// Default values for configurable inputs
const DEFAULT_SETTINGS = {
  lowMidDensity: {
    siteEfficiencyRatio: 0.6, // 60%
    floorToFloorHeight: 3.1, // meters
    gbaToGfaRatio: 0.9, // 90%
    gfaToNsaRatio: 0.85, // 85%
    agentsSalesCommission: 0.02, // 2%
    legalFeesOnSales: 0.005, // 0.5%
    marketingCosts: 0.0075, // 0.75%
    profitAndRisk: 0.20, // 20%
    daApplicationFees: 200000, // $200,000
    developmentContribution: 0.01, // 1%
    professionalFees: 0.05, // 5%
    interestRate: 0.075, // 7.5%
    projectPeriod: 24, // months
  },
  highDensity: {
    siteEfficiencyRatio: 0.4, // 40%
    floorToFloorHeight: 3.1, // meters
    gbaToGfaRatio: 0.75, // 75%
    gfaToNsaRatio: 0.85, // 85%
    agentsSalesCommission: 0.02, // 2%
    legalFeesOnSales: 0.005, // 0.5%
    marketingCosts: 0.0075, // 0.75%
    profitAndRisk: 0.20, // 20%
    daApplicationFees: 200000, // $200,000
    developmentContribution: 0.01, // 1%
    professionalFees: 0.05, // 5%
    interestRate: 0.075, // 7.5%
    projectPeriod: 24, // months
  }
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

export async function addFeasibilitySlide(pptx, properties, userSettings = {}) {
  let lowMidDensitySlide, highDensitySlide;
  try {
    console.log('Starting to add feasibility slide with properties:', {
      suburb: properties?.site_suitability__suburb,
      FSR: properties?.copiedFrom?.site_suitability__floorspace_ratio,
      HOB: properties?.copiedFrom?.site_suitability__height_of_building,
      area: properties?.copiedFrom?.site_suitability__area
    });

    // Create two slides - one for each density type
    lowMidDensitySlide = pptx.addSlide();
    highDensitySlide = pptx.addSlide();

    // Merge default settings with user settings for both density types
    const settings = {
      lowMidDensity: { ...DEFAULT_SETTINGS.lowMidDensity, ...userSettings.lowMidDensity },
      highDensity: { ...DEFAULT_SETTINGS.highDensity, ...userSettings.highDensity }
    };

    // Function to generate feasibility analysis for a given density type
    const generateFeasibilityAnalysis = (slide, settings, densityType) => {
      // Calculate developable area and site coverage
      const developableArea = properties?.copiedFrom?.site_suitability__area || 0;
      // Get the site area (which may be larger than the developable area)
      const siteArea = properties?.copiedFrom?.site_area || developableArea;
      const siteCoverage = developableArea * settings.siteEfficiencyRatio;

      // Calculate GFA under FSR and HOB
      const fsr = properties?.copiedFrom?.site_suitability__floorspace_ratio || 0;
      const hob = properties?.copiedFrom?.site_suitability__height_of_building || 0;

      // Use site area for FSR calculation
      const gfaUnderFsr = siteArea * fsr;
      
      // Calculate GFA under HOB
      const maxStoreys = Math.floor(hob / settings.floorToFloorHeight);
      const gfaUnderHob = siteCoverage * maxStoreys * settings.gbaToGfaRatio;

      // Use FSR value if no HoB exists, otherwise use the lower of the two
      const gfa = !hob ? gfaUnderFsr : Math.min(gfaUnderFsr, gfaUnderHob);

      // Calculate NSA and development yield
      const nsa = gfa * settings.gfaToNsaRatio;
      
      // Get dwelling size from construction data or use default
      const dwellingSize = properties.constructionData?.dwellingSizes?.[densityType.toLowerCase().replace('-', '')] || 80; // Default fallback
      
      // Calculate development yield using dwelling size from construction data
      const developmentYield = Math.floor(nsa / dwellingSize);

      // Get dwelling price from settings
      const dwellingPrice = settings.dwellingPrice || 750000; // Default fallback

      // Calculate total gross realisation
      const totalGrossRealisation = developmentYield * dwellingPrice;

      // Calculate GST and selling costs
      const gst = totalGrossRealisation * 0.1;
      const agentsCommission = totalGrossRealisation * settings.agentsSalesCommission;
      const legalFees = totalGrossRealisation * settings.legalFeesOnSales;
      const marketingCosts = totalGrossRealisation * settings.marketingCosts;
      const netRealisation = totalGrossRealisation - gst - agentsCommission - legalFees - marketingCosts;

      // Calculate profit and risk
      const profitAndRisk = netRealisation * settings.profitAndRisk;
      const netRealisationAfterProfitAndRisk = netRealisation - profitAndRisk;

      // Get construction cost
      const constructionCostPerGfa = properties.constructionData?.[densityType.toLowerCase().replace('-', '')] || 3500; // Default fallback
      
      // Calculate development costs
      const constructionCosts = constructionCostPerGfa * gfa;
      const daApplicationFees = settings.daApplicationFees;
      const professionalFees = constructionCosts * settings.professionalFees;
      
      // Calculate Development Contribution
      const developmentContribution = constructionCosts * settings.developmentContribution;
      
      // Calculate Land Tax
      const propertyValue = properties?.copiedFrom?.site_suitability__property_value || 0;
      const generalThreshold = 1000000; // $1,000,000 threshold
      const premiumThreshold = 4000000; // $4,000,000 threshold
      
      let landTaxPerYear = 0;
      if (propertyValue > premiumThreshold) {
        // Premium threshold: $88,036 plus 2% of land value above the threshold
        landTaxPerYear = 88036 + (propertyValue - premiumThreshold) * 0.02;
      } else if (propertyValue > generalThreshold) {
        // General threshold: $100 plus 1.6% of land value above the threshold up to the premium threshold
        landTaxPerYear = 100 + (propertyValue - generalThreshold) * 0.016;
      }
      
      // Calculate total Land Tax for the project period
      const projectYears = settings.projectPeriod / 12;
      const landTax = landTaxPerYear * projectYears;

      const totalDevelopmentCosts = constructionCosts + daApplicationFees + professionalFees + developmentContribution;

      // Calculate finance costs
      const monthlyInterestRate = settings.interestRate / 12;
      const financeCosts = monthlyInterestRate * (settings.projectPeriod / 2) * totalDevelopmentCosts;

      // Calculate residual land value
      const residualLandValue = netRealisationAfterProfitAndRisk - totalDevelopmentCosts - financeCosts - landTax;
      
      // Calculate residual land value per m²
      const residualLandValuePerM2 = residualLandValue / developableArea;

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
        ['Building Footprint', `${Math.round(siteCoverage).toLocaleString()} m²`, `${formatPercentage(settings.siteEfficiencyRatio)} of Developable Area (${Math.round(developableArea).toLocaleString()} m²)`],
        ['Gross Floor Area (GFA)', `${Math.round(gfa).toLocaleString()} m²`, 
          !hob 
            ? `FSR ${fsr}:1 (${Math.round(siteArea).toLocaleString()} m² × ${fsr} = ${Math.round(gfaUnderFsr).toLocaleString()} m²)`
            : `Minimum of two calculations:
1) FSR approach: ${fsr}:1 (${Math.round(siteArea).toLocaleString()} m² × ${fsr} = ${Math.round(gfaUnderFsr).toLocaleString()} m²)
2) HOB approach: ${hob}m (${Math.floor(hob / settings.floorToFloorHeight)} storeys × ${formatPercentage(settings.siteEfficiencyRatio)} building footprint × ${formatPercentage(settings.gbaToGfaRatio)} efficiency = ${Math.round(gfaUnderHob).toLocaleString()} m²)`
        ],
        ['Development Yield', `${developmentYield} units`, `Total NSA (${Math.round(nsa).toLocaleString()} m²) ÷ Average Unit Size (${Math.round(dwellingSize).toLocaleString()} m²)`],
        
        // Sales Analysis
        [{ text: 'Sales Analysis', options: { fill: 'E6F3FF', bold: true, colspan: 3 } }],
        ['Median Unit Price', formatCurrency(dwellingPrice), 'Based on sales data'],
        [{ text: 'Total Gross Realisation', options: { bold: true, fill: 'F2F2F2' } }, 
         { text: formatCurrency(totalGrossRealisation), options: { bold: true, fill: 'F2F2F2' } }, 
         { text: 'Development Yield × Median Unit Price', options: { fill: 'F2F2F2' } }],
        
        // GST and Selling Costs
        [{ text: 'GST and Selling Costs', options: { fill: 'E6F3FF', bold: true, colspan: 3 } }],
        ['GST (10%)', formatCurrency(gst), 'Total Gross Realisation × 10%'],
        ['Agent\'s Commission', formatCurrency(agentsCommission), `Total Gross Realisation × ${formatPercentage(settings.agentsSalesCommission)}`],
        ['Legal Fees', formatCurrency(legalFees), `Total Gross Realisation × ${formatPercentage(settings.legalFeesOnSales)}`],
        ['Marketing Costs', formatCurrency(marketingCosts), `Total Gross Realisation × ${formatPercentage(settings.marketingCosts)}`],
        [{ text: 'Net Realisation', options: { bold: true, fill: 'F2F2F2' } }, 
         { text: formatCurrency(netRealisation), options: { bold: true, fill: 'F2F2F2' } }, 
         { text: 'Total Gross Realisation - GST - Commission - Legal - Marketing', options: { fill: 'F2F2F2' } }],
        
        // Profit and Risk
        [{ text: 'Profit and Risk', options: { fill: 'E6F3FF', bold: true, colspan: 3 } }],
        ['Profit Margin', formatCurrency(profitAndRisk), `Net Realisation × ${formatPercentage(settings.profitAndRisk)}`],
        [{ text: 'Net Realisation after Profit', options: { bold: true, fill: 'F2F2F2' } }, 
         { text: formatCurrency(netRealisationAfterProfitAndRisk), options: { bold: true, fill: 'F2F2F2' } }, 
         { text: 'Net Realisation - Profit Margin', options: { fill: 'F2F2F2' } }],
        
        // Development Costs
        [{ text: 'Development Costs', options: { fill: 'E6F3FF', bold: true, colspan: 3 } }],
        ['Construction Cost (per m² GFA)', formatCurrency(constructionCostPerGfa), 'Based on recent construction certificates'],
        ['Total Construction Costs', formatCurrency(constructionCosts), 'Construction Cost per m² × Total GFA'],
        ['DA Application Fees', formatCurrency(daApplicationFees), 'Fixed cost'],
        ['Professional Fees', formatCurrency(professionalFees), `Construction Costs × ${formatPercentage(settings.professionalFees)}`],
        ['Development Contribution', formatCurrency(developmentContribution), `Construction Costs × ${formatPercentage(settings.developmentContribution)}`],
        [{ text: 'Total Development Costs', options: { bold: true, fill: 'F2F2F2' } }, 
         { text: formatCurrency(totalDevelopmentCosts), options: { bold: true, fill: 'F2F2F2' } }, 
         { text: 'Construction + DA + Professional Fees + Development Contribution', options: { fill: 'F2F2F2' } }],
        
        // Finance and Holding Costs
        [{ text: 'Finance and Holding Costs', options: { fill: 'E6F3FF', bold: true, colspan: 3 } }],
        ['Land Tax', formatCurrency(landTax), `Annual Land Tax (${formatCurrency(landTaxPerYear)}) × Project Duration (${projectYears.toFixed(1)} years)`],
        ['Interest Rate', formatPercentage(settings.interestRate), 'Annual rate'],
        ['Finance Costs', formatCurrency(financeCosts), 'Interest Rate × (Project Period ÷ 2) × Total Development Costs'],
        
        // Residual Land Value
        [{ text: 'Residual Land Value', options: { fill: 'E6F3FF', bold: true, colspan: 3 } }],
        [{ text: 'Residual Land Value', options: { bold: true, fill: 'F2F2F2' } }, 
         { text: formatCurrency(residualLandValue), options: { bold: true, fill: 'F2F2F2' } }, 
         { text: 'Net Realisation after Profit - Total Development Costs - Finance Costs - Land Tax', options: { fill: 'F2F2F2' } }]
      ];

      // Add title
      slide.addText([
        { text: properties.formatted_address || properties.site__address, options: { color: styles.title.color } },
        { text: ' ', options: { breakLine: true } },
        { text: `Development Feasibility - ${densityType}`, options: { color: styles.subtitle.color } }
      ], convertCmValues(styles.title));

      // Add horizontal line under title
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.titleLine));

      // Add sensitive text
      slide.addText("SENSITIVE: NSW GOVERNMENT", convertCmValues(styles.sensitiveText));

      // Add NSW Logo
      slide.addImage({
        path: "/images/NSW-Government-official-logo.jpg",
        ...convertCmValues(styles.nswLogo)
      });

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

      // Add footer line
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.footerLine));

      // Add source attribution
      slide.addText(`Source: NSW Planning Portal, Property and Development NSW Feasibility Analysis`, convertCmValues({
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
    };

    // Generate feasibility analysis for both density types
    generateFeasibilityAnalysis(lowMidDensitySlide, settings.lowMidDensity, 'Low-Mid Density');
    generateFeasibilityAnalysis(highDensitySlide, settings.highDensity, 'High Density');

    return [lowMidDensitySlide, highDensitySlide];
  } catch (error) {
    console.error('Error generating feasibility slide:', error);
    if (!lowMidDensitySlide) {
      lowMidDensitySlide = pptx.addSlide();
    }
    lowMidDensitySlide.addText('Error generating feasibility slide: ' + error.message, {
      x: '10%',
      y: '45%',
      w: '80%',
      h: '10%',
      fontSize: 14,
      color: 'FF0000',
      align: 'center'
    });
    return [lowMidDensitySlide];
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