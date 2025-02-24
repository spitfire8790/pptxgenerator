import React, { useState } from 'react';
import { X, Bed, Bath, Car, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const formatPrice = (price) => {
  if (price >= 1000000) {
    return `$${(price / 1000000).toFixed(1)}M`;
  }
  return `$${(price / 1000).toFixed(0)}K`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'Not available';
  
  // Parse DD/MM/YYYY format
  const [day, month, year] = dateStr.split('/');
  const date = new Date(year, month - 1, day); // month is 0-based in Date constructor
  
  if (isNaN(date.getTime())) return 'Not available';
  
  return date.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const parseDate = (dateStr) => {
  if (!dateStr) return new Date(0); // Return oldest possible date for missing dates
  
  const [day, month, year] = dateStr.split('/');
  const date = new Date(year, month - 1, day);
  
  return isNaN(date.getTime()) ? new Date(0) : date; // Return oldest possible date for invalid dates
};

const capitalizeFirstLetter = (string) => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
};

const LOW_MID_DENSITY_TYPES = ['duplex/semi-detached', 'duplex-semi-detached', 'house', 'terrace', 'townhouse', 'villa'];
const HIGH_DENSITY_TYPES = ['apartment', 'studio', 'unit'];

const MedianPriceModal = ({ open, onClose, salesData }) => {
  const [selectedDensity, setSelectedDensity] = useState('all');
  const [selectedPropertyType, setSelectedPropertyType] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'sold_date', direction: 'desc' });

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

  // Get unique property types for the filter
  const uniquePropertyTypes = [...new Set(salesData.map(sale => 
    capitalizeFirstLetter(sale.property_type?.trim() || 'Unknown')
  ))].sort();

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Filter sales data based on density type and property type
  const filteredSalesData = salesData.filter(sale => {
    const propertyType = sale.property_type?.toLowerCase().trim();
    
    // Density filter
    const passesDensityFilter = selectedDensity === 'all' ? true :
      selectedDensity === 'lowMid' ? 
        LOW_MID_DENSITY_TYPES.some(type => propertyType?.includes(type)) :
        HIGH_DENSITY_TYPES.some(type => propertyType?.includes(type));

    // Property type filter
    const passesPropertyTypeFilter = selectedPropertyType === 'all' ? true :
      capitalizeFirstLetter(sale.property_type?.trim()) === selectedPropertyType;

    return passesDensityFilter && passesPropertyTypeFilter;
  });

  // Sort the filtered data
  const sortedData = [...filteredSalesData].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    
    if (sortConfig.key === 'sold_date') {
      aValue = parseDate(a.sold_date);
      bValue = parseDate(b.sold_date);
    } else if (sortConfig.key === 'price') {
      aValue = Number(a.price) || 0;
      bValue = Number(b.price) || 0;
    } else {
      aValue = aValue || 0;
      bValue = bValue || 0;
    }

    if (aValue === bValue) return 0;
    const comparison = aValue < bValue ? -1 : 1;
    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  // Calculate processed data after sorting
  const processedSalesData = sortedData.map(sale => ({
    ...sale,
    gfa: Math.round(sale.bedrooms * 75),
    pricePerM2: Math.round(sale.price / (sale.bedrooms * 75))
  }));

  // Calculate median price by bedroom count
  const medianPricesByBedroom = processedSalesData.reduce((acc, curr) => {
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

  // Calculate sales counts by year
  const salesCounts = processedSalesData.reduce((acc, sale) => {
    if (!sale.sold_date) return acc;
    const year = sale.sold_date.split('/')[2];
    if (year === '2024') acc.year2024++;
    else if (year === '2025') acc.year2025++;
    acc.total++;
    return acc;
  }, { total: 0, year2024: 0, year2025: 0 });

  // Get the most recent sale date from the entire dataset
  const mostRecentDate = salesData
    .map(sale => ({ date: sale.sold_date, parsed: parseDate(sale.sold_date) }))
    .filter(sale => sale.parsed.getTime() > new Date(0).getTime()) // Filter out invalid dates
    .sort((a, b) => b.parsed - a.parsed)[0]?.date;

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="w-4 h-4 ml-1" /> : 
      <ChevronDown className="w-4 h-4 ml-1" />;
  };

  const SortableHeader = ({ column, label }) => (
    <th 
      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0 cursor-pointer hover:bg-gray-100"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center">
        {label}
        <SortIcon column={column} />
      </div>
    </th>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[calc(100vh-120px)] flex flex-col">
        <div className="border-b p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Sales Analysis</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600 mt-1">
            <div>
              Based on sales across 2024 and 2025. Source: <a href="https://www.getsoldprice.com.au/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">GetSoldPrice</a>
            </div>
            <div>
              Data refreshed {mostRecentDate ? formatDate(mostRecentDate) : 'Not available'}
            </div>
          </div>
        </div>

        <div className="p-4 border-b bg-gray-50 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Density:</span>
              <select
                value={selectedDensity}
                onChange={(e) => setSelectedDensity(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="all">All Types</option>
                <option value="lowMid">Low-Mid Density</option>
                <option value="high">High Density</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Property Type:</span>
              <select
                value={selectedPropertyType}
                onChange={(e) => setSelectedPropertyType(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="all">All Types</option>
                {uniquePropertyTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-4 flex flex-col">
          {medianPrices.length > 0 && (
            <div className="mb-6 flex-shrink-0">
              <h3 className="text-lg font-medium mb-4">Median Prices by Bedroom Count</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={medianPrices} margin={{ top: 5, right: 30, left: 20, bottom: 35 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="bedrooms" 
                      label={{ 
                        value: 'Number of Bedrooms', 
                        position: 'bottom', 
                        offset: 0,
                        dy: 20
                      }}
                      tickMargin={10}
                    />
                    <YAxis tickFormatter={(value) => formatPrice(value)} />
                    <Tooltip
                      formatter={(value) => formatPrice(value)}
                      labelFormatter={(value) => `${value} Bedrooms`}
                    />
                    <Bar 
                      dataKey="median" 
                      fill="#3B82F6"
                      label={{
                        position: 'center',
                        fill: 'white',
                        fontWeight: 'bold',
                        formatter: (value) => formatPrice(value)
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0">
            <div className="mb-4">
              <h3 className="text-lg font-medium">
                Recent Sales 
                <span className="text-sm font-normal text-gray-600 ml-2">
                  ({salesCounts.total} sales: {salesCounts.year2024} in 2024, {salesCounts.year2025} in 2025)
                </span>
              </h3>
            </div>

            <div className="border rounded-lg h-full flex flex-col">
              <div className="flex-1 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0">Address</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0">Property Type</th>
                      <SortableHeader column="price" label="Price" />
                      <SortableHeader column="bedrooms" label="Bed" />
                      <SortableHeader column="bathrooms" label="Bath" />
                      <SortableHeader column="parking" label="Car" />
                      <SortableHeader column="sold_date" label="Sold Date" />
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {processedSalesData.map((sale, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">{sale.address}</td>
                        <td className="px-4 py-2 text-sm">{capitalizeFirstLetter(sale.property_type)}</td>
                        <td className="px-4 py-2 text-sm font-medium">{formatPrice(sale.price)}</td>
                        <td className="px-4 py-2 text-sm text-center">
                          <div className="flex items-center justify-center">
                            <Bed className="w-4 h-4 mr-1 text-gray-400" />
                            {sale.bedrooms}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-center">
                          <div className="flex items-center justify-center">
                            <Bath className="w-4 h-4 mr-1 text-gray-400" />
                            {sale.bathrooms}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-center">
                          <div className="flex items-center justify-center">
                            <Car className="w-4 h-4 mr-1 text-gray-400" />
                            {sale.parking}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm">{formatDate(sale.sold_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedianPriceModal; 