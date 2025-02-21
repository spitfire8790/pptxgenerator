import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { councils } from "@/data/councilList";
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  MapPin, 
  Loader2, 
  HourglassIcon, 
  CheckCircle2, 
  Eye, 
  Clock, 
  XCircle, 
  AlertCircle, 
  PauseCircle, 
  History, 
  Timer,
  Scale,
  FileQuestion,
  MinusCircle,
  Home,
  Wrench,
  Building2,
  UtensilsCrossed,
  GraduationCap,
  Stethoscope,
  Dumbbell,
  Hotel,
  Factory,
  Car,
  Anchor,
  Settings,
  Map as MapIcon, // Rename Map to MapIcon
  Building,
  Briefcase,
  Hammer,
  FileText,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { format } from "date-fns";
import { ComposedChart, Line, Scatter } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Papa from 'papaparse';
import AnimatedDevLogo from './AnimatedDevLogo';
import { GeoJSON } from 'react-leaflet';
import { lgaMapping } from '../data/lgamapping';
import { LayersControl } from 'react-leaflet';
import { getPropertyBoundaries } from '../utils/propertyBoundary';
import { MapFilters } from './MapFilters';
import { renderToString } from 'react-dom/server';
import { 
  devTypesData, 
  typeMap, 
  getDevelopmentCategory, 
  developmentCategories 
} from './developmentTypes';
import { LayerControl } from "./Development/components/LayerControl";
import { VectorBasemapLayer } from 'esri-leaflet-vector';
import Dashboard from './Dashboard';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Get default date range (12 months ago to today)
 * @returns {Object} Object containing from and to dates in YYYY-MM-DD format
 */
const getDefaultDateRange = () => {
  const today = new Date();
  const twelveMonthsAgo = new Date(today);
  twelveMonthsAgo.setMonth(today.getMonth() - 12);
  
  return {
    from: twelveMonthsAgo.toISOString().split('T')[0],
    to: today.toISOString().split('T')[0]
  };
};

/**
 * Format date string to YYYY-MM-DD
 * @param {string} dateString - Date string to format
 * @returns {string|undefined} Formatted date string or undefined if input is invalid
 */
const formatDate = (dateString) => {
  if (!dateString) return undefined;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return undefined;
  return date.toISOString().split('T')[0];
};

// Added this new function for button variants
const getButtonVariant = (set, value) => {
  return set.has(value) ? "default" : "outline";
};

/**
 * Helper function to clean development types
 * @param {Array} developmentTypes - Array of development type objects
 * @returns {string} Cleaned development type
 */
const cleanDevelopmentType = (developmentTypes) => {
  if (!developmentTypes || !developmentTypes.length) return 'N/A';

  // First try to find a non-secondary type
  const primaryType = developmentTypes
    .find(dt => {
      const mapping = typeMap.get(dt.DevelopmentType);
      return mapping && !mapping.secondary;
    });

  if (primaryType) {
    const mapping = typeMap.get(primaryType.DevelopmentType);
    return mapping.newtype;
  }

  // If no primary type found, use the first mapped type (even if secondary)
  const firstMappedType = developmentTypes
    .find(dt => typeMap.has(dt.DevelopmentType));

  if (firstMappedType) {
    const mapping = typeMap.get(firstMappedType.DevelopmentType);
    return mapping.newtype;
  }

  // Fallback to first type if no mapping found
  return developmentTypes[0].DevelopmentType;
};

/**
 * Helper function to create a unique key for each development
 * @param {Object} result - Development application result
 * @returns {string} Unique key
 */
const createDevelopmentKey = (result) => {
  const address = result.Location?.[0]?.FullAddress || '';
  const applicationType = result.ApplicationType;
  return `${address}-${applicationType}`;
};

/**
 * Process and deduplicate results
 * @param {Array} results - Array of development applications
 * @returns {Array} Deduplicated results
 */
const processResults = (results) => {
  const uniqueDevelopments = new Map();

  results.forEach(result => {
    const key = createDevelopmentKey(result);
    
    // If we haven't seen this development before, or if this is a newer version
    if (!uniqueDevelopments.has(key) || 
        new Date(result.LodgementDate) > new Date(uniqueDevelopments.get(key).LodgementDate)) {
      uniqueDevelopments.set(key, result);
    }
  });

  return Array.from(uniqueDevelopments.values());
};


const createFeature = (geometry, result) => ({
  type: "Feature",
  geometry,
  properties: {
    id: result.PlanningPortalApplicationNumber,
    status: result.ApplicationStatus,
    type: result.ApplicationType,
    cost: result.CostOfDevelopment,
    address: result.Location?.[0]?.FullAddress,
    lodgementDate: result.LodgementDate,
    determinationDate: result.DeterminationDate,
    assessmentExhibitionStartDate: result.AssessmentExhibitionStartDate,
    assessmentExhibitionEndDate: result.AssessmentExhibitionEndDate,
    determinationAuthority: result.DeterminationAuthority,
    developmentCategory: result.DevelopmentType?.map(dt => dt.DevelopmentType).join(", "),
    numberOfNewDwellings: result.NumberOfNewDwellings,
    numberOfStoreys: result.NumberOfStoreys,
    accompaniedByVPA: result.AccompaniedByVPAFlag,
    developmentSubjectToSICAct: result.DevelopmentSubjectToSICFlag,
    EPIVariationProposed: result.EPIVariationProposedFlag,
    lots: result.Location?.[0]?.Lot?.map(lot => 
      `${lot.Lot}//${lot.PlanLabel}`
    ),
    lotIdString: result.LotIdString
  }
});

// Add this helper function to check if a development type is residential
const isResidentialType = (type) => {
  const mapping = typeMap.get(type);
  return mapping?.category === 'Residential Types';
};

// Update the createIconHtml function to be reusable for both markers and popups
const createIconHtml = (Icon, color, size = 'w-4 h-4') => {
  const iconHtml = renderToString(
    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white border-2" style={{ borderColor: color }}>
      <Icon className={size} style={{ color }} />
    </div>
  );
  return iconHtml;
};

// Add custom popup style
const customPopupStyle = (color) => ({
  className: 'custom-popup',
  closeButton: true,
  autoPan: true,
  style: {
    borderColor: color
  }
});

// Add this helper function at the top of your component or in a utils file
const formatDuration = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const remainingDays = days % 30;

  let duration = [];
  if (years > 0) duration.push(`${years} ${years === 1 ? 'year' : 'years'}`);
  if (months > 0) duration.push(`${months} ${months === 1 ? 'month' : 'months'}`);
  if (remainingDays > 0) duration.push(`${remainingDays} ${remainingDays === 1 ? 'day' : 'days'}`);

  return duration.join(', ');
};

/**
 * Development component for querying the Development Application (DA) API
 * Provides a user interface to search for DAs across NSW councils
 */
const Development = () => {
  const defaultDates = getDefaultDateRange();

  // State for form inputs
  const [council, setCouncil] = useState("");
  const [costFrom, setCostFrom] = useState("0");
  const [costTo, setCostTo] = useState("10000000");
  const [selectedCategories, setSelectedCategories] = useState(new Set(["Select All"]));
  const [selectedTypes, setSelectedTypes] = useState(new Set(["Select All"]));
  const [selectedStatuses, setSelectedStatuses] = useState(new Set(["Select All"]));
  const [lodgementDateFrom, setLodgementDateFrom] = useState(defaultDates.from);
  const [lodgementDateTo, setLodgementDateTo] = useState(defaultDates.to);
  const [determinationDateFrom, setDeterminationDateFrom] = useState("");
  const [determinationDateTo, setDeterminationDateTo] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isQueryVisible, setIsQueryVisible] = useState(true);
  const [isLayerLoading, setIsLayerLoading] = useState(false);
  const [columnWidths, setColumnWidths] = useState({
    address: 300,
    lots: 150,
    type: 100,
    development: 200,
    status: 150,
    lodged: 120,
    cost: 120
  });

  // Add this state for storing area data
  const [areaData, setAreaData] = useState({});

  // Add this state for storing map features
  const [mapFeatures, setMapFeatures] = useState([]);

  // Add new state to track which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  // Add this state for storing council boundary
  const [councilBoundary, setCouncilBoundary] = useState(null);

  // Add this state for storing property boundaries
  const [propertyBoundaries, setPropertyBoundaries] = useState({});

  const mapRef = useRef();

  // Add this state near other useState declarations
  const [selectedResidentialTypes, setSelectedResidentialTypes] = useState([]);

  // Add new state for filtered results
  const [filteredResults, setFilteredResults] = useState(null);

  // Add this with other state declarations (around line 530-550)
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);

  // Add this function to calculate area from geometry
  const calculateAreaFromGeometry = async (result) => {
    try {
      const response = await rpc.invoke("geometry/area", {
        geometry: result.Location?.[0]?.Geometry
      });
      
      return response?.area;
    } catch (error) {
      console.error('Error calculating area:', error);
      return null;
    }
  };

  const fetchPage = async (pageNumber, filters) => {
    try {
      console.log('Fetching page', pageNumber, 'with filters:', filters);
      
      const apiFilters = {
        CouncilName: filters.CouncilName ? [filters.CouncilName] : undefined,
        ApplicationType: filters.ApplicationType,
        DevelopmentCategory: filters.DevelopmentCategory,
        ApplicationStatus: filters.ApplicationStatus,
        CostOfDevelopmentFrom: filters.CostOfDevelopmentFrom,
        CostOfDevelopmentTo: filters.CostOfDevelopmentTo,
        LodgementDateFrom: filters.LodgementDateFrom,
        LodgementDateTo: filters.LodgementDateTo,
        DeterminationDateFrom: filters.DeterminationDateFrom,
        DeterminationDateTo: filters.DeterminationDateTo,
        ApplicationLastUpdatedFrom: "2019-02-01"
      };

      const response = await fetch('/api/eplanning/data/v0/OnlineDA', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'PageSize': '50000',
          'PageNumber': pageNumber.toString(),
          'filters': JSON.stringify({ filters: apiFilters })
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  };

  // Use the helper functions in your useMemo hooks
  const sortedResults = useMemo(() => {
    if (!searchResults) return [];
    const uniqueResults = processResults(searchResults);
    return uniqueResults.sort((a, b) => 
      new Date(b.LodgementDate) - new Date(a.LodgementDate)
    );
  }, [searchResults]);

  // Add this helper function to calculate median
  const calculateMedian = (values) => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    return sorted[middle];
  };

  // Add these helper functions for calculating statistics
  const calculateStats = (values) => {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    
    // Calculate quartiles
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    
    return {
      min: sorted[0],
      q1: sorted[q1Index],
      median: calculateMedian(sorted),
      q3: sorted[q3Index],
      max: sorted[sorted.length - 1]
    };
  };

  // Modify the chartData processing to support grouping
  const chartData = useMemo(() => {
    if (!searchResults) return { 
      byType: [], 
      totalValue: 0, 
      averageCost: [], 
      averageDays: [], 
      costPerDwelling: [] 
    };

    const uniqueResults = processResults(searchResults);
    
    // Initialize category aggregation objects
    const byCategory = {};
    const totalValueByCategory = {};
    const averageCostByCategory = {};
    const averageDaysByCategory = {};

    uniqueResults.forEach(result => {
      const category = getDevelopmentCategory(cleanDevelopmentType(result.DevelopmentType));
      
      // Initialize category objects if they don't exist
      if (!byCategory[category]) {
        byCategory[category] = {
          name: category,
          underAssessment: 0,
          determined: 0,
          onExhibition: 0,
          additionalInfoRequested: 0,
          pendingLodgement: 0,
          rejected: 0,
          pendingCourtAppeal: 0,
          withdrawn: 0,
          deferredCommencement: 0
        };
        
        totalValueByCategory[category] = {
          name: category,
          value: 0
        };
        
        averageCostByCategory[category] = {
          name: category,
          totalCost: 0,
          count: 0
        };
        
        averageDaysByCategory[category] = {
          name: category,
          totalDays: 0,
          determinedCount: 0
        };
      }

      // Update application status counts
      const status = result.ApplicationStatus?.toLowerCase().replace(/\s+/g, '');
      if (status) {
        switch(status) {
          case 'underassessment': byCategory[category].underAssessment++; break;
          case 'determined': byCategory[category].determined++; break;
          case 'onexhibition': byCategory[category].onExhibition++; break;
          case 'additionalinformationrequested': byCategory[category].additionalInfoRequested++; break;
          case 'pendinglodgement': byCategory[category].pendingLodgement++; break;
          case 'rejected': byCategory[category].rejected++; break;
          case 'pendingcourtappeal': byCategory[category].pendingCourtAppeal++; break;
          case 'withdrawn': byCategory[category].withdrawn++; break;
          case 'deferredcommencement': byCategory[category].deferredCommencement++; break;
        }
      }

      // Update total value
      if (result.CostOfDevelopment) {
        totalValueByCategory[category].value += result.CostOfDevelopment;
      }

      // Update average cost
      if (result.CostOfDevelopment) {
        averageCostByCategory[category].totalCost += result.CostOfDevelopment;
        averageCostByCategory[category].count++;
      }

      // Update average days
      if (result.DeterminationDate && result.LodgementDate) {
        const start = new Date(result.LodgementDate);
        const end = new Date(result.DeterminationDate);
        const days = Math.abs(end - start) / (1000 * 60 * 60 * 24);
        averageDaysByCategory[category].totalDays += days;
        averageDaysByCategory[category].determinedCount++;
      }
    });

    // In the chartData calculation, update the costPerDwelling calculation:
    const MIN_COST_THRESHOLD = 50000; // $50,000 minimum threshold

    const costPerDwelling = uniqueResults.reduce((acc, curr) => {
      // Check for valid cost and dwelling numbers, and ensure cost is above threshold
      if (curr.NumberOfNewDwellings > 0 && 
          curr.CostOfDevelopment > MIN_COST_THRESHOLD && 
          curr.DevelopmentType?.some(dt => isResidentialType(dt.DevelopmentType))) {
        
        const newType = typeMap.get(cleanDevelopmentType(curr.DevelopmentType))?.newtype;
        if (!newType) return acc;
        
        if (!acc[newType]) {
          acc[newType] = {
            name: newType,
            totalCost: 0,
            dwellingCount: 0,
            developments: 0 // Track number of developments for better averaging
          };
        }
        
        // Calculate cost per dwelling for this development
        const costPerDwelling = curr.CostOfDevelopment / curr.NumberOfNewDwellings;
        
        // Only include if the cost per dwelling is above threshold
        if (costPerDwelling > MIN_COST_THRESHOLD) {
          acc[newType].totalCost += curr.CostOfDevelopment;
          acc[newType].dwellingCount += curr.NumberOfNewDwellings;
          acc[newType].developments++;
        }
      }
      return acc;
    }, {});

    // Calculate final values and convert costs to millions
    const totalValue = Object.values(totalValueByCategory)
      .reduce((acc, curr) => acc + curr.value, 0) / 1000000;

    return {
      byType: Object.values(byCategory),
      totalValue,
      totalValueByCategory: Object.values(totalValueByCategory)
        .map(category => ({
          name: category.name,
          value: category.value / 1000000
        }))
        .sort((a, b) => b.value - a.value),
      averageCost: Object.values(averageCostByCategory)
        .map(category => ({
          name: category.name,
          value: category.count > 0 ? (category.totalCost / category.count) / 1000000 : 0
        }))
        .sort((a, b) => b.value - a.value),
      averageDays: Object.values(averageDaysByCategory)
        .map(category => ({
          name: category.name,
          value: category.determinedCount > 0 ? 
            Math.round(category.totalDays / category.determinedCount) : 
            0
        }))
        .filter(category => category.value > 0) // Only show categories with determined applications
        .sort((a, b) => b.value - a.value),
      costPerDwelling: Object.values(costPerDwelling)
        .map(type => ({
          name: type.name,
          value: type.totalCost / type.dwellingCount / 1000000,
          developments: type.developments // Include count for tooltip
        }))
        .filter(type => type.value > 0.05) // Filter out any remaining small values
        .sort((a, b) => b.value - a.value)
    };
  }, [searchResults]);

  // Add these click handlers
  const handleCategoryClick = (category) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (category === "Select All") {
        return new Set(["Select All"]);
      }
      newSet.delete("Select All");
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      if (newSet.size === 0) {
        return new Set(["Select All"]);
      }
      return newSet;
    });
  };

  const handleTypeClick = (type) => {
    setSelectedTypes(prev => {
      const newSet = new Set(prev);
      if (type === "Select All") {
        return new Set(["Select All"]);
      }
      newSet.delete("Select All");
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      if (newSet.size === 0) {
        return new Set(["Select All"]);
      }
      return newSet;
    });
  };

  const handleStatusClick = (status) => {
    setSelectedStatuses(prev => {
      const newSet = new Set(prev);
      if (status === "Select All") {
        return new Set(["Select All"]);
      }
      newSet.delete("Select All");
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      if (newSet.size === 0) {
        return new Set(["Select All"]);
      }
      return newSet;
    });
  };

  // Modify your search function to prepare map data during initial query
  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSearchResults(null);
    setAreaData({});
    setCouncilBoundary(null);

    try {
      // Fetch council boundary first
      if (council) {
        const geoJsonBoundary = await fetchCouncilBoundary(council);
        if (geoJsonBoundary) {
          console.log('Setting council boundary:', geoJsonBoundary);
          setCouncilBoundary(geoJsonBoundary);
        }
      }

      const filters = {
        CouncilName: council || undefined,
        ApplicationType: selectedTypes.has("Select All") ? undefined : Array.from(selectedTypes),
        DevelopmentCategory: selectedCategories.has("Select All") ? undefined : Array.from(selectedCategories),
        ApplicationStatus: selectedStatuses.has("Select All") ? undefined : Array.from(selectedStatuses),
        CostOfDevelopmentFrom: costFrom ? parseInt(costFrom) : undefined,
        CostOfDevelopmentTo: costTo ? parseInt(costTo) : undefined,
        LodgementDateFrom: formatDate(lodgementDateFrom),
        LodgementDateTo: formatDate(lodgementDateTo),
        DeterminationDateFrom: formatDate(determinationDateFrom),
        DeterminationDateTo: formatDate(determinationDateTo)
      };

      // Add retry logic
      let retries = 3;
      while (retries > 0) {
        try {
          const firstPage = await fetchPage(1, filters);
          let allResults = firstPage.Application || [];
          
          if (firstPage.TotalPages > 1) {
            console.log(`Fetching remaining ${firstPage.TotalPages - 1} pages...`);
            const pagePromises = [];
            for (let page = 2; page <= firstPage.TotalPages; page++) {
              pagePromises.push(fetchPage(page, filters));
            }

            const remainingPages = await Promise.all(pagePromises);
            remainingPages.forEach(page => {
              if (page.Application) {
                allResults = [...allResults, ...page.Application];
              }
            });
          }
          
          setSearchResults(allResults);
          break; // Success, exit retry loop
        } catch (err) {
          retries--;
          if (retries === 0) throw err;
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between retries
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to fetch development applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResize = (column, width) => {
    setColumnWidths(prev => ({
      ...prev,
      [column]: width
    }));
  };

  const ResizableColumn = ({ children, width, onResize }) => {
    const [isResizing, setIsResizing] = useState(false);
    const startX = useRef(0);
    const startWidth = useRef(0);

    const handleMouseDown = (e) => {
      setIsResizing(true);
      startX.current = e.pageX;
      startWidth.current = width;
    };

    useEffect(() => {
      const handleMouseMove = (e) => {
        if (!isResizing) return;
        const diff = e.pageX - startX.current;
        onResize(Math.max(50, startWidth.current + diff));
      };

      const handleMouseUp = () => {
        setIsResizing(false);
      };

      if (isResizing) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isResizing, onResize]);

    return (
      <th 
        className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
        style={{ width }}
      >
        {children}
        <div
          className="absolute right-0 top-0 h-full w-4 cursor-col-resize hover:bg-gray-200"
          onMouseDown={handleMouseDown}
        />
      </th>
    );
  };

  // Replace the existing handleAddToMap function with this new version
  const handleAddToMap = async () => {
    if (!searchResults?.length) return;

    setIsLayerLoading(true);
    try {
      const features = await Promise.all(searchResults.map(async result => {
        // First try to get lot polygon if lotidstring exists
        if (result.LotIdString && result.LotIdString !== "N/A") {
          const lotQuery = `${encodeURIComponent(result.LotIdString)}`;
          const url = new URL('https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Land_Parcel_Property_Theme/FeatureServer/8/query');
          url.searchParams.append('where', `lotidstring='${lotQuery}'`);
          url.searchParams.append('outFields', '*');
          url.searchParams.append('returnGeometry', 'true');
          url.searchParams.append('outSR', '4326');
          url.searchParams.append('f', 'json');

          const response = await fetch(url);
          
          if (response.ok) {
            const lotData = await response.json();
            if (lotData.features?.[0]?.geometry?.rings) {
              return createFeature({
                type: "Polygon",
                coordinates: lotData.features[0].geometry.rings
              }, result);
            }
          }
        }

        // Fallback to property lookup using coordinates
        const coords = [
          parseFloat(result.Location[0].X),
          parseFloat(result.Location[0].Y)
        ];

        try {
          const url = new URL('https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Land_Parcel_Property_Theme/FeatureServer/12/query');
          url.searchParams.append('geometry', `${coords[0]},${coords[1]}`);
          url.searchParams.append('geometryType', 'esriGeometryPoint');
          url.searchParams.append('inSR', '4326');
          url.searchParams.append('spatialRel', 'esriSpatialRelIntersects');
          url.searchParams.append('outFields', '*');
          url.searchParams.append('returnGeometry', 'true');
          url.searchParams.append('outSR', '4326');
          url.searchParams.append('f', 'json');

          const propertyResponse = await fetch(url);

          if (propertyResponse.ok) {
            const propertyData = await propertyResponse.json();
            if (propertyData.features?.[0]?.geometry?.rings) {
              return createFeature({
                type: "Polygon",
                coordinates: propertyData.features[0].geometry.rings
              }, result);
            }
          }
        } catch (error) {
          console.error('Error fetching property boundary:', error);
        }

        // If both methods fail, fall back to point geometry
        return createFeature({
          type: "Point",
          coordinates: coords
        }, result);
      }));

      const geojsonData = {
        type: "FeatureCollection",
        features: features
      };

      const LAYER_NAME = 'development_applications';

      try {
        // Create the layer without styling
        await rpc.invoke('createGeoJSONLayer', [
          LAYER_NAME,
          geojsonData,
          { 
            description: 'Development Applications'
          }
        ]);
      } catch (error) {
        console.error('Error adding layer:', error);
      } finally {
        setIsLayerLoading(false);
      }
    } catch (error) {
      console.error('Error adding layer:', error);
    } finally {
      setIsLayerLoading(false);
    }
  };

  const getBounds = (results) => {
    if (!results || results.length === 0) {
      // Default bounds for Sydney region (wider view)
      return [
        [-34.2, 150.5], // Southwest corner
        [-33.4, 151.7]  // Northeast corner
      ];
    }

    const coordinates = results
      .filter(result => result.Location?.[0]?.X && result.Location?.[0]?.Y)
      .map(result => [
        parseFloat(result.Location[0].Y),
        parseFloat(result.Location[0].X)
      ]);

    if (coordinates.length === 0) {
      return [
        [-34.2, 150.5],
        [-33.4, 151.7]
      ];
    }

    const latitudes = coordinates.map(coord => coord[0]);
    const longitudes = coordinates.map(coord => coord[1]);

    const padding = 0.1;
    return [
      [Math.min(...latitudes) - padding, Math.min(...longitudes) - padding],
      [Math.max(...latitudes) + padding, Math.max(...longitudes) + padding]
    ];
  };

  const handleCSVDownload = () => {
    if (!searchResults) return;
    
    const csvContent = searchResults.map(result => ({
      Address: result.Location?.[0]?.FullAddress || 'N/A',
      Lots: result.Location?.[0]?.Lot?.map(lot => 
        `${lot.Lot}//${lot.PlanLabel}`).join(', ') || 'N/A',
      Type: result.ApplicationType,
      Development: cleanDevelopmentType(result.DevelopmentType),
      Status: result.ApplicationStatus,
      Lodged: format(new Date(result.LodgementDate), 'dd/MM/yyyy'),
      Days: Math.floor((new Date(result.DeterminationDate || new Date()) - 
        new Date(result.LodgementDate)) / (1000 * 60 * 60 * 24)),
      Cost: result.CostOfDevelopment
    }));

    const csv = Papa.unparse(csvContent);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'development_applications.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleGeoJSONDownload = () => {
    if (!searchResults) return;
    
    const geojson = {
      type: "FeatureCollection",
      features: searchResults.map(result => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [
            parseFloat(result.Location?.[0]?.X) || 151.2093,
            parseFloat(result.Location?.[0]?.Y) || -33.8688
          ]
        },
        properties: {
          address: result.Location?.[0]?.FullAddress,
          type: result.ApplicationType,
          development: cleanDevelopmentType(result.DevelopmentType),
          status: result.ApplicationStatus,
          lodged: result.LodgementDate,
          cost: result.CostOfDevelopment
        }
      }))
    };

    const blob = new Blob([JSON.stringify(geojson)], { type: 'application/geo+json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'development_applications.geojson';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCouncilBoundary(null); // Reset boundary
    
    try {
      // First fetch the council boundary
      if (council) {
        console.log('Fetching council boundary for:', council);
        const boundary = await fetchCouncilBoundary(council);
        if (boundary) {
          console.log('Setting council boundary:', boundary);
          setCouncilBoundary(boundary);
        }
      }

      // Then fetch development applications
      const results = await fetchDevelopmentApplications();
      setSearchResults(processResults(results));
    } catch (error) {
      console.error('Search error:', error);
      setError(
        error.message.includes('timeout') 
          ? 'The search request timed out. Please try again or reduce your search criteria.'
          : 'Failed to fetch development applications. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };


const fetchCouncilBoundary = async (councilName) => {
  if (!councilName) return null;
  console.log('Fetching boundary for council:', councilName);

  const mappedName = lgaMapping[councilName];
  if (!mappedName) {
    console.log('No LGA mapping found for council:', councilName);
    return null;
  }

  const baseUrl = 'https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Administrative_Boundaries/MapServer/1/query';
  const params = new URLSearchParams({
    where: `LGANAME='${mappedName}'`,
    outFields: '*',
    returnGeometry: 'true',
    geometryType: 'esriGeometryPolygon',
    spatialRel: 'esriSpatialRelIntersects',
    outSR: '4326',
    f: 'json'
  });

  try {
    const url = `${baseUrl}?${params}`;
    console.log('Fetching from URL:', url);
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch council boundary');
    
    const data = await response.json();
    console.log('Council boundary response:', data);

    if (data.features?.length > 0) {
      const feature = data.features[0];
      // Transform ArcGIS geometry to GeoJSON format
      return {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: feature.geometry.rings
        },
        properties: feature.attributes || {}
      };
    }
    console.log('No boundary found for council');
    return null;
  } catch (error) {
    console.error('Error fetching council boundary:', error);
    return null;
  }
};

  // Add this helper function to get unique categories from results
  const getUniqueCategories = (results) => {
    if (!results) return new Set();
    
    return new Set(
      results.map(result => 
        getDevelopmentCategory(cleanDevelopmentType(result.DevelopmentType))
      ).filter(Boolean)
    );
  };

  // Add this Legend component
  const Legend = ({ categories }) => {
    return (
      <div className="leaflet-bottom leaflet-left" style={{ margin: '20px' }}>
        <div className="leaflet-control bg-white p-3 rounded-lg shadow-md">
          <h4 className="font-semibold mb-2 text-sm">Development Types</h4>
          <div className="space-y-2">
            {Array.from(categories).sort().map(category => {
              const { icon: Icon, color } = developmentCategories[category];
              return (
                <div key={category} className="flex items-center gap-2">
                  <div 
                    className="flex items-center justify-center bg-white rounded-full p-1"
                    style={{ border: `2px solid ${color}` }}
                  >
                    <Icon size={14} color={color} />
                  </div>
                  <span className="text-xs">{category}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Add this helper function to calculate days between dates
  const calculateDaysBetweenDates = (startDate, endDate) => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <AnimatedDevLogo />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">NSW Development Applications</h1>
              <p className="text-sm text-gray-600">
                Data sourced from the NSW Government's <a href="https://www.planningportal.nsw.gov.au/opendata/dataset/online-da-data-api" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Online Development Application API</a>
              </p>
            </div>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] w-[90vw] h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Development Dashboard</DialogTitle>
              </DialogHeader>
              <Dashboard />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Search and Results */}
        <div className={`${isLeftPanelCollapsed ? 'w-12' : 'w-2/5'} relative transition-all duration-300 ease-in-out border-r border-gray-200`}>
          {/* Collapse button */}
          <button
            onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
            className="absolute -right-3 top-2 z-10 bg-white border border-gray-200 rounded-full p-1 shadow-md hover:bg-gray-50"
          >
            {isLeftPanelCollapsed ? (
              <ChevronRight className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            )}
          </button>
          
          {/* Content container */}
          <div className={`${isLeftPanelCollapsed ? 'hidden' : 'block'} h-[calc(100vh-4rem)] overflow-y-auto`}>
            <div className="p-6">
              {/* Existing content */}
              {isQueryVisible && (
                <form onSubmit={handleSearch} className="space-y-6 mb-6">
                  <div>
                    <label className="font-medium">Council Name</label>
                    <div className="mt-1">
                      <Combobox
                        options={councils}
                        value={council}
                        onChange={setCouncil}
                        placeholder="Select a council"
                        emptyText="No matching councils found"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-medium">Development Category</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button
                        type="button"
                        variant={getButtonVariant(selectedCategories, "Select All")}
                        onClick={() => handleCategoryClick("Select All")}
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant={getButtonVariant(selectedCategories, "Residential")}
                        onClick={() => handleCategoryClick("Residential")}
                        className="gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                        </svg>
                        Residential
                      </Button>
                      <Button
                        type="button"
                        variant={getButtonVariant(selectedCategories, "Commercial")}
                        onClick={() => handleCategoryClick("Commercial")}
                        className="gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm3 1h6v4H7V5z" clipRule="evenodd" />
                        </svg>
                        Commercial
                      </Button>
                      <Button
                        type="button"
                        variant={getButtonVariant(selectedCategories, "Industrial")}
                        onClick={() => handleCategoryClick("Industrial")}
                        className="gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-5L9 4H4zm7 5a1 1 0 10-2 0v1H8a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                        </svg>
                        Industrial
                      </Button>
                      <Button
                        type="button"
                        variant={getButtonVariant(selectedCategories, "Recreational")}
                        onClick={() => handleCategoryClick("Recreational")}
                        className="gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        Recreational
                      </Button>
                      <Button
                        type="button"
                        variant={getButtonVariant(selectedCategories, "Other")}
                        onClick={() => handleCategoryClick("Other")}
                        className="gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        Other
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="font-medium">Application Type</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button
                        type="button"
                        variant={getButtonVariant(selectedTypes, "Select All")}
                        onClick={() => handleTypeClick("Select All")}
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant={getButtonVariant(selectedTypes, "Development Application")}
                        onClick={() => handleTypeClick("Development Application")}
                      >
                        Development Application
                      </Button>
                      <Button
                        type="button"
                        variant={getButtonVariant(selectedTypes, "Modification Application")}
                        onClick={() => handleTypeClick("Modification Application")}
                      >
                        Modification Application
                      </Button>
                      <Button
                        type="button"
                        variant={getButtonVariant(selectedTypes, "Review of Determination")}
                        onClick={() => handleTypeClick("Review of Determination")}
                      >
                        Review of Determination
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="font-medium">Application Status</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button
                        type="button"
                        variant={getButtonVariant(selectedStatuses, "Select All")}
                        onClick={() => handleStatusClick("Select All")}
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant={getButtonVariant(selectedStatuses, "Under Assessment")}
                        onClick={() => handleStatusClick("Under Assessment")}
                        className="gap-2"
                      >
                        <HourglassIcon className="h-4 w-4" />
                        Under Assessment
                      </Button>
                      <Button
                        type="button"
                        variant={getButtonVariant(selectedStatuses, "Determined")}
                        onClick={() => handleStatusClick("Determined")}
                        className="gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Determined
                      </Button>
                      <Button
                        type="button"
                        variant={getButtonVariant(selectedStatuses, "On Exhibition")}
                        onClick={() => handleStatusClick("On Exhibition")}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        On Exhibition
                      </Button>
                      <Button
                        type="button"
                        variant={getButtonVariant(selectedStatuses, "Additional Information Requested")}
                        onClick={() => handleStatusClick("Additional Information Requested")}
                        className="gap-2"
                      >
                        <FileQuestion className="h-4 w-4" />
                        Additional Information Requested
                      </Button>
                      <Button
                        type="button"
                        variant={getButtonVariant(selectedStatuses, "Pending Lodgement")}
                        onClick={() => handleStatusClick("Pending Lodgement")}
                        className="gap-2"
                      >
                        <Clock className="h-4 w-4" />
                        Pending Lodgement
                      </Button>
                      <Button
                        type="button"
                        variant={getButtonVariant(selectedStatuses, "Rejected")}
                        onClick={() => handleStatusClick("Rejected")}
                        className="gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Rejected
                      </Button>
                      <Button
                        type="button"
                        variant={getButtonVariant(selectedStatuses, "Pending Court Appeal")}
                        onClick={() => handleStatusClick("Pending Court Appeal")}
                        className="gap-2"
                      >
                        <Scale className="h-4 w-4" />
                        Pending Court Appeal
                      </Button>
                      <Button
                        type="button"
                        variant={getButtonVariant(selectedStatuses, "Withdrawn")}
                        onClick={() => handleStatusClick("Withdrawn")}
                        className="gap-2"
                      >
                        <MinusCircle className="h-4 w-4" />
                        Withdrawn
                      </Button>
                      <Button
                        type="button"
                        variant={getButtonVariant(selectedStatuses, "Deferred Commencement")}
                        onClick={() => handleStatusClick("Deferred Commencement")}
                        className="gap-2"
                      >
                        <PauseCircle className="h-4 w-4" />
                        Deferred Commencement
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="font-medium">Cost of Development ($ millions)</label>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex-1">
                        <label className="text-sm text-gray-600">From:</label>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md">
                            $
                          </span>
                          <Input
                            type="text"
                            value={(Number(costFrom) / 1000000).toFixed(1)}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9.]/g, '');
                              setCostFrom(Math.round(parseFloat(value) * 1000000));
                            }}
                            className="rounded-l-none"
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="text-sm text-gray-600">To:</label>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md">
                            $
                          </span>
                          <Input
                            type="text"
                            value={(Number(costTo) / 1000000).toFixed(1)}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9.]/g, '');
                              setCostTo(Math.round(parseFloat(value) * 1000000));
                            }}
                            className="rounded-l-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="font-medium">Lodgement Date From</label>
                      <Input
                        type="date"
                        value={lodgementDateFrom}
                        onChange={(e) => setLodgementDateFrom(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="font-medium">Lodgement Date To</label>
                      <Input
                        type="date"
                        value={lodgementDateTo}
                        onChange={(e) => setLodgementDateTo(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="font-medium">Determination Date From (optional)</label>
                      <Input
                        type="date"
                        value={determinationDateFrom}
                        onChange={(e) => setDeterminationDateFrom(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="font-medium">Determination Date To (optional)</label>
                      <Input
                        type="date"
                        value={determinationDateTo}
                        onChange={(e) => setDeterminationDateTo(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      className="flex items-center gap-2" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4" />
                          Search
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCSVDownload}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Download CSV
                    </Button>
                    <Button
                      type="button"
                      onClick={handleGeoJSONDownload}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Download GeoJSON
                    </Button>
                  </div>

                  {searchResults && searchResults.length > 0 && (
                    <div className="mb-4 relative">





                      {isLayerLoading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded">
                          <div className="flex items-center gap-2 text-blue-600">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="font-medium">Building layer...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </form>
              )}

              {/* Results */}
              {!loading && searchResults && (
                <>
                  <Card className="p-4 mt-6">
                    <h3 className="text-lg font-semibold mb-4">Applications by Development Type</h3>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={chartData.byType.map(item => ({
                            name: item.name,
                            total: item.underAssessment + item.determined + item.onExhibition + 
                                   item.additionalInfoRequested + item.pendingLodgement + item.rejected + 
                                   item.pendingCourtAppeal + item.withdrawn + item.deferredCommencement
                          })).sort((a, b) => b.total - a.total)}
                          margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 50
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end" 
                            height={100} 
                            interval={0}
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => value.length > 25 ? value.substring(0, 25) + '...' : value}
                          />
                          <YAxis />
                          <Tooltip />
                          <Bar 
                            name="Total Applications" 
                            dataKey="total"
                          >
                            {/* Map the colors based on the name in the sorted data */}
                            {chartData.byType.map(item => ({
                              name: item.name,
                              total: item.underAssessment + item.determined + item.onExhibition + 
                                     item.additionalInfoRequested + item.pendingLodgement + item.rejected + 
                                     item.pendingCourtAppeal + item.withdrawn + item.deferredCommencement
                            }))
                            .sort((a, b) => b.total - a.total)
                            .map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={developmentCategories[entry.name]?.color || '#4F46E5'} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card className="p-4 mt-6">
                    <h3 className="text-lg font-semibold mb-4">
                      Total Value by Development Type - Total ${chartData.totalValue.toFixed(1)} million
                    </h3>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.totalValueByCategory}
                        margin={{ top: 20, right: 30, left: 20, bottom: 50 }} 
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end" 
                            height={100} 
                            interval={0} 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => value.length > 25 ? value.substring(0, 25) + '...' : value}
                          />
                          <YAxis />
                          <Tooltip formatter={(value) => `$${value.toFixed(1)}M`} />
                            <Bar dataKey="value">
                              {chartData.totalValueByCategory.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={developmentCategories[entry.name]?.color || '#4F46E5'} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>

                    <Card className="p-4 mt-6">
                      <h3 className="text-lg font-semibold mb-4">Average Cost by Development Type ($ millions)</h3>
                      <div className="w-full">
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart data={chartData.averageCost}
                            margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                              dataKey="name" 
                              angle={-45} 
                              textAnchor="end" 
                              height={100} 
                              interval={0} 
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) => value.length > 25 ? value.substring(0, 25) + '...' : value}
                            />
                            <YAxis />
                            <Tooltip formatter={(value) => `$${value.toFixed(1)}M`} />
                            <Bar dataKey="value">
                              {chartData.averageCost.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={developmentCategories[entry.name]?.color || '#4F46E5'} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>

                    <Card className="p-4 mt-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Average Days to Determination by Development Type
                      </h3>
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData.averageDays}
                          margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                              dataKey="name" 
                              angle={-45} 
                              textAnchor="end" 
                              height={100} 
                              interval={0} 
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) => value.length > 25 ? value.substring(0, 25) + '...' : value}
                            />
                            <YAxis />
                            <Tooltip formatter={(value) => `${Math.round(value)} days`} />
                            <Bar dataKey="value">
                              {chartData.averageDays.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={developmentCategories[entry.name]?.color || '#4F46E5'} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>

                    <Card className="p-4 mt-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Average Cost per Dwelling by Development Type ($ millions)
                      </h3>
                      <div className="w-full">
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart 
                            data={chartData.costPerDwelling}
                            margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="name" 
                              angle={-45} 
                              textAnchor="end" 
                              height={100} 
                              interval={0} 
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) => value.length > 25 ? value.substring(0, 25) + '...' : value}
                            />
                            <YAxis 
                              tickFormatter={(value) => `$${value.toFixed(1)}M`}
                            />
                            <Tooltip 
                              formatter={(value, name, props) => [
                                `$${value.toFixed(1)}M per dwelling`,
                                `Development Type: ${props.payload.name} (${props.payload.developments} developments)`
                              ]}
                            />
                            <Bar dataKey="value">
                              {chartData.costPerDwelling.map((entry, index) => {
                                const category = getDevelopmentCategory(entry.name);
                                return (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={developmentCategories[category]?.color || '#4F46E5'} 
                                  />
                                );
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="text-sm text-gray-500 mt-2">
                        Only showing types with 3+ developments.
                      </div>
                    </Card>

                    <div className="mt-6">
                      <h2 className="text-lg font-semibold mb-4">
                        Search Results ({sortedResults.length} applications found)
                      </h2>
                      <div className="bg-white rounded-lg shadow max-w-full">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="bg-gray-50">
                              <tr>
                                <ResizableColumn 
                                  width={columnWidths.address} 
                                  onResize={(width) => handleResize('address', width)}
                                >
                                  Address
                                </ResizableColumn>
                                <ResizableColumn 
                                  width={columnWidths.lots}
                                  onResize={(width) => handleResize('lots', width)}
                                >
                                  Lots
                                </ResizableColumn>
                                <ResizableColumn 
                                  width={columnWidths.type}
                                  onResize={(width) => handleResize('type', width)}
                                >
                                  Type
                                </ResizableColumn>
                                <ResizableColumn 
                                  width={columnWidths.development}
                                  onResize={(width) => handleResize('development', width)}
                                >
                                  Development
                                </ResizableColumn>
                                <ResizableColumn 
                                  width={columnWidths.status}
                                  onResize={(width) => handleResize('status', width)}
                                >
                                  Status
                                </ResizableColumn>
                                <ResizableColumn 
                                  width={columnWidths.lodged}
                                  onResize={(width) => handleResize('lodged', width)}
                                >
                                  Lodged
                                </ResizableColumn>
                                <ResizableColumn 
                                  width={columnWidths.cost}
                                  onResize={(width) => handleResize('cost', width)}
                                >
                                  <div className="text-right">Cost</div>
                                </ResizableColumn>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {sortedResults.map((result, index) => (
                                <tr key={result.PlanningPortalApplicationNumber || index}>
                                  <td style={{ width: columnWidths.address }} className="px-2 py-2 text-gray-900 break-words text-xs">
                                    {result.Location?.[0]?.FullAddress || 'N/A'}
                                  </td>
                                  <td style={{ width: columnWidths.lots }} className="px-2 py-2 text-gray-900 break-words text-xs">
                                    {result.Location?.[0]?.Lot?.map((lot, index) => (
                                      <span key={index}>
                                        {lot.Lot && lot.PlanLabel 
                                          ? `${lot.Lot}//${lot.PlanLabel}`
                                          : lot.Lot}
                                        {index < result.Location[0].Lot.length - 1 ? ', ' : ''}
                                      </span>
                                    )) || 'N/A'}
                                  </td>
                                  <td style={{ width: columnWidths.type }} className="px-2 py-2 text-gray-900 break-words text-xs">
                                    {result.ApplicationType === "Development Application" ? "DA" :
                                     result.ApplicationType === "Modification Application" ? "MOD" :
                                     result.ApplicationType === "Review of Determination" ? "Review" : 
                                     result.ApplicationType}
                                  </td>
                                  <td style={{ width: columnWidths.development }} className="px-2 py-2 text-gray-900 break-words text-xs">
                                    {cleanDevelopmentType(result.DevelopmentType)}
                                  </td>
                                  <td style={{ width: columnWidths.status }} className="px-2 py-2 text-gray-900 break-words text-xs">
                                    {result.ApplicationStatus}
                                  </td>
                                  <td style={{ width: columnWidths.lodged }} className="px-2 py-2 text-gray-900 whitespace-nowrap text-xs">
                                    {format(new Date(result.LodgementDate), 'dd MMM yyyy')}
                                  </td>
                                  <td style={{ width: columnWidths.cost }} className="px-2 py-2 text-gray-900 text-right text-xs">
                                    ${result.CostOfDevelopment?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Map */}
          <div className={`${isLeftPanelCollapsed ? 'w-[calc(100%-3rem)]' : 'w-3/5'} transition-all duration-300 ease-in-out`}>
            <div className="map-container relative h-screen">
              <MapContainer 
                center={[-33.8688, 151.2093]}
                zoom={10}
                bounds={searchResults?.length > 0 ? getBounds(searchResults) : undefined}
                className="h-full w-full"
                scrollWheelZoom={true}
              >
                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name="OpenStreetMap">
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="NSW Imagery">
                    <TileLayer
                      url="https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Imagery/MapServer/tile/{z}/{y}/{x}"
                      attribution='&copy; NSW Department of Customer Service (Spatial Services), 2024'
                      maxZoom={20}
                    />
                  </LayersControl.BaseLayer>
                </LayersControl>
                <LayerControl />
                <MapFilters 
                  selectedTypes={selectedResidentialTypes}
                  setSelectedTypes={setSelectedResidentialTypes}
                  searchResults={searchResults}
                  setFilteredResults={setFilteredResults}
                  cleanDevelopmentType={cleanDevelopmentType}
                />
                {councilBoundary && (
                  <GeoJSON 
                    key={council} // Add this line to force re-render
                    data={councilBoundary}
                    style={{
                      color: '#ff0000',
                      weight: 4,
                      fillOpacity: 0,
                    }}
                    eventHandlers={{
                      add: (e) => {
                        console.log('GeoJSON added to map');
                        const map = e.target._map;
                        try {
                          const bounds = e.target.getBounds();
                          console.log('Fitting to bounds:', bounds);
                          map.fitBounds(bounds, { padding: [50, 50] });
                        } catch (error) {
                          console.error('Error fitting to bounds:', error);
                        }
                      }
                    }}
                  />
                )}
                {filteredResults?.map(result => {
                  if (!result.Location?.[0]?.X || !result.Location?.[0]?.Y) return null;
                  
                  const category = getDevelopmentCategory(cleanDevelopmentType(result.DevelopmentType));
                  const { icon: Icon, color } = developmentCategories[category] || 
                    developmentCategories['Miscellaneous and Administrative'];
                  
                  return (
                    <Marker
                      key={result.PlanningPortalApplicationNumber}
                      position={[parseFloat(result.Location[0].Y), parseFloat(result.Location[0].X)]}
                      icon={L.divIcon({
                        className: 'custom-div-icon',
                        html: createIconHtml(Icon, color),
                        iconSize: [28, 28],
                        iconAnchor: [14, 14]
                      })}
                    >
                      <Popup
                        className="custom-popup"
                        closeButton={true}
                        autoPan={true}
                      >
                        <div 
                          className="custom-popup-content border-2 rounded-lg p-3 bg-white"
                          style={{ 
                            borderColor: color,
                            width: 'auto',
                            minWidth: '400px',
                            maxWidth: '600px'
                          }}
                        >
                          <div className="text-sm">
                            <div className="font-semibold text-base mb-3 border-b pb-2">
                              {result.Location?.[0]?.FullAddress}
                            </div>
                            
                            <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2">
                              <span className="text-gray-600">Application Number:</span>
                              <span>{result.PlanningPortalApplicationNumber}</span>
                              
                              <span className="text-gray-600">Type:</span>
                              <span>{result.ApplicationType}</span>
                              
                              <span className="text-gray-600">Development:</span>
                              <span>{cleanDevelopmentType(result.DevelopmentType)}</span>
                              
                              <span className="text-gray-600">Status:</span>
                              <span>{result.ApplicationStatus}</span>
                              
                              <span className="text-gray-600">Number of New Dwellings:</span>
                              <span>{result.NumberOfNewDwellings || 0}</span>
                              
                              <span className="text-gray-600">Lodgement Date:</span>
                              <span>{format(new Date(result.LodgementDate), 'dd MMMM yyyy')}</span>
                              
                              <span className="text-gray-600">Determination Date:</span>
                              <span>{result.DeterminationDate ? format(new Date(result.DeterminationDate), 'dd MMMM yyyy') : '-'}</span>
                              
                              <span className="text-gray-600">Time to Determination:</span>
                              <span>{result.DeterminationDate ? formatDuration(result.LodgementDate, result.DeterminationDate) : '-'}</span>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
                
                {filteredResults && (
                  <Legend categories={getUniqueCategories(filteredResults)} />
                )}
              </MapContainer>
            </div>
          </div>
        </div>
      </div>

  );
};

export default Development;
