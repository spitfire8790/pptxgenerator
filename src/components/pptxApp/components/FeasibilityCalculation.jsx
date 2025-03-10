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
import { Calculator, TrendingUp, DollarSign, HardHat, Percent, Home, Building2, Settings2, Info } from 'lucide-react';

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

// Function to generate housing impact analysis data
const generateHousingImpactAnalysis = (settings, density, selectedFeature, calculationResults) => {
  // Generate data points from 0% to 100% in 5% increments
  const data = [];
  const breakeven = {
    social: null,
    affordable: null,
    mixed: null
  };

  // Get base values from calculation results
  const baseResidualLandValue = calculationResults.residualLandValue;
  const dwellingPrice = settings[density].dwellingPrice;
  const totalDwellings = calculationResults.developmentYield;

  // Calculate revenue reduction per dwelling for each type
  const socialReduction = dwellingPrice; // 100% reduction (no revenue)
  const affordableReduction = dwellingPrice * 0.25; // 25% reduction (75% revenue)
  const mixedReduction = dwellingPrice * 0.625; // Average of social and affordable (37.5% revenue)

  let lastPositiveSocial = null;
  let lastPositiveAffordable = null;
  let lastPositiveMixed = null;

  for (let i = 0; i <= 100; i += 5) {
    const percentage = i;
    const affectedDwellings = Math.round(totalDwellings * (percentage / 100));
    
    // Calculate residual land value for each scenario
    const socialResidualLandValue = baseResidualLandValue - (affectedDwellings * socialReduction);
    const affordableResidualLandValue = baseResidualLandValue - (affectedDwellings * affordableReduction);
    const mixedResidualLandValue = baseResidualLandValue - (affectedDwellings * mixedReduction);

    // Track breakeven points (where residual land value crosses zero)
    if (socialResidualLandValue >= 0) lastPositiveSocial = { percentage, units: affectedDwellings };
    if (affordableResidualLandValue >= 0) lastPositiveAffordable = { percentage, units: affectedDwellings };
    if (mixedResidualLandValue >= 0) lastPositiveMixed = { percentage, units: affectedDwellings };

    data.push({
      percentage,
      socialResidualLandValue,
      affordableResidualLandValue,
      mixedResidualLandValue
    });
  }

  // Set breakeven points
  breakeven.social = lastPositiveSocial;
  breakeven.affordable = lastPositiveAffordable;
  breakeven.mixed = lastPositiveMixed;

  return {
    data,
    breakeven
  };
};

const FeasibilityCalculation = ({ 
  settings, 
  density, 
  selectedFeature,
  salesData,
  constructionData,
  housingScenarios,
  lmrOptions,
  useLMR = false,
  calculationResults = null,
  lmrResults = null,
  customControls = null
}) => {
  const [sensitivityData, setSensitivityData] = useState({
    housingImpact: []
  });

  useEffect(() => {
    if (!calculationResults) return;

    // Generate sensitivity analysis data
    const housingImpactData = generateHousingImpactAnalysis(settings, density, selectedFeature, calculationResults);

    setSensitivityData({
      housingImpact: housingImpactData
    });
  }, [calculationResults, settings, density, selectedFeature]);

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

  // Add LMR information section
  const renderLMRInfo = () => {
    if (!lmrOptions?.isInLMRArea) return null;

    const selectedOption = lmrOptions.selectedOptions[density];
    const isUsingLMR = settings[density].useLMR;

    return (
      <div className="mb-8 bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <Building2 className="mr-2" /> LMR Development Controls
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Status:</span>
            <span className={isUsingLMR ? "text-green-600" : "text-gray-600"}>
              {isUsingLMR ? "Using LMR Controls" : "Using Current Controls"}
            </span>
          </div>
          {isUsingLMR && selectedOption && (
            <>
              <div className="flex items-center justify-between">
                <span className="font-medium">Development Type:</span>
                <span>{selectedOption.type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">FSR:</span>
                <span>
                  {selectedOption.fsrRange 
                    ? `${selectedOption.fsrRange.min}-${selectedOption.fsrRange.max}`
                    : selectedOption.potentialFSR}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">HOB:</span>
                <span>
                  {selectedOption.hobRange 
                    ? `${selectedOption.hobRange.min}-${selectedOption.hobRange.max}m`
                    : `${selectedOption.potentialHOB}m`}
                </span>
              </div>
              {selectedOption.type === 'Residential Flat Buildings' && (
                <div className="mt-2 p-2 bg-blue-50 rounded">
                  <p className="text-sm text-blue-800">
                    {selectedOption.fsrRange 
                      ? `FSR and HOB values are based on distance to centers/stations`
                      : `Fixed FSR and HOB values for ${selectedFeature?.properties?.copiedFrom?.site_suitability__zone || 'current'} zone`}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // Add comparison with LMR results if available
  const renderComparison = () => {
    if (!lmrResults || !lmrOptions?.isInLMRArea) return null;

    const currentResults = calculationResults;
    const comparison = {
      gfa: {
        current: currentResults?.gfa || 0,
        lmr: lmrResults?.gfa || 0,
        difference: (lmrResults?.gfa || 0) - (currentResults?.gfa || 0)
      },
      developmentYield: {
        current: currentResults?.developmentYield || 0,
        lmr: lmrResults?.developmentYield || 0,
        difference: (lmrResults?.developmentYield || 0) - (currentResults?.developmentYield || 0)
      },
      netRealisation: {
        current: currentResults?.netRealisation || 0,
        lmr: lmrResults?.netRealisation || 0,
        difference: (lmrResults?.netRealisation || 0) - (currentResults?.netRealisation || 0)
      },
      residualLandValue: {
        current: currentResults?.residualLandValue || 0,
        lmr: lmrResults?.residualLandValue || 0,
        difference: (lmrResults?.residualLandValue || 0) - (currentResults?.residualLandValue || 0)
      }
    };

    return (
      <div className="mb-8 bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <TrendingUp className="mr-2" /> LMR Impact Analysis
        </h3>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left">Metric</th>
              <th className="px-4 py-2 text-right">Current</th>
              <th className="px-4 py-2 text-right">LMR</th>
              <th className="px-4 py-2 text-right">Difference</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-2">GFA</td>
              <td className="px-4 py-2 text-right">{comparison.gfa.current.toLocaleString()}m²</td>
              <td className="px-4 py-2 text-right">{comparison.gfa.lmr.toLocaleString()}m²</td>
              <td className={`px-4 py-2 text-right ${comparison.gfa.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {comparison.gfa.difference > 0 ? '+' : ''}{comparison.gfa.difference.toLocaleString()}m²
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2">Development Yield</td>
              <td className="px-4 py-2 text-right">{comparison.developmentYield.current} units</td>
              <td className="px-4 py-2 text-right">{comparison.developmentYield.lmr} units</td>
              <td className={`px-4 py-2 text-right ${comparison.developmentYield.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {comparison.developmentYield.difference > 0 ? '+' : ''}{comparison.developmentYield.difference} units
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2">Net Realisation</td>
              <td className="px-4 py-2 text-right">{formatCurrency(comparison.netRealisation.current)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(comparison.netRealisation.lmr)}</td>
              <td className={`px-4 py-2 text-right ${comparison.netRealisation.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {comparison.netRealisation.difference > 0 ? '+' : ''}{formatCurrency(comparison.netRealisation.difference)}
              </td>
            </tr>
            <tr className="font-bold">
              <td className="px-4 py-2">Residual Land Value</td>
              <td className="px-4 py-2 text-right">{formatCurrency(comparison.residualLandValue.current)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(comparison.residualLandValue.lmr)}</td>
              <td className={`px-4 py-2 text-right ${comparison.residualLandValue.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {comparison.residualLandValue.difference > 0 ? '+' : ''}{formatCurrency(comparison.residualLandValue.difference)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Add custom controls info section
  const renderCustomControlsInfo = () => {
    if (!customControls?.enabled) return null;

    return (
      <div className="mb-8 bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <Settings2 className="mr-2" /> Custom Development Controls
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">FSR:</span>
            <span>
              {customControls.fsr ?? (selectedFeature?.properties?.copiedFrom?.site_suitability__floorspace_ratio || 'N/A')}
              <span className="text-gray-500 ml-1">:1</span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">HOB:</span>
            <span>
              {customControls.hob ?? (selectedFeature?.properties?.copiedFrom?.site_suitability__height_of_building || 'N/A')}
              <span className="text-gray-500 ml-1">m</span>
            </span>
          </div>
        </div>
        {(customControls.fsr !== null || customControls.hob !== null) && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            <div className="flex items-start">
              <Info size={14} className="mr-2 mt-0.5 flex-shrink-0" />
              <div>
                Calculations are based on custom development controls.
                {customControls.fsr === null && ' Using current FSR.'}
                {customControls.hob === null && ' Using current HOB.'}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4">
      {/* Add Custom Controls Information Section */}
      {renderCustomControlsInfo()}

      {/* Add LMR Information Section */}
      {renderLMRInfo()}

      {/* Add LMR Comparison Section */}
      {renderComparison()}

      <h2 className="text-xl font-bold mb-4 flex items-center">
        <Calculator className="mr-2" /> Development Feasibility - {density === 'mediumDensity' ? 'Medium Density' : 'High Density'}
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
                  ? `FSR ${calculationResults.fsr}:1 (${Math.round(calculationResults.siteArea).toLocaleString()} m² × ${calculationResults.fsr} = ${Math.round(calculationResults.gfa).toLocaleString()} m²)`
                  : (
                    <div>
                      <div>Minimum of two calculations:</div>
                      <div 
                        className="cursor-help hover:text-blue-600" 
                        title={`${Math.round(calculationResults.siteArea).toLocaleString()} m² × ${calculationResults.fsr} = ${Math.round(calculationResults.gfaUnderFsr).toLocaleString()} m²`}
                      >
                        1) FSR approach: {Math.round(calculationResults.gfaUnderFsr).toLocaleString()} m²
                      </div>
                      <div 
                        className="cursor-help hover:text-blue-600" 
                        title={`${Math.round(calculationResults.developableArea).toLocaleString()} m² site area × ${formatPercentage(settings[density].siteEfficiencyRatio)} building footprint × ${density === 'mediumDensity' ? 'min(3, ' : ''}${Math.floor(calculationResults.hob / settings[density].floorToFloorHeight)}${density === 'mediumDensity' ? ')' : ''} storeys × ${formatPercentage(settings[density].gbaToGfaRatio)} efficiency = ${Math.round(calculationResults.gfaUnderHob).toLocaleString()} m²`}
                      >
                        2) HOB approach: {Math.round(calculationResults.gfaUnderHob).toLocaleString()} m² {density === 'mediumDensity' ? '(capped at 3 storeys)' : ''}
                      </div>
                      <div className="mt-1">
                        Final GFA = {Math.round(calculationResults.gfa).toLocaleString()} m² 
                        <span className="text-gray-500 ml-1">
                          ({calculationResults.gfaUnderFsr <= calculationResults.gfaUnderHob ? 'FSR is more restrictive' : 'Height limit is more restrictive'})
                        </span>
                      </div>
                    </div>
                  )
                }
              </td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">Development Yield</td>
              <td className="py-2 px-4 border-t border-gray-200">{calculationResults.developmentYield} units</td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">
                Total NSA ({Math.round(calculationResults.nsa).toLocaleString()} m²) ÷ 
                Assumed Unit Size ({density === 'highDensity' ? '75' : Math.floor(calculationResults.dwellingSize / 10) * 10} m²)
              </td>
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