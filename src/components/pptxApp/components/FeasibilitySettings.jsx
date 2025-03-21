import React, { useState, useEffect, useRef } from 'react';
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
  BarChart3,
  CheckCircle2,
  XCircle,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  Layers
} from 'lucide-react';
import * as turf from '@turf/turf';
import FeasibilityCalculation from './FeasibilityCalculation';
import FeasibilitySummary from './FeasibilitySummary';
import ConstructionDataModal from './ConstructionDataModal';

const FeasibilitySettings = ({ 
  settings, 
  onSettingChange, 
  salesData, 
  constructionData, 
  selectedFeature, 
  developableArea, 
  onShowMedianPrices, 
  onShowConstructionData, 
  onShowDwellingSizeData, 
  lmrOptions, 
  onLMROptionChange, 
  calculationResults 
}) => {
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

  // Add state for LMR catchment check
  const [lmrCatchmentData, setLmrCatchmentData] = useState({
    isWithinCatchment: false,
    location: null,
    distance: null,
    isLoading: true,
    error: null
  });

  // Add state for LMR requirements check
  const [lmrRequirementsCheck, setLmrRequirementsCheck] = useState({
    siteArea: null,
    siteWidth: null,
    zone: null,
    meetsMinArea: false,
    meetsMinWidth: false,
    eligibleZone: false,
    applicableLmrControls: null,
    currentFsr: null,
    currentHob: null,
    fsrIncrease: null,
    hobIncrease: null
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
    { 
      id: 'minimumLotSize', 
      label: 'Minimum Lot Size Per Dwelling', 
      unit: 'm²', 
      icon: Map, 
      isEditable: true,
      tooltip: 'Minimum lot size for medium density dwellings (not applicable to high density)'
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
      
      // For medium density, use the full developable area for building footprint
      // For high density, use the siteEfficiencyRatio as before
      const siteCoverage = density === 'mediumDensity' 
        ? developableArea
        : developableArea * settings.siteEfficiencyRatio;
        
      // For high-density: GFA = Site Area × 60% (building footprint) × HOB/3.1 (storeys) × 75% (efficiency)
      // For medium-density: GFA = Site Area × 100% (full developable area) × HOB/3.1 (max 3 storeys) × 90% (efficiency)
      const gfaUnderHob = siteCoverage * maxStoreys * settings.gbaToGfaRatio;

      // Use HOB value if FSR is 0 or missing, otherwise use the lower of the two
      let gfa;
      let calculationMethod;
      
      if (!fsr || fsr === 0) {
        // If FSR is missing or 0, use HOB-based calculation when HOB > 0
        if (hob > 0) {
          gfa = gfaUnderHob;
          calculationMethod = `HOB ${hob}m (${maxStoreys} storeys × ${siteCoverage.toLocaleString()} m² footprint × ${(settings.gbaToGfaRatio * 100).toFixed(0)}% efficiency)`;
        } else {
          gfa = 0;
          calculationMethod = 'No FSR or HOB available';
        }
      } else if (!hob || hob === 0) {
        // If HOB is missing or 0, use FSR-based calculation
        gfa = gfaUnderFsr;
        calculationMethod = `FSR ${fsr}:1 (${siteArea.toLocaleString()} m² × ${fsr} = ${gfa.toLocaleString()} m²)`;
      } else {
        // Both FSR and HOB are available, use the more restrictive one
        const useHob = gfaUnderHob < gfaUnderFsr;
        gfa = useHob ? gfaUnderHob : gfaUnderFsr;
        calculationMethod = useHob 
          ? `HOB ${hob}m (${maxStoreys} storeys × ${siteCoverage.toLocaleString()} m² footprint × ${(settings.gbaToGfaRatio * 100).toFixed(0)}% efficiency)`
          : `FSR ${fsr}:1 (${siteArea.toLocaleString()} m² × ${fsr} = ${gfa.toLocaleString()} m²)`;
      }

      // For Medium Density, limit to 3 storeys unless using LMR controls
      if (density === 'mediumDensity' && !useLMR) {
        const maxGfaFor3Storeys = siteCoverage * 3 * settings.gbaToGfaRatio;
        gfa = Math.min(gfa, maxGfaFor3Storeys);
      }

      // Calculate NSA and development yield
      let nsa = gfa * settings.gfaToNsaRatio;
      
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
      
      // Calculate development yield
      let developmentYield = Math.floor(nsa / dwellingSize);
      
      // Special handling for medium density when FSR = 0 and HOB = 0
      // In this case, default to the lot size constraint calculation
      if (density === 'mediumDensity' && (fsr === 0 || !fsr) && (hob === 0 || !hob)) {
        const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use setting or default to 200m² per dwelling
        const maxDwellingsByLotSize = Math.floor(developableArea / minimumLotSize);
        
        // If the calculated yield is 0, use the lot size constraint as default
        if (developmentYield === 0) {
          developmentYield = maxDwellingsByLotSize;
          
          // Recalculate GFA and NSA based on the new yield
          const estimatedNsa = developmentYield * dwellingSize;
          nsa = estimatedNsa;
          gfa = estimatedNsa / settings.gfaToNsaRatio;
        } else {
          // If yield > 0, still apply the lot size constraint as a maximum
          developmentYield = Math.min(developmentYield, maxDwellingsByLotSize);
        }
      }
      
      // Special handling for FSR = 0 and HOB > 0 to make sure development yield is not zero
      if (fsr === 0 && hob > 0 && developmentYield === 0) {
        // Use a minimum yield based on building footprint and number of floors
        const footprint = siteCoverage;
        const numberOfFloors = maxStoreys;
        
        if (footprint > 0 && numberOfFloors > 0) {
          // Ensure at least a minimum yield based on the building volume
          developmentYield = Math.max(1, Math.floor(footprint * numberOfFloors / 100));
        }
      }

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
        lmrHOBRange: lmrOption?.hobRange || null,
        calculationMethod
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
    
    // For medium density, use the full developable area for building footprint
    // For high density, use the siteEfficiencyRatio as before
    const siteCoverage = density === 'mediumDensity' 
      ? developableArea
      : developableArea * settings[density].siteEfficiencyRatio;
      
    // For high-density: GFA = Site Area × 60% (building footprint) × HOB/3.1 (storeys) × 75% (efficiency)
    // For medium-density: GFA = Site Area × 100% (full developable area) × HOB/3.1 (max 3 storeys) × 90% (efficiency)
    const gfaUnderHob = siteCoverage * maxStoreys * settings[density].gbaToGfaRatio;

    // Use FSR value if no HoB exists, otherwise use the lower of the two
    let gfa = !hob ? gfaUnderFsr : Math.min(gfaUnderFsr, gfaUnderHob);
    
    // For Medium Density, also limit the GFA to what would be possible with 3 storeys
    if (density === 'mediumDensity') {
      const maxGfaFor3Storeys = siteCoverage * 3 * settings[density].gbaToGfaRatio;
      gfa = Math.min(gfa, maxGfaFor3Storeys);
    }

  // Get construction cost from construction data
  // First try to get the median construction cost from the processed construction data
  let constructionCostM2 = constructionData?.[density]; // Direct access to the median value
  
  // If not available, try to calculate it from the raw data if available
  if ((!constructionCostM2 || constructionCostM2 === 0) && constructionData?.constructionCostsRaw) {
    // Filter based on development types matching the density type
    const typesForDensity = density === 'mediumDensity' ? MEDIUM_DENSITY_CC_TYPES : HIGH_DENSITY_CC_TYPES;
    const relevantCosts = constructionData.constructionCostsRaw
      .filter(item => typesForDensity.includes(item.developmentType) && item.costPerM2 > 0)
      .map(item => item.costPerM2)
      .sort((a, b) => a - b);
    
    // Calculate median if we have relevant costs
    if (relevantCosts.length > 0) {
      constructionCostM2 = relevantCosts[Math.floor(relevantCosts.length / 2)];
    }
  }
  
  // Default fallback if still not available
  if (!constructionCostM2) {
    constructionCostM2 = density === 'mediumDensity' ? 3500 : 3800;
  }
  
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
    const propertyTypes = density === 'mediumDensity' ? MEDIUM_DENSITY_TYPES : HIGH_DENSITY_TYPES;
    
    let relevantSales = [];
    
    if (density === 'mediumDensity') {
      // For medium density, don't filter by bedrooms at all
      relevantSales = salesData?.filter(sale => {
        const propertyType = sale.property_type?.toLowerCase().trim();
        return propertyTypes.some(type => propertyType?.includes(type));
      }) || [];
    } else {
      // For high density, first try 2-bedroom properties
      relevantSales = salesData?.filter(sale => {
        const propertyType = sale.property_type?.toLowerCase().trim();
        const typeMatches = propertyTypes.some(type => propertyType?.includes(type));
        const bedroomCount = sale.bedrooms ? parseInt(sale.bedrooms, 10) : null;
        const isTwoBedroom = bedroomCount === 2;
        return typeMatches && isTwoBedroom;
      }) || [];
      
      // If no 2-bedroom high-density properties found, try any bedroom count
      if (relevantSales.length === 0) {
        console.log("No 2-bedroom high-density properties found, trying any bedroom count");
        relevantSales = salesData?.filter(sale => {
          const propertyType = sale.property_type?.toLowerCase().trim();
          return propertyTypes.some(type => propertyType?.includes(type));
        }) || [];
      }
    }

    console.log(`Found ${relevantSales.length} relevant sales for ${density}`);
    
    // Get median price from filtered sales data
    const medianPrice = relevantSales.length > 0 
      ? relevantSales.map(s => s.price).sort((a, b) => a - b)[Math.floor(relevantSales.length / 2)]
      : null;
      
    if (medianPrice === null) {
      console.log(`No median price found for ${density}`);
    } else {
      console.log(`Median price for ${density}: ${medianPrice}`);
    }

    // Create a fallback price if needed
    let finalPrice = medianPrice;
    
    // If medium-density has no price but high-density does, estimate medium-density price
    if (density === 'mediumDensity' && finalPrice === null) {
      // Try to get high-density price for comparison
      const highDensityData = calculateDerivedValues('highDensity');
      const highDensityPrice = highDensityData.dwellingPrice;
      
      if (highDensityPrice && dwellingSize && highDensityData.dwellingSize) {
        // Estimate medium-density price based on high-density price adjusted for size
        // Medium-density typically has premium per sqm (about 10% more per sqm)
        const sizeRatio = dwellingSize / highDensityData.dwellingSize;
        const pricePerSqmPremium = 1.1; // 10% premium per sqm for medium-density
        finalPrice = Math.round(highDensityPrice * sizeRatio * pricePerSqmPremium);
        console.log(`Estimated medium-density price: ${finalPrice} based on high-density price: ${highDensityPrice}`);
      } else if (highDensityPrice) {
        // If no size data, use a typical ratio between medium and high density prices
        // Medium-density is typically ~1.5-1.8x the price of high-density
        finalPrice = Math.round(highDensityPrice * 1.65);
        console.log(`Estimated medium-density price: ${finalPrice} based on typical ratio to high-density`);
      } else {
        // Fallback to a default price if no other data is available
        finalPrice = 950000; // Default fallback value for medium-density
        console.log(`Using default fallback price for medium-density: ${finalPrice}`);
      }
    }

    // Calculate assumed construction cost (rounded down to nearest 10)
    const assumedConstructionCostM2 = Math.floor(constructionCostM2 / 10) * 10;

    // Calculate assumed dwelling size based on density
    const assumedDwellingSize = density === 'highDensity' ? 75 : Math.floor(dwellingSize / 10) * 10;

    // Use custom dwelling price if set, otherwise use median price
    const dwellingPrice = customDwellingPrice[density] 
      ? settings[density]['dwellingPrice'] 
      : finalPrice;

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
    if (settings.mediumDensity.siteEfficiencyRatio !== 0.7) {
      onSettingChange('siteEfficiencyRatio', 0.7, 'mediumDensity');
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
    
    // For any money values or values that need commas
    if (setting === 'daApplicationFees' || 
        setting === 'dwellingPrice' || 
        setting === 'pricePerM2' ||
        setting === 'constructionCostM2' || 
        setting === 'assumedConstructionCostM2') {
      return Math.round(value).toLocaleString('en-AU');
    }
    
    // For dwelling size and other whole numbers that need commas
    if (setting === 'dwellingSize' || 
        setting === 'projectPeriod' ||
        setting === 'minimumLotSize') {
      return Math.round(value).toLocaleString('en-AU');
    }
    
    // For percentages
    if (setting === 'developmentContribution') {
      return (value * 100).toFixed(0);
    }
    
    // For ratio values shown as percentages
    if (setting.endsWith('Ratio') || 
        setting === 'agentsSalesCommission' || 
        setting === 'legalFeesOnSales' || 
        setting === 'marketingCosts' || 
        setting === 'profitAndRisk' || 
        setting === 'professionalFees' || 
        setting === 'interestRate') {
      return (value * 100).toFixed(1);
    }
    
    // For other numbers that don't need special formatting
    if (typeof value === 'number') {
      return value.toLocaleString('en-AU');
    }
    
    return value.toString();
  };

  // Function to render the appropriate input for each setting
  const renderInput = (setting, density) => {
    const settingId = setting.id;
    const value = settings[density][settingId];
    const formattedValue = formatValue(settingId, value);
    
    // For calculated or read-only values, just display text
    if (setting.isCalculated || setting.readOnly) {
      return (
        <div className="flex items-center justify-center">
          <div className="relative inline-block">
            <span className="text-sm">
              {formattedValue}
              {setting.unit ? ` ${setting.unit}` : ''}
            </span>
            
            {setting.tooltip && (
              <div className="inline-block ml-1 cursor-help" title={setting.tooltip(density)}>
                <Info size={14} className="text-blue-500" />
              </div>
            )}
            
            {setting.showConstructionButton && (
              <button 
                onClick={onShowConstructionData}
                className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                title="View construction cost data"
              >
                <FileSpreadsheet size={14} />
              </button>
            )}
            
            {settingId === 'dwellingPrice' && customDwellingPrice[density] && medianPrices[density] && (
              <button
                onClick={() => handleRevertPrice(density)}
                className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                title="Revert to median price"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        </div>
      );
    }
    
    // For editable values, render an input
    return (
      <div className="flex items-center justify-center">
        <input
          type="number"
          min="0"
          step={settingId.endsWith('Ratio') || 
                settingId === 'agentsSalesCommission' || 
                settingId === 'legalFeesOnSales' || 
                settingId === 'marketingCosts' || 
                settingId === 'profitAndRisk' || 
                settingId === 'professionalFees' || 
                settingId === 'interestRate' ? "0.1" : "1"}
          value={settingId.endsWith('Ratio') || 
                 settingId === 'agentsSalesCommission' || 
                 settingId === 'legalFeesOnSales' || 
                 settingId === 'marketingCosts' || 
                 settingId === 'profitAndRisk' || 
                 settingId === 'professionalFees' || 
                 settingId === 'interestRate' ? (value * 100).toFixed(1) : value}
          onChange={handleChange(settingId, density)}
          className="w-24 px-2 py-1 border rounded text-right"
        />
        <span className="ml-1">{setting.unit || ''}</span>
        
        {settingId === 'dwellingPrice' && (
          <button
            onClick={onShowMedianPrices}
            className="ml-2 text-xs text-blue-600 hover:text-blue-800"
            title="View median prices"
          >
            <FileSpreadsheet size={14} />
          </button>
        )}
        
        {settingId === 'dwellingSize' && (
          <button
            onClick={onShowDwellingSizeData}
            className="ml-2 text-xs text-blue-600 hover:text-blue-800"
            title="View dwelling sizes"
          >
            <FileSpreadsheet size={14} />
          </button>
        )}
      </div>
    );
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

  // Function to calculate site width using turf.js
  const calculateSiteWidth = (geometry) => {
    try {
      if (!geometry) return null;
      
      // Convert geometry to a turf feature if it's not already
      const feature = turf.feature(geometry);
      
      // Calculate the bounding box of the geometry
      const bbox = turf.bbox(feature);
      
      // Calculate the width (east-west distance)
      const westPoint = turf.point([bbox[0], (bbox[1] + bbox[3]) / 2]);
      const eastPoint = turf.point([bbox[2], (bbox[1] + bbox[3]) / 2]);
      const width = turf.distance(westPoint, eastPoint, { units: 'meters' });
      
      // Calculate the height (north-south distance)
      const southPoint = turf.point([(bbox[0] + bbox[2]) / 2, bbox[1]]);
      const northPoint = turf.point([(bbox[0] + bbox[2]) / 2, bbox[3]]);
      const height = turf.distance(southPoint, northPoint, { units: 'meters' });
      
      // Return the smaller of the two as a conservative estimate of site width
      return Math.min(width, height);
    } catch (error) {
      console.error("Error calculating site width:", error);
      return null;
    }
  };

  // Function to check if the site meets LMR requirements
  useEffect(() => {
    const checkLmrRequirements = () => {
      if (!selectedFeature) return;
      
      try {
        // Get the property geometry and zone
        const geometry = selectedFeature.geometry || selectedFeature.properties?.copiedFrom?.site__geometry;
        const zoneData = selectedFeature?.properties?.copiedFrom?.site_suitability__principal_zone_identifier || '';
        const zoneCode = zoneData.split('-')[0]?.trim() || '';
        
        // This part is not working correctly - need to ensure we're using the developableArea prop
        // Check if developable area is available and use it instead of the entire property
        let siteArea = 0, siteGeometry = null;
        
        // First check for the developableArea prop directly - this is the one we need to use
        if (developableArea && developableArea.features && developableArea.features.length > 0) {
          // Calculate total area from all developable area features
          siteArea = developableArea.features.reduce((total, feature) => {
            return total + turf.area(feature.geometry);
          }, 0);
          
          // Use the first developable area geometry for width calculation
          siteGeometry = developableArea.features[0].geometry;
          console.log('Using developableArea prop for LMR checks:', {
            area: siteArea,
            features: developableArea.features.length
          });
        }
        // Only fall back to selectedFeature if the prop isn't available
        else if (selectedFeature.properties?.developableArea || 
            selectedFeature.properties?.copiedFrom?.developableArea) {
          // Use developable area if available
          const featureDevelopableArea = selectedFeature.properties?.developableArea || 
                                 selectedFeature.properties?.copiedFrom?.developableArea;
          
          if (featureDevelopableArea && featureDevelopableArea.features && featureDevelopableArea.features.length > 0) {
            // Calculate total area from all developable area features
            siteArea = featureDevelopableArea.features.reduce((total, feature) => {
              return total + turf.area(feature.geometry);
            }, 0);
            
            // Use the first developable area geometry for width calculation
            siteGeometry = featureDevelopableArea.features[0].geometry;
            console.log('Using feature developableArea for LMR checks:', {
              area: siteArea,
              features: featureDevelopableArea.features.length
            });
          } else {
            // Fallback to property area
            siteArea = selectedFeature?.properties?.copiedFrom?.site_suitability__area || 
                      (geometry ? turf.area(geometry) : 0);
            siteGeometry = geometry;
            console.log('Falling back to property area for LMR checks:', {
              area: siteArea
            });
          }
        } else {
          // No developable area defined, use property area
          siteArea = selectedFeature?.properties?.copiedFrom?.site_suitability__area || 
                    (geometry ? turf.area(geometry) : 0);
          siteGeometry = geometry;
          console.log('No developable area found, using property area for LMR checks:', {
            area: siteArea
          });
        }
        
        // Calculate or get site width from the appropriate geometry
        let siteWidth = 0;
        if (siteGeometry) {
          siteWidth = calculateSiteWidth(siteGeometry);
          console.log('Calculated site width from geometry:', siteWidth);
        } else {
          siteWidth = selectedFeature?.properties?.copiedFrom?.site_suitability__site_width || 0;
          console.log('Using property site width:', siteWidth);
        }
        
        // Get current controls
        const currentFsr = selectedFeature?.properties?.copiedFrom?.site_suitability__floorspace_ratio || 0;
        const currentHob = selectedFeature?.properties?.copiedFrom?.site_suitability__height_of_building || 0;
        
        // Determine applicable LMR controls based on zone and catchment distance
        const isR1R2 = zoneCode === 'R1' || zoneCode === 'R2';
        const isR3R4 = zoneCode === 'R3' || zoneCode === 'R4';
        
        let applicableLmrControls = null;
        
        if (isR1R2) {
          applicableLmrControls = {
            minArea: 500,
            minWidth: 12,
            fsr: 0.8,
            hob: 9.5,
            catchmentDistance: null
          };
        } else if (isR3R4) {
          if (lmrCatchmentData.isWithinCatchment) {
            if (lmrCatchmentData.distance === 400) {
              applicableLmrControls = {
                minArea: 0, // No minimum area specified for R3/R4
                minWidth: 0, // No minimum width specified for R3/R4
                fsr: 2.2,
                hob: 22,
                catchmentDistance: 400
              };
            } else if (lmrCatchmentData.distance === 800) {
              applicableLmrControls = {
                minArea: 0, // No minimum area specified for R3/R4
                minWidth: 0, // No minimum width specified for R3/R4
                fsr: 1.5,
                hob: 17.5,
                catchmentDistance: 800
              };
            }
          }
        }
        
        // Check if the site meets the requirements
        const meetsMinArea = isR1R2 ? siteArea >= 500 : true; // Only R1/R2 have min area requirement
        const meetsMinWidth = isR1R2 ? siteWidth >= 12 : true; // Only R1/R2 have min width requirement
        const eligibleZone = isR1R2 || isR3R4;
        
        // Calculate FSR and HOB increase percentages
        let fsrIncrease = 0;
        let hobIncrease = 0;
        
        if (applicableLmrControls && currentFsr > 0) {
          fsrIncrease = ((applicableLmrControls.fsr - currentFsr) / currentFsr) * 100;
        }
        
        if (applicableLmrControls && currentHob > 0) {
          hobIncrease = ((applicableLmrControls.hob - currentHob) / currentHob) * 100;
        }
        
        // Store the results
        setLmrRequirementsCheck({
          siteArea,
          siteWidth,
          zone: zoneCode,
          meetsMinArea,
          meetsMinWidth,
          eligibleZone,
          applicableLmrControls,
          currentFsr,
          currentHob,
          fsrIncrease,
          hobIncrease
        });
        
      } catch (error) {
        console.error("Error checking LMR requirements:", error);
      }
    };
    
    checkLmrRequirements();
  }, [selectedFeature, lmrCatchmentData, developableArea]);

  const showConstructionData = settings.mediumDensity.useLMR || settings.highDensity.useLMR;

  // Add default minimumLotSize if not present in settings
  useEffect(() => {
    if (settings.mediumDensity && !settings.mediumDensity.hasOwnProperty('minimumLotSize')) {
      onSettingChange('minimumLotSize', 200, 'mediumDensity');
    }
  }, [settings]);

  // Function to format location string (convert snake_case to Title Case)
  const formatLocation = (location) => {
    if (!location) return '';
    
    return location
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Function to check if a point is within a polygon
  function isPointInPolygon(point, polygon) {
    try {
      // Implementation of the ray-casting algorithm
      // point is [lon, lat], polygon is an array of [lon, lat] coordinates forming a polygon
      
      const x = point[0], y = point[1];
      let inside = false;
      
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      
      return inside;
    } catch (error) {
      console.error("Error checking if point is in polygon:", error);
      return false;
    }
  }

  // Function to check if the property is within any LMR catchment
  useEffect(() => {
    const checkLmrCatchment = async () => {
      if (!selectedFeature) {
        setLmrCatchmentData({
          isWithinCatchment: false,
          location: null,
          distance: null,
          isLoading: false,
          error: null
        });
        return;
      }
      
      try {
        setLmrCatchmentData(prev => ({ ...prev, isLoading: true, error: null }));
        
        // Get the property coordinates
        const geometry = selectedFeature.geometry || selectedFeature.properties?.copiedFrom?.site__geometry;
        
        if (!geometry) {
          throw new Error("No geometry found for the selected property");
        }
        
        // Get a representative point for the property
        let propertyPoint;
        if (geometry.type === 'Point') {
          propertyPoint = geometry.coordinates;
        } else if (geometry.type === 'Polygon') {
          // Use the first coordinate as a representative point
          propertyPoint = geometry.coordinates[0][0];
        } else if (geometry.type === 'MultiPolygon') {
          // Use the first coordinate of the first polygon
          propertyPoint = geometry.coordinates[0][0][0];
        } else {
          throw new Error(`Unsupported geometry type: ${geometry.type}`);
        }
        
        // Fetch the LMR catchment data
        const response = await fetch('/LMR_Walking_Catchments_4326.geojson');
        if (!response.ok) {
          throw new Error(`Failed to fetch LMR catchment data: ${response.statusText}`);
        }
        
        const catchmentData = await response.json();
        
        // First try to find the property in a 400m catchment
        let isWithin400m = false;
        let isWithin800m = false;
        let matchingFeature400m = null;
        let matchingFeature800m = null;
        
        for (const feature of catchmentData.features) {
          // Check if this is a 400m catchment
          const isFeature400m = feature.properties?.distance === 400;
          
          if (feature.geometry.type === 'Polygon') {
            if (isPointInPolygon(propertyPoint, feature.geometry.coordinates[0])) {
              if (isFeature400m) {
                isWithin400m = true;
                matchingFeature400m = feature;
                break; // Found in 400m catchment, no need to check further
              } else {
                isWithin800m = true;
                matchingFeature800m = feature;
                // Don't break, keep looking for a 400m catchment
              }
            }
          } else if (feature.geometry.type === 'MultiPolygon') {
            for (const polygon of feature.geometry.coordinates) {
              if (isPointInPolygon(propertyPoint, polygon[0])) {
                if (isFeature400m) {
                  isWithin400m = true;
                  matchingFeature400m = feature;
                  break; // Found in 400m catchment
                } else {
                  isWithin800m = true;
                  matchingFeature800m = feature;
                  // Don't break, keep looking for a 400m catchment
                }
              }
            }
            if (isWithin400m) break; // Exit outer loop if found in 400m catchment
          }
        }
        
        // Prioritize 400m catchment over 800m
        const isWithin = isWithin400m || isWithin800m;
        const matchingFeature = isWithin400m ? matchingFeature400m : matchingFeature800m;
        const distance = isWithin400m ? 400 : (isWithin800m ? 800 : null);
        
        setLmrCatchmentData({
          isWithinCatchment: isWithin,
          location: matchingFeature?.properties?.location || null,
          distance: distance,
          isLoading: false,
          error: null
        });
        
      } catch (error) {
        console.error("Error checking LMR catchment:", error);
        setLmrCatchmentData({
          isWithinCatchment: false,
          location: null,
          distance: null,
          isLoading: false,
          error: error.message
        });
      }
    };
    
    checkLmrCatchment();
  }, [selectedFeature]);

  // Add state for LMR section visibility
  const [showLMRSection, setShowLMRSection] = useState(false);

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

              {/* Low Mid Rise Housing Section */}
              <div className="mb-4 p-3 bg-white rounded-lg shadow-sm">
                <div 
                  className="flex items-center justify-between mb-3 cursor-pointer"
                  onClick={() => setShowLMRSection(prev => !prev)}
                >
                  <h4 className="font-medium text-gray-700 flex items-center">
                    <Building className="mr-2" size={16} />
                    Low Mid Rise Housing
                  </h4>
                  <div className="text-gray-500">
                    {showLMRSection ? (
                      <ChevronUp size={18} />
                    ) : (
                      <ChevronDown size={18} />
                    )}
                  </div>
                </div>

                {showLMRSection && (
                  <>
                    {lmrCatchmentData.isLoading ? (
                      <div className="flex items-center justify-center p-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                        <span>Checking catchment areas...</span>
                      </div>
                    ) : lmrCatchmentData.error ? (
                      <div className="text-red-500 text-sm">{lmrCatchmentData.error}</div>
                    ) : lmrCatchmentData.isWithinCatchment ? (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center text-green-700 font-medium">
                          <CheckCircle2 className="mr-2" size={16} />
                          Property is within {lmrCatchmentData.distance}m of the {formatLocation(lmrCatchmentData.location)} LMR area.
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex items-center text-red-700 font-medium">
                          <XCircle className="mr-2" size={16} />
                          Property is not within an LMR walking catchment
                        </div>
                      </div>
                    )}

                    {/* LMR Requirements Table */}
                    <div className="mt-4">
                      <h5 className="font-medium mb-2">High Density (Residential Flat Buildings) LMR Controls</h5>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-200 rounded">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-4 py-2 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requirements</th>
                              <th className="px-4 py-2 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">R1 & R2 Zones</th>
                              <th className="px-4 py-2 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">R3 & R4 Zones (400m)</th>
                              <th className="px-4 py-2 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">R3 & R4 Zones (800m)</th>
                              <th className="px-4 py-2 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">This Property</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            <tr>
                              <td className="px-4 py-2 text-sm">Min. Site Area</td>
                              <td className="px-4 py-2 text-sm">500 m²</td>
                              <td className="px-4 py-2 text-sm">-</td>
                              <td className="px-4 py-2 text-sm">-</td>
                              <td className="px-4 py-2 text-sm">
                                {lmrRequirementsCheck.siteArea ? (
                                  <div className="flex items-center">
                                    <span className="mr-2">{Math.round(lmrRequirementsCheck.siteArea).toLocaleString()} m²</span>
                                    {lmrRequirementsCheck.zone === 'R1' || lmrRequirementsCheck.zone === 'R2' ? (
                                      lmrRequirementsCheck.meetsMinArea ? (
                                        <Check size={16} className="text-green-500" />
                                      ) : (
                                        <X size={16} className="text-red-500" />
                                      )
                                    ) : (
                                      <span className="text-gray-400">N/A</span>
                                    )}
                                  </div>
                                ) : (
                                  'Unknown'
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2 text-sm">Min. Width</td>
                              <td className="px-4 py-2 text-sm">12 m</td>
                              <td className="px-4 py-2 text-sm">-</td>
                              <td className="px-4 py-2 text-sm">-</td>
                              <td className="px-4 py-2 text-sm">
                                {lmrRequirementsCheck.siteWidth ? (
                                  <div className="flex items-center">
                                    <span className="mr-2">{Math.round(lmrRequirementsCheck.siteWidth).toLocaleString()} m</span>
                                    {lmrRequirementsCheck.zone === 'R1' || lmrRequirementsCheck.zone === 'R2' ? (
                                      lmrRequirementsCheck.meetsMinWidth ? (
                                        <Check size={16} className="text-green-500" />
                                      ) : (
                                        <X size={16} className="text-red-500" />
                                      )
                                    ) : (
                                      <span className="text-gray-400">N/A</span>
                                    )}
                                  </div>
                                ) : (
                                  'Unknown'
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2 text-sm">FSR</td>
                              <td className="px-4 py-2 text-sm">0.8:1</td>
                              <td className="px-4 py-2 text-sm">2.2:1</td>
                              <td className="px-4 py-2 text-sm">1.5:1</td>
                              <td className="px-4 py-2 text-sm">
                                {lmrRequirementsCheck.applicableLmrControls ? (
                                  <div className="flex flex-col">
                                    <div className="flex items-center">
                                      <span className="font-medium">Current: </span>
                                      <span className="ml-1">{lmrRequirementsCheck.currentFsr ? lmrRequirementsCheck.currentFsr.toFixed(1) : 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center">
                                      <span className="font-medium">LMR: </span>
                                      <span className="ml-1">{lmrRequirementsCheck.applicableLmrControls.fsr.toFixed(1)}</span>
                                    </div>
                                    {lmrRequirementsCheck.currentFsr > 0 && (
                                      <div className="flex items-center mt-1">
                                        {lmrRequirementsCheck.fsrIncrease > 0 ? (
                                          <>
                                            <ArrowUp size={14} className="text-green-500 mr-1" />
                                            <span className="text-green-500 text-xs">+{(lmrRequirementsCheck.applicableLmrControls.fsr - lmrRequirementsCheck.currentFsr).toFixed(1)}</span>
                                          </>
                                        ) : lmrRequirementsCheck.fsrIncrease < 0 ? (
                                          <>
                                            <ArrowDown size={14} className="text-red-500 mr-1" />
                                            <span className="text-red-500 text-xs">{(lmrRequirementsCheck.applicableLmrControls.fsr - lmrRequirementsCheck.currentFsr).toFixed(1)}</span>
                                          </>
                                        ) : (
                                          <span className="text-gray-500 text-xs">No change</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-500">Not applicable</span>
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2 text-sm">HOB</td>
                              <td className="px-4 py-2 text-sm">9.5 m</td>
                              <td className="px-4 py-2 text-sm">22 m</td>
                              <td className="px-4 py-2 text-sm">17.5 m</td>
                              <td className="px-4 py-2 text-sm">
                                {lmrRequirementsCheck.applicableLmrControls ? (
                                  <div className="flex flex-col">
                                    <div className="flex items-center">
                                      <span className="font-medium">Current: </span>
                                      <span className="ml-1">{lmrRequirementsCheck.currentHob || 'N/A'} m</span>
                                    </div>
                                    <div className="flex items-center">
                                      <span className="font-medium">LMR: </span>
                                      <span className="ml-1">{lmrRequirementsCheck.applicableLmrControls.hob} m</span>
                                    </div>
                                    {lmrRequirementsCheck.currentHob > 0 && (
                                      <div className="flex items-center mt-1">
                                        {lmrRequirementsCheck.hobIncrease > 0 ? (
                                          <>
                                            <ArrowUp size={14} className="text-green-500 mr-1" />
                                            <span className="text-green-500 text-xs">+{(lmrRequirementsCheck.applicableLmrControls.hob - lmrRequirementsCheck.currentHob).toFixed(1)}m</span>
                                          </>
                                        ) : lmrRequirementsCheck.hobIncrease < 0 ? (
                                          <>
                                            <ArrowDown size={14} className="text-red-500 mr-1" />
                                            <span className="text-red-500 text-xs">{(lmrRequirementsCheck.applicableLmrControls.hob - lmrRequirementsCheck.currentHob).toFixed(1)}m</span>
                                          </>
                                        ) : (
                                          <span className="text-gray-500 text-xs">No change</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-500">Not applicable</span>
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Eligibility Summary */}
                      <div className="mt-3 p-3 rounded-md border border-gray-200 bg-gray-50">
                        <h6 className="font-medium text-sm mb-2">LMR Eligibility Summary</h6>
                        {lmrRequirementsCheck.applicableLmrControls ? (
                          <div className="text-sm">
                            {lmrRequirementsCheck.zone === 'R1' || lmrRequirementsCheck.zone === 'R2' ? (
                              lmrRequirementsCheck.meetsMinArea && lmrRequirementsCheck.meetsMinWidth ? (
                                <div className="flex items-center text-green-600">
                                  <CheckCircle2 size={16} className="mr-2" />
                                  <span>Property meets all R1/R2 requirements for LMR controls (using developable area)</span>
                                </div>
                              ) : (
                                <div className="flex items-center text-red-600">
                                  <XCircle size={16} className="mr-2" />
                                  <span>
                                    Developable area does not meet {!lmrRequirementsCheck.meetsMinArea && 'minimum area'} 
                                    {!lmrRequirementsCheck.meetsMinArea && !lmrRequirementsCheck.meetsMinWidth && ' and '}
                                    {!lmrRequirementsCheck.meetsMinWidth && 'minimum width'} requirements.
                                  </span>
                                </div>
                              )
                            ) : (lmrRequirementsCheck.zone === 'R3' || lmrRequirementsCheck.zone === 'R4') && lmrCatchmentData.isWithinCatchment ? (
                              <div className="flex items-center text-green-600">
                                <CheckCircle2 size={16} className="mr-2" />
                                <span>Property is eligible for R3/R4 LMR controls within {lmrCatchmentData.distance}m catchment</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-gray-600">
                                <Info size={16} className="mr-2" />
                                <span>LMR controls not applicable for zone {lmrRequirementsCheck.zone}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center text-gray-600">
                            <Info size={16} className="mr-2" />
                            <span>Property is not in an eligible zone or catchment area for LMR controls</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
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
            {lmrOptions?.isInLMRArea && calculationResults.lmr?.highDensity && (
              <button
                className={`flex items-center px-4 py-2 font-medium ${activeCalcTab === 'highDensityLMR' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
                onClick={() => handleCalcTabChange('highDensityLMR')}
              >
                <Layers className="mr-2" size={16} /> High Density - LMR
              </button>
            )}
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
              developableArea={developableArea}
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
              developableArea={developableArea}
            />
          )}
          
          {/* High Density LMR Calculation */}
          {activeCalcTab === 'highDensityLMR' && lmrOptions?.isInLMRArea && calculationResults.lmr?.highDensity && (
            <FeasibilityCalculation 
              settings={settings} 
              density="highDensity" 
              selectedFeature={selectedFeature}
              salesData={salesData}
              constructionData={constructionData}
              housingScenarios={housingScenarios}
              lmrOptions={lmrOptions}
              useLMR={true} /* Force LMR to be used */
              calculationResults={calculationResults.lmr?.highDensity}
              lmrResults={calculationResults.lmr?.highDensity}
              customControls={customControls.enabled ? customControls : null}
              developableArea={developableArea}
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
