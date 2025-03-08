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

const FeasibilitySettings = ({ settings, onSettingChange, salesData, constructionData, selectedFeature, onShowMedianPrices, lmrOptions, onLMROptionChange, calculationResults }) => {
  // Define property type descriptions
  const densityDescriptions = {
    lowMidDensity: "Includes: Dual OccupancyDuplex/Semi-detached, House, Manor House, Terrace, Townhouse, Villa",
    highDensity: "Includes: Apartment, Build-to-Rent, Shop Top Housing, Studio, Unit"
  };

  // Track if dwelling price has been customized
  const [customDwellingPrice, setCustomDwellingPrice] = useState({
    lowMidDensity: false,
    highDensity: false
  });

  // Store calculated median prices
  const [medianPrices, setMedianPrices] = useState({
    lowMidDensity: null,
    highDensity: null
  });

  // Add state for active tab
  const [activeTab, setActiveTab] = useState('settings');
  
  // Add state for active calculation sub-tab
  const [activeCalcTab, setActiveCalcTab] = useState('lowMidDensity');
  
  // Add state for social and affordable housing scenarios
  const [housingScenarios, setHousingScenarios] = useState({
    socialPercentage: 30,
    affordablePercentage: 30,
    mixedSocialPercentage: 15,
    mixedAffordablePercentage: 15
  });

  // Define settings configuration
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
      label: 'Construction Cost per m² GFA', 
      unit: '$/m²', 
      icon: HardHat, 
      isEditable: true,
      hasRevert: true,
      tooltip: density => `Default based on ${constructionData?.certificateCounts?.[density] || 0} approved DAs`
    },

    // Dwelling Metrics section
    { id: 'section-dwelling', label: 'Dwelling Metrics', isSection: true },
    { 
      id: 'dwellingSize', 
      label: 'Median Dwelling Size', 
      unit: 'm²', 
      icon: Maximize2, 
      isEditable: true,
      hasRevert: true,
      tooltip: density => `Default based on 2 bedroom dwellings from ${constructionData?.certificateCounts?.[density] || 0} approved DAs`
    },
    { 
      id: 'dwellingPrice', 
      label: 'Dwelling Price', 
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
  const calculateFeasibility = (settings, propertyData, density, useLMR = false, lmrOption = null) => {
    try {
      // Get property data
      const developableArea = propertyData?.properties?.copiedFrom?.site_suitability__area || 0;
      const siteArea = propertyData?.properties?.copiedFrom?.site_area || developableArea;
      
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

      // Calculate GFA under FSR and HOB
      const gfaUnderFsr = siteArea * fsr;
      
      // Calculate GFA under HOB
      const maxStoreys = Math.floor(hob / settings.floorToFloorHeight);
      const siteCoverage = developableArea * settings.siteEfficiencyRatio;
      const gfaUnderHob = siteCoverage * maxStoreys * settings.gbaToGfaRatio;

      // Use FSR value if no HoB exists, otherwise use the lower of the two
      let gfa = !hob ? gfaUnderFsr : Math.min(gfaUnderFsr, gfaUnderHob);

      // For Low-Mid Density, limit to 3 storeys unless using LMR controls
      if (density === 'lowMidDensity' && !useLMR) {
        const maxGfaFor3Storeys = siteCoverage * 3 * settings.gbaToGfaRatio;
        gfa = Math.min(gfa, maxGfaFor3Storeys);
      }

      // Calculate NSA and development yield
      const nsa = gfa * settings.gfaToNsaRatio;
      const dwellingSize = constructionData?.dwellingSizes?.[density] || 80; // Default fallback
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

      // Get construction cost
      const constructionCostPerGfa = constructionData?.[density] || 3500; // Default fallback
      
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
    
    // Limit Low-Mid Density to maximum 3 storeys
    if (density === 'lowMidDensity' && maxStoreys > 3) {
      maxStoreys = 3;
    }
    
    const siteCoverage = developableArea * settings[density].siteEfficiencyRatio;
    const gfaUnderHob = siteCoverage * maxStoreys * settings[density].gbaToGfaRatio;

    // Use FSR value if no HoB exists, otherwise use the lower of the two
    let gfa = !hob ? gfaUnderFsr : Math.min(gfaUnderFsr, gfaUnderHob);
    
    // For Low-Mid Density, also limit the GFA to what would be possible with 3 storeys
    if (density === 'lowMidDensity') {
      const maxGfaFor3Storeys = siteCoverage * 3 * settings[density].gbaToGfaRatio;
      gfa = Math.min(gfa, maxGfaFor3Storeys);
    }

    // Get median dwelling size from construction data, filtered by bedroom count
    let dwellingSize = 0;
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
      } else {
        // Fallback to the overall median if no bedroom-specific data
        dwellingSize = constructionData?.dwellingSizes?.[density] || 0;
      }
    } else {
      // Fallback to the overall median if no bedroom-specific data
      dwellingSize = constructionData?.dwellingSizes?.[density] || 0;
    }

  // Filter sales data by property type based on density
  const LOW_MID_DENSITY_TYPES = ['duplex/semi-detached', 'duplex-semi-detached', 'house', 'terrace', 'townhouse', 'villa'];
  const HIGH_DENSITY_TYPES = ['apartment', 'studio', 'unit'];

  const relevantSales = salesData?.filter(sale => {
    const propertyType = sale.property_type?.toLowerCase().trim();
    const propertyTypes = density === 'lowMidDensity' ? LOW_MID_DENSITY_TYPES : HIGH_DENSITY_TYPES;
    
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

    // Get construction cost from construction data
    const constructionCostM2 = constructionData[density === 'lowMidDensity' ? 'lowMidDensity' : 'highDensity'];

    // Use custom dwelling price if set, otherwise use median price
    const dwellingPrice = customDwellingPrice[density] 
      ? settings[density].dwellingPrice 
      : medianPrice;

    return {
      dwellingSize: Math.round(dwellingSize),
      dwellingPrice: dwellingPrice,
      pricePerM2: dwellingPrice && dwellingSize ? Math.round(dwellingPrice / dwellingSize) : null,
      constructionCostM2: Math.round(constructionCostM2)
    };
  };

  // Update median prices when sales data changes
  useEffect(() => {
    if (salesData) {
      const lowMidValues = calculateDerivedValues('lowMidDensity');
      const highValues = calculateDerivedValues('highDensity');
      
      setMedianPrices({
        lowMidDensity: lowMidValues.dwellingPrice,
        highDensity: highValues.dwellingPrice
      });
    }
  }, [salesData]);

  // Initialize dwelling price in settings if it doesn't exist
  useEffect(() => {
    if (salesData && (!settings.lowMidDensity.dwellingPrice || !settings.highDensity.dwellingPrice)) {
      const lowMidValues = calculateDerivedValues('lowMidDensity');
      const highValues = calculateDerivedValues('highDensity');
      
      if (lowMidValues.dwellingPrice && !settings.lowMidDensity.dwellingPrice) {
        onSettingChange('dwellingPrice', lowMidValues.dwellingPrice, 'lowMidDensity');
      }
      
      if (highValues.dwellingPrice && !settings.highDensity.dwellingPrice) {
        onSettingChange('dwellingPrice', highValues.dwellingPrice, 'highDensity');
      }
    }
  }, [salesData]);

  // Set default values for Building Footprint if not already set
  useEffect(() => {
    // Check if siteEfficiencyRatio needs to be updated to the new default values
    if (settings.lowMidDensity.siteEfficiencyRatio !== 0.6) {
      onSettingChange('siteEfficiencyRatio', 0.6, 'lowMidDensity');
    }
    
  if (settings.highDensity.siteEfficiencyRatio !== 0.5) {
    onSettingChange('siteEfficiencyRatio', 0.5, 'highDensity');
  }

    // Set floor to floor height to 3.1m for both density types
    if (settings.lowMidDensity.floorToFloorHeight !== 3.1) {
      onSettingChange('floorToFloorHeight', 3.1, 'lowMidDensity');
    }
    
    if (settings.highDensity.floorToFloorHeight !== 3.1) {
      onSettingChange('floorToFloorHeight', 3.1, 'highDensity');
    }

    // Set GBA to GFA ratio for Low-Mid Density to 90%
    if (settings.lowMidDensity.gbaToGfaRatio !== 0.9) {
      onSettingChange('gbaToGfaRatio', 0.9, 'lowMidDensity');
    }

    // Set Development Contribution to 1% of Construction Costs if not already set
    if (settings.lowMidDensity.developmentContribution !== 0.01) {
      onSettingChange('developmentContribution', 0.01, 'lowMidDensity');
    }
    
    if (settings.highDensity.developmentContribution !== 0.01) {
      onSettingChange('developmentContribution', 0.01, 'highDensity');
    }

    // Set default project period for Low-Mid Density to 24 months
    if (settings.lowMidDensity.projectPeriod !== 24) {
      onSettingChange('projectPeriod', 24, 'lowMidDensity');
    }
  }, []);

  // Update useEffect to calculate results when settings change
  useEffect(() => {
    if (!selectedFeature) return;

    // Calculate results for current controls
    const currentLowMidResults = calculateFeasibility(settings.lowMidDensity, selectedFeature, 'lowMidDensity', false);
    const currentHighResults = calculateFeasibility(settings.highDensity, selectedFeature, 'highDensity', false);

    // Calculate results for LMR controls if available
    const lmrLowMidResults = lmrOptions.isInLMRArea && settings.lowMidDensity.useLMR
      ? calculateFeasibility(settings.lowMidDensity, selectedFeature, 'lowMidDensity', true, lmrOptions.selectedOptions.lowMidDensity)
      : null;
    const lmrHighResults = lmrOptions.isInLMRArea && settings.highDensity.useLMR
      ? calculateFeasibility(settings.highDensity, selectedFeature, 'highDensity', true, lmrOptions.selectedOptions.highDensity)
      : null;

    calculationResults.current = {
      lowMidDensity: currentLowMidResults,
      highDensity: currentHighResults
    };
    calculationResults.lmr = {
      lowMidDensity: lmrLowMidResults,
      highDensity: lmrHighResults
    };
  }, [settings, selectedFeature, lmrOptions]);

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
    if (setting === 'constructionCostM2' || 
        setting === 'dwellingSize') {
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
              <h3 className="text-lg font-bold mb-2 flex items-center">
                <Map className="mr-2" size={18} /> Property Information
              </h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="flex items-center">
                  <Landmark className="mr-2" size={16} />
                  <span className="font-medium">Zone:</span>
                  <span className="ml-2">{selectedFeature?.properties?.copiedFrom?.site_suitability__principal_zone_identifier?.split('-')?.[0]?.trim() || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <Building2 className="mr-2" size={16} />
                  <span className="font-medium">FSR:</span>
                  <span className="ml-2">{selectedFeature?.properties?.copiedFrom?.site_suitability__floorspace_ratio || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <Ruler className="mr-2" size={16} />
                  <span className="font-medium">HOB:</span>
                  <span className="ml-2">{selectedFeature?.properties?.copiedFrom?.site_suitability__height_of_building ? `${selectedFeature.properties.copiedFrom.site_suitability__height_of_building}m` : 'N/A'}</span>
                </div>
              </div>

              {/* LMR Options Section */}
              {lmrOptions.isInLMRArea && (
                <div className="mt-4 border-t border-blue-200 pt-4">
                  <h4 className="font-bold mb-2">LMR Development Options</h4>
                  
                  {/* Low-Mid Density Options */}
                  <div className="mb-4">
                    <h5 className="font-medium mb-2">Low-Mid Density Controls</h5>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="lowMidDensityControl"
                          value="current"
                          checked={!settings.lowMidDensity.useLMR}
                          onChange={() => onSettingChange('useLMR', false, 'lowMidDensity')}
                          className="mr-2"
                        />
                        <span>Current Controls</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="lowMidDensityControl"
                          value="lmr"
                          checked={settings.lowMidDensity.useLMR}
                          onChange={() => onSettingChange('useLMR', true, 'lowMidDensity')}
                          className="mr-2"
                        />
                        <span>LMR Controls</span>
                      </label>
                    </div>
                    {settings.lowMidDensity.useLMR && lmrOptions.allOptions?.lowMidDensity?.length > 0 && (
                      <select
                        value={lmrOptions.selectedOptions.lowMidDensity?.type || ''}
                        onChange={(e) => {
                          const option = lmrOptions.allOptions.lowMidDensity.find(opt => opt.type === e.target.value);
                          onLMROptionChange(option, 'lowMidDensity');
                        }}
                        className="mt-2 w-full p-2 border rounded"
                      >
                        {lmrOptions.allOptions.lowMidDensity.map((option) => (
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
                    <span title={densityDescriptions.lowMidDensity} className="cursor-help">
                      Low-Mid Density
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
                      {renderInput(setting, 'lowMidDensity')}
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
              className={`flex items-center px-4 py-2 font-medium ${activeCalcTab === 'lowMidDensity' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
              onClick={() => handleCalcTabChange('lowMidDensity')}
            >
              <Building2 className="mr-2" size={16} /> Low-Mid Density
            </button>
            <button
              className={`flex items-center px-4 py-2 font-medium ${activeCalcTab === 'highDensity' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
              onClick={() => handleCalcTabChange('highDensity')}
            >
              <Building className="mr-2" size={16} /> High Density
            </button>
          </div>
          
          {/* Low-Mid Density Calculation */}
          {activeCalcTab === 'lowMidDensity' && (
            <FeasibilityCalculation 
              settings={settings} 
              density="lowMidDensity" 
              selectedFeature={selectedFeature}
              salesData={salesData}
              constructionData={constructionData}
              housingScenarios={housingScenarios}
              lmrOptions={lmrOptions}
              useLMR={settings.lowMidDensity.useLMR}
              calculationResults={calculationResults.current?.lowMidDensity}
              lmrResults={calculationResults.lmr?.lowMidDensity}
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
        />
      )}
    </div>
  );
};

export default FeasibilitySettings;