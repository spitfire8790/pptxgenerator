/**
 * A modal component that displays and analyzes dwelling size data.
 * Provides interactive filtering, sorting, and visualization of development applications.
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Maximize2, ChevronDown, ChevronUp, ArrowUpDown, Search, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Legend } from 'recharts';
import { rpc } from '@gi-nx/iframe-sdk';

/**
 * Formats area values with proper units and locale-specific formatting
 * @param {number} value - The area value in square meters
 * @returns {string} Formatted area string with units
 */
const formatArea = (value) => {
  if (!value && value !== 0) return 'N/A';
  if (value === 0) return 'N/A';
  return `${Math.round(value).toLocaleString('en-AU')} m²`;
};

// Development types that should be excluded from analysis
const EXCLUDED_TYPES = [
  'DEMOLITION',
  'ALTERATIONS',
  'ADDITIONS',
  'POOL',
  'DECK',
  'FENCE',
  'GARAGE',
  'CARPORT',
  'STORAGE',
  'OUTBUILDING',
  'ERECTION'
];

// Development types categorized by density
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

/**
 * Maps development types to standardized categories for consistent analysis
 * @param {string} developmentType - Raw development type from data
 * @returns {string} Standardized development type
 */
const mapToStandardizedType = (developmentType) => {
  if (!developmentType) return 'Other';
  
  // Define mapping of variants to standardized types
  const STANDARDIZED_TYPES = {
    'Dual Occupancy': ['DUAL_OCCUPANCY'],
    'Manor House': ['MANOR_HOUSE'],
    'Multi-dwelling Housing': ['MULTI_DWELLING_HOUSING'],
    'Semi-attached Dwelling': ['SEMI_DETACHED_DWELLING', 'ATTACHED_DWELLING'],
    'Residential Flat Building': ['RESIDENTIAL_FLAT_BUILDING'],
    'Shop Top Housing': ['SHOP_TOP_HOUSING']
  };
  
  const upperType = developmentType.toUpperCase();
  
  // Check if type matches any standardized category
  for (const [standardType, typeVariants] of Object.entries(STANDARDIZED_TYPES)) {
    if (typeVariants.some(variant => upperType.includes(variant))) {
      return standardType;
    }
  }
  
  return developmentType;
};

/**
 * Checks if a development type matches specified density categories
 * @param {string|Array} developmentType - Development type(s) to check
 * @param {Array} densityTypes - Array of density types to match against
 * @returns {boolean} Whether the development type matches any density type
 */
const matchesDensityType = (developmentType, densityTypes) => {
  if (!developmentType) return false;
  
  // Ensure we're working with an array
  const types = Array.isArray(developmentType) ? developmentType : [developmentType];
  
  // Check if any of the development types in the array match our density types
  return types.some(type => {
    // Each type is an object with DevelopmentType property
    const upperType = type.DevelopmentType?.toUpperCase();
    if (!upperType) return false;
    
    // Check if this type matches any of our density types
    return densityTypes.some(densityType => 
      upperType === densityType.toUpperCase()
    );
  });
};

/**
 * Determines if a development type should be included in analysis
 * @param {string} type - Development type to check
 * @returns {boolean} Whether the type should be included
 */
const shouldIncludeType = (type) => {
  if (!type) return false;
  
  const upperType = type.toUpperCase();
  const excludedTypeMatch = EXCLUDED_TYPES.some(excludedType => 
    upperType.includes(excludedType)
  );
  
  return !excludedTypeMatch;
};

/**
 * Main modal component for dwelling size analysis
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {Object} props.constructionData - Raw construction data to analyze
 * @param {Object} props.map - Reference to the map instance for flyTo functionality
 */
const DwellingSizeModal = ({ open = true, onClose, constructionData, map }) => {
  // State management for filtering and sorting
  const [selectedDensity, setSelectedDensity] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'value', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [numericFilters, setNumericFilters] = useState({
    bedrooms: { operator: '>', value: '' },
    value: { operator: '>', value: '' }
  });
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);
  const filterModalRef = useRef(null);

  // Column labels for the data table
  const columnLabels = {
    address: "Address",
    developmentType: "Development Type",
    dwellings: "Dwellings",
    value: "Total GFA (m²)",
    gfaPerDwelling: "GFA per Dwelling (m²)"
  };

  if (!open || !constructionData) return null;

  /**
   * Handles sorting of data when a column header is clicked
   * @param {string} key - Column key to sort by
   */
  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  /**
   * Formats development type for display
   * @param {string} type - Raw development type
   * @returns {string} Formatted development type
   */
  const formatDevelopmentType = (type) => {
    if (!type) return 'Unknown';
    return mapToStandardizedType(type);
  };

  /**
   * Applies all active filters to the dataset
   * @param {Array} data - Raw data to filter
   * @returns {Array} Filtered data
   */
  const applyFilters = (data) => {
    if (!data) return [];
    
    // Apply text search filter
    let filteredData = searchTerm 
      ? data.filter(item => 
          Object.values(item).some(value => 
            value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
          )
        )
      : data;
    
    // Apply development type filters
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
                return Math.abs(itemValue - numericValue) < 0.01;
              default:
                return true;
            }
          });
        }
      }
    });
    
    return filteredData;
  };

  /**
   * Prepares raw construction data for display and analysis
   * @returns {Array} Processed data ready for display
   */
  const prepareData = () => {
    let data = [];
    
    if (constructionData.dwellingSizesByBedroomRaw) {
      console.log('Raw construction data:', constructionData.dwellingSizesByBedroomRaw);
      
      // Filter out excluded development types
      const filteredData = constructionData.dwellingSizesByBedroomRaw.filter(item => {
        if (!shouldIncludeType(item.developmentType)) return false;
        
        // Apply density filter if selected
        if (selectedDensity === 'all') return true;
        if (selectedDensity === 'medium') return matchesDensityType(item.DevelopmentType, MEDIUM_DENSITY_TYPES);
        if (selectedDensity === 'high') return matchesDensityType(item.DevelopmentType, HIGH_DENSITY_TYPES);
        return false;
      });

      console.log('Filtered data:', filteredData);
      
      // Transform raw data into display format
      const mappedData = filteredData.map(item => {
        console.log('Processing item:', item);
        console.log('Location data:', item.Location);
        
        const gfa = item.gfa || 0;
        
        // Get development type
        const devType = Array.isArray(item.DevelopmentType) && item.DevelopmentType.length > 0
          ? item.DevelopmentType[0].DevelopmentType
          : item.developmentType;
        
        // Set units to 2 for Dual occupancy, otherwise use provided units or default to 1
        const isDualOccupancy = devType?.toLowerCase().includes('dual occupancy');
        const units = isDualOccupancy ? 2 : (item.units || 1);
        
        const gfaPerDwelling = units > 0 ? Math.round(gfa / units) : gfa;

        // Extract coordinates from Location array
        let coordinates = null;
        if (item.Location && Array.isArray(item.Location) && item.Location.length > 0) {
          const location = item.Location[0];
          if (location && location.X && location.Y) {
            coordinates = {
              x: parseFloat(location.X),  // Longitude
              y: parseFloat(location.Y)   // Latitude
            };
          }
        }
        
        const result = {
          id: item.id,
          developmentType: formatDevelopmentType(devType),
          bedrooms: item.bedrooms,
          dwellings: units,
          value: gfa,
          gfaPerDwelling: gfaPerDwelling,
          lga: item.lga,
          address: item.address || (Array.isArray(item.Location) && item.Location[0]?.FullAddress) || 'Unknown',
          coordinates
        };

        console.log('Mapped item:', result);
        return result;
      }).filter(item => {
        // Remove invalid entries
        return item.value > 0 && item.gfaPerDwelling > 0 && item.gfaPerDwelling <= 1000;
      });
      
      // Deduplicate by address, keeping entry with highest GFA
      const addressMap = new Map();
      mappedData.forEach(item => {
        if (!addressMap.has(item.address) || addressMap.get(item.address).value < item.value) {
          addressMap.set(item.address, item);
        }
      });
      
      data = Array.from(addressMap.values());
    }
    
    return data;
  };

  // Process and filter data
  const data = prepareData();
  const filteredData = applyFilters(data);
  
  // Sort filtered data
  const sortedData = [...filteredData].sort((a, b) => {
    const aValue = a[sortConfig.key] || 0;
    const bValue = b[sortConfig.key] || 0;
    
    if (aValue === bValue) return 0;
    const comparison = aValue < bValue ? -1 : 1;
    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  /**
   * Calculates statistical measures for numeric data
   * @param {Array} data - Data to analyze
   * @param {string} valueField - Field to calculate stats for
   * @returns {Object} Statistical measures
   */
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

  // Calculate statistics for the filtered dataset
  const stats = calculateStats(filteredData, 'value');
  
  /**
   * Prepares data for the bar chart visualization
   * @returns {Array} Processed data for the chart
   */
  const prepareChartData = () => {
    // Group data by development type
    const grouped = filteredData.reduce((acc, curr) => {
      if (!curr.developmentType) return acc;
      if (!shouldIncludeType(curr.developmentType)) return acc;
      
      const key = curr.developmentType;
      if (!acc[key]) {
        acc[key] = {
          developmentType: curr.developmentType,
          dwellingSizes: [],
          count: 0
        };
      }
      
      if (curr.gfaPerDwelling && !isNaN(curr.gfaPerDwelling)) {
        acc[key].dwellingSizes.push(curr.gfaPerDwelling);
        acc[key].count++;
      }
      
      return acc;
    }, {});
    
    // Calculate median dwelling size for each type
    return Object.values(grouped)
      .filter(group => group.count > 0)
      .map(group => {
        const sortedSizes = [...group.dwellingSizes].sort((a, b) => a - b);
        const middle = Math.floor(sortedSizes.length / 2);
        let medianSize;
        
        if (sortedSizes.length % 2 === 0) {
          medianSize = Math.round((sortedSizes[middle - 1] + sortedSizes[middle]) / 2);
        } else {
          medianSize = Math.round(sortedSizes[middle]);
        }
        
        return {
          name: group.developmentType,
          value: medianSize,
          count: group.count
        };
      })
      .sort((a, b) => b.value - a.value);
  };

  const chartData = prepareChartData();

  // UI Components for sorting and filtering
  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="w-4 h-4 ml-1" /> : 
      <ChevronDown className="w-4 h-4 ml-1" />;
  };

  const handleFilterChange = (column, value) => {
    setFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  // Filter modal management
  const openFilterModal = (column) => {
    setActiveFilterColumn(column);
    setFilterModalOpen(true);
  };

  const closeFilterModal = () => {
    setFilterModalOpen(false);
    setActiveFilterColumn(null);
  };

  const hasActiveFilter = (column) => {
    if (column === 'developmentType') {
      return selectedTypes.length > 0;
    } else if (['bedrooms', 'value'].includes(column)) {
      return numericFilters[column].value !== '';
    }
    return false;
  };

  const resetColumnFilter = (column) => {
    if (column === 'developmentType') {
      setSelectedTypes([]);
    } else if (['bedrooms', 'value'].includes(column)) {
      setNumericFilters(prev => ({
        ...prev,
        [column]: { ...prev[column], value: '' }
      }));
    }
  };

  // Get unique development types for filtering
  const getUniqueTypes = () => {
    if (!data) return [];
    const uniqueTypes = [...new Set(data.map(item => item.developmentType))];
    return uniqueTypes.filter(type => type).sort();
  };

  const uniqueTypes = getUniqueTypes();

  const handleNumericFilterChange = (field, property, value) => {
    setNumericFilters(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [property]: value
      }
    }));
  };

  // Filter modal component
  const FilterModal = () => {
    if (!filterModalOpen || !activeFilterColumn) return null;

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
          ) : ['bedrooms', 'value'].includes(activeFilterColumn) ? (
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

  // Table header component with sorting and filtering
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
        
        {(column === 'developmentType' || ['bedrooms', 'value'].includes(column)) && (
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

  /**
   * Handles clicking on a table row to fly to its location
   * @param {Object} item - The row data including coordinates
   */
  const handleRowClick = (item) => {
    console.log('Clicked item:', item);
    
    if (!item.coordinates) {
      console.warn('No coordinates available for this item:', item);
      return;
    }
    
    console.log('Flying to coordinates:', item.coordinates);
    
    try {
      // Note: x is longitude, y is latitude
      // Mapbox expects coordinates as [longitude, latitude]
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

  // Main modal render
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[calc(100vh-120px)] flex flex-col">
        {/* Modal header */}
        <div className="border-b p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Dwelling Size Data Analysis</h2>
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

        {/* Filter controls */}
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

        {/* Chart and table container */}
        <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 230px)' }}>
          {/* Bar chart section */}
          <div className="pb-0 px-4 pt-4" style={{ height: '500px', marginBottom: '-1px' }}>
            <h3 className="text-lg font-medium mb-2">Median GFA per Dwelling by Development Type</h3>
            <div style={{ height: '550px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 120 }}
                  barCategoryGap={20}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={120}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${value.toLocaleString('en-AU')} m²`} 
                    width={80}
                  />
                  <Tooltip 
                    formatter={(value) => [`${formatArea(value)}`, 'Median Dwelling Size']}
                    labelFormatter={(value) => [`${value} (${chartData.find(d => d.name === value)?.count || 0} developments)`]}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#4c6ef5"
                    radius={[4, 4, 0, 0]}
                    barSize={60}
                  >
                    <LabelList 
                      dataKey="value" 
                      position="insideTop" 
                      formatter={(value) => `${value.toLocaleString('en-AU')} m²`}
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

          {/* Data table section */}
          <div className="flex-1 overflow-auto p-0 border-t" style={{ marginTop: 0 }}>
            <table className="min-w-full border-collapse divide-y divide-gray-200">
              <thead className="sticky top-0 z-20 bg-gray-50 shadow-sm">
                <tr>
                  <SortableHeader column="address" label="Address" />
                  <SortableHeader column="developmentType" label="Development Type" />
                  <SortableHeader column="dwellings" label="Dwellings" />
                  <SortableHeader column="value" label="GFA (m²)" />
                  <SortableHeader column="gfaPerDwelling" label="GFA per Dwelling" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white text-sm">
                {sortedData.map((item) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-gray-50 cursor-pointer" 
                    onClick={() => handleRowClick(item)}
                  >
                    <td className="px-4 py-2">{item.address}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{item.developmentType}</div>
                    </td>
                    <td className="px-4 py-2 text-center">{item.dwellings}</td>
                    <td className="px-4 py-2 font-medium">{formatArea(item.value)}</td>
                    <td className="px-4 py-2 font-medium">{formatArea(item.gfaPerDwelling)}</td>
                  </tr>
                ))}
                {sortedData.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-4 py-2 text-center text-gray-500">No data available</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-gray-50 font-medium">
                <tr>
                  <td className="px-4 py-2 text-left" colSpan="3">Summary ({sortedData.length} developments)</td>
                  <td className="px-4 py-2 text-left">{formatArea(stats.median)}</td>
                  <td className="px-4 py-2 text-left"></td>
                </tr>
              </tfoot>
            </table>
            
            <FilterModal />
          </div>
        </div>

        {/* Footer with additional information */}
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

export default DwellingSizeModal; 