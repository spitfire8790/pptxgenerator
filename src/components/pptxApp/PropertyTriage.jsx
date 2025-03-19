import React, { useState, useEffect, useRef } from 'react';
import { PieChart, ChevronDown, ChevronRight, Plus, Settings, ChevronUp, BarChart3, ChevronLeft, RotateCcw, X, Edit2, Save, Trash2, FileText, Filter, ArrowUp, ArrowDown, MapPin } from "lucide-react";
import { giraffeState, giraffe, rpc } from '@gi-nx/iframe-sdk';
import { checkUserClaims } from './utils/auth/tokenUtils';

// Zone colors mapping from permissibilitySlide.js
const landZoningColors = {
  '2(a)': 'FFA6A3',
  'A': 'FC776E',
  'AGB': 'FAE8C5',
  'B': '63F0F5',
  'B1': 'C9FFF9',
  'B2': '62F0F5',
  'B3': '00C2ED',
  'B4': '959DC2',
  'B5': '7DA0AB',
  'B6': '95BFCC',
  'B7': 'BAD6DE',
  'C': 'BAD6DE',
  'C1': 'E69900',
  'C2': 'F0AE3C',
  'C3': 'F7C568',
  'C4': 'FFDA96',
  'D': '959DC2',
  'DR': 'FFFF70',
  'E': '00C2ED',
  'E1': '62F0F5',
  'E2': 'B4C6E7',
  'E3': '8EA9DB',
  'E4': '9999FF',
  'E5': '9966FF',
  'EM': '95BFCC',
  'ENP': 'FFD640',
  'ENT': '76C0D6',
  'ENZ': '73B273',
  'EP': 'FCF9B6',
  'F': 'FFFFA1',
  'G': 'FFFF70',
  'H': '55FF00',
  'I': 'D3FFBF',
  'IN1': 'DDB8F5',
  'IN2': 'F3DBFF',
  'IN3': 'C595E8',
  'MAP': 'E6FFFF',
  'MU': '959DC2',
  'MU1': '959DC2',
  'P': 'B3CCFC',
  'PAE': 'F4EC49',
  'PEP': '74B374',
  'PRC': '549980',
  'R': 'B3FCB3',
  'R1': 'FFCFFF',
  'R2': 'FFA6A3',
  'R3': 'FF776E',
  'R4': 'FF483B',
  'R5': 'FFD9D9',
  'RAC': 'E6CB97',
  'RAZ': 'E6CB97',
  'RE1': '55FF00',
  'RE2': 'D3FFBE',
  'REC': 'AEF2B3',
  'REZ': 'DEB8F5',
  'RO': '55FF00',
  'RP': 'D3FFBE',
  'RU1': 'EDD8AD',
  'RU2': 'E6CA97',
  'RU3': 'DEC083',
  'RU4': 'D6BC6F',
  'RU5': 'D6A19C',
  'RU6': 'C79E4C',
  'RUR': 'EFE4BE',
  'RW': 'D3B8F5',
  'SET': 'FFD2DC',
  'SP1': 'FFFFA1',
  'SP2': 'FFFF70',
  'SP3': 'FFFF00',
  'SP4': 'FFFF00',
  'SP5': 'E6E600',
  'SPU': 'FFFF00',
  'T': 'FCD2EF',
  'U': 'CAFCED',
  'UD': 'FF7F63',
  'UL': 'FFFFFF',
  'UR': 'FF776E',
  'W': 'FCC4B8',
  'W1': 'D9FFF2',
  'W2': '99FFDD',
  'W3': '33FFBB',
  'W4': '00E6A9',
  'WFU': '1182C2'
};

const PropertyTriage = ({ onClose, properties = [] }) => {
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [sortField, setSortField] = useState('number');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filterCriteria, setFilterCriteria] = useState({
    minSize: 0,
    maxSize: 1000000,
    zoning: [],
    minScore: 0
  });
  
  // Triage scoring settings
  const [showScoringSettings, setShowScoringSettings] = useState(false);
  const [valueScoring, setValueScoring] = useState({
    thresholdLow: 10000000, // $10M
    thresholdHigh: 50000000, // $50M
  });
  const [housingScoring, setHousingScoring] = useState({
    highPriorityZones: ['R1', 'R2', 'R3', 'R4', 'E1', 'B4', 'MU1', 'RU5'],
    thresholdHigh: 5000, // sqm
    thresholdLow: 2000, // sqm
  });

  // Dashboard settings
  const [dashboardStats, setDashboardStats] = useState({
    pdnsw: 0,
    otherAgencies: 0,
    tbd: 0,
    totalProperties: 0,
    valueRanges: {
      'under2m': { pdnsw: 0, agency: 0, tbd: 0, total: 0, properties: { pdnsw: [], agency: [], tbd: [] } },
      '2to5m': { pdnsw: 0, agency: 0, tbd: 0, total: 0, properties: { pdnsw: [], agency: [], tbd: [] } },
      '5to10m': { pdnsw: 0, agency: 0, tbd: 0, total: 0, properties: { pdnsw: [], agency: [], tbd: [] } },
      '10to20m': { pdnsw: 0, agency: 0, tbd: 0, total: 0, properties: { pdnsw: [], agency: [], tbd: [] } },
      'over20m': { pdnsw: 0, agency: 0, tbd: 0, total: 0, properties: { pdnsw: [], agency: [], tbd: [] } },
      'unknown': { pdnsw: 0, agency: 0, tbd: 0, total: 0, properties: { pdnsw: [], agency: [], tbd: [] } }
    },
    allPropertiesData: [],
    agencySummary: [], // Add property to store agency summary data
    directorSummary: {} // Add property to store director summary data
  });
  const [dashboardExpanded, setDashboardExpanded] = useState(true);
  const [chartAgencyFilter, setChartAgencyFilter] = useState([]);
  const [availableChartAgencies, setAvailableChartAgencies] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDashboardLocked, setIsDashboardLocked] = useState(false); // Set to false by default for testing
  const [userInfo, setUserInfo] = useState(null);

  // Store overridden property values
  const [overriddenValues, setOverriddenValues] = useState({});
  const [editingProperty, setEditingProperty] = useState(null);
  
  // Track removed properties
  const [removedProperties, setRemovedProperties] = useState([]);
  const [propertyToRemove, setPropertyToRemove] = useState(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  
  // Track divestment selections
  const [divestmentSelections, setDivestmentSelections] = useState({});

  // Detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailModalType, setDetailModalType] = useState(''); // 'pdnsw', 'agency', or 'tbd'
  const [detailProperties, setDetailProperties] = useState([]);
  const [detailSortField, setDetailSortField] = useState('date');
  const [detailSortDirection, setDetailSortDirection] = useState('desc');
  const [agencyFilter, setAgencyFilter] = useState([]);
  const [availableAgencies, setAvailableAgencies] = useState([]);
  const [showAgencyFilter, setShowAgencyFilter] = useState(false);

  // Fetch all available properties from giraffeState
  useEffect(() => {
    const fetchAllProperties = () => {
      try {
        // Get rawSections from giraffeState
        const rawSections = giraffeState.get('rawSections');
        
        if (!rawSections?.features) {
          console.log('No valid rawSections data available');
          return;
        }
        
        // Filter layers where usage = "Site boundary"
        const siteBoundaryFeatures = rawSections.features
          .filter(feature => 
            feature.properties?.usage === "Site boundary"
          )
          .map(feature => ({
            type: 'Feature',
            id: feature.properties.id || feature.id || feature.properties?.OBJECTID,
            geometry: feature.geometry,
            properties: {
              // Use the entire properties object as copiedFrom to ensure address information is preserved
              copiedFrom: feature.properties?.copiedFrom || feature.properties
            }
          }));
        
        console.log('Site boundary features for triage:', siteBoundaryFeatures);
        
        // Combine with any properties passed in
        const combinedProperties = [...siteBoundaryFeatures, ...properties];
        const uniqueProperties = removeDuplicateProperties(combinedProperties);
        
        // Assign numbering to properties (1 to total)
        const numberedProperties = uniqueProperties.map((property, index) => ({
          ...property,
          triageNumber: index + 1
        }));
        
        setFilteredProperties(numberedProperties);
      } catch (error) {
        console.error('Error fetching properties for triage:', error);
      }
    };

    fetchAllProperties();

    // Set up listener for rawSections changes
    const unsubscribe = giraffeState.addListener(['rawSections'], () => {
      console.log('rawSections changed, refreshing properties for triage');
      fetchAllProperties();
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [properties]);

  // Function to remove duplicate properties based on id or address
  const removeDuplicateProperties = (props) => {
    const uniqueMap = new Map();
    
    props.forEach(property => {
      const id = property.id || 
        property.properties?.copiedFrom?.id || 
        property.properties?.copiedFrom?.site__address;
        
      if (id && !uniqueMap.has(id)) {
        uniqueMap.set(id, property);
      }
    });
    
    return Array.from(uniqueMap.values());
  };

  // Remove a property from the list
  const removeProperty = (propertyToRemove) => {
    const propertyId = propertyToRemove.id || 
      propertyToRemove.properties?.copiedFrom?.id || 
      propertyToRemove.properties?.copiedFrom?.site__address;
      
    setFilteredProperties(prevProperties => 
      prevProperties.filter(property => {
        const id = property.id || 
          property.properties?.copiedFrom?.id || 
          property.properties?.copiedFrom?.site__address;
        return id !== propertyId;
      })
    );
  };

  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending for all except number
      setSortField(field);
      setSortDirection(field === 'number' ? 'asc' : 'desc');
    }
  };

  const applyFilters = () => {
    try {
      // Get rawSections from giraffeState
      const rawSections = giraffeState.get('rawSections');
      
      if (!rawSections?.features) {
        console.log('No valid rawSections data available for filtering');
        return;
      }
      
      // Filter layers where usage = "Site boundary"
      const siteBoundaryFeatures = rawSections.features
        .filter(feature => 
          feature.properties?.usage === "Site boundary"
        )
        .map(feature => ({
          type: 'Feature',
          id: feature.properties.id || feature.id || feature.properties?.OBJECTID,
          geometry: feature.geometry,
          properties: {
            // Use the entire properties object as copiedFrom to ensure address information is preserved
            copiedFrom: feature.properties?.copiedFrom || feature.properties
          }
        }));
        
      // Combine with any properties passed in
      const combinedProperties = [...siteBoundaryFeatures, ...properties];
      const unique = removeDuplicateProperties(combinedProperties);
      
      // Apply filters
      const filtered = unique.filter(property => {
        const size = property.properties?.copiedFrom?.site_suitability__area || 0;
        const zoning = property.properties?.copiedFrom?.site_suitability__principal_zone_identifier || '';
        const score = property.properties?.copiedFrom?.overallScore || 0;
        
        if (size < filterCriteria.minSize || size > filterCriteria.maxSize) return false;
        if (filterCriteria.zoning.length > 0 && !filterCriteria.zoning.includes(zoning)) return false;
        if (score < filterCriteria.minScore) return false;
        
        return true;
      });
      
      // Assign numbering to properties (1 to total)
      const numberedProperties = filtered.map((property, index) => ({
        ...property,
        triageNumber: index + 1
      }));
      
      setFilteredProperties(numberedProperties);
    } catch (error) {
      console.error('Error applying filters:', error);
    }
  };

  // Function to get zone code from full zone identifier
  const getZoneCode = (zoneIdentifier) => {
    if (!zoneIdentifier) return '';
    // Extract zone code (e.g., "R2" from "R2 Low Density Residential")
    return zoneIdentifier.split(' ')[0];
  };
  
  // Function to get zone color
  const getZoneColor = (zoneIdentifier) => {
    const zoneCode = getZoneCode(zoneIdentifier);
    return landZoningColors[zoneCode] || 'CCCCCC'; // Default gray if no color found
  };

  // Format agency names - extract, sort alphabetically, and join with commas
  const formatAgencyNames = (agencyData) => {
    if (!agencyData) return 'Unknown';
    
    // Handle the special format: "[Agency:1,716:sqm:47:%, Agency:1,923:sqm:53:%]"
    if (typeof agencyData === 'string') {
      // Check if it has the array-like format with square brackets
      if (agencyData.startsWith('[') && agencyData.endsWith(']')) {
        // Remove the square brackets
        const contentWithoutBrackets = agencyData.substring(1, agencyData.length - 1);
        
        // Split the entries (handling commas within numbers)
        const entries = [];
        let currentEntry = '';
        let insideNumber = false;
        
        for (let i = 0; i < contentWithoutBrackets.length; i++) {
          const char = contentWithoutBrackets[i];
          
          // If we find a colon, check if we need to end the current entry
          if (char === ':' && !insideNumber) {
            if (currentEntry.includes(':')) {
              // This is not the first colon in this entry, which means we're in the middle of an entry
              currentEntry += char;
            } else {
              // This is the first colon, which delimits the agency name
              currentEntry += char;
            }
          } 
          // Handle commas
          else if (char === ',') {
            // If this comma is after a number and before 'sqm', it's part of the number
            if (i > 0 && 
                /\d/.test(contentWithoutBrackets[i-1]) && 
                i+4 < contentWithoutBrackets.length && 
                contentWithoutBrackets.substring(i+1, i+4) === 'sqm') {
              currentEntry += char;
              insideNumber = true;
            } 
            // If this comma is followed by a space and then a letter, it's a separator between entries
            else if (i+2 < contentWithoutBrackets.length && 
                    contentWithoutBrackets[i+1] === ' ' && 
                    /[A-Za-z]/.test(contentWithoutBrackets[i+2])) {
              entries.push(currentEntry);
              currentEntry = '';
              insideNumber = false;
              i++; // Skip the space
            } else {
              currentEntry += char;
            }
          } else {
            currentEntry += char;
            if (char === 'm' && currentEntry.includes('sqm')) {
              insideNumber = false;
            }
          }
        }
        
        // Add the last entry if there is one
        if (currentEntry) {
          entries.push(currentEntry);
        }
        
        // Extract just the agency names (before the first colon)
        const agencyNames = entries.map(entry => {
          const colonIndex = entry.indexOf(':');
          return colonIndex > 0 ? entry.substring(0, colonIndex) : entry;
        });
        
        // Remove duplicates, sort alphabetically, and join with commas
        const uniqueAgencies = [...new Set(agencyNames)]
          .filter(agency => agency && agency.trim().length > 0)
          .sort()
          .join(', ');
          
        return uniqueAgencies || 'Unknown';
      }
      
      // Handle normal string format (single agency or comma-separated)
      const agencies = agencyData
        .split(',')
        .map(agency => agency.trim())
        .filter(agency => agency.length > 0);
      
      // If only one agency or empty, return as is
      if (agencies.length <= 1) return agencies[0] || 'Unknown';
      
      // Sort alphabetically and join
      return [...new Set(agencies)].sort().join(', ');
    }
    
    // Handle array format
    if (Array.isArray(agencyData)) {
      if (agencyData.length === 0) return 'Unknown';
      if (agencyData.length === 1) return agencyData[0] || 'Unknown';
      
      // Sort alphabetically and join
      return [...new Set(agencyData)]
        .filter(agency => agency && typeof agency === 'string' && agency.trim().length > 0)
        .sort()
        .join(', ');
    }
    
    // If it's an object or other format we can't handle, return Unknown
    return 'Unknown';
  };

  // Function to format currency values
  const formatCurrency = (value) => {
    if (!value) return '$0';
    
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else {
      return `$${(value / 1000).toLocaleString()}k`;
    }
  };
  
  // Calculate value score based on property value
  const calculateValueScore = (propertyValue, propertyId) => {
    // Check if we have an overridden value for this property
    const actualValue = propertyId && overriddenValues[propertyId] !== undefined 
      ? overriddenValues[propertyId] 
      : propertyValue;
    
    if (!actualValue) return 1;
    
    if (actualValue > valueScoring.thresholdHigh) {
      return 3;
    } else if (actualValue >= valueScoring.thresholdLow) {
      return 2;
    } else {
      return 1;
    }
  };
  
  // Calculate housing score based on area and zone
  const calculateHousingScore = (area, zoneIdentifier) => {
    if (!area || !zoneIdentifier) return 1;
    
    const zoneCode = getZoneCode(zoneIdentifier);
    const isHighPriorityZone = housingScoring.highPriorityZones.includes(zoneCode);
    
    if (area > housingScoring.thresholdHigh && isHighPriorityZone) {
      return 3;
    } else if (area >= housingScoring.thresholdLow && area <= housingScoring.thresholdHigh && isHighPriorityZone) {
      return 2;
    } else {
      return 1;
    }
  };
  
  // Extract heritage type from heritage data string
  const extractHeritageType = (heritageData) => {
    if (!heritageData) return null;
    
    // Initialize with empty array for heritage types
    const heritageTypes = [];
    
    // Handle the special format: "[Local:1,183:sqm:98:%, State:1,187:sqm:98:%]"
    if (typeof heritageData === 'string') {
      // Check if it has the array-like format with square brackets
      if (heritageData.startsWith('[') && heritageData.endsWith(']')) {
        // Remove the square brackets
        const contentWithoutBrackets = heritageData.substring(1, heritageData.length - 1);
        
        // Split the entries (handling commas within numbers)
        let currentEntry = '';
        let insideNumber = false;
        
        for (let i = 0; i < contentWithoutBrackets.length; i++) {
          const char = contentWithoutBrackets[i];
          
          // If we find a colon, check if we need to end the current entry
          if (char === ':' && !insideNumber) {
            if (currentEntry.includes(':')) {
              // This is not the first colon in this entry, which means we're in the middle of an entry
              currentEntry += char;
            } else {
              // This is the first colon, which delimits the heritage type
              const heritageType = currentEntry;
              if (heritageType && !heritageTypes.includes(heritageType)) {
                heritageTypes.push(heritageType);
              }
              currentEntry = heritageType + char;
            }
          } 
          // Handle commas
          else if (char === ',') {
            // If this comma is after a number and before 'sqm', it's part of the number
            if (i > 0 && 
                /\d/.test(contentWithoutBrackets[i-1]) && 
                i+4 < contentWithoutBrackets.length && 
                contentWithoutBrackets.substring(i+1, i+4) === 'sqm') {
              currentEntry += char;
              insideNumber = true;
            } 
            // If this comma is followed by a space and then a letter, it's a separator between entries
            else if (i+2 < contentWithoutBrackets.length && 
                    contentWithoutBrackets[i+1] === ' ' && 
                    /[A-Za-z]/.test(contentWithoutBrackets[i+2])) {
              i++; // Skip the space
              // Start a new entry
              currentEntry = '';
              insideNumber = false;
            } else {
              currentEntry += char;
            }
          } else {
            currentEntry += char;
            if (char === 'm' && currentEntry.includes('sqm')) {
              insideNumber = false;
            }
          }
        }
      }
      
      // Check for simple "State" or "Local" text
      if (heritageData.includes('State')) {
        heritageTypes.push('State');
      }
      if (heritageData.includes('Local')) {
        heritageTypes.push('Local');
      }
    }
    
    return heritageTypes;
  };
  
  // Calculate heritage score
  const calculateHeritageScore = (heritageData) => {
    if (!heritageData) return 1;
    
    const heritageTypes = extractHeritageType(heritageData);
    
    if (heritageTypes.includes('State')) {
      return 3;
    } else if (heritageTypes.includes('Local')) {
      return 2;
    } else {
      return 1;
    }
  };
  
  // Get score color based on score value
  const getScoreColor = (score) => {
    switch (score) {
      case 3: return 'bg-green-100 text-green-800';
      case 2: return 'bg-amber-100 text-amber-800';
      case 1: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get text representation of score
  const getScoreText = (score, type = 'default') => {
    if (type === 'heritage') {
      switch (score) {
        case 3: return 'State';
        case 2: return 'Local';
        case 1: return 'None';
        default: return 'Unknown';
      }
    } else {
      switch (score) {
        case 3: return 'High';
        case 2: return 'Moderate';
        case 1: return 'Low';
        default: return 'Unknown';
      }
    }
  };

  // Update sortProperties to handle the new sort fields
  const sortProperties = (props) => {
    // First, sort by agency (always alphabetical)
    return [...props].sort((a, b) => {
      // Get agency names for grouping
      const agencyA = a.properties?.copiedFrom?.site_suitability__NSW_government_agency || '';
      const agencyB = b.properties?.copiedFrom?.site_suitability__NSW_government_agency || '';
      
      // Format agency names for comparison
      const formattedAgencyA = formatAgencyNames(agencyA).toLowerCase();
      const formattedAgencyB = formatAgencyNames(agencyB).toLowerCase();
      
      // If sorting by agency, only use agency for sorting
      if (sortField === 'agency') {
        return sortDirection === 'asc' 
          ? formattedAgencyA.localeCompare(formattedAgencyB)
          : formattedAgencyB.localeCompare(formattedAgencyA);
      }
      
      // Otherwise, group by agency first (always ascending), then sort by selected field
      if (formattedAgencyA !== formattedAgencyB) {
        return formattedAgencyA.localeCompare(formattedAgencyB);
      }
      
      // If agencies are the same, sort by the selected field
      let aValue, bValue;
      
      switch (sortField) {
        case 'number':
          aValue = a.triageNumber || 0;
          bValue = b.triageNumber || 0;
          break;
        case 'address':
          aValue = a.properties?.copiedFrom?.site__address || '';
          bValue = b.properties?.copiedFrom?.site__address || '';
          break;
        case 'lga':
          aValue = a.properties?.copiedFrom?.site_suitability__LGA || '';
          bValue = b.properties?.copiedFrom?.site_suitability__LGA || '';
          break;
        case 'area':
          aValue = a.properties?.copiedFrom?.site_suitability__area || 0;
          bValue = b.properties?.copiedFrom?.site_suitability__area || 0;
          break;
        case 'zone':
          aValue = a.properties?.copiedFrom?.site_suitability__principal_zone_identifier || '';
          bValue = b.properties?.copiedFrom?.site_suitability__principal_zone_identifier || '';
          break;
        case 'valueScore':
          aValue = calculateValueScore(a.properties?.copiedFrom?.site_suitability__property_value || 0, a.id || '');
          bValue = calculateValueScore(b.properties?.copiedFrom?.site_suitability__property_value || 0, b.id || '');
          break;
        case 'housingScore':
          aValue = calculateHousingScore(
            a.properties?.copiedFrom?.site_suitability__area || 0,
            a.properties?.copiedFrom?.site_suitability__principal_zone_identifier || ''
          );
          bValue = calculateHousingScore(
            b.properties?.copiedFrom?.site_suitability__area || 0, 
            b.properties?.copiedFrom?.site_suitability__principal_zone_identifier || ''
          );
          break;
        case 'heritageScore':
          aValue = calculateHeritageScore(a.properties?.copiedFrom?.site_suitability__heritage_significance || '');
          bValue = calculateHeritageScore(b.properties?.copiedFrom?.site_suitability__heritage_significance || '');
          break;
        default:
          aValue = a.triageNumber || 0;
          bValue = b.triageNumber || 0;
      }
      
      // Compare based on direction for the selected field
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  // Function to fly to a property location
  const flyToProperty = (property) => {
    try {
      const geometry = property.properties?.copiedFrom?.site__geometry || property.geometry;
      
      if (!geometry) {
        console.error('No geometry found for property', property);
        return;
      }
      
      // Use the geometry to determine the center point for flying to
      let center;
      
      if (geometry.type === 'Point') {
        // If it's a point, use its coordinates directly
        center = geometry.coordinates;
      } else if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
        // For polygons, we need to calculate the centroid
        // For simplicity, we'll use the first coordinate as a fallback
        const coordinates = geometry.type === 'Polygon' 
          ? geometry.coordinates[0] 
          : geometry.coordinates[0][0];
          
        if (coordinates && coordinates.length > 0) {
          // Calculate basic centroid by averaging coordinates
          const sumX = coordinates.reduce((sum, coord) => sum + coord[0], 0);
          const sumY = coordinates.reduce((sum, coord) => sum + coord[1], 0);
          center = [sumX / coordinates.length, sumY / coordinates.length];
        }
      }
      
      if (!center) {
        console.error('Could not determine center point from geometry', geometry);
        return;
      }
      
      // Use rpc.invoke to call the flyTo function
      rpc.invoke('flyTo', {
        center,
        zoom: 17,
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        duration: 1500
      });
      
      console.log(`Flying to property at coordinates: ${center}`);
    } catch (error) {
      console.error('Error flying to property:', error);
    }
  };

  // Format a number with commas as thousands separators
  const formatNumberWithCommas = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Handle value edit for a property
  const handleValueEdit = (property) => {
    const propertyId = property.id || 
      property.properties?.copiedFrom?.id || 
      property.properties?.copiedFrom?.site__address;
    
    const currentValue = overriddenValues[propertyId] !== undefined 
      ? overriddenValues[propertyId] 
      : property.properties?.copiedFrom?.site_suitability__property_value || 0;
    
    setEditingProperty({
      id: propertyId,
      value: currentValue,
      displayValue: currentValue.toString()
    });
  };

  // Save edited property value
  const saveEditedValue = (newValue) => {
    if (editingProperty) {
      setOverriddenValues(prev => ({
        ...prev,
        [editingProperty.id]: parseFloat(newValue)
      }));
      setEditingProperty(null);
    }
  };

  // Update display value as user types
  const handleValueInputChange = (e) => {
    // Remove any non-numeric characters
    const rawValue = e.target.value.replace(/[^0-9.]/g, '');
    
    // Parse to a float for storing
    const numValue = rawValue ? parseFloat(rawValue) : 0;
    
    setEditingProperty({
      ...editingProperty,
      value: numValue,
      displayValue: rawValue
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingProperty(null);
  };

  // Function to prompt for property removal
  const promptRemoveProperty = (property) => {
    setPropertyToRemove(property);
    setShowRemoveConfirm(true);
  };

  // Function to confirm and remove a property
  const confirmRemoveProperty = () => {
    if (propertyToRemove) {
      const propertyId = propertyToRemove.id || 
        propertyToRemove.properties?.copiedFrom?.id || 
        propertyToRemove.properties?.copiedFrom?.site__address;
      
      // Add to removed properties list
      setRemovedProperties(prevRemoved => [...prevRemoved, propertyToRemove]);
      
      // Remove from filtered properties
      setFilteredProperties(prevProperties => 
        prevProperties.filter(property => {
          const id = property.id || 
            property.properties?.copiedFrom?.id || 
            property.properties?.copiedFrom?.site__address;
          return id !== propertyId;
        })
      );
      
      // Close confirmation dialog
      setShowRemoveConfirm(false);
      setPropertyToRemove(null);
    }
  };

  // Function to cancel removal
  const cancelRemoveProperty = () => {
    setShowRemoveConfirm(false);
    setPropertyToRemove(null);
  };

  // Function to restore all removed properties
  const restoreRemovedProperties = () => {
    if (removedProperties.length > 0) {
      // Add back all removed properties
      const updatedProperties = [...filteredProperties, ...removedProperties];
      
      // Re-apply the numbering
      const renumberedProperties = updatedProperties.map((property, index) => ({
        ...property,
        triageNumber: index + 1
      }));
      
      setFilteredProperties(renumberedProperties);
      setRemovedProperties([]);
    }
  };

  // Load triage history data for dashboard
  useEffect(() => {
    const loadTriageHistory = async () => {
      try {
        console.log('Loading triage history from CSV file');
        
        try {
          const response = await fetch('/triage_history.csv');
          const csvText = await response.text();
          
          // Use a 3rd party CSV parser or implement a more robust solution
          // This is a simplified parser - handles commas within quoted fields
          const parseCSV = (csv) => {
            const lines = csv.split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            const data = [];
            
            for (let i = 1; i < lines.length; i++) {
              if (!lines[i].trim()) continue; // Skip empty lines
              
              // Parse CSV line
              const line = lines[i];
              const values = [];
              let currentValue = '';
              let insideQuotes = false;
              
              for (let j = 0; j < line.length; j++) {
                const char = line[j];
                
                if (char === '"') {
                  insideQuotes = !insideQuotes;
                } else if (char === ',' && !insideQuotes) {
                  values.push(currentValue);
                  currentValue = '';
                } else {
                  currentValue += char;
                }
              }
              
              // Add the last value
              values.push(currentValue);
              
              // Create record object
              const record = {};
              headers.forEach((header, index) => {
                let value = values[index] || '';
                // Clean up quoted values
                if (value.startsWith('"') && value.endsWith('"')) {
                  value = value.substring(1, value.length - 1);
                }
                record[header] = value.trim();
              });
              
              data.push(record);
            }
            
            return data;
          };
          
          const csvData = parseCSV(csvText);
          console.log('Parsed CSV data length:', csvData.length);
          console.log('Sample records:', csvData.slice(0, 3));
          
          if (csvData.length === 0) {
            console.error('No CSV data found');
            return;
          }
          
          // Map CSV data to our expected format
          const parsedData = csvData.map(record => ({
            address: record.Property || 'Unknown Property',
            landowningAgency: record['Landowning Agency'] || 'Unknown Agency',
            divestmentBy: record['Agency to manage divestment'] || 'To Be Determined',
            value: record['Property Value'] || 'Unknown',
            area: record['Developable Area'] || 'Unknown',
            zone: record.Zoning || '',
            date: record['Date of determination'] || new Date().toISOString(),
            director: record.Director || 'Not Assigned'
          }));
          
          // Process properties for dashboard
          let pdnswCount = 0;
          let agencyCount = 0;
          let tbdCount = 0;
          
          // Value ranges for chart
          const valueRanges = {
            'under2m': { pdnsw: 0, agency: 0, tbd: 0, total: 0, properties: { pdnsw: [], agency: [], tbd: [] } },
            '2to5m': { pdnsw: 0, agency: 0, tbd: 0, total: 0, properties: { pdnsw: [], agency: [], tbd: [] } },
            '5to10m': { pdnsw: 0, agency: 0, tbd: 0, total: 0, properties: { pdnsw: [], agency: [], tbd: [] } },
            '10to20m': { pdnsw: 0, agency: 0, tbd: 0, total: 0, properties: { pdnsw: [], agency: [], tbd: [] } },
            'over20m': { pdnsw: 0, agency: 0, tbd: 0, total: 0, properties: { pdnsw: [], agency: [], tbd: [] } },
            'unknown': { pdnsw: 0, agency: 0, tbd: 0, total: 0, properties: { pdnsw: [], agency: [], tbd: [] } }
          };
          
          // Collect agency and director statistics
          const agencyStats = {};
          const directorStats = {}; // Track director statistics
          
          const formattedPropertiesData = [];
          
          parsedData.forEach(record => {
            const property = record.address || 'Unknown Property';
            const agency = record.landowningAgency || 'Unknown Agency';
            const divestment = record.divestmentBy || 'To Be Determined';
            const value = record.value || 'Unknown';
            const area = record.area || 'Unknown';
            const zone = record.zone || '';
            const date = record.date || new Date().toISOString();
            const director = record.director || 'Not Assigned'; // Get director information
            
            let category = 'tbd';
            if (divestment && divestment.toLowerCase().includes('pdnsw')) {
              category = 'pdnsw';
              pdnswCount++;
              
              // Track director statistics for PDNSW properties
              if (!directorStats[director]) {
                directorStats[director] = {
                  count: 0,
                  totalValue: 0,
                  properties: []
                };
              }
              
              directorStats[director].count++;
              
              // Extract numeric value for calculating total
              let numericValue = 0;
              if (value && typeof value === 'string') {
                const match = value.match(/[$]?([\d,.]+)/);
                if (match) {
                  numericValue = parseFloat(match[1].replace(/,/g, ''));
                }
              }
              
              directorStats[director].totalValue += numericValue;
              directorStats[director].properties.push({
                property,
                value,
                numericValue,
                area
              });
            } else if (divestment && divestment !== 'To Be Determined' && !divestment.toLowerCase().includes('tbd')) {
              category = 'agency';
              agencyCount++;
              
              // Track agency statistics
              if (!agencyStats[divestment]) {
                agencyStats[divestment] = {
                  count: 0,
                  properties: []
                };
              }
              agencyStats[divestment].count++;
              agencyStats[divestment].properties.push(property);
            } else {
              tbdCount++;
            }
            
            // Determine value range for chart
            let valueRange = 'unknown';
            if (value && typeof value === 'string') {
              const match = value.match(/[$]?([\d,.]+)/);
              if (match) {
                const numericValue = parseFloat(match[1].replace(/,/g, ''));
                
                if (numericValue < 2000000) {
                  valueRange = 'under2m';
                } else if (numericValue < 5000000) {
                  valueRange = '2to5m';
                } else if (numericValue < 10000000) {
                  valueRange = '5to10m';
                } else if (numericValue < 20000000) {
                  valueRange = '10to20m';
                } else {
                  valueRange = 'over20m';
                }
              }
            }
            
            // Increment value range counts
            valueRanges[valueRange][category]++;
            valueRanges[valueRange].total++;
            valueRanges[valueRange].properties[category].push({
              property,
              agency, 
              divestment,
              value,
              area,
              zone
            });
            
            // Add to formatted properties array
            formattedPropertiesData.push({
              property, 
              landowningAgency: agency,
              divestmentAgency: divestment,
              value,
              area,
              zoning: zone,
              date,
              sortableDate: new Date(date),
              director: director // Include director in formatted data
            });
          });
          
          // Create agency summary array
          const agencySummaryArray = Object.entries(agencyStats).map(([agency, data]) => ({
            agency,
            count: data.count,
            properties: data.properties
          })).sort((a, b) => b.count - a.count);
          
          // Sort directors by property count
          const sortedDirectors = Object.entries(directorStats)
            .sort((a, b) => b[1].count - a[1].count || b[1].totalValue - a[1].totalValue)
            .reduce((acc, [director, stats]) => {
              acc[director] = stats;
              return acc;
            }, {});
          
          console.log('Director data:', sortedDirectors);
          
          // Update dashboard stats
          setDashboardStats({
            pdnsw: pdnswCount,
            otherAgencies: agencyCount,
            tbd: tbdCount,
            totalProperties: pdnswCount + agencyCount + tbdCount,
            valueRanges,
            allPropertiesData: formattedPropertiesData,
            agencySummary: agencySummaryArray,
            directorSummary: sortedDirectors
          });
          
          console.log('Dashboard stats updated:', pdnswCount, agencyCount, tbdCount);
          
          // Extract available agencies for filters
          const agencies = [...new Set(formattedPropertiesData.map(p => p.landowningAgency))].filter(Boolean).sort();
          setAvailableAgencies(agencies);
          setAvailableChartAgencies(agencies);
          
        } catch (error) {
          console.error('Error fetching or parsing CSV:', error);
          
          // Fallback to localStorage if CSV loading fails
          let historyData = localStorage.getItem('triageHistory');
          console.log('Falling back to localStorage for triage history:', historyData);
          
          if (!historyData) {
            console.error('No triage history data found in localStorage either');
            return;
          }
        }
      } catch (error) {
        console.error('Error loading triage history:', error);
      }
    };
    
    loadTriageHistory();
  }, []);

  // Helper function to parse triage date for sorting
  const parseTriageDateForSorting = (dateStr) => {
    if (!dateStr) return new Date(0); // Default for empty strings
    
    // Handle "Dec-24" format
    if (dateStr.includes('-') && dateStr.length <= 7) {
      const [month, year] = dateStr.split('-');
      const monthMap = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      
      // Assuming 20xx year format
      return new Date(2000 + parseInt(year), monthMap[month] || 0, 1);
    }
    
    // Handle dd/mm/yyyy format
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Try to parse any other format
    return new Date(dateStr);
  };

  // Format date for display
  const formatDetailDate = (dateStr) => {
    if (!dateStr) return '';
    
    // If it's already in "Dec-24" format, just return it
    if (dateStr.includes('-') && dateStr.length <= 7) {
      return dateStr;
    }
    
    // Handle dd/mm/yyyy format
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      
      return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    }
    
    return dateStr;
  };

  // Format area for display
  const formatDetailArea = (areaStr) => {
    if (!areaStr) return '0 m²';
    
    // Remove quotes and any non-numeric characters except commas
    areaStr = areaStr.replace(/"/g, '').trim();
    
    // Extract numeric value
    const match = areaStr.match(/([\d,]+)/);
    if (!match) return '0 m²';
    
    // Format with commas
    const num = parseInt(match[1].replace(/,/g, ''));
    return num.toLocaleString() + ' m²';
  };

  // Format property value for display
  const formatDetailValue = (valueStr) => {
    if (!valueStr) return '$0';
    
    // Remove quotes and any non-numeric characters
    valueStr = valueStr.replace(/"/g, '').trim();
    
    // Extract numeric value
    const match = valueStr.match(/[$]?([\d,]+)/);
    if (!match) return '$0';
    
    // Parse value
    const value = parseFloat(match[1].replace(/,/g, ''));
    
    // Format as $#.#M or $#k
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else {
      return `$${Math.round(value / 1000).toLocaleString()}k`;
    }
  };

  // Get zone code from zone string
  const getDetailZoneCode = (zoneStr) => {
    if (!zoneStr) return '';
    
    // Extract code (e.g., R2 from "R2 - Low Density Residential")
    const match = zoneStr.match(/^([A-Za-z0-9]+)/);
    return match ? match[1] : '';
  };

  // Open the detail modal
  const openDetailModal = (type) => {
    // Filter properties based on type
    const allProperties = dashboardStats.allPropertiesData || [];
    let filteredProperties = [];
    
    if (type === 'pdnsw') {
      filteredProperties = allProperties.filter(p => 
        p.divestmentAgency.includes('PDNSW')
      );
      setShowAgencyFilter(false);
    } else if (type === 'agency') {
      filteredProperties = allProperties.filter(p => 
        !p.divestmentAgency.includes('PDNSW') && 
        !p.divestmentAgency.includes('TBD') && 
        p.divestmentAgency !== ''
      );
      
      // Get unique agencies for filter
      const agencies = [...new Set(filteredProperties.map(p => p.landowningAgency))]
        .filter(a => a)
        .sort((a, b) => a.localeCompare(b));
      
      setAvailableAgencies(agencies);
      setAgencyFilter([]);
      setShowAgencyFilter(true);
    } else if (type === 'tbd') {
      filteredProperties = allProperties.filter(p => 
        p.divestmentAgency.includes('TBD') || 
        p.divestmentAgency === ''
      );
      
      // Get unique agencies for filter
      const agencies = [...new Set(filteredProperties.map(p => p.landowningAgency))]
        .filter(a => a)
        .sort((a, b) => a.localeCompare(b));
      
      setAvailableAgencies(agencies);
      setAgencyFilter([]);
      setShowAgencyFilter(true);
    }
    
    // Sort properties by the current sort field and direction
    sortDetailProperties(filteredProperties, detailSortField, detailSortDirection);
    
    setDetailProperties(filteredProperties);
    setDetailModalType(type);
    setDetailModalOpen(true);
  };

  // Handle agency filter change
  const handleAgencyFilterChange = (agency) => {
    setAgencyFilter(prev => {
      if (prev.includes(agency)) {
        return prev.filter(a => a !== agency);
      } else {
        return [...prev, agency];
      }
    });
  };

  // Clear all agency filters
  const clearAgencyFilter = () => {
    setAgencyFilter([]);
  };

  // Filter properties by selected agencies
  const getFilteredDetailProperties = () => {
    if (!agencyFilter.length) {
      return detailProperties;
    }
    
    return detailProperties.filter(property => 
      agencyFilter.includes(property.landowningAgency)
    );
  };

  // Calculate total for filtered properties
  const getFilteredPropertyTotals = () => {
    if (!agencyFilter.length) {
      return null;
    }
    
    const filteredProps = getFilteredDetailProperties();
    
    if (filteredProps.length === 0) {
      return { count: 0, value: 0 };
    }
    
    const totalValue = filteredProps.reduce((sum, property) => {
      // Extract numeric value for value
      const valueMatch = (property.value || '').match(/[$]?([\d,.]+)/);
      const propertyValue = valueMatch ? parseFloat(valueMatch[1].replace(/,/g, '')) : 0;
      return sum + propertyValue;
    }, 0);
    
    return { 
      count: filteredProps.length,
      value: totalValue 
    };
  };

  // Sort detail properties
  const sortDetailProperties = (properties, field, direction) => {
    return properties.sort((a, b) => {
      let aValue, bValue;
      
      switch (field) {
        case 'property':
          aValue = a.property || '';
          bValue = b.property || '';
          break;
        case 'agency':
          aValue = a.landowningAgency || '';
          bValue = b.landowningAgency || '';
          break;
        case 'area':
          // Extract numeric value for area
          const aAreaMatch = (a.area || '').match(/[\d,]+/);
          const bAreaMatch = (b.area || '').match(/[\d,]+/);
          aValue = aAreaMatch ? parseInt(aAreaMatch[0].replace(/,/g, '')) : 0;
          bValue = bAreaMatch ? parseInt(bAreaMatch[0].replace(/,/g, '')) : 0;
          break;
        case 'value':
          // Extract numeric value for value
          const aValueMatch = (a.value || '').match(/[$]?([\d,]+)/);
          const bValueMatch = (b.value || '').match(/[$]?([\d,]+)/);
          aValue = aValueMatch ? parseFloat(aValueMatch[1].replace(/,/g, '')) : 0;
          bValue = bValueMatch ? parseFloat(bValueMatch[1].replace(/,/g, '')) : 0;
          break;
        case 'zoning':
          aValue = getDetailZoneCode(a.zoning) || '';
          bValue = getDetailZoneCode(b.zoning) || '';
          break;
        case 'divestment':
          aValue = a.divestmentAgency || '';
          bValue = b.divestmentAgency || '';
          break;
        case 'date':
          aValue = a.sortableDate || new Date(0);
          bValue = b.sortableDate || new Date(0);
          break;
        default:
          aValue = a.property || '';
          bValue = b.property || '';
      }
      
      if (direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  // Handle sort change in detail modal
  const handleDetailSort = (field) => {
    const newDirection = 
      field === detailSortField 
        ? (detailSortDirection === 'asc' ? 'desc' : 'asc') 
        : 'asc';
    
    setDetailSortField(field);
    setDetailSortDirection(newDirection);
    
    // Re-sort properties
    const sortedProperties = [...detailProperties];
    sortDetailProperties(sortedProperties, field, newDirection);
    setDetailProperties(sortedProperties);
  };

  // Function to generate detailed tooltip content
  const generateTooltipContent = (properties) => {
    // Limit the display to first 10 properties if there are too many
    const displayLimit = 10;
    const limitedProps = properties.slice(0, displayLimit);
    
    let content = '';
    
    limitedProps.forEach((prop, idx) => {
      content += `${prop.property}\n`;
      content += `Agency: ${prop.landowningAgency}\n`;
      content += `Value: ${prop.value}\n`;
      
      // Add separator between properties
      if (idx < limitedProps.length - 1) {
        content += '---------------\n';
      }
    });
    
    // Add indicator if there are more properties not shown
    if (properties.length > displayLimit) {
      content += `\n...and ${properties.length - displayLimit} more properties`;
    }
    
    return content;
  };

  // Handle chart agency filter change
  const handleChartAgencyFilterChange = (agency) => {
    setChartAgencyFilter(prev => {
      if (prev.includes(agency)) {
        return prev.filter(a => a !== agency);
      } else {
        return [...prev, agency];
      }
    });
  };

  // Clear all chart agency filters
  const clearChartAgencyFilter = () => {
    setChartAgencyFilter([]);
  };
  
  // Get filtered chart data based on selected agencies
  const getFilteredChartData = () => {
    console.log('getFilteredChartData called, chartAgencyFilter:', chartAgencyFilter);
    console.log('valueRanges data:', dashboardStats.valueRanges);
    
    if (!chartAgencyFilter.length) {
      return dashboardStats.valueRanges;
    }
    
    // Start with a deep copy of the value ranges structure but with zeros
    const filteredRanges = {
      'under2m': { pdnsw: 0, agency: 0, tbd: 0, total: 0 },
      '2to5m': { pdnsw: 0, agency: 0, tbd: 0, total: 0 },
      '5to10m': { pdnsw: 0, agency: 0, tbd: 0, total: 0 },
      '10to20m': { pdnsw: 0, agency: 0, tbd: 0, total: 0 },
      'over20m': { pdnsw: 0, agency: 0, tbd: 0, total: 0 },
      'unknown': { pdnsw: 0, agency: 0, tbd: 0, total: 0 }
    };
    
    // Iterate through all value ranges
    Object.keys(dashboardStats.valueRanges).forEach(rangeKey => {
      // For each divestment category
      ['pdnsw', 'agency', 'tbd'].forEach(category => {
        // Filter properties by selected agencies
        const filteredCount = dashboardStats.valueRanges[rangeKey].properties[category].filter(prop => 
          chartAgencyFilter.includes(prop.landowningAgency)
        ).length;
        
        // Update counts
        filteredRanges[rangeKey][category] = filteredCount;
        filteredRanges[rangeKey].total += filteredCount;
      });
    });
    
    return filteredRanges;
  };

  // Function to get the maximum total across all value ranges for chart scaling
  const getMaxValueRangeTotal = (valueRanges) => {
    return Math.max(...Object.values(valueRanges).map(v => v.total || 0));
  };

  // Format currency for the agency summary table
  const formatCurrencyMillions = (value) => {
    if (value === 0) return '$0';
    
    // Convert to millions and round to 1 decimal place
    const millions = value / 1000000;
    
    if (millions < 1) {
      // If less than 1 million, show in thousands
      const thousands = value / 1000;
      return `$${thousands.toFixed(1)}k`;
    }
    
    return `$${millions.toFixed(1)}M`;
  };

  // Handle dropdown toggle
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.agency-dropdown')) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Check user email authorization for dashboard access
  useEffect(() => {
    const checkUserAuthorization = async () => {
      try {
        console.log('Checking user authorization for dashboard...');
        const info = await checkUserClaims();
        console.log('User info returned from checkUserClaims:', info);
        setUserInfo(info);
        
        // Authorized emails
        const authorizedEmails = [
          'james.strutt@dpie.nsw.gov.au',
          'jonathan.thorpe@dpie.nsw.gov.au',
          'grace.zhuang@dpie.nsw.gov.au'
        ];
        
        // Check if user email is authorized
        if (info && info.email && authorizedEmails.includes(info.email)) {
          console.log('User is authorized to access dashboard');
          setIsDashboardLocked(false);
        } else {
          console.log('User is not authorized to access dashboard');
          setIsDashboardLocked(true);
        }
      } catch (error) {
        console.error('Error checking user authorization:', error);
        setIsDashboardLocked(true);
      }
    };
    
    checkUserAuthorization();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6 px-4">
        <div className="flex items-center">
          <button 
            onClick={onClose}
            className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Back to main interface"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-semibold">Property Triage Analysis</h1>
          
          <div className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium animate-pulse border border-blue-300 flex items-center">
            Beta
          </div>
          
          {removedProperties.length > 0 && (
            <button
              onClick={restoreRemovedProperties}
              className="ml-auto flex items-center text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 rounded-full px-3 py-1 transition-colors"
              title="Restore removed properties"
            >
              <RotateCcw size={14} className="mr-1" />
              Restore Properties ({removedProperties.length})
            </button>
          )}
        </div>
        <div className="h-1 bg-[#da2244] mt-2 rounded-full"></div>
      </div>

      {/* Dashboard */}
      <div className="px-4 mb-4">
        <div className="bg-white rounded-lg shadow-sm border">
          <div
            className="p-4 border-b flex justify-between items-center cursor-pointer"
            onClick={() => isDashboardLocked ? null : setDashboardExpanded(!dashboardExpanded)}
          >
            <h3 className="text-lg font-medium flex items-center">
              <PieChart size={20} className="mr-2" />
              Historical Triage Dashboard
            </h3>
            {isDashboardLocked ? (
              <div className="text-xs text-gray-500">
                {userInfo ? (
                  <span>Access restricted. Your email <strong>{userInfo.email}</strong> is not authorized.</span>
                ) : (
                  <span>Loading user information...</span>
                )}
              </div>
            ) : (
              <button className="text-gray-400 hover:text-gray-600">
                {dashboardExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </button>
            )}
          </div>
          
          {!isDashboardLocked && dashboardExpanded && (
            <div className="p-4 grid grid-cols-1 gap-6">
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">Summary of Historical Triage Decisions - As at 19 March 2025</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-blue-100 rounded-lg p-3 text-center">
                    <div className="text-3xl font-bold text-blue-800">
                      {dashboardStats.totalProperties}
                    </div>
                    <div className="text-sm text-blue-600 mt-1">Total Properties</div>
                  </div>
                  <div className="bg-green-100 rounded-lg p-3 text-center">
                    <div className="text-3xl font-bold text-green-800">
                      {dashboardStats.pdnsw}
                    </div>
                    <div className="text-sm text-green-600 mt-1">PDNSW</div>
                  </div>
                  <div className="bg-amber-100 rounded-lg p-3 text-center">
                    <div className="text-3xl font-bold text-amber-800">
                      {dashboardStats.otherAgencies}
                    </div>
                    <div className="text-sm text-amber-600 mt-1">Agency</div>
                  </div>
                  <div className="bg-red-100 rounded-lg p-3 text-center">
                    <div className="text-3xl font-bold text-red-800">
                      {dashboardStats.tbd}
                    </div>
                    <div className="text-sm text-red-600 mt-1">To Be Determined</div>
                  </div>
                </div>
                
                {/* Percentage bars */}
                <div className="mt-6">
                  <div className="flex items-center mb-1">
                    <div className="text-xs font-medium w-20 flex items-center">
                      <button 
                        onClick={() => openDetailModal('pdnsw')}
                        className="p-1 mr-1 rounded-full hover:bg-green-100 transition-colors"
                        title="View PDNSW properties"
                      >
                        <Plus size={14} className="text-green-700" />
                      </button>
                      PDNSW:
                    </div>
                    <div className="flex-grow bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-green-600 h-2.5 rounded-full" 
                        style={{ width: `${dashboardStats.totalProperties ? (dashboardStats.pdnsw / dashboardStats.totalProperties * 100) : 0}%` }}
                      ></div>
                    </div>
                    <div className="text-xs ml-2 w-12 text-right">
                      {dashboardStats.totalProperties ? Math.round(dashboardStats.pdnsw / dashboardStats.totalProperties * 100) : 0}%
                    </div>
                  </div>
                  
                  <div className="flex items-center mb-1">
                    <div className="text-xs font-medium w-20 flex items-center">
                      <button 
                        onClick={() => openDetailModal('agency')}
                        className="p-1 mr-1 rounded-full hover:bg-amber-100 transition-colors"
                        title="View Agency properties"
                      >
                        <Plus size={14} className="text-amber-700" />
                      </button>
                      Agency:
                    </div>
                    <div className="flex-grow bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-amber-600 h-2.5 rounded-full" 
                        style={{ width: `${dashboardStats.totalProperties ? (dashboardStats.otherAgencies / dashboardStats.totalProperties * 100) : 0}%` }}
                      ></div>
                    </div>
                    <div className="text-xs ml-2 w-12 text-right">
                      {dashboardStats.totalProperties ? Math.round(dashboardStats.otherAgencies / dashboardStats.totalProperties * 100) : 0}%
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="text-xs font-medium w-20 flex items-center">
                      <button 
                        onClick={() => openDetailModal('tbd')}
                        className="p-1 mr-1 rounded-full hover:bg-red-100 transition-colors"
                        title="View TBD properties"
                      >
                        <Plus size={14} className="text-red-700" />
                      </button>
                      TBD:
                    </div>
                    <div className="flex-grow bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-red-600 h-2.5 rounded-full" 
                        style={{ 
                          width: `${dashboardStats.totalProperties ? 
                            (dashboardStats.tbd / dashboardStats.totalProperties * 100) : 0}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs ml-2 w-12 text-right">
                      {dashboardStats.totalProperties ? Math.round(dashboardStats.tbd / dashboardStats.totalProperties * 100) : 0}%
                    </div>
                  </div>
                </div>
                
                {/* Director Chart */}
                <div className="mt-8">
                  <h4 className="font-medium mb-3">PDNSW Properties by Director</h4>
                  <div className="overflow-visible">
                    {Object.entries(dashboardStats.directorSummary).length === 0 ? (
                      <div className="text-gray-500 text-center py-4">No director data available</div>
                    ) : (
                      <div className="relative" style={{ height: "400px", paddingTop: "30px" }}> 
                        {/* Chart Area - removed left Y-axis */}
                        <div className="absolute inset-0 border-l border-b border-gray-300" style={{ top: "30px" }}>
                          {/* Horizontal Grid Lines */}
                          <div className="absolute inset-0">
                            {(() => {
                              // Get max count for scaling
                              const maxCount = Math.max(
                                ...Object.values(dashboardStats.directorSummary).map(d => d.count)
                              );
                              
                              // Create grid lines at 0, 50%, and 100% of max count
                              const gridPositions = [
                                0,                   // Bottom line (0%)
                                0.5,                 // Middle line (50%)
                                1                    // Top line (100%)
                              ];
                              
                              return gridPositions.map((pos, i) => (
                                <div
                                  key={i}
                                  className="absolute left-0 right-0 border-t border-gray-200"
                                  style={{ 
                                    bottom: `${pos * 100}%`,
                                    borderTopStyle: pos === 0 ? 'solid' : 'dashed'
                                  }}
                                ></div>
                              ));
                            })()}
                          </div>
                          
                          {/* Director Bars */}
                          <div className="absolute inset-0 flex items-end">
                            {(() => {
                              // Get directors in alphabetical order, but move "Not Assigned" to the end
                              const directors = Object.entries(dashboardStats.directorSummary)
                                .sort((a, b) => {
                                  if (a[0] === 'Not Assigned') return 1;
                                  if (b[0] === 'Not Assigned') return -1;
                                  return a[0].localeCompare(b[0]);
                                });
                              
                              // Find max values for scaling
                              const maxCount = Math.max(
                                ...directors.map(([_, stats]) => stats.count)
                              );
                              
                              const maxValue = Math.max(
                                ...directors.map(([_, stats]) => stats.totalValue)
                              );
                              
                              // Calculate bar width based on number of directors
                              const barWidth = `${95 / directors.length}%`; // Increased from 80% to 95% to use more space
                              
                              return directors.map(([director, stats], index) => {
                                const countHeight = maxCount > 0 ? (stats.count / maxCount) * 100 : 0;
                                const valueHeight = maxValue > 0 ? (stats.totalValue / maxValue) * 100 : 0;
                                
                                return (
                                  <div 
                                    key={director}
                                    className="h-full flex flex-col justify-end items-center"
                                    style={{ width: barWidth }}
                                  >
                                    <div className="w-full flex justify-center space-x-1 h-full items-end">
                                      {/* Count Bar */}
                                      <div className="relative w-8 bg-blue-500 rounded-t flex flex-col justify-center items-center"
                                        style={{ height: `${countHeight}%` }}
                                        title={`${director}: ${stats.count} properties`}
                                      >
                                        {/* Count Data Label - outside the bar */}
                                        <div className="absolute w-full text-center text-xs font-semibold text-black" 
                                          style={{ top: '-25px' }}>
                                          {stats.count}
                                        </div>
                                      </div>
                                      
                                      {/* Value Bar */}
                                      <div className="relative w-8 bg-green-500 rounded-t flex flex-col justify-center items-center"
                                        style={{ height: `${valueHeight}%` }}
                                        title={`${director}: ${formatCurrencyMillions(stats.totalValue)}`}
                                      >
                                        {/* Value Data Label - outside the bar */}
                                        <div className="absolute w-full text-center text-xs font-semibold text-black" 
                                          style={{ top: '-25px' }}>
                                          {formatCurrencyMillions(stats.totalValue)}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* X-Axis Label */}
                                    <div className="absolute bottom-0 transform translate-y-full">
                                      <div className="text-xs text-center whitespace-nowrap mt-1">
                                        {director}
                                      </div>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                        
                        {/* Legend */}
                        <div className="absolute left-16 right-16 flex justify-center" style={{ bottom: '-40px' }}>
                          <div className="flex items-center space-x-6">
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-blue-500 mr-1"></div>
                              <span className="text-xs">Properties Count</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-green-500 mr-1"></div>
                              <span className="text-xs">Total Value</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Value breakdown */}
                <div className="mt-14"> {/* Increased from mt-6 to mt-14 */}
                  <h4 className="font-medium mb-2">Value Breakdown</h4>
                  
                  {/* Agency Filter Dropdown for Chart */}
                  <div className="mb-4 relative">
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-medium">Filter by Agency:</div>
                      <div className="relative inline-block text-left flex-grow agency-dropdown">
                        <div>
                          <button 
                            type="button" 
                            className="inline-flex justify-between w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                            onClick={toggleDropdown}
                          >
                            {chartAgencyFilter.length === 0 ? (
                              <span className="text-gray-400">Select agencies...</span>
                            ) : (
                              <span>
                                {chartAgencyFilter.length === 1 
                                  ? chartAgencyFilter[0]
                                  : `${chartAgencyFilter.length} agencies selected`}
                              </span>
                            )}
                            <ChevronDown size={14} className="ml-2" />
                          </button>
                        </div>
                        
                        {isDropdownOpen && (
                          <div className="origin-top-right absolute right-0 mt-2 w-full rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                            <div className="py-1 max-h-60 overflow-y-auto" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                              <div className="px-3 py-1 border-b sticky top-0 bg-white">
                                <button 
                                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline w-full text-left"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    clearChartAgencyFilter();
                                    setIsDropdownOpen(false);
                                  }}
                                >
                                  Clear all filters
                                </button>
                              </div>
                              {availableChartAgencies.map(agency => (
                                <div 
                                  key={agency}
                                  className="px-4 py-2 text-xs hover:bg-gray-100 cursor-pointer flex items-center"
                                  role="menuitem"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleChartAgencyFilterChange(agency);
                                  }}
                                >
                                  <input 
                                    type="checkbox" 
                                    className="mr-2"
                                    checked={chartAgencyFilter.includes(agency)}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleChartAgencyFilterChange(agency);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  {agency}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="h-80 flex flex-col">
                    <div className="flex-grow flex items-end justify-between gap-6">
                      {/* Get filtered chart data */}
                      {(() => {
                        const filteredData = getFilteredChartData();
                        const maxTotal = getMaxValueRangeTotal(filteredData);
                        
                        // Return the JSX for all columns
                        return (
                          <>
                            {/* Column for under $2M */}
                            <div className="flex-1 flex flex-col justify-end">
                              <div className="w-full flex flex-col-reverse">
                                <div 
                                  className="w-full bg-gray-400" 
                                  style={{ 
                                    height: `${(filteredData.under2m.tbd / maxTotal) * 200 || 0}px` 
                                  }}
                                  title={`TBD: ${filteredData.under2m.tbd || 0} properties`}
                                ></div>
                                <div 
                                  className="w-full bg-amber-500" 
                                  style={{ 
                                    height: `${(filteredData.under2m.agency / maxTotal) * 200 || 0}px` 
                                  }}
                                  title={`Agency: ${filteredData.under2m.agency || 0} properties`}
                                ></div>
                                <div 
                                  className="w-full bg-green-500" 
                                  style={{ 
                                    height: `${(filteredData.under2m.pdnsw / maxTotal) * 200 || 0}px` 
                                  }}
                                  title={`PDNSW: ${filteredData.under2m.pdnsw || 0} properties`}
                                ></div>
                              </div>
                              <div className="text-xs text-center font-medium mt-2 whitespace-nowrap">Under $2M</div>
                              <div className="text-xs text-center text-gray-500">{filteredData.under2m.total || 0}</div>
                            </div>
                            
                            {/* Column for $2M-$5M */}
                            <div className="flex-1 flex flex-col justify-end">
                              <div className="w-full flex flex-col-reverse">
                                <div 
                                  className="w-full bg-gray-400" 
                                  style={{ 
                                    height: `${(filteredData['2to5m'].tbd / maxTotal) * 200 || 0}px` 
                                  }}
                                  title={`TBD: ${filteredData['2to5m'].tbd || 0} properties`}
                                ></div>
                                <div 
                                  className="w-full bg-amber-500" 
                                  style={{ 
                                    height: `${(filteredData['2to5m'].agency / maxTotal) * 200 || 0}px` 
                                  }}
                                  title={`Agency: ${filteredData['2to5m'].agency || 0} properties`}
                                ></div>
                                <div 
                                  className="w-full bg-green-500" 
                                  style={{ 
                                    height: `${(filteredData['2to5m'].pdnsw / maxTotal) * 200 || 0}px` 
                                  }}
                                  title={`PDNSW: ${filteredData['2to5m'].pdnsw || 0} properties`}
                                ></div>
                              </div>
                              <div className="text-xs text-center font-medium mt-2 whitespace-nowrap">$2M-$5M</div>
                              <div className="text-xs text-center text-gray-500">{filteredData['2to5m'].total || 0}</div>
                            </div>
                            
                            {/* Column for $5M-$10M */}
                            <div className="flex-1 flex flex-col justify-end">
                              <div className="w-full flex flex-col-reverse">
                                <div 
                                  className="w-full bg-gray-400" 
                                  style={{ 
                                    height: `${(filteredData['5to10m'].tbd / maxTotal) * 200 || 0}px` 
                                  }}
                                  title={`TBD: ${filteredData['5to10m'].tbd || 0} properties`}
                                ></div>
                                <div 
                                  className="w-full bg-amber-500" 
                                  style={{ 
                                    height: `${(filteredData['5to10m'].agency / maxTotal) * 200 || 0}px` 
                                  }}
                                  title={`Agency: ${filteredData['5to10m'].agency || 0} properties`}
                                ></div>
                                <div 
                                  className="w-full bg-green-500" 
                                  style={{ 
                                    height: `${(filteredData['5to10m'].pdnsw / maxTotal) * 200 || 0}px` 
                                  }}
                                  title={`PDNSW: ${filteredData['5to10m'].pdnsw || 0} properties`}
                                ></div>
                              </div>
                              <div className="text-xs text-center font-medium mt-2 whitespace-nowrap">$5M-$10M</div>
                              <div className="text-xs text-center text-gray-500">{filteredData['5to10m'].total || 0}</div>
                            </div>
                            
                            {/* Column for $10M-$20M */}
                            <div className="flex-1 flex flex-col justify-end">
                              <div className="w-full flex flex-col-reverse">
                                <div 
                                  className="w-full bg-gray-400" 
                                  style={{ 
                                    height: `${(filteredData['10to20m'].tbd / maxTotal) * 200 || 0}px` 
                                  }}
                                  title={`TBD: ${filteredData['10to20m'].tbd || 0} properties`}
                                ></div>
                                <div 
                                  className="w-full bg-amber-500" 
                                  style={{ 
                                    height: `${(filteredData['10to20m'].agency / maxTotal) * 200 || 0}px` 
                                  }}
                                  title={`Agency: ${filteredData['10to20m'].agency || 0} properties`}
                                ></div>
                                <div 
                                  className="w-full bg-green-500" 
                                  style={{ 
                                    height: `${(filteredData['10to20m'].pdnsw / maxTotal) * 200 || 0}px` 
                                  }}
                                  title={`PDNSW: ${filteredData['10to20m'].pdnsw || 0} properties`}
                                ></div>
                              </div>
                              <div className="text-xs text-center font-medium mt-2 whitespace-nowrap">$10M-$20M</div>
                              <div className="text-xs text-center text-gray-500">{filteredData['10to20m'].total || 0}</div>
                            </div>
                            
                            {/* Column for Over $20M */}
                            <div className="flex-1 flex flex-col justify-end">
                              <div className="w-full flex flex-col-reverse">
                                <div 
                                  className="w-full bg-gray-400" 
                                  style={{ 
                                    height: `${(filteredData.over20m.tbd / maxTotal) * 200 || 0}px` 
                                  }}
                                  title={`TBD: ${filteredData.over20m.tbd || 0} properties`}
                                ></div>
                                <div 
                                  className="w-full bg-amber-500" 
                                  style={{ 
                                    height: `${(filteredData.over20m.agency / maxTotal) * 200 || 0}px` 
                                  }}
                                  title={`Agency: ${filteredData.over20m.agency || 0} properties`}
                                ></div>
                                <div 
                                  className="w-full bg-green-500" 
                                  style={{ 
                                    height: `${(filteredData.over20m.pdnsw / maxTotal) * 200 || 0}px` 
                                  }}
                                  title={`PDNSW: ${filteredData.over20m.pdnsw || 0} properties`}
                                ></div>
                              </div>
                              <div className="text-xs text-center font-medium mt-2 whitespace-nowrap">Over $20M</div>
                              <div className="text-xs text-center text-gray-500">{filteredData.over20m.total || 0}</div>
                            </div>
                            
                            {/* Column for Unknown Value */}
                            <div className="flex-1 flex flex-col justify-end">
                              <div className="w-full flex flex-col-reverse">
                                <div 
                                  className="w-full bg-gray-400" 
                                  style={{ 
                                    height: `${(filteredData.unknown.tbd / maxTotal) * 200 || 0}px` 
                                  }}
                                  title={`TBD: ${filteredData.unknown.tbd || 0} properties`}
                                ></div>
                                <div 
                                  className="w-full bg-amber-500" 
                                  style={{ 
                                    height: `${(filteredData.unknown.agency / maxTotal) * 200 || 0}px` 
                                  }}
                                  title={`Agency: ${filteredData.unknown.agency || 0} properties`}
                                ></div>
                                <div 
                                  className="w-full bg-green-500" 
                                  style={{ 
                                    height: `${(filteredData.unknown.pdnsw / maxTotal) * 200 || 0}px` 
                                  }}
                                  title={`PDNSW: ${filteredData.unknown.pdnsw || 0} properties`}
                                ></div>
                              </div>
                              <div className="text-xs text-center font-medium mt-2 whitespace-nowrap">Unknown</div>
                              <div className="text-xs text-center text-gray-500">{filteredData.unknown.total || 0}</div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    <div className="mt-4 flex items-center justify-center space-x-6 text-xs">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 mr-1"></div>
                        <span>PDNSW</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-amber-500 mr-1"></div>
                        <span>Agency</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-gray-400 mr-1"></div>
                        <span>TBD</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Triage Scoring Settings */}
      <div className="px-4 mb-4">
        <div className="bg-white rounded-lg shadow-sm border">
          <div
            className="p-4 border-b flex justify-between items-center cursor-pointer"
            onClick={() => setShowScoringSettings(!showScoringSettings)}
          >
            <div className="flex items-center">
              <Settings size={20} className="mr-2 text-gray-700" />
              <h2 className="text-lg font-semibold">Triage Scoring Settings</h2>
            </div>
            <div>
              {showScoringSettings ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>
          
          {showScoringSettings && (
            <div className="p-4 grid grid-cols-3 gap-6 text-xs">
              {/* Value Scoring */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">Value Scoring</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-600 mb-1">
                      Low Threshold (Score 1 if below)
                    </label>
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-1">$</span>
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-full text-xs"
                        value={valueScoring.thresholdLow / 1000000}
                        onChange={(e) => setValueScoring({
                          ...valueScoring,
                          thresholdLow: parseFloat(e.target.value) * 1000000
                        })}
                      />
                      <span className="text-gray-500 ml-1">million</span>
                    </div>
                    <div className="mt-1 text-gray-500">
                      Score 1 if &lt; ${valueScoring.thresholdLow / 1000000}M
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">
                      High Threshold (Score 3 if above)
                    </label>
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-1">$</span>
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-full text-xs"
                        value={valueScoring.thresholdHigh / 1000000}
                        onChange={(e) => setValueScoring({
                          ...valueScoring,
                          thresholdHigh: parseFloat(e.target.value) * 1000000
                        })}
                      />
                      <span className="text-gray-500 ml-1">million</span>
                    </div>
                    <div className="mt-1 text-gray-500">
                      Score 3 if &gt; ${valueScoring.thresholdHigh / 1000000}M
                    </div>
                  </div>
                  <div className="text-gray-600">
                    Score 2 if between ${valueScoring.thresholdLow / 1000000}M and ${valueScoring.thresholdHigh / 1000000}M
                  </div>
                </div>
              </div>
              
              {/* Housing Scoring */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">Housing Scoring</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-600 mb-1">
                      High Priority Zones
                    </label>
                    <input
                      type="text"
                      className="border rounded px-2 py-1 w-full text-xs"
                      value={housingScoring.highPriorityZones.join(', ')}
                      onChange={(e) => setHousingScoring({
                        ...housingScoring,
                        highPriorityZones: e.target.value.split(',').map(zone => zone.trim())
                      })}
                    />
                    <div className="mt-1 text-gray-500">
                      Comma-separated zone codes
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">
                      Low Area Threshold (sqm)
                    </label>
                    <input
                      type="number"
                      className="border rounded px-2 py-1 w-full text-xs"
                      value={housingScoring.thresholdLow}
                      onChange={(e) => setHousingScoring({
                        ...housingScoring,
                        thresholdLow: parseInt(e.target.value, 10)
                      })}
                    />
                    <div className="mt-1 text-gray-500">
                      Score 2 if between {housingScoring.thresholdLow} and {housingScoring.thresholdHigh} sqm with priority zone
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">
                      High Area Threshold (sqm)
                    </label>
                    <input
                      type="number"
                      className="border rounded px-2 py-1 w-full text-xs"
                      value={housingScoring.thresholdHigh}
                      onChange={(e) => setHousingScoring({
                        ...housingScoring,
                        thresholdHigh: parseInt(e.target.value, 10)
                      })}
                    />
                    <div className="mt-1 text-gray-500">
                      Score 3 if &gt; {housingScoring.thresholdHigh} sqm with priority zone
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Heritage Scoring (read-only) */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">Heritage Scoring</h3>
                <div className="space-y-3">
                  <div className="flex items-center p-2 bg-green-100 text-green-800 rounded">
                    <div className="font-medium">Score 3:</div>
                    <div className="ml-2">State Heritage</div>
                  </div>
                  <div className="flex items-center p-2 bg-amber-100 text-amber-800 rounded">
                    <div className="font-medium">Score 2:</div>
                    <div className="ml-2">Local Heritage</div>
                  </div>
                  <div className="flex items-center p-2 bg-red-100 text-red-800 rounded">
                    <div className="font-medium">Score 1:</div>
                    <div className="ml-2">No Heritage</div>
                  </div>
                  <div className="text-gray-600 mt-2">
                    Heritage scoring is based on significance level
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content - property list */}
      <div className="flex-grow px-4 pb-4">
        {/* Property list */}
        <div className="bg-white rounded-lg shadow-sm border h-full">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <BarChart3 size={20} className="mr-2 text-gray-700" />
                <h2 className="text-lg font-semibold">Properties</h2>
              </div>
            </div>
          </div>
          
          {/* Table header - reduced font size */}
          <div className="grid grid-cols-11 gap-4 px-4 py-2 bg-gray-50 font-medium text-xs text-gray-600">
            <div className="col-span-1 flex items-center justify-center cursor-pointer" onClick={() => handleSort('number')}>
              Number
              {sortField === 'number' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </div>
            <div className="col-span-2 flex items-center cursor-pointer group" onClick={() => handleSort('address')}>
              <div className="flex-grow">
                Address
                {sortField === 'address' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </div>
            </div>
            <div className="col-span-1 flex items-center cursor-pointer" onClick={() => handleSort('lga')}>
              LGA
              {sortField === 'lga' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </div>
            <div className="col-span-1 flex items-center cursor-pointer" onClick={() => handleSort('area')}>
              Area (m²)
              {sortField === 'area' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </div>
            <div className="col-span-1 flex items-center cursor-pointer" onClick={() => handleSort('zone')}>
              Zone
              {sortField === 'zone' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </div>
            {/* Triage Scoring Columns */}
            <div 
              className="col-span-1 flex items-center justify-center cursor-pointer" 
              onClick={() => handleSort('valueScore')}
              title="Default value based on NSW Valuer General's latest property value used for rating purposes. Update value accordingly with more accurate information as required."
            >
              Value
              {sortField === 'valueScore' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </div>
            <div className="col-span-1 flex items-center justify-center cursor-pointer" onClick={() => handleSort('housingScore')}>
              Housing
              {sortField === 'housingScore' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </div>
            <div className="col-span-1 flex items-center justify-center cursor-pointer" onClick={() => handleSort('heritageScore')}>
              Heritage
              {sortField === 'heritageScore' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </div>
            <div className="col-span-2 flex items-center justify-center">
              Divestment By
            </div>
          </div>
          
          {/* Table body */}
          <div className="max-h-[calc(100vh-320px)] overflow-auto">
            {filteredProperties.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                No properties found. Please add properties to the map.
              </div>
            ) : (
              (() => {
                const sortedProperties = sortProperties(filteredProperties);
                let currentAgency = null;
                let displayIndex = 0;
                
                // Count properties by agency for displaying in headers
                const agencyPropertyCounts = {};
                sortedProperties.forEach(property => {
                  const copiedFrom = property.properties?.copiedFrom || {};
                  const agencyData = copiedFrom.site_suitability__NSW_government_agency;
                  const agencies = formatAgencyNames(agencyData);
                  
                  if (!agencyPropertyCounts[agencies]) {
                    agencyPropertyCounts[agencies] = 0;
                  }
                  agencyPropertyCounts[agencies]++;
                });
                
                return sortedProperties.map((property, index) => {
                  // Get property data
                  const copiedFrom = property.properties?.copiedFrom || {};
                  const propertyId = property.id || 
                    copiedFrom.id || 
                    copiedFrom.site__address;
                  const address = copiedFrom.site__address || 'Unnamed Property';
                  const area = copiedFrom.site_suitability__area || 0;
                  const zoneIdentifier = copiedFrom.site_suitability__principal_zone_identifier || 'Unknown';
                  const zoneCode = getZoneCode(zoneIdentifier);
                  const zoneColor = getZoneColor(zoneIdentifier);
                  const agencyData = copiedFrom.site_suitability__NSW_government_agency;
                  const agencies = formatAgencyNames(agencyData);
                  const defaultPropertyValue = copiedFrom.site_suitability__property_value || 0;
                  const propertyValue = overriddenValues[propertyId] !== undefined 
                    ? overriddenValues[propertyId] 
                    : defaultPropertyValue;
                  const heritageData = copiedFrom.site_suitability__heritage_significance || '';
                  
                  // Calculate scores
                  const valueScore = calculateValueScore(defaultPropertyValue, propertyId);
                  const housingScore = calculateHousingScore(area, zoneIdentifier);
                  const heritageScore = calculateHeritageScore(heritageData);
                  
                  // Get score colors
                  const valueScoreColor = getScoreColor(valueScore);
                  const housingScoreColor = getScoreColor(housingScore);
                  const heritageScoreColor = getScoreColor(heritageScore);
                  
                  // Check if this property's value is being edited
                  const isEditing = editingProperty?.id === propertyId;
                  
                  // Check if we need to show an agency header
                  const showAgencyHeader = agencies !== currentAgency;
                  currentAgency = agencies;
                  
                  // Increment display index for sequential numbering (continuous across all agencies)
                  displayIndex = index + 1;
                  
                  return (
                    <React.Fragment key={propertyId || index}>
                      {/* Agency Header */}
                      {showAgencyHeader && (
                        <div className="grid grid-cols-11 gap-4 px-4 py-2 bg-blue-800 text-xs font-semibold text-white sticky top-0 z-10">
                          <div className="col-span-11">
                            {agencies || 'Unknown'} 
                            {agencyPropertyCounts[agencies] && (
                              <span className="ml-1">
                                ({agencyPropertyCounts[agencies]} {agencyPropertyCounts[agencies] === 1 ? 'Property' : 'Properties'})
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Property Row */}
                      <div 
                        className="grid grid-cols-11 gap-4 px-4 py-2 border-b hover:bg-gray-50 transition-colors text-xs"
                      >
                        <div className="col-span-1 font-bold flex items-center justify-center">
                          {displayIndex}
                        </div>
                        <div className="col-span-2 flex items-center">
                          <div 
                            className="flex-grow flex items-center cursor-pointer text-blue-600 hover:text-blue-800 hover:underline group"
                            onClick={() => flyToProperty(property)}
                            title="Click to zoom to this property"
                          >
                            <MapPin size={12} className="mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                            {address}
                          </div>
                          <button
                            onClick={() => promptRemoveProperty(property)}
                            className="ml-2 p-1 text-gray-400 hover:text-red-500 rounded transition-colors opacity-70 hover:opacity-100"
                            title="Remove property"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <div className="col-span-1 flex items-center">
                          {copiedFrom.site_suitability__LGA || 'Unknown'}
                        </div>
                        <div className="col-span-1 flex items-center">
                          {area.toLocaleString()}
                        </div>
                        <div className="col-span-1 flex items-center">
                          <div 
                            className="w-3 h-3 mr-1 inline-block"
                            style={{ backgroundColor: `#${zoneColor}`, border: '1px solid #ccc' }}
                          ></div>
                          {zoneCode}
                        </div>
                        {/* Value Cell - Editable */}
                        <div 
                          className={`col-span-1 flex items-center justify-center rounded px-1 py-0.5 ${isEditing ? 'bg-white' : valueScoreColor}`}
                          title="Default value based on NSW Valuer General's latest property value used for rating purposes. Click to update with more accurate information."
                          onClick={isEditing ? undefined : () => handleValueEdit(property)}
                        >
                          {isEditing ? (
                            <div className="flex items-center space-x-1">
                              <div className="relative">
                                <span className="absolute left-2 top-1 text-gray-600">$</span>
                                <input
                                  type="text"
                                  className="pl-6 w-24 border rounded py-0.5 text-xs"
                                  value={formatNumberWithCommas(editingProperty.displayValue)}
                                  onChange={handleValueInputChange}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      saveEditedValue(editingProperty.value);
                                    } else if (e.key === 'Escape') {
                                      cancelEditing();
                                    }
                                  }}
                                />
                              </div>
                              <button
                                className="text-green-600 hover:text-green-800 p-0.5"
                                onClick={() => saveEditedValue(editingProperty.value)}
                              >
                                ✓
                              </button>
                              <button
                                className="text-red-600 hover:text-red-800 p-0.5"
                                onClick={cancelEditing}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="cursor-pointer hover:underline">
                              {formatCurrency(propertyValue)}
                              {overriddenValues[propertyId] !== undefined && (
                                <span className="ml-1 text-gray-500">*</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className={`col-span-1 flex items-center justify-center rounded px-1 py-0.5 ${housingScoreColor}`}>
                          {getScoreText(housingScore)}
                        </div>
                        <div className={`col-span-1 flex items-center justify-center rounded px-1 py-0.5 ${heritageScoreColor}`}>
                          {getScoreText(heritageScore, 'heritage')}
                        </div>
                        <div className="col-span-2 flex items-center justify-center">
                          <select
                            className="border rounded px-1 py-0.5 text-xs w-full bg-white"
                            value={divestmentSelections[propertyId] || ''}
                            onChange={(e) => {
                              setDivestmentSelections(prev => ({
                                ...prev,
                                [propertyId]: e.target.value
                              }));
                            }}
                          >
                            <option value="">Select...</option>
                            <option value="PDNSW">PDNSW</option>
                            <option value="Agency">Agency</option>
                          </select>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                });
              })()
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-3">Remove Property</h3>
            <p className="mb-4">
              Are you sure you want to remove{' '}
              <span className="font-medium">
                {propertyToRemove?.properties?.copiedFrom?.site__address || 'this property'}
              </span>
              {' '}from the list?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelRemoveProperty}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemoveProperty}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Property Details Modal */}
      {detailModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-7xl w-11/12 max-h-[85vh] flex flex-col">
            <div className="p-3 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                {detailModalType === 'pdnsw' && "PDNSW Properties"}
                {detailModalType === 'agency' && "Agency Properties"}
                {detailModalType === 'tbd' && "To Be Determined Properties"}
                <span className="ml-2 text-sm text-gray-500 font-normal">
                  ({getFilteredDetailProperties().length} properties)
                </span>
              </h3>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Agency Filter */}
            {showAgencyFilter && (
              <div className="px-4 py-2 border-b">
                <div className="flex items-center mb-2">
                  <div className="text-xs font-medium mr-2">Filter by Agency:</div>
                  <button 
                    onClick={clearAgencyFilter}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Clear all filters
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                  {availableAgencies.map(agency => (
                    <label 
                      key={agency} 
                      className="flex items-center text-xs bg-gray-50 hover:bg-gray-100 px-2 py-1 rounded border cursor-pointer"
                    >
                      <input 
                        type="checkbox" 
                        className="mr-1"
                        checked={agencyFilter.includes(agency)}
                        onChange={() => handleAgencyFilterChange(agency)}
                      />
                      {agency}
                    </label>
                  ))}
                </div>
                
                {/* Summary totals when filter is applied */}
                {agencyFilter.length > 0 && (
                  <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-100">
                    <div className="font-medium text-sm text-blue-800">
                      {agencyFilter.join(', ')} Properties Summary:
                    </div>
                    <div className="flex gap-4 mt-1">
                      <div className="text-xs">
                        <span className="font-medium">Count:</span> {getFilteredPropertyTotals()?.count}
                      </div>
                      <div className="text-xs">
                        <span className="font-medium">Total Value:</span> ${getFilteredPropertyTotals()?.value.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="overflow-auto flex-grow">
              {getFilteredDetailProperties().length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No properties found in this category.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 table-fixed">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th 
                        className="w-2/12 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer group truncate"
                        onClick={() => handleDetailSort('property')}
                      >
                        <div className="flex items-center">
                          Property
                          <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {detailSortField === 'property' ? (
                              detailSortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                            ) : (
                              <ArrowDown size={12} className="opacity-30" />
                            )}
                          </span>
                        </div>
                      </th>
                      <th 
                        className="w-2/12 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer group truncate"
                        onClick={() => handleDetailSort('agency')}
                      >
                        <div className="flex items-center">
                          Agency
                          <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {detailSortField === 'agency' ? (
                              detailSortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                            ) : (
                              <ArrowDown size={12} className="opacity-30" />
                            )}
                          </span>
                        </div>
                      </th>
                      <th 
                        className="w-1/12 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer group truncate"
                        onClick={() => handleDetailSort('area')}
                      >
                        <div className="flex items-center justify-end">
                          Area
                          <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {detailSortField === 'area' ? (
                              detailSortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                            ) : (
                              <ArrowDown size={12} className="opacity-30" />
                            )}
                          </span>
                        </div>
                      </th>
                      <th 
                        className="w-1/12 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer group truncate"
                        onClick={() => handleDetailSort('value')}
                      >
                        <div className="flex items-center justify-end">
                          Value
                          <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {detailSortField === 'value' ? (
                              detailSortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                            ) : (
                              <ArrowDown size={12} className="opacity-30" />
                            )}
                          </span>
                        </div>
                      </th>
                      <th 
                        className="w-1/12 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer group truncate"
                        onClick={() => handleDetailSort('zoning')}
                      >
                        <div className="flex items-center">
                          Zone
                          <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {detailSortField === 'zoning' ? (
                              detailSortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                            ) : (
                              <ArrowDown size={12} className="opacity-30" />
                            )}
                          </span>
                        </div>
                      </th>
                      <th 
                        className="w-2/12 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer group truncate"
                        onClick={() => handleDetailSort('divestment')}
                      >
                        <div className="flex items-center">
                          Divestment By
                          <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {detailSortField === 'divestment' ? (
                              detailSortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                            ) : (
                              <ArrowDown size={12} className="opacity-30" />
                            )}
                          </span>
                        </div>
                      </th>
                      <th 
                        className="w-2/12 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer group truncate"
                        onClick={() => handleDetailSort('date')}
                      >
                        <div className="flex items-center">
                          Date
                          <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {detailSortField === 'date' ? (
                              detailSortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                            ) : (
                              <ArrowDown size={12} className="opacity-30" />
                            )}
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getFilteredDetailProperties().map((property, index) => {
                      const zoneCode = getDetailZoneCode(property.zoning);
                      const zoneColor = landZoningColors[zoneCode] || 'CCCCCC';
                      
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-xs text-gray-900 truncate">
                            {property.property}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500 truncate">
                            {property.landowningAgency}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500 text-right">
                            {formatDetailArea(property.area)}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500 text-right">
                            {formatDetailValue(property.value)}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-900">
                            <div className="flex items-center truncate">
                              {zoneCode && (
                                <div 
                                  className="w-2 h-2 mr-1 inline-block flex-shrink-0"
                                  style={{ backgroundColor: `#${zoneColor}`, border: '1px solid #ccc' }}
                                ></div>
                              )}
                              {zoneCode}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500 truncate">
                            {property.divestmentAgency}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500 truncate">
                            {formatDetailDate(property.date)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="p-3 border-t flex justify-end">
              <button 
                onClick={() => setDetailModalOpen(false)}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyTriage; 