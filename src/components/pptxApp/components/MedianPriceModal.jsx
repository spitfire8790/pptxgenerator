import React, { useState } from 'react';
import { X, Bed, Bath, Car, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const formatPrice = (price) => {
  if (price >= 1000000) {
    return `$${(price / 1000000).toFixed(1)}M`;
  }
  return `$${(price / 1000).toFixed(0)}K`;
};

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const MedianPriceModal = ({ open, onClose, salesData }) => {
  const [showDetailedSales, setShowDetailedSales] = useState(false);

  if (!open) return null;

  // Validate salesData
  if (!salesData || !Array.isArray(salesData) || salesData.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Sales Analysis</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-8 text-center text-gray-600">
            No sales data available for this suburb.
          </div>
        </div>
      </div>
    );
  }

  // Calculate median price by bedroom count
  const medianPricesByBedroom = salesData.reduce((acc, curr) => {
    if (!curr || typeof curr.bedrooms !== 'number' || typeof curr.price !== 'number') {
      return acc;
    }
    if (!acc[curr.bedrooms]) {
      acc[curr.bedrooms] = [];
    }
    acc[curr.bedrooms].push(curr.price);
    return acc;
  }, {});

  // Calculate median for each bedroom count
  const medianPrices = Object.entries(medianPricesByBedroom).map(([bedrooms, prices]) => {
    const sortedPrices = prices.sort((a, b) => a - b);
    const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
    return {
      bedrooms: parseInt(bedrooms),
      median,
      count: prices.length,
      formattedMedian: formatPrice(median)
    };
  }).sort((a, b) => a.bedrooms - b.bedrooms);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Median Unit Prices by Bedroom Count</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          {/* Main Summary Section */}
          <div className="grid grid-cols-1 gap-6">
            {/* Chart */}
            <div className="bg-white rounded-lg border p-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={medianPrices}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bedrooms" label={{ value: 'Bedrooms', position: 'bottom' }} />
                    <YAxis
                      tickFormatter={(value) => formatPrice(value)}
                      label={{ value: 'Median Price', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      formatter={(value) => formatPrice(value)}
                      labelFormatter={(value) => `${value} Bedroom${value !== 1 ? 's' : ''}`}
                    />
                    <Bar dataKey="median" fill="#002664" name="Median Price" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Summary Table */}
            <div className="bg-white rounded-lg border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bedrooms
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Median Price
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sample Size
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {medianPrices.map((row) => (
                    <tr key={row.bedrooms} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {row.bedrooms} Bedroom{row.bedrooms !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {formatPrice(row.median)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                        {row.count} sales
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Collapsible Detailed Sales Section */}
            <div className="bg-white rounded-lg border">
              <button
                onClick={() => setShowDetailedSales(!showDetailedSales)}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <span>View Detailed Sales Data</span>
                {showDetailedSales ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {showDetailedSales && (
                <div className="border-t max-h-96 overflow-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Address
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sale Date
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {salesData.map((sale, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {sale.address}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                            {formatPrice(sale.price)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {formatDate(sale.sold_date)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            <div className="flex items-center justify-center space-x-4">
                              <div className="flex items-center">
                                <Bed className="w-4 h-4 mr-1" />
                                {sale.bedrooms}
                              </div>
                              <div className="flex items-center">
                                <Bath className="w-4 h-4 mr-1" />
                                {sale.bathrooms}
                              </div>
                              <div className="flex items-center">
                                <Car className="w-4 h-4 mr-1" />
                                {sale.parking}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedianPriceModal; 