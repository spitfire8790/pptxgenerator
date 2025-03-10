import React, { useState, useEffect, useRef } from 'react';
import { X, HardHat, ChevronDown, ChevronUp, ArrowUpDown, Search, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Legend } from 'recharts';

const formatCurrency = (value) => {
  if (!value && value !== 0) return 'N/A';
  return `$${value.toLocaleString('en-AU')}`;
};

const formatMillions = (value) => {
  if (!value && value !== 0) return 'N/A';
  return `$${(value / 1000000).toFixed(1)}M`;
};

const formatFSR = (gfa, landArea) => {
  if (!gfa || !landArea) return 'N/A';
  return `${(gfa / landArea).toFixed(1)}:1`;
};

const formatArea = (value) => {
  if (!value && value !== 0) return 'N/A';
  if (value === 0) return 'N/A';
  return `${Math.round(value).toLocaleString('en-AU')} m²`;
};

// Custom formatter for data labels in the chart
const formatChartLabel = (value) => {
  if (!value && value !== 0) return '';
  return `$${Math.round(value).toLocaleString('en-AU')}/m²`;
};

// Define standardized development type mappings matching FeasibilityManager.jsx
// These are the standardized groupings we'll use for the chart
const STANDARDIZED_TYPES = {
  'Dwelling': ['DWELLING', 'DWELLING_HOUSE'],
  'Dual Occupancy': ['DUAL_OCCUPANCY', 'DUAL_OCCUPANCY_ATTACHED', 'DUAL_OCCUPANCY_DETACHED'],
  'Multi-dwelling Housing': ['MULTI_DWELLING_HOUSING', 'MULTI_DWELLING_HOUSING_TERRACES', 'MEDIUM_DENSITY_HOUSING'],
  'Manor House': ['MANOR_HOUSE', 'MANOR_HOUSES'],
  'Semi-attached Dwelling': ['SEMI_DETACHED_DWELLING', 'SEMI_ATTACHED_DWELLING'],
  'Residential Flat Building': ['RESIDENTIAL_FLAT_BUILDING'],
  'Shop Top Housing': ['SHOP_TOP_HOUSING'],
  'Build-to-Rent': ['BUILD_TO_RENT']
};

// Types to exclude from chart and data
const EXCLUDED_TYPES = [
  'DEMOLITION',
  'ALTERATIONS',
  'ADDITIONS'
];

// Group development types by density category
const LOW_MID_DENSITY_TYPES = [
  'DWELLING',
  'DWELLING_HOUSE',
  'DUAL_OCCUPANCY',
  'DUAL_OCCUPANCY_ATTACHED',
  'DUAL_OCCUPANCY_DETACHED',
  'MULTI_DWELLING_HOUSING',
  'MULTI_DWELLING_HOUSING_TERRACES',
  'SEMI_DETACHED_DWELLING',
  'SEMI_ATTACHED_DWELLING',
  'MANOR_HOUSE',
  'MANOR_HOUSES',
  'MEDIUM_DENSITY_HOUSING'
];

const HIGH_DENSITY_TYPES = [
  'RESIDENTIAL_FLAT_BUILDING',
  'SHOP_TOP_HOUSING',
  'BUILD_TO_RENT'
];

// Helper function to map any development type to a standardized category
const mapToStandardizedType = (developmentType) => {
  if (!developmentType) return 'Other';
  
  // Convert to uppercase for consistent comparison
  const upperType = developmentType.toUpperCase();
  
  // Check if type matches any of our standardized categories
  for (const [standardType, typeVariants] of Object.entries(STANDARDIZED_TYPES)) {
    if (typeVariants.some(variant => upperType.includes(variant))) {
      return standardType;
    }
  }
  
  return 'Other';
};

// Determine density category for a given development type
const getDensityCategory = (developmentType) => {
  if (!developmentType) return 'unknown';
  
  const upperType = developmentType.toUpperCase();
  
  // Check against exact matches from the density type arrays
  if (LOW_MID_DENSITY_TYPES.some(type => upperType.includes(type))) {
    return 'lowMid';
  } 
  
  if (HIGH_DENSITY_TYPES.some(type => upperType.includes(type))) {
    return 'high';
  }
  
  return 'unknown';
};

// Updated colors to match the requested blue and orange
const DENSITY_COLORS = {
  lowMid: '#4c6ef5', // Blue
  high: '#ff9800', // Orange
  unknown: '#9ca3af' // Gray for unknown
};

const ConstructionDataModal = ({ open = true, onClose, constructionData }) => {
  const [selectedDensity, setSelectedDensity] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'costPerM2', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [numericFilters, setNumericFilters] = useState({
    landArea: { operator: '>', value: '' },
    gfa: { operator: '>', value: '' },
    totalCost: { operator: '>', value: '' },
    costPerM2: { operator: '>', value: '' }
  });
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);
  const filterModalRef = useRef(null);

  // Column label mapping for displaying friendly names in the filter modal
  const columnLabels = {
    address: "Address",
    developmentType: "Type",
    landArea: "Land Area",
    gfa: "GFA (m²)",
    totalCost: "Cost",
    costPerM2: "Cost $/m² GFA",
    fsr: "FSR"
  };

  if (!open || !constructionData) return null;

  // Log the received data structure for debugging
  console.log('Full constructionData received:', constructionData);

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Function to determine if a development type should be included
  const shouldIncludeType = (type) => {
    if (!type) return false;
    
    // Check if it contains excluded terms
    const excludedTypeMatch = EXCLUDED_TYPES.some(excludedType => 
      type.includes(excludedType)
    );
    
    // Include if it's not excluded
    return !excludedTypeMatch;
  };

  // Format development type for display - maps raw types to standardized categories
  const formatDevelopmentType = (type) => {
    if (!type) return 'Unknown';
    
    // Map to standardized category
    return mapToStandardizedType(type);
  };

  // Enhanced filter function to handle multiple column filters with new filtering options
  const applyFilters = (data) => {
    if (!data) return [];
    
    // First filter by search term if present
    let filteredData = searchTerm 
      ? data.filter(item => 
          Object.values(item).some(value => 
            value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
          )
        )
      : data;
    
    // Filter by selected types if any
    if (selectedTypes.length > 0) {
      filteredData = filteredData.filter(item => 
        selectedTypes.includes(item.developmentType)
      );
    }
    
    // Apply numeric filters
    Object.entries(numericFilters).forEach(([key, filterConfig]) => {
      if (filterConfig.value && filterConfig.value.trim() !== '') {
        const numericValue = parseFloat(filterConfig.value);
        if (!isNaN(numericValue)) {
          filteredData = filteredData.filter(item => {
            const itemValue = parseFloat(item[key]);
            if (isNaN(itemValue)) return false;
            
            switch (filterConfig.operator) {
              case '>':
                return itemValue > numericValue;
              case '<':
                return itemValue < numericValue;
              case '=':
                return Math.abs(itemValue - numericValue) < 0.01; // For floating point comparison
              default:
                return true;
            }
          });
        }
      }
    });
    
    return filteredData;
  };

  // Extract and prepare construction cost data
  const prepareData = () => {
    let data = [];
    
    // Use the preprocessed constructionCostsRaw array which already has all the needed fields
    if (constructionData && Array.isArray(constructionData.constructionCostsRaw)) {
      console.log('Construction data found:', constructionData.constructionCostsRaw.length);
      
      const filteredData = constructionData.constructionCostsRaw.filter(item => {
        if (!item || !item.developmentType) return false;
        
        // Convert to uppercase for consistent comparison
        const devType = item.developmentType.toUpperCase();
        
        // Filter by density if selected
        const densityFilter = selectedDensity === 'all' ? true :
          selectedDensity === 'lowMid' ? LOW_MID_DENSITY_TYPES.some(type => 
            devType.includes(type)) :
          selectedDensity === 'high' ? HIGH_DENSITY_TYPES.some(type => 
            devType.includes(type)) :
          false;
          
        return densityFilter && shouldIncludeType(devType);
      });
      
      data = filteredData.map(item => {
        // Map the development type to a standardized category
        const standardizedType = mapToStandardizedType(item.developmentType);
        
        // Calculate FSR if not already available
        const fsr = (item.landArea && item.landArea > 0) ? 
          item.gfa / item.landArea : 0;
        
        return {
          id: item.id || Math.random().toString(),
          developmentType: item.developmentType || 'Unknown', // Keep original as primary
          standardizedType: standardizedType, // Store standardized type as secondary
          address: item.address || 'Unknown',
          landArea: item.landArea || 0,
          gfa: item.gfa || 0,
          totalCost: item.totalCost || 0,
          costPerM2: item.costPerM2 || 0,
          fsr: fsr
        };
      });
    } else {
      console.warn('Construction data not found or has unexpected structure:', constructionData);
    }
    
    return data;
  };

  const data = prepareData();
  const filteredData = applyFilters(data);
  
  // Sort the filtered data
  const sortedData = [...filteredData].sort((a, b) => {
    const aValue = a[sortConfig.key] || 0;
    const bValue = b[sortConfig.key] || 0;
    
    if (aValue === bValue) return 0;
    const comparison = aValue < bValue ? -1 : 1;
    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  // Calculate statistics for the current view
  const calculateStats = (data, valueField) => {
    if (!data || data.length === 0) return { min: 0, max: 0, mean: 0, median: 0, count: 0 };
    
    const values = data.map(item => item[valueField] || 0).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      min: values[0],
      max: values[values.length - 1],
      mean: Math.round(sum / values.length),
      median: values[Math.floor(values.length / 2)],
      count: values.length
    };
  };

  const stats = calculateStats(filteredData, 'costPerM2');
  
  // Group data for chart visualization by original Development Type
  const prepareChartData = () => {
    if (data.length === 0) return [];
    
    // Define allowed types in the format that matches the input data
    // These match the format in FeasibilityManager.jsx
    const allowedLowMidDensityTypes = [
      'Dwelling',
      'Dwelling house',
      'Dual occupancy',
      'Dual occupancy (attached)',
      'Dual occupancy (detached)',
      'Multi-dwelling housing',
      'Multi-dwelling housing (terraces)',
      'Semi-attached dwelling',
      'Manor house',
      'Medium Density Housing',
      'Manor houses'
    ];
    
    const allowedHighDensityTypes = [
      'Residential flat building',
      'Shop top housing',
      'Build-to-rent'
    ];
    
    // Group by original development type
    const grouped = data.reduce((acc, curr) => {
      if (!curr.developmentType) return acc;
      
      const devType = curr.developmentType;
      
      // Skip unwanted types like "Erection of a new structure", "Pools", "decks", "fencing"
      // Only include types that match our defined allowed density types
      let shouldInclude = false;
      
      // Check if this type contains any of our allowed density types
      // Use case-insensitive matching
      const lowerDevType = devType.toLowerCase();
      
      for (const lowMidType of allowedLowMidDensityTypes) {
        if (lowerDevType.includes(lowMidType.toLowerCase())) {
          shouldInclude = true;
          break;
        }
      }
      
      if (!shouldInclude) {
        for (const highType of allowedHighDensityTypes) {
          if (lowerDevType.includes(highType.toLowerCase())) {
            shouldInclude = true;
            break;
          }
        }
      }
      
      // Skip this item if it doesn't match our allowed types
      if (!shouldInclude) return acc;
      
      if (!acc[devType]) {
        acc[devType] = {
          name: devType,
          count: 0,
          total: 0
        };
      }
      
      // Only include items with valid cost per m²
      if (curr.costPerM2 && curr.costPerM2 > 0) {
        acc[devType].count++;
        acc[devType].total += curr.costPerM2;
      }
      
      return acc;
    }, {});
    
    // Convert to array and calculate averages
    return Object.values(grouped)
      .filter(group => group.count > 0)  // Only include groups with data
      .map(group => ({
        name: group.name,
        value: Math.round(group.total / group.count),
        count: group.count
      }))
      .sort((a, b) => b.value - a.value);  // Sort by value descending
  };

  const chartData = prepareChartData();

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="w-4 h-4 ml-1" /> : 
      <ChevronDown className="w-4 h-4 ml-1" />;
  };

  // Handle column filter change
  const handleFilterChange = (column, value) => {
    setFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  const FilterInput = ({ column }) => (
    <div className="px-2 py-1">
      <input
        type="text"
        placeholder="Filter..."
        className="w-full text-xs p-1 border rounded"
        value={filters[column] || ''}
        onChange={(e) => handleFilterChange(column, e.target.value)}
      />
    </div>
  );

  // Function to open filter modal for a specific column
  const openFilterModal = (column) => {
    setActiveFilterColumn(column);
    setFilterModalOpen(true);
  };

  // Close filter modal
  const closeFilterModal = () => {
    setFilterModalOpen(false);
    setActiveFilterColumn(null);
  };

  // Check if the column has active filters
  const hasActiveFilter = (column) => {
    if (column === 'developmentType') {
      return selectedTypes.length > 0;
    } else if (['landArea', 'gfa', 'totalCost', 'costPerM2'].includes(column)) {
      return numericFilters[column].value !== '';
    }
    return false;
  };

  // Reset filters for a specific column
  const resetColumnFilter = (column) => {
    if (column === 'developmentType') {
      setSelectedTypes([]);
    } else if (['landArea', 'gfa', 'totalCost', 'costPerM2'].includes(column)) {
      setNumericFilters(prev => ({
        ...prev,
        [column]: { ...prev[column], value: '' }
      }));
    }
  };

  // Get unique development types for dropdown filter
  const getUniqueTypes = () => {
    if (!data) return [];
    const uniqueTypes = [...new Set(data.map(item => item.developmentType))];
    return uniqueTypes.filter(type => type).sort(); // Filter out undefined or null and sort alphabetically
  };

  const uniqueTypes = getUniqueTypes();

  // Handle type selection change
  const handleTypeSelection = (type) => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  // Handle numeric filter change
  const handleNumericFilterChange = (field, property, value) => {
    setNumericFilters(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [property]: value
      }
    }));
  };

  // Filter Modal Component
  const FilterModal = () => {
    if (!filterModalOpen || !activeFilterColumn) return null;

    // Position the modal near the column header
    const positionStyles = {
      position: 'absolute',
      top: '40px',
      left: '20px',
      zIndex: 30,
    };

    return (
      <>
        <div 
          className="fixed inset-0 bg-transparent" 
          onClick={closeFilterModal}
        ></div>
        <div 
          ref={filterModalRef}
          className="bg-white rounded-md shadow-lg border p-4 w-72"
          style={positionStyles}
        >
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium">Filter: {columnLabels[activeFilterColumn] || activeFilterColumn}</h3>
            <button onClick={closeFilterModal} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>

          {activeFilterColumn === 'developmentType' ? (
            <div>
              <select 
                className="w-full text-sm p-2 border rounded mb-2"
                multiple
                size={6}
                value={selectedTypes}
                onChange={(e) => {
                  const options = e.target.options;
                  const selected = [];
                  for (let i = 0; i < options.length; i++) {
                    if (options[i].selected) {
                      selected.push(options[i].value);
                    }
                  }
                  setSelectedTypes(selected);
                }}
              >
                {uniqueTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-gray-500">
                  {selectedTypes.length} selected
                </span>
                {selectedTypes.length > 0 && (
                  <button 
                    className="text-xs text-blue-500"
                    onClick={() => setSelectedTypes([])}
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          ) : ['landArea', 'gfa', 'totalCost', 'costPerM2'].includes(activeFilterColumn) ? (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <select
                  className="text-sm p-2 border rounded"
                  value={numericFilters[activeFilterColumn].operator}
                  onChange={(e) => handleNumericFilterChange(activeFilterColumn, 'operator', e.target.value)}
                >
                  <option value=">">Greater than</option>
                  <option value="<">Less than</option>
                  <option value="=">Equal to</option>
                </select>
                <input
                  type="number"
                  className="flex-1 text-sm p-2 border rounded"
                  placeholder="Value..."
                  value={numericFilters[activeFilterColumn].value}
                  onChange={(e) => handleNumericFilterChange(activeFilterColumn, 'value', e.target.value)}
                />
              </div>
              {numericFilters[activeFilterColumn].value && (
                <button 
                  className="text-xs text-blue-500"
                  onClick={() => resetColumnFilter(activeFilterColumn)}
                >
                  Clear filter
                </button>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No filters available for this column.</div>
          )}

          <div className="flex justify-end mt-4">
            <button 
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
              onClick={closeFilterModal}
            >
              Apply
            </button>
          </div>
        </div>
      </>
    );
  };

  // Enhanced SortableHeader to include filter icon
  const SortableHeader = ({ column, label }) => (
    <th 
      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0 z-20"
    >
      <div className="flex items-center justify-between">
        <div 
          className="flex items-center cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded" 
          onClick={() => handleSort(column)}
        >
          {label}
          <SortIcon column={column} />
        </div>
        
        {(column === 'developmentType' || ['landArea', 'gfa', 'totalCost', 'costPerM2'].includes(column)) && (
          <button 
            className={`p-1 rounded-full hover:bg-gray-200 ${hasActiveFilter(column) ? 'text-blue-500' : 'text-gray-400'}`}
            onClick={(e) => {
              e.stopPropagation();
              openFilterModal(column);
            }}
            title="Filter"
          >
            <Filter size={14} />
          </button>
        )}
      </div>
    </th>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[calc(100vh-120px)] flex flex-col">
        <div className="border-b p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Construction Cost Data Analysis</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600 mt-1">
            <div>
              Based on {stats.count} development applications.
            </div>
          </div>
        </div>

        <div className="p-4 border-b bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Density:</span>
              <select
                className="border border-gray-300 rounded px-2 py-1 text-sm"
                value={selectedDensity}
                onChange={(e) => setSelectedDensity(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="lowMid">Low-Mid Density</option>
                <option value="high">High Density</option>
              </select>
            </div>
            <div className="flex-grow">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-1 border border-gray-300 rounded-md leading-5 text-sm"
                  placeholder="Search all columns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-grow flex flex-col overflow-hidden">
          {/* Data visualization section at the top - Height doubled */}
          <div className="p-4 flex-shrink-0" style={{ height: '420px' }}> {/* Increased height to 420px from 320px */}
            <h3 className="text-lg font-medium mb-4">Median Construction Cost by Development Type</h3>
            <div style={{ height: '356px' }}> {/* Increased chart height to accommodate legend */}
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
                  barCategoryGap={5} // Reduce gap between bar groups to make bars wider
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tickFormatter={formatCurrency} 
                    width={80}
                  />
                  <Tooltip 
                    formatter={(value) => [`${formatCurrency(value)}`, 'Cost per m² GFA']}
                    labelFormatter={(value) => [`${value} (${chartData.find(d => d.name === value)?.count || 0} developments)`]}
                  />
                  {/* All bars are blue and wider */}
                  <Bar 
                    dataKey="value" 
                    radius={[4, 4, 0, 0]}
                    fill="#4c6ef5" // All bars are blue
                    barSize={60} // Make bars wider (was 40)
                  >
                    {/* Add data labels */}
                    <LabelList 
                      dataKey="value" 
                      position="insideTop" 
                      formatter={formatChartLabel}
                      style={{ 
                        fill: 'white', 
                        fontWeight: 'bold',
                        fontSize: '11px',
                        textShadow: '0 0 2px rgba(0,0,0,0.7)'
                      }} 
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Data table section below chart */}
          <div className="flex-grow overflow-auto p-4 relative">
            {/* Add proper sticky header with z-index and box-shadow for visual separation */}
            <table className="min-w-full border divide-y divide-gray-200">
              <thead className="sticky top-0 z-20 bg-gray-50 shadow-sm">
                <tr>
                  <SortableHeader column="address" label="Address" />
                  <SortableHeader column="developmentType" label="Type" />
                  <SortableHeader column="landArea" label="Land Area" />
                  <SortableHeader column="gfa" label="GFA (m²)" />
                  <SortableHeader column="totalCost" label="Cost" />
                  <SortableHeader column="costPerM2" label="Cost $/m² GFA" />
                  <SortableHeader column="fsr" label="FSR" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white text-sm">
                {sortedData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{item.address}</td>
                    <td className="px-4 py-2">
                      {/* Only show the development type in black, no grey subtext */}
                      <div className="font-medium">{item.developmentType}</div>
                    </td>
                    {/* Align table cells with headers */}
                    <td className="px-4 py-2 text-left">{item.landArea === 0 ? 'N/A' : `${Math.round(item.landArea).toLocaleString('en-AU')} m²`}</td>
                    <td className="px-4 py-2 text-left">{item.gfa === 0 ? 'N/A' : `${Math.round(item.gfa).toLocaleString('en-AU')} m²`}</td>
                    <td className="px-4 py-2 text-right">{formatMillions(item.totalCost)}</td>
                    {/* Remove decimals from cost/m2 */}
                    <td className="px-4 py-2 text-left font-medium">
                      {item.costPerM2 === 0 ? 'N/A' : `$${Math.round(item.costPerM2).toLocaleString('en-AU')}/m²`}
                    </td>
                    <td className="px-4 py-2 text-right">{formatFSR(item.gfa, item.landArea)}</td>
                  </tr>
                ))}
                {sortedData.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-4 py-2 text-center text-gray-500">No data available</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-gray-50 font-medium">
                <tr>
                  <td className="px-4 py-2 text-left" colSpan="5">Summary ({sortedData.length} developments)</td>
                  <td className="px-4 py-2 text-left">{formatCurrency(stats.median)}</td>
                  <td className="px-4 py-2"></td>
                </tr>
              </tfoot>
            </table>
            
            {/* Render the filter modal */}
            <FilterModal />
          </div>
        </div>

        {/* Remove the legend section */}
        <div className="p-4 border-t text-xs text-gray-500">
          <details>
            <summary className="cursor-pointer font-medium">Development Type Categories</summary>
            <div className="mt-2">
              <p className="mb-2">Development types are shown in the table and chart, categorized by density type.</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default ConstructionDataModal; 