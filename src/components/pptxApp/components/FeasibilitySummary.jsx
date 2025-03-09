import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Building2, Building } from 'lucide-react';

// Helper function to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const FeasibilitySummary = ({ 
  settings, 
  lmrOptions, 
  currentResults, 
  lmrResults 
}) => {
  // Prepare data for the comparison chart
  const chartData = [
    {
      name: 'Low-Mid Density',
      Current: currentResults?.lowMidDensity?.netRealisation || 0,
      LMR: lmrResults?.lowMidDensity?.netRealisation || 0,
    },
    {
      name: 'High Density',
      Current: currentResults?.highDensity?.netRealisation || 0,
      LMR: lmrResults?.highDensity?.netRealisation || 0,
    }
  ];

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-6">Development Feasibility Summary</h2>

      {/* Comparison Chart */}
      <div className="mb-8 bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4">Net Realisation Comparison</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="Current" fill="#8884d8" name="Current Controls" />
              <Bar dataKey="LMR" fill="#82ca9d" name="LMR Controls" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Comparison Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Low-Mid Density Comparison */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <Building2 className="mr-2" /> Low-Mid Density Comparison
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
                <td className="px-4 py-2">FSR</td>
                <td className="px-4 py-2 text-right">{currentResults?.lowMidDensity?.fsr || 'N/A'}</td>
                <td className="px-4 py-2 text-right">
                  {lmrOptions.selectedOptions?.lowMidDensity?.fsrRange 
                    ? `${lmrOptions.selectedOptions.lowMidDensity.fsrRange.min}-${lmrOptions.selectedOptions.lowMidDensity.fsrRange.max}`
                    : lmrOptions.selectedOptions?.lowMidDensity?.potentialFSR || 'N/A'}
                </td>
                <td className="px-4 py-2 text-right">-</td>
              </tr>
              <tr>
                <td className="px-4 py-2">HOB</td>
                <td className="px-4 py-2 text-right">{currentResults?.lowMidDensity?.hob ? `${currentResults.lowMidDensity.hob}m` : 'N/A'}</td>
                <td className="px-4 py-2 text-right">
                  {lmrOptions.selectedOptions?.lowMidDensity?.hobRange 
                    ? `${lmrOptions.selectedOptions.lowMidDensity.hobRange.min}-${lmrOptions.selectedOptions.lowMidDensity.hobRange.max}m`
                    : lmrOptions.selectedOptions?.lowMidDensity?.potentialHOB ? `${lmrOptions.selectedOptions.lowMidDensity.potentialHOB}m` : 'N/A'}
                </td>
                <td className="px-4 py-2 text-right">-</td>
              </tr>
              <tr>
                <td className="px-4 py-2">GFA</td>
                <td className="px-4 py-2 text-right">{currentResults?.lowMidDensity?.gfa?.toLocaleString()}m²</td>
                <td className="px-4 py-2 text-right">{lmrResults?.lowMidDensity?.gfa?.toLocaleString()}m²</td>
                <td className="px-4 py-2 text-right">{((lmrResults?.lowMidDensity?.gfa || 0) - (currentResults?.lowMidDensity?.gfa || 0))?.toLocaleString()}m²</td>
              </tr>
              <tr>
                <td className="px-4 py-2">Development Yield</td>
                <td className="px-4 py-2 text-right">{currentResults?.lowMidDensity?.developmentYield || 0} units</td>
                <td className="px-4 py-2 text-right">{lmrResults?.lowMidDensity?.developmentYield || 0} units</td>
                <td className="px-4 py-2 text-right">{(lmrResults?.lowMidDensity?.developmentYield || 0) - (currentResults?.lowMidDensity?.developmentYield || 0)} units</td>
              </tr>
              <tr className="font-bold">
                <td className="px-4 py-2">Net Realisation</td>
                <td className="px-4 py-2 text-right">{formatCurrency(currentResults?.lowMidDensity?.netRealisation || 0)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(lmrResults?.lowMidDensity?.netRealisation || 0)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency((lmrResults?.lowMidDensity?.netRealisation || 0) - (currentResults?.lowMidDensity?.netRealisation || 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* High Density Comparison */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <Building className="mr-2" /> High Density Comparison
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
                <td className="px-4 py-2">FSR</td>
                <td className="px-4 py-2 text-right">{currentResults?.highDensity?.fsr || 'N/A'}</td>
                <td className="px-4 py-2 text-right">
                  {lmrOptions.selectedOptions?.highDensity?.fsrRange 
                    ? `${lmrOptions.selectedOptions.highDensity.fsrRange.min}-${lmrOptions.selectedOptions.highDensity.fsrRange.max}`
                    : lmrOptions.selectedOptions?.highDensity?.potentialFSR || 'N/A'}
                </td>
                <td className="px-4 py-2 text-right">-</td>
              </tr>
              <tr>
                <td className="px-4 py-2">HOB</td>
                <td className="px-4 py-2 text-right">{currentResults?.highDensity?.hob ? `${currentResults.highDensity.hob}m` : 'N/A'}</td>
                <td className="px-4 py-2 text-right">
                  {lmrOptions.selectedOptions?.highDensity?.hobRange 
                    ? `${lmrOptions.selectedOptions.highDensity.hobRange.min}-${lmrOptions.selectedOptions.highDensity.hobRange.max}m`
                    : lmrOptions.selectedOptions?.highDensity?.potentialHOB ? `${lmrOptions.selectedOptions.highDensity.potentialHOB}m` : 'N/A'}
                </td>
                <td className="px-4 py-2 text-right">-</td>
              </tr>
              <tr>
                <td className="px-4 py-2">GFA</td>
                <td className="px-4 py-2 text-right">{currentResults?.highDensity?.gfa?.toLocaleString()}m²</td>
                <td className="px-4 py-2 text-right">{lmrResults?.highDensity?.gfa?.toLocaleString()}m²</td>
                <td className="px-4 py-2 text-right">{((lmrResults?.highDensity?.gfa || 0) - (currentResults?.highDensity?.gfa || 0))?.toLocaleString()}m²</td>
              </tr>
              <tr>
                <td className="px-4 py-2">Development Yield</td>
                <td className="px-4 py-2 text-right">{currentResults?.highDensity?.developmentYield || 0} units</td>
                <td className="px-4 py-2 text-right">{lmrResults?.highDensity?.developmentYield || 0} units</td>
                <td className="px-4 py-2 text-right">{(lmrResults?.highDensity?.developmentYield || 0) - (currentResults?.highDensity?.developmentYield || 0)} units</td>
              </tr>
              <tr className="font-bold">
                <td className="px-4 py-2">Net Realisation</td>
                <td className="px-4 py-2 text-right">{formatCurrency(currentResults?.highDensity?.netRealisation || 0)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(lmrResults?.highDensity?.netRealisation || 0)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency((lmrResults?.highDensity?.netRealisation || 0) - (currentResults?.highDensity?.netRealisation || 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FeasibilitySummary; 