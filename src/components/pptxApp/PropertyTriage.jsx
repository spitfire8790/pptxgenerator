import React, { useState, useEffect } from 'react';
import { ChevronLeft, BarChart3, Filter, X, MapPin, Settings, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { giraffeState, giraffe, rpc } from '@gi-nx/iframe-sdk';

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

  // Store overridden property values
  const [overriddenValues, setOverriddenValues] = useState({});
  const [editingProperty, setEditingProperty] = useState(null);
  
  // Track removed properties
  const [removedProperties, setRemovedProperties] = useState([]);
  const [propertyToRemove, setPropertyToRemove] = useState(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  
  // Track divestment selections
  const [divestmentSelections, setDivestmentSelections] = useState({});

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
    </div>
  );
};

export default PropertyTriage; 