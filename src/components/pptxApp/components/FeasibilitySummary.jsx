import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { Building2, Building, DollarSign, TrendingUp, Settings2, Info } from 'lucide-react';

/**
 * Helper function to format currency in AUD
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Helper function to format currency in millions
 * @param {number} amount - The amount to format in base units
 * @returns {string} Formatted currency in millions
 */
const formatCurrencyInMillions = (amount) => {
  const inMillions = amount / 1000000;
  return `$${inMillions.toFixed(1)}M`;
};

/**
 * Helper function to round to nearest 500k
 * @param {number} value - The value to round
 * @returns {number} Value rounded to nearest 500,000
 */
const roundToNearest500k = (value) => {
  return Math.round(value / 500000) * 500000;
};

/**
 * Helper function to format square meter values without decimals
 * @param {number} value - The value to format
 * @returns {string} Formatted square meter value
 */
const formatSqm = (value) => {
  return `${Math.round(value).toLocaleString()}m²`;
};

/**
 * FeasibilitySummary component for comparing Low-Mid Density vs High Density development options
 * with animated charts for cost and residual land value sensitivity analysis
 */
const FeasibilitySummary = ({ 
  settings, 
  lmrOptions, 
  currentResults, 
  lmrResults,
  customControls = null,
  selectedFeature = null,
  calculateFeasibility = null
}) => {
  // State for animations
  const [animationProgress, setAnimationProgress] = useState(0);
  
  // Define colors for charts
  const colors = {
    residualLandValue: ['#8884d8', '#82ca9d'], // Purple for Medium Density, Green for High Density
    background: '#ffffff',
  };
  
  // Define line label renderer for charts
  const renderLineLabel = ({ x, y, value, index }) => {
    // Only render labels for specific points (e.g., first, middle, last)
    if (index !== 0 && index !== 2 && index !== 5) return null;
    return (
      <text 
        x={x} 
        y={y - 10} 
        fill="#666"
        textAnchor="middle"
        fontSize={12}
      >
        {formatCurrencyInMillions(value)}
      </text>
    );
  };
  
  // Animation effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationProgress(100);
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  
  // Helper function to ensure consistent actualYield calculation for medium density
  const calculateMediumDensityActualYield = (developmentYield, developableArea) => {
    const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use the setting or default to 200m²
    const maxDwellingsByLotSize = Math.floor(developableArea / minimumLotSize);
    
    // Use consistent actualYield calculation that defaults to lot size constraint when NSA calculation is 0
    return developmentYield === 0 && maxDwellingsByLotSize > 0
      ? maxDwellingsByLotSize 
      : Math.min(developmentYield, maxDwellingsByLotSize);
  };
  
  // Prepare data for the comparison chart
  const chartData = [
    {
      name: 'Medium Density',
      ResidualLandValue: (() => {
        if (!currentResults?.mediumDensity) return 0;
        
        // For medium density, calculate based on lot size limitation
        const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use the setting or default to 200m²
        const developableArea = currentResults.mediumDensity.developableArea || 0;
        const maxDwellingsByLotSize = Math.floor(developableArea / minimumLotSize);
        
        // Get development yield based on appropriate method
        let developmentYield = 0;
        const fsr = currentResults.mediumDensity.fsr || 0;
        const hob = currentResults.mediumDensity.hob || 0;
        const siteArea = currentResults.mediumDensity.siteArea || 0;
        const dwellingSize = currentResults.mediumDensity.dwellingSize || 0;
        
        // If FSR is 0, use HOB-based calculation
        if (fsr === 0 && hob > 0) {
          // Assume typical floor to floor height (e.g., 3m)
          const floorToFloorHeight = 3;
          const numberOfFloors = Math.floor(hob / floorToFloorHeight);
          const footprint = developableArea * 0.5; // Assume 50% site coverage
          const totalGFA = footprint * numberOfFloors;
          developmentYield = Math.floor(totalGFA / dwellingSize);
          
          // Make sure we have a non-zero value
          if (developmentYield === 0 && footprint > 0 && numberOfFloors > 0) {
            // If we get zero, try using a minimum
            developmentYield = Math.max(1, Math.floor(footprint * numberOfFloors / 100));
          }
        } else {
          // Use stored development yield or calculate from FSR
          developmentYield = currentResults.mediumDensity.developmentYield || 0;
        }
        
        const actualYield = calculateMediumDensityActualYield(developmentYield, developableArea);
        
        // If no actual yield, return 0
        if (!actualYield) return 0;
        
        // Recalculate everything from the beginning
        // Adjusted gross realisation
        const dwellingPrice = settings.mediumDensity.dwellingPrice || 0;
        const adjustedGrossRealisation = actualYield * dwellingPrice;
        
        // Adjusted selling costs
        const adjustedGst = adjustedGrossRealisation * 0.1;
        const adjustedAgentsCommission = adjustedGrossRealisation * settings.mediumDensity.agentsSalesCommission;
        const adjustedLegalFees = adjustedGrossRealisation * settings.mediumDensity.legalFeesOnSales;
        const adjustedMarketingCosts = adjustedGrossRealisation * settings.mediumDensity.marketingCosts;
        
        // Adjusted net realisation
        const adjustedNetRealisation = adjustedGrossRealisation - adjustedGst - adjustedAgentsCommission - adjustedLegalFees - adjustedMarketingCosts;
        
        // Adjusted profit margin
        const adjustedProfitMargin = adjustedNetRealisation * settings.mediumDensity.profitAndRisk;
        
        // Adjusted net realisation after profit
        const adjustedNetRealisationAfterProfit = adjustedNetRealisation - adjustedProfitMargin;
        
        // Adjusted GFA and construction costs
        const adjustedGfa = actualYield * dwellingSize;
        const constructionCostPerGfa = currentResults.mediumDensity.constructionCostPerGfa || 0;
        const adjustedConstructionCosts = adjustedGfa * constructionCostPerGfa;
        const adjustedProfessionalFees = adjustedConstructionCosts * settings.mediumDensity.professionalFees;
        const adjustedDevelopmentContribution = adjustedConstructionCosts * settings.mediumDensity.developmentContribution;
        const daApplicationFees = currentResults.mediumDensity.daApplicationFees || 0;
        const adjustedTotalDevelopmentCosts = adjustedConstructionCosts + daApplicationFees + adjustedProfessionalFees + adjustedDevelopmentContribution;
        
        // Land tax and finance costs
        const landTax = currentResults.mediumDensity.landTax || 0;
        const projectPeriod = currentResults.mediumDensity.projectPeriod || 24;
        const projectDurationYears = projectPeriod / 12;
        const adjustedFinanceCosts = settings.mediumDensity.interestRate * (projectDurationYears / 2) * adjustedTotalDevelopmentCosts;
        
        // Calculate residual land value before interest
        const adjustedResidualBeforeInterest = adjustedNetRealisationAfterProfit - adjustedTotalDevelopmentCosts - landTax - adjustedFinanceCosts;
        
        // Calculate interest on purchase price
        const adjustedInterestOnPurchase = Math.abs(
          adjustedResidualBeforeInterest - 
          adjustedResidualBeforeInterest / 
          (1 + settings.mediumDensity.interestRate / 12 * projectPeriod * 0.5)
        );
        
        // Calculate acquisition costs (3% of residual land value minus interest)
        const acquisitionRate = 0.03; // 3%
        const adjustedAcquisitionCosts = acquisitionRate * (adjustedResidualBeforeInterest - adjustedInterestOnPurchase);
        
        // Final residual land value
        const adjustedResidualLandValue = adjustedResidualBeforeInterest - adjustedInterestOnPurchase - adjustedAcquisitionCosts;
        
        return adjustedResidualLandValue;
      })(),
      DwellingYield: (() => {
        if (!currentResults?.mediumDensity) return 0;
        
        // For medium density, calculate based on lot size limitation
        const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use the setting or default to 200m²
        const developableArea = currentResults.mediumDensity.developableArea || 0;
        const maxDwellingsByLotSize = Math.floor(developableArea / minimumLotSize);
        
        // Get development yield based on appropriate method
        let developmentYield = 0;
        const fsr = currentResults.mediumDensity.fsr || 0;
        const hob = currentResults.mediumDensity.hob || 0;
        const siteArea = currentResults.mediumDensity.siteArea || 0;
        const dwellingSize = currentResults.mediumDensity.dwellingSize || 0;
        
        // If FSR is 0, use HOB-based calculation
        if (fsr === 0 && hob > 0) {
          // Assume typical floor to floor height (e.g., 3m)
          const floorToFloorHeight = 3;
          const numberOfFloors = Math.floor(hob / floorToFloorHeight);
          const footprint = developableArea * 0.5; // Assume 50% site coverage
          const totalGFA = footprint * numberOfFloors;
          developmentYield = Math.floor(totalGFA / dwellingSize);
          
          // Make sure we have a non-zero value
          if (developmentYield === 0 && footprint > 0 && numberOfFloors > 0) {
            // If we get zero, try using a minimum
            developmentYield = Math.max(1, Math.floor(footprint * numberOfFloors / 100));
          }
        } else {
          // Use stored development yield or calculate from FSR
          developmentYield = currentResults.mediumDensity.developmentYield || 0;
        }
        
        const actualYield = calculateMediumDensityActualYield(developmentYield, developableArea);
        
        return actualYield;
      })(),
    },
    {
      name: 'High Density',
      ResidualLandValue: currentResults?.highDensity?.residualLandValue || 0,
      DwellingYield: currentResults?.highDensity?.developmentYield || 0,
    }
  ];
  
  // Generate sensitivity analysis data for how costs affect residual land value
  const costSensitivityData = Array.from({ length: 7 }, (_, i) => {
    // Calculate the adjusted baseline Medium Density values
    const baselineMediumRLV = (() => {
      if (!currentResults?.mediumDensity) return 10000000;
      
      // For medium density, calculate based on lot size limitation
      const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use the setting or default to 200m²
      const developableArea = currentResults.mediumDensity.developableArea || 0;
      const maxDwellingsByLotSize = Math.floor(developableArea / minimumLotSize);
      
      // Get development yield based on appropriate method
      let developmentYield = 0;
      const fsr = currentResults.mediumDensity.fsr || 0;
      const hob = currentResults.mediumDensity.hob || 0;
      const siteArea = currentResults.mediumDensity.siteArea || 0;
      const dwellingSize = currentResults.mediumDensity.dwellingSize || 0;
      
      // If FSR is 0, use HOB-based calculation
      if (fsr === 0 && hob > 0) {
        // Assume typical floor to floor height (e.g., 3m)
        const floorToFloorHeight = 3;
        const numberOfFloors = Math.floor(hob / floorToFloorHeight);
        const footprint = developableArea * 0.5; // Assume 50% site coverage
        const totalGFA = footprint * numberOfFloors;
        developmentYield = Math.floor(totalGFA / dwellingSize);
        
        // Make sure we have a non-zero value
        if (developmentYield === 0 && footprint > 0 && numberOfFloors > 0) {
          // If we get zero, try using a minimum
          developmentYield = Math.max(1, Math.floor(footprint * numberOfFloors / 100));
        }
      } else {
        // Use stored development yield or calculate from FSR
        developmentYield = currentResults.mediumDensity.developmentYield || 0;
      }
      
      const actualYield = calculateMediumDensityActualYield(developmentYield, developableArea);
      
      // If no actual yield, return default value
      if (!actualYield) return 10000000;
      
      // Calculate the adjusted residual land value using the same logic as in chartData
      const dwellingPrice = settings.mediumDensity.dwellingPrice || 0;
      const adjustedGrossRealisation = actualYield * dwellingPrice;
      
      // Abbreviated calculation for residual land value in millions
      const sellCostRate = 0.1 + settings.mediumDensity.agentsSalesCommission + settings.mediumDensity.legalFeesOnSales + settings.mediumDensity.marketingCosts;
      const netRealisation = adjustedGrossRealisation * (1 - sellCostRate);
      const netRealisationAfterProfit = netRealisation * (1 - settings.mediumDensity.profitAndRisk);
      
      // Calculate adjusted GFA and construction costs
      const adjustedGfa = actualYield * dwellingSize;
      const constructionCostPerGfa = currentResults.mediumDensity.constructionCostPerGfa || 0;
      const constructionCosts = adjustedGfa * constructionCostPerGfa;
      const otherDevCosts = constructionCosts * (settings.mediumDensity.professionalFees + settings.mediumDensity.developmentContribution);
      const totalDevCosts = constructionCosts + otherDevCosts + (currentResults.mediumDensity.daApplicationFees || 0);
      
      // Simple estimation of residual land value
      return netRealisationAfterProfit - totalDevCosts;
    })();
    
    const baselineMediumCost = (currentResults?.mediumDensity?.costPerSqmGFA || 3000);
    const baselineHighCost = (currentResults?.highDensity?.costPerSqmGFA || 3500);
    const baselineHighRLV = (currentResults?.highDensity?.residualLandValue || 15000000);
    
    // Cost factor: 80%, 85%, 90%, 95%, 100%, 105%, 110%
    const factor = 0.8 + (i * 0.05);
    
    // Calculate actual cost values
    const actualMediumCost = Math.round(baselineMediumCost * factor);
    const actualHighCost = Math.round(baselineHighCost * factor);
    
    // As costs increase, residual land value decreases (inverse relationship)
    // Using a simplified relationship: 1% increase in costs = X% decrease in RLV
    // The sensitivity multiplier can be adjusted based on actual project economics
    const sensitivityMultiplier = 1.5; // 1% cost increase = 1.5% RLV decrease
    const rlvImpactFactor = 1 + ((1 - factor) * sensitivityMultiplier);
    
    return {
      factor: `${Math.round(factor * 100)}%`,
      actualCost: Math.round((actualMediumCost + actualHighCost) / 2), // Average of both costs for display
      'Medium Density': Math.round(baselineMediumRLV * rlvImpactFactor),
      'High Density': Math.round(baselineHighRLV * rlvImpactFactor),
    };
  });
  
  // Generate sensitivity data for revenue factor
  const revenueFactorData = Array.from({ length: 6 }, (_, i) => {
    // Revenue factor: 85%, 90%, 95%, 100%, 105%, 110%
    const factor = 0.85 + (i * 0.05);
    
    // Calculate adjusted baseline Medium Density values
    const mediumRevenue = (() => {
      if (!currentResults?.mediumDensity) return 25000000;
      
      // For medium density, calculate based on lot size limitation
      const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use the setting or default to 200m²
      const developableArea = currentResults.mediumDensity.developableArea || 0;
      const maxDwellingsByLotSize = Math.floor(developableArea / minimumLotSize);
      
      // Get development yield based on appropriate method
      let developmentYield = 0;
      const fsr = currentResults.mediumDensity.fsr || 0;
      const hob = currentResults.mediumDensity.hob || 0;
      const siteArea = currentResults.mediumDensity.siteArea || 0;
      const dwellingSize = currentResults.mediumDensity.dwellingSize || 0;
      
      // If FSR is 0, use HOB-based calculation
      if (fsr === 0 && hob > 0) {
        // Assume typical floor to floor height (e.g., 3m)
        const floorToFloorHeight = 3;
        const numberOfFloors = Math.floor(hob / floorToFloorHeight);
        const footprint = developableArea * 0.5; // Assume 50% site coverage
        const totalGFA = footprint * numberOfFloors;
        developmentYield = Math.floor(totalGFA / dwellingSize);
        
        // Make sure we have a non-zero value
        if (developmentYield === 0 && footprint > 0 && numberOfFloors > 0) {
          // If we get zero, try using a minimum
          developmentYield = Math.max(1, Math.floor(footprint * numberOfFloors / 100));
        }
      } else {
        // Use stored development yield or calculate from FSR
        developmentYield = currentResults.mediumDensity.developmentYield || 0;
      }
      
      const actualYield = Math.min(developmentYield, maxDwellingsByLotSize);
      
      const dwellingPrice = settings.mediumDensity.dwellingPrice || 0;
      return actualYield * dwellingPrice;
    })();
    
    // Calculate adjusted residual land value for medium density
    const mediumRlv = (() => {
      if (!currentResults?.mediumDensity) return 10000000;
      
      // For medium density, calculate based on lot size limitation
      const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use the setting or default to 200m²
      const developableArea = currentResults.mediumDensity.developableArea || 0;
      const maxDwellingsByLotSize = Math.floor(developableArea / minimumLotSize);
      
      // Get development yield based on appropriate method
      let developmentYield = 0;
      const fsr = currentResults.mediumDensity.fsr || 0;
      const hob = currentResults.mediumDensity.hob || 0;
      const siteArea = currentResults.mediumDensity.siteArea || 0;
      const dwellingSize = currentResults.mediumDensity.dwellingSize || 0;
      
      // If FSR is 0, use HOB-based calculation
      if (fsr === 0 && hob > 0) {
        // Assume typical floor to floor height (e.g., 3m)
        const floorToFloorHeight = 3;
        const numberOfFloors = Math.floor(hob / floorToFloorHeight);
        const footprint = developableArea * 0.5; // Assume 50% site coverage
        const totalGFA = footprint * numberOfFloors;
        developmentYield = Math.floor(totalGFA / dwellingSize);
        
        // Make sure we have a non-zero value
        if (developmentYield === 0 && footprint > 0 && numberOfFloors > 0) {
          // If we get zero, try using a minimum
          developmentYield = Math.max(1, Math.floor(footprint * numberOfFloors / 100));
        }
      } else {
        // Use stored development yield or calculate from FSR
        developmentYield = currentResults.mediumDensity.developmentYield || 0;
      }
      
      const actualYield = Math.min(developmentYield, maxDwellingsByLotSize);
      
      // If no actual yield, return default value
      if (!actualYield) return 10000000;
      
      // Calculate the adjusted residual land value using the same logic as before
      const dwellingPrice = settings.mediumDensity.dwellingPrice || 0;
      const adjustedDwellingPrice = dwellingPrice * factor;
      
      // Calculate GFA and costs
      const adjustedGfa = actualYield * dwellingSize;
      const adjustedGrossRealisation = actualYield * adjustedDwellingPrice;
      
      const sellCostRate = 0.1 + settings.mediumDensity.agentsSalesCommission + settings.mediumDensity.legalFeesOnSales + settings.mediumDensity.marketingCosts;
      const netRealisation = adjustedGrossRealisation * (1 - sellCostRate);
      const netRealisationAfterProfit = netRealisation * (1 - settings.mediumDensity.profitAndRisk);
      
      const constructionCostPerGfa = currentResults.mediumDensity.constructionCostPerGfa || 0;
      const constructionCosts = adjustedGfa * constructionCostPerGfa;
      const otherDevCosts = constructionCosts * (settings.mediumDensity.professionalFees + settings.mediumDensity.developmentContribution);
      const totalDevCosts = constructionCosts + otherDevCosts + (currentResults.mediumDensity.daApplicationFees || 0);
      
      // Simple estimation of residual land value
      return netRealisationAfterProfit - totalDevCosts;
    })();
    
    // Use existing high density values with simple factor application
    const highRevenue = (currentResults?.highDensity?.totalRevenue || 40000000);
    const highRlv = (currentResults?.highDensity?.residualLandValue || 15000000);
    
    // Apply revenue factor exponentially to RLV (assuming higher sensitivity of RLV to revenue)
    // A simple model: 1% change in revenue = 1.5% change in RLV
    const rlvImpactFactor = 1 + ((factor - 1) * 1.5);
    
    return {
      factor: `${Math.round(factor * 100)}%`,
      mediumRevenue: Math.round(mediumRevenue * factor),
      highRevenue: Math.round(highRevenue * factor),
      mediumRlv: Math.round(mediumRlv), // Already calculated with the factor
      highRlv: Math.round(highRlv * rlvImpactFactor),
    };
  });
  
  // Radar chart data comparing key metrics
  const radarData = [
    {
      metric: 'Residual Land Value',
      'Medium Density': (() => {
        if (!currentResults?.mediumDensity) return 0;
        
        // For medium density, calculate based on lot size limitation
        const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use the setting or default to 200m²
        const developableArea = currentResults.mediumDensity.developableArea || 0;
        const maxDwellingsByLotSize = Math.floor(developableArea / minimumLotSize);
        
        // Get development yield based on appropriate method
        let developmentYield = 0;
        const fsr = currentResults.mediumDensity.fsr || 0;
        const hob = currentResults.mediumDensity.hob || 0;
        const siteArea = currentResults.mediumDensity.siteArea || 0;
        const dwellingSize = currentResults.mediumDensity.dwellingSize || 0;
        
        // If FSR is 0, use HOB-based calculation
        if (fsr === 0 && hob > 0) {
          // Assume typical floor to floor height (e.g., 3m)
          const floorToFloorHeight = 3;
          const numberOfFloors = Math.floor(hob / floorToFloorHeight);
          const footprint = developableArea * 0.5; // Assume 50% site coverage
          const totalGFA = footprint * numberOfFloors;
          developmentYield = Math.floor(totalGFA / dwellingSize);
          
          // Make sure we have a non-zero value
          if (developmentYield === 0 && footprint > 0 && numberOfFloors > 0) {
            // If we get zero, try using a minimum
            developmentYield = Math.max(1, Math.floor(footprint * numberOfFloors / 100));
          }
        } else {
          // Use stored development yield or calculate from FSR
          developmentYield = currentResults.mediumDensity.developmentYield || 0;
        }
        
        const actualYield = Math.min(developmentYield, maxDwellingsByLotSize);
        
        // If no actual yield, return 0
        if (!actualYield) return 0;
        
        // Calculate the adjusted residual land value using the same logic as in chartData
        // Full calculation is the same as in chartData, abbreviated for brevity
        const dwellingPrice = settings.mediumDensity.dwellingPrice || 0;
        const adjustedGrossRealisation = actualYield * dwellingPrice;
        
        // Abbreviated calculation for residual land value in millions
        const sellCostRate = 0.1 + settings.mediumDensity.agentsSalesCommission + settings.mediumDensity.legalFeesOnSales + settings.mediumDensity.marketingCosts;
        const netRealisation = adjustedGrossRealisation * (1 - sellCostRate);
        const netRealisationAfterProfit = netRealisation * (1 - settings.mediumDensity.profitAndRisk);
        
        const adjustedGfa = actualYield * dwellingSize;
        const constructionCostPerGfa = currentResults.mediumDensity.constructionCostPerGfa || 0;
        const constructionCosts = adjustedGfa * constructionCostPerGfa;
        const otherDevCosts = constructionCosts * (settings.mediumDensity.professionalFees + settings.mediumDensity.developmentContribution);
        const totalDevCosts = constructionCosts + otherDevCosts + (currentResults.mediumDensity.daApplicationFees || 0);
        
        return (netRealisationAfterProfit - totalDevCosts) / 1000000;
      })(),
      'High Density': (currentResults?.highDensity?.residualLandValue || 0) / 1000000,
    },
    {
      metric: 'GFA',
      'Medium Density': (() => {
        if (!currentResults?.mediumDensity) return 0;
        
        // For medium density, calculate based on lot size limitation
        const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use the setting or default to 200m²
        const developableArea = currentResults.mediumDensity.developableArea || 0;
        const maxDwellingsByLotSize = Math.floor(developableArea / minimumLotSize);
        
        // Get development yield based on appropriate method
        let developmentYield = 0;
        const fsr = currentResults.mediumDensity.fsr || 0;
        const hob = currentResults.mediumDensity.hob || 0;
        const siteArea = currentResults.mediumDensity.siteArea || 0;
        const dwellingSize = currentResults.mediumDensity.dwellingSize || 0;
        
        // If FSR is 0, use HOB-based calculation
        if (fsr === 0 && hob > 0) {
          // Assume typical floor to floor height (e.g., 3m)
          const floorToFloorHeight = 3;
          const numberOfFloors = Math.floor(hob / floorToFloorHeight);
          const footprint = developableArea * 0.5; // Assume 50% site coverage
          const totalGFA = footprint * numberOfFloors;
          developmentYield = Math.floor(totalGFA / dwellingSize);
          
          // Make sure we have a non-zero value
          if (developmentYield === 0 && footprint > 0 && numberOfFloors > 0) {
            // If we get zero, try using a minimum
            developmentYield = Math.max(1, Math.floor(footprint * numberOfFloors / 100));
          }
        } else {
          // Use stored development yield or calculate from FSR
          developmentYield = currentResults.mediumDensity.developmentYield || 0;
        }
        
        const actualYield = Math.min(developmentYield, maxDwellingsByLotSize);
        
        // Calculate adjusted GFA
        const adjustedGfa = actualYield * dwellingSize;
        
        return adjustedGfa / 1000;
      })(),
      'High Density': (currentResults?.highDensity?.gfa || 0) / 1000,
    },
    {
      metric: 'Yield',
      'Medium Density': (() => {
        if (!currentResults?.mediumDensity) return 0;
        
        // For medium density, calculate based on lot size limitation
        const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use the setting or default to 200m²
        const developableArea = currentResults.mediumDensity.developableArea || 0;
        const maxDwellingsByLotSize = Math.floor(developableArea / minimumLotSize);
        
        // Get development yield based on appropriate method
        let developmentYield = 0;
        const fsr = currentResults.mediumDensity.fsr || 0;
        const hob = currentResults.mediumDensity.hob || 0;
        const siteArea = currentResults.mediumDensity.siteArea || 0;
        const dwellingSize = currentResults.mediumDensity.dwellingSize || 0;
        
        // If FSR is 0, use HOB-based calculation
        if (fsr === 0 && hob > 0) {
          // Assume typical floor to floor height (e.g., 3m)
          const floorToFloorHeight = 3;
          const numberOfFloors = Math.floor(hob / floorToFloorHeight);
          const footprint = developableArea * 0.5; // Assume 50% site coverage
          const totalGFA = footprint * numberOfFloors;
          developmentYield = Math.floor(totalGFA / dwellingSize);
          
          // Make sure we have a non-zero value
          if (developmentYield === 0 && footprint > 0 && numberOfFloors > 0) {
            // If we get zero, try using a minimum
            developmentYield = Math.max(1, Math.floor(footprint * numberOfFloors / 100));
          }
        } else {
          // Use stored development yield or calculate from FSR
          developmentYield = currentResults.mediumDensity.developmentYield || 0;
        }
        
        const actualYield = Math.min(developmentYield, maxDwellingsByLotSize);
        
        return actualYield;
      })(),
      'High Density': (currentResults?.highDensity?.developmentYield || 0),
    },
    {
      metric: 'FSR',
      'Medium Density': (currentResults?.mediumDensity?.fsr || 1),
      'High Density': (currentResults?.highDensity?.fsr || 2),
    },
    {
      metric: 'Cost',
      'Medium Density': (() => {
        if (!currentResults?.mediumDensity) return 0;
        
        // For medium density, calculate based on lot size limitation
        const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use the setting or default to 200m²
        const developableArea = currentResults.mediumDensity.developableArea || 0;
        const maxDwellingsByLotSize = Math.floor(developableArea / minimumLotSize);
        
        // Get development yield based on appropriate method
        let developmentYield = 0;
        const fsr = currentResults.mediumDensity.fsr || 0;
        const hob = currentResults.mediumDensity.hob || 0;
        const siteArea = currentResults.mediumDensity.siteArea || 0;
        const dwellingSize = currentResults.mediumDensity.dwellingSize || 0;
        
        // If FSR is 0, use HOB-based calculation
        if (fsr === 0 && hob > 0) {
          // Assume typical floor to floor height (e.g., 3m)
          const floorToFloorHeight = 3;
          const numberOfFloors = Math.floor(hob / floorToFloorHeight);
          const footprint = developableArea * 0.5; // Assume 50% site coverage
          const totalGFA = footprint * numberOfFloors;
          developmentYield = Math.floor(totalGFA / dwellingSize);
          
          // Make sure we have a non-zero value
          if (developmentYield === 0 && footprint > 0 && numberOfFloors > 0) {
            // If we get zero, try using a minimum
            developmentYield = Math.max(1, Math.floor(footprint * numberOfFloors / 100));
          }
        } else {
          // Use stored development yield or calculate from FSR
          developmentYield = currentResults.mediumDensity.developmentYield || 0;
        }
        
        const actualYield = Math.min(developmentYield, maxDwellingsByLotSize);
        
        // Calculate adjusted total cost
        const dwellingPrice = settings.mediumDensity.dwellingPrice || 0;
        const adjustedGfa = actualYield * dwellingSize;
        const constructionCostPerGfa = currentResults.mediumDensity.constructionCostPerGfa || 0;
        const adjustedConstructionCosts = adjustedGfa * constructionCostPerGfa;
        const adjustedProfessionalFees = adjustedConstructionCosts * settings.mediumDensity.professionalFees;
        const adjustedDevelopmentContribution = adjustedConstructionCosts * settings.mediumDensity.developmentContribution;
        const daApplicationFees = currentResults.mediumDensity.daApplicationFees || 0;
        const adjustedTotalDevelopmentCosts = adjustedConstructionCosts + daApplicationFees + adjustedProfessionalFees + adjustedDevelopmentContribution;
        
        return adjustedTotalDevelopmentCosts / 1000000;
      })(),
      'High Density': (currentResults?.highDensity?.totalCost || 0) / 1000000,
    },
  ];

  // Add custom controls info section
  const renderCustomControlsInfo = () => {
    if (!customControls?.enabled) return null;

    return (
      <div className="mb-8 bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <Settings2 className="mr-2" /> Custom Development Controls
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">FSR:</span>
            <span>
              {customControls.fsr ?? (currentResults?.fsrCurrent || 'N/A')}
              <span className="text-gray-500 ml-1">:1</span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">HOB:</span>
            <span>
              {customControls.hob ?? (currentResults?.hobCurrent || 'N/A')}
              <span className="text-gray-500 ml-1">m</span>
            </span>
          </div>
        </div>
        {(customControls.fsr !== null || customControls.hob !== null) && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            <div className="flex items-start">
              <Info size={14} className="mr-2 mt-0.5 flex-shrink-0" />
              <div>
                Summary is based on custom development controls.
                {customControls.fsr === null && ' Using current FSR.'}
                {customControls.hob === null && ' Using current HOB.'}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4">
      {/* Add Custom Controls Information Section */}
      {renderCustomControlsInfo()}

      <h2 className="text-xl font-bold mb-6">Development Feasibility Summary</h2>

      {/* Main Comparison Chart */}
      <div className="mb-8 bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <TrendingUp className="mr-2" /> Residual Land Value & Dwelling Yield Comparison
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 70, left: 20, bottom: 5 }}
              animationDuration={1500}
              animationBegin={0}
              animationEasing="ease-out"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              {/* Left Y-axis for Residual Land Value */}
              <YAxis 
                yAxisId="left"
                tickFormatter={(value) => formatCurrencyInMillions(value)} 
                domain={[(dataMin) => 0, (dataMax) => roundToNearest500k(dataMax * 1.1)]}
                ticks={
                  Array.from(
                    { length: 10 }, 
                    (_, i) => roundToNearest500k(
                      (Math.max(
                        currentResults?.mediumDensity?.residualLandValue || 0,
                        currentResults?.highDensity?.residualLandValue || 0
                      ) * 1.1) / 10 * (i + 1)
                    )
                  ).filter(val => val > 0)
                }
              />
              {/* Right Y-axis for Dwelling Yield */}
              <YAxis 
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => `${value} units`}
                domain={[0, (dataMax) => Math.ceil(dataMax * 1.1 / 10) * 10]}
                allowDecimals={false}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === "ResidualLandValue") return [formatCurrency(value), "Residual Land Value"];
                  if (name === "DwellingYield") return [`${value} units`, "Dwelling Yield"];
                  return [value, name];
                }} 
              />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="ResidualLandValue" 
                name="Residual Land Value"
                fill="#8884d8" 
                radius={[10, 10, 0, 0]}
                fillOpacity={0.8}
                animationDuration={1500}
                label={(props) => {
                  const { x, y, width, height, value } = props;
                  // Only render label when animation is complete (value > 0)
                  if (value <= 0) return null;
                  
                  const millions = value / 1000000;
                  return (
                    <text 
                      x={x + width / 2} 
                      y={y + height / 2} 
                      fill="#fff"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontWeight="bold"
                      fontSize="14"
                      filter="drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.5))"
                    >
                      ${Math.round(millions)}M
                    </text>
                  );
                }}
              />
              <Bar 
                yAxisId="right"
                dataKey="DwellingYield" 
                name="Dwelling Yield"
                fill="#82ca9d" 
                radius={[10, 10, 0, 0]}
                fillOpacity={0.8}
                animationDuration={1500}
                animationBegin={200}
                label={(props) => {
                  const { x, y, width, height, value } = props;
                  // Only render label when animation is complete (value > 0)
                  if (value <= 0) return null;
                  
                  return (
                    <text 
                      x={x + width / 2} 
                      y={y + height / 2} 
                      fill="#fff"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontWeight="bold"
                      fontSize="14"
                      filter="drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.5))"
                    >
                      {value}
                    </text>
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cost Impact on Residual Land Value */}
      <div className="mb-8 bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <DollarSign className="mr-2" /> Cost Impact on Residual Land Value
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={costSensitivityData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              animationDuration={1500}
              animationBegin={0}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="factor"
                tickFormatter={(value, index) => {
                  return value;
                }}
                height={60}
                tick={(props) => {
                  const { x, y, payload } = props;
                  const index = costSensitivityData.findIndex(item => item.factor === payload.value);
                  const actualCost = index >= 0 ? costSensitivityData[index].actualCost : '';
                  
                  // Format as $#,##0
                  const formattedCost = new Intl.NumberFormat('en-AU', {
                    style: 'currency',
                    currency: 'AUD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(actualCost);
                  
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text x={0} y={0} dy={16} textAnchor="middle" fill="#666">
                        {payload.value}
                      </text>
                      <text x={0} y={16} dy={16} textAnchor="middle" fill="#666" fontSize="12">
                        {formattedCost}/m²
                      </text>
                    </g>
                  );
                }}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrencyInMillions(value)}
                domain={[(dataMin) => 0, (dataMax) => roundToNearest500k(dataMax * 1.1)]}
                ticks={
                  Array.from(
                    { length: 10 }, 
                    (_, i) => roundToNearest500k(
                      (Math.max(
                        Math.max(...costSensitivityData.map(item => item['Medium Density'] || 0)),
                        Math.max(...costSensitivityData.map(item => item['High Density'] || 0))
                      ) * 1.1) / 10 * (i + 1)
                    )
                  ).filter(val => val > 0)
                }
              />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="Medium Density" 
                stroke="#8884d8" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 8 }}
                animationDuration={1500}
                name="Medium Density"
              />
              <Line 
                type="monotone" 
                dataKey="High Density" 
                stroke="#82ca9d" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 8 }}
                animationDuration={1500}
                animationBegin={300}
                name="High Density"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue/Sales Impact on Residual Land Value */}
      <div className="mb-8 bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <DollarSign className="mr-2" /> Revenue/Sales Impact on Residual Land Value
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={revenueFactorData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              animationDuration={1500}
              animationBegin={300}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="factor"
                height={60}
                tick={(props) => {
                  const { x, y, payload } = props;
                  // Get revenue per dwelling in millions
                  const index = revenueFactorData.findIndex(item => item.factor === payload.value);
                  const mediumRevenue = index >= 0 ? revenueFactorData[index].mediumRevenue : 0;
                  
                  // Per dwelling revenue in millions with 1 decimal place
                  const perDwellingMillions = mediumRevenue / 1000000;
                  
                  // Format as $#.0M per unit
                  const formattedRevenue = `$${perDwellingMillions.toFixed(1)}M`;
                  
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text x={0} y={0} dy={16} textAnchor="middle" fill="#666">
                        {payload.value}
                      </text>
                      <text x={0} y={16} dy={16} textAnchor="middle" fill="#666" fontSize="12">
                        {formattedRevenue}
                      </text>
                    </g>
                  );
                }}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrencyInMillions(value)}
                domain={[(dataMin) => 0, (dataMax) => roundToNearest500k(dataMax * 1.1)]}
                ticks={
                  Array.from(
                    { length: 10 }, 
                    (_, i) => roundToNearest500k(
                      (Math.max(
                        Math.max(...revenueFactorData.map(item => item.mediumRlv || 0)),
                        Math.max(...revenueFactorData.map(item => item.highRlv || 0))
                      ) * 1.1) / 10 * (i + 1)
                    )
                  ).filter(val => val > 0)
                }
              />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line
                type="monotone"
                name="Medium Density"
                dataKey="mediumRlv"
                stroke={colors.residualLandValue[0]}
                strokeWidth={3}
                connectNulls
                dot={{
                  fill: colors.residualLandValue[0],
                  stroke: colors.residualLandValue[0],
                  r: 5,
                }}
                activeDot={{
                  stroke: colors.residualLandValue[0],
                  fill: colors.background,
                  r: 8,
                  strokeWidth: 2,
                }}
                label={renderLineLabel}
              />
              <Line
                type="monotone"
                name="High Density"
                dataKey="highRlv"
                stroke={colors.residualLandValue[1]}
                strokeWidth={3}
                connectNulls
                dot={{
                  fill: colors.residualLandValue[1],
                  stroke: colors.residualLandValue[1],
                  r: 5,
                }}
                activeDot={{
                  stroke: colors.residualLandValue[1],
                  fill: colors.background,
                  r: 8,
                  strokeWidth: 2,
                }}
                label={renderLineLabel}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Comparison Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Medium Density Details */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <Building2 className="mr-2" /> Medium Density Details
          </h3>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Metric</th>
                <th className="px-4 py-2 text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-2">GFA</td>
                <td className="px-4 py-2 text-right">{
                  (() => {
                    if (!currentResults?.mediumDensity) return 'N/A';
                    
                    // For medium density, calculate based on lot size limitation
                    const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use the setting or default to 200m²
                    const developableArea = currentResults.mediumDensity.developableArea || 0;
                    const maxDwellingsByLotSize = Math.floor(developableArea / minimumLotSize);
                    
                    // Get development yield based on appropriate method
                    let developmentYield = 0;
                    const fsr = currentResults.mediumDensity.fsr || 0;
                    const hob = currentResults.mediumDensity.hob || 0;
                    const siteArea = currentResults.mediumDensity.siteArea || 0;
                    const dwellingSize = currentResults.mediumDensity.dwellingSize || 0;
                    
                    // If FSR is 0, use HOB-based calculation
                    if (fsr === 0 && hob > 0) {
                      // Assume typical floor to floor height (e.g., 3m)
                      const floorToFloorHeight = 3;
                      const numberOfFloors = Math.floor(hob / floorToFloorHeight);
                      const footprint = developableArea * 0.5; // Assume 50% site coverage
                      const totalGFA = footprint * numberOfFloors;
                      developmentYield = Math.floor(totalGFA / dwellingSize);
                      
                      // Make sure we have a non-zero value
                      if (developmentYield === 0 && footprint > 0 && numberOfFloors > 0) {
                        // If we get zero, try using a minimum
                        developmentYield = Math.max(1, Math.floor(footprint * numberOfFloors / 100));
                      }
                    } else {
                      // Use stored development yield or calculate from FSR
                      developmentYield = currentResults.mediumDensity.developmentYield || 0;
                    }
                    
                    const actualYield = Math.min(developmentYield, maxDwellingsByLotSize);
                    
                    // Calculate adjusted GFA
                    const adjustedGfa = actualYield * dwellingSize;
                    
                    return formatSqm(adjustedGfa);
                  })()
                }</td>
              </tr>
              <tr>
                <td className="px-4 py-2">Development Yield</td>
                <td className="px-4 py-2 text-right">{
                  (() => {
                    if (!currentResults?.mediumDensity) return '0 units';
                    
                    // For medium density, calculate based on lot size limitation
                    const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use the setting or default to 200m²
                    const developableArea = currentResults.mediumDensity.developableArea || 0;
                    const maxDwellingsByLotSize = Math.floor(developableArea / minimumLotSize);
                    
                    // Get development yield based on appropriate method
                    let developmentYield = 0;
                    const fsr = currentResults.mediumDensity.fsr || 0;
                    const hob = currentResults.mediumDensity.hob || 0;
                    const siteArea = currentResults.mediumDensity.siteArea || 0;
                    const dwellingSize = currentResults.mediumDensity.dwellingSize || 0;
                    
                    // If FSR is 0, use HOB-based calculation
                    if (fsr === 0 && hob > 0) {
                      // Assume typical floor to floor height (e.g., 3m)
                      const floorToFloorHeight = 3;
                      const numberOfFloors = Math.floor(hob / floorToFloorHeight);
                      const footprint = developableArea * 0.5; // Assume 50% site coverage
                      const totalGFA = footprint * numberOfFloors;
                      developmentYield = Math.floor(totalGFA / dwellingSize);
                      
                      // Make sure we have a non-zero value
                      if (developmentYield === 0 && footprint > 0 && numberOfFloors > 0) {
                        // If we get zero, try using a minimum
                        developmentYield = Math.max(1, Math.floor(footprint * numberOfFloors / 100));
                      }
                    } else {
                      // Use stored development yield or calculate from FSR
                      developmentYield = currentResults.mediumDensity.developmentYield || 0;
                    }
                    
                    const actualYield = Math.min(developmentYield, maxDwellingsByLotSize);
                    
                    return `${actualYield} units`;
                  })()
                }</td>
              </tr>
              <tr className="font-bold">
                <td className="px-4 py-2">Residual Land Value</td>
                <td className="px-4 py-2 text-right">{
                  (() => {
                    if (!currentResults?.mediumDensity) return formatCurrency(0);
                    
                    // For medium density, calculate based on lot size limitation
                    const minimumLotSize = settings.mediumDensity.minimumLotSize || 200; // Use the setting or default to 200m²
                    const developableArea = currentResults.mediumDensity.developableArea || 0;
                    const maxDwellingsByLotSize = Math.floor(developableArea / minimumLotSize);
                    
                    // Get development yield based on appropriate method
                    let developmentYield = 0;
                    const fsr = currentResults.mediumDensity.fsr || 0;
                    const hob = currentResults.mediumDensity.hob || 0;
                    const siteArea = currentResults.mediumDensity.siteArea || 0;
                    const dwellingSize = currentResults.mediumDensity.dwellingSize || 0;
                    
                    // If FSR is 0, use HOB-based calculation
                    if (fsr === 0 && hob > 0) {
                      // Assume typical floor to floor height (e.g., 3m)
                      const floorToFloorHeight = 3;
                      const numberOfFloors = Math.floor(hob / floorToFloorHeight);
                      const footprint = developableArea * 0.5; // Assume 50% site coverage
                      const totalGFA = footprint * numberOfFloors;
                      developmentYield = Math.floor(totalGFA / dwellingSize);
                      
                      // Make sure we have a non-zero value
                      if (developmentYield === 0 && footprint > 0 && numberOfFloors > 0) {
                        // If we get zero, try using a minimum
                        developmentYield = Math.max(1, Math.floor(footprint * numberOfFloors / 100));
                      }
                    } else {
                      // Use stored development yield or calculate from FSR
                      developmentYield = currentResults.mediumDensity.developmentYield || 0;
                    }
                    
                    const actualYield = Math.min(developmentYield, maxDwellingsByLotSize);
                    
                    // If no actual yield, return 0
                    if (!actualYield) return formatCurrency(0);
                    
                    // Recalculate everything from the beginning using the complete calculation
                    // Adjusted gross realisation
                    const dwellingPrice = settings.mediumDensity.dwellingPrice || 0;
                    const adjustedGrossRealisation = actualYield * dwellingPrice;
                    
                    // Adjusted selling costs
                    const adjustedGst = adjustedGrossRealisation * 0.1;
                    const adjustedAgentsCommission = adjustedGrossRealisation * settings.mediumDensity.agentsSalesCommission;
                    const adjustedLegalFees = adjustedGrossRealisation * settings.mediumDensity.legalFeesOnSales;
                    const adjustedMarketingCosts = adjustedGrossRealisation * settings.mediumDensity.marketingCosts;
                    
                    // Adjusted net realisation
                    const adjustedNetRealisation = adjustedGrossRealisation - adjustedGst - adjustedAgentsCommission - adjustedLegalFees - adjustedMarketingCosts;
                    
                    // Adjusted profit margin
                    const adjustedProfitMargin = adjustedNetRealisation * settings.mediumDensity.profitAndRisk;
                    
                    // Adjusted net realisation after profit
                    const adjustedNetRealisationAfterProfit = adjustedNetRealisation - adjustedProfitMargin;
                    
                    // Adjusted GFA and construction costs
                    const adjustedGfa = actualYield * dwellingSize;
                    const constructionCostPerGfa = currentResults.mediumDensity.constructionCostPerGfa || 0;
                    const adjustedConstructionCosts = adjustedGfa * constructionCostPerGfa;
                    const adjustedProfessionalFees = adjustedConstructionCosts * settings.mediumDensity.professionalFees;
                    const adjustedDevelopmentContribution = adjustedConstructionCosts * settings.mediumDensity.developmentContribution;
                    const daApplicationFees = currentResults.mediumDensity.daApplicationFees || 0;
                    const adjustedTotalDevelopmentCosts = adjustedConstructionCosts + daApplicationFees + adjustedProfessionalFees + adjustedDevelopmentContribution;
                    
                    // Land tax and finance costs
                    const landTax = currentResults.mediumDensity.landTax || 0;
                    const projectPeriod = currentResults.mediumDensity.projectPeriod || 24;
                    const projectDurationYears = projectPeriod / 12;
                    const adjustedFinanceCosts = settings.mediumDensity.interestRate * (projectDurationYears / 2) * adjustedTotalDevelopmentCosts;
                    
                    // Calculate residual land value before interest
                    const adjustedResidualBeforeInterest = adjustedNetRealisationAfterProfit - adjustedTotalDevelopmentCosts - landTax - adjustedFinanceCosts;
                    
                    // Calculate interest on purchase price
                    const adjustedInterestOnPurchase = Math.abs(
                      adjustedResidualBeforeInterest - 
                      adjustedResidualBeforeInterest / 
                      (1 + settings.mediumDensity.interestRate / 12 * projectPeriod * 0.5)
                    );
                    
                    // Calculate acquisition costs (3% of residual land value minus interest)
                    const acquisitionRate = 0.03; // 3%
                    const adjustedAcquisitionCosts = acquisitionRate * (adjustedResidualBeforeInterest - adjustedInterestOnPurchase);
                    
                    // Final residual land value
                    const adjustedResidualLandValue = adjustedResidualBeforeInterest - adjustedInterestOnPurchase - adjustedAcquisitionCosts;
                    
                    return formatCurrency(adjustedResidualLandValue);
                  })()
                }</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* High Density Details */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <Building className="mr-2" /> High Density Details
          </h3>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Metric</th>
                <th className="px-4 py-2 text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-2">GFA</td>
                <td className="px-4 py-2 text-right">{currentResults?.highDensity?.gfa ? formatSqm(currentResults.highDensity.gfa) : 'N/A'}</td>
              </tr>
              <tr>
                <td className="px-4 py-2">Development Yield</td>
                <td className="px-4 py-2 text-right">{currentResults?.highDensity?.developmentYield || 0} units</td>
              </tr>
              <tr className="font-bold">
                <td className="px-4 py-2">Residual Land Value</td>
                <td className="px-4 py-2 text-right">{formatCurrency(currentResults?.highDensity?.residualLandValue || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FeasibilitySummary;