import React from 'react';
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
  Info
} from 'lucide-react';

const FeasibilitySettings = ({ settings, onSettingChange, salesData, constructionData, selectedFeature }) => {
  // Define property type descriptions
  const densityDescriptions = {
    lowMidDensity: "Includes: Dual OccupancyDuplex/Semi-detached, House, Manor House, Terrace, Townhouse, Villa",
    highDensity: "Includes: Apartment, Build-to-Rent, Shop Top Housing, Studio, Unit"
  };

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

    onSettingChange(setting, value, density);
  };

  const formatValue = (setting, value) => {
    if (!value && value !== 0) return 'N/A';
    
    if (setting === 'daApplicationFees' || 
        setting === 'dwellingPrice' || 
        setting === 'constructionCostM2' ||
        setting === 'pricePerM2') {
      return value.toLocaleString('en-AU');
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

  // Calculate derived values
  const calculateDerivedValues = (density) => {
    // Get property data
    const developableArea = selectedFeature?.properties?.copiedFrom?.site_suitability__area || 0;
    const fsr = selectedFeature?.properties?.copiedFrom?.site_suitability__floorspace_ratio || 0;
    const hob = selectedFeature?.properties?.copiedFrom?.site_suitability__height_of_building || 0;

    // Calculate GFA under FSR
    const gfaUnderFsr = developableArea * fsr;

    // Calculate GFA under HOB
    const maxStoreys = Math.floor(hob / settings[density].floorToFloorHeight);
    const siteCoverage = developableArea * settings[density].siteEfficiencyRatio;
    const gfaUnderHob = siteCoverage * maxStoreys * settings[density].gbaToGfaRatio;

    // Use FSR value if no HoB exists, otherwise use the lower of the two
    const gfa = !hob ? gfaUnderFsr : Math.min(gfaUnderFsr, gfaUnderHob);

    // Get median GFA from construction data
    const relevantTypes = density === 'lowMidDensity' 
      ? ['Dwelling', 'Dwelling house', 'Dual occupancy', 'Dual occupancy (attached)', 'Dual occupancy (detached)', 'Manor house']
      : ['Apartment', 'Build-to-rent', 'Shop Top Housing', 'Studio', 'Unit'];

    console.log('Construction Data:', constructionData);
    console.log('Relevant Types for', density, ':', relevantTypes);

    // Get all GFA values for the relevant density category
    const filteredApplications = constructionData?.Application
      ?.filter(cc => 
        cc.DevelopmentType?.some(type => relevantTypes.includes(type.DevelopmentType)) &&
        cc.ProposedGrossFloorArea && 
        cc.UnitsProposed && 
        cc.UnitsProposed > 0
      ) || [];

    console.log('Filtered Applications:', filteredApplications);

    const allGfaValues = filteredApplications
      .map(cc => cc.ProposedGrossFloorArea / cc.UnitsProposed);

    console.log('GFA per Unit Values:', allGfaValues);

    // Calculate median GFA
    const dwellingSize = allGfaValues.length > 0
      ? allGfaValues.sort((a, b) => a - b)[Math.floor(allGfaValues.length / 2)]
      : 0;

    console.log('Calculated Median Dwelling Size:', dwellingSize);

    // Filter sales data by property type based on density
    const LOW_MID_DENSITY_TYPES = ['duplex/semi-detached', 'duplex-semi-detached', 'house', 'terrace', 'townhouse', 'villa'];
    const HIGH_DENSITY_TYPES = ['apartment', 'studio', 'unit'];

    const relevantSales = salesData?.filter(sale => {
      const propertyType = sale.property_type?.toLowerCase().trim();
      const propertyTypes = density === 'lowMidDensity' ? LOW_MID_DENSITY_TYPES : HIGH_DENSITY_TYPES;
      return propertyTypes.some(type => propertyType?.includes(type));
    }) || [];

    // Get median price from filtered sales data
    const medianPrice = relevantSales.length > 0 
      ? relevantSales.map(s => s.price).sort((a, b) => a - b)[Math.floor(relevantSales.length / 2)]
      : null;

    // Get construction cost from construction data
    const constructionCostM2 = constructionData[density === 'lowMidDensity' ? 'lowMidDensity' : 'highDensity'];

    return {
      dwellingSize: Math.round(dwellingSize),
      dwellingPrice: medianPrice,
      pricePerM2: medianPrice && dwellingSize ? Math.round(medianPrice / dwellingSize) : null,
      constructionCostM2: Math.round(constructionCostM2)
    };
  };

  const settingsConfig = [
    // Development Metrics section
    { id: 'section-development', label: 'Development Metrics', isSection: true },
    { id: 'siteEfficiencyRatio', label: 'Site Efficiency Ratio', unit: '%', icon: Building2 },
    { id: 'floorToFloorHeight', label: 'Floor to Floor Height', unit: 'm', icon: Ruler },
    { id: 'gbaToGfaRatio', label: 'GBA to GFA Ratio', unit: '%', icon: Maximize2 },
    { id: 'gfaToNsaRatio', label: 'GFA to NSA Ratio', unit: '%', icon: Home },
    { id: 'unitSize', label: 'Dwelling Size (GFA)', unit: 'm²', icon: Users },

    // Construction Metrics section
    { id: 'section-construction', label: 'Construction Metrics', isSection: true },
    { 
      id: 'constructionCostM2', 
      label: 'Construction Cost per m² GFA', 
      unit: '$/m²', 
      icon: HardHat, 
      isCalculated: true,
      description: density => `Based on ${constructionData?.certificateCounts?.[density] || 0} approved DAs`
    },

    // Dwelling Metrics section
    { id: 'section-dwelling', label: 'Dwelling Metrics', isSection: true },
    { id: 'dwellingSize', label: 'Dwelling Size (GFA)', unit: 'm²', icon: SquareStack, isCalculated: true },
    { id: 'dwellingPrice', label: 'Dwelling Price', unit: '$', icon: Building, isCalculated: true },
    { id: 'pricePerM2', label: 'Price per m² GFA', unit: '$/m²', icon: DollarSign, isCalculated: true },

    // Financial Metrics section
    { id: 'section-financial', label: 'Financial Metrics', isSection: true },
    { id: 'agentsSalesCommission', label: 'Agent\'s Sales Commission', unit: '%', icon: BadgeDollarSign },
    { id: 'legalFeesOnSales', label: 'Legal Fees on Sales', unit: '%', icon: Scale },
    { id: 'marketingCosts', label: 'Marketing Costs', unit: '%', icon: Target },
    { id: 'profitAndRisk', label: 'Profit and Risk', unit: '%', icon: Briefcase },
    { id: 'daApplicationFees', label: 'DA Application Fees', unit: '$', icon: FileSpreadsheet },
    { id: 'professionalFees', label: 'Professional Fees', unit: '%', icon: GraduationCap },
    { id: 'interestRate', label: 'Interest Rate', unit: '%', icon: Percent },
    { id: 'projectPeriod', label: 'Project Period', unit: 'months', icon: Clock }
  ];

  const renderInput = (setting, density) => {
    if (setting.isCalculated) {
      const derivedValues = calculateDerivedValues(density);
      return (
        <div className="text-gray-500 text-center w-full">
          {formatValue(setting.id, derivedValues[setting.id])}
        </div>
      );
    }

    return (
      <div className="relative w-32 mx-auto">
        <input
          type="text"
          value={formatValue(setting.id, settings[density][setting.id])}
          onChange={handleChange(setting.id, density)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-center"
          step={setting.unit === '%' ? '0.1' : '1'}
          min="0"
          max={setting.unit === '%' ? '100' : undefined}
        />
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-6">
        Feasibility Settings
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Assumption</th>
              <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">Unit</th>
              <th className="px-2 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[140px]">
                <div className="relative group cursor-help">
                  Low-Mid Density
                  <div className="absolute z-10 invisible group-hover:visible bg-gray-900 text-white text-xs rounded p-2 w-48 left-1/2 -translate-x-1/2 top-6">
                    {densityDescriptions.lowMidDensity}
                    <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 -top-1 left-1/2 -translate-x-1"></div>
                  </div>
                </div>
              </th>
              <th className="px-2 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[140px]">
                <div className="relative group cursor-help">
                  High Density
                  <div className="absolute z-10 invisible group-hover:visible bg-gray-900 text-white text-xs rounded p-2 w-48 left-1/2 -translate-x-1/2 top-6">
                    {densityDescriptions.highDensity}
                    <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 -top-1 left-1/2 -translate-x-1"></div>
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {settingsConfig.map((setting) => {
              if (setting.isSection) {
                return (
                  <tr key={setting.id}>
                    <td colSpan="4" className="px-4 py-2 bg-gray-50">
                      <div className="font-medium text-gray-900">{setting.label}</div>
                    </td>
                  </tr>
                );
              }

              const Icon = setting.icon;
              return (
                <tr key={setting.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-500" />
                      <span>{setting.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{setting.unit}</td>
                  <td className="px-4 py-2 text-center">
                    {setting.id === 'constructionCostM2' && constructionData.loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                        <span className="text-gray-500">Loading...</span>
                      </div>
                    ) : (
                      <div className="flex justify-center">
                        {renderInput(setting, 'lowMidDensity')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {setting.id === 'constructionCostM2' && constructionData.loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                        <span className="text-gray-500">Loading...</span>
                      </div>
                    ) : (
                      <div className="flex justify-center">
                        {renderInput(setting, 'highDensity')}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {constructionData.error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">
          {constructionData.error}
        </div>
      )}
    </div>
  );
};

export default FeasibilitySettings; 