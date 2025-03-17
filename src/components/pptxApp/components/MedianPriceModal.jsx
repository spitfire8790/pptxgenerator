import React, { useState } from 'react';
import { X, Bed, Bath, Car, ChevronDown, ChevronUp, ArrowUpDown, LineChart as LineChartIcon } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { rpc } from '@gi-nx/iframe-sdk';

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

const MEDIUM_DENSITY_TYPES = ['terrace', 'townhouse', 'villa'];
const HIGH_DENSITY_TYPES = ['apartment', 'studio', 'unit'];

const MedianPriceModal = ({ open = true, onClose, salesData }) => {
  const [selectedDensity, setSelectedDensity] = useState('all');
  const [selectedPropertyType, setSelectedPropertyType] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'sold_date', direction: 'desc' });
  const [showTimeChart, setShowTimeChart] = useState(true);
  const [timeChartGroupBy, setTimeChartGroupBy] = useState('bedroom'); // 'property' or 'bedroom'

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
      selectedDensity === 'medium' ? 
        MEDIUM_DENSITY_TYPES.some(type => propertyType?.includes(type)) :
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

  // Calculate median prices over time grouped by property type or bedroom count
  const calculateMedianPricesOverTime = () => {
    // Get periods (month/year) from all sales
    const allPeriods = new Set();
    processedSalesData.forEach(sale => {
      if (!sale.sold_date) return;
      
      const [day, month, year] = sale.sold_date.split('/');
      // Create a more readable period format (e.g., "Feb-2024")
      const date = new Date(year, parseInt(month) - 1, 1); // month is 0-based in JS Date
      const monthName = date.toLocaleString('en-AU', { month: 'short' });
      const period = `${monthName}-${year}`;
      allPeriods.add(period);
    });
    
    const sortedPeriods = Array.from(allPeriods).sort((a, b) => {
      // Parse "Feb-2024" format
      const [monthA, yearA] = a.split('-');
      const [monthB, yearB] = b.split('-');
      // Convert month names to month numbers (0-11)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthNumA = monthNames.indexOf(monthA);
      const monthNumB = monthNames.indexOf(monthB);
      
      const dateA = new Date(parseInt(yearA), monthNumA, 1);
      const dateB = new Date(parseInt(yearB), monthNumB, 1);
      return dateA - dateB;
    });
    
    if (timeChartGroupBy === 'property') {
      // Get unique property types
      const propertyTypes = new Set();
      processedSalesData.forEach(sale => {
        if (sale.property_type) {
          propertyTypes.add(capitalizeFirstLetter(sale.property_type.trim()));
        }
      });
      
      // Only use the top 5 property types to avoid chart clutter
      const topPropertyTypes = Array.from(propertyTypes).slice(0, 5);
      
      // Group sales by period and property type
      const salesByPeriodAndType = {};
      
      // Initialize periods for all property types (ensures consistent data points)
      sortedPeriods.forEach(period => {
        salesByPeriodAndType[period] = {};
        topPropertyTypes.forEach(type => {
          salesByPeriodAndType[period][type] = [];
        });
      });
      
      // Fill in the sales data
      processedSalesData.forEach(sale => {
        if (!sale.sold_date || !sale.property_type) return;
        
        const [day, month, year] = sale.sold_date.split('/');
        // Create proper format for period
        const date = new Date(year, parseInt(month) - 1, 1);
        const monthName = date.toLocaleString('en-AU', { month: 'short' });
        const period = `${monthName}-${year}`;
        const propertyType = capitalizeFirstLetter(sale.property_type.trim());
        
        if (topPropertyTypes.includes(propertyType) && salesByPeriodAndType[period] && salesByPeriodAndType[period][propertyType]) {
          salesByPeriodAndType[period][propertyType].push(sale.price);
        }
      });
      
      // Calculate median for each period and property type
      return sortedPeriods.map(period => {
        const result = { period };
        
        topPropertyTypes.forEach(type => {
          const prices = salesByPeriodAndType[period][type];
          if (prices.length > 0) {
            const sortedPrices = [...prices].sort((a, b) => a - b);
            result[type] = sortedPrices[Math.floor(sortedPrices.length / 2)];
          } else {
            result[type] = null; // No data for this period/type
          }
        });
        
        return result;
      });
    } else {
      // Group by bedroom count
      // Get unique bedroom counts
      const bedroomCounts = new Set();
      processedSalesData.forEach(sale => {
        if (typeof sale.bedrooms === 'number') {
          bedroomCounts.add(sale.bedrooms);
        }
      });
      
      // Only use bedroom counts 1-5 to avoid chart clutter
      const validBedroomCounts = Array.from(bedroomCounts)
        .filter(count => count >= 1 && count <= 5)
        .sort((a, b) => a - b);
      
      // Group sales by period and bedroom count
      const salesByPeriodAndBedrooms = {};
      
      // Initialize periods for all bedroom counts
      sortedPeriods.forEach(period => {
        salesByPeriodAndBedrooms[period] = {};
        validBedroomCounts.forEach(count => {
          salesByPeriodAndBedrooms[period][count] = [];
        });
      });
      
      // Fill in the sales data
      processedSalesData.forEach(sale => {
        if (!sale.sold_date || typeof sale.bedrooms !== 'number') return;
        
        const [day, month, year] = sale.sold_date.split('/');
        // Create formatted period
        const date = new Date(year, parseInt(month) - 1, 1);
        const monthName = date.toLocaleString('en-AU', { month: 'short' });
        const period = `${monthName}-${year}`;
        
        if (validBedroomCounts.includes(sale.bedrooms) && 
            salesByPeriodAndBedrooms[period] && 
            salesByPeriodAndBedrooms[period][sale.bedrooms]) {
          salesByPeriodAndBedrooms[period][sale.bedrooms].push(sale.price);
        }
      });
      
      // Calculate median for each period and bedroom count
      return sortedPeriods.map(period => {
        const result = { period };
        
        validBedroomCounts.forEach(count => {
          const prices = salesByPeriodAndBedrooms[period][count];
          if (prices.length > 0) {
            const sortedPrices = [...prices].sort((a, b) => a - b);
            result[`${count} BR`] = sortedPrices[Math.floor(sortedPrices.length / 2)];
          } else {
            result[`${count} BR`] = null; // No data for this period/count
          }
        });
        
        return result;
      });
    }
  };
  
  const medianPricesOverTime = calculateMedianPricesOverTime();
  
  // Get keys for the line chart (property types or bedroom counts)
  const timeChartKeys = timeChartGroupBy === 'property' 
    ? Object.keys(medianPricesOverTime[0] || {}).filter(key => key !== 'period')
    : Object.keys(medianPricesOverTime[0] || {}).filter(key => key !== 'period');

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

  // Add handleRowClick function
  const handleRowClick = (sale) => {
    console.log('Clicked sale:', sale);
    
    if (!sale.coordinates) {
      console.warn('No coordinates available for this sale:', sale);
      return;
    }
    
    console.log('Flying to coordinates:', sale.coordinates);
    
    try {
      rpc.invoke('flyTo', {
        center: [sale.coordinates.x, sale.coordinates.y],
        zoom: 18,
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        duration: 2000
      });
    } catch (error) {
      console.error('Error in flyTo:', error);
    }
  };

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
                <option value="medium">Medium Density</option>
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
          {(medianPrices.length > 0 || medianPricesOverTime.length > 0) && (
            <div className="mb-6 flex-shrink-0">
              <div className="flex flex-col space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">
                    {showTimeChart ? 'Median Sales Price Over Time' : 'Median Prices by Bedroom Count'}
                    {processedSalesData.length > 0 && !showTimeChart && (
                      <span className="text-sm font-normal text-gray-600 ml-2">
                        (Median: {processedSalesData.map(s => s.bedrooms).sort((a, b) => a - b)[Math.floor(processedSalesData.length / 2)]} bedrooms, {formatPrice(processedSalesData.map(s => s.price).sort((a, b) => a - b)[Math.floor(processedSalesData.length / 2)])})
                      </span>
                    )}
                  </h3>
                  <button
                    onClick={() => setShowTimeChart(!showTimeChart)}
                    className="flex items-center px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm rounded-md transition-colors"
                  >
                    <LineChartIcon className="w-4 h-4 mr-1" />
                    {showTimeChart ? 'Show by Bedroom' : 'Show Over Time'}
                  </button>
                </div>
                
                {showTimeChart && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">Density:</span>
                      <div className="flex bg-gray-100 rounded-md p-1">
                        <button
                          onClick={() => setSelectedDensity('all')}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                            selectedDensity === 'all' 
                              ? 'bg-white shadow-sm text-blue-700' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setSelectedDensity('medium')}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                            selectedDensity === 'medium' 
                              ? 'bg-white shadow-sm text-blue-700' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Medium
                        </button>
                        <button
                          onClick={() => setSelectedDensity('high')}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                            selectedDensity === 'high' 
                              ? 'bg-white shadow-sm text-blue-700' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          High
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">Group by:</span>
                      <div className="flex bg-gray-100 rounded-md p-1">
                        <button
                          onClick={() => setTimeChartGroupBy('property')}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                            timeChartGroupBy === 'property' 
                              ? 'bg-white shadow-sm text-blue-700' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Property Type
                        </button>
                        <button
                          onClick={() => setTimeChartGroupBy('bedroom')}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                            timeChartGroupBy === 'bedroom' 
                              ? 'bg-white shadow-sm text-blue-700' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Bedroom Count
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="h-64">
                {!showTimeChart ? (
                  // Bar chart for median prices by bedroom count
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
                ) : (
                  // Line chart for median prices over time
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={medianPricesOverTime} margin={{ top: 5, right: 30, left: 20, bottom: 35 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="period"
                        label={{ 
                          value: 'Time Period', 
                          position: 'bottom', 
                          offset: 0,
                          dy: 20
                        }}
                        tickMargin={10}
                      />
                      <YAxis tickFormatter={(value) => formatPrice(value)} />
                      <Tooltip
                        formatter={(value) => formatPrice(value)}
                        labelFormatter={(value) => `Period: ${value}`}
                        contentStyle={{ backgroundColor: 'white', border: '1px solid #ddd' }}
                      />
                      <Legend 
                        layout="horizontal" 
                        verticalAlign="top" 
                        align="center"
                        wrapperStyle={{ paddingBottom: 10 }}
                      />
                      {/* Color palette for lines */}
                      {timeChartKeys.map((key, index) => {
                        // Define a set of colors for the lines
                        const colors = [
                          '#3B82F6', // blue
                          '#10B981', // green
                          '#F59E0B', // amber
                          '#EF4444', // red
                          '#8B5CF6', // purple
                          '#EC4899', // pink
                          '#6366F1'  // indigo
                        ];
                        return (
                          <Line 
                            key={key}
                            type="monotone" 
                            dataKey={key} 
                            name={key}
                            stroke={colors[index % colors.length]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 6 }}
                            connectNulls={true}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                )}
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
                      <tr key={index} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleRowClick(sale)}>
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
