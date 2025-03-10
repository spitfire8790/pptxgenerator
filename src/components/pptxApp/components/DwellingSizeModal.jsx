import React, { useState, useEffect, useRef } from 'react';
import { X, Maximize2, ChevronDown, ChevronUp, ArrowUpDown, Search, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Legend } from 'recharts';

const formatArea = (value) => {
  if (!value && value !== 0) return 'N/A';
  if (value === 0) return 'N/A';
  return `${Math.round(value).toLocaleString('en-AU')} m²`;
};

// Types to exclude from chart and data
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

// Constants for density types
const LOW_MID_DENSITY_TYPES = ['DUAL_OCCUPANCY', 'MANOR_HOUSE', 'MULTI_DWELLING_HOUSING', 'SEMI_DETACHED_DWELLING', 'ATTACHED_DWELLING'];
const HIGH_DENSITY_TYPES = ['RESIDENTIAL_FLAT_BUILDING', 'SHOP_TOP_HOUSING'];

// Helper function to map development types to standardized categories
const mapToStandardizedType = (developmentType) => {
  if (!developmentType) return 'Other';
  
  // Standardized types mapping
  const STANDARDIZED_TYPES = {
    'Dual Occupancy': ['DUAL_OCCUPANCY'],
    'Manor House': ['MANOR_HOUSE'],
    'Multi-dwelling Housing': ['MULTI_DWELLING_HOUSING'],
    'Semi-attached Dwelling': ['SEMI_DETACHED_DWELLING', 'ATTACHED_DWELLING'],
    'Residential Flat Building': ['RESIDENTIAL_FLAT_BUILDING'],
    'Shop Top Housing': ['SHOP_TOP_HOUSING']
  };
  
  // Convert to uppercase for consistent comparison
  const upperType = developmentType.toUpperCase();
  
  // Check if type matches any of our standardized categories
  for (const [standardType, typeVariants] of Object.entries(STANDARDIZED_TYPES)) {
    if (typeVariants.some(variant => upperType.includes(variant))) {
      return standardType;
    }
  }
  
  return developmentType;
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

// Function to determine if a development type should be included
const shouldIncludeType = (type) => {
  if (!type) return false;
  
  // Check if it contains excluded terms
  const upperType = type.toUpperCase();
  const excludedTypeMatch = EXCLUDED_TYPES.some(excludedType => 
    upperType.includes(excludedType)
  );
  
  // Include if it's not excluded
  return !excludedTypeMatch;
};

const DwellingSizeModal = ({ open = true, onClose, constructionData }) => {
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

  const columnLabels = {
    address: "Address",
    developmentType: "Development Type",
    dwellings: "Dwellings",
    value: "GFA (m²)",
    gfaPerDwelling: "GFA per Dwelling"
  };

  if (!open || !constructionData) return null;

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const formatDevelopmentType = (type) => {
    if (!type) return 'Unknown';
    
    return mapToStandardizedType(type);
  };

  const applyFilters = (data) => {
    if (!data) return [];
    
    let filteredData = searchTerm 
      ? data.filter(item => 
          Object.values(item).some(value => 
            value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
          )
        )
      : data;
    
    if (selectedTypes.length > 0) {
      filteredData = filteredData.filter(item => 
        selectedTypes.includes(item.developmentType)
      );
    }
    
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

  const prepareData = () => {
    let data = [];
    
    // Extract dwelling size data from constructionData
    if (constructionData.dwellingSizesByBedroomRaw) {
      const filteredData = constructionData.dwellingSizesByBedroomRaw.filter(item => {
        // Skip types like pools, decks, etc.
        if (!shouldIncludeType(item.developmentType)) return false;
        
        if (selectedDensity === 'all') return true;
        if (selectedDensity === 'lowMid') return LOW_MID_DENSITY_TYPES.includes(item.developmentType);
        if (selectedDensity === 'high') return HIGH_DENSITY_TYPES.includes(item.developmentType);
        return false;
      });
      
      // Map the data with calculated fields
      const mappedData = filteredData.map(item => {
        // Calculate GFA per dwelling
        const units = item.units || 1;
        const gfaPerDwelling = units > 0 ? Math.round(item.dwellingSize * units) / units : item.dwellingSize;
        
        return {
          id: item.id,
          developmentType: formatDevelopmentType(item.developmentType),
          bedrooms: item.bedrooms,
          dwellings: units,
          value: item.dwellingSize,
          gfaPerDwelling: gfaPerDwelling,
          lga: item.lga,
          address: item.address
        };
      }).filter(item => {
        // Filter out entries with GFA per dwelling above 1,000 m²
        return item.gfaPerDwelling <= 1000;
      });
      
      // Remove duplicates by address
      const addressMap = new Map();
      mappedData.forEach(item => {
        // If there are multiple entries for the same address, keep the one with the highest GFA
        if (!addressMap.has(item.address) || addressMap.get(item.address).value < item.value) {
          addressMap.set(item.address, item);
        }
      });
      
      // Convert back to array
      data = Array.from(addressMap.values());
    }
    
    return data;
  };

  const data = prepareData();
  
  const filteredData = applyFilters(data);
  
  const sortedData = [...filteredData].sort((a, b) => {
    const aValue = a[sortConfig.key] || 0;
    const bValue = b[sortConfig.key] || 0;
    
    if (aValue === bValue) return 0;
    const comparison = aValue < bValue ? -1 : 1;
    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

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

  const stats = calculateStats(filteredData, 'value');
  
  const prepareChartData = () => {
    // Group by development type
    const grouped = filteredData.reduce((acc, curr) => {
      if (!curr.developmentType) return acc;
      
      // Skip types that should be excluded
      if (!shouldIncludeType(curr.developmentType)) return acc;
      
      const key = curr.developmentType;
      if (!acc[key]) {
        acc[key] = {
          developmentType: curr.developmentType,
          dwellingSizes: [],
          count: 0
        };
      }
      
      // Only include items with valid dwelling size
      if (curr.value && !isNaN(curr.value)) {
        acc[key].dwellingSizes.push(curr.value);
        acc[key].count++;
      }
      
      return acc;
    }, {});
    
    // Calculate median dwelling size for each development type
    return Object.values(grouped)
      .filter(group => group.count > 0)  // Only include groups with data
      .map(group => {
        const sortedSizes = [...group.dwellingSizes].sort((a, b) => a - b);
        const middle = Math.floor(sortedSizes.length / 2);
        let medianSize;
        
        if (sortedSizes.length % 2 === 0) {
          // If even number of elements, average the middle two
          medianSize = Math.round((sortedSizes[middle - 1] + sortedSizes[middle]) / 2);
        } else {
          // If odd number of elements, take the middle one
          medianSize = Math.round(sortedSizes[middle]);
        }
        
        return {
          name: group.developmentType,
          value: medianSize,
          count: group.count
        };
      })
      .sort((a, b) => b.value - a.value);  // Sort by median size descending
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

  const getUniqueTypes = () => {
    if (!data) return [];
    const uniqueTypes = [...new Set(data.map(item => item.developmentType))];
    return uniqueTypes.filter(type => type).sort();
  };

  const uniqueTypes = getUniqueTypes();

  const handleTypeSelection = (type) => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const handleNumericFilterChange = (field, property, value) => {
    setNumericFilters(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [property]: value
      }
    }));
  };

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[calc(100vh-120px)] flex flex-col">
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
            <div>
              Median Dwelling Size: {formatArea(stats.median)}
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

        <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 230px)' }}>
          {/* Chart section with NO bottom margin/padding */}
          <div className="pb-0 px-4 pt-4" style={{ height: '500px', marginBottom: '-1px' }}>
            <h3 className="text-lg font-medium mb-2">Median Dwelling Size by Development Type</h3>
            <div style={{ height: '450px' }}>
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

          {/* Table section butted directly against chart with NO top margins/padding */}
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
                  <tr key={item.id} className="hover:bg-gray-50">
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