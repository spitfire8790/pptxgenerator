import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { Building2, Building, DollarSign, TrendingUp, Settings2, Info } from 'lucide-react';

/**
 * Helper function to format currency in AUD
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Helper function to format currency in millions
 * @param {number} amount - The amount to format in base units
 * @returns {string} Formatted currency in millions
 */
const formatCurrencyInMillions = (amount) => {
  const inMillions = amount / 1000000;
  return `$${inMillions.toFixed(1)}M`;
};

/**
 * Helper function to round to nearest 500k
 * @param {number} value - The value to round
 * @returns {number} Value rounded to nearest 500,000
 */
const roundToNearest500k = (value) => {
  return Math.round(value / 500000) * 500000;
};

/**
 * Helper function to format square meter values without decimals
 * @param {number} value - The value to format
 * @returns {string} Formatted square meter value
 */
const formatSqm = (value) => {
  return `${Math.round(value).toLocaleString()}m²`;
};

// Add helper function for sensitivity analysis
const generateSensitivityMatrix = (settings, selectedFeature, density, calculateFeasibility) => {
  const baselineFsr = selectedFeature?.properties?.copiedFrom?.site_suitability__floorspace_ratio || 0;
  const baselineHob = selectedFeature?.properties?.copiedFrom?.site_suitability__height_of_building || 0;
  
  // Generate FSR range (0.5 increments), ensuring unique values
  const fsrValues = Array.from({ length: 7 }, (_, i) => Math.max(0.5, baselineFsr - 1.5 + (i * 0.5)));
  const fsrRange = [...new Set(fsrValues)].sort((a, b) => a - b); // Remove duplicates and sort
  
  // Generate HOB range (5m increments)
  const hobRange = Array.from({ length: 7 }, (_, i) => Math.max(5, baselineHob - 15 + (i * 5)));
  
  // Generate matrix of results
  const matrix = fsrRange.map(fsr => {
    return hobRange.map(hob => {
      const customControls = {
        enabled: true,
        fsr: fsr,
        hob: hob
      };
      
      const result = calculateFeasibility(
        settings[density],
        selectedFeature,
        density,
        false,
        null,
        customControls
      );
      
      return {
        fsr,
        hob,
        residualLandValue: result?.residualLandValue || 0,
        isBaseline: Math.abs(fsr - baselineFsr) < 0.01 && Math.abs(hob - baselineHob) < 0.01
      };
    });
  });
  
  return { fsrRange, hobRange, matrix, baselineFsr, baselineHob };
};

/**
 * FeasibilitySummary component for comparing Low-Mid Density vs High Density development options
 * with animated charts for cost and residual land value sensitivity analysis
 */
const FeasibilitySummary = ({ 
  settings, 
  lmrOptions, 
  currentResults, 
  lmrResults,
  customControls = null,
  selectedFeature = null,
  calculateFeasibility = null
}) => {
  // State for animations
  const [animationProgress, setAnimationProgress] = useState(0);
  
  // Animation effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationProgress(100);
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  
  // Prepare data for the comparison chart
  const chartData = [
    {
      name: 'Medium Density',
      ResidualLandValue: currentResults?.mediumDensity?.residualLandValue || 0,
      DwellingYield: currentResults?.mediumDensity?.developmentYield || 0,
    },
    {
      name: 'High Density',
      ResidualLandValue: currentResults?.highDensity?.residualLandValue || 0,
      DwellingYield: currentResults?.highDensity?.developmentYield || 0,
    }
  ];
  
  // Generate sensitivity analysis data for how costs affect residual land value
  const costSensitivityData = Array.from({ length: 7 }, (_, i) => {
    const baselineMediumCost = (currentResults?.mediumDensity?.costPerSqmGFA || 3000);
    const baselineHighCost = (currentResults?.highDensity?.costPerSqmGFA || 3500);
    const baselineMediumRLV = (currentResults?.mediumDensity?.residualLandValue || 10000000);
    const baselineHighRLV = (currentResults?.highDensity?.residualLandValue || 15000000);
    
    // Cost factor: 80%, 85%, 90%, 95%, 100%, 105%, 110%
    const factor = 0.8 + (i * 0.05);
    
    // Calculate actual cost values
    const actualMediumCost = Math.round(baselineMediumCost * factor);
    const actualHighCost = Math.round(baselineHighCost * factor);
    
    // As costs increase, residual land value decreases (inverse relationship)
    // Using a simplified relationship: 1% increase in costs = X% decrease in RLV
    // The sensitivity multiplier can be adjusted based on actual project economics
    const sensitivityMultiplier = 1.5; // 1% cost increase = 1.5% RLV decrease
    const rlvImpactFactor = 1 + ((1 - factor) * sensitivityMultiplier);
    
    return {
      factor: `${Math.round(factor * 100)}%`,
      actualCost: Math.round((actualMediumCost + actualHighCost) / 2), // Average of both costs for display
      'Medium Density': Math.round(baselineMediumRLV * rlvImpactFactor),
      'High Density': Math.round(baselineHighRLV * rlvImpactFactor),
    };
  });
  
  // Generate sensitivity analysis data for how sales/revenue affects residual land value
  const residualLandValueSensitivityData = Array.from({ length: 7 }, (_, i) => {
    // Revenue baseline and dwelling yield derived from current results
    const baselineMediumRevenue = (currentResults?.mediumDensity?.totalRevenue || 25000000);
    const baselineHighRevenue = (currentResults?.highDensity?.totalRevenue || 40000000);
    const mediumDwellings = (currentResults?.mediumDensity?.developmentYield || 50);
    const highDwellings = (currentResults?.highDensity?.developmentYield || 100);
    
    const baselineMedium = (currentResults?.mediumDensity?.residualLandValue || 10000000);
    const baselineHigh = (currentResults?.highDensity?.residualLandValue || 15000000);
    const factor = 0.8 + (i * 0.05); // 80%, 85%, 90%, 95%, 100%, 105%, 110%
    
    // Calculate per dwelling revenue
    const mediumRevenuePerDwelling = baselineMediumRevenue / mediumDwellings;
    const highRevenuePerDwelling = baselineHighRevenue / highDwellings;
    const avgRevenuePerDwelling = (mediumRevenuePerDwelling + highRevenuePerDwelling) / 2;
    
    return {
      factor: `${Math.round(factor * 100)}%`,
      revenuePerDwelling: Math.round(avgRevenuePerDwelling * factor),
      'Medium Density': Math.round(baselineMedium * factor),
      'High Density': Math.round(baselineHigh * factor),
    };
  });
  
  // Radar chart data comparing key metrics
  const radarData = [
    {
      metric: 'Residual Land Value',
      'Medium Density': (currentResults?.mediumDensity?.residualLandValue || 0) / 1000000,
      'High Density': (currentResults?.highDensity?.residualLandValue || 0) / 1000000,
    },
    {
      metric: 'GFA',
      'Medium Density': (currentResults?.mediumDensity?.gfa || 0) / 1000,
      'High Density': (currentResults?.highDensity?.gfa || 0) / 1000,
    },
    {
      metric: 'Yield',
      'Medium Density': (currentResults?.mediumDensity?.developmentYield || 0),
      'High Density': (currentResults?.highDensity?.developmentYield || 0),
    },
    {
      metric: 'FSR',
      'Medium Density': (currentResults?.mediumDensity?.fsr || 1),
      'High Density': (currentResults?.highDensity?.fsr || 2),
    },
    {
      metric: 'Cost',
      'Medium Density': (currentResults?.mediumDensity?.totalCost || 0) / 1000000,
      'High Density': (currentResults?.highDensity?.totalCost || 0) / 1000000,
    },
  ];

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
              {customControls.fsr ?? (currentResults?.fsrCurrent || 'N/A')}
              <span className="text-gray-500 ml-1">:1</span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">HOB:</span>
            <span>
              {customControls.hob ?? (currentResults?.hobCurrent || 'N/A')}
              <span className="text-gray-500 ml-1">m</span>
            </span>
          </div>
        </div>
        {(customControls.fsr !== null || customControls.hob !== null) && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            <div className="flex items-start">
              <Info size={14} className="mr-2 mt-0.5 flex-shrink-0" />
              <div>
                Summary is based on custom development controls.
                {customControls.fsr === null && ' Using current FSR.'}
                {customControls.hob === null && ' Using current HOB.'}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Add sensitivity analysis section
  const renderSensitivityAnalysis = () => {
    if (!selectedFeature || !calculateFeasibility) return null;

    const mediumDensityMatrix = generateSensitivityMatrix(settings, selectedFeature, 'mediumDensity', calculateFeasibility);
    const highDensityMatrix = generateSensitivityMatrix(settings, selectedFeature, 'highDensity', calculateFeasibility);

    return (
      <div className="mt-8 bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <TrendingUp className="mr-2" /> FSR and HOB Sensitivity Analysis
        </h3>
        
        {/* Medium Density Matrix */}
        <div className="mb-6">
          <h4 className="text-md font-semibold mb-3 flex items-center">
            <Building2 className="mr-2" size={16} /> Medium Density
          </h4>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead>
                <tr>
                  <th className="border bg-gray-50 px-4 py-2">FSR \ HOB</th>
                  {mediumDensityMatrix.hobRange.map(hob => (
                    <th key={hob} className={`border px-4 py-2 ${Math.abs(hob - mediumDensityMatrix.baselineHob) < 0.01 ? 'bg-blue-100' : 'bg-gray-50'}`}>
                      {hob}m
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mediumDensityMatrix.matrix.map((row, i) => (
                  <tr key={`medium-${mediumDensityMatrix.fsrRange[i]}-${i}`}>
                    <td className={`border px-4 py-2 font-medium ${Math.abs(mediumDensityMatrix.fsrRange[i] - mediumDensityMatrix.baselineFsr) < 0.01 ? 'bg-blue-100' : 'bg-gray-50'}`}>
                      {mediumDensityMatrix.fsrRange[i]}:1
                    </td>
                    {row.map((cell, j) => (
                      <td 
                        key={`medium-${mediumDensityMatrix.fsrRange[i]}-${j}`}
                        className={`border px-4 py-2 text-right ${
                          cell.isBaseline ? 'bg-blue-100 font-bold' : 
                          cell.residualLandValue < 0 ? 'bg-red-50 text-red-600' : ''
                        }`}
                      >
                        {formatCurrencyInMillions(cell.residualLandValue)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* High Density Matrix */}
        <div>
          <h4 className="text-md font-semibold mb-3 flex items-center">
            <Building className="mr-2" size={16} /> High Density
          </h4>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead>
                <tr>
                  <th className="border bg-gray-50 px-4 py-2">FSR \ HOB</th>
                  {highDensityMatrix.hobRange.map(hob => (
                    <th key={hob} className={`border px-4 py-2 ${Math.abs(hob - highDensityMatrix.baselineHob) < 0.01 ? 'bg-blue-100' : 'bg-gray-50'}`}>
                      {hob}m
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {highDensityMatrix.matrix.map((row, i) => (
                  <tr key={`high-${highDensityMatrix.fsrRange[i]}-${i}`}>
                    <td className={`border px-4 py-2 font-medium ${Math.abs(highDensityMatrix.fsrRange[i] - highDensityMatrix.baselineFsr) < 0.01 ? 'bg-blue-100' : 'bg-gray-50'}`}>
                      {highDensityMatrix.fsrRange[i]}:1
                    </td>
                    {row.map((cell, j) => (
                      <td 
                        key={`high-${highDensityMatrix.fsrRange[i]}-${j}`}
                        className={`border px-4 py-2 text-right ${
                          cell.isBaseline ? 'bg-blue-100 font-bold' : 
                          cell.residualLandValue < 0 ? 'bg-red-50 text-red-600' : ''
                        }`}
                      >
                        {formatCurrencyInMillions(cell.residualLandValue)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
          <div className="flex items-start">
            <Info size={14} className="mr-2 mt-0.5 flex-shrink-0" />
            <div>
              This analysis shows how residual land value changes with different FSR and HOB combinations. Values are shown in millions (M).
              <br />
              <span className="font-medium">Baseline values (highlighted in blue):</span> FSR {mediumDensityMatrix.baselineFsr}:1, HOB {mediumDensityMatrix.baselineHob}m
              <br />
              <span className="text-red-600">Negative values</span> indicate scenarios where development costs exceed potential revenue.
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4">
      {/* Add Custom Controls Information Section */}
      {renderCustomControlsInfo()}

      <h2 className="text-xl font-bold mb-6">Development Feasibility Summary</h2>

      {/* Main Comparison Chart */}
      <div className="mb-8 bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <TrendingUp className="mr-2" /> Residual Land Value & Dwelling Yield Comparison
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 70, left: 20, bottom: 5 }}
              animationDuration={1500}
              animationBegin={0}
              animationEasing="ease-out"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              {/* Left Y-axis for Residual Land Value */}
              <YAxis 
                yAxisId="left"
                tickFormatter={(value) => formatCurrencyInMillions(value)} 
                domain={[(dataMin) => 0, (dataMax) => roundToNearest500k(dataMax * 1.1)]}
                ticks={
                  Array.from(
                    { length: 10 }, 
                    (_, i) => roundToNearest500k(
                      (Math.max(
                        currentResults?.mediumDensity?.residualLandValue || 0,
                        currentResults?.highDensity?.residualLandValue || 0
                      ) * 1.1) / 10 * (i + 1)
                    )
                  ).filter(val => val > 0)
                }
              />
              {/* Right Y-axis for Dwelling Yield */}
              <YAxis 
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => `${value} units`}
                domain={[0, (dataMax) => Math.ceil(dataMax * 1.1 / 10) * 10]}
                allowDecimals={false}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === "ResidualLandValue") return [formatCurrency(value), "Residual Land Value"];
                  if (name === "DwellingYield") return [`${value} units`, "Dwelling Yield"];
                  return [value, name];
                }} 
              />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="ResidualLandValue" 
                name="Residual Land Value"
                fill="#8884d8" 
                radius={[10, 10, 0, 0]}
                fillOpacity={0.8}
                animationDuration={1500}
                label={(props) => {
                  const { x, y, width, height, value } = props;
                  // Only render label when animation is complete (value > 0)
                  if (value <= 0) return null;
                  
                  const millions = value / 1000000;
                  return (
                    <text 
                      x={x + width / 2} 
                      y={y + height / 2} 
                      fill="#fff"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontWeight="bold"
                      fontSize="14"
                      filter="drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.5))"
                    >
                      ${Math.round(millions)}M
                    </text>
                  );
                }}
              />
              <Bar 
                yAxisId="right"
                dataKey="DwellingYield" 
                name="Dwelling Yield"
                fill="#82ca9d" 
                radius={[10, 10, 0, 0]}
                fillOpacity={0.8}
                animationDuration={1500}
                animationBegin={200}
                label={(props) => {
                  const { x, y, width, height, value } = props;
                  // Only render label when animation is complete (value > 0)
                  if (value <= 0) return null;
                  
                  return (
                    <text 
                      x={x + width / 2} 
                      y={y + height / 2} 
                      fill="#fff"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontWeight="bold"
                      fontSize="14"
                      filter="drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.5))"
                    >
                      {value}
                    </text>
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>


      {/* Cost Impact on Residual Land Value */}
      <div className="mb-8 bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <DollarSign className="mr-2" /> Cost Impact on Residual Land Value
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={costSensitivityData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              animationDuration={1500}
              animationBegin={0}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="factor"
                tickFormatter={(value, index) => {
                  return value;
                }}
                height={60}
                tick={(props) => {
                  const { x, y, payload } = props;
                  const index = costSensitivityData.findIndex(item => item.factor === payload.value);
                  const actualCost = index >= 0 ? costSensitivityData[index].actualCost : '';
                  
                  // Format as $#,##0
                  const formattedCost = new Intl.NumberFormat('en-AU', {
                    style: 'currency',
                    currency: 'AUD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(actualCost);
                  
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text x={0} y={0} dy={16} textAnchor="middle" fill="#666">
                        {payload.value}
                      </text>
                      <text x={0} y={16} dy={16} textAnchor="middle" fill="#666" fontSize="12">
                        {formattedCost}/m²
                      </text>
                    </g>
                  );
                }}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrencyInMillions(value)}
                domain={[(dataMin) => 0, (dataMax) => roundToNearest500k(dataMax * 1.1)]}
                ticks={
                  Array.from(
                    { length: 10 }, 
                    (_, i) => roundToNearest500k(
                      (Math.max(
                        Math.max(...costSensitivityData.map(item => item['Medium Density'] || 0)),
                        Math.max(...costSensitivityData.map(item => item['High Density'] || 0))
                      ) * 1.1) / 10 * (i + 1)
                    )
                  ).filter(val => val > 0)
                }
              />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="Medium Density" 
                stroke="#8884d8" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 8 }}
                animationDuration={1500}
                name="Medium Density"
              />
              <Line 
                type="monotone" 
                dataKey="High Density" 
                stroke="#82ca9d" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 8 }}
                animationDuration={1500}
                animationBegin={300}
                name="High Density"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue/Sales Impact on Residual Land Value */}
      <div className="mb-8 bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <DollarSign className="mr-2" /> Revenue/Sales Impact on Residual Land Value
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={residualLandValueSensitivityData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              animationDuration={1500}
              animationBegin={300}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="factor"
                height={60}
                tick={(props) => {
                  const { x, y, payload } = props;
                  // Get revenue per dwelling in millions
                  const index = residualLandValueSensitivityData.findIndex(item => item.factor === payload.value);
                  const revenuePerDwelling = index >= 0 ? residualLandValueSensitivityData[index].revenuePerDwelling : 0;
                  
                  // Per dwelling revenue in millions with 1 decimal place
                  const perDwellingMillions = revenuePerDwelling / 1000000;
                  
                  // Format as $#.0M per unit
                  const formattedRevenue = `$${perDwellingMillions.toFixed(1)}M`;
                  
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text x={0} y={0} dy={16} textAnchor="middle" fill="#666">
                        {payload.value}
                      </text>
                      <text x={0} y={16} dy={16} textAnchor="middle" fill="#666" fontSize="12">
                        {formattedRevenue}
                      </text>
                    </g>
                  );
                }}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrencyInMillions(value)}
                domain={[(dataMin) => 0, (dataMax) => roundToNearest500k(dataMax * 1.1)]}
                ticks={
                  Array.from(
                    { length: 10 }, 
                    (_, i) => roundToNearest500k(
                      (Math.max(
                        Math.max(...residualLandValueSensitivityData.map(item => item['Medium Density'] || 0)),
                        Math.max(...residualLandValueSensitivityData.map(item => item['High Density'] || 0))
                      ) * 1.1) / 10 * (i + 1)
                    )
                  ).filter(val => val > 0)
                }
              />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="Medium Density" 
                stroke="#8884d8" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 8 }}
                animationDuration={1500}
                name="Medium Density"
              />
              <Line 
                type="monotone" 
                dataKey="High Density" 
                stroke="#82ca9d" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 8 }}
                animationDuration={1500}
                animationBegin={500}
                name="High Density"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Comparison Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Medium Density Details */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <Building2 className="mr-2" /> Medium Density Details
          </h3>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Metric</th>
                <th className="px-4 py-2 text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-2">GFA</td>
                <td className="px-4 py-2 text-right">{currentResults?.mediumDensity?.gfa ? formatSqm(currentResults.mediumDensity.gfa) : 'N/A'}</td>
              </tr>
              <tr>
                <td className="px-4 py-2">Development Yield</td>
                <td className="px-4 py-2 text-right">{currentResults?.mediumDensity?.developmentYield || 0} units</td>
              </tr>
              <tr className="font-bold">
                <td className="px-4 py-2">Residual Land Value</td>
                <td className="px-4 py-2 text-right">{formatCurrency(currentResults?.mediumDensity?.residualLandValue || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* High Density Details */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <Building className="mr-2" /> High Density Details
          </h3>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Metric</th>
                <th className="px-4 py-2 text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-2">GFA</td>
                <td className="px-4 py-2 text-right">{currentResults?.highDensity?.gfa ? formatSqm(currentResults.highDensity.gfa) : 'N/A'}</td>
              </tr>
              <tr>
                <td className="px-4 py-2">Development Yield</td>
                <td className="px-4 py-2 text-right">{currentResults?.highDensity?.developmentYield || 0} units</td>
              </tr>
              <tr className="font-bold">
                <td className="px-4 py-2">Residual Land Value</td>
                <td className="px-4 py-2 text-right">{formatCurrency(currentResults?.highDensity?.residualLandValue || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Sensitivity Analysis Section */}
      {renderSensitivityAnalysis()}
    </div>
  );
};

export default FeasibilitySummary;