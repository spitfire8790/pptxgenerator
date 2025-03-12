import React, { useState, useEffect } from 'react';
import { Calculator, Banknote, X } from 'lucide-react';
import FeasibilitySettings from './FeasibilitySettings';
import MedianPriceModal from './MedianPriceModal';
import ConstructionDataModal from './ConstructionDataModal';
import DwellingSizeModal from './DwellingSizeModal';
import { lgaMapping } from '../utils/map/utils/councilLgaMapping';
import { getAllPermissibleHousingTypes } from '../utils/lmrPermissibility';

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

// Cost thresholds for validation (in AUD)
const MIN_COST_PER_M2 = 1000; // $1,000 per m²
const MAX_COST_PER_M2 = 10000; // $10,000 per m²
const MIN_GFA = 30; // 30m² minimum GFA

// Helper function to check if any of the development types are of the specified density
const hasMatchingDensityType = (developmentTypes, densityTypes) => {
  if (!developmentTypes || !Array.isArray(developmentTypes)) return false;
  return developmentTypes.some(type => densityTypes.includes(type.DevelopmentType));
};

const FeasibilityManager = ({ settings, onSettingChange, salesData, open, onClose, selectedFeature, map, developableArea = null }) => {
  const [showMedianPrices, setShowMedianPrices] = useState(false);
  const [showConstructionData, setShowConstructionData] = useState(false);
  const [showDwellingSizeData, setShowDwellingSizeData] = useState(false);
  const [constructionData, setConstructionData] = useState({
    mediumDensity: null,
    highDensity: null,
    dwellingSizes: {
      mediumDensity: null,
      highDensity: null
    },
    loading: true,
    error: null
  });
  
  // Add state for tracking customized values
  const [customizedValues, setCustomizedValues] = useState({
    dwellingPrice: {
      mediumDensity: false,
      highDensity: false
    },
    dwellingSize: {
      mediumDensity: false,
      highDensity: false
    },
    constructionCostM2: {
      mediumDensity: false,
      highDensity: false
    }
  });
  
  // Add state for LMR options
  const [lmrOptions, setLmrOptions] = useState({
    isInLMRArea: false,
    loading: false,
    error: null,
    housingOptions: [],
    selectedOptions: {
      mediumDensity: null,
      highDensity: null
    }
  });

  // Add this after the state declarations
  const [calculationResults, setCalculationResults] = useState({
    current: {
      mediumDensity: null,
      highDensity: null
    },
    lmr: {
      mediumDensity: null,
      highDensity: null
    }
  });

  const calculateMedianCost = (certificates, densityTypes) => {
    if (!certificates?.length) return null;

    // Filter for relevant development types and valid data
    const validCertificates = certificates.filter(cert => 
      hasMatchingDensityType(cert.DevelopmentType, densityTypes) &&
      cert.CostOfDevelopment &&
      cert.ProposedGrossFloorArea &&
      cert.ProposedGrossFloorArea >= MIN_GFA
    );

    if (!validCertificates.length) return null;

    // Calculate cost per m² for each valid certificate
    const costPerM2List = validCertificates
      .map(cert => ({
        cost: cert.CostOfDevelopment / cert.ProposedGrossFloorArea,
        gfa: cert.ProposedGrossFloorArea
      }))
      .filter(({ cost }) => cost >= MIN_COST_PER_M2 && cost <= MAX_COST_PER_M2);

    if (!costPerM2List.length) return null;

    // Calculate weighted median based on GFA
    const totalGFA = costPerM2List.reduce((sum, { gfa }) => sum + gfa, 0);
    const halfTotalGFA = totalGFA / 2;

    // Sort by cost per m²
    costPerM2List.sort((a, b) => a.cost - b.cost);

    // Find weighted median
    let cumulativeGFA = 0;
    for (const item of costPerM2List) {
      cumulativeGFA += item.gfa;
      if (cumulativeGFA >= halfTotalGFA) {
        return item.cost;
      }
    }

    // Fallback to simple median if weighted calculation fails
    return costPerM2List[Math.floor(costPerM2List.length / 2)].cost;
  };

  const calculateMedianDwellingSize = (certificates, densityTypes, bedroomCount = 2) => {
    if (!certificates?.length) return null;

    console.log(`Calculating median dwelling size for density types with ${bedroomCount} bedrooms:`, densityTypes);

    // Filter for relevant development types and valid data
    // Also filter for 2-bedroom dwellings when bedroom data is available
    const validCertificates = certificates.filter(cert => {
      const isRelevantType = hasMatchingDensityType(cert.DevelopmentType, densityTypes);
      const hasValidData = cert.ProposedGrossFloorArea && 
                          cert.UnitsProposed && 
                          cert.UnitsProposed > 0 && 
                          cert.ProposedGrossFloorArea >= MIN_GFA;
      
      // Check if this is the proper bedroom count if data available
      const hasCorrectBedroomCount = !cert.Bedrooms || 
                                    cert.Bedrooms.some(bed => bed.BedroomCount === bedroomCount);

      if (isRelevantType && !hasValidData) {
        console.log('Certificate excluded due to invalid data:', {
          developmentType: cert.DevelopmentType?.map(t => t.DevelopmentType).join(', '),
          gfa: cert.ProposedGrossFloorArea,
          units: cert.UnitsProposed
        });
      }

      return isRelevantType && hasValidData && hasCorrectBedroomCount;
    });

    console.log(`Found ${validCertificates.length} valid certificates with ${bedroomCount} bedrooms for dwelling size calculation`);
    console.log('Valid certificates:', validCertificates.map(cert => ({
      type: cert.DevelopmentType?.map(t => t.DevelopmentType).join(', '),
      gfa: cert.ProposedGrossFloorArea,
      units: cert.UnitsProposed,
      gfaPerDwelling: cert.ProposedGrossFloorArea / cert.UnitsProposed,
      bedrooms: cert.Bedrooms?.map(bed => bed.BedroomCount) || 'unknown'
    })));

    if (!validCertificates.length) {
      // If no 2-bedroom dwellings, fall back to any valid data
      return calculateMedianDwellingSize(certificates, densityTypes, null);
    }

    // Calculate GFA per dwelling for each valid certificate
    const gfaPerDwellingList = validCertificates
      .map(cert => ({
        gfaPerDwelling: cert.ProposedGrossFloorArea / cert.UnitsProposed,
        units: cert.UnitsProposed,
        type: cert.DevelopmentType?.map(t => t.DevelopmentType).join(', '),
        bedrooms: cert.Bedrooms?.map(bed => bed.BedroomCount) || 'unknown'
      }))
      .filter(({ gfaPerDwelling }) => {
        const isValid = gfaPerDwelling >= MIN_GFA;
        if (!isValid) {
          console.log('Excluded dwelling due to small GFA:', {
            gfaPerDwelling,
            minRequired: MIN_GFA
          });
        }
        return isValid;
      });

    console.log('GFA per dwelling list:', gfaPerDwellingList);

    if (!gfaPerDwellingList.length) return null;

    // Calculate weighted median based on number of units
    const totalUnits = gfaPerDwellingList.reduce((sum, { units }) => sum + units, 0);
    const halfTotalUnits = totalUnits / 2;

    console.log('Total units:', totalUnits);
    console.log('Half total units:', halfTotalUnits);

    // Sort by GFA per dwelling
    gfaPerDwellingList.sort((a, b) => a.gfaPerDwelling - b.gfaPerDwelling);

    // Find weighted median
    let cumulativeUnits = 0;
    let medianValue = null;
    for (const item of gfaPerDwellingList) {
      cumulativeUnits += item.units;
      console.log('Cumulative units:', cumulativeUnits, 'Current GFA:', item.gfaPerDwelling, 'Type:', item.type, 'Bedrooms:', item.bedrooms);
      if (cumulativeUnits >= halfTotalUnits && !medianValue) {
        medianValue = item.gfaPerDwelling;
        console.log('Found median value:', medianValue, 'from type:', item.type, 'Bedrooms:', item.bedrooms);
        break;
      }
    }

    if (medianValue) return medianValue;

    // Fallback to simple median if weighted calculation fails
    const simpleMedian = gfaPerDwellingList[Math.floor(gfaPerDwellingList.length / 2)].gfaPerDwelling;
    console.log('Using fallback simple median:', simpleMedian);
    return simpleMedian;
  };

  // Function to get sales data for specific bedroom count
  const getSalesDataForBedroomCount = (salesData, densityTypes, bedroomCount = 2) => {
    if (!salesData?.length) return [];

    // Filter sales data for specified property types and bedroom count
    const filteredSales = salesData.filter(sale => {
      const propertyType = sale.property_type?.toLowerCase().trim();
      const typeMatches = densityTypes.some(type => propertyType?.includes(type.toLowerCase()));
      const bedroomMatches = sale.bedrooms === bedroomCount.toString();
      return typeMatches && bedroomMatches;
    });

    return filteredSales;
  };

  // Add function to fetch LMR data
  const fetchLMRData = async (propertyData) => {
    if (!propertyData || !propertyData.properties) {
      return;
    }
    
    try {
      setLmrOptions(prev => ({ ...prev, loading: true, error: null }));
      
      // Check if property is in LMR area
      const isInLMRArea = propertyData.properties.isInLMRArea || 
                          (propertyData.properties.copiedFrom && 
                           propertyData.properties.copiedFrom.isInLMRArea);
      
      console.log('LMR status check:', { isInLMRArea });
      
      if (!isInLMRArea) {
        setLmrOptions({
          isInLMRArea: false,
          loading: false,
          error: null,
          housingOptions: [],
          selectedOptions: {
            mediumDensity: null,
            highDensity: null
          }
        });
        return;
      }
      
      // Get permissible housing types
      const housingOptions = await getAllPermissibleHousingTypes(propertyData.properties);
      console.log('LMR housing options:', housingOptions);
      
      // Find best options for each density type
      const mediumDensityOptions = housingOptions.filter(option => 
        ['Dual Occupancy', 'Multi Dwelling Housing', 'Multi Dwelling Housing (Terraces)']
          .includes(option.type) && option.isPermissible
      );
      
      const highDensityOptions = housingOptions.filter(option => 
        ['Residential Flat Buildings'].includes(option.type) && option.isPermissible
      );
      
      // Sort by potential FSR (highest first)
      mediumDensityOptions.sort((a, b) => {
        // For RFB with ranges, use the max value
        const aFSR = a.fsrRange ? a.fsrRange.max : a.potentialFSR;
        const bFSR = b.fsrRange ? b.fsrRange.max : b.potentialFSR;
        return bFSR - aFSR;
      });
      
      highDensityOptions.sort((a, b) => {
        // For RFB with ranges, use the max value
        const aFSR = a.fsrRange ? a.fsrRange.max : a.potentialFSR;
        const bFSR = b.fsrRange ? b.fsrRange.max : b.potentialFSR;
        return bFSR - aFSR;
      });
      
      // Select best options (highest FSR)
      const bestMediumDensityOption = mediumDensityOptions.length > 0 ? mediumDensityOptions[0] : null;
      const bestHighDensityOption = highDensityOptions.length > 0 ? highDensityOptions[0] : null;
      
      setLmrOptions({
        isInLMRArea,
        loading: false,
        error: null,
        housingOptions,
        allOptions: {
          mediumDensity: mediumDensityOptions,
          highDensity: highDensityOptions
        },
        selectedOptions: {
          mediumDensity: bestMediumDensityOption,
          highDensity: bestHighDensityOption
        }
      });
      
    } catch (error) {
      console.error('Error fetching LMR data:', error);
      setLmrOptions(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to fetch LMR data'
      }));
    }
  };

  // Function to prepare raw data for the modal display
  const prepareRawConstructionData = (certificates) => {
    if (!certificates?.length) return { dwellingSizes: [], constructionCosts: [] };

    // Extract dwelling size data
    const dwellingSizes = certificates.filter(cert => 
      cert.ProposedGrossFloorArea && 
      cert.UnitsProposed && 
      cert.UnitsProposed > 0 && 
      cert.ProposedGrossFloorArea >= MIN_GFA &&
      (hasMatchingDensityType(cert.DevelopmentType, MEDIUM_DENSITY_TYPES) || 
       hasMatchingDensityType(cert.DevelopmentType, HIGH_DENSITY_TYPES))
    ).flatMap(cert => {
      // Extract the development type
      let developmentType = 'Unknown';
      if (cert.DevelopmentType && Array.isArray(cert.DevelopmentType) && cert.DevelopmentType.length > 0) {
        developmentType = cert.DevelopmentType[0].DevelopmentType;
        // Convert from UPPER_CASE to Title Case
        developmentType = developmentType.split('_')
          .map(word => word.charAt(0) + word.slice(1).toLowerCase())
          .join(' ');
      }
      
      // Extract the address and location data
      let address = 'Unknown';
      let location = null;
      if (cert.Location && Array.isArray(cert.Location) && cert.Location.length > 0) {
        if (cert.Location[0].FullAddress) {
          address = cert.Location[0].FullAddress;
        }
        location = cert.Location; // Preserve the entire Location array
      } else if (cert.SiteAddress) {
        address = cert.SiteAddress;
      }

      // Extract bedroom distribution if available
      if (cert.BedroomDistribution && Array.isArray(cert.BedroomDistribution)) {
        return cert.BedroomDistribution.map(bedroom => ({
          id: `${cert.EplanningId}-${bedroom.BedroomType}`,
          developmentType: developmentType,
          bedrooms: parseInt(bedroom.BedroomType.replace(/[^0-9]/g, ''), 10) || 0,
          dwellingSize: cert.ProposedGrossFloorArea / cert.UnitsProposed,
          lga: cert.CouncilName || 'Unknown',
          address: address,
          gfa: cert.ProposedGrossFloorArea,
          units: cert.UnitsProposed,
          Location: location  // Include Location data
        }));
      } else {
        // If no bedroom distribution, use average size
        return [{
          id: cert.EplanningId,
          developmentType: developmentType,
          bedrooms: 2, // Default to 2 bedrooms when not specified
          dwellingSize: cert.ProposedGrossFloorArea / cert.UnitsProposed,
          lga: cert.CouncilName || 'Unknown',
          address: address,
          gfa: cert.ProposedGrossFloorArea,
          units: cert.UnitsProposed,
          Location: location  // Include Location data
        }];
      }
    });

    // Extract construction cost data
    const constructionCosts = certificates.filter(cert => 
      cert.CostOfDevelopment && 
      cert.ProposedGrossFloorArea && 
      cert.ProposedGrossFloorArea >= MIN_GFA &&
      (hasMatchingDensityType(cert.DevelopmentType, MEDIUM_DENSITY_TYPES) || 
       hasMatchingDensityType(cert.DevelopmentType, HIGH_DENSITY_TYPES))
    ).map(cert => {
      const costPerM2 = cert.CostOfDevelopment / cert.ProposedGrossFloorArea;
      // Only include costs within reasonable range
      if (costPerM2 < MIN_COST_PER_M2 || costPerM2 > MAX_COST_PER_M2) return null;
      
      // Extract the address from Location if available, fallback to SiteAddress
      let address = 'Unknown';
      if (cert.Location && Array.isArray(cert.Location) && cert.Location.length > 0 && cert.Location[0].FullAddress) {
        address = cert.Location[0].FullAddress;
      } else if (cert.SiteAddress) {
        address = cert.SiteAddress;
      }
      
      // Format the development type
      let developmentType = 'Unknown';
      if (cert.DevelopmentType && Array.isArray(cert.DevelopmentType) && cert.DevelopmentType.length > 0) {
        developmentType = cert.DevelopmentType[0].DevelopmentType;
        // Convert from UPPER_CASE to Title Case
        developmentType = developmentType.split('_')
          .map(word => word.charAt(0) + word.slice(1).toLowerCase())
          .join(' ');
      }
      
      return {
        id: cert.EplanningId,
        developmentType: developmentType,
        costPerM2: costPerM2,
        lga: cert.CouncilName || 'Unknown',
        address: address,
        totalCost: cert.CostOfDevelopment,
        gfa: cert.ProposedGrossFloorArea,
        landArea: cert.LandArea || 0
      };
    }).filter(Boolean); // Remove null entries

    return {
      dwellingSizes,
      constructionCosts
    };
  };

  // Update useEffect to fetch construction data
  useEffect(() => {
    const fetchConstructionData = async () => {
      if (!open || !selectedFeature) {
        console.log('Modal not open or no feature selected, skipping fetch');
        return;
      }

      try {
        setConstructionData(prev => ({ ...prev, loading: true, error: null }));

        console.log('Selected Feature:', selectedFeature);
        console.log('Properties:', selectedFeature?.properties);
        console.log('Copied From:', selectedFeature?.properties?.copiedFrom);
        
        // Get the LGA name from properties - using the same pattern as in developmentSlide.js
        const lgaName = selectedFeature?.properties?.site_suitability__LGA;
        console.log('LGA Name:', lgaName);

        if (!lgaName) {
          setConstructionData(prev => ({
            ...prev,
            loading: false,
            error: 'Please select a property with a valid LGA'
          }));
          return;
        }

        // Find the council name from the mapping - using the same pattern as in developmentSlide.js
        const councilName = Object.entries(lgaMapping).find(([council, lga]) => 
          lga.toLowerCase() === lgaName.toLowerCase()
        )?.[0];

        if (!councilName) {
          throw new Error(`Could not find council name mapping for LGA: ${lgaName}`);
        }
        
        const API_BASE_URL = process.env.NODE_ENV === 'development' 
          ? 'http://localhost:5173'
          : 'https://proxy-server.jameswilliamstrutt.workers.dev';

        const requestBody = {
          url: 'https://api.apps1.nsw.gov.au/eplanning/data/v0/OnlineCC',
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'PageSize': '50000',
            'PageNumber': '1',
            'filters': JSON.stringify({
              filters: {
                CouncilName: [councilName],
                ApplicationLastUpdatedFrom: "2019-02-01"
              }
            })
          }
        };

        const response = await fetch(`${API_BASE_URL}${process.env.NODE_ENV === 'development' ? '/api/proxy' : ''}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Raw API Response:', data);
        
        // Extract applications from the response
        if (!data || !data.Application) {
          throw new Error('Invalid response format from CC API');
        }

        // Process construction certificates
        const validCertificates = data.Application.filter(cert => 
          cert.CostOfDevelopment && 
          cert.ProposedGrossFloorArea && 
          cert.ProposedGrossFloorArea >= MIN_GFA && 
          cert.DevelopmentType &&
          cert.DevelopmentType.length > 0 && 
          (hasMatchingDensityType(cert.DevelopmentType, MEDIUM_DENSITY_TYPES) || 
           hasMatchingDensityType(cert.DevelopmentType, HIGH_DENSITY_TYPES))
        );

        console.log('Valid certificates:', validCertificates.map(cert => ({
          type: cert.DevelopmentType?.map(t => t.DevelopmentType).join(', '),
          gfa: cert.ProposedGrossFloorArea,
          units: cert.UnitsProposed,
          cost: cert.CostOfDevelopment,
          isMediumDensity: hasMatchingDensityType(cert.DevelopmentType, MEDIUM_DENSITY_TYPES),
          isHigh: hasMatchingDensityType(cert.DevelopmentType, HIGH_DENSITY_TYPES)
        })));

        // Calculate median costs and dwelling sizes for each density type
        const mediumDensityCost = calculateMedianCost(validCertificates, MEDIUM_DENSITY_TYPES);
        const highDensityCost = calculateMedianCost(validCertificates, HIGH_DENSITY_TYPES);

        console.log('Calculating medium density dwelling size for 2 bedrooms...');
        const mediumDensitySize = calculateMedianDwellingSize(validCertificates, MEDIUM_DENSITY_TYPES, 2);
        
        console.log('Calculating high density dwelling size for 2 bedrooms...');
        const highDensitySize = calculateMedianDwellingSize(validCertificates, HIGH_DENSITY_TYPES, 2);

        // Count certificates by density type
        const mediumDensityCount = validCertificates.filter(cert => 
          hasMatchingDensityType(cert.DevelopmentType, MEDIUM_DENSITY_TYPES)
        ).length;

        const highDensityCount = validCertificates.filter(cert => 
          hasMatchingDensityType(cert.DevelopmentType, HIGH_DENSITY_TYPES)
        ).length;

        console.log('Construction data analysis:', {
          lga: councilName,
          totalCertificates: validCertificates.length,
          mediumDensity: {
            count: mediumDensityCount,
            medianCost: mediumDensityCost,
            medianSize: mediumDensitySize,
            types: MEDIUM_DENSITY_TYPES
          },
          highDensity: {
            count: highDensityCount,
            medianCost: highDensityCost,
            medianSize: highDensitySize,
            types: HIGH_DENSITY_TYPES
          }
        });

        // Store dwelling sizes by bedroom count
        const dwellingSizesByBedroom = {
          mediumDensity: {},
          highDensity: {}
        };

        // Calculate for different bedroom counts (0-4)
        for (let i = 0; i <= 4; i++) {
          dwellingSizesByBedroom.mediumDensity[i] = calculateMedianDwellingSize(validCertificates, MEDIUM_DENSITY_TYPES, i);
          dwellingSizesByBedroom.highDensity[i] = calculateMedianDwellingSize(validCertificates, HIGH_DENSITY_TYPES, i);
        }

        // Prepare raw data for the modal
        const rawData = prepareRawConstructionData(validCertificates);

        setConstructionData({
          mediumDensity: mediumDensityCost,
          highDensity: highDensityCost,
          dwellingSizes: {
            mediumDensity: mediumDensitySize,
            highDensity: highDensitySize
          },
          dwellingSizesByBedroom,
          dwellingSizesByBedroomRaw: rawData.dwellingSizes,
          constructionCostsRaw: rawData.constructionCosts,
          Application: data.Application, // Add the full API response
          loading: false,
          error: null,
          lastUpdated: new Date(),
          certificateCounts: {
            mediumDensity: mediumDensityCount,
            highDensity: highDensityCount
          }
        });

        // Initialize settings with calculated values if not already set
        if (!customizedValues.constructionCostM2.mediumDensity && 
            mediumDensityCost && 
            (!settings.mediumDensity.constructionCostM2 || settings.mediumDensity.constructionCostM2 === 0)) {
          onSettingChange('constructionCostM2', mediumDensityCost, 'mediumDensity');
        }
        
        if (!customizedValues.constructionCostM2.highDensity && 
            highDensityCost && 
            (!settings.highDensity.constructionCostM2 || settings.highDensity.constructionCostM2 === 0)) {
          onSettingChange('constructionCostM2', highDensityCost, 'highDensity');
        }
        
        if (!customizedValues.dwellingSize.mediumDensity && 
            mediumDensitySize && 
            (!settings.mediumDensity.dwellingSize || settings.mediumDensity.dwellingSize === 0)) {
          onSettingChange('dwellingSize', mediumDensitySize, 'mediumDensity');
        }
        
        if (!customizedValues.dwellingSize.highDensity && 
            highDensitySize && 
            (!settings.highDensity.dwellingSize || settings.highDensity.dwellingSize === 0)) {
          onSettingChange('dwellingSize', highDensitySize, 'highDensity');
        }

        // After setting construction data, fetch LMR data
        await fetchLMRData(selectedFeature);

      } catch (error) {
        console.error('Error fetching construction data:', error);
        setConstructionData(prev => ({
          ...prev,
          loading: false,
          error: error.message || 'Failed to fetch construction data'
        }));
      }
    };

    fetchConstructionData();
  }, [open, selectedFeature?.properties?.site_suitability__LGA, customizedValues]);

  // Function to handle showing median prices modal
  const handleShowMedianPrices = () => {
    setShowMedianPrices(true);
  };
  
  // Function to handle showing construction cost data modal
  const handleShowConstructionData = () => {
    setShowConstructionData(true);
  };
  
  // Function to handle showing dwelling size data modal
  const handleShowDwellingSizeData = () => {
    setShowDwellingSizeData(true);
  };
  
  // Function to handle LMR option selection
  const handleLMROptionChange = (option, densityType) => {
    setLmrOptions(prev => ({
      ...prev,
      selectedOptions: {
        ...prev.selectedOptions,
        [densityType]: option
      }
    }));
  };

  // Modified to track customized values
  const handleSettingChange = (setting, value, density) => {
    // Update customized flag for the specific setting
    if (setting === 'dwellingPrice' || setting === 'dwellingSize' || setting === 'constructionCostM2') {
      setCustomizedValues(prev => ({
        ...prev,
        [setting]: {
          ...prev[setting],
          [density]: true
        }
      }));
    }
    
    // Call the original setting change handler
    onSettingChange(setting, value, density);
  };

  // Function to revert to calculated values
  const handleRevertToCalculated = (setting, density) => {
    // Reset customized flag
    setCustomizedValues(prev => ({
      ...prev,
      [setting]: {
        ...prev[setting],
        [density]: false
      }
    }));
    
    // Reset to calculated value
    if (setting === 'dwellingSize') {
      onSettingChange(setting, constructionData.dwellingSizes[density], density);
    } else if (setting === 'constructionCostM2') {
      onSettingChange(setting, constructionData[density], density);
    }
  };

  // Calculate feasibility with modified input parameters
  const calculateFeasibility = async (settings, propertyData, density, useLMR = false, lmrOption = null) => {
    try {
      // Get property data
      // If developableArea prop is provided, use that directly, otherwise fall back to the whole feature area
      let calculatedDevArea;
      
      // Import the area function - handle both potential module structures
      let areaFunction;
      try {
        const areaModule = await import('@turf/area');
        // Check if it's a default export or named export
        areaFunction = areaModule.default || areaModule.area;
        
        if (!areaFunction) {
          console.error('Error: Could not find area function in @turf/area');
          // Fallback to site_suitability__area if area function not found
          calculatedDevArea = propertyData?.properties?.copiedFrom?.site_suitability__area || 0;
        }
      } catch (err) {
        console.error('Error importing @turf/area:', err);
        // Fallback to site_suitability__area if import fails
        calculatedDevArea = propertyData?.properties?.copiedFrom?.site_suitability__area || 0;
      }
      
      if (developableArea && areaFunction) {
        // Check if developableArea is an object with features property
        if (developableArea.features && Array.isArray(developableArea.features)) {
          // Calculate total area from all features using turf/area
          calculatedDevArea = developableArea.features.reduce((total, feature) => {
            // Use turf's area calculation which works with the geometry directly
            return total + (feature.geometry ? areaFunction(feature.geometry) : 0);
          }, 0);
          
          // Log the calculated area to help with debugging
          console.log('Calculated developableArea (sq m):', calculatedDevArea);
        } else if (typeof developableArea === 'number') {
          // If it's already a number, use it directly
          calculatedDevArea = developableArea;
        } else {
          // Try to get the area if it's a single feature
          if (developableArea.geometry) {
            calculatedDevArea = areaFunction(developableArea.geometry);
          } else {
            calculatedDevArea = propertyData?.properties?.copiedFrom?.site_suitability__area || 0;
          }
        }
      } else if (!areaFunction || !developableArea) {
        // Fall back to the whole feature area
        calculatedDevArea = propertyData?.properties?.copiedFrom?.site_suitability__area || 0;
      }
      
      const siteArea = propertyData?.properties?.copiedFrom?.site_area || calculatedDevArea;
      
      // Get FSR and HOB based on whether we're using LMR or current controls
      let fsr, hob;
      if (useLMR && lmrOption) {
        // Use LMR values based on zone and distance to centers/stations
        const zoneCode = propertyData?.properties?.copiedFrom?.site_suitability__principal_zone_identifier?.split('-')?.[0]?.trim();
        
        if (lmrOption.type === 'Residential Flat Buildings') {
          // For RFBs, FSR and HOB depend on the zone and distance to centers/stations
          if (zoneCode === 'R1' || zoneCode === 'R2') {
            // Fixed values for R1/R2 zones
            fsr = 1.3;
            hob = 14.5;
          } else if (zoneCode === 'R3' || zoneCode === 'R4') {
            // Values depend on distance to centers/stations
            if (lmrOption.fsrRange && lmrOption.hobRange) {
              // Use the maximum values from the ranges
              fsr = lmrOption.fsrRange.max;
              hob = lmrOption.hobRange.max;
            } else {
              // Fallback to potential values
              fsr = lmrOption.potentialFSR;
              hob = lmrOption.potentialHOB;
            }
          }
        } else {
          // For other LMR housing types (Dual Occupancy, Multi Dwelling Housing, etc.)
          fsr = lmrOption.fsrRange ? lmrOption.fsrRange.max : lmrOption.potentialFSR;
          hob = lmrOption.hobRange ? lmrOption.hobRange.max : lmrOption.potentialHOB;
        }
      } else {
        // Use current controls
        fsr = propertyData?.properties?.copiedFrom?.site_suitability__floorspace_ratio || 0;
        hob = propertyData?.properties?.copiedFrom?.site_suitability__height_of_building || 0;
      }

      // Calculate GFA under FSR
      const gfaUnderFsr = siteArea * fsr;
      
      // Calculate GFA under HOB
      let maxStoreys = Math.floor(hob / settings.floorToFloorHeight);
      
      // Limit Medium Density to maximum 3 storeys
      if (density === 'mediumDensity' && maxStoreys > 3) {
        maxStoreys = 3;
      }
      
      const siteCoverage = calculatedDevArea * settings.siteEfficiencyRatio;
      // For high-density: GFA = Site Area × 60% (building footprint) × HOB/3.1 (storeys) × 75% (efficiency)
      // For medium-density: GFA = Site Area × 100% (full developable area) × HOB/3.1 (max 3 storeys) × 90% (efficiency)
      const gfaUnderHob = siteCoverage * maxStoreys * settings.gbaToGfaRatio;

      // Use FSR value if no HoB exists, otherwise use the lower of the two
      let gfa = !hob ? gfaUnderFsr : Math.min(gfaUnderFsr, gfaUnderHob);

      // Calculate NSA and development yield
      const nsa = gfa * settings.gfaToNsaRatio;
      
      // Use the appropriate dwelling size based on density
      let dwellingSize;
      if (density === 'highDensity') {
        // Use fixed 75m² for high-density
        dwellingSize = 75;
      } else {
        // Use the rounded down to nearest 10m² value for medium-density
        dwellingSize = Math.floor((settings.dwellingSize || constructionData?.dwellingSizes?.[density] || 80) / 10) * 10;
      }
      
      const developmentYield = Math.floor(nsa / dwellingSize);

      // Calculate total gross realisation
      const totalGrossRealisation = developmentYield * settings.dwellingPrice;

      // Calculate GST and selling costs
      const gst = totalGrossRealisation * 0.1;
      const agentsCommission = totalGrossRealisation * settings.agentsSalesCommission;
      const legalFees = totalGrossRealisation * settings.legalFeesOnSales;
      const marketingCosts = totalGrossRealisation * settings.marketingCosts;
      const netRealisation = totalGrossRealisation - gst - agentsCommission - legalFees - marketingCosts;

      // Calculate profit and risk
      const profitAndRisk = netRealisation * settings.profitAndRisk;
      const netRealisationAfterProfitAndRisk = netRealisation - profitAndRisk;

      // Use construction cost from settings (which can now be customized)
      const constructionCostPerGfa = settings.constructionCostM2 || constructionData?.[density] || 3500;
      
      // Calculate development costs
      const constructionCosts = constructionCostPerGfa * gfa;
      const daApplicationFees = settings.daApplicationFees;
      const professionalFees = constructionCosts * settings.professionalFees;
      const developmentContribution = constructionCosts * settings.developmentContribution;
      
      // Calculate Land Tax
      const propertyValue = propertyData?.properties?.copiedFrom?.site_suitability__property_value || 0;
      const generalThreshold = 1000000; // $1,000,000 threshold
      const premiumThreshold = 4000000; // $4,000,000 threshold
      
      let landTaxPerYear = 0;
      if (propertyValue > premiumThreshold) {
        // Premium threshold: $88,036 plus 2% of land value above the threshold
        landTaxPerYear = 88036 + (propertyValue - premiumThreshold) * 0.02;
      } else if (propertyValue > generalThreshold) {
        // General threshold: $100 plus 1.6% of land value above the threshold up to the premium threshold
        landTaxPerYear = 100 + (propertyValue - generalThreshold) * 0.016;
      }
      
      // Calculate total Land Tax for the project period
      const projectYears = settings.projectPeriod / 12;
      const landTax = landTaxPerYear * projectYears;

      const totalDevelopmentCosts = constructionCosts + daApplicationFees + professionalFees + developmentContribution;

      // Calculate finance costs
      const monthlyInterestRate = settings.interestRate / 12;
      const financeCosts = monthlyInterestRate * (settings.projectPeriod / 2) * totalDevelopmentCosts;

      // Calculate residual land value
      const residualLandValue = netRealisationAfterProfitAndRisk - totalDevelopmentCosts - financeCosts - landTax;
      
      // Calculate residual land value per m²
      const residualLandValuePerM2 = residualLandValue / calculatedDevArea;

      // Log final values for debugging
      console.log('Final feasibility calculation values:', {
        developableArea: calculatedDevArea,
        siteArea,
        siteCoverage,
        fsr,
        hob,
        gfa
      });

      return {
        developableArea: calculatedDevArea,
        siteArea,
        siteCoverage,
        fsr,
        hob,
        gfaUnderFsr,
        gfaUnderHob,
        gfa,
        nsa,
        dwellingSize,
        developmentYield,
        totalGrossRealisation,
        gst,
        agentsCommission,
        legalFees,
        marketingCosts,
        netRealisation,
        profitAndRisk,
        netRealisationAfterProfitAndRisk,
        constructionCostPerGfa,
        constructionCosts,
        daApplicationFees,
        professionalFees,
        developmentContribution,
        propertyValue,
        landTaxPerYear,
        landTax,
        totalDevelopmentCosts,
        financeCosts,
        residualLandValue,
        residualLandValuePerM2,
        projectPeriod: settings.projectPeriod,
        // Add LMR-specific information
        isLMR: useLMR,
        lmrType: lmrOption?.type || null,
        lmrFSRRange: lmrOption?.fsrRange || null,
        lmrHOBRange: lmrOption?.hobRange || null
      };
    } catch (error) {
      console.error('Error in calculateFeasibility:', error);
      return null;
    }
  };

  // Add this useEffect to update calculations when settings or LMR options change
  useEffect(() => {
    const updateCalculations = async () => {
      if (!selectedFeature || !settings) return;

      try {
        // Calculate results for current controls
        const currentMediumResults = await calculateFeasibility(settings.mediumDensity, selectedFeature, 'mediumDensity', false);
        const currentHighResults = await calculateFeasibility(settings.highDensity, selectedFeature, 'highDensity', false);

        // Calculate results for LMR controls if available
        const lmrMediumResults = lmrOptions.isInLMRArea && settings.mediumDensity.useLMR
          ? await calculateFeasibility(settings.mediumDensity, selectedFeature, 'mediumDensity', true, lmrOptions.selectedOptions.mediumDensity)
          : null;
        const lmrHighResults = lmrOptions.isInLMRArea && settings.highDensity.useLMR
          ? await calculateFeasibility(settings.highDensity, selectedFeature, 'highDensity', true, lmrOptions.selectedOptions.highDensity)
          : null;

        setCalculationResults({
          current: {
            mediumDensity: currentMediumResults,
            highDensity: currentHighResults
          },
          lmr: {
            mediumDensity: lmrMediumResults,
            highDensity: lmrHighResults
          }
        });
      } catch (error) {
        console.error('Error updating calculations:', error);
      }
    };

    updateCalculations();
  }, [settings, selectedFeature, lmrOptions, constructionData]);

  if (!open) return null;

  return (
    <>
      <div className={`fixed inset-0 z-50 overflow-y-auto ${open ? 'block' : 'hidden'}`}>
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity" aria-hidden="true">
            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
          </div>

          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                      <Calculator className="mr-2" /> Feasibility Calculator
                    </h3>
                    <button
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  
                  {constructionData.loading || lmrOptions.loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                      <p className="mt-4 text-gray-600">Loading data...</p>
                    </div>
                  ) : (
                    <FeasibilitySettings 
                      settings={settings} 
                      onSettingChange={onSettingChange} 
                      salesData={salesData}
                      constructionData={constructionData}
                      selectedFeature={selectedFeature}
                      onShowMedianPrices={handleShowMedianPrices}
                      onShowConstructionData={handleShowConstructionData}
                      onShowDwellingSizeData={handleShowDwellingSizeData}
                      lmrOptions={lmrOptions}
                      onLMROptionChange={handleLMROptionChange}
                      calculationResults={calculationResults}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Median Price Modal */}
      {showMedianPrices && (
        <MedianPriceModal 
          open={showMedianPrices}
          salesData={salesData} 
          onClose={() => setShowMedianPrices(false)} 
        />
      )}

      {/* Construction Data Modal */}
      {showConstructionData && (
        <ConstructionDataModal 
          open={showConstructionData}
          constructionData={constructionData} 
          onClose={() => setShowConstructionData(false)} 
        />
      )}

      {/* Dwelling Size Modal */}
      {showDwellingSizeData && (
        <DwellingSizeModal 
          open={showDwellingSizeData}
          constructionData={constructionData} 
          onClose={() => setShowDwellingSizeData(false)} 
          map={map}
        />
      )}
    </>
  );
};

export default FeasibilityManager; 