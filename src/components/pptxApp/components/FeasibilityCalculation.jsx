import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine
} from 'recharts';
import { Calculator, TrendingUp, DollarSign, HardHat, Percent, Home } from 'lucide-react';

// Helper function to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper function to format currency in millions
const formatCurrencyInMillions = (amount) => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(amount / 1000000) + 'M';
};

// Helper function to format percentage
const formatPercentage = (value) => {
  return new Intl.NumberFormat('en-AU', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
};

const FeasibilityCalculation = ({ settings, density, selectedFeature, salesData, constructionData }) => {
  const [calculationResults, setCalculationResults] = useState(null);
  const [sensitivityData, setSensitivityData] = useState({
    housingImpact: []
  });

  // Calculate feasibility based on current settings
  useEffect(() => {
    if (!settings || !selectedFeature) return;

    const results = calculateFeasibility(settings, density, selectedFeature);
    setCalculationResults(results);

    // Generate sensitivity analysis data
    const housingImpactData = generateHousingImpactAnalysis(settings, density, selectedFeature, results);

    setSensitivityData({
      housingImpact: housingImpactData
    });
  }, [settings, density, selectedFeature]);

  // Main feasibility calculation function
  const calculateFeasibility = (settings, density, propertyData) => {
    const currentSettings = settings[density];
    
    // Calculate developable area and site coverage
    const developableArea = propertyData?.properties?.copiedFrom?.site_suitability__area || 0;
    // Get the site area (which may be larger than the developable area)
    const siteArea = propertyData?.properties?.copiedFrom?.site_area || developableArea;
    const siteCoverage = developableArea * currentSettings.siteEfficiencyRatio;

    // Calculate GFA under FSR and HOB
    const fsr = propertyData?.properties?.copiedFrom?.site_suitability__floorspace_ratio || 0;
    const hob = propertyData?.properties?.copiedFrom?.site_suitability__height_of_building || 0;

    // Use site area for FSR calculation
    const gfaUnderFsr = siteArea * fsr;
    
    // Calculate GFA under HOB
    const maxStoreys = Math.floor(hob / currentSettings.floorToFloorHeight);
    const gfaUnderHob = siteCoverage * maxStoreys * currentSettings.gbaToGfaRatio;

    // Use FSR value if no HoB exists, otherwise use the lower of the two
    const gfa = !hob ? gfaUnderFsr : Math.min(gfaUnderFsr, gfaUnderHob);

    // Calculate NSA and development yield
    const nsa = gfa * currentSettings.gfaToNsaRatio;
    
    // Get dwelling size from construction data or use default
    const dwellingSize = constructionData?.dwellingSizes?.[density] || 80; // Default fallback
    
    // Calculate development yield using dwelling size from construction data
    const developmentYield = Math.floor(nsa / dwellingSize);

    // Calculate total gross realisation
    const totalGrossRealisation = developmentYield * currentSettings.dwellingPrice;

    // Calculate GST and selling costs
    const gst = totalGrossRealisation * 0.1;
    const agentsCommission = totalGrossRealisation * currentSettings.agentsSalesCommission;
    const legalFees = totalGrossRealisation * currentSettings.legalFeesOnSales;
    const marketingCosts = totalGrossRealisation * currentSettings.marketingCosts;
    const netRealisation = totalGrossRealisation - gst - agentsCommission - legalFees - marketingCosts;

    // Calculate profit and risk
    const profitAndRisk = netRealisation * currentSettings.profitAndRisk;
    const netRealisationAfterProfitAndRisk = netRealisation - profitAndRisk;

    // Get construction cost
    const constructionCostPerGfa = constructionData?.[density] || 3500; // Default fallback
    
    // Calculate development costs
    const constructionCosts = constructionCostPerGfa * gfa;
    const daApplicationFees = currentSettings.daApplicationFees;
    const professionalFees = constructionCosts * currentSettings.professionalFees;
    
    // Calculate Development Contribution
    const developmentContribution = constructionCosts * currentSettings.developmentContribution;
    
    // Calculate Land Tax
    const propertyValue = propertyData?.properties?.copiedFrom?.site_suitability__property_value || 0;
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
    const projectYears = currentSettings.projectPeriod / 12;
    const landTax = landTaxPerYear * projectYears;

    const totalDevelopmentCosts = constructionCosts + daApplicationFees + professionalFees + developmentContribution;

    // Calculate finance costs
    const monthlyInterestRate = currentSettings.interestRate / 12;
    const financeCosts = monthlyInterestRate * (currentSettings.projectPeriod / 2) * totalDevelopmentCosts;

    // Calculate residual land value
    const residualLandValue = netRealisationAfterProfitAndRisk - totalDevelopmentCosts - financeCosts - landTax;
    
    // Calculate residual land value per m²
    const residualLandValuePerM2 = residualLandValue / developableArea;

    return {
      developableArea,
      siteArea,
      siteCoverage,
      fsr,
      hob,
      gfaUnderFsr,
      gfaUnderHob,
      gfa,
      nsa,
      dwellingSize,
      developmentYield,
      totalGrossRealisation,
      gst,
      agentsCommission,
      legalFees,
      marketingCosts,
      netRealisation,
      profitAndRisk,
      netRealisationAfterProfitAndRisk,
      constructionCostPerGfa,
      constructionCosts,
      daApplicationFees,
      professionalFees,
      developmentContribution,
      propertyValue,
      landTaxPerYear,
      landTax,
      totalDevelopmentCosts,
      financeCosts,
      residualLandValue,
      residualLandValuePerM2,
      projectPeriod: currentSettings.projectPeriod
    };
  };

  // Generate social/affordable housing impact analysis data
  const generateHousingImpactAnalysis = (settings, density, propertyData, baseResults) => {
    // Update percentages to include more values up to 100%
    const percentages = [0, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100];
    const basePrice = settings[density].dwellingPrice;
    const data = [];
    
    // For each percentage, calculate three scenarios:
    // 1. All social housing (0% revenue)
    // 2. All affordable housing (75% revenue)
    // 3. 50/50 mix of social and affordable housing
    
    percentages.forEach(percentage => {
      // Calculate the number of dwellings affected
      const totalDwellings = baseResults.developmentYield;
      const affectedDwellings = Math.round(totalDwellings * (percentage / 100));
      
      if (affectedDwellings === 0 && percentage !== 0) return;
      
      // Create modified settings for each scenario
      const modifiedSettings = JSON.parse(JSON.stringify(settings));
      
      // Scenario 1: All social housing (0% revenue)
      const socialSettings = JSON.parse(JSON.stringify(modifiedSettings));
      const socialDwellings = affectedDwellings;
      const marketDwellings = totalDwellings - socialDwellings;
      
      // Adjust total gross realisation for social housing (0% revenue for social dwellings)
      const socialTotalGrossRealisation = marketDwellings * basePrice;
      
      // Calculate feasibility with modified values
      const socialResults = { ...calculateFeasibility(socialSettings, density, propertyData) };
      socialResults.totalGrossRealisation = socialTotalGrossRealisation;
      socialResults.gst = socialTotalGrossRealisation * 0.1;
      socialResults.agentsCommission = socialTotalGrossRealisation * settings[density].agentsSalesCommission;
      socialResults.legalFees = socialTotalGrossRealisation * settings[density].legalFeesOnSales;
      socialResults.marketingCosts = socialTotalGrossRealisation * settings[density].marketingCosts;
      socialResults.netRealisation = socialTotalGrossRealisation - socialResults.gst - socialResults.agentsCommission - socialResults.legalFees - socialResults.marketingCosts;
      socialResults.profitAndRisk = socialResults.netRealisation * settings[density].profitAndRisk;
      socialResults.netRealisationAfterProfitAndRisk = socialResults.netRealisation - socialResults.profitAndRisk;
      socialResults.residualLandValue = socialResults.netRealisationAfterProfitAndRisk - socialResults.totalDevelopmentCosts - socialResults.financeCosts;
      socialResults.residualLandValuePerM2 = socialResults.residualLandValue / socialResults.developableArea;
      
      // Scenario 2: All affordable housing (75% revenue)
      const affordableSettings = JSON.parse(JSON.stringify(modifiedSettings));
      const affordableDwellings = affectedDwellings;
      const affordableMarketDwellings = totalDwellings - affordableDwellings;
      
      // Adjust total gross realisation for affordable housing (75% revenue for affordable dwellings)
      const affordableTotalGrossRealisation = (affordableMarketDwellings * basePrice) + (affordableDwellings * basePrice * 0.75);
      
      // Calculate feasibility with modified values
      const affordableResults = { ...calculateFeasibility(affordableSettings, density, propertyData) };
      affordableResults.totalGrossRealisation = affordableTotalGrossRealisation;
      affordableResults.gst = affordableTotalGrossRealisation * 0.1;
      affordableResults.agentsCommission = affordableTotalGrossRealisation * settings[density].agentsSalesCommission;
      affordableResults.legalFees = affordableTotalGrossRealisation * settings[density].legalFeesOnSales;
      affordableResults.marketingCosts = affordableTotalGrossRealisation * settings[density].marketingCosts;
      affordableResults.netRealisation = affordableTotalGrossRealisation - affordableResults.gst - affordableResults.agentsCommission - affordableResults.legalFees - affordableResults.marketingCosts;
      affordableResults.profitAndRisk = affordableResults.netRealisation * settings[density].profitAndRisk;
      affordableResults.netRealisationAfterProfitAndRisk = affordableResults.netRealisation - affordableResults.profitAndRisk;
      affordableResults.residualLandValue = affordableResults.netRealisationAfterProfitAndRisk - affordableResults.totalDevelopmentCosts - affordableResults.financeCosts;
      affordableResults.residualLandValuePerM2 = affordableResults.residualLandValue / affordableResults.developableArea;
      
      // Scenario 3: 50/50 mix of social and affordable housing
      const mixedSettings = JSON.parse(JSON.stringify(modifiedSettings));
      const mixedSocialDwellings = Math.floor(affectedDwellings / 2);
      const mixedAffordableDwellings = affectedDwellings - mixedSocialDwellings;
      const mixedMarketDwellings = totalDwellings - mixedSocialDwellings - mixedAffordableDwellings;
      
      // Adjust total gross realisation for mixed housing
      const mixedTotalGrossRealisation = (mixedMarketDwellings * basePrice) + (mixedAffordableDwellings * basePrice * 0.75);
      
      // Calculate feasibility with modified values
      const mixedResults = { ...calculateFeasibility(mixedSettings, density, propertyData) };
      mixedResults.totalGrossRealisation = mixedTotalGrossRealisation;
      mixedResults.gst = mixedTotalGrossRealisation * 0.1;
      mixedResults.agentsCommission = mixedTotalGrossRealisation * settings[density].agentsSalesCommission;
      mixedResults.legalFees = mixedTotalGrossRealisation * settings[density].legalFeesOnSales;
      mixedResults.marketingCosts = mixedTotalGrossRealisation * settings[density].marketingCosts;
      mixedResults.netRealisation = mixedTotalGrossRealisation - mixedResults.gst - mixedResults.agentsCommission - mixedResults.legalFees - mixedResults.marketingCosts;
      mixedResults.profitAndRisk = mixedResults.netRealisation * settings[density].profitAndRisk;
      mixedResults.netRealisationAfterProfitAndRisk = mixedResults.netRealisation - mixedResults.profitAndRisk;
      mixedResults.residualLandValue = mixedResults.netRealisationAfterProfitAndRisk - mixedResults.totalDevelopmentCosts - mixedResults.financeCosts;
      mixedResults.residualLandValuePerM2 = mixedResults.residualLandValue / mixedResults.developableArea;
      
      data.push({
        percentage,
        socialResidualLandValue: socialResults.residualLandValue,
        socialPercentChange: Math.round((socialResults.residualLandValue - baseResults.residualLandValue) / baseResults.residualLandValue * 100),
        affordableResidualLandValue: affordableResults.residualLandValue,
        affordablePercentChange: Math.round((affordableResults.residualLandValue - baseResults.residualLandValue) / baseResults.residualLandValue * 100),
        mixedResidualLandValue: mixedResults.residualLandValue,
        mixedPercentChange: Math.round((mixedResults.residualLandValue - baseResults.residualLandValue) / baseResults.residualLandValue * 100),
        // Add actual unit counts for clarity
        totalDwellings,
        socialDwellings,
        affordableDwellings,
        mixedSocialDwellings,
        mixedAffordableDwellings
      });
    });
    
    // Calculate breakeven points (where residual land value becomes negative)
    const calculateBreakeven = (dataPoints, valueKey) => {
      // Find the first negative value
      const firstNegativeIndex = dataPoints.findIndex(point => point[valueKey] < 0);
      
      // If no negative values found, return null
      if (firstNegativeIndex === -1) return null;
      
      // If the first data point is already negative, return 0
      if (firstNegativeIndex === 0) return 0;
      
      // Get the points before and after the breakeven
      const beforePoint = dataPoints[firstNegativeIndex - 1];
      const afterPoint = dataPoints[firstNegativeIndex];
      
      // Linear interpolation to find the exact breakeven percentage
      const beforeValue = beforePoint[valueKey];
      const afterValue = afterPoint[valueKey];
      const beforePercentage = beforePoint.percentage;
      const afterPercentage = afterPoint.percentage;
      
      // Calculate the interpolated percentage where value = 0
      const interpolatedPercentage = beforePercentage + 
        (0 - beforeValue) * (afterPercentage - beforePercentage) / (afterValue - beforeValue);
      
      // Calculate the number of units at this percentage
      const totalDwellings = beforePoint.totalDwellings; // Same for all points
      const units = Math.round(totalDwellings * (interpolatedPercentage / 100));
      
      return {
        percentage: interpolatedPercentage,
        units
      };
    };
    
    // Calculate breakeven points for each scenario
    const socialBreakeven = calculateBreakeven(data, 'socialResidualLandValue');
    const affordableBreakeven = calculateBreakeven(data, 'affordableResidualLandValue');
    const mixedBreakeven = calculateBreakeven(data, 'mixedResidualLandValue');
    
    return {
      data,
      breakeven: {
        social: socialBreakeven,
        affordable: affordableBreakeven,
        mixed: mixedBreakeven
      }
    };
  };

  // If no calculation results yet, show loading
  if (!calculationResults) {
    return <div className="p-4 text-center">Loading calculations...</div>;
  }

  // Helper component to display breakeven information
  const BreaKevenInfo = ({ breakeven, totalDwellings }) => {
    if (!breakeven) return <div className="text-gray-500">Site feasible at 100%</div>;
    
    return (
      <div className="flex flex-col">
        <span className="font-semibold">{breakeven.units} units ({Math.round(breakeven.percentage)}%)</span>
        <span className="text-sm text-gray-500">of {totalDwellings} total units</span>
      </div>
    );
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <Calculator className="mr-2" /> Feasibility Calculation - {density === 'lowMidDensity' ? 'Low-Mid Density' : 'High Density'}
      </h2>
      
      {/* Feasibility Calculation Table */}
      <div className="mb-8 overflow-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-blue-900 text-white">
              <th className="py-2 px-4 text-left">Metrics</th>
              <th className="py-2 px-4 text-left">Values</th>
              <th className="py-2 px-4 text-left text-sm">Calculation Method</th>
            </tr>
          </thead>
          <tbody>
            {/* Development Metrics */}
            <tr className="bg-blue-50">
              <td colSpan="3" className="py-2 px-4 font-bold">Development Metrics</td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">Building Footprint</td>
              <td className="py-2 px-4 border-t border-gray-200">{Math.round(calculationResults.siteCoverage).toLocaleString()} m²</td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">{formatPercentage(settings[density].siteEfficiencyRatio)} of Developable Area ({Math.round(calculationResults.developableArea).toLocaleString()} m²)</td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">Gross Floor Area (GFA)</td>
              <td className="py-2 px-4 border-t border-gray-200">{Math.round(calculationResults.gfa).toLocaleString()} m²</td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">
                {!calculationResults.hob 
                  ? `FSR ${calculationResults.fsr}:1 (${Math.round(calculationResults.siteArea).toLocaleString()} m² × ${calculationResults.fsr} = ${Math.round(calculationResults.gfaUnderFsr).toLocaleString()} m²)`
                  : `Minimum of two calculations:
1) FSR approach: ${calculationResults.fsr}:1 (${Math.round(calculationResults.siteArea).toLocaleString()} m² × ${calculationResults.fsr} = ${Math.round(calculationResults.gfaUnderFsr).toLocaleString()} m²)
2) HOB approach: ${calculationResults.hob}m (${Math.floor(calculationResults.hob / settings[density].floorToFloorHeight)} storeys × ${formatPercentage(settings[density].siteEfficiencyRatio)} building footprint × ${formatPercentage(settings[density].gbaToGfaRatio)} efficiency = ${Math.round(calculationResults.gfaUnderHob).toLocaleString()} m²)`
                }
              </td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">Development Yield</td>
              <td className="py-2 px-4 border-t border-gray-200">{calculationResults.developmentYield} units</td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">Total NSA ({Math.round(calculationResults.nsa).toLocaleString()} m²) ÷ Average Unit Size ({Math.round(calculationResults.dwellingSize).toLocaleString()} m²)</td>
            </tr>
            
            {/* Sales Analysis */}
            <tr className="bg-blue-50">
              <td colSpan="3" className="py-2 px-4 font-bold">Sales Analysis</td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">Median Unit Price</td>
              <td className="py-2 px-4 border-t border-gray-200">{formatCurrency(settings[density].dwellingPrice)}</td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">Based on sales data</td>
            </tr>
            <tr className="bg-gray-200">
              <td className="py-2 px-4 border-t border-gray-200 font-bold">Total Gross Realisation</td>
              <td className="py-2 px-4 border-t border-gray-200 font-bold">{formatCurrency(calculationResults.totalGrossRealisation)}</td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">Development Yield × Median Unit Price</td>
            </tr>
            
            {/* GST and Selling Costs */}
            <tr className="bg-blue-50">
              <td colSpan="3" className="py-2 px-4 font-bold">GST and Selling Costs</td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">GST (10%)</td>
              <td className="py-2 px-4 border-t border-gray-200">{formatCurrency(calculationResults.gst)}</td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">Total Gross Realisation × 10%</td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">Agent's Commission</td>
              <td className="py-2 px-4 border-t border-gray-200">{formatCurrency(calculationResults.agentsCommission)}</td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">Total Gross Realisation × {formatPercentage(settings[density].agentsSalesCommission)}</td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">Legal Fees</td>
              <td className="py-2 px-4 border-t border-gray-200">{formatCurrency(calculationResults.legalFees)}</td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">Total Gross Realisation × {formatPercentage(settings[density].legalFeesOnSales)}</td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">Marketing Costs</td>
              <td className="py-2 px-4 border-t border-gray-200">{formatCurrency(calculationResults.marketingCosts)}</td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">Total Gross Realisation × {formatPercentage(settings[density].marketingCosts)}</td>
            </tr>
            <tr className="bg-gray-200">
              <td className="py-2 px-4 border-t border-gray-200 font-bold">Net Realisation</td>
              <td className="py-2 px-4 border-t border-gray-200 font-bold">{formatCurrency(calculationResults.netRealisation)}</td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">Total Gross Realisation - GST - Commission - Legal - Marketing</td>
            </tr>
            
            {/* Profit and Risk */}
            <tr className="bg-blue-50">
              <td colSpan="3" className="py-2 px-4 font-bold">Profit and Risk</td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">Profit Margin</td>
              <td className="py-2 px-4 border-t border-gray-200">{formatCurrency(calculationResults.profitAndRisk)}</td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">Net Realisation × {formatPercentage(settings[density].profitAndRisk)}</td>
            </tr>
            <tr className="bg-gray-200">
              <td className="py-2 px-4 border-t border-gray-200 font-bold">Net Realisation after Profit</td>
              <td className="py-2 px-4 border-t border-gray-200 font-bold">{formatCurrency(calculationResults.netRealisationAfterProfitAndRisk)}</td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">Net Realisation - Profit Margin</td>
            </tr>
            
            {/* Development Costs */}
            <tr className="bg-blue-50">
              <td colSpan="3" className="py-2 px-4 font-bold">Development Costs</td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">Construction Cost (per m² GFA)</td>
              <td className="py-2 px-4 border-t border-gray-200">{formatCurrency(calculationResults.constructionCostPerGfa)}</td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">Based on recent construction certificates</td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">Total Construction Costs</td>
              <td className="py-2 px-4 border-t border-gray-200">{formatCurrency(calculationResults.constructionCosts)}</td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">Construction Cost per m² × Total GFA</td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">DA Application Fees</td>
              <td className="py-2 px-4 border-t border-gray-200">{formatCurrency(calculationResults.daApplicationFees)}</td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">Fixed cost</td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">Professional Fees</td>
              <td className="py-2 px-4 border-t border-gray-200">{formatCurrency(calculationResults.professionalFees)}</td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">Construction Costs × {formatPercentage(settings[density].professionalFees)}</td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">Development Contribution</td>
              <td className="py-2 px-4 border-t border-gray-200">{formatCurrency(calculationResults.developmentContribution)}</td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">Construction Costs × {formatPercentage(settings[density].developmentContribution)}</td>
            </tr>
            <tr className="bg-gray-200">
              <td className="py-2 px-4 border-t border-gray-200 font-bold">Total Development Costs</td>
              <td className="py-2 px-4 border-t border-gray-200 font-bold">{formatCurrency(calculationResults.totalDevelopmentCosts)}</td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">Construction + DA + Professional Fees + Development Contribution</td>
            </tr>
            
            {/* Finance Costs */}
            <tr className="bg-blue-50">
              <td colSpan="3" className="py-2 px-4 font-bold">Finance and Holding Costs</td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">Land Tax</td>
              <td className="py-2 px-4 border-t border-gray-200">{formatCurrency(calculationResults.landTax)}</td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">
                Annual Land Tax ({formatCurrency(calculationResults.landTaxPerYear)}) × Project Duration ({(calculationResults.projectPeriod / 12).toFixed(1)} years)
                <a 
                  href="https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/land-tax#thresholds" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-500 hover:text-blue-700 ml-2"
                >
                  (NSW Land Tax Info)
                </a>
              </td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">Interest Rate</td>
              <td className="py-2 px-4 border-t border-gray-200">{formatPercentage(settings[density].interestRate)}</td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">Annual rate</td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">Finance Costs</td>
              <td className="py-2 px-4 border-t border-gray-200">{formatCurrency(calculationResults.financeCosts)}</td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">Interest Rate × (Project Period ÷ 2) × Total Development Costs</td>
            </tr>
            
            {/* Residual Land Value */}
            <tr className="bg-blue-50">
              <td colSpan="3" className="py-2 px-4 font-bold">Residual Land Value</td>
            </tr>
            <tr className="bg-gray-200">
              <td className="py-2 px-4 border-t border-gray-200 font-bold">Residual Land Value</td>
              <td className="py-2 px-4 border-t border-gray-200 font-bold">{formatCurrency(calculationResults.residualLandValue)}</td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">Net Realisation after Profit - Total Development Costs - Finance Costs - Land Tax</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Sensitivity Analysis Charts */}
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <TrendingUp className="mr-2" /> Sensitivity Analysis
        </h3>
        
        <div className="grid grid-cols-1 gap-6">
          {/* Social/Affordable Housing Impact Chart */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-md font-bold mb-2 flex items-center">
              <Home className="mr-2" size={16} /> Social/Affordable Housing Impact on Residual Land Value
            </h4>
            
            {/* Breakeven Points Display */}
            <div className="mb-4 grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex flex-col items-center">
                <h5 className="font-semibold text-red-600 mb-1">Social Housing Breakeven</h5>
                <BreaKevenInfo 
                  breakeven={sensitivityData.housingImpact.breakeven?.social} 
                  totalDwellings={calculationResults.developmentYield} 
                />
              </div>
              <div className="flex flex-col items-center">
                <h5 className="font-semibold text-green-600 mb-1">Affordable Housing Breakeven</h5>
                <BreaKevenInfo 
                  breakeven={sensitivityData.housingImpact.breakeven?.affordable} 
                  totalDwellings={calculationResults.developmentYield} 
                />
              </div>
              <div className="flex flex-col items-center">
                <h5 className="font-semibold text-purple-600 mb-1">Mixed Housing Breakeven</h5>
                <BreaKevenInfo 
                  breakeven={sensitivityData.housingImpact.breakeven?.mixed} 
                  totalDwellings={calculationResults.developmentYield} 
                />
              </div>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={sensitivityData.housingImpact.data}
                  margin={{ top: 5, right: 30, left: 25, bottom: 45 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="percentage" 
                    label={{ value: 'Percentage of Total Dwellings (%)', position: 'insideBottom', offset: -5 }} 
                    domain={[0, 100]}
                    ticks={[0, 20, 40, 60, 80, 100]}
                    padding={{ left: 0, right: 10 }}
                  />
                  <YAxis 
                    tickFormatter={(value) => formatCurrencyInMillions(value)}
                    domain={['auto', 'auto']}
                    padding={{ top: 10, bottom: 10 }}
                  />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value), 'Residual Land Value']}
                    labelFormatter={(value) => `${value}% of dwellings`}
                  />
                  <Legend verticalAlign="bottom" height={50} />
                  <Line 
                    type="monotone" 
                    dataKey="socialResidualLandValue" 
                    name="Social Housing (0% revenue)" 
                    stroke="#ff0000" 
                    activeDot={{ r: 8 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="affordableResidualLandValue" 
                    name="Affordable Housing (75% revenue)" 
                    stroke="#00cc00" 
                    activeDot={{ r: 8 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="mixedResidualLandValue" 
                    name="50/50 Mix" 
                    stroke="#9900cc" 
                    activeDot={{ r: 8 }} 
                  />
                  {/* Add a reference line at y=0 to show breakeven point */}
                  <ReferenceLine y={0} stroke="gray" strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeasibilityCalculation; 