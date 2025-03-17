import React, { useState, useEffect, useRef } from 'react';
import { X, HardHat, ChevronDown, ChevronUp, ArrowUpDown, Search, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Legend } from 'recharts';
import { rpc } from '@gi-nx/iframe-sdk';

const formatCurrency = (value) => {
  if (!value && value !== 0) return 'N/A';
  return `$${Math.round(value).toLocaleString('en-AU')}`;
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
  'Multi-dwelling housing': ['Multi-dwelling housing'],
  'Multi-dwelling housing (terraces)': ['Multi-dwelling housing (terraces)'],
  'Manor house': ['Manor house'],
  'Medium Density Housing': ['Medium Density Housing'],
  'Manor houses': ['Manor houses'],
  'Residential flat building': ['Residential flat building'],
  'Shop top housing': ['Shop top housing'],
  'Build-to-rent': ['Build-to-rent']
};

// Types to exclude from chart and data
const EXCLUDED_TYPES = [
  'DEMOLITION',
  'ALTERATIONS',
  'ADDITIONS',
  'DWELLING',
  'DWELLING_HOUSE',
  'DUAL_OCCUPANCY',
  'DUAL_OCCUPANCY_ATTACHED',
  'DUAL_OCCUPANCY_DETACHED',
  'SEMI_DETACHED_DWELLING',
  'SEMI_ATTACHED_DWELLING'
];

// Group development types by density category
const MEDIUM_DENSITY_TYPES = [
  'Multi-dwelling housing',
  'Multi-dwelling housing (terraces)',
  'Manor house',
  'Medium Density Housing',
  'Manor houses'
];

const HIGH_DENSITY_TYPES = [
  'Residential flat building',
  'Shop top housing',
  'Build-to-rent'
];

// Helper function to map any development type to a standardized category
const mapToStandardizedType = (developmentType) => {
  if (!developmentType) return 'Other';
  
  // Check if it's a valid medium or high density type
  if (MEDIUM_DENSITY_TYPES.includes(developmentType) || HIGH_DENSITY_TYPES.includes(developmentType)) {
    return developmentType;
  }
  
  return 'Other';
};

// Function to determine if a development type should be included
const shouldIncludeType = (type) => {
  if (!type) return false;
  
  // Only include if it's in our allowed types
  return [...MEDIUM_DENSITY_TYPES, ...HIGH_DENSITY_TYPES].includes(type);
};

// Determine density category for a given development type
const getDensityCategory = (developmentType) => {
  if (!developmentType) return 'unknown';
  
  // Do exact matching, no case conversion
  if (MEDIUM_DENSITY_TYPES.includes(developmentType)) {
    return 'medium';
  } 
  
  if (HIGH_DENSITY_TYPES.includes(developmentType)) {
    return 'high';
  }
  
  return 'unknown';
};

// Updated colors to match the requested blue and orange
const DENSITY_COLORS = {
  medium: '#4c6ef5', // Blue
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
    
    // Check if API request had an error first
    if (constructionData && constructionData.error) {
      console.error('Construction data API error:', constructionData.error);
      return [];
    }
    
    // Use the preprocessed constructionCostsRaw array which already has all the needed fields
    if (constructionData && Array.isArray(constructionData.constructionCostsRaw)) {
      console.log('Construction data found:', constructionData.constructionCostsRaw.length);
      
      const filteredData = constructionData.constructionCostsRaw.filter(item => {
        if (!item || !item.developmentType) return false;
        
        // Filter by density if selected
        const densityFilter = selectedDensity === 'all' ? true :
          selectedDensity === 'medium' ? MEDIUM_DENSITY_TYPES.includes(item.developmentType) :
          selectedDensity === 'high' ? HIGH_DENSITY_TYPES.includes(item.developmentType) :
          false;
          
        return densityFilter && shouldIncludeType(item.developmentType);
      });
      
      // Process the data to remove duplicates by address
      // Track processed addresses to avoid duplicates
      const processedAddresses = new Set();
      
      data = filteredData
        .map(item => {
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
            fsr: fsr,
            coordinates: item.coordinates
          };
        })
        // Remove duplicate addresses, keeping only the first occurrence
        .filter(item => {
          if (!item.address || item.address === 'Unknown') return true;
          
          // Normalize address to handle small formatting differences
          const normalizedAddress = item.address.toLowerCase().trim();
          
          if (processedAddresses.has(normalizedAddress)) {
            return false; // Skip this duplicate
          } else {
            processedAddresses.add(normalizedAddress);
            return true;
          }
        });
        
      console.log(`Removed ${filteredData.length - data.length} duplicate addresses, ${data.length} unique entries remain`);
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
    if (!data || data.length === 0) return { min: 0, max: 0, mean: 0, median: 0, stdDev: 0, count: 0 };
    
    const values = data.map(item => item[valueField] || 0).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    
    // Calculate standard deviation
    const squaredDiffs = values.map(value => {
      const diff = value - mean;
      return diff * diff;
    });
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
    const stdDev = Math.sqrt(avgSquaredDiff);
    
    return {
      min: values[0],
      max: values[values.length - 1],
      mean: Math.round(mean),
      median: values[Math.floor(values.length / 2)],
      stdDev: Math.round(stdDev),
      count: values.length
    };
  };
  
  // Calculate statistics for each development type
  const calculateDevelopmentTypeStats = () => {
    const statsByType = {};
    
    data.forEach(item => {
      if (!item.developmentType) return;
      
      if (!statsByType[item.developmentType]) {
        statsByType[item.developmentType] = {
          values: [],
          count: 0
        };
      }
      
      if (item.costPerM2 && item.costPerM2 > 0) {
        statsByType[item.developmentType].values.push(item.costPerM2);
        statsByType[item.developmentType].count++;
      }
    });
    
    // Calculate statistics for each development type
    Object.keys(statsByType).forEach(type => {
      const values = statsByType[type].values.sort((a, b) => a - b);
      
      if (values.length === 0) {
        statsByType[type].stats = { min: 0, max: 0, mean: 0, median: 0, stdDev: 0 };
        return;
      }
      
      const sum = values.reduce((a, b) => a + b, 0);
      const mean = sum / values.length;
      
      // Calculate standard deviation
      const squaredDiffs = values.map(value => {
        const diff = value - mean;
        return diff * diff;
      });
      const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
      const stdDev = Math.sqrt(avgSquaredDiff);
      
      statsByType[type].stats = {
        min: values[0],
        max: values[values.length - 1],
        mean: Math.round(mean),
        median: values[Math.floor(values.length / 2)],
        stdDev: Math.round(stdDev)
      };
    });
    
    return statsByType;
  };

  const stats = calculateStats(filteredData, 'costPerM2');
  
  // Group data for chart visualization by original Development Type
  const prepareChartData = () => {
    if (data.length === 0) return [];
    
    // Group by development type
    const grouped = data.reduce((acc, curr) => {
      if (!curr.developmentType || !shouldIncludeType(curr.developmentType)) return acc;
      
      if (!acc[curr.developmentType]) {
        acc[curr.developmentType] = [];
      }
      
      // Only include items with valid cost per m² and GFA
      if (curr.costPerM2 && curr.costPerM2 > 0 && curr.gfa && curr.gfa > 0) {
        acc[curr.developmentType].push({
          cost: curr.costPerM2,
          gfa: curr.gfa
        });
      }
      
      return acc;
    }, {});
    
    // Get development type statistics for the chart tooltip
    const typeStats = calculateDevelopmentTypeStats();
    
    // Calculate weighted median for each group
    return Object.entries(grouped)
      .filter(([_, items]) => items.length > 0)
      .map(([type, items]) => {
        // Get the statistics for this development type
        const stats = typeStats[type]?.stats || {
          min: 0,
          max: 0,
          mean: 0,
          median: 0,
          stdDev: 0
        };
        
        // Use the statistics median for consistency between tooltip and bar chart
        const medianCost = stats.median;
        
        return {
          name: type,
          // Use the calculated median from stats for consistency
          value: medianCost,
          count: items.length,
          totalGFA: items.reduce((sum, { gfa }) => sum + gfa, 0),
          // Add statistics for this development type
          stats: stats
        };
      })
      .sort((a, b) => b.value - a.value);  // Sort by median cost descending
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

  // Add handleRowClick function
  const handleRowClick = (item) => {
    console.log('Clicked item:', item);
    
    if (!item.coordinates) {
      console.warn('No coordinates available for this item:', item);
      return;
    }
    
    console.log('Flying to coordinates:', item.coordinates);
    
    try {
      rpc.invoke('flyTo', {
        center: [item.coordinates.x, item.coordinates.y],
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[calc(100vh-120px)] flex flex-col">
        <div className="border-b p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Construction Cost Data Analysis</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          {constructionData.error ? (
            <div className="text-red-500 mt-1">
              Error: {constructionData.error}
            </div>
          ) : (
            <div className="flex items-center justify-between text-sm text-gray-600 mt-1">
              <div>
                Based on {stats.count} development applications.
              </div>
            </div>
          )}
        </div>

        {constructionData.error ? (
          <div className="flex-grow flex flex-col items-center justify-center p-8">
            <HardHat className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-700 mb-2">Unable to load construction data</h3>
            <p className="text-gray-500 mb-6 text-center max-w-2xl">
              There was an error fetching construction data from the ePlanning API. 
              This usually happens when the API is temporarily unavailable or the selected area 
              doesn't have enough construction certificates data.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
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
                    <option value="medium">Medium Density</option>
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
              <div className="p-4 flex-shrink-0" style={{ height: '470px' }}> {/* Increased height to 420px from 320px */}
                <h3 className="text-lg font-medium mb-4">Median Construction Cost by Development Type</h3>
                <div style={{ height: '450px' }}> {/* Increased chart height to accommodate legend */}
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
                      barCategoryGap="0%" // Set to 0% to remove gap between categories
                      barGap={8} // Set fixed gap between bars in pixels
                      maxBarSize={120} // Set maximum bar width
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
                      {/* Custom tooltip component that shows statistics for each development type */}
                      <Tooltip content={(props) => {
                        const { active, payload, label } = props;
                        
                        if (!active || !payload || !payload.length) {
                          return null;
                        }
                        
                        const data = payload[0].payload;
                        const stats = data.stats;
                        
                        // Calculate positions for visualization
                        const min = stats.min;
                        const max = stats.max;
                        const median = stats.median;
                        const stdDev = stats.stdDev;
                        
                        // Calculate the standard deviation range values
                        const lowerBound = Math.max(min, median - stdDev);
                        const upperBound = Math.min(max, median + stdDev);
                        
                        // Range for visualization
                        const range = max - min;
                        const vizWidth = 250; // Width of visualization in px - reduced to fit
                        
                        // Calculate pixel positions (0 to vizWidth)
                        const getPosition = (value) => {
                          return range === 0 ? vizWidth / 2 : ((value - min) / range) * vizWidth;
                        };
                        
                        const medianPos = getPosition(median);
                        const minStdDevPos = getPosition(lowerBound);
                        const maxStdDevPos = getPosition(upperBound);
                        
                        return (
                          <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 text-sm" style={{ width: '350px', maxWidth: '90vw' }}>
                            <div className="font-semibold text-center mb-2 pb-1 border-b">
                              {label} ({data.count} developments)
                            </div>
                            
                            {/* Statistical Visualization */}
                            <div className="mb-5 mt-3">
                              <div className="relative h-24">
                                {/* Min-Max Line */}
                                <div 
                                  className="absolute h-0.5 bg-gray-300" 
                                  style={{ 
                                    left: '0px',
                                    width: `${vizWidth}px`,
                                    top: '28px'
                                  }}
                                ></div>
                                
                                {/* Standard Deviation Range */}
                                <div 
                                  className="absolute h-4 bg-blue-100 rounded-sm" 
                                  style={{ 
                                    left: `${minStdDevPos}px`,
                                    width: `${maxStdDevPos - minStdDevPos}px`,
                                    top: '24px'
                                  }}
                                ></div>
                                
                                {/* Min Marker */}
                                <div className="absolute" style={{ left: '0px', top: '8px' }}>
                                  <div className="h-12 w-0.5 bg-gray-400"></div>
                                  <div className="absolute -left-1 top-0 w-2 h-2 bg-gray-600 rounded-full"></div>
                                  <div className="absolute -left-8 top-16 w-16 text-center text-xs text-gray-600">Min</div>
                                  <div className="absolute -left-12 top-22 w-24 text-center text-xs font-medium">
                                    {formatCurrency(min)}
                                  </div>
                                </div>
                                
                                {/* Median Marker */}
                                <div className="absolute" style={{ left: `${medianPos}px`, top: '8px' }}>
                                  <div className="h-12 w-0.5 bg-blue-500"></div>
                                  <div className="absolute -left-1 top-0 w-2 h-2 bg-blue-600 rounded-full"></div>
                                  <div className="absolute -left-8 top-16 w-16 text-center text-xs text-gray-600">Median</div>
                                  <div className="absolute -left-12 top-22 w-24 text-center text-xs font-medium">
                                    {formatCurrency(median)}
                                  </div>
                                </div>
                                
                                {/* Max Marker */}
                                <div className="absolute" style={{ left: `${vizWidth}px`, top: '8px' }}>
                                  <div className="h-12 w-0.5 bg-gray-400"></div>
                                  <div className="absolute -left-1 top-0 w-2 h-2 bg-gray-600 rounded-full"></div>
                                  <div className="absolute -left-8 top-16 w-16 text-center text-xs text-gray-600">Max</div>
                                  <div className="absolute -left-12 top-22 w-24 text-center text-xs font-medium">
                                    {formatCurrency(max)}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Std Deviation Range */}
                              <div className="mt-12 flex justify-center">
                                <div className="flex items-center">
                                  <div className="w-3 h-3 bg-blue-100 rounded-sm mr-1"></div>
                                  <span className="text-xs text-gray-600">
                                    68% of values between {formatCurrency(lowerBound)} and {formatCurrency(upperBound)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }} />
                      <Bar 
                        dataKey="value" 
                        radius={[4, 4, 0, 0]}
                        fill="#4c6ef5"
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
                      <tr key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleRowClick(item)}>
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
          </>
        )}
      </div>
    </div>
  );
};

export default ConstructionDataModal;
