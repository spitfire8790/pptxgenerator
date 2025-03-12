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
import { Calculator, TrendingUp, DollarSign, HardHat, Percent, Home, Building2, Settings2, Info, FileDown, Loader2, CheckCircle, XCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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
  const [isExporting, setIsExporting] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (!calculationResults) return;

    // Generate sensitivity analysis data
    const housingImpactData = generateHousingImpactAnalysis(settings, density, selectedFeature, calculationResults);

    setSensitivityData({
      housingImpact: housingImpactData
    });
  }, [calculationResults, settings, density, selectedFeature]);

  // Clear notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [notification]);

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

  // Function to export data to Excel
  const exportToExcel = async () => {
    try {
      setIsExporting(true);
      
      // Create a new workbook
      const wb = XLSX.utils.book_new();
      
      // Add default workbook styles - Public Sans font will be applied to all cells
      wb.Styles = {
        Fonts: [
          { FontName: "Public Sans" } // Set default font for workbook
        ]
      };
      
      // Get clean numeric values for GFA and other measurements
      const cleanGFA = Math.round(calculationResults.gfa);
      const cleanBuildingFootprint = Math.round(calculationResults.siteCoverage);
      const cleanDevelopableArea = Math.round(calculationResults.developableArea);
      
      // Create the main calculations worksheet data structure
      const mainWsData = [
        ['Development Feasibility Analysis', '', '', ''],
        [`${density === 'mediumDensity' ? 'Medium Density' : 'High Density'} Development`, '', '', ''],
        ['', '', '', ''],
        ['Development Metrics', '', '', ''],
        ['Building Footprint', cleanBuildingFootprint, `${formatPercentage(settings[density].siteEfficiencyRatio)} of Developable Area (${cleanDevelopableArea} m²)`, ''],
        ['Gross Floor Area (GFA)', cleanGFA, `FSR ${calculationResults.fsr}:1`, ''],
        ['Development Yield', calculationResults.developmentYield, `Total NSA (${Math.round(calculationResults.nsa)}) ÷ Assumed Unit Size (${density === 'highDensity' ? '75' : Math.floor(calculationResults.dwellingSize / 10) * 10} m²)`, ''],
        ['', '', '', ''],
        ['Sales Analysis', '', '', ''],
        ['Median Unit Price', settings[density].dwellingPrice, 'Based on sales data', ''],
        ['Total Gross Realisation', { f: 'B7*B10' }, 'Development Yield × Median Unit Price', ''],
        ['', '', '', ''],
        ['GST and Selling Costs', '', '', ''],
        ['GST (10%)', { f: 'B11*B46' }, 'Total Gross Realisation × GST Rate', ''],
        ['Agent\'s Commission', { f: 'B11*B47' }, 'Total Gross Realisation × Agent\'s Commission', ''],
        ['Legal Fees', { f: 'B11*B48' }, 'Total Gross Realisation × Legal Fees', ''],
        ['Marketing Costs', { f: 'B11*B49' }, 'Total Gross Realisation × Marketing Costs', ''],
        ['Net Realisation', { f: 'B11-B14-B15-B16-B17' }, 'Total Gross Realisation - GST - Commission - Legal - Marketing', ''],
        ['', '', '', ''],
        ['Profit and Risk', '', '', ''],
        ['Profit Margin', { f: 'B18*B53' }, 'Net Realisation × Profit Margin', ''],
        ['Net Realisation after Profit', { f: 'B18-B21' }, 'Net Realisation - Profit Margin', ''],
        ['', '', '', ''],
        ['Development Costs', '', '', ''],
        ['Construction Cost (per m² GFA)', calculationResults.constructionCostPerGfa, 'Based on recent construction certificates', ''],
        ['Total Construction Costs', { f: 'B25*B6' }, 'Construction Cost per m² × Total GFA', ''],
        ['DA Application Fees', calculationResults.daApplicationFees, 'Fixed cost', ''],
        ['Professional Fees', { f: 'B26*B50' }, 'Construction Costs × Professional Fees', ''],
        ['Development Contribution', { f: 'B26*B51' }, 'Construction Costs × Development Contribution', ''],
        ['Total Development Costs', { f: 'B26+B27+B28+B29' }, 'Construction + DA + Professional Fees + Development Contribution', ''],
        ['', '', '', ''],
        ['Finance and Holding Costs', '', '', ''],
        ['Land Tax', calculationResults.landTax, `Annual Land Tax (${formatCurrency(calculationResults.landTaxPerYear)}) × Project Duration (${(calculationResults.projectPeriod / 12).toFixed(1)} years)`, ''],
        ['Interest Rate', { f: 'B54' }, 'See Assumptions below', ''],
        ['Finance Costs', { f: 'B54*B55*B30' }, 'Interest Rate × Project Duration × Total Development Costs', ''],
        ['', '', '', ''],
        ['Residual Land Value', '', '', ''],
        ['Residual Land Value', { f: 'B22-B30-B35-B33' }, 'Net Realisation after Profit - Total Development Costs - Finance Costs - Land Tax', ''],
        ['', '', '', ''],
        ['Assumptions', '', '', ''],
        // Development Parameters
        ['Site Efficiency Ratio', settings[density].siteEfficiencyRatio, 'Building footprint as percentage of developable area', ''],
        ['GBA to GFA Ratio', settings[density].gbaToGfaRatio, 'Efficiency of gross building area', ''],
        ['Floor to Floor Height', settings[density].floorToFloorHeight, 'Height between floors in meters', ''],
        // Sales Parameters
        ['GST Rate', 0.1, 'Goods and Services Tax rate', ''],
        ['Agent\'s Commission', settings[density].agentsSalesCommission, 'Percentage of sales for agent commission', ''],
        ['Legal Fees', settings[density].legalFeesOnSales, 'Percentage of sales for legal costs', ''],
        ['Marketing Costs', settings[density].marketingCosts, 'Percentage of sales for marketing', ''],
        // Development Cost Parameters
        ['Professional Fees', settings[density].professionalFees, 'Percentage of construction costs for professional services', ''],
        ['Development Contribution', settings[density].developmentContribution, 'Percentage of construction costs for development contributions', ''],
        // Finance Parameters
        ['Profit and Risk', settings[density].profitAndRisk, 'Profit margin as percentage of net realisation', ''],
        ['Interest Rate', settings[density].interestRate, 'Annual interest rate for finance costs', ''],
        ['Project Period (Years)', calculationResults.projectPeriod / 12, 'Project duration in years', ''],
        // Other Assumptions
        ['Unit Size (Medium Density)', density === 'mediumDensity' ? Math.floor(calculationResults.dwellingSize / 10) * 10 : 'N/A', 'Assumed unit size in m²', ''],
        ['Unit Size (High Density)', density === 'highDensity' ? 75 : 'N/A', 'Assumed unit size in m²', ''],
      ];

      // Create worksheet from data
      const mainWs = XLSX.utils.aoa_to_sheet(mainWsData);

      // Add mock calculation results to help Excel formulas evaluate (hidden column E)
      // This ensures that even if a formula doesn't calculate properly, the user still sees reasonable values
      mainWs['E11'] = { v: calculationResults.totalGrossRealisation, t: 'n', z: '"$"#,##0' };
      mainWs['E14'] = { v: calculationResults.gst, t: 'n', z: '"$"#,##0' };
      mainWs['E15'] = { v: calculationResults.agentsCommission, t: 'n', z: '"$"#,##0' };
      mainWs['E16'] = { v: calculationResults.legalFees, t: 'n', z: '"$"#,##0' };
      mainWs['E17'] = { v: calculationResults.marketingCosts, t: 'n', z: '"$"#,##0' };
      mainWs['E18'] = { v: calculationResults.netRealisation, t: 'n', z: '"$"#,##0' };
      mainWs['E21'] = { v: calculationResults.profitAndRisk, t: 'n', z: '"$"#,##0' };
      mainWs['E22'] = { v: calculationResults.netRealisationAfterProfitAndRisk, t: 'n', z: '"$"#,##0' };
      mainWs['E26'] = { v: calculationResults.constructionCosts, t: 'n', z: '"$"#,##0' };
      mainWs['E28'] = { v: calculationResults.professionalFees, t: 'n', z: '"$"#,##0' };
      mainWs['E29'] = { v: calculationResults.developmentContribution, t: 'n', z: '"$"#,##0' };
      mainWs['E30'] = { v: calculationResults.totalDevelopmentCosts, t: 'n', z: '"$"#,##0' };
      mainWs['E35'] = { v: calculationResults.financeCosts, t: 'n', z: '"$"#,##0' };
      mainWs['E38'] = { v: calculationResults.residualLandValue, t: 'n', z: '"$"#,##0' };

      // Pre-calculate formula results to help Excel
      mainWs['B11'].v = calculationResults.totalGrossRealisation;
      mainWs['B14'].v = calculationResults.gst;
      mainWs['B15'].v = calculationResults.agentsCommission;
      mainWs['B16'].v = calculationResults.legalFees;
      mainWs['B17'].v = calculationResults.marketingCosts;
      mainWs['B18'].v = calculationResults.netRealisation;
      mainWs['B21'].v = calculationResults.profitAndRisk;
      mainWs['B22'].v = calculationResults.netRealisationAfterProfitAndRisk;
      mainWs['B26'].v = calculationResults.constructionCosts;
      mainWs['B28'].v = calculationResults.professionalFees;
      mainWs['B29'].v = calculationResults.developmentContribution;
      mainWs['B30'].v = calculationResults.totalDevelopmentCosts;
      mainWs['B35'].v = calculationResults.financeCosts;
      mainWs['B38'].v = calculationResults.residualLandValue;

      // Ensure building footprint and GFA cells have numeric values
      mainWs['B5'].t = 'n';
      mainWs['B6'].t = 'n';
      
      // Format cells with numeric values and percentages
      // Format currency values
      ['B10', 'B11', 'B14', 'B15', 'B16', 'B17', 'B18', 'B21', 'B22', 'B25', 'B26', 'B27', 'B28', 'B29', 'B30', 'B33', 'B35', 'B38'].forEach(cell => {
        if (!mainWs[cell]) return;
        mainWs[cell].z = '"$"#,##0';
      });

      // Format percentage values
      ['B34'].forEach(cell => {
        if (!mainWs[cell]) return;
        mainWs[cell].z = '0.0%';
      });
      
      // Format area values with m² suffix
      ['B5', 'B6'].forEach(cell => {
        if (!mainWs[cell]) return;
        mainWs[cell].z = '#,##0" m²"';
      });
      
      // Format development yield with "units" suffix
      if (mainWs['B7']) {
        mainWs['B7'].z = '0" units"';
      }

      // Set column widths
      const mainWsCols = [
        { wch: 25 }, // A - Metric
        { wch: 20 }, // B - Value
        { wch: 50 }, // C - Calculation Method
        { wch: 30 }, // D - Formula
        { wch: 0 },  // E - Hidden values (zero width to hide)
      ];
      mainWs['!cols'] = mainWsCols;

      // Define styles for different elements
      const headerStyle = {
        font: { 
          bold: true, 
          sz: 14, 
          color: { rgb: "FFFFFF" },
          name: "Public Sans"
        },
        fill: { 
          fgColor: { rgb: "0C2340" } // Dark blue background
        },
        alignment: {
          horizontal: "left",
          vertical: "center"
        }
      };

      const sectionHeaderStyle = {
        font: { 
          bold: true, 
          sz: 12,
          color: { rgb: "FFFFFF" },
          name: "Public Sans"
        },
        fill: { 
          fgColor: { rgb: "0C2340" } // Dark blue background
        },
        alignment: {
          horizontal: "left",
          vertical: "center"
        }
      };

      const totalRowStyle = {
        font: { 
          bold: true,
          name: "Public Sans"
        },
        fill: { 
          fgColor: { rgb: "E9EDF1" } 
        },
        border: {
          top: { style: "medium", color: { rgb: "0C2340" } } // Bold top border
        }
      };

      const generalCellStyle = {
        font: {
          name: "Public Sans"
        }
      };

      // Apply styles to the main worksheet
      // Main headers
      ['A1', 'A2'].forEach(cell => {
        if (!mainWs[cell]) return;
        mainWs[cell].s = headerStyle;
      });

      // Section headers
      ['A4', 'A9', 'A13', 'A20', 'A24', 'A32', 'A37', 'A40'].forEach(cell => {
        if (!mainWs[cell]) return;
        mainWs[cell].s = sectionHeaderStyle;
      });

      // Total rows with bold top border
      ['A11', 'A18', 'A22', 'A30', 'A38'].forEach(cell => {
        if (!mainWs[cell]) return;
        mainWs[cell].s = totalRowStyle;
        
        // Apply the total row style to entire row (columns B, C, D)
        ['B', 'C', 'D'].forEach(col => {
          const rowCell = `${col}${cell.substring(1)}`;
          if (!mainWs[rowCell]) return;
          mainWs[rowCell].s = totalRowStyle;
        });
      });
      
      // Apply general cell style to all other cells to ensure Public Sans font
      Object.keys(mainWs).forEach(cell => {
        if (cell[0] === '!') return; // Skip special keys like !ref
        if (!mainWs[cell].s) { // Only apply if no style exists
          mainWs[cell].s = generalCellStyle;
        }
      });

      // Create a worksheet for sensitivity analysis
      const sensitivityWsData = [
        ['Social/Affordable Housing Impact Analysis', '', '', ''],
        ['', '', '', ''],
        ['Percentage', 'Social Housing (0% revenue)', 'Affordable Housing (75% revenue)', '50/50 Mix'],
      ];

      // Add sensitivity data with proper number values, not formatted strings
      sensitivityData.housingImpact.data.forEach(dataPoint => {
        sensitivityWsData.push([
          dataPoint.percentage / 100, // Store as decimal for proper Excel percentage formatting
          dataPoint.socialResidualLandValue,
          dataPoint.affordableResidualLandValue,
          dataPoint.mixedResidualLandValue
        ]);
      });

      // Add breakeven points
      sensitivityWsData.push(['', '', '', '']);
      sensitivityWsData.push(['Breakeven Points', '', '', '']);
      
      const socialBreakeven = sensitivityData.housingImpact.breakeven?.social;
      const affordableBreakeven = sensitivityData.housingImpact.breakeven?.affordable;
      const mixedBreakeven = sensitivityData.housingImpact.breakeven?.mixed;
      
      sensitivityWsData.push([
        'Social Housing', 
        socialBreakeven ? `${socialBreakeven.units} units (${Math.round(socialBreakeven.percentage)}%)` : 'Site feasible at 100%',
        '', 
        ''
      ]);
      
      sensitivityWsData.push([
        'Affordable Housing', 
        affordableBreakeven ? `${affordableBreakeven.units} units (${Math.round(affordableBreakeven.percentage)}%)` : 'Site feasible at 100%',
        '', 
        ''
      ]);
      
      sensitivityWsData.push([
        'Mixed Housing', 
        mixedBreakeven ? `${mixedBreakeven.units} units (${Math.round(mixedBreakeven.percentage)}%)` : 'Site feasible at 100%',
        '', 
        ''
      ]);

      // Create sensitivity worksheet
      const sensitivityWs = XLSX.utils.aoa_to_sheet(sensitivityWsData);
      
      // Format percentage cells in the sensitivity sheet
      const percentageCells = [];
      for (let i = 4; i < sensitivityData.housingImpact.data.length + 4; i++) {
        percentageCells.push(`A${i}`);
      }
      
      percentageCells.forEach(cell => {
        if (!sensitivityWs[cell]) return;
        sensitivityWs[cell].z = '0%';
        sensitivityWs[cell].t = 'n'; // Ensure numeric type
      });
      
      // Format currency cells in the sensitivity sheet
      for (let i = 4; i < sensitivityData.housingImpact.data.length + 4; i++) {
        ['B', 'C', 'D'].forEach(col => {
          const cell = `${col}${i}`;
          if (!sensitivityWs[cell]) return;
          sensitivityWs[cell].z = '"$"#,##0';
          sensitivityWs[cell].t = 'n'; // Ensure numeric type
        });
      }

      // Set column widths for sensitivity worksheet
      const sensitivityWsCols = [
        { wch: 20 }, // A
        { wch: 25 }, // B
        { wch: 30 }, // C
        { wch: 25 }, // D
      ];
      sensitivityWs['!cols'] = sensitivityWsCols;

      // Apply styles to sensitivity worksheet
      // Header
      if (sensitivityWs['A1']) {
        sensitivityWs['A1'].s = headerStyle;
      }

      // Column headers
      ['A3', 'B3', 'C3', 'D3'].forEach(cell => {
        if (!sensitivityWs[cell]) return;
        sensitivityWs[cell].s = {
          font: { bold: true, name: "Public Sans" },
          fill: { fgColor: { rgb: "E9EDF1" } }
        };
      });

      // Breakeven section header
      const breakevenRowIndex = 4 + sensitivityData.housingImpact.data.length + 1;
      if (sensitivityWs[`A${breakevenRowIndex}`]) {
        sensitivityWs[`A${breakevenRowIndex}`].s = sectionHeaderStyle;
      }
      
      // Apply general cell style to all cells in sensitivity worksheet
      Object.keys(sensitivityWs).forEach(cell => {
        if (cell[0] === '!') return; // Skip special keys like !ref
        if (!sensitivityWs[cell].s) { // Only apply if no style exists
          sensitivityWs[cell].s = generalCellStyle;
        }
      });

      // Create an Assumptions worksheet with all key parameters
      const assumptionsData = [
        ['Assumptions', '', '', ''],
        ['', '', '', ''],
        ['Parameter', 'Value', 'Description', 'Used In'],
        // Development Parameters
        ['Site Efficiency Ratio', settings[density].siteEfficiencyRatio, 'Building footprint as percentage of developable area', 'Building Footprint calculation'],
        ['GBA to GFA Ratio', settings[density].gbaToGfaRatio, 'Efficiency of gross building area', 'GFA calculation from building area'],
        ['Floor to Floor Height', settings[density].floorToFloorHeight, 'Height between floors in meters', 'GFA calculation based on HOB'],
        ['', '', '', ''],
        // Sales Parameters
        ['GST Rate', 0.1, 'Goods and Services Tax rate', 'GST calculation'],
        ['Agent\'s Commission', settings[density].agentsSalesCommission, 'Percentage of sales for agent commission', 'Agent\'s Commission calculation'],
        ['Legal Fees', settings[density].legalFeesOnSales, 'Percentage of sales for legal costs', 'Legal Fees calculation'],
        ['Marketing Costs', settings[density].marketingCosts, 'Percentage of sales for marketing', 'Marketing Costs calculation'],
        ['', '', '', ''],
        // Development Cost Parameters
        ['Professional Fees', settings[density].professionalFees, 'Percentage of construction costs for professional services', 'Professional Fees calculation'],
        ['Development Contribution', settings[density].developmentContribution, 'Percentage of construction costs for development contributions', 'Development Contribution calculation'],
        ['', '', '', ''],
        // Finance Parameters
        ['Profit and Risk', settings[density].profitAndRisk, 'Profit margin as percentage of net realisation', 'Profit calculation'],
        ['Interest Rate', settings[density].interestRate, 'Annual interest rate for finance costs', 'Finance Costs calculation'],
        ['Project Period', calculationResults.projectPeriod / 12, 'Project duration in years', 'Finance Costs calculation'],
        ['', '', '', ''],
        // Other Assumptions
        ['Unit Size (Medium Density)', density === 'mediumDensity' ? Math.floor(calculationResults.dwellingSize / 10) * 10 : 'N/A', 'Assumed unit size in m²', 'Development Yield calculation'],
        ['Unit Size (High Density)', density === 'highDensity' ? 75 : 'N/A', 'Assumed unit size in m²', 'Development Yield calculation'],
      ];

      const assumptionsWs = XLSX.utils.aoa_to_sheet(assumptionsData);
      
      // Format percentage cells in the assumptions sheet
      ['B4', 'B5', 'B9', 'B10', 'B11', 'B14', 'B15', 'B17', 'B18'].forEach(cell => {
        if (!assumptionsWs[cell]) return;
        assumptionsWs[cell].z = '0.0%';
        assumptionsWs[cell].t = 'n'; // Ensure numeric type
      });
      
      // Format numeric cells with appropriate formats
      // Floor height with m suffix
      if (assumptionsWs['B6']) {
        assumptionsWs['B6'].z = '0.0" m"';
        assumptionsWs['B6'].t = 'n';
      }
      
      // Project period in years
      if (assumptionsWs['B19']) {
        assumptionsWs['B19'].z = '0.0" years"';
        assumptionsWs['B19'].t = 'n';
      }
      
      // Unit sizes with m² suffix
      ['B21', 'B22'].forEach(cell => {
        if (!assumptionsWs[cell] || assumptionsWs[cell].v === 'N/A') return;
        assumptionsWs[cell].z = '0" m²"';
        assumptionsWs[cell].t = 'n';
      });
      
      // Set column widths for assumptions worksheet
      const assumptionsWsCols = [
        { wch: 25 }, // A - Parameter
        { wch: 15 }, // B - Value
        { wch: 40 }, // C - Description
        { wch: 30 }, // D - Used In
      ];
      assumptionsWs['!cols'] = assumptionsWsCols;

      // Apply styles to assumptions worksheet
      // Main header
      if (assumptionsWs['A1']) {
        assumptionsWs['A1'].s = headerStyle;
      }

      // Column headers
      ['A3', 'B3', 'C3', 'D3'].forEach(cell => {
        if (!assumptionsWs[cell]) return;
        assumptionsWs[cell].s = {
          font: { bold: true, name: "Public Sans" },
          fill: { fgColor: { rgb: "E9EDF1" } }
        };
      });
      
      // Parameter section headers - add dark blue background to empty rows preceding sections
      ['A7', 'A12', 'A16', 'A20'].forEach(cell => {
        if (!assumptionsWs[cell]) return;
        assumptionsWs[cell].s = {
          fill: { fgColor: { rgb: "D6DCE4" } }
        };
        
        // Apply to whole row
        ['B', 'C', 'D'].forEach(col => {
          const rowCell = `${col}${cell.substring(1)}`;
          if (!assumptionsWs[rowCell]) return;
          assumptionsWs[rowCell].s = {
            fill: { fgColor: { rgb: "D6DCE4" } }
          };
        });
      });
      
      // Apply general cell style to all cells in assumptions worksheet
      Object.keys(assumptionsWs).forEach(cell => {
        if (cell[0] === '!') return; // Skip special keys like !ref
        // Add Public Sans font to all cells if no style exists
        if (!assumptionsWs[cell].s) {
          assumptionsWs[cell].s = generalCellStyle;
        } else {
          // Ensure Public Sans font is applied to cells with existing styles
          assumptionsWs[cell].s.font = {
            ...(assumptionsWs[cell].s.font || {}),
            name: "Public Sans"
          };
        }
      });

      // Now update the main calculation sheet formulas to reference the assumptions sheet
      // Replace the formulas in the main worksheet with references to the Assumptions sheet
      mainWs['B14'] = { f: 'B11*Assumptions!B8', t: 'n', z: '"$"#,##0' }; // GST
      mainWs['B15'] = { f: 'B11*Assumptions!B9', t: 'n', z: '"$"#,##0' }; // Agent's Commission
      mainWs['B16'] = { f: 'B11*Assumptions!B10', t: 'n', z: '"$"#,##0' }; // Legal Fees
      mainWs['B17'] = { f: 'B11*Assumptions!B11', t: 'n', z: '"$"#,##0' }; // Marketing Costs
      mainWs['B21'] = { f: 'B18*Assumptions!B17', t: 'n', z: '"$"#,##0' }; // Profit Margin
      mainWs['B28'] = { f: 'B26*Assumptions!B14', t: 'n', z: '"$"#,##0' }; // Professional Fees
      mainWs['B29'] = { f: 'B26*Assumptions!B15', t: 'n', z: '"$"#,##0' }; // Development Contribution
      mainWs['B35'] = { f: 'Assumptions!B18*Assumptions!B19*B30', t: 'n', z: '"$"#,##0' }; // Finance Costs
      
      // Update the calculation descriptions to reference the Assumptions sheet
      mainWs['C14'] = { v: 'Total Gross Realisation × GST Rate (see Assumptions)', t: 's' };
      mainWs['C15'] = { v: 'Total Gross Realisation × Agent\'s Commission (see Assumptions)', t: 's' };
      mainWs['C16'] = { v: 'Total Gross Realisation × Legal Fees (see Assumptions)', t: 's' };
      mainWs['C17'] = { v: 'Total Gross Realisation × Marketing Costs (see Assumptions)', t: 's' };
      mainWs['C21'] = { v: 'Net Realisation × Profit and Risk (see Assumptions)', t: 's' };
      mainWs['C28'] = { v: 'Construction Costs × Professional Fees (see Assumptions)', t: 's' };
      mainWs['C29'] = { v: 'Construction Costs × Development Contribution (see Assumptions)', t: 's' };
      mainWs['C35'] = { v: 'Interest Rate × Project Period × Total Development Costs (see Assumptions)', t: 's' };

      // Add worksheets to workbook
      XLSX.utils.book_append_sheet(wb, mainWs, 'Feasibility Calculation');
      XLSX.utils.book_append_sheet(wb, assumptionsWs, 'Assumptions');
      XLSX.utils.book_append_sheet(wb, sensitivityWs, 'Sensitivity Analysis');

      // If LMR comparison is available, add a worksheet for it
      if (lmrResults && lmrOptions?.isInLMRArea) {
        const lmrWsData = [
          ['LMR Impact Analysis', '', '', ''],
          ['', '', '', ''],
          ['Metric', 'Current', 'LMR', 'Difference'],
          ['GFA', calculationResults.gfa, lmrResults.gfa, { f: 'C4-B4' }],
          ['Development Yield', calculationResults.developmentYield, lmrResults.developmentYield, { f: 'C5-B5' }],
          ['Net Realisation', calculationResults.netRealisation, lmrResults.netRealisation, { f: 'C6-B6' }],
          ['Residual Land Value', calculationResults.residualLandValue, lmrResults.residualLandValue, { f: 'C7-B7' }],
        ];

        const lmrWs = XLSX.utils.aoa_to_sheet(lmrWsData);
        
        // Pre-calculate formula results for LMR comparison
        lmrWs['D4'].v = lmrResults.gfa - calculationResults.gfa;
        lmrWs['D5'].v = lmrResults.developmentYield - calculationResults.developmentYield;
        lmrWs['D6'].v = lmrResults.netRealisation - calculationResults.netRealisation;
        lmrWs['D7'].v = lmrResults.residualLandValue - calculationResults.residualLandValue;
        
        // Format cells
        // GFA with m² suffix
        ['B4', 'C4'].forEach(cell => {
          if (!lmrWs[cell]) return;
          lmrWs[cell].z = '#,##0" m²"';
          lmrWs[cell].t = 'n'; // Ensure numeric type
        });
        
        // Units suffix
        ['B5', 'C5'].forEach(cell => {
          if (!lmrWs[cell]) return;
          lmrWs[cell].z = '0" units"';
          lmrWs[cell].t = 'n'; // Ensure numeric type
        });
        
        // Currency format
        ['B6', 'C6', 'B7', 'C7', 'D6', 'D7'].forEach(cell => {
          if (!lmrWs[cell]) return;
          lmrWs[cell].z = '"$"#,##0';
          lmrWs[cell].t = 'n'; // Ensure numeric type
        });
        
        // Custom format for difference in GFA
        if (lmrWs['D4']) {
          lmrWs['D4'].z = '+#,##0" m²";-#,##0" m²"';
          lmrWs['D4'].t = 'n'; // Ensure numeric type
        }
        
        // Custom format for difference in units
        if (lmrWs['D5']) {
          lmrWs['D5'].z = '+0" units";-0" units"';
          lmrWs['D5'].t = 'n'; // Ensure numeric type
        }
        
        // Set column widths
        const lmrWsCols = [
          { wch: 20 }, // A
          { wch: 20 }, // B
          { wch: 20 }, // C
          { wch: 20 }, // D
        ];
        lmrWs['!cols'] = lmrWsCols;

        // Apply styles to LMR worksheet
        // Header
        if (lmrWs['A1']) {
          lmrWs['A1'].s = headerStyle;
        }

        // Column headers
        ['A3', 'B3', 'C3', 'D3'].forEach(cell => {
          if (!lmrWs[cell]) return;
          lmrWs[cell].s = {
            font: { bold: true, name: "Public Sans" },
            fill: { fgColor: { rgb: "E9EDF1" } }
          };
        });

        // Highlight the Residual Land Value row with bold top border
        ['A7', 'B7', 'C7', 'D7'].forEach(cell => {
          if (!lmrWs[cell]) return;
          lmrWs[cell].s = {
            font: { bold: true, name: "Public Sans" },
            border: {
              top: { style: "medium", color: { rgb: "0C2340" } } // Bold top border
            }
          };
        });

        // Apply conditional formatting for positive/negative differences
        ['D4', 'D5', 'D6', 'D7'].forEach(cell => {
          if (!lmrWs[cell]) return;
          const cellValue = lmrWs[cell].v;
          if (cellValue > 0) {
            lmrWs[cell].s = {
              ...(lmrWs[cell].s || {}),
              font: { ...(lmrWs[cell].s?.font || {}), color: { rgb: "008800" }, name: "Public Sans" }
            };
          } else if (cellValue < 0) {
            lmrWs[cell].s = {
              ...(lmrWs[cell].s || {}),
              font: { ...(lmrWs[cell].s?.font || {}), color: { rgb: "CC0000" }, name: "Public Sans" }
            };
          }
        });
        
        // Apply general cell style to all cells in LMR worksheet
        Object.keys(lmrWs).forEach(cell => {
          if (cell[0] === '!') return; // Skip special keys like !ref
          if (!lmrWs[cell].s) { // Only apply if no style exists
            lmrWs[cell].s = generalCellStyle;
          }
        });

        XLSX.utils.book_append_sheet(wb, lmrWs, 'LMR Comparison');
      }

      // Add a site information worksheet
      const siteInfoData = [
        ['Site Information', '', ''],
        ['', '', ''],
        ['Property', 'Value', 'Notes'],
        ['Site Area', calculationResults.siteArea, 'Square meters'],
        ['Developable Area', calculationResults.developableArea, 'After excluding constraints'],
        ['Zone', selectedFeature?.properties?.copiedFrom?.site_suitability__zone || 'N/A', ''],
        ['FSR', calculationResults.fsr, ''],
        ['HOB', calculationResults.hob || 'N/A', 'Meters'],
        ['', '', ''],
        ['Development Controls', '', ''],
        ['Density Type', density === 'mediumDensity' ? 'Medium Density' : 'High Density', ''],
        ['Site Efficiency Ratio', settings[density].siteEfficiencyRatio, 'Building footprint as percentage of developable area'],
        ['GBA to GFA Ratio', settings[density].gbaToGfaRatio, 'Efficiency of gross building area'],
        ['Floor to Floor Height', settings[density].floorToFloorHeight, 'Meters'],
        ['Profit and Risk Margin', settings[density].profitAndRisk, ''],
        ['Interest Rate', settings[density].interestRate, 'Annual rate'],
        ['Project Period', calculationResults.projectPeriod, 'Months'],
      ];

      const siteInfoWs = XLSX.utils.aoa_to_sheet(siteInfoData);
      
      // Format cells
      // Area values with m² suffix
      ['B4', 'B5'].forEach(cell => {
        if (!siteInfoWs[cell]) return;
        siteInfoWs[cell].z = '#,##0" m²"';
        siteInfoWs[cell].t = 'n'; // Ensure numeric type
      });
      
      // Percentage values
      ['B12', 'B13', 'B15', 'B16'].forEach(cell => {
        if (!siteInfoWs[cell]) return;
        siteInfoWs[cell].z = '0.0%';
        siteInfoWs[cell].t = 'n'; // Ensure numeric type
      });
      
      // FSR value
      if (siteInfoWs['B7']) {
        siteInfoWs['B7'].t = 'n'; // Ensure numeric type
        siteInfoWs['B7'].z = '0.0"; : 1"'; // Format as "1.3 : 1"
      }
      
      // HOB with m suffix
      if (siteInfoWs['B8'] && siteInfoWs['B8'].v !== 'N/A') {
        siteInfoWs['B8'].z = '0" m"';
        siteInfoWs['B8'].t = 'n'; // Ensure numeric type
      }
      
      // Floor height with m suffix
      if (siteInfoWs['B14']) {
        siteInfoWs['B14'].z = '0.0" m"';
        siteInfoWs['B14'].t = 'n'; // Ensure numeric type
      }
      
      // Project period with "months" suffix
      if (siteInfoWs['B17']) {
        siteInfoWs['B17'].z = '0" months"';
        siteInfoWs['B17'].t = 'n'; // Ensure numeric type
      }
      
      // Set column widths
      const siteInfoWsCols = [
        { wch: 25 }, // A
        { wch: 25 }, // B
        { wch: 40 }, // C
      ];
      siteInfoWs['!cols'] = siteInfoWsCols;

      // Apply styles to site info worksheet
      // Headers
      ['A1', 'A10'].forEach(cell => {
        if (!siteInfoWs[cell]) return;
        siteInfoWs[cell].s = headerStyle;
      });

      // Column headers
      ['A3', 'B3', 'C3'].forEach(cell => {
        if (!siteInfoWs[cell]) return;
        siteInfoWs[cell].s = {
          font: { bold: true, name: "Public Sans" },
          fill: { fgColor: { rgb: "E9EDF1" } }
        };
      });
      
      // Apply general cell style to all cells in site info worksheet
      Object.keys(siteInfoWs).forEach(cell => {
        if (cell[0] === '!') return; // Skip special keys like !ref
        if (!siteInfoWs[cell].s) { // Only apply if no style exists
          siteInfoWs[cell].s = generalCellStyle;
        }
      });

      XLSX.utils.book_append_sheet(wb, siteInfoWs, 'Site Information');
      
      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Save the file
      saveAs(data, `Feasibility_Analysis_${density === 'mediumDensity' ? 'Medium' : 'High'}_Density_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      // Show success notification
      setNotification({
        type: 'success',
        message: 'Excel file exported with working calculations and formulas!'
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      
      // Show error notification
      setNotification({
        type: 'error',
        message: 'Error exporting to Excel. Please try again.'
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Notification component
  const NotificationToast = ({ type, message }) => {
    return (
      <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 py-2 px-4 rounded-md shadow-lg ${
        type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
      }`}>
        {type === 'success' ? (
          <CheckCircle size={18} className="text-green-600" />
        ) : (
          <XCircle size={18} className="text-red-600" />
        )}
        <span>{message}</span>
      </div>
    );
  };

  return (
    <div className="p-4">
      {/* Notification Toast */}
      {notification && (
        <NotificationToast type={notification.type} message={notification.message} />
      )}
      
      {/* Export Button */}
      <div className="mb-4 flex justify-end">
        <div className="relative group">
          <button
            onClick={exportToExcel}
            disabled={isExporting}
            className={`flex items-center gap-2 py-2 px-4 rounded-md transition-colors ${
              isExporting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow hover:shadow-md'
            }`}
            aria-label="Export to Excel"
          >
            {isExporting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileDown size={16} />
                Export to Excel
              </>
            )}
          </button>
          <div className="absolute z-10 right-0 w-64 p-2 mt-2 text-sm text-gray-700 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-300 border border-gray-200">
            <p className="font-semibold mb-1">Export includes:</p>
            <ul className="list-disc pl-4 text-xs">
              <li>Feasibility calculations with formulas</li>
              <li>Sensitivity analysis data</li>
              <li>Site information</li>
              {lmrResults && lmrOptions?.isInLMRArea && <li>LMR comparison data</li>}
            </ul>
          </div>
        </div>
      </div>

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