import React, { useState, useEffect, useRef } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Label,
  ReferenceLine
} from 'recharts';
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  HardHat, 
  Percent, 
  Home, 
  Building2, 
  Settings2, 
  Info, 
  FileDown, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Pencil, 
  Building, 
  ChevronDown, 
  ChevronUp,
  X, 
  Layers, 
  Maximize2,
  Palette,
  Layout,
  ArrowRight,
  Circle,
  Plus,
  Download,
  AlertCircle,
  HelpCircle,
  Settings
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { rpc, giraffeState } from '@gi-nx/iframe-sdk';
import { createDrawingFromFeature, createStyledDrawingFromFeature } from '../utils/mapUtils';
import * as turf from '@turf/turf';
import BuildingParametersModal from './BuildingParametersModal';

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
  customControls = null,
  developableArea = null,
  buildingParameters = {}
}) => {
  const [sensitivityData, setSensitivityData] = useState({
    housingImpact: []
  });
  const [isExporting, setIsExporting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('normal'); // Add new state for sub-tabs: 'normal' or 'lmr'
  const [isDrawing, setIsDrawing] = useState(false);
  const [showMassingModal, setShowMassingModal] = useState(false);
  const [massingOptions, setMassingOptions] = useState({
    buildingType: 'multiple',
    numberOfBuildings: 3,
    buildingDistribution: 'equal'
  });
  
  // New state for building parameters modal
  const [showParametersModal, setShowParametersModal] = useState(false);
  const [currentBuildingParameters, setCurrentBuildingParameters] = useState({
    maxBuildingHeight: buildingParameters.maxBuildingHeight || 100,
    minBuildingSeparation: buildingParameters.minBuildingSeparation || 6,
    maxBuildingWidth: buildingParameters.maxBuildingWidth || 18,
    siteEfficiencyRatio: settings[density]?.siteEfficiencyRatio || 0.6,
    floorToFloorHeight: settings[density]?.floorToFloorHeight || 3.1,
    gbaToGfaRatio: settings[density]?.gbaToGfaRatio || 0.85
  });

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

  // Function to handle sub-tab switching
  const handleSubTabChange = (tab) => {
    setActiveSubTab(tab);
  };

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
                      : `Fixed FSR and HOB values for ${selectedFeature?.properties?.copiedFrom?.site_suitability__principal_zone_identifier || 'current'} zone`}
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
      const wb = new ExcelJS.Workbook();
      
      // Create worksheets
      const mainWs = wb.addWorksheet('Feasibility Calculation');
      const sensitivityWs = wb.addWorksheet('Sensitivity Analysis');
      
      let lmrWs = null;
      if (lmrResults && lmrOptions?.isInLMRArea) {
        lmrWs = wb.addWorksheet('LMR Comparison');
      }
      
      // Get clean numeric values for GFA and other measurements
      const cleanGFA = Math.round(calculationResults.gfa);
      const cleanBuildingFootprint = Math.round(calculationResults.siteCoverage);
      const cleanDevelopableArea = Math.round(calculationResults.developableArea);
      
      // Define styles for different elements
      const headerStyle = {
        font: {
          name: 'Public Sans',
          size: 14,
          color: { argb: 'FFFFFF' },
          bold: true
        },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '0C2340' } // Dark blue background
        },
        alignment: {
          horizontal: 'left',
          vertical: 'center'
        }
      };

      const sectionHeaderStyle = {
        font: {
          name: 'Public Sans',
          size: 12,
          color: { argb: 'FFFFFF' },
          bold: true
        },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '0C2340' } // Dark blue background
        },
        alignment: {
          horizontal: 'left',
          vertical: 'center'
        }
      };

      const totalRowStyle = {
        font: {
          name: 'Public Sans',
          bold: true
        },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'E9EDF1' }
        },
        border: {
          top: { style: 'medium', color: { argb: '0C2340' } } // Bold top border
        }
      };

      const generalCellStyle = {
        font: {
          name: 'Public Sans'
        }
      };
      
      // ----------------- Main Worksheet -----------------
      
      // Add header rows
      mainWs.addRow(['Development Feasibility Analysis', '', '', '']);
      mainWs.addRow([`${density === 'mediumDensity' ? 'Medium Density' : 'High Density'} Development`, '', '', '']);
      mainWs.addRow(['', '', '', '']);
      
      // Add site information section at the top
      // Get site details from selectedFeature
      const siteProps = selectedFeature && selectedFeature.properties 
        ? (selectedFeature.properties.copiedFrom || selectedFeature.properties) 
        : {};
      
      // Site Information Section
      mainWs.addRow(['Site Information', '', siteProps.site__address || 'No address available', '']);
      mainWs.addRow(['Zoning', '', siteProps.site_suitability__principal_zone_identifier || 'No zoning available', '']);
      mainWs.addRow(['Site Area', '', Math.round(calculationResults.siteArea) || 0, 'm²']);
      mainWs.addRow(['FSR', '', calculationResults.fsr || 0, ':1']);
      mainWs.addRow(['HOB', '', calculationResults.hob || 0, 'm']);
      
      // After adding all rows, let's adjust the alignment for Address and Zoning
      mainWs.getRow(5).getCell(3).alignment = { horizontal: 'right' };
      mainWs.getRow(6).getCell(3).alignment = { horizontal: 'right' };
      
      if (customControls?.enabled) {
        mainWs.addRow(['Custom FSR', '', customControls.fsr !== null ? customControls.fsr : 'Using current FSR', '']);
        mainWs.addRow(['Custom HOB', '', customControls.hob !== null ? customControls.hob : 'Using current HOB', '']);
      }
      
      if (lmrOptions?.isInLMRArea) {
        mainWs.addRow(['LMR Area', '', 'Yes', '']);
        mainWs.addRow(['Using LMR Controls', '', settings[density].useLMR ? 'Yes' : 'No', '']);
      }
      
      mainWs.addRow(['', '', '', '']);
      
      // Store cell references for key values we need in formulas
      // We need to track initial row numbers to handle dynamic sections (customControls, lmr)
      const initialMetricsRow = mainWs.rowCount + 1;
      
      // Add section headers and data
      // Development Metrics section
      mainWs.addRow(['Development Metrics', '', '', '']);
      
      // Add Developable Area row first
      const developableAreaRow = mainWs.rowCount + 1;
      mainWs.addRow(['Developable Area', '', cleanDevelopableArea, 'Total site area accounting for setbacks and constraints']);
      
      // Track important row numbers for formulas
      const buildingFootprintRow = mainWs.rowCount + 1;
      
      // Building footprint calculation is different for medium vs high density
      if (density === 'mediumDensity') {
        // For medium density, building footprint is 100% of developable area
        mainWs.addRow(['Building Footprint', 1.0, { formula: `C${developableAreaRow}` }, '100% of Developable Area']);
      } else {
        // For high density, apply the site efficiency ratio
        mainWs.addRow(['Building Footprint', settings[density].siteEfficiencyRatio, { formula: `B${buildingFootprintRow}*C${developableAreaRow}` }, `${formatPercentage(settings[density].siteEfficiencyRatio)} of Developable Area`]);
      }
      
      const gfaRow = mainWs.rowCount + 1;
      
      if (density === 'mediumDensity') {
        // For medium density, calculate GFA based on lot size limitation
        const actualYield = calculateMediumDensityActualYield(calculationResults);
        const adjustedGfa = actualYield * calculationResults.dwellingSize;
        
        mainWs.addRow(['Gross Floor Area (GFA)', '', Math.round(adjustedGfa), `Based on lot size limitation: ${actualYield} units × ${Math.round(calculationResults.dwellingSize)} m² per unit`]);
      } else {
        // For high density, use existing calculation
        mainWs.addRow(['Gross Floor Area (GFA)', calculationResults.fsr, cleanGFA, `FSR ${calculationResults.fsr}:1`]);
      }
      
      const developmentYieldRow = mainWs.rowCount + 1;
      if (density === 'mediumDensity') {
        // For medium density, add minimum lot size constraint
        const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use setting or default to 200m² per dwelling
        const maxDwellingsByLotSize = Math.floor(calculationResults.developableArea / minimumLotSize);
        const actualYield = calculateMediumDensityActualYield(calculationResults);
        
        mainWs.addRow(['Development Yield', calculationResults.dwellingSize, actualYield, 
          `Limited by: Min(NSA calculation: ${calculationResults.developmentYield} units, Lot constraint: ${maxDwellingsByLotSize} units @ ${settings.mediumDensity.minimumLotSize || 200}m² min lot size)`]);
      } else {
        // For high density, use existing calculation
        mainWs.addRow(['Development Yield', calculationResults.dwellingSize, calculationResults.developmentYield, 
          `Total NSA (${Math.round(calculationResults.nsa)}) ÷ Assumed Unit Size (${density === 'highDensity' ? '75' : Math.floor(calculationResults.dwellingSize / 10) * 10} m²)`]);
      }
      
      mainWs.addRow(['', '', '', '']);
      
      // Add Feasibility Analysis header
      const feasibilityAnalysisRow = mainWs.rowCount + 1;
      mainWs.addRow(['Feasibility Analysis', '', '', '']);
      
      // Sales Analysis section - no dark blue header - Remove blank row
      
      const medianUnitPriceRow = mainWs.rowCount + 1;
      mainWs.addRow(['Median Unit Price', '', settings[density].dwellingPrice, 'Based on sales data']);
      
      const totalGrossRealisationRow = mainWs.rowCount + 1;
      // Use formula: Development Yield * Median Unit Price
      mainWs.addRow(['Total Gross Realisation', '', { formula: `C${developmentYieldRow}*C${medianUnitPriceRow}` }, 'Development Yield × Median Unit Price']);
      
      mainWs.addRow(['', '', '', '']);
      
      // GST and Selling Costs section - no dark blue header
      
      // GST Row - Fix reference
      const gstRate = 0.1; // Store the GST rate as a variable
      mainWs.addRow(['GST (10%)', gstRate, { formula: `${gstRate}*C${totalGrossRealisationRow}` }, 'Total Gross Realisation × GST Rate']);
      
      // Store the GST row after creating it
      const gstRow = mainWs.rowCount;
      
      // Agent's Commission Row
      const agentsCommissionRow = mainWs.rowCount + 1;
      mainWs.addRow(['Agent\'s Commission', settings[density].agentsSalesCommission, { formula: `B${agentsCommissionRow}*C${totalGrossRealisationRow}` }, 'Total Gross Realisation × Agent\'s Commission (see Assumptions)']);
      
      // Legal Fees Row
      const legalFeesRow = mainWs.rowCount + 1;
      mainWs.addRow(['Legal Fees', settings[density].legalFeesOnSales, { formula: `B${legalFeesRow}*C${totalGrossRealisationRow}` }, 'Total Gross Realisation × Legal Fees (see Assumptions)']);
      
      // Marketing Costs Row - standard formatting (not a section header)
      const marketingCostsRow = mainWs.rowCount + 1; 
      mainWs.addRow(['Marketing Costs', settings[density].marketingCosts, { formula: `B${marketingCostsRow}*C${totalGrossRealisationRow}` }, 'Total Gross Realisation × Marketing Costs (see Assumptions)']);
      
      // Net Realisation Row
      const netRealisationRow = mainWs.rowCount + 1;
      mainWs.addRow(['Net Realisation', '', { formula: `C${totalGrossRealisationRow}-C${gstRow}-C${agentsCommissionRow}-C${legalFeesRow}-C${marketingCostsRow}` }, 'Total Gross Realisation - GST - Commission - Legal - Marketing']);
      
      mainWs.addRow(['', '', '', '']);
      
      // Profit and Risk section - no dark blue header
      
      // Profit Margin Row - standard formatting (not a section header)
      const profitMarginRate = settings[density].profitAndRisk; // Store the profit margin rate as a variable
      mainWs.addRow(['Profit Margin', profitMarginRate, { formula: `B${mainWs.rowCount+1}*C${netRealisationRow}` }, 'Net Realisation × Profit and Risk (see Assumptions)']);
      const profitMarginRow = mainWs.rowCount;
      
      // Net Realisation after Profit Row
      const netRealisationAfterProfitRow = mainWs.rowCount + 1;
      mainWs.addRow(['Net Realisation after Profit', '', { formula: `C${netRealisationRow}-C${profitMarginRow}` }, 'Net Realisation - Profit Margin']);
      
      mainWs.addRow(['', '', '', '']);
      
      // Development Costs section - no dark blue header
      
      // Construction Cost per GFA Row
      const constructionCostPerGfaRow = mainWs.rowCount + 1;
      mainWs.addRow(['Construction Cost (per m² GFA)', '', calculationResults.constructionCostPerGfa, 'Based on recent construction certificates']);
      
      // Total Construction Costs Row
      const totalConstructionCostsRow = mainWs.rowCount + 1;
      if (density === 'mediumDensity') {
        // For medium density, calculate construction costs based on adjusted GFA
        const actualYield = calculateMediumDensityActualYield(calculationResults);
        const adjustedGfa = actualYield * calculationResults.dwellingSize;
        const adjustedConstructionCosts = adjustedGfa * calculationResults.constructionCostPerGfa;
        
        mainWs.addRow(['Total Construction Costs', '', adjustedConstructionCosts, `Adjusted GFA (${Math.round(adjustedGfa)} m²) × Construction Cost per m² (${formatCurrency(calculationResults.constructionCostPerGfa)})`]);
      } else {
        // For high density, use existing formula
        mainWs.addRow(['Total Construction Costs', '', calculationResults.constructionCosts, 'Construction Cost per m² × Total GFA']);
      }
      
      // DA Application Fees Row
      const daApplicationFeesRow = mainWs.rowCount + 1;
      mainWs.addRow(['DA Application Fees', '', calculationResults.daApplicationFees, 'Fixed cost']);
      
      // Professional Fees Row - Fix reference
      const professionalFeesRow = mainWs.rowCount + 1;
      mainWs.addRow(['Professional Fees', settings[density].professionalFees, { formula: `B${professionalFeesRow}*C${totalConstructionCostsRow}` }, 'Construction Costs × Professional Fees']);
      
      // Development Contribution Row - standard formatting (not a section header)
      const developmentContributionRow = mainWs.rowCount + 1;
      mainWs.addRow(['Development Contribution', settings[density].developmentContribution, { formula: `B${developmentContributionRow}*C${totalConstructionCostsRow}` }, 'Construction Costs × Development Contribution (see Assumptions)']);
      
      // Total Development Costs Row
      const totalDevelopmentCostsRow = mainWs.rowCount + 1;
      mainWs.addRow(['Total Development Costs', '', { formula: `C${totalConstructionCostsRow}+C${daApplicationFeesRow}+C${professionalFeesRow}+C${developmentContributionRow}` }, 'Construction + DA + Professional Fees + Development Contribution']);
      
      mainWs.addRow(['', '', '', '']);
      
      // Finance and Holding Costs section - no dark blue header
      
      // Integrated Land Tax Row
      const landTaxRow = mainWs.rowCount + 1;
      const landTaxYearly = calculationResults.landTaxPerYear;
      const projectDurationYears = (calculationResults.projectPeriod / 12).toFixed(1);
      mainWs.addRow(['Land Tax', '', calculationResults.landTax, `Annual Amount (${formatCurrency(landTaxYearly)}) × ${projectDurationYears} years`]);
      
      // Project Duration Row - Remove value from column B 
      const projectDurationRow = mainWs.rowCount + 1;
      mainWs.addRow(['Project Duration (years)', '', calculationResults.projectPeriod / 12, 'Estimated development timeframe']);
      
      // Interest Rate Row - Keep in column B for formula reference but update column C format
      const interestRateRow = mainWs.rowCount + 1;
      mainWs.addRow(['Interest Rate', settings[density].interestRate, settings[density].interestRate, 'Annual interest rate']);
      
      // Finance Costs Row
      const financeRow = mainWs.rowCount + 1;
      if (density === 'mediumDensity') {
        // For medium density, calculate Finance Costs based on adjusted Total Development Costs
        const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use setting or default to 200m² per dwelling
        const maxDwellingsByLotSize = Math.floor(calculationResults.developableArea / minimumLotSize);
        const actualYield = Math.min(calculationResults.developmentYield, maxDwellingsByLotSize);
        const adjustedGfa = actualYield * calculationResults.dwellingSize;
        const adjustedConstructionCosts = adjustedGfa * calculationResults.constructionCostPerGfa;
        const adjustedProfessionalFees = adjustedConstructionCosts * settings[density].professionalFees;
        const adjustedDevelopmentContribution = adjustedConstructionCosts * settings[density].developmentContribution;
        const adjustedTotalDevelopmentCosts = adjustedConstructionCosts + calculationResults.daApplicationFees + adjustedProfessionalFees + adjustedDevelopmentContribution;
        
        // Calculate finance costs using adjusted total development costs
        const adjustedFinanceCosts = settings[density].interestRate * (projectDurationYears / 2) * adjustedTotalDevelopmentCosts;
        mainWs.addRow(['Finance Costs', '', adjustedFinanceCosts, `Interest Rate (${formatPercentage(settings[density].interestRate)}) × Project Duration (${projectDurationYears} years ÷ 2) × Adjusted Total Development Costs`]);
      } else {
        // For high density, use existing Finance Costs
        mainWs.addRow(['Finance Costs', '', { formula: `C${interestRateRow}*(${projectDurationYears}/2)*C${totalDevelopmentCostsRow}` }, 'Interest Rate × Project Duration × Total Development Costs']);
      }
      
      // Interest on Purchase Price - Calculate interest on Residual Land Value
      const interestOnPurchaseRow = mainWs.rowCount + 1;
      if (density === 'mediumDensity') {
        // For medium density, recalculate Interest on Purchase Price using adjusted values
        const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use setting or default to 200m² per dwelling
        const maxDwellingsByLotSize = Math.floor(calculationResults.developableArea / minimumLotSize);
        const actualYield = Math.min(calculationResults.developmentYield, maxDwellingsByLotSize);
        
        // Recalculate everything from the beginning
        // Adjusted gross realisation
        const adjustedGrossRealisation = actualYield * settings[density].dwellingPrice;
        
        // Adjusted selling costs
        const adjustedGst = adjustedGrossRealisation * 0.1;
        const adjustedAgentsCommission = adjustedGrossRealisation * settings[density].agentsSalesCommission;
        const adjustedLegalFees = adjustedGrossRealisation * settings[density].legalFeesOnSales;
        const adjustedMarketingCosts = adjustedGrossRealisation * settings[density].marketingCosts;
        
        // Adjusted net realisation
        const adjustedNetRealisation = adjustedGrossRealisation - adjustedGst - adjustedAgentsCommission - adjustedLegalFees - adjustedMarketingCosts;
        
        // Adjusted profit margin
        const adjustedProfitMargin = adjustedNetRealisation * settings[density].profitAndRisk;
        
        // Adjusted net realisation after profit
        const adjustedNetRealisationAfterProfit = adjustedNetRealisation - adjustedProfitMargin;
        
        // Adjusted GFA and construction costs
        const adjustedGfa = actualYield * calculationResults.dwellingSize;
        const adjustedConstructionCosts = adjustedGfa * calculationResults.constructionCostPerGfa;
        const adjustedProfessionalFees = adjustedConstructionCosts * settings[density].professionalFees;
        const adjustedDevelopmentContribution = adjustedConstructionCosts * settings[density].developmentContribution;
        const adjustedTotalDevelopmentCosts = adjustedConstructionCosts + calculationResults.daApplicationFees + adjustedProfessionalFees + adjustedDevelopmentContribution;
        
        // Calculate finance costs using adjusted total development costs
        const adjustedFinanceCosts = settings[density].interestRate * (projectDurationYears / 2) * adjustedTotalDevelopmentCosts;
        
        // Calculate residual land value before interest
        const adjustedResidualBeforeInterest = adjustedNetRealisationAfterProfit - adjustedTotalDevelopmentCosts - calculationResults.landTax - adjustedFinanceCosts;
        
        // Calculate interest on purchase price
        const lvrRate = 0.5; // 50% Loan to Value Ratio
        const adjustedInterestOnPurchase = Math.abs(
          adjustedResidualBeforeInterest - 
          adjustedResidualBeforeInterest / 
          (1 + settings[density].interestRate / 12 * calculationResults.projectPeriod * lvrRate)
        );
        
        mainWs.addRow(['Interest on Purchase Price', '', adjustedInterestOnPurchase, 'Interest over full project period with 50% LVR on adjusted Residual Land Value']);
      } else {
        // For high density, use original formula
        const lvrRate = 0.5; // 50% Loan to Value Ratio
        mainWs.addRow(['Interest on Purchase Price', '', { formula: `ABS(C${netRealisationAfterProfitRow}-C${totalDevelopmentCostsRow}-C${landTaxRow}-C${financeRow}-(C${netRealisationAfterProfitRow}-C${totalDevelopmentCostsRow}-C${landTaxRow}-C${financeRow})/(1+C${interestRateRow}/12*${calculationResults.projectPeriod}*${lvrRate}))` }, 'Interest over full project period with 50% LVR']);
      }
      
      // Acquisition Costs - 3% of (Residual Land Value - Interest on Purchase Price)
      const acquisitionCostsRow = mainWs.rowCount + 1;
      if (density === 'mediumDensity') {
        // For medium density, recalculate Acquisition Costs using adjusted values
        const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use setting or default to 200m² per dwelling
        const maxDwellingsByLotSize = Math.floor(calculationResults.developableArea / minimumLotSize);
        const actualYield = Math.min(calculationResults.developmentYield, maxDwellingsByLotSize);
        
        // Recalculate everything from the beginning
        // Adjusted gross realisation
        const adjustedGrossRealisation = actualYield * settings[density].dwellingPrice;
        
        // Adjusted selling costs
        const adjustedGst = adjustedGrossRealisation * 0.1;
        const adjustedAgentsCommission = adjustedGrossRealisation * settings[density].agentsSalesCommission;
        const adjustedLegalFees = adjustedGrossRealisation * settings[density].legalFeesOnSales;
        const adjustedMarketingCosts = adjustedGrossRealisation * settings[density].marketingCosts;
        
        // Adjusted net realisation
        const adjustedNetRealisation = adjustedGrossRealisation - adjustedGst - adjustedAgentsCommission - adjustedLegalFees - adjustedMarketingCosts;
        
        // Adjusted profit margin
        const adjustedProfitMargin = adjustedNetRealisation * settings[density].profitAndRisk;
        
        // Adjusted net realisation after profit
        const adjustedNetRealisationAfterProfit = adjustedNetRealisation - adjustedProfitMargin;
        
        // Adjusted GFA and construction costs
        const adjustedGfa = actualYield * calculationResults.dwellingSize;
        const adjustedConstructionCosts = adjustedGfa * calculationResults.constructionCostPerGfa;
        const adjustedProfessionalFees = adjustedConstructionCosts * settings[density].professionalFees;
        const adjustedDevelopmentContribution = adjustedConstructionCosts * settings[density].developmentContribution;
        const adjustedTotalDevelopmentCosts = adjustedConstructionCosts + calculationResults.daApplicationFees + adjustedProfessionalFees + adjustedDevelopmentContribution;
        
        // Calculate finance costs using adjusted total development costs
        const adjustedFinanceCosts = settings[density].interestRate * (projectDurationYears / 2) * adjustedTotalDevelopmentCosts;
        
        // Calculate residual land value before interest
        const adjustedResidualBeforeInterest = adjustedNetRealisationAfterProfit - adjustedTotalDevelopmentCosts - calculationResults.landTax - adjustedFinanceCosts;
        
        // Calculate interest on purchase price
        const lvrRate = 0.5; // 50% Loan to Value Ratio
        const adjustedInterestOnPurchase = Math.abs(
          adjustedResidualBeforeInterest - 
          adjustedResidualBeforeInterest / 
          (1 + settings[density].interestRate / 12 * calculationResults.projectPeriod * lvrRate)
        );
        
        // Calculate acquisition costs (3% of residual land value minus interest)
        const acquisitionRate = 0.03; // 3%
        const adjustedAcquisitionCosts = acquisitionRate * (adjustedResidualBeforeInterest - adjustedInterestOnPurchase);
        
        mainWs.addRow(['Acquisition Costs', acquisitionRate, adjustedAcquisitionCosts, '3% of (Adjusted Residual Land Value - Interest on Purchase Price)']);
      } else {
        // For high density, use original formula
        const acquisitionRate = 0.03; // 3%
        mainWs.addRow(['Acquisition Costs', acquisitionRate, { formula: `${acquisitionRate}*(C${netRealisationAfterProfitRow}-C${totalDevelopmentCostsRow}-C${landTaxRow}-C${financeRow}-C${interestOnPurchaseRow})` }, '3% of (Residual Land Value - Interest on Purchase Price)']);
      }
      
      // Residual Land Value section - Remove blank row and header
      
      // Residual Land Value Row - Update to include new costs
      if (density === 'mediumDensity') {
        // For medium density, calculate final Residual Land Value using adjusted values
        const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use setting or default to 200m² per dwelling
        const maxDwellingsByLotSize = Math.floor(calculationResults.developableArea / minimumLotSize);
        const actualYield = Math.min(calculationResults.developmentYield, maxDwellingsByLotSize);
        
        // Recalculate everything from the beginning
        // Adjusted gross realisation
        const adjustedGrossRealisation = actualYield * settings[density].dwellingPrice;
        
        // Adjusted selling costs
        const adjustedGst = adjustedGrossRealisation * 0.1;
        const adjustedAgentsCommission = adjustedGrossRealisation * settings[density].agentsSalesCommission;
        const adjustedLegalFees = adjustedGrossRealisation * settings[density].legalFeesOnSales;
        const adjustedMarketingCosts = adjustedGrossRealisation * settings[density].marketingCosts;
        
        // Adjusted net realisation
        const adjustedNetRealisation = adjustedGrossRealisation - adjustedGst - adjustedAgentsCommission - adjustedLegalFees - adjustedMarketingCosts;
        
        // Adjusted profit margin
        const adjustedProfitMargin = adjustedNetRealisation * settings[density].profitAndRisk;
        
        // Adjusted net realisation after profit
        const adjustedNetRealisationAfterProfit = adjustedNetRealisation - adjustedProfitMargin;
        
        // Adjusted GFA and construction costs
        const adjustedGfa = actualYield * calculationResults.dwellingSize;
        const adjustedConstructionCosts = adjustedGfa * calculationResults.constructionCostPerGfa;
        const adjustedProfessionalFees = adjustedConstructionCosts * settings[density].professionalFees;
        const adjustedDevelopmentContribution = adjustedConstructionCosts * settings[density].developmentContribution;
        const adjustedTotalDevelopmentCosts = adjustedConstructionCosts + calculationResults.daApplicationFees + adjustedProfessionalFees + adjustedDevelopmentContribution;
        
        // Calculate finance costs using adjusted total development costs
        const adjustedFinanceCosts = settings[density].interestRate * (projectDurationYears / 2) * adjustedTotalDevelopmentCosts;
        
        // Calculate residual land value before interest
        const adjustedResidualBeforeInterest = adjustedNetRealisationAfterProfit - adjustedTotalDevelopmentCosts - calculationResults.landTax - adjustedFinanceCosts;
        
        // Calculate interest on purchase price
        const lvrRate = 0.5; // 50% Loan to Value Ratio
        const adjustedInterestOnPurchase = Math.abs(
          adjustedResidualBeforeInterest - 
          adjustedResidualBeforeInterest / 
          (1 + settings[density].interestRate / 12 * calculationResults.projectPeriod * lvrRate)
        );
        
        // Calculate acquisition costs (3% of residual land value minus interest)
        const acquisitionRate = 0.03; // 3%
        const adjustedAcquisitionCosts = acquisitionRate * (adjustedResidualBeforeInterest - adjustedInterestOnPurchase);
        
        // Final residual land value
        const adjustedResidualLandValue = adjustedResidualBeforeInterest - adjustedInterestOnPurchase - adjustedAcquisitionCosts;
        
        mainWs.addRow(['Residual Land Value', '', adjustedResidualLandValue, 'Adjusted Net Realisation after Profit - Adjusted Total Costs - Finance Costs - Land Tax - Interest on Purchase - Acquisition Costs']);
      } else {
        // For high density, use original calculation
        mainWs.addRow(['Residual Land Value', '', { formula: `C${netRealisationAfterProfitRow}-C${totalDevelopmentCostsRow}-C${landTaxRow}-C${financeRow}-C${interestOnPurchaseRow}-C${acquisitionCostsRow}` }, 'Net Realisation after Profit - Total Costs - Finance Costs - Land Tax - Interest on Purchase - Acquisition Costs']);
      }
      
      // Set column widths
      mainWs.columns = [
        { width: 42 }, // A - Metric - Made wider as requested
        { width: 15 }, // B - Assumption Value
        { width: 40 }, // C - Value (with formulas) - Doubled width
        { width: 60 }, // D - Calculation Method
      ];
      
      // Format cells with numeric values
      mainWs.getRow(7).getCell(3).numFmt = '#,##0'; // Site Area - removed " m²" since it's in column D
      mainWs.getRow(8).getCell(3).numFmt = '0.00'; // FSR
      mainWs.getRow(9).getCell(3).numFmt = '0.0'; // HOB - removed " m" since it's in column D
      
      mainWs.getRow(developableAreaRow).getCell(3).numFmt = '#,##0" m²"'; // Developable Area
      mainWs.getRow(buildingFootprintRow).getCell(3).numFmt = '#,##0" m²"'; // Building Footprint
      mainWs.getRow(gfaRow).getCell(3).numFmt = '#,##0" m²"'; // GFA
      mainWs.getRow(developmentYieldRow).getCell(3).numFmt = '0" units"'; // Development Yield
      
      // Format percentage cells
      mainWs.getRow(buildingFootprintRow).getCell(2).numFmt = '0.0%'; // Site Efficiency Ratio
      mainWs.getRow(gstRow).getCell(2).numFmt = '0.0%'; // GST Rate
      mainWs.getRow(agentsCommissionRow).getCell(2).numFmt = '0.0%'; // Agent's Commission
      mainWs.getRow(legalFeesRow).getCell(2).numFmt = '0.0%'; // Legal Fees
      mainWs.getRow(marketingCostsRow).getCell(2).numFmt = '0.0%'; // Marketing Costs
      mainWs.getRow(profitMarginRow).getCell(2).numFmt = '0.0%'; // Profit and Risk
      mainWs.getRow(interestRateRow).getCell(2).numFmt = '0.0%'; // Interest Rate
      mainWs.getRow(interestRateRow).getCell(3).numFmt = '0.0%'; // Interest Rate in column C
      mainWs.getRow(acquisitionCostsRow).getCell(2).numFmt = '0.0%'; // Acquisition Costs Rate
      
      // Format currency cells in column C
      [
        medianUnitPriceRow, totalGrossRealisationRow, 
        gstRow, agentsCommissionRow, legalFeesRow, marketingCostsRow, netRealisationRow,
        profitMarginRow, netRealisationAfterProfitRow,
        constructionCostPerGfaRow, totalConstructionCostsRow, daApplicationFeesRow, 
        professionalFeesRow, developmentContributionRow, totalDevelopmentCostsRow,
        landTaxRow, financeRow, interestOnPurchaseRow, acquisitionCostsRow,
        mainWs.rowCount // Residual Land Value row
      ].forEach(row => {
        mainWs.getRow(row).getCell(3).numFmt = '$#,##0';
      });
      
      // Apply styles to main worksheet
      // Apply header style to first two rows
      for (let row = 1; row <= 2; row++) {
        for (let col = 1; col <= 4; col++) {
          mainWs.getRow(row).getCell(col).fill = headerStyle.fill;
          mainWs.getRow(row).getCell(col).font = headerStyle.font;
          mainWs.getRow(row).getCell(col).alignment = headerStyle.alignment;
        }
      }
      
      // Apply section header style to section headers
      // Only apply to Site Information, Development Metrics, and Feasibility Analysis
      [4, initialMetricsRow, feasibilityAnalysisRow].forEach(row => {
        for (let col = 1; col <= 4; col++) {
          mainWs.getRow(row).getCell(col).fill = sectionHeaderStyle.fill;
          mainWs.getRow(row).getCell(col).font = sectionHeaderStyle.font;
          mainWs.getRow(row).getCell(col).alignment = sectionHeaderStyle.alignment;
        }
      });
      
      // Apply total row style to total rows
      [totalGrossRealisationRow, netRealisationRow, netRealisationAfterProfitRow, totalDevelopmentCostsRow, mainWs.rowCount].forEach(row => {
        mainWs.getRow(row).getCell(4).value = ''; // Clear explanatory text for total rows
        
        for (let col = 1; col <= 4; col++) {
          mainWs.getRow(row).getCell(col).fill = totalRowStyle.fill;
          mainWs.getRow(row).getCell(col).font = totalRowStyle.font;
          mainWs.getRow(row).getCell(col).border = totalRowStyle.border;
        }
      });
      
      // ----------------- Sensitivity Worksheet -----------------
      
      // Add header and columns
      sensitivityWs.addRow(['Social/Affordable Housing Impact Analysis', '', '', '']);
      sensitivityWs.addRow(['', '', '', '']);
      sensitivityWs.addRow(['Percentage', 'Social Housing (0% revenue)', 'Affordable Housing (75% revenue)', '50/50 Mix']);
      
      // Add data rows
      sensitivityData.housingImpact.data.forEach(dataPoint => {
        sensitivityWs.addRow([
          dataPoint.percentage / 100, // Store as decimal for proper Excel percentage formatting
          dataPoint.socialResidualLandValue,
          dataPoint.affordableResidualLandValue,
          dataPoint.mixedResidualLandValue
        ]);
      });
      
      // Add breakeven section
      sensitivityWs.addRow(['', '', '', '']);
      const breakevenHeaderRow = sensitivityWs.addRow(['Breakeven Points', '', '', '']);
      
      const socialBreakeven = sensitivityData.housingImpact.breakeven?.social;
      const affordableBreakeven = sensitivityData.housingImpact.breakeven?.affordable;
      const mixedBreakeven = sensitivityData.housingImpact.breakeven?.mixed;
      
      sensitivityWs.addRow([
        'Social Housing', 
        socialBreakeven ? `${socialBreakeven.units} units (${Math.round(socialBreakeven.percentage)}%)` : 'Site feasible at 100%',
        '', 
        ''
      ]);
      
      sensitivityWs.addRow([
        'Affordable Housing', 
        affordableBreakeven ? `${affordableBreakeven.units} units (${Math.round(affordableBreakeven.percentage)}%)` : 'Site feasible at 100%',
        '', 
        ''
      ]);
      
      sensitivityWs.addRow([
        'Mixed Housing', 
        mixedBreakeven ? `${mixedBreakeven.units} units (${Math.round(mixedBreakeven.percentage)}%)` : 'Site feasible at 100%',
        '', 
        ''
      ]);
      
      // Set column widths
      sensitivityWs.columns = [
        { width: 20 }, // A
        { width: 35 }, // B
        { width: 35 }, // C
        { width: 35 }, // D
      ];
      
      // Format percentage cells
      for (let i = 4; i < sensitivityData.housingImpact.data.length + 4; i++) {
        sensitivityWs.getRow(i).getCell(1).numFmt = '0%';
      }
      
      // Format currency cells
      for (let i = 4; i < sensitivityData.housingImpact.data.length + 4; i++) {
        for (let col = 2; col <= 4; col++) {
          sensitivityWs.getRow(i).getCell(col).numFmt = '$#,##0';
        }
      }
      
      // Apply styles to sensitivity worksheet
      // Header row
      for (let col = 1; col <= 4; col++) {
        sensitivityWs.getRow(1).getCell(col).fill = headerStyle.fill;
        sensitivityWs.getRow(1).getCell(col).font = headerStyle.font;
        sensitivityWs.getRow(1).getCell(col).alignment = headerStyle.alignment;
      }
      
      // Column headers
      for (let col = 1; col <= 4; col++) {
        sensitivityWs.getRow(3).getCell(col).fill = sectionHeaderStyle.fill;
        sensitivityWs.getRow(3).getCell(col).font = sectionHeaderStyle.font;
        sensitivityWs.getRow(3).getCell(col).alignment = sectionHeaderStyle.alignment;
      }
      
      // Breakeven headers
      const breakevenRowIndex = 4 + sensitivityData.housingImpact.data.length + 1;
      for (let col = 1; col <= 4; col++) {
        sensitivityWs.getRow(breakevenRowIndex).getCell(col).fill = sectionHeaderStyle.fill;
        sensitivityWs.getRow(breakevenRowIndex).getCell(col).font = sectionHeaderStyle.font;
        sensitivityWs.getRow(breakevenRowIndex).getCell(col).alignment = sectionHeaderStyle.alignment;
      }
      
      // ----------------- LMR Comparison Worksheet (if applicable) -----------------
      if (lmrWs && lmrResults && lmrOptions?.isInLMRArea) {
        // Add headers
        lmrWs.addRow(['LMR Comparison Analysis', '', '', '']);
        lmrWs.addRow(['', '', '', '']);
        
        lmrWs.addRow(['Parameter', 'Current Controls', 'LMR Controls', 'Difference']);
        lmrWs.addRow(['', '', '', '']);
        
        // Development metrics comparison
        lmrWs.addRow(['Development Metrics', '', '', '']);
        
        const currentResults = calculationResults;
        lmrWs.addRow(['FSR', currentResults.fsr, lmrResults.fsr, lmrResults.fsr - currentResults.fsr]);
        lmrWs.addRow(['HOB (m)', currentResults.hob, lmrResults.hob, lmrResults.hob - currentResults.hob]);
        lmrWs.addRow(['GFA (m²)', Math.round(currentResults.gfa), Math.round(lmrResults.gfa), Math.round(lmrResults.gfa - currentResults.gfa)]);
        lmrWs.addRow(['Development Yield (units)', currentResults.developmentYield, lmrResults.developmentYield, lmrResults.developmentYield - currentResults.developmentYield]);
        lmrWs.addRow(['', '', '', '']);
        
        // Financial outcomes comparison
        lmrWs.addRow(['Financial Outcomes', '', '', '']);
        lmrWs.addRow(['Gross Realisation', currentResults.totalGrossRealisation, lmrResults.totalGrossRealisation, lmrResults.totalGrossRealisation - currentResults.totalGrossRealisation]);
        lmrWs.addRow(['Net Realisation', currentResults.netRealisation, lmrResults.netRealisation, lmrResults.netRealisation - currentResults.netRealisation]);
        lmrWs.addRow(['Construction Costs', currentResults.constructionCosts, lmrResults.constructionCosts, lmrResults.constructionCosts - currentResults.constructionCosts]);
        lmrWs.addRow(['Total Development Costs', currentResults.totalDevelopmentCosts, lmrResults.totalDevelopmentCosts, lmrResults.totalDevelopmentCosts - currentResults.totalDevelopmentCosts]);
        lmrWs.addRow(['Residual Land Value', currentResults.residualLandValue, lmrResults.residualLandValue, lmrResults.residualLandValue - currentResults.residualLandValue]);
        
        // Format LMR worksheet columns
        lmrWs.columns = [
          { width: 30 }, // A
          { width: 20 }, // B
          { width: 20 }, // C
          { width: 20 }, // D
        ];
        
        // Apply styles to LMR worksheet
        // Header
        for (let col = 1; col <= 4; col++) {
          lmrWs.getRow(1).getCell(col).fill = headerStyle.fill;
          lmrWs.getRow(1).getCell(col).font = headerStyle.font;
          lmrWs.getRow(1).getCell(col).alignment = headerStyle.alignment;
        }
        
        // Section headers and column headers
        [3, 5, 11].forEach(row => {
          for (let col = 1; col <= 4; col++) {
            lmrWs.getRow(row).getCell(col).fill = sectionHeaderStyle.fill;
            lmrWs.getRow(row).getCell(col).font = sectionHeaderStyle.font;
            lmrWs.getRow(row).getCell(col).alignment = sectionHeaderStyle.alignment;
          }
        });
        
        // Format currency cells
        [12, 13, 14, 15, 16].forEach(row => {
          for (let col = 2; col <= 4; col++) {
            lmrWs.getRow(row).getCell(col).numFmt = '$#,##0';
          }
        });
        
        // Format numeric cells
        [6, 8, 9].forEach(row => {
          for (let col = 2; col <= 4; col++) {
            if (row === 6) {
              lmrWs.getRow(row).getCell(col).numFmt = '0.00';
            } else if (row === 8) {
              lmrWs.getRow(row).getCell(col).numFmt = '#,##0" m²"';
            } else {
              lmrWs.getRow(row).getCell(col).numFmt = '#,##0" units"';
            }
          }
        });
        
        // Format height cells
        for (let col = 2; col <= 4; col++) {
          lmrWs.getRow(7).getCell(col).numFmt = '0.0" m"';
        }
        
        // Apply conditional formatting to difference column
        for (let row = 6; row <= 16; row++) {
          if (row === 10) continue; // Skip the empty row
          
          const cell = lmrWs.getRow(row).getCell(4);
          const value = cell.value;
          
          if (typeof value === 'number') {
            if (value > 0) {
              cell.font = { color: { argb: '006100' } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C6EFCE' } };
            } else if (value < 0) {
              cell.font = { color: { argb: '9C0006' } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC7CE' } };
            }
          }
        }
      }

      // Generate Excel file
      const excelBuffer = await wb.xlsx.writeBuffer();
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

  // Calculate Medium Density GFA and Development Yield
  const calculateMediumDensityActualYield = (calculationResults) => {
    const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use setting or default to 200m² per dwelling
    const maxDwellingsByLotSize = Math.floor(calculationResults.developableArea / minimumLotSize);
    
    // Use consistent actualYield calculation that defaults to lot size constraint when NSA calculation is 0
    return calculationResults.developmentYield === 0 && maxDwellingsByLotSize > 0
      ? maxDwellingsByLotSize 
      : Math.min(calculationResults.developmentYield, maxDwellingsByLotSize);
  };

  // Function to handle drawing the selected feature
  const handleDraw = async () => {
    // Call the utility function from mapUtils.js
    await createDrawingFromFeature(selectedFeature, setNotification, setIsDrawing);
  };

  // Calculate the visual center of a polygon (from screenshot.js)
  const calculateVisualCenter = (coordinates) => {
    try {
      // First try to use turf.pointOnFeature which often gives better results than centroid
      const polygon = turf.polygon([coordinates]);
      
      // Use pointOnFeature which finds a point guaranteed to be inside the polygon
      // This is often more visually appealing than centroid for irregular shapes
      const point = turf.pointOnFeature(polygon);
      
      // Further improve the point by running a simple pole of inaccessibility algorithm
      // This tries to find a point that's as far from the boundary as possible
      const boundaryDistance = (pt) => {
        // Calculate minimum distance to any segment of the boundary
        let minDistance = Infinity;
        
        for (let i = 0; i < coordinates.length - 1; i++) {
          const start = coordinates[i];
          const end = coordinates[i + 1];
          const distance = turf.pointToLineDistance(
            turf.point(pt.geometry.coordinates),
            turf.lineString([start, end])
          );
          minDistance = Math.min(minDistance, distance);
        }
        
        return minDistance;
      };
      
      // Start from the point inside the polygon
      let bestPoint = point;
      let bestDistance = boundaryDistance(bestPoint);
      
      // Try some small adjustments to find better placement
      const delta = 0.0001; // Small coordinate adjustment
      const directions = [
        [delta, 0], [-delta, 0], [0, delta], [0, -delta],
        [delta, delta], [-delta, delta], [delta, -delta], [-delta, -delta]
      ];
      
      // Try each direction to see if we get a better point
      for (let i = 0; i < directions.length; i++) {
        const [dx, dy] = directions[i];
        const newCoords = [
          bestPoint.geometry.coordinates[0] + dx,
          bestPoint.geometry.coordinates[1] + dy
        ];
        
        // Make sure the new point is inside the polygon
        if (turf.booleanPointInPolygon(turf.point(newCoords), polygon)) {
          const newPoint = turf.point(newCoords);
          const distance = boundaryDistance(newPoint);
          
          if (distance > bestDistance) {
            bestPoint = newPoint;
            bestDistance = distance;
          }
        }
      }
      
      return bestPoint;
    } catch (error) {
      console.warn('Error calculating visual center, falling back to centroid:', error);
      const polygon = turf.polygon([coordinates]);
      return turf.centroid(polygon);
    }
  };

  // Create scaled polygon based on center point and scale factor
  const createScaledPolygon = (coordinates, center, scaleFactor) => {
    const centerPoint = center.geometry.coordinates;
    
    // Scale each coordinate relative to the center point
    const scaledCoordinates = coordinates.map(coord => {
      const dx = coord[0] - centerPoint[0];
      const dy = coord[1] - centerPoint[1];
      return [
        centerPoint[0] + dx * scaleFactor,
        centerPoint[1] + dy * scaleFactor
      ];
    });
    
    return scaledCoordinates;
  };

  // Generate building footprint based on the developable area and building footprint percentage
  const generateBuildingFootprint = (feature, buildingFootprintRatio) => {
    if (!feature || !feature.geometry || !feature.geometry.coordinates) {
      return null;
    }
    
    try {
      // Handle different geometry types
      if (feature.geometry.type === 'Polygon') {
        const coordinates = feature.geometry.coordinates[0];
        const center = calculateVisualCenter(coordinates);
        
        // Calculate scale factor (square root because we're scaling in 2D)
        const scaleFactor = Math.sqrt(buildingFootprintRatio);
        
        // Create scaled polygon
        const scaledCoordinates = createScaledPolygon(coordinates, center, scaleFactor);
        
        // Create new feature with scaled geometry
        return {
          ...feature,
          geometry: {
            ...feature.geometry,
            coordinates: [[...scaledCoordinates, scaledCoordinates[0]]] // Close the polygon by repeating first point
          }
        };
      } else if (feature.geometry.type === 'MultiPolygon') {
        // For MultiPolygon, scale each polygon separately
        const newCoordinates = feature.geometry.coordinates.map(polygon => {
          const ringCoordinates = polygon[0];
          const center = calculateVisualCenter(ringCoordinates);
          const scaleFactor = Math.sqrt(buildingFootprintRatio);
          const scaledCoordinates = createScaledPolygon(ringCoordinates, center, scaleFactor);
          return [[...scaledCoordinates, scaledCoordinates[0]]]; // Close each polygon
        });
        
        return {
          ...feature,
          geometry: {
            ...feature.geometry,
            coordinates: newCoordinates
          }
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error generating building footprint:", error);
      return null;
    }
  };

  // Calculate building height in meters based on GFA and footprint
  const calculateBuildingHeight = (gfa, footprintArea, floorToFloorHeight) => {
    if (!footprintArea || footprintArea === 0) return 0;
    
    // Calculate the number of floors needed to achieve the desired GFA
    const numberOfFloors = Math.ceil(gfa / footprintArea);
    
    // Calculate height by multiplying the number of floors by the floor-to-floor height
    return numberOfFloors * floorToFloorHeight;
  };

  // Calculate area of a polygon in square meters
  const calculatePolygonArea = (coordinates) => {
    try {
      const polygon = turf.polygon([coordinates]);
      // turf.area returns area in square meters
      return turf.area(polygon);
    } catch (error) {
      console.error('Error calculating polygon area:', error);
      return 0;
    }
  };

  // Calculate polygon width in meters
  const calculatePolygonWidth = (coordinates) => {
    try {
      const polygon = turf.polygon([coordinates]);
      const bbox = turf.bbox(polygon);
      
      // Calculate width as the distance between west and east points
      const westPoint = turf.point([bbox[0], (bbox[1] + bbox[3]) / 2]);
      const eastPoint = turf.point([bbox[2], (bbox[1] + bbox[3]) / 2]);
      
      // Calculate the width in meters
      const width = turf.distance(westPoint, eastPoint, { units: 'meters' });
      
      // Calculate height (north-south) as well
      const southPoint = turf.point([(bbox[0] + bbox[2]) / 2, bbox[1]]);
      const northPoint = turf.point([(bbox[0] + bbox[2]) / 2, bbox[3]]);
      const height = turf.distance(southPoint, northPoint, { units: 'meters' });
      
      return { width, height, maxDimension: Math.max(width, height) };
    } catch (error) {
      console.error('Error calculating polygon width:', error);
      return { width: 0, height: 0, maxDimension: 0 };
    }
  };

  // Calculate optimal building configuration based on GFA and developable area
  const calculateOptimalBuildingConfig = (developableAreaFeature, gfa, settings) => {
    if (!developableAreaFeature || !gfa) return null;
    
    try {
      // Use current parameters instead of defaults
      const buildingFootprintRatio = currentBuildingParameters.siteEfficiencyRatio || settings.siteEfficiencyRatio;
      
      // Generate initial building footprint within the site efficiency ratio constraints
      const buildingFootprint = generateBuildingFootprint(developableAreaFeature, buildingFootprintRatio);
      if (!buildingFootprint) return null;
      
      // Calculate the footprint area
      let footprintArea = 0;
      if (buildingFootprint.geometry.type === 'Polygon') {
        footprintArea = calculatePolygonArea(buildingFootprint.geometry.coordinates[0]);
      } else if (buildingFootprint.geometry.type === 'MultiPolygon') {
        footprintArea = buildingFootprint.geometry.coordinates.reduce((total, polygon) => {
          return total + calculatePolygonArea(polygon[0]);
        }, 0);
      }
      
      if (footprintArea === 0) return null;
      
      // Get floor-to-floor height from current parameters
      const floorToFloorHeight = currentBuildingParameters.floorToFloorHeight || settings.floorToFloorHeight;
      
      // Get the Height of Building (HOB) limitation from the site controls, custom controls, or current parameters
      let hobLimit = 0;
      const MAX_BUILDING_HEIGHT = currentBuildingParameters.maxBuildingHeight || 100;
      
      if (customControls?.enabled && customControls.hob !== null) {
        // Use custom HOB if set
        hobLimit = customControls.hob;
      } else if (selectedFeature?.properties?.copiedFrom?.site_suitability__height_of_building) {
        // Otherwise use site's HOB
        hobLimit = selectedFeature.properties.copiedFrom.site_suitability__height_of_building;
      }
      
      // Enforce absolute max building height
      if (hobLimit === 0 || hobLimit > MAX_BUILDING_HEIGHT) {
        hobLimit = MAX_BUILDING_HEIGHT;
      }
      
      // Calculate maximum allowed floors based on HOB
      const maxAllowedFloors = Math.floor(hobLimit / floorToFloorHeight);
      
      // Calculate number of floors needed based on GFA and footprint
      const requiredFloors = Math.ceil(gfa / footprintArea);
      
      // Respect HOB limitation by capping the number of floors
      const numberOfFloors = Math.min(requiredFloors, maxAllowedFloors);
      
      // Calculate total building height (respects HOB)
      const buildingHeight = numberOfFloors * floorToFloorHeight;
      
      // Use custom max building width from parameters
      const MAX_WIDTH_METERS = currentBuildingParameters.maxBuildingWidth || 18;
      const MIN_BUILDING_SEPARATION = currentBuildingParameters.minBuildingSeparation || 6;
      
      // Determine if we need multiple buildings based on:
      // 1. aspect ratio
      // 2. if building would be too tall
      // 3. if width exceeds 18m
      let aspectRatio = 1;
      let boundingBox = null;
      let maxDimension = 0;
      let exceedsMaxWidth = false;
      
      if (buildingFootprint.geometry.type === 'Polygon') {
        // Calculate aspect ratio
        boundingBox = turf.bbox(buildingFootprint);
        const width = boundingBox[2] - boundingBox[0];
        const height = boundingBox[3] - boundingBox[1];
        aspectRatio = Math.max(width, height) / Math.min(width, height);
        
        // Calculate actual width in meters
        const dimensions = calculatePolygonWidth(buildingFootprint.geometry.coordinates[0]);
        maxDimension = dimensions.maxDimension;
        exceedsMaxWidth = maxDimension > MAX_WIDTH_METERS;
      }
      
      // Threshold for multiple buildings - if aspect ratio is too high, building is too tall,
      // exceeds HOB limit, or is too wide
      const maxAspectRatio = 3;
      const maxFloors = 30;
      const exceededHobLimit = hobLimit > 0 && requiredFloors > maxAllowedFloors;
      const shouldUseMultipleBuildings = aspectRatio > maxAspectRatio || 
                                        requiredFloors > maxFloors || 
                                        exceededHobLimit ||
                                        exceedsMaxWidth;
      
      // If we need multiple buildings, determine optimal number and distribution
      if (shouldUseMultipleBuildings) {
        // Calculate optimal number of buildings
        // Consider all constraints, including width
        let widthBasedBuildingCount = exceedsMaxWidth ? Math.ceil(maxDimension / MAX_WIDTH_METERS) : 1;
        
        let optimalBuildingCount = Math.max(
          exceededHobLimit ? Math.ceil(requiredFloors / maxAllowedFloors) : 1,
          aspectRatio > maxAspectRatio ? Math.ceil(aspectRatio / maxAspectRatio) : 1,
          widthBasedBuildingCount
        );
        
        // Maximum number of buildings to fit within the developable area
        // For very small sites, we should limit the number of buildings
        // so there's enough space between them
        const siteDiameterM = Math.sqrt(footprintArea);
        const maxBuildingsForSite = Math.max(1, Math.floor(siteDiameterM / (MAX_WIDTH_METERS + MIN_BUILDING_SEPARATION)));
        
        optimalBuildingCount = Math.min(Math.max(optimalBuildingCount, 2), maxBuildingsForSite, 8); // Never more than 8 buildings
        
        // Create multiple buildings
        const buildings = [];
        const gfaPerBuilding = gfa / optimalBuildingCount;
        
        // For building placement, we'll use a circular arrangement
        // with minimum separation enforced
        // Calculate the radius of the circle based on site size and min separation
        const optimalRadius = Math.max(
          siteDiameterM / 4, // Base radius on site size
          MIN_BUILDING_SEPARATION / (2 * Math.sin(Math.PI / optimalBuildingCount)) // Ensure min separation
        );
        
        // Get the center of the developable area for placement
        let centerPoint;
        if (buildingFootprint.geometry.type === 'Polygon') {
          const coordinates = buildingFootprint.geometry.coordinates[0];
          const center = calculateVisualCenter(coordinates);
          centerPoint = center.geometry.coordinates;
        } else {
          // For MultiPolygon, use the first polygon's center
          const coordinates = buildingFootprint.geometry.coordinates[0][0];
          const center = calculateVisualCenter(coordinates);
          centerPoint = center.geometry.coordinates;
        }
        
        // Building placements: collect all positions before creating buildings
        // so we can check for collisions
        const buildingPlacements = [];
        
        for (let i = 0; i < optimalBuildingCount; i++) {
          // Create smaller building footprints that together have the same total area
          // Use a smaller scale factor if we're dividing due to width constraints to ensure narrow buildings
          const baseScaleFactor = 1 / Math.sqrt(optimalBuildingCount);
          
          // If width is the constraint, make buildings narrower in the widest dimension
          const scaleFactor = exceedsMaxWidth ? 
            baseScaleFactor * (widthBasedBuildingCount > optimalBuildingCount ? 0.8 : 0.6) : 
            baseScaleFactor;
          
          // Calculate angle and position on the circle
          const angle = (2 * Math.PI * i) / optimalBuildingCount;
          
          // Calculate offset in longitude/latitude
          // Convert optimalRadius from meters to degrees approximately
          // 111,320 meters is approximately 1 degree of latitude
          // For longitude, we adjust for latitude (becomes wider near equator, narrower near poles)
          const latFactor = 111320; // meters per degree latitude
          const lonFactor = 111320 * Math.cos(centerPoint[1] * (Math.PI / 180)); // meters per degree longitude at this latitude
          
          const offsetLat = (optimalRadius * Math.sin(angle)) / latFactor;
          const offsetLon = (optimalRadius * Math.cos(angle)) / lonFactor;
          
          buildingPlacements.push({
            index: i,
            angle: angle,
            position: [centerPoint[0] + offsetLon, centerPoint[1] + offsetLat],
            scaleFactor: scaleFactor
          });
        }
        
        // Function to check if two buildings are too close (less than MIN_BUILDING_SEPARATION meters)
        const areBuildingsTooClose = (pos1, pos2) => {
          const point1 = turf.point(pos1);
          const point2 = turf.point(pos2);
          const distance = turf.distance(point1, point2, { units: 'meters' });
          return distance < MIN_BUILDING_SEPARATION;
        };
        
        // Adjust placements if buildings are too close - improved algorithm
        let maxIterations = 10; // Increase iterations for better convergence
        for (let iteration = 0; iteration < maxIterations; iteration++) {
          let adjustmentsMade = false;
          
          for (let i = 0; i < buildingPlacements.length; i++) {
            for (let j = i + 1; j < buildingPlacements.length; j++) {
              if (areBuildingsTooClose(buildingPlacements[i].position, buildingPlacements[j].position)) {
                // Move both buildings away from each other
                const point1 = turf.point(buildingPlacements[i].position);
                const point2 = turf.point(buildingPlacements[j].position);
                const bearing = turf.bearing(point1, point2);
                
                // Calculate current distance
                const currentDistance = turf.distance(point1, point2, { units: 'meters' });
                // Calculate how much more distance we need
                const additionalDistance = MIN_BUILDING_SEPARATION - currentDistance;
                // Add extra buffer to ensure separation
                const adjustmentDistance = (additionalDistance / 2) + 0.5; 
                
                // Move in opposite directions along the bearing line
                const adjustedPoint1 = turf.destination(point1, adjustmentDistance, bearing - 180, { units: 'meters' });
                const adjustedPoint2 = turf.destination(point2, adjustmentDistance, bearing, { units: 'meters' });
                
                buildingPlacements[i].position = adjustedPoint1.geometry.coordinates;
                buildingPlacements[j].position = adjustedPoint2.geometry.coordinates;
                
                adjustmentsMade = true;
              }
            }
          }
          
          if (!adjustmentsMade) break;
        }
        
        // Verify all buildings have proper spacing
        let allBuildingsProperlySpaced = true;
        for (let i = 0; i < buildingPlacements.length; i++) {
          for (let j = i + 1; j < buildingPlacements.length; j++) {
            if (areBuildingsTooClose(buildingPlacements[i].position, buildingPlacements[j].position)) {
              allBuildingsProperlySpaced = false;
              console.warn(`Buildings ${i} and ${j} are still too close after adjustments`);
            }
          }
        }
        
        // If buildings are still too close, reduce the number of buildings
        if (!allBuildingsProperlySpaced && optimalBuildingCount > 2) {
          console.log(`Reducing building count from ${optimalBuildingCount} to ${optimalBuildingCount-1} due to spacing constraints`);
          optimalBuildingCount--;
          // Remove the last building placement
          buildingPlacements.pop();
        }
        
        // Create a polygon object for checking if points are inside developable area
        let developableAreaPolygon;
        if (developableAreaFeature.geometry.type === 'Polygon') {
          developableAreaPolygon = turf.polygon(developableAreaFeature.geometry.coordinates);
        } else if (developableAreaFeature.geometry.type === 'MultiPolygon') {
          // For multipolygon, we'll just use the first polygon for now
          // This is a simplification, but should work for most cases
          developableAreaPolygon = turf.polygon(developableAreaFeature.geometry.coordinates[0]);
        }
        
        // Check if building placements are within the developable area
        for (let i = 0; i < buildingPlacements.length; i++) {
          const placement = buildingPlacements[i];
          const point = turf.point(placement.position);
          
          // Check if point is inside developable area
          if (!turf.booleanPointInPolygon(point, developableAreaPolygon)) {
            console.warn(`Building ${i} is outside developable area, adjusting position`);
            
            // Move point back toward center until it's inside the polygon
            const center = turf.point(centerPoint);
            const bearing = turf.bearing(center, point);
            const originalDistance = turf.distance(center, point, { units: 'meters' });
            
            // Binary search to find the maximum distance we can go while staying inside
            let minDistance = 0; // Definitely inside (at center)
            let maxDistance = originalDistance;
            let currentDistance = maxDistance * 0.8; // Start at 80% of original distance
            let iterations = 0;
            const maxSearchIterations = 10;
            
            while (iterations < maxSearchIterations) {
              iterations++;
              
              // Move point toward center by the current distance percentage
              const adjustedPoint = turf.destination(center, currentDistance, bearing, { units: 'meters' });
              
              if (turf.booleanPointInPolygon(adjustedPoint, developableAreaPolygon)) {
                // This position works, try going a bit further out
                minDistance = currentDistance;
                currentDistance = (currentDistance + maxDistance) / 2;
              } else {
                // This position is outside, try moving closer to center
                maxDistance = currentDistance;
                currentDistance = (minDistance + currentDistance) / 2;
              }
              
              // If we've converged to a good enough solution, stop
              if (maxDistance - minDistance < 1) {
                break;
              }
            }
            
            // Use the found distance that keeps the point inside
            const finalPoint = turf.destination(center, minDistance, bearing, { units: 'meters' });
            buildingPlacements[i].position = finalPoint.geometry.coordinates;
            
            // Add a small buffer from the edge (move slightly toward center)
            const safetyBufferMeters = 2;
            const bufferedPoint = turf.destination(
              turf.point(buildingPlacements[i].position),
              safetyBufferMeters,
              turf.bearing(turf.point(buildingPlacements[i].position), center),
              { units: 'meters' }
            );
            buildingPlacements[i].position = bufferedPoint.geometry.coordinates;
          }
        }
        
        // Create buildings using the final placements
        for (const placement of buildingPlacements) {
          let buildingFeature;
          
          if (buildingFootprint.geometry.type === 'Polygon') {
            const coordinates = buildingFootprint.geometry.coordinates[0];
            const center = { geometry: { coordinates: centerPoint } };
            
            // Create a smaller footprint for this building
            const scaledCoordinates = createScaledPolygon(coordinates, center, placement.scaleFactor);
            
            // Move the scaled footprint to the designated position
            const offsetCoordinates = scaledCoordinates.map(coord => {
              // Calculate the offset from center to the new position
              const offsetLon = placement.position[0] - centerPoint[0];
              const offsetLat = placement.position[1] - centerPoint[1];
              
              return [
                coord[0] + offsetLon,
                coord[1] + offsetLat
              ];
            });
            
            buildingFeature = {
              ...buildingFootprint,
              geometry: {
                ...buildingFootprint.geometry,
                coordinates: [[...offsetCoordinates, offsetCoordinates[0]]] // Close the polygon
              }
            };
            
            // Check if the new building still exceeds max width
            const newDimensions = calculatePolygonWidth(buildingFeature.geometry.coordinates[0]);
            if (newDimensions.maxDimension > MAX_WIDTH_METERS) {
              // Further constrain the shape in the direction of its longest dimension
              const isWiderThanTall = newDimensions.width > newDimensions.height;
              const constraintScaleFactor = isWiderThanTall ? 
                [MAX_WIDTH_METERS / newDimensions.width, 1.0] : 
                [1.0, MAX_WIDTH_METERS / newDimensions.height];
              
              const positionCenter = { geometry: { coordinates: placement.position } };
              const constrainedCoordinates = offsetCoordinates.map(coord => [
                positionCenter.geometry.coordinates[0] + (coord[0] - positionCenter.geometry.coordinates[0]) * constraintScaleFactor[0],
                positionCenter.geometry.coordinates[1] + (coord[1] - positionCenter.geometry.coordinates[1]) * constraintScaleFactor[1]
              ]);
              
              buildingFeature.geometry.coordinates = [[...constrainedCoordinates, constrainedCoordinates[0]]];
            }
          } else if (buildingFootprint.geometry.type === 'MultiPolygon' && buildingFootprint.geometry.coordinates.length > 0) {
            // For MultiPolygon, use the first polygon for each building
            const polygonIndex = Math.min(placement.index % buildingFootprint.geometry.coordinates.length, buildingFootprint.geometry.coordinates.length - 1);
            const coordinates = buildingFootprint.geometry.coordinates[polygonIndex][0];
            const center = { geometry: { coordinates: centerPoint } };
            
            // Create a smaller footprint for this building
            const scaledCoordinates = createScaledPolygon(coordinates, center, placement.scaleFactor);
            
            // Move the scaled footprint to the designated position
            const offsetCoordinates = scaledCoordinates.map(coord => {
              // Calculate the offset from center to the new position
              const offsetLon = placement.position[0] - centerPoint[0];
              const offsetLat = placement.position[1] - centerPoint[1];
              
              return [
                coord[0] + offsetLon,
                coord[1] + offsetLat
              ];
            });
            
            buildingFeature = {
              ...buildingFootprint,
              geometry: {
                type: 'Polygon',
                coordinates: [[...offsetCoordinates, offsetCoordinates[0]]] // Close the polygon
              }
            };
            
            // Check if the new building still exceeds max width, similar to above
            const newDimensions = calculatePolygonWidth(buildingFeature.geometry.coordinates[0]);
            if (newDimensions.maxDimension > MAX_WIDTH_METERS) {
              const isWiderThanTall = newDimensions.width > newDimensions.height;
              const constraintScaleFactor = isWiderThanTall ? 
                [MAX_WIDTH_METERS / newDimensions.width, 1.0] : 
                [1.0, MAX_WIDTH_METERS / newDimensions.height];
              
              const positionCenter = { geometry: { coordinates: placement.position } };
              const constrainedCoordinates = offsetCoordinates.map(coord => [
                positionCenter.geometry.coordinates[0] + (coord[0] - positionCenter.geometry.coordinates[0]) * constraintScaleFactor[0],
                positionCenter.geometry.coordinates[1] + (coord[1] - positionCenter.geometry.coordinates[1]) * constraintScaleFactor[1]
              ]);
              
              buildingFeature.geometry.coordinates = [[...constrainedCoordinates, constrainedCoordinates[0]]];
            }
          } else {
            continue; // Skip if no valid geometry
          }
          
          // Calculate the footprint area of this individual building
          const buildingFootprintArea = calculatePolygonArea(buildingFeature.geometry.coordinates[0]);
          
          // Calculate building height for this individual building (respecting HOB)
          const buildingRequiredFloors = Math.ceil(gfaPerBuilding / buildingFootprintArea);
          
          // Strictly enforce HOB limit
          const buildingFloors = hobLimit > 0 
            ? Math.min(buildingRequiredFloors, maxAllowedFloors) 
            : buildingRequiredFloors;
            
          // Ensure building height is exactly based on floor count
          const buildingHeight = buildingFloors * floorToFloorHeight;
          
          // Calculate actual GFA based on capped height (if HOB restricted)
          const actualBuildingGfa = buildingFloors * buildingFootprintArea;
          
          // Add building properties
          const building = {
            ...buildingFeature,
            properties: {
              ...buildingFeature.properties,
              name: `Building-${placement.index + 1}`,
              height: buildingHeight,
              floorToFloor: floorToFloorHeight,
              efficiency: settings.gbaToGfaRatio,
              sellEfficiency: settings.gfaToNsaRatio,
              shiny: true,
              fillColor: '#9900CC',
              fillOpacity: 1,
              outlineColor: '#660099',
              floors: buildingFloors,
              gfa: actualBuildingGfa,
              hobRestricted: buildingRequiredFloors > maxAllowedFloors,
              widthRestricted: exceedsMaxWidth,
              extrude: true, // Add extrude property for 3D display
              color: "#777777",
              stroke: "grey"
            }
          };
          
          // Check if building is completely within developable area
          let isCompletelyInside = true;
          if (building.geometry.type === 'Polygon') {
            try {
              // Check that the building footprint is fully inside the developable area
              // First, simplify it slightly for faster computation
              const simplifiedBuilding = turf.simplify(turf.polygon(building.geometry.coordinates), {
                tolerance: 0.00001,
                highQuality: false
              });
              
              // Then check if it's contained within developable area
              if (!turf.booleanWithin(simplifiedBuilding, developableAreaPolygon)) {
                isCompletelyInside = false;
                console.warn(`Building ${placement.index + 1} footprint extends outside developable area, scaling down`);
                
                // Scale down the building slightly toward its center
                const buildingCenter = turf.centroid(simplifiedBuilding);
                const reducedScale = placement.scaleFactor * 0.85; // 85% of original scale
                
                // Re-generate the building with the reduced scale
                let newCoordinates;
                if (buildingFootprint.geometry.type === 'Polygon') {
                  newCoordinates = createScaledPolygon(
                    buildingFootprint.geometry.coordinates[0], 
                    buildingCenter, 
                    reducedScale
                  );
                } else {
                  // For MultiPolygon, use the relevant polygon
                  const polygonIndex = Math.min(
                    placement.index % buildingFootprint.geometry.coordinates.length, 
                    buildingFootprint.geometry.coordinates.length - 1
                  );
                  newCoordinates = createScaledPolygon(
                    buildingFootprint.geometry.coordinates[polygonIndex][0], 
                    buildingCenter, 
                    reducedScale
                  );
                }
                
                // Update building geometry
                building.geometry.coordinates = [[...newCoordinates, newCoordinates[0]]];
                
                // Recalculate footprint area and update related properties
                const newFootprintArea = calculatePolygonArea(building.geometry.coordinates[0]);
                const newBuildingGfa = buildingFloors * newFootprintArea;
                building.properties.gfa = newBuildingGfa;
              }
            } catch (error) {
              console.error("Error checking building containment:", error);
              // If error occurs, proceed with original building
            }
          }
          
          buildings.push(building);
        }
        
        return { 
          buildings, 
          buildingCount: optimalBuildingCount,
          hobRestricted: exceededHobLimit,
          widthRestricted: exceedsMaxWidth,
          maxAllowedFloors: maxAllowedFloors,
          hobLimit: hobLimit,
          maxWidth: MAX_WIDTH_METERS,
          minSeparation: MIN_BUILDING_SEPARATION
        };
      } else {
        // Single building is optimal
        // Check if it's under width constraints
        const dimensions = buildingFootprint.geometry.type === 'Polygon' ? 
          calculatePolygonWidth(buildingFootprint.geometry.coordinates[0]) : 
          { maxDimension: 0 };
        
        // If the single building would be too wide, constrain it
        if (dimensions.maxDimension > MAX_WIDTH_METERS) {
          // Get the center
          const coordinates = buildingFootprint.geometry.coordinates[0];
          const center = calculateVisualCenter(coordinates);
          
          // Constrain the shape in the direction of its longest dimension
          const isWiderThanTall = dimensions.width > dimensions.height;
          const constraintScaleFactor = isWiderThanTall ? 
            [MAX_WIDTH_METERS / dimensions.width, 1.0] : 
            [1.0, MAX_WIDTH_METERS / dimensions.height];
          
          const constrainedCoordinates = coordinates.map(coord => [
            center.geometry.coordinates[0] + (coord[0] - center.geometry.coordinates[0]) * constraintScaleFactor[0],
            center.geometry.coordinates[1] + (coord[1] - center.geometry.coordinates[1]) * constraintScaleFactor[1]
          ]);
          
          buildingFootprint.geometry.coordinates = [[...constrainedCoordinates, constrainedCoordinates[0]]];
          
          // Recalculate footprint area after constraint
          footprintArea = calculatePolygonArea(buildingFootprint.geometry.coordinates[0]);
        }
        
        // Check if the required GFA can fit within HOB limits
        const actualFloors = hobLimit > 0 
          ? Math.min(requiredFloors, maxAllowedFloors) 
          : requiredFloors;
        const actualHeight = actualFloors * floorToFloorHeight;
        const actualGfa = actualFloors * footprintArea;
        
        const building = {
          ...buildingFootprint,
          properties: {
            ...buildingFootprint.properties,
            name: 'Building-Massing',
            height: actualHeight, // Use actualHeight based on floors to ensure HOB compliance
            floorToFloor: floorToFloorHeight, 
            efficiency: settings.gbaToGfaRatio,
            sellEfficiency: settings.gfaToNsaRatio,
            shiny: true,
            fillColor: '#9900CC',
            fillOpacity: 1,
            outlineColor: '#660099',
            floors: actualFloors,
            gfa: actualGfa,
            hobRestricted: requiredFloors > maxAllowedFloors,
            widthRestricted: dimensions.maxDimension > MAX_WIDTH_METERS,
            extrude: true, // Add extrude property for 3D display
            color: "#777777",
            stroke: "grey"
          }
        };
        
        // Check if single building is completely within developable area
        let developableAreaPolygon = null;
        if (developableAreaFeature.geometry.type === 'Polygon') {
          developableAreaPolygon = turf.polygon(developableAreaFeature.geometry.coordinates);
        } else if (developableAreaFeature.geometry.type === 'MultiPolygon') {
          developableAreaPolygon = turf.polygon(developableAreaFeature.geometry.coordinates[0]);
        }
        
        if (developableAreaPolygon && building.geometry.type === 'Polygon') {
          try {
            // Check that the building footprint is fully inside the developable area
            const simplifiedBuilding = turf.simplify(turf.polygon(building.geometry.coordinates), {
              tolerance: 0.00001,
              highQuality: false
            });
            
            // Then check if it's contained
            if (!turf.booleanWithin(simplifiedBuilding, developableAreaPolygon)) {
              console.warn(`Single building footprint extends outside developable area, scaling down`);
              
              // Get the center of the building
              const buildingCenter = calculateVisualCenter(building.geometry.coordinates[0]);
              
              // Scale down slightly (90% of original size)
              const reducedScale = 0.9;
              const newCoordinates = createScaledPolygon(
                building.geometry.coordinates[0], 
                buildingCenter, 
                reducedScale
              );
              
              // Update geometry
              building.geometry.coordinates = [[...newCoordinates, newCoordinates[0]]];
              
              // Recalculate area and GFA
              const newFootprintArea = calculatePolygonArea(building.geometry.coordinates[0]);
              const newGfa = actualFloors * newFootprintArea;
              building.properties.gfa = newGfa;
            }
          } catch (error) {
            console.error("Error checking single building containment:", error);
          }
        }
        
        return { 
          buildings: [building], 
          buildingCount: 1,
          hobRestricted: requiredFloors > maxAllowedFloors,
          maxAllowedFloors: maxAllowedFloors,
          hobLimit: hobLimit,
          widthRestricted: dimensions.maxDimension > MAX_WIDTH_METERS,
          maxWidth: MAX_WIDTH_METERS,
          minSeparation: MIN_BUILDING_SEPARATION
        };
      }
    } catch (error) {
      console.error('Error calculating optimal building configuration:', error);
      return null;
    }
  };

  // Function to handle massing generation
  const handleGenerateMassing = async () => {
    try {
      setIsDrawing(true);
      
      // First check if we have a developable area
      if (!developableArea || !developableArea.features || developableArea.features.length === 0) {
        setNotification({
          type: 'error',
          message: 'No developable area available. Please create a developable area first.'
        });
        setIsDrawing(false);
        return;
      }
      
      if (!calculationResults) {
        setNotification({
          type: 'error',
          message: 'Missing calculation results. Please ensure calculations are complete.'
        });
        setIsDrawing(false);
        return;
      }
      
      // Get GFA from calculations, ensuring proper handling of missing values
      let gfa = calculationResults.gfa;
      
      // If GFA is 0 or missing, try to use HOB-based calculation
      if (!gfa || gfa === 0) {
        // For high density, we need to follow the same approach as in FeasibilitySettings
        // This means using site efficiency ratio (60% by default) for building footprint 
        // rather than 100% of developable area
        
        // Get HOB and use it if available
        let hob = 0;
        if (customControls?.enabled && customControls.hob !== null) {
          hob = customControls.hob;
        } else if (selectedFeature?.properties?.copiedFrom?.site_suitability__height_of_building) {
          hob = selectedFeature.properties.copiedFrom.site_suitability__height_of_building;
        }
        
        if (hob > 0) {
          // Calculate number of floors based on HOB and floor-to-floor height
          const maxStoreys = Math.floor(hob / settings[density].floorToFloorHeight);
          
          // For medium density, use the full developable area for building footprint
          // For high density, use the siteEfficiencyRatio as in the original calculations
          const siteCoverage = density === 'mediumDensity' 
            ? calculationResults.developableArea
            : calculationResults.developableArea * settings[density].siteEfficiencyRatio;
          
          // GFA = Site Coverage × Storeys × GBA to GFA Ratio
          gfa = siteCoverage * maxStoreys * settings[density].gbaToGfaRatio;
          
          console.log(`Recalculated GFA using HOB (${hob}m): ${gfa} m²`);
          console.log(`- HOB approach: ${hob}m height / ${settings[density].floorToFloorHeight}m per floor = ${maxStoreys} floors`);
          console.log(`- Site coverage: ${siteCoverage} m² (${density === 'mediumDensity' ? '100%' : (settings[density].siteEfficiencyRatio * 100).toFixed(0) + '%'} of ${calculationResults.developableArea} m²)`);
          console.log(`- GFA calculation: ${siteCoverage} m² × ${maxStoreys} floors × ${settings[density].gbaToGfaRatio} efficiency = ${gfa} m²`);
        } else {
          setNotification({
            type: 'error',
            message: 'Cannot generate massing: GFA is 0 and no HOB value available.'
          });
          setIsDrawing(false);
          return;
        }
      }
      
      // Use the developable area features to generate buildings
      // If multiple features exist, we'll create a building on each one where appropriate
      const buildingResults = [];
      let totalBuildings = 0;
      let anyHobRestricted = false;
      let anyWidthRestricted = false;
      let maxAllowedFloors = Infinity;
      let hobLimit = 0;
      let optimalConfig = null;
      
      // Generate buildings for each developable area feature
      for (const feature of developableArea.features) {
        // Get GFA from calculations - distribute proportionally if multiple areas
        const featureArea = calculatePolygonArea(feature.geometry.coordinates[0]);
        const totalArea = calculationResults.developableArea;
        const featureGFA = gfa * (featureArea / totalArea); // Use our potentially recalculated GFA
        
        // Calculate optimal building configuration
        const config = calculateOptimalBuildingConfig(feature, featureGFA, settings[density]);
        
        if (!config) continue;
        
        optimalConfig = config; // Store for notification message
        totalBuildings += config.buildingCount;
        if (config.hobRestricted) {
          anyHobRestricted = true;
          maxAllowedFloors = config.maxAllowedFloors;
          hobLimit = config.hobLimit;
        }
        if (config.widthRestricted) {
          anyWidthRestricted = true;
        }
        
        // Create each building
        for (const building of config.buildings) {
          const buildingResult = await createStyledDrawingFromFeature(
            building,
            {
              fillColor: building.properties.fillColor,
              fillOpacity: building.properties.fillOpacity,
              outlineColor: building.properties.outlineColor,
              namePrefix: `${density === 'mediumDensity' ? 'Medium' : 'High'}-Density-${building.properties.name}`,
              description: `${density === 'mediumDensity' ? 'Medium' : 'High'} Density Building (${building.properties.height.toFixed(1)}m height, ${building.properties.floors} floors)`,
              includeTimestamp: true
            },
            (notification) => {
              // Suppress intermediate notifications
              console.log('Building creation notification:', notification);
            },
            () => {}
          );
          
          if (buildingResult) {
            buildingResults.push(buildingResult);
          }
        }
      }
      
      if (buildingResults.length > 0) {
        let successMessage = '';
        
        if (anyHobRestricted && anyWidthRestricted) {
          successMessage = `Generated ${totalBuildings} buildings (limited by both ${hobLimit}m height and 18m width constraints)`;
        } else if (anyHobRestricted) {
          successMessage = `Generated ${totalBuildings} buildings (height limited to ${hobLimit}m/${maxAllowedFloors} floors by HOB controls)`;
        } else if (anyWidthRestricted) {
          successMessage = `Generated ${totalBuildings} buildings (width limited to 18m maximum)`;
        } else if (totalBuildings > 1) {
          successMessage = `Successfully generated ${totalBuildings} buildings optimized for ${Math.round(gfa).toLocaleString()} m² GFA`;
        } else if (optimalConfig) {
          successMessage = `Building massing generated (${optimalConfig.buildings[0].properties.floors} floors, ${optimalConfig.buildings[0].properties.height.toFixed(1)}m height)`;
        }
        
        setNotification({
          type: 'success',
          message: successMessage
        });
      } else {
        setNotification({
          type: 'error',
          message: 'Failed to generate any buildings. Please try again.'
        });
      }
    } catch (error) {
      console.error("Error in handleGenerateMassing:", error);
      setNotification({
        type: 'error',
        message: `Failed to generate massing: ${error.message}`
      });
    } finally {
      setIsDrawing(false);
    }
  };

  // Modal component for massing options
  const MassingOptionsModal = () => {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold flex items-center">
              <Building2 className="mr-2" /> Building Massing Options
            </h3>
            <button 
              onClick={() => setShowMassingModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            <div>
              <label className="block mb-2 font-medium text-gray-700">Building Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  className={`p-3 flex flex-col items-center justify-center rounded-md border ${
                    massingOptions.buildingType === 'single' 
                      ? 'bg-purple-100 border-purple-500' 
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setMassingOptions({...massingOptions, buildingType: 'single'})}
                >
                  <Building2 size={24} className={massingOptions.buildingType === 'single' ? 'text-purple-600' : 'text-gray-600'} />
                  <span className="mt-1 text-sm">Single Building</span>
                </button>
                <button 
                  className={`p-3 flex flex-col items-center justify-center rounded-md border ${
                    massingOptions.buildingType === 'multiple' 
                      ? 'bg-purple-100 border-purple-500' 
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setMassingOptions({...massingOptions, buildingType: 'multiple'})}
                >
                  <Layers size={24} className={massingOptions.buildingType === 'multiple' ? 'text-purple-600' : 'text-gray-600'} />
                  <span className="mt-1 text-sm">Multiple Buildings</span>
                </button>
              </div>
            </div>
            
            {massingOptions.buildingType === 'multiple' && (
              <div>
                <label className="block mb-2 font-medium text-gray-700">Number of Buildings</label>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="2"
                    max="5"
                    value={massingOptions.numberOfBuildings}
                    onChange={(e) => setMassingOptions({...massingOptions, numberOfBuildings: parseInt(e.target.value)})}
                    className="w-full"
                  />
                  <span className="ml-2 w-8 text-center">{massingOptions.numberOfBuildings}</span>
                </div>
              </div>
            )}
            
            {massingOptions.buildingType === 'multiple' && (
              <div>
                <label className="block mb-2 font-medium text-gray-700">Building Distribution</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    className={`p-2 flex items-center justify-center rounded-md border ${
                      massingOptions.buildingDistribution === 'equal' 
                        ? 'bg-purple-100 border-purple-500' 
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setMassingOptions({...massingOptions, buildingDistribution: 'equal'})}
                  >
                    <span className="text-sm">Equal Heights</span>
                  </button>
                  <button 
                    className={`p-2 flex items-center justify-center rounded-md border ${
                      massingOptions.buildingDistribution === 'varied' 
                        ? 'bg-purple-100 border-purple-500' 
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setMassingOptions({...massingOptions, buildingDistribution: 'varied'})}
                  >
                    <span className="text-sm">Varied Heights</span>
                  </button>
                </div>
              </div>
            )}
            
            <div>
              <label className="block mb-2 font-medium text-gray-700">Floor to Floor Height (meters)</label>
              <div className="flex items-center">
                <input
                  type="range"
                  min="2.5"
                  max="4.5"
                  step="0.1"
                  value={massingOptions.floorToFloor}
                  onChange={(e) => setMassingOptions({...massingOptions, floorToFloor: parseFloat(e.target.value)})}
                  className="w-full"
                />
                <span className="ml-2 w-12 text-center">{massingOptions.floorToFloor}m</span>
              </div>
            </div>
            
            <div>
              <label className="block mb-2 font-medium text-gray-700">Building Color</label>
              <div className="grid grid-cols-4 gap-2">
                {['#9900CC', '#0066CC', '#009966', '#CC6600'].map(color => (
                  <button 
                    key={color}
                    className={`w-full h-10 rounded-md border ${
                      massingOptions.colorScheme === color
                        ? 'ring-2 ring-offset-2 ring-purple-500'
                        : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setMassingOptions({...massingOptions, colorScheme: color})}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="shiny"
                checked={massingOptions.shiny}
                onChange={(e) => setMassingOptions({...massingOptions, shiny: e.target.checked})}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <label htmlFor="shiny" className="ml-2 text-gray-700">Shiny Building Appearance</label>
            </div>
          </div>
          
          <div className="flex justify-end p-4 border-t">
            <button
              onClick={() => setShowMassingModal(false)}
              className="px-4 py-2 mr-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateMassing}
              disabled={isDrawing}
              className="px-4 py-2 text-white bg-purple-600 rounded-md hover:bg-purple-700 flex items-center"
            >
              {isDrawing ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Maximize2 size={16} className="mr-2" />
                  Generate
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Handle opening the building parameters modal
  const handleOpenParametersModal = () => {
    setShowParametersModal(true);
  };
  
  // Handle saving building parameters
  const handleSaveParameters = (updatedParameters) => {
    setCurrentBuildingParameters(updatedParameters);
    setNotification({
      type: 'success',
      message: 'Building parameters updated successfully'
    });
  };

  return (
    <div className="p-4">
      {/* Notification Toast */}
      {notification && (
        <NotificationToast type={notification.type} message={notification.message} />
      )}
      
      {/* Massing Options Modal */}
      {showMassingModal && <MassingOptionsModal />}
      
      {/* Export and Draw Buttons */}
      <div className="mb-4 flex justify-end space-x-2">
        <div className="relative group">
          <button
            onClick={handleOpenParametersModal}
            className="flex items-center gap-2 py-2 px-4 rounded-md border border-gray-300 
                      hover:bg-gray-50 text-gray-700 transition-colors mr-2"
            aria-label="Building Parameters"
          >
            <Settings size={16} className="text-purple-600" />
            Parameters
          </button>
          
          <div className="absolute z-10 right-0 w-64 p-2 mt-2 text-sm text-gray-700 bg-white 
                          rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 
                          group-hover:visible transition-opacity duration-300 border border-gray-200">
            <p className="font-semibold mb-1">Configure Building Parameters</p>
            <p className="text-xs">Adjust building height, spacing, width and other parameters for massing generation</p>
          </div>
        </div>
        
        <div className="relative group">
          <button
            onClick={handleGenerateMassing}
            disabled={isDrawing || !developableArea || developableArea.features?.length === 0}
            className={`flex items-center gap-2 py-2 px-4 rounded-md transition-colors ${
              isDrawing || !developableArea || developableArea.features?.length === 0
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-purple-600 hover:bg-purple-700 text-white shadow hover:shadow-md'
            }`}
            aria-label="Generate Massing"
          >
            {isDrawing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Building2 size={16} />
                Generate Massing
              </>
            )}
          </button>
          
          <div className="absolute z-10 right-0 w-64 p-2 mt-2 text-sm text-gray-700 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-300 border border-gray-200">
            <p className="font-semibold mb-1">Generate Building Massing</p>
            <p className="text-xs">Create optimized 3D building(s) with {Math.round(calculationResults.gfa).toLocaleString()} m² GFA on developable area ({Math.round(calculationResults?.siteCoverage).toLocaleString()} m² footprint)</p>
          </div>
        </div>
        
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
              <td className="py-2 px-4 border-t border-gray-200 text-sm">
                {density === 'mediumDensity' ? '100%' : formatPercentage(settings[density].siteEfficiencyRatio)} of Developable Area ({Math.round(calculationResults.developableArea).toLocaleString()} m²)
              </td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">Gross Floor Area (GFA)</td>
              <td className="py-2 px-4 border-t border-gray-200">
                {density === 'mediumDensity' ? (
                  // For medium density, recalculate GFA based on lot size limitations
                  (() => {
                    const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use setting or default to 200m² per dwelling
                    const maxDwellingsByLotSize = Math.floor(calculationResults.developableArea / minimumLotSize);
                    const actualYield = calculateMediumDensityActualYield(calculationResults);
                    const adjustedGfa = actualYield * calculationResults.dwellingSize;
                    return `${Math.round(adjustedGfa).toLocaleString()} m²`;
                  })()
                ) : (
                  // For high density, use existing GFA
                  `${Math.round(calculationResults.gfa).toLocaleString()} m²`
                )}
              </td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">
                {density === 'mediumDensity' ? (
                  // For medium density, calculate based on lot size limitations
                  (() => {
                    const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use setting or default to 200m² per dwelling
                    const maxDwellingsByLotSize = Math.floor(calculationResults.developableArea / minimumLotSize);
                    const actualYield = calculateMediumDensityActualYield(calculationResults);
                    
                    return (
                      <div>
                        <div>For Medium Density, GFA is based on lot size constraints:</div>
                        <div>1) Maximum lots: {maxDwellingsByLotSize} (based on {Math.round(calculationResults.developableArea).toLocaleString()} m² ÷ {minimumLotSize} m² min lot size)</div>
                        <div>2) Actual dwellings: {actualYield} units</div>
                        <div>3) GFA per dwelling: {Math.round(calculationResults.dwellingSize).toLocaleString()} m²</div>
                        <div className="mt-1">
                          Final GFA = {actualYield} units × {Math.round(calculationResults.dwellingSize).toLocaleString()} m² = {Math.round(actualYield * calculationResults.dwellingSize).toLocaleString()} m²
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  // For high density, check if calculation method is available
                  calculationResults.calculationMethod ? (
                    calculationResults.calculationMethod
                  ) : (
                    // Fall back to the existing logic if calculationMethod is not available
                    !calculationResults.hob ? (
                      `FSR ${calculationResults.fsr}:1 (${Math.round(calculationResults.siteArea).toLocaleString()} m² × ${calculationResults.fsr} = ${Math.round(calculationResults.gfa).toLocaleString()} m²)`
                    ) : (
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
                          title={`${Math.round(calculationResults.developableArea).toLocaleString()} m² site area × ${formatPercentage(settings[density].siteEfficiencyRatio)} building footprint × ${Math.floor(calculationResults.hob / settings[density].floorToFloorHeight)} storeys × ${formatPercentage(settings[density].gbaToGfaRatio)} efficiency = ${Math.round(calculationResults.gfaUnderHob).toLocaleString()} m²`}
                        >
                          2) HOB approach: {Math.round(calculationResults.gfaUnderHob).toLocaleString()} m²
                        </div>
                        <div className="mt-1">
                          Final GFA = {Math.round(calculationResults.gfa).toLocaleString()} m² 
                          <span className="text-gray-500 ml-1">
                            ({calculationResults.gfaUnderFsr <= calculationResults.gfaUnderHob ? 'FSR is more restrictive' : 'Height limit is more restrictive'})
                          </span>
                        </div>
                      </div>
                    )
                  )
                )}
              </td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">Development Yield</td>
              <td className="py-2 px-4 border-t border-gray-200">
                {density === 'mediumDensity' ? (
                  // For medium density, apply minimum lot size constraint
                  (() => {
                    const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use setting or default to 200m² per dwelling
                    const maxDwellingsByLotSize = Math.floor(calculationResults.developableArea / minimumLotSize);
                    const actualYield = calculateMediumDensityActualYield(calculationResults);
                    return actualYield;
                  })()
                ) : (
                  calculationResults.developmentYield 
                )} units
              </td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">
                {density === 'mediumDensity' ? (
                  (() => {
                    const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use setting or default to 200m² per dwelling
                    const maxDwellingsByLotSize = Math.floor(calculationResults.developableArea / minimumLotSize);
                    return (
                      <div>
                        Limited by:
                        <ul className="list-disc ml-5 mt-1">
                          <li>NSA calculation: {calculationResults.developmentYield} units</li>
                          <li>Lot constraint: {maxDwellingsByLotSize} units @ {settings.mediumDensity.minimumLotSize || 200}m² min lot size</li>
                        </ul>
                        <div className="text-sm text-gray-600 mt-1">
                          Final yield: {Math.min(calculationResults.developmentYield, maxDwellingsByLotSize)} units
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  `Total NSA (${Math.round(calculationResults.nsa).toLocaleString()} m²) ÷ 
                  Assumed Unit Size (${density === 'highDensity' ? '75' : Math.floor(calculationResults.dwellingSize / 10) * 10} m²)`
                )}
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
              <td className="py-2 px-4 border-t border-gray-200 font-bold">
                {density === 'mediumDensity' ? (
                  // For medium density, recalculate using constrained development yield
                  (() => {
                    const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use setting or default to 200m² per dwelling
                    const maxDwellingsByLotSize = Math.floor(calculationResults.developableArea / minimumLotSize);
                    const actualYield = Math.min(calculationResults.developmentYield, maxDwellingsByLotSize);
                    return formatCurrency(actualYield * settings[density].dwellingPrice);
                  })()
                ) : (
                  formatCurrency(calculationResults.totalGrossRealisation)
                )}
              </td>
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
              <td className="py-2 px-4 border-t border-gray-200 font-bold">
                {density === 'mediumDensity' ? (
                  // For medium density, recalculate using constrained gross realisation
                  (() => {
                    const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use setting or default to 200m² per dwelling
                    const maxDwellingsByLotSize = Math.floor(calculationResults.developableArea / minimumLotSize);
                    const actualYield = Math.min(calculationResults.developmentYield, maxDwellingsByLotSize);
                    const adjustedGrossRealisation = actualYield * settings[density].dwellingPrice;
                    
                    // Recalculate GST and selling costs based on adjusted gross realisation
                    const adjustedGst = adjustedGrossRealisation * 0.1;
                    const adjustedAgentsCommission = adjustedGrossRealisation * settings[density].agentsSalesCommission;
                    const adjustedLegalFees = adjustedGrossRealisation * settings[density].legalFeesOnSales;
                    const adjustedMarketingCosts = adjustedGrossRealisation * settings[density].marketingCosts;
                    
                    // Calculate adjusted net realisation
                    return formatCurrency(adjustedGrossRealisation - adjustedGst - adjustedAgentsCommission - adjustedLegalFees - adjustedMarketingCosts);
                  })()
                ) : (
                  formatCurrency(calculationResults.netRealisation)
                )}
              </td>
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
              <td className="py-2 px-4 border-t border-gray-200 font-bold">
                {density === 'mediumDensity' ? (
                  // For medium density, recalculate based on adjusted net realisation
                  (() => {
                    const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use setting or default to 200m² per dwelling
                    const maxDwellingsByLotSize = Math.floor(calculationResults.developableArea / minimumLotSize);
                    const actualYield = Math.min(calculationResults.developmentYield, maxDwellingsByLotSize);
                    const adjustedGrossRealisation = actualYield * settings[density].dwellingPrice;
                    
                    // Recalculate GST and selling costs based on adjusted gross realisation
                    const adjustedGst = adjustedGrossRealisation * 0.1;
                    const adjustedAgentsCommission = adjustedGrossRealisation * settings[density].agentsSalesCommission;
                    const adjustedLegalFees = adjustedGrossRealisation * settings[density].legalFeesOnSales;
                    const adjustedMarketingCosts = adjustedGrossRealisation * settings[density].marketingCosts;
                    
                    // Calculate adjusted net realisation
                    const adjustedNetRealisation = adjustedGrossRealisation - adjustedGst - adjustedAgentsCommission - adjustedLegalFees - adjustedMarketingCosts;
                    
                    // Calculate profit margin
                    const adjustedProfitMargin = adjustedNetRealisation * settings[density].profitAndRisk;
                    
                    // Calculate net realisation after profit
                    return formatCurrency(adjustedNetRealisation - adjustedProfitMargin);
                  })()
                ) : (
                  formatCurrency(calculationResults.netRealisationAfterProfitAndRisk)
                )}
              </td>
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
              <td className="py-2 px-4 border-t border-gray-200">
                {density === 'mediumDensity' ? (
                  // For medium density, recalculate construction costs based on adjusted GFA
                  (() => {
                    const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use setting or default to 200m² per dwelling
                    const maxDwellingsByLotSize = Math.floor(calculationResults.developableArea / minimumLotSize);
                    
                    // Use consistent actualYield calculation
                    const actualYield = calculationResults.developmentYield === 0 && maxDwellingsByLotSize > 0
                      ? maxDwellingsByLotSize 
                      : Math.min(calculationResults.developmentYield, maxDwellingsByLotSize);
                      
                    const adjustedGfa = actualYield * calculationResults.dwellingSize;
                    const adjustedConstructionCosts = adjustedGfa * calculationResults.constructionCostPerGfa;
                    return formatCurrency(adjustedConstructionCosts);
                  })()
                ) : (
                  // For high density, use existing construction costs
                  formatCurrency(calculationResults.constructionCosts)
                )}
              </td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">
                {density === 'mediumDensity' ? (
                  // For medium density, explain adjusted construction costs
                  (() => {
                    const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use setting or default to 200m² per dwelling
                    const maxDwellingsByLotSize = Math.floor(calculationResults.developableArea / minimumLotSize);
                    
                    // Use consistent actualYield calculation
                    const actualYield = calculationResults.developmentYield === 0 && maxDwellingsByLotSize > 0
                      ? maxDwellingsByLotSize 
                      : Math.min(calculationResults.developmentYield, maxDwellingsByLotSize);
                      
                    const adjustedGfa = actualYield * calculationResults.dwellingSize;
                    return `Adjusted GFA (${Math.round(adjustedGfa).toLocaleString()} m²) × Construction Cost per m² (${formatCurrency(calculationResults.constructionCostPerGfa)})`;
                  })()
                ) : (
                  // For high density, use original explanation
                  'Construction Cost per m² × Total GFA'
                )}
              </td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">DA Application Fees</td>
              <td className="py-2 px-4 border-t border-gray-200">{formatCurrency(calculationResults.daApplicationFees)}</td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">Fixed cost</td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">Professional Fees</td>
              <td className="py-2 px-4 border-t border-gray-200">
                {density === 'mediumDensity' ? (
                  // For medium density, calculate Professional Fees based on adjusted construction costs
                  (() => {
                    const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use setting or default to 200m² per dwelling
                    const maxDwellingsByLotSize = Math.floor(calculationResults.developableArea / minimumLotSize);
                    const actualYield = Math.min(calculationResults.developmentYield, maxDwellingsByLotSize);
                    const adjustedGfa = actualYield * calculationResults.dwellingSize;
                    const adjustedConstructionCosts = adjustedGfa * calculationResults.constructionCostPerGfa;
                    const adjustedProfessionalFees = adjustedConstructionCosts * settings[density].professionalFees;
                    return formatCurrency(adjustedProfessionalFees);
                  })()
                ) : (
                  // For high density, use existing Professional Fees
                  formatCurrency(calculationResults.professionalFees)
                )}
              </td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">Construction Costs × {formatPercentage(settings[density].professionalFees)}</td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">Development Contribution</td>
              <td className="py-2 px-4 border-t border-gray-200">
                {density === 'mediumDensity' ? (
                  // For medium density, calculate Development Contribution based on adjusted construction costs
                  (() => {
                    const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use setting or default to 200m² per dwelling
                    const maxDwellingsByLotSize = Math.floor(calculationResults.developableArea / minimumLotSize);
                    const actualYield = Math.min(calculationResults.developmentYield, maxDwellingsByLotSize);
                    const adjustedGfa = actualYield * calculationResults.dwellingSize;
                    const adjustedConstructionCosts = adjustedGfa * calculationResults.constructionCostPerGfa;
                    const adjustedDevelopmentContribution = adjustedConstructionCosts * settings[density].developmentContribution;
                    return formatCurrency(adjustedDevelopmentContribution);
                  })()
                ) : (
                  // For high density, use existing Development Contribution
                  formatCurrency(calculationResults.developmentContribution)
                )}
              </td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">Construction Costs × {formatPercentage(settings[density].developmentContribution)}</td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">Total Development Costs</td>
              <td className="py-2 px-4 border-t border-gray-200 font-bold">
                {density === 'mediumDensity' ? (
                  // For medium density, calculate Total Development Costs using adjusted values
                  (() => {
                    const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use setting or default to 200m² per dwelling
                    const maxDwellingsByLotSize = Math.floor(calculationResults.developableArea / minimumLotSize);
                    const actualYield = Math.min(calculationResults.developmentYield, maxDwellingsByLotSize);
                    const adjustedGfa = actualYield * calculationResults.dwellingSize;
                    const adjustedConstructionCosts = adjustedGfa * calculationResults.constructionCostPerGfa;
                    const adjustedProfessionalFees = adjustedConstructionCosts * settings[density].professionalFees;
                    const adjustedDevelopmentContribution = adjustedConstructionCosts * settings[density].developmentContribution;
                    const adjustedTotalDevelopmentCosts = adjustedConstructionCosts + calculationResults.daApplicationFees + adjustedProfessionalFees + adjustedDevelopmentContribution;
                    return formatCurrency(adjustedTotalDevelopmentCosts);
                  })()
                ) : (
                  // For high density, use existing Total Development Costs
                  formatCurrency(calculationResults.totalDevelopmentCosts)
                )}
              </td>
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
              <td className="py-2 px-4 border-t border-gray-200">
                {density === 'mediumDensity' ? (
                  // For medium density, calculate Finance Costs based on adjusted Total Development Costs
                  (() => {
                    const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use setting or default to 200m² per dwelling
                    const maxDwellingsByLotSize = Math.floor(calculationResults.developableArea / minimumLotSize);
                    const actualYield = Math.min(calculationResults.developmentYield, maxDwellingsByLotSize);
                    const adjustedGfa = actualYield * calculationResults.dwellingSize;
                    const adjustedConstructionCosts = adjustedGfa * calculationResults.constructionCostPerGfa;
                    const adjustedProfessionalFees = adjustedConstructionCosts * settings[density].professionalFees;
                    const adjustedDevelopmentContribution = adjustedConstructionCosts * settings[density].developmentContribution;
                    const adjustedTotalDevelopmentCosts = adjustedConstructionCosts + calculationResults.daApplicationFees + adjustedProfessionalFees + adjustedDevelopmentContribution;
                    
                    // Calculate finance costs using adjusted total development costs
                    const projectDurationYears = calculationResults.projectPeriod / 12;
                    const adjustedFinanceCosts = settings[density].interestRate * (projectDurationYears / 2) * adjustedTotalDevelopmentCosts;
                    return formatCurrency(adjustedFinanceCosts);
                  })()
                ) : (
                  // For high density, use existing Finance Costs
                  formatCurrency(calculationResults.financeCosts)
                )}
              </td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">Interest Rate × (Project Period ÷ 2) × Total Development Costs</td>
            </tr>
            
            {/* Add new Interest on Purchase Price row */}
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">Interest on Purchase Price</td>
              <td className="py-2 px-4 border-t border-gray-200">
                {density === 'mediumDensity' ? (
                  // For medium density, recalculate Interest on Purchase Price
                  (() => {
                    // Calculate adjusted values
                    const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use setting or default to 200m² per dwelling
                    const maxDwellingsByLotSize = Math.floor(calculationResults.developableArea / minimumLotSize);
                    const actualYield = Math.min(calculationResults.developmentYield, maxDwellingsByLotSize);
                    
                    // Recalculate everything from the beginning
                    // Adjusted gross realisation
                    const adjustedGrossRealisation = actualYield * settings[density].dwellingPrice;
                    
                    // Adjusted selling costs
                    const adjustedGst = adjustedGrossRealisation * 0.1;
                    const adjustedAgentsCommission = adjustedGrossRealisation * settings[density].agentsSalesCommission;
                    const adjustedLegalFees = adjustedGrossRealisation * settings[density].legalFeesOnSales;
                    const adjustedMarketingCosts = adjustedGrossRealisation * settings[density].marketingCosts;
                    
                    // Adjusted net realisation
                    const adjustedNetRealisation = adjustedGrossRealisation - adjustedGst - adjustedAgentsCommission - adjustedLegalFees - adjustedMarketingCosts;
                    
                    // Adjusted profit margin
                    const adjustedProfitMargin = adjustedNetRealisation * settings[density].profitAndRisk;
                    
                    // Adjusted net realisation after profit
                    const adjustedNetRealisationAfterProfit = adjustedNetRealisation - adjustedProfitMargin;
                    
                    // Adjusted GFA and construction costs
                    const adjustedGfa = actualYield * calculationResults.dwellingSize;
                    const adjustedConstructionCosts = adjustedGfa * calculationResults.constructionCostPerGfa;
                    const adjustedProfessionalFees = adjustedConstructionCosts * settings[density].professionalFees;
                    const adjustedDevelopmentContribution = adjustedConstructionCosts * settings[density].developmentContribution;
                    const adjustedTotalDevelopmentCosts = adjustedConstructionCosts + calculationResults.daApplicationFees + adjustedProfessionalFees + adjustedDevelopmentContribution;
                    
                    // Calculate finance costs using adjusted total development costs
                    const projectDurationYears = calculationResults.projectPeriod / 12;
                    const adjustedFinanceCosts = settings[density].interestRate * (projectDurationYears / 2) * adjustedTotalDevelopmentCosts;
                    
                    // Calculate residual land value before interest
                    const adjustedResidualBeforeInterest = adjustedNetRealisationAfterProfit - adjustedTotalDevelopmentCosts - calculationResults.landTax - adjustedFinanceCosts;
                    
                    // Calculate interest on purchase price
                    const adjustedInterestOnPurchase = Math.abs(
                      adjustedResidualBeforeInterest - 
                      adjustedResidualBeforeInterest / 
                      (1 + settings[density].interestRate / 12 * calculationResults.projectPeriod * 0.5)
                    );
                    
                    return formatCurrency(adjustedInterestOnPurchase);
                  })()
                ) : (
                  // For high density, use original calculation
                  formatCurrency(
                    Math.abs(
                      (calculationResults.netRealisationAfterProfitAndRisk - 
                      calculationResults.totalDevelopmentCosts - 
                      calculationResults.landTax - 
                      calculationResults.financeCosts) - 
                      (calculationResults.netRealisationAfterProfitAndRisk - 
                      calculationResults.totalDevelopmentCosts - 
                      calculationResults.landTax - 
                      calculationResults.financeCosts) / 
                      (1 + settings[density].interestRate / 12 * calculationResults.projectPeriod * 0.5)
                    )
                  )
                )}
              </td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">Interest over full project period with 50% LVR</td>
            </tr>
            
            {/* Add new Acquisition Costs row */}
            <tr>
              <td className="py-2 px-4 border-t border-gray-200">Acquisition Costs</td>
              <td className="py-2 px-4 border-t border-gray-200">
                {density === 'mediumDensity' ? (
                  // For medium density, recalculate Acquisition Costs
                  (() => {
                    // Calculate adjusted values
                    const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use setting or default to 200m² per dwelling
                    const maxDwellingsByLotSize = Math.floor(calculationResults.developableArea / minimumLotSize);
                    const actualYield = Math.min(calculationResults.developmentYield, maxDwellingsByLotSize);
                    
                    // Recalculate everything from the beginning
                    // Adjusted gross realisation
                    const adjustedGrossRealisation = actualYield * settings[density].dwellingPrice;
                    
                    // Adjusted selling costs
                    const adjustedGst = adjustedGrossRealisation * 0.1;
                    const adjustedAgentsCommission = adjustedGrossRealisation * settings[density].agentsSalesCommission;
                    const adjustedLegalFees = adjustedGrossRealisation * settings[density].legalFeesOnSales;
                    const adjustedMarketingCosts = adjustedGrossRealisation * settings[density].marketingCosts;
                    
                    // Adjusted net realisation
                    const adjustedNetRealisation = adjustedGrossRealisation - adjustedGst - adjustedAgentsCommission - adjustedLegalFees - adjustedMarketingCosts;
                    
                    // Adjusted profit margin
                    const adjustedProfitMargin = adjustedNetRealisation * settings[density].profitAndRisk;
                    
                    // Adjusted net realisation after profit
                    const adjustedNetRealisationAfterProfit = adjustedNetRealisation - adjustedProfitMargin;
                    
                    // Adjusted GFA and construction costs
                    const adjustedGfa = actualYield * calculationResults.dwellingSize;
                    const adjustedConstructionCosts = adjustedGfa * calculationResults.constructionCostPerGfa;
                    const adjustedProfessionalFees = adjustedConstructionCosts * settings[density].professionalFees;
                    const adjustedDevelopmentContribution = adjustedConstructionCosts * settings[density].developmentContribution;
                    const adjustedTotalDevelopmentCosts = adjustedConstructionCosts + calculationResults.daApplicationFees + adjustedProfessionalFees + adjustedDevelopmentContribution;
                    
                    // Calculate finance costs using adjusted total development costs
                    const projectDurationYears = calculationResults.projectPeriod / 12;
                    const adjustedFinanceCosts = settings[density].interestRate * (projectDurationYears / 2) * adjustedTotalDevelopmentCosts;
                    
                    // Calculate residual land value before interest
                    const adjustedResidualBeforeInterest = adjustedNetRealisationAfterProfit - adjustedTotalDevelopmentCosts - calculationResults.landTax - adjustedFinanceCosts;
                    
                    // Calculate interest on purchase price
                    const adjustedInterestOnPurchase = Math.abs(
                      adjustedResidualBeforeInterest - 
                      adjustedResidualBeforeInterest / 
                      (1 + settings[density].interestRate / 12 * calculationResults.projectPeriod * 0.5)
                    );
                    
                    // Calculate acquisition costs (3% of residual land value minus interest)
                    const acquisitionRate = 0.03; // 3%
                    const adjustedAcquisitionCosts = acquisitionRate * (adjustedResidualBeforeInterest - adjustedInterestOnPurchase);
                    
                    return formatCurrency(adjustedAcquisitionCosts);
                  })()
                ) : (
                  // For high density, use original calculation
                  formatCurrency(0.03 * 
                    (calculationResults.netRealisationAfterProfitAndRisk - 
                    calculationResults.totalDevelopmentCosts - 
                    calculationResults.landTax - 
                    calculationResults.financeCosts - 
                    Math.abs(
                      (calculationResults.netRealisationAfterProfitAndRisk - 
                      calculationResults.totalDevelopmentCosts - 
                      calculationResults.landTax - 
                      calculationResults.financeCosts) - 
                      (calculationResults.netRealisationAfterProfitAndRisk - 
                      calculationResults.totalDevelopmentCosts - 
                      calculationResults.landTax - 
                      calculationResults.financeCosts) / 
                      (1 + settings[density].interestRate / 12 * calculationResults.projectPeriod * 0.5)
                    ))
                  )
                )}
              </td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">3% of (Residual Land Value - Interest on Purchase Price)</td>
            </tr>
            
            {/* Residual Land Value */}
            <tr className="bg-blue-50">
              <td colSpan="3" className="py-2 px-4 font-bold">Residual Land Value</td>
            </tr>
            <tr className="bg-gray-200">
              <td className="py-2 px-4 border-t border-gray-200 font-bold">Residual Land Value</td>
              <td className="py-2 px-4 border-t border-gray-200 font-bold">
                {density === 'mediumDensity' ? (
                  // For medium density, calculate final Residual Land Value
                  (() => {
                    // Calculate adjusted values
                    const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use setting or default to 200m² per dwelling
                    const maxDwellingsByLotSize = Math.floor(calculationResults.developableArea / minimumLotSize);
                    const actualYield = Math.min(calculationResults.developmentYield, maxDwellingsByLotSize);
                    
                    // Recalculate everything from the beginning
                    // Adjusted gross realisation
                    const adjustedGrossRealisation = actualYield * settings[density].dwellingPrice;
                    
                    // Adjusted selling costs
                    const adjustedGst = adjustedGrossRealisation * 0.1;
                    const adjustedAgentsCommission = adjustedGrossRealisation * settings[density].agentsSalesCommission;
                    const adjustedLegalFees = adjustedGrossRealisation * settings[density].legalFeesOnSales;
                    const adjustedMarketingCosts = adjustedGrossRealisation * settings[density].marketingCosts;
                    
                    // Adjusted net realisation
                    const adjustedNetRealisation = adjustedGrossRealisation - adjustedGst - adjustedAgentsCommission - adjustedLegalFees - adjustedMarketingCosts;
                    
                    // Adjusted profit margin
                    const adjustedProfitMargin = adjustedNetRealisation * settings[density].profitAndRisk;
                    
                    // Adjusted net realisation after profit
                    const adjustedNetRealisationAfterProfit = adjustedNetRealisation - adjustedProfitMargin;
                    
                    // Adjusted GFA and construction costs
                    const adjustedGfa = actualYield * calculationResults.dwellingSize;
                    const adjustedConstructionCosts = adjustedGfa * calculationResults.constructionCostPerGfa;
                    const adjustedProfessionalFees = adjustedConstructionCosts * settings[density].professionalFees;
                    const adjustedDevelopmentContribution = adjustedConstructionCosts * settings[density].developmentContribution;
                    const adjustedTotalDevelopmentCosts = adjustedConstructionCosts + calculationResults.daApplicationFees + adjustedProfessionalFees + adjustedDevelopmentContribution;
                    
                    // Calculate finance costs using adjusted total development costs
                    const projectDurationYears = calculationResults.projectPeriod / 12;
                    const adjustedFinanceCosts = settings[density].interestRate * (projectDurationYears / 2) * adjustedTotalDevelopmentCosts;
                    
                    // Calculate residual land value before interest
                    const adjustedResidualBeforeInterest = adjustedNetRealisationAfterProfit - adjustedTotalDevelopmentCosts - calculationResults.landTax - adjustedFinanceCosts;
                    
                    // Calculate interest on purchase price
                    const adjustedInterestOnPurchase = Math.abs(
                      adjustedResidualBeforeInterest - 
                      adjustedResidualBeforeInterest / 
                      (1 + settings[density].interestRate / 12 * calculationResults.projectPeriod * 0.5)
                    );
                    
                    // Calculate acquisition costs (3% of residual land value minus interest)
                    const acquisitionRate = 0.03; // 3%
                    const adjustedAcquisitionCosts = acquisitionRate * (adjustedResidualBeforeInterest - adjustedInterestOnPurchase);
                    
                    // Final residual land value
                    const adjustedResidualLandValue = adjustedResidualBeforeInterest - adjustedInterestOnPurchase - adjustedAcquisitionCosts;
                    
                    return formatCurrency(adjustedResidualLandValue);
                  })()
                ) : (
                  // For high density, use original calculation
                  formatCurrency(
                    calculationResults.netRealisationAfterProfitAndRisk - 
                    calculationResults.totalDevelopmentCosts - 
                    calculationResults.landTax - 
                    calculationResults.financeCosts - 
                    Math.abs(
                      (calculationResults.netRealisationAfterProfitAndRisk - 
                      calculationResults.totalDevelopmentCosts - 
                      calculationResults.landTax - 
                      calculationResults.financeCosts) - 
                      (calculationResults.netRealisationAfterProfitAndRisk - 
                      calculationResults.totalDevelopmentCosts - 
                      calculationResults.landTax - 
                      calculationResults.financeCosts) / 
                      (1 + settings[density].interestRate / 12 * calculationResults.projectPeriod * 0.5)
                    ) - 
                    (0.03 * 
                      (calculationResults.netRealisationAfterProfitAndRisk - 
                      calculationResults.totalDevelopmentCosts - 
                      calculationResults.landTax - 
                      calculationResults.financeCosts - 
                      Math.abs(
                        (calculationResults.netRealisationAfterProfitAndRisk - 
                        calculationResults.totalDevelopmentCosts - 
                        calculationResults.landTax - 
                        calculationResults.financeCosts) - 
                        (calculationResults.netRealisationAfterProfitAndRisk - 
                        calculationResults.totalDevelopmentCosts - 
                        calculationResults.landTax - 
                        calculationResults.financeCosts) / 
                        (1 + settings[density].interestRate / 12 * calculationResults.projectPeriod * 0.5)
                      ))
                    )
                  )
                )}
              </td>
              <td className="py-2 px-4 border-t border-gray-200 text-sm">Net Realisation after Profit - Total Development Costs - Finance Costs - Land Tax - Interest on Purchase - Acquisition Costs</td>
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

      {/* Building parameters modal */}
      <BuildingParametersModal 
        isOpen={showParametersModal}
        onClose={() => setShowParametersModal(false)}
        defaultParameters={currentBuildingParameters}
        onSave={handleSaveParameters}
      />
    </div>
  );
};

export default FeasibilityCalculation;
