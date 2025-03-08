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
import { Building2, Building, DollarSign, TrendingUp } from 'lucide-react';

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

/**
 * FeasibilitySummary component for comparing Low-Mid Density vs High Density development options
 * with animated charts for cost and residual land value sensitivity analysis
 */
const FeasibilitySummary = ({ settings, currentResults }) => {
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
      name: 'Low-Mid Density',
      ResidualLandValue: currentResults?.lowMidDensity?.residualLandValue || 0,
      DwellingYield: currentResults?.lowMidDensity?.developmentYield || 0,
    },
    {
      name: 'High Density',
      ResidualLandValue: currentResults?.highDensity?.residualLandValue || 0,
      DwellingYield: currentResults?.highDensity?.developmentYield || 0,
    }
  ];
  
  // Generate sensitivity analysis data for how costs affect residual land value
  const costSensitivityData = Array.from({ length: 7 }, (_, i) => {
    const baselineLowMidCost = (currentResults?.lowMidDensity?.costPerSqmGFA || 3000);
    const baselineHighCost = (currentResults?.highDensity?.costPerSqmGFA || 3500);
    const baselineLowMidRLV = (currentResults?.lowMidDensity?.residualLandValue || 10000000);
    const baselineHighRLV = (currentResults?.highDensity?.residualLandValue || 15000000);
    
    // Cost factor: 80%, 85%, 90%, 95%, 100%, 105%, 110%
    const factor = 0.8 + (i * 0.05);
    
    // Calculate actual cost values
    const actualLowMidCost = Math.round(baselineLowMidCost * factor);
    const actualHighCost = Math.round(baselineHighCost * factor);
    
    // As costs increase, residual land value decreases (inverse relationship)
    // Using a simplified relationship: 1% increase in costs = X% decrease in RLV
    // The sensitivity multiplier can be adjusted based on actual project economics
    const sensitivityMultiplier = 1.5; // 1% cost increase = 1.5% RLV decrease
    const rlvImpactFactor = 1 + ((1 - factor) * sensitivityMultiplier);
    
    return {
      factor: `${Math.round(factor * 100)}%`,
      actualCost: Math.round((actualLowMidCost + actualHighCost) / 2), // Average of both costs for display
      'Low-Mid Density': Math.round(baselineLowMidRLV * rlvImpactFactor),
      'High Density': Math.round(baselineHighRLV * rlvImpactFactor),
    };
  });
  
  // Generate sensitivity analysis data for how sales/revenue affects residual land value
  const residualLandValueSensitivityData = Array.from({ length: 7 }, (_, i) => {
    // Revenue baseline and dwelling yield derived from current results
    const baselineLowMidRevenue = (currentResults?.lowMidDensity?.totalRevenue || 25000000);
    const baselineHighRevenue = (currentResults?.highDensity?.totalRevenue || 40000000);
    const lowMidDwellings = (currentResults?.lowMidDensity?.developmentYield || 50);
    const highDwellings = (currentResults?.highDensity?.developmentYield || 100);
    
    const baselineLowMid = (currentResults?.lowMidDensity?.residualLandValue || 10000000);
    const baselineHigh = (currentResults?.highDensity?.residualLandValue || 15000000);
    const factor = 0.8 + (i * 0.05); // 80%, 85%, 90%, 95%, 100%, 105%, 110%
    
    // Calculate per dwelling revenue
    const lowMidRevenuePerDwelling = baselineLowMidRevenue / lowMidDwellings;
    const highRevenuePerDwelling = baselineHighRevenue / highDwellings;
    const avgRevenuePerDwelling = (lowMidRevenuePerDwelling + highRevenuePerDwelling) / 2;
    
    return {
      factor: `${Math.round(factor * 100)}%`,
      revenuePerDwelling: Math.round(avgRevenuePerDwelling * factor),
      'Low-Mid Density': Math.round(baselineLowMid * factor),
      'High Density': Math.round(baselineHigh * factor),
    };
  });
  
  // Radar chart data comparing key metrics
  const radarData = [
    {
      metric: 'Residual Land Value',
      'Low-Mid Density': (currentResults?.lowMidDensity?.residualLandValue || 0) / 1000000,
      'High Density': (currentResults?.highDensity?.residualLandValue || 0) / 1000000,
    },
    {
      metric: 'GFA',
      'Low-Mid Density': (currentResults?.lowMidDensity?.gfa || 0) / 1000,
      'High Density': (currentResults?.highDensity?.gfa || 0) / 1000,
    },
    {
      metric: 'Yield',
      'Low-Mid Density': (currentResults?.lowMidDensity?.developmentYield || 0),
      'High Density': (currentResults?.highDensity?.developmentYield || 0),
    },
    {
      metric: 'FSR',
      'Low-Mid Density': (currentResults?.lowMidDensity?.fsr || 1),
      'High Density': (currentResults?.highDensity?.fsr || 2),
    },
    {
      metric: 'Cost',
      'Low-Mid Density': (currentResults?.lowMidDensity?.totalCost || 0) / 1000000,
      'High Density': (currentResults?.highDensity?.totalCost || 0) / 1000000,
    },
  ];

  return (
    <div className="p-4">
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
                        currentResults?.lowMidDensity?.residualLandValue || 0,
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
                        Math.max(...costSensitivityData.map(item => item['Low-Mid Density'] || 0)),
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
                dataKey="Low-Mid Density" 
                stroke="#8884d8" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 8 }}
                animationDuration={1500}
                name="Low-Mid Density"
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
                        Math.max(...residualLandValueSensitivityData.map(item => item['Low-Mid Density'] || 0)),
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
                dataKey="Low-Mid Density" 
                stroke="#8884d8" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 8 }}
                animationDuration={1500}
                name="Low-Mid Density"
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
        {/* Low-Mid Density Details */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <Building2 className="mr-2" /> Low-Mid Density Details
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
                <td className="px-4 py-2 text-right">{currentResults?.lowMidDensity?.gfa ? formatSqm(currentResults.lowMidDensity.gfa) : 'N/A'}</td>
              </tr>
              <tr>
                <td className="px-4 py-2">Development Yield</td>
                <td className="px-4 py-2 text-right">{currentResults?.lowMidDensity?.developmentYield || 0} units</td>
              </tr>
              <tr className="font-bold">
                <td className="px-4 py-2">Residual Land Value</td>
                <td className="px-4 py-2 text-right">{formatCurrency(currentResults?.lowMidDensity?.residualLandValue || 0)}</td>
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
    </div>
  );
};

export default FeasibilitySummary;