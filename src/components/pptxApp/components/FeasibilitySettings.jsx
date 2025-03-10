import React, { useState, useEffect } from 'react';
import {
  Ruler,
  Building2,
  Maximize2,
  Home,
  Users,
  BadgeDollarSign,
  Scale,
  Briefcase,
  Target,
  FileSpreadsheet,
  GraduationCap,
  Percent,
  Clock,
  SquareStack,
  Building,
  Calculator,
  HardHat,
  DollarSign,
  Info,
  RefreshCw,
  TrendingUp,
  Settings2,
  Landmark,
  Map,
  BarChart3
} from 'lucide-react';
import FeasibilityCalculation from './FeasibilityCalculation';
import FeasibilitySummary from './FeasibilitySummary';
import ConstructionDataModal from './ConstructionDataModal';

const FeasibilitySettings = ({ settings, onSettingChange, salesData, constructionData, selectedFeature, onShowMedianPrices, onShowConstructionData, onShowDwellingSizeData, lmrOptions, onLMROptionChange, calculationResults }) => {
  // Define property type descriptions
  const densityDescriptions = {
    mediumDensity: "Includes: Terrace, Townhouse, Villa, Multi-dwelling housing, Multi-dwelling housing (terraces), Manor house",
    highDensity: "Includes: Apartment, Build-to-Rent, Shop Top Housing, Studio, Unit"
  };

  // Track if dwelling price has been customized
  const [customDwellingPrice, setCustomDwellingPrice] = useState({
    mediumDensity: false,
    highDensity: false
  });

  // Store calculated median prices
  const [medianPrices, setMedianPrices] = useState({
    mediumDensity: null,
    highDensity: null
  });

  // Add state for active tab
  const [activeTab, setActiveTab] = useState('settings');
  
  // Add state for active calculation sub-tab
  const [activeCalcTab, setActiveCalcTab] = useState('mediumDensity');
  
  // Add state for social and affordable housing scenarios
  const [housingScenarios, setHousingScenarios] = useState({
    socialPercentage: 30,
    affordablePercentage: 30,
    mixedSocialPercentage: 15,
    mixedAffordablePercentage: 15
  });

  // Add state for custom controls
  const [customControls, setCustomControls] = useState({
    enabled: false,
    fsr: null,
    hob: null
  });

  // Add function to handle custom control changes
  const handleCustomControlChange = (field, value) => {
    setCustomControls(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Define property types for sales data filtering
  const MEDIUM_DENSITY_TYPES = ['terrace', 'townhouse', 'villa'];
  const HIGH_DENSITY_TYPES = ['apartment', 'studio', 'unit'];

  // Define property types for construction certificate data filtering
  const MEDIUM_DENSITY_CC_TYPES = [
    'Multi-dwelling housing',
    'Multi-dwelling housing (terraces)',
    'Manor house',
    'Medium Density Housing',
    'Manor houses'
  ];
  const HIGH_DENSITY_CC_TYPES = [
    'Residential flat building',
    'Shop top housing',
    'Build-to-rent'
  ];

  // Define settings configuration with the new showConstructionButton property
  const settingsConfig = [
    // Development Metrics section
    { id: 'section-development', label: 'Development Metrics', isSection: true },
    { id: 'siteEfficiencyRatio', label: 'Building Footprint', unit: '%', icon: Building2 },
    { id: 'floorToFloorHeight', label: 'Floor to Floor Height', unit: 'm', icon: Ruler },
    { id: 'gbaToGfaRatio', label: 'GBA to GFA Ratio', unit: '%', icon: Maximize2 },
    { id: 'gfaToNsaRatio', label: 'GFA to NSA Ratio', unit: '%', icon: Home },

    // Construction Metrics section
    { id: 'section-construction', label: 'Construction Metrics', isSection: true },
    { 
      id: 'constructionCostM2', 
      label: 'Median Construction Cost per m² GFA', 
      unit: '$/m²', 
      icon: HardHat, 
      isCalculated: true,
      hasRevert: false,
      tooltip: density => `Based on ${constructionData?.certificateCounts?.[density] || 0} approved DAs`,
      showConstructionButton: true
    },
    { 
      id: 'assumedConstructionCostM2', 
      label: 'Assumed Construction Cost per m² GFA', 
      unit: '$/m²', 
      icon: HardHat, 
      isEditable: true
    },

    // Dwelling Metrics section
    { id: 'section-dwelling', label: 'Dwelling Metrics', isSection: true },
    { 
      id: 'dwellingSize', 
      label: 'Median Dwelling Size', 
      unit: 'm²', 
      icon: Maximize2, 
      isCalculated: true,
      hasRevert: false,
      tooltip: density => `Based on 2 bedroom dwellings from ${constructionData?.certificateCounts?.[density] || 0} approved DAs`,
      showConstructionButton: true
    },
    { 
      id: 'assumedDwellingSize', 
      label: 'Assumed Dwelling Size', 
      unit: 'm²', 
      icon: Maximize2, 
      isEditable: true
    },
    { 
      id: 'dwellingPrice', 
      label: 'Median Dwelling Price',
      unit: '$', 
      icon: Building, 
      isEditable: true,
      hasRevert: true,
      tooltip: 'Default based on median 2 bedroom dwelling sale price only. Click to revert.',
      showSalesButton: true
    },

    // Financial Metrics section
    { id: 'section-financial', label: 'Financial Metrics', isSection: true },
    { id: 'agentsSalesCommission', label: 'Agent\'s Sales Commission', unit: '%', icon: BadgeDollarSign },
    { id: 'legalFeesOnSales', label: 'Legal Fees on Sales', unit: '%', icon: Scale },
    { id: 'marketingCosts', label: 'Marketing Costs', unit: '%', icon: Target },
    { id: 'profitAndRisk', label: 'Profit and Risk', unit: '%', icon: Briefcase },
    { id: 'daApplicationFees', label: 'DA Application Fees', unit: '$', icon: FileSpreadsheet },
    { id: 'developmentContribution', label: 'Development Contribution', unit: '%', icon: Target },
    { id: 'professionalFees', label: 'Professional Fees', unit: '%', icon: GraduationCap },
    { id: 'interestRate', label: 'Interest Rate', unit: '%', icon: Percent },
    { id: 'projectPeriod', label: 'Project Period', unit: 'months', icon: Clock }
  ];

  // Function to calculate feasibility
  const calculateFeasibility = (settings, propertyData, density, useLMR = false, lmrOption = null, customControls = null) => {
    try {
      // Get property data
      const developableArea = propertyData?.properties?.copiedFrom?.site_suitability__area || 0;
      const siteArea = propertyData?.properties?.copiedFrom?.site_area || developableArea;
      
      // Get FSR and HOB based on whether we're using LMR, custom controls, or current controls
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
      } else if (customControls?.enabled) {
        // Use custom controls if enabled, falling back to current controls if not specified
        fsr = customControls.fsr ?? (propertyData?.properties?.copiedFrom?.site_suitability__floorspace_ratio || 0);
        hob = customControls.hob ?? (propertyData?.properties?.copiedFrom?.site_suitability__height_of_building || 0);
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
      
      const siteCoverage = developableArea * settings.siteEfficiencyRatio;
      // For high-density: GFA = Site Area × 50% (building footprint) × HOB/3.1 (storeys) × 75% (efficiency)
      // For medium-density: GFA = Site Area × 60% (building footprint) × HOB/3.1 (max 3 storeys) × 90% (efficiency)
      const gfaUnderHob = siteCoverage * maxStoreys * settings.gbaToGfaRatio;

      // Use FSR value if no HoB exists, otherwise use the lower of the two
      let gfa = !hob ? gfaUnderFsr : Math.min(gfaUnderFsr, gfaUnderHob);

      // For Medium Density, limit to 3 storeys unless using LMR controls
      if (density === 'mediumDensity' && !useLMR) {
        const maxGfaFor3Storeys = siteCoverage * 3 * settings.gbaToGfaRatio;
        gfa = Math.min(gfa, maxGfaFor3Storeys);
      }

      // Calculate NSA and development yield
      const nsa = gfa * settings.gfaToNsaRatio;
      
      // Use the appropriate dwelling size based on density
      let dwellingSize;
      if (density === 'highDensity') {
        // Use fixed 75m² for high-density
        dwellingSize = 75;
      } else {
        // Use the rounded down to nearest 10m² value for medium-density
        const medianSize = constructionData?.dwellingSizes?.[density] || 80;
        dwellingSize = Math.floor(medianSize / 10) * 10;
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

      // Get construction cost - use the assumed cost from settings
      const constructionCostPerGfa = settings.assumedConstructionCostM2;
      
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
      const residualLandValuePerM2 = residualLandValue / developableArea;

      return {
        developableArea,
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

  // Function to calculate derived values
  const calculateDerivedValues = (density) => {
    // Get property data
    const developableArea = selectedFeature?.properties?.copiedFrom?.site_suitability__area || 0;
    const fsr = selectedFeature?.properties?.copiedFrom?.site_suitability__floorspace_ratio || 0;
    const hob = selectedFeature?.properties?.copiedFrom?.site_suitability__height_of_building || 0;

    // Calculate GFA under FSR
    const gfaUnderFsr = developableArea * fsr;

    // Calculate GFA under HOB
    let maxStoreys = Math.floor(hob / settings[density].floorToFloorHeight);
    
    // Limit Medium Density to maximum 3 storeys
    if (density === 'mediumDensity' && maxStoreys > 3) {
      maxStoreys = 3;
    }
    
    const siteCoverage = developableArea * settings[density].siteEfficiencyRatio;
    // For high-density: GFA = Site Area × 50% (building footprint) × HOB/3.1 (storeys) × 75% (efficiency)
    // For medium-density: GFA = Site Area × 60% (building footprint) × HOB/3.1 (max 3 storeys) × 90% (efficiency)
    const gfaUnderHob = siteCoverage * maxStoreys * settings[density].gbaToGfaRatio;

    // Use FSR value if no HoB exists, otherwise use the lower of the two
    let gfa = !hob ? gfaUnderFsr : Math.min(gfaUnderFsr, gfaUnderHob);
    
    // For Medium Density, also limit the GFA to what would be possible with 3 storeys
    if (density === 'mediumDensity') {
      const maxGfaFor3Storeys = siteCoverage * 3 * settings[density].gbaToGfaRatio;
      gfa = Math.min(gfa, maxGfaFor3Storeys);
    }

    // Get construction cost and dwelling size from construction data
    const constructionCostM2 = constructionData[density];
    let dwellingSize = constructionData?.dwellingSizes?.[density] || 0;

    // Calculate dwelling size from bedroom-specific data if available
    if (constructionData?.dwellingSizesByBedroom?.[density]) {
      // Get sizes for properties with fewer than 4 bedrooms
      const validSizes = [];
      for (let i = 0; i <= 3; i++) {
        if (constructionData.dwellingSizesByBedroom[density][i]) {
          validSizes.push(constructionData.dwellingSizesByBedroom[density][i]);
        }
      }
      
      // Calculate median if we have valid sizes
      if (validSizes.length > 0) {
        // Sort sizes and get the median
        validSizes.sort((a, b) => a - b);
        dwellingSize = validSizes[Math.floor(validSizes.length / 2)];
      }
    }

    // Filter sales data by property type based on density
    const relevantSales = salesData?.filter(sale => {
      const propertyType = sale.property_type?.toLowerCase().trim();
      const propertyTypes = density === 'mediumDensity' ? MEDIUM_DENSITY_TYPES : HIGH_DENSITY_TYPES;
      
      // Check if property type matches
      const typeMatches = propertyTypes.some(type => propertyType?.includes(type));
      
      // Specifically filter for 2 bedroom dwellings
      const bedroomCount = sale.bedrooms ? parseInt(sale.bedrooms, 10) : null;
      const isTwoBedroom = bedroomCount === 2;
      
      return typeMatches && isTwoBedroom;
    }) || [];

    // Get median price from filtered sales data
    const medianPrice = relevantSales.length > 0 
      ? relevantSales.map(s => s.price).sort((a, b) => a - b)[Math.floor(relevantSales.length / 2)]
      : null;

    // Calculate assumed construction cost (rounded down to nearest 10)
    const assumedConstructionCostM2 = Math.floor(constructionCostM2 / 10) * 10;

    // Calculate assumed dwelling size based on density
    const assumedDwellingSize = density === 'highDensity' ? 75 : Math.floor(dwellingSize / 10) * 10;

    // Use custom dwelling price if set, otherwise use median price
    const dwellingPrice = customDwellingPrice[density] 
      ? settings[density][setting.id] 
      : medianPrice;

    return {
      dwellingSize: Math.round(dwellingSize),
      assumedDwellingSize,
      dwellingPrice,
      pricePerM2: dwellingPrice && dwellingSize ? Math.round(dwellingPrice / dwellingSize) : null,
      constructionCostM2: Math.round(constructionCostM2),
      assumedConstructionCostM2
    };
  };

  // Update median prices when sales data changes
  useEffect(() => {
    if (salesData) {
      const mediumValues = calculateDerivedValues('mediumDensity');
      const highValues = calculateDerivedValues('highDensity');
      
      setMedianPrices({
        mediumDensity: mediumValues.dwellingPrice,
        highDensity: highValues.dwellingPrice
      });
    }
  }, [salesData]);

  // Initialize dwelling price in settings if it doesn't exist
  useEffect(() => {
    if (salesData && (!settings.mediumDensity.dwellingPrice || !settings.highDensity.dwellingPrice)) {
      const mediumValues = calculateDerivedValues('mediumDensity');
      const highValues = calculateDerivedValues('highDensity');
      
      if (mediumValues.dwellingPrice && !settings.mediumDensity.dwellingPrice) {
        onSettingChange('dwellingPrice', mediumValues.dwellingPrice, 'mediumDensity');
      }
      
      if (highValues.dwellingPrice && !settings.highDensity.dwellingPrice) {
        onSettingChange('dwellingPrice', highValues.dwellingPrice, 'highDensity');
      }
    }
  }, [salesData]);

  // Set default values for Building Footprint if not already set
  useEffect(() => {
    // Check if siteEfficiencyRatio needs to be updated to the new default values
    if (settings.mediumDensity.siteEfficiencyRatio !== 0.6) {
      onSettingChange('siteEfficiencyRatio', 0.6, 'mediumDensity');
    }
    
    if (settings.highDensity.siteEfficiencyRatio !== 0.6) {
      onSettingChange('siteEfficiencyRatio', 0.6, 'highDensity');
    }

    // Set floor to floor height to 3.1m for both density types
    if (settings.mediumDensity.floorToFloorHeight !== 3.1) {
      onSettingChange('floorToFloorHeight', 3.1, 'mediumDensity');
    }
    
    if (settings.highDensity.floorToFloorHeight !== 3.1) {
      onSettingChange('floorToFloorHeight', 3.1, 'highDensity');
    }

    // Set GBA to GFA ratio for Medium Density to 90%
    if (settings.mediumDensity.gbaToGfaRatio !== 0.9) {
      onSettingChange('gbaToGfaRatio', 0.9, 'mediumDensity');
    }

    // Set GBA to GFA ratio for High Density to 75%
    if (settings.highDensity.gbaToGfaRatio !== 0.75) {
      onSettingChange('gbaToGfaRatio', 0.75, 'highDensity');
    }

    // Set Development Contribution to 1% of Construction Costs if not already set
    if (settings.mediumDensity.developmentContribution !== 0.01) {
      onSettingChange('developmentContribution', 0.01, 'mediumDensity');
    }
    
    if (settings.highDensity.developmentContribution !== 0.01) {
      onSettingChange('developmentContribution', 0.01, 'highDensity');
    }

    // Set default project period for Medium Density to 24 months
    if (settings.mediumDensity.projectPeriod !== 24) {
      onSettingChange('projectPeriod', 24, 'mediumDensity');
    }
    
    // Initialize assumed construction costs if not set
    if (constructionData) {
      // Calculate medium density assumed construction cost
      if (!settings.mediumDensity.assumedConstructionCostM2) {
        const mediumConstructionCost = constructionData.mediumDensity || 3500;
        const mediumAssumedCost = Math.floor(mediumConstructionCost / 10) * 10;
        onSettingChange('assumedConstructionCostM2', mediumAssumedCost, 'mediumDensity');
      }
      
      // Calculate high density assumed construction cost
      if (!settings.highDensity.assumedConstructionCostM2) {
        const highConstructionCost = constructionData.highDensity || 3500;
        const highAssumedCost = Math.floor(highConstructionCost / 10) * 10;
        onSettingChange('assumedConstructionCostM2', highAssumedCost, 'highDensity');
      }
      
      // Initialize assumed dwelling sizes if not set
      if (!settings.mediumDensity.assumedDwellingSize && constructionData.dwellingSizes?.mediumDensity) {
        const assumedSize = Math.floor(constructionData.dwellingSizes.mediumDensity / 10) * 10;
        onSettingChange('assumedDwellingSize', assumedSize, 'mediumDensity');
      }
      
      if (!settings.highDensity.assumedDwellingSize) {
        // High density uses fixed 75m² size
        onSettingChange('assumedDwellingSize', 75, 'highDensity');
      }
    }
  }, [constructionData]);

  // Update useEffect to calculate results when settings or custom controls change
  useEffect(() => {
    if (!selectedFeature) return;

    // Calculate results for current controls
    const currentMediumResults = calculateFeasibility(
      settings.mediumDensity, 
      selectedFeature, 
      'mediumDensity', 
      false, 
      null, 
      customControls
    );
    const currentHighResults = calculateFeasibility(
      settings.highDensity, 
      selectedFeature, 
      'highDensity', 
      false, 
      null, 
      customControls
    );

    // Calculate results for LMR controls if available
    const lmrMediumResults = lmrOptions.isInLMRArea && settings.mediumDensity.useLMR
      ? calculateFeasibility(
          settings.mediumDensity, 
          selectedFeature, 
          'mediumDensity', 
          true, 
          lmrOptions.selectedOptions.mediumDensity, 
          customControls
        )
      : null;
    const lmrHighResults = lmrOptions.isInLMRArea && settings.highDensity.useLMR
      ? calculateFeasibility(
          settings.highDensity, 
          selectedFeature, 
          'highDensity', 
          true, 
          lmrOptions.selectedOptions.highDensity, 
          customControls
        )
      : null;

    calculationResults.current = {
      mediumDensity: currentMediumResults,
      highDensity: currentHighResults,
      isCustomControls: customControls.enabled,
      customControls: customControls.enabled ? {
        fsr: customControls.fsr,
        hob: customControls.hob
      } : null
    };
    calculationResults.lmr = {
      mediumDensity: lmrMediumResults,
      highDensity: lmrHighResults
    };
  }, [settings, selectedFeature, lmrOptions, customControls]);

  const handleChange = (setting, density) => (event) => {
    let value = event.target.value;
    
    // Convert percentage inputs from string to decimal
    if (setting.endsWith('Ratio') || 
        setting === 'agentsSalesCommission' || 
        setting === 'legalFeesOnSales' || 
        setting === 'marketingCosts' || 
        setting === 'profitAndRisk' || 
        setting === 'professionalFees' || 
        setting === 'interestRate') {
      value = parseFloat(value) / 100;
    } else {
      value = parseFloat(value);
    }

    // Track if dwelling price is being customized
    if (setting === 'dwellingPrice') {
      setCustomDwellingPrice(prev => ({
        ...prev,
        [density]: true
      }));
    }

    onSettingChange(setting, value, density);
  };

  // Function to revert dwelling price to median calculation
  const handleRevertPrice = (density) => {
    if (medianPrices[density]) {
      onSettingChange('dwellingPrice', medianPrices[density], density);
      setCustomDwellingPrice(prev => ({
        ...prev,
        [density]: false
      }));
    }
  };

  const formatValue = (setting, value) => {
    if (!value && value !== 0) return 'N/A';
    
    if (setting === 'daApplicationFees' || 
        setting === 'dwellingPrice' || 
        setting === 'pricePerM2') {
      return value.toLocaleString('en-AU');
    }
    if (setting === 'constructionCostM2' || setting === 'assumedConstructionCostM2') {
      return '$' + Math.round(value).toLocaleString('en-AU');
    }
    if (setting === 'dwellingSize') {
      return Math.round(value).toLocaleString('en-AU');
    }
    if (setting === 'developmentContribution') {
      return (value * 100).toFixed(0);
    }
    if (setting.endsWith('Ratio') || 
        setting === 'agentsSalesCommission' || 
        setting === 'legalFeesOnSales' || 
        setting === 'marketingCosts' || 
        setting === 'profitAndRisk' || 
        setting === 'professionalFees' || 
        setting === 'interestRate') {
      return (value * 100).toFixed(1);
    }
    return value.toString();
  };

  // Function to handle tab switching
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Function to handle calculation sub-tab switching
  const handleCalcTabChange = (tab) => {
    setActiveCalcTab(tab);
  };

  // Function to handle housing scenario changes
  const handleHousingScenarioChange = (scenario) => (event) => {
    const value = parseInt(event.target.value, 10);
    setHousingScenarios(prev => ({
      ...prev,
      [scenario]: value
    }));
  };

  // Function to render input fields
  const renderInput = (setting, density) => {
    // Handle dwelling price with revert option
    if (setting.id === 'dwellingPrice') {
      const derivedValues = calculateDerivedValues(density);
      const displayValue = customDwellingPrice[density] 
        ? settings[density][setting.id] 
        : derivedValues[setting.id];
      
      return (
        <div className="flex items-center justify-center space-x-2">
          <div className="flex items-center space-x-1">
            <div className="relative w-32">
              <input
                type="text"
                value={displayValue ? formatValue(setting.id, displayValue) : ''}
                onChange={handleChange(setting.id, density)}
                className="w-full px-2 py-1 border rounded text-right"
              />
              {setting.hasRevert && customDwellingPrice[density] && (
                <button
                  onClick={() => handleRevertPrice(density)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-500 hover:text-blue-700"
                  title={setting.tooltip}
                >
                  <RefreshCw size={14} />
                </button>
              )}
            </div>
            <span className="text-gray-500">{setting.unit}</span>
          </div>
          {setting.showSalesButton && (
            <button
              onClick={onShowMedianPrices}
              className="text-blue-500 hover:text-blue-700 ml-2"
              title="View sales data"
            >
              <Info size={16} />
            </button>
          )}
        </div>
      );
    }
    
    // Handle median construction cost and median dwelling size (read-only with info button)
    if ((setting.id === 'constructionCostM2' || setting.id === 'dwellingSize') && setting.isCalculated) {
      const derivedValues = calculateDerivedValues(density);
      const displayValue = derivedValues[setting.id];
      
      return (
        <div className="flex items-center justify-center space-x-2">
          <div className="flex items-center space-x-1">
            <span className="w-32 text-right">{displayValue ? formatValue(setting.id, displayValue) : 'N/A'}</span>
            <span className="text-gray-500">{setting.unit}</span>
          </div>
          {setting.showConstructionButton && (
            <button
              onClick={setting.id === 'constructionCostM2' ? onShowConstructionData : onShowDwellingSizeData}
              className="text-blue-500 hover:text-blue-700 ml-2"
              title={`View ${setting.id === 'constructionCostM2' ? 'construction cost' : 'dwelling size'} data`}
            >
              <Info size={16} />
            </button>
          )}
        </div>
      );
    }
    
    // Handle calculated values (read-only)
    if (setting.isCalculated) {
      const derivedValues = calculateDerivedValues(density);
      const displayValue = derivedValues[setting.id];
      
      return (
        <div className="flex items-center justify-center space-x-1">
          <div 
            className="flex items-center space-x-1 cursor-help" 
            title={setting.tooltip ? setting.tooltip(density) : ''}
          >
            <span className="w-32 text-right">{displayValue ? formatValue(setting.id, displayValue) : 'N/A'}</span>
            <span className="text-gray-500">{setting.unit}</span>
            {setting.tooltip && <Info size={14} className="text-gray-400 ml-1" />}
          </div>
        </div>
      );
    }
    
    // Handle regular inputs
    return (
      <div className="flex items-center justify-center space-x-1">
        <input
          type="text"
          value={formatValue(setting.id, settings[density][setting.id])}
          onChange={handleChange(setting.id, density)}
          className="w-32 px-2 py-1 border rounded text-right"
        />
        <span className="text-gray-500">{setting.unit}</span>
      </div>
    );
  };

  // Add function to revert to calculated values
  const handleRevertToCalculated = (setting, density) => {
    if (setting === 'dwellingSize') {
      const defaultValue = constructionData?.dwellingSizes?.[density] || 80;
      onSettingChange(setting, defaultValue, density);
    } else if (setting === 'constructionCostM2') {
      const defaultValue = constructionData?.[density] || 3500;
      onSettingChange(setting, defaultValue, density);
    } else if (setting === 'assumedDwellingSize') {
      // For assumedDwellingSize, get the median and round down to nearest 10
      const medianSize = constructionData?.dwellingSizes?.[density] || 80;
      const assumedSize = density === 'highDensity' ? 75 : Math.floor(medianSize / 10) * 10;
      onSettingChange(setting, assumedSize, density);
    } else if (setting === 'assumedConstructionCostM2') {
      // For assumedConstructionCostM2, get the median and round down to nearest 10
      const medianCost = constructionData?.[density] || 3500;
      const assumedCost = Math.floor(medianCost / 10) * 10;
      onSettingChange(setting, assumedCost, density);
    }
  };

  const showConstructionData = settings.mediumDensity.useLMR || settings.highDensity.useLMR;

  return (
    <div className="p-4">
      {/* Tab Navigation */}
      <div className="flex border-b mb-4">
        <button
          className={`flex items-center px-4 py-2 font-medium ${activeTab === 'settings' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
          onClick={() => handleTabChange('settings')}
        >
          <Settings2 className="mr-2" size={16} /> Settings
        </button>
        <button
          className={`flex items-center px-4 py-2 font-medium ${activeTab === 'calculation' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
          onClick={() => handleTabChange('calculation')}
        >
          <Calculator className="mr-2" size={16} /> Calculation
        </button>
        <button
          className={`flex items-center px-4 py-2 font-medium ${activeTab === 'summary' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
          onClick={() => handleTabChange('summary')}
        >
          <BarChart3 className="mr-2" size={16} /> Summary
        </button>
      </div>

      {/* Settings Tab Content */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg shadow p-4">
          {/* Property Information Section */}
          {selectedFeature && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <Map className="mr-2" size={18} /> Property Information
              </h3>
              
              {/* Development Controls Toggle */}
              <div className="mb-4 p-3 bg-white rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-700">Development Controls</span>
                  <div className="flex items-center space-x-4">
                    <label className={`flex items-center cursor-pointer px-3 py-1 rounded-l-md ${!customControls.enabled ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 hover:bg-gray-200'}`}>
                      <input
                        type="radio"
                        className="hidden"
                        checked={!customControls.enabled}
                        onChange={() => setCustomControls(prev => ({ ...prev, enabled: false }))}
                      />
                      <span>Current Controls</span>
                    </label>
                    <label className={`flex items-center cursor-pointer px-3 py-1 rounded-r-md ${customControls.enabled ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 hover:bg-gray-200'}`}>
                      <input
                        type="radio"
                        className="hidden"
                        checked={customControls.enabled}
                        onChange={() => setCustomControls(prev => ({ ...prev, enabled: true }))}
                      />
                      <span>Custom Controls</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center">
                    <Landmark className="mr-2" size={16} />
                    <span className="font-medium">Zone:</span>
                    <span className="ml-2">{selectedFeature?.properties?.copiedFrom?.site_suitability__principal_zone_identifier?.split('-')?.[0]?.trim() || 'N/A'}</span>
                  </div>
                  <div className="flex items-center">
                    <Building2 className="mr-2" size={16} />
                    <div className="flex items-center space-x-2 w-full">
                      <span className="font-medium">FSR:</span>
                      {customControls.enabled ? (
                        <div className="relative flex-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={customControls.fsr || ''}
                            onChange={(e) => handleCustomControlChange('fsr', e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder={selectedFeature?.properties?.copiedFrom?.site_suitability__floorspace_ratio || '0.0'}
                            className="w-full px-2 py-1 border rounded bg-white focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all"
                          />
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">:1</div>
                        </div>
                      ) : (
                        <span className="ml-2">{selectedFeature?.properties?.copiedFrom?.site_suitability__floorspace_ratio || 'N/A'}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Ruler className="mr-2" size={16} />
                    <div className="flex items-center space-x-2 w-full">
                      <span className="font-medium">HOB:</span>
                      {customControls.enabled ? (
                        <div className="relative flex-1">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={customControls.hob || ''}
                            onChange={(e) => handleCustomControlChange('hob', e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder={selectedFeature?.properties?.copiedFrom?.site_suitability__height_of_building || '0.0'}
                            className="w-full px-2 py-1 border rounded bg-white focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all"
                          />
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">m</div>
                        </div>
                      ) : (
                        <span className="ml-2">{selectedFeature?.properties?.copiedFrom?.site_suitability__height_of_building ? `${selectedFeature.properties.copiedFrom.site_suitability__height_of_building}m` : 'N/A'}</span>
                      )}
                    </div>
                  </div>
                </div>

                {customControls.enabled && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    <div className="flex items-start">
                      <Info size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        Custom controls will be used for all feasibility calculations. Leave fields empty to use current control values.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* LMR Options Section */}
              {lmrOptions.isInLMRArea && (
                <div className="mt-4 border-t border-blue-200 pt-4">
                  <h4 className="font-bold mb-2">LMR Development Options</h4>
                  
                  {/* Medium Density Options */}
                  <div className="mb-4">
                    <h5 className="font-medium mb-2">Medium Density Controls</h5>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="mediumDensityControl"
                          value="current"
                          checked={!settings.mediumDensity.useLMR}
                          onChange={() => onSettingChange('useLMR', false, 'mediumDensity')}
                          className="mr-2"
                        />
                        <span>Current Controls</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="mediumDensityControl"
                          value="lmr"
                          checked={settings.mediumDensity.useLMR}
                          onChange={() => onSettingChange('useLMR', true, 'mediumDensity')}
                          className="mr-2"
                        />
                        <span>LMR Controls</span>
                      </label>
                    </div>
                    {settings.mediumDensity.useLMR && lmrOptions.allOptions?.mediumDensity?.length > 0 && (
                      <select
                        value={lmrOptions.selectedOptions.mediumDensity?.type || ''}
                        onChange={(e) => {
                          const option = lmrOptions.allOptions.mediumDensity.find(opt => opt.type === e.target.value);
                          onLMROptionChange(option, 'mediumDensity');
                        }}
                        className="mt-2 w-full p-2 border rounded"
                      >
                        {lmrOptions.allOptions.mediumDensity.map((option) => (
                          <option key={option.type} value={option.type}>
                            {option.type} - FSR: {option.fsrRange ? `${option.fsrRange.min}-${option.fsrRange.max}` : option.potentialFSR} | HOB: {option.hobRange ? `${option.hobRange.min}-${option.hobRange.max}m` : `${option.potentialHOB}m`}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* High Density Options */}
                  <div>
                    <h5 className="font-medium mb-2">High Density Controls</h5>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="highDensityControl"
                          value="current"
                          checked={!settings.highDensity.useLMR}
                          onChange={() => onSettingChange('useLMR', false, 'highDensity')}
                          className="mr-2"
                        />
                        <span>Current Controls</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="highDensityControl"
                          value="lmr"
                          checked={settings.highDensity.useLMR}
                          onChange={() => onSettingChange('useLMR', true, 'highDensity')}
                          className="mr-2"
                        />
                        <span>LMR Controls</span>
                      </label>
                    </div>
                    {settings.highDensity.useLMR && lmrOptions.allOptions?.highDensity?.length > 0 && (
                      <select
                        value={lmrOptions.selectedOptions.highDensity?.type || ''}
                        onChange={(e) => {
                          const option = lmrOptions.allOptions.highDensity.find(opt => opt.type === e.target.value);
                          onLMROptionChange(option, 'highDensity');
                        }}
                        className="mt-2 w-full p-2 border rounded"
                      >
                        {lmrOptions.allOptions.highDensity.map((option) => (
                          <option key={option.type} value={option.type}>
                            {option.type} - FSR: {option.fsrRange ? `${option.fsrRange.min}-${option.fsrRange.max}` : option.potentialFSR} | HOB: {option.hobRange ? `${option.hobRange.min}-${option.hobRange.max}m` : `${option.potentialHOB}m`}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <table className="w-full">
            <thead>
              <tr>
                <th className="w-1/3 text-left py-2">Setting</th>
                <th className="w-1/3 text-center py-2">
                  <div className="flex justify-center items-center">
                    <span title={densityDescriptions.mediumDensity} className="cursor-help">
                      Medium Density
                    </span>
                  </div>
                </th>
                <th className="w-1/3 text-center py-2">
                  <div className="flex justify-center items-center">
                    <span title={densityDescriptions.highDensity} className="cursor-help">
                      High Density
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {settingsConfig.map((setting, index) => (
                setting.isSection ? (
                  <tr key={setting.id} className="bg-blue-50">
                    <td colSpan="3" className="py-2 px-4 font-bold text-blue-900">
                      {setting.label}
                    </td>
                  </tr>
                ) : (
                  <tr key={setting.id} className="border-t border-gray-100">
                    <td className="py-2 px-4">
                      <div className="flex items-center">
                        {setting.icon && <setting.icon className="mr-2" size={16} />}
                        <span>{setting.label}</span>
                      </div>
                    </td>
                    <td className="py-2 px-4 text-center">
                      {renderInput(setting, 'mediumDensity')}
                    </td>
                    <td className="py-2 px-4 text-center">
                      {renderInput(setting, 'highDensity')}
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>

          {/* Social/Affordable Housing Scenarios - Moved to bottom */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-bold mb-2 flex items-center">
              <Home className="mr-2" size={18} /> Social/Affordable Housing Scenarios
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 font-medium">Social Housing Percentage:</label>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={housingScenarios.socialPercentage}
                    onChange={handleHousingScenarioChange('socialPercentage')}
                    className="w-full mr-2"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={housingScenarios.socialPercentage}
                    onChange={handleHousingScenarioChange('socialPercentage')}
                    className="w-16 px-2 py-1 border rounded text-right"
                  />
                  <span className="ml-1">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Social housing provides 0% revenue</p>
              </div>
              <div>
                <label className="block mb-1 font-medium">Affordable Housing Percentage:</label>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={housingScenarios.affordablePercentage}
                    onChange={handleHousingScenarioChange('affordablePercentage')}
                    className="w-full mr-2"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={housingScenarios.affordablePercentage}
                    onChange={handleHousingScenarioChange('affordablePercentage')}
                    className="w-16 px-2 py-1 border rounded text-right"
                  />
                  <span className="ml-1">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Affordable housing provides 75% revenue</p>
              </div>
              <div>
                <label className="block mb-1 font-medium">Mixed Scenario - Social Housing:</label>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={housingScenarios.mixedSocialPercentage}
                    onChange={handleHousingScenarioChange('mixedSocialPercentage')}
                    className="w-full mr-2"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={housingScenarios.mixedSocialPercentage}
                    onChange={handleHousingScenarioChange('mixedSocialPercentage')}
                    className="w-16 px-2 py-1 border rounded text-right"
                  />
                  <span className="ml-1">%</span>
                </div>
              </div>
              <div>
                <label className="block mb-1 font-medium">Mixed Scenario - Affordable Housing:</label>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={housingScenarios.mixedAffordablePercentage}
                    onChange={handleHousingScenarioChange('mixedAffordablePercentage')}
                    className="w-full mr-2"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={housingScenarios.mixedAffordablePercentage}
                    onChange={handleHousingScenarioChange('mixedAffordablePercentage')}
                    className="w-16 px-2 py-1 border rounded text-right"
                  />
                  <span className="ml-1">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calculation Tab Content */}
      {activeTab === 'calculation' && (
        <div>
          {/* Calculation Sub-Tabs */}
          <div className="flex border-b mb-4">
            <button
              className={`flex items-center px-4 py-2 font-medium ${activeCalcTab === 'mediumDensity' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
              onClick={() => handleCalcTabChange('mediumDensity')}
            >
              <Building2 className="mr-2" size={16} /> Medium Density
            </button>
            <button
              className={`flex items-center px-4 py-2 font-medium ${activeCalcTab === 'highDensity' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
              onClick={() => handleCalcTabChange('highDensity')}
            >
              <Building className="mr-2" size={16} /> High Density
            </button>
          </div>
          
          {/* Medium Density Calculation */}
          {activeCalcTab === 'mediumDensity' && (
            <FeasibilityCalculation 
              settings={settings} 
              density="mediumDensity" 
              selectedFeature={selectedFeature}
              salesData={salesData}
              constructionData={constructionData}
              housingScenarios={housingScenarios}
              lmrOptions={lmrOptions}
              useLMR={settings.mediumDensity.useLMR}
              calculationResults={calculationResults.current?.mediumDensity}
              lmrResults={calculationResults.lmr?.mediumDensity}
              customControls={customControls.enabled ? customControls : null}
            />
          )}
          
          {/* High Density Calculation */}
          {activeCalcTab === 'highDensity' && (
            <FeasibilityCalculation 
              settings={settings} 
              density="highDensity" 
              selectedFeature={selectedFeature}
              salesData={salesData}
              constructionData={constructionData}
              housingScenarios={housingScenarios}
              lmrOptions={lmrOptions}
              useLMR={settings.highDensity.useLMR}
              calculationResults={calculationResults.current?.highDensity}
              lmrResults={calculationResults.lmr?.highDensity}
              customControls={customControls.enabled ? customControls : null}
            />
          )}
        </div>
      )}

      {/* Summary Tab Content */}
      {activeTab === 'summary' && (
        <FeasibilitySummary
          settings={settings}
          lmrOptions={lmrOptions}
          currentResults={calculationResults.current}
          lmrResults={calculationResults.lmr}
          customControls={customControls.enabled ? customControls : null}
          selectedFeature={selectedFeature}
          calculateFeasibility={calculateFeasibility}
        />
      )}

      {showConstructionData && (
        <ConstructionDataModal
          open={showConstructionData}
          onClose={() => onShowConstructionData(false)}
          constructionData={constructionData}
        />
      )}
    </div>
  );
};

export default FeasibilitySettings;