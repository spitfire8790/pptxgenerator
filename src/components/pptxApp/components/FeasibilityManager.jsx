import React, { useState, useEffect } from 'react';
import { Calculator, Banknote, X } from 'lucide-react';
import FeasibilitySettings from './FeasibilitySettings';
import MedianPriceModal from './MedianPriceModal';
import { lgaMapping } from '../utils/map/utils/councilLgaMapping';

const LOW_MID_DENSITY_TYPES = [
  'Dwelling',
  'Dwelling house',
  'Dual occupancy',
  'Dual occupancy (attached)',
  'Dual occupancy (detached)',
  'Multi-dwelling housing',
  'Multi-dwelling housing (terraces)',
  'Semi-attached dwelling',
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

const FeasibilityManager = ({ settings, onSettingChange, salesData, open, onClose, selectedFeature }) => {
  const [showMedianPrices, setShowMedianPrices] = useState(false);
  const [constructionData, setConstructionData] = useState({
    lowMidDensity: null,
    highDensity: null,
    dwellingSizes: {
      lowMidDensity: null,
      highDensity: null
    },
    loading: true,
    error: null
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

  const calculateMedianDwellingSize = (certificates, densityTypes) => {
    if (!certificates?.length) return null;

    console.log(`Calculating median dwelling size for density types:`, densityTypes);

    // Filter for relevant development types and valid data
    const validCertificates = certificates.filter(cert => {
      const isRelevantType = hasMatchingDensityType(cert.DevelopmentType, densityTypes);
      const hasValidData = cert.ProposedGrossFloorArea && 
                          cert.UnitsProposed && 
                          cert.UnitsProposed > 0 && 
                          cert.ProposedGrossFloorArea >= MIN_GFA;

      if (isRelevantType && !hasValidData) {
        console.log('Certificate excluded due to invalid data:', {
          developmentType: cert.DevelopmentType?.map(t => t.DevelopmentType).join(', '),
          gfa: cert.ProposedGrossFloorArea,
          units: cert.UnitsProposed
        });
      }

      return isRelevantType && hasValidData;
    });

    console.log(`Found ${validCertificates.length} valid certificates for dwelling size calculation`);
    console.log('Valid certificates:', validCertificates.map(cert => ({
      type: cert.DevelopmentType?.map(t => t.DevelopmentType).join(', '),
      gfa: cert.ProposedGrossFloorArea,
      units: cert.UnitsProposed,
      gfaPerDwelling: cert.ProposedGrossFloorArea / cert.UnitsProposed
    })));

    if (!validCertificates.length) return null;

    // Calculate GFA per dwelling for each valid certificate
    const gfaPerDwellingList = validCertificates
      .map(cert => ({
        gfaPerDwelling: cert.ProposedGrossFloorArea / cert.UnitsProposed,
        units: cert.UnitsProposed,
        type: cert.DevelopmentType?.map(t => t.DevelopmentType).join(', ')
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
      console.log('Cumulative units:', cumulativeUnits, 'Current GFA:', item.gfaPerDwelling, 'Type:', item.type);
      if (cumulativeUnits >= halfTotalUnits && !medianValue) {
        medianValue = item.gfaPerDwelling;
        console.log('Found median value:', medianValue, 'from type:', item.type);
        break;
      }
    }

    if (medianValue) return medianValue;

    // Fallback to simple median if weighted calculation fails
    const simpleMedian = gfaPerDwellingList[Math.floor(gfaPerDwellingList.length / 2)].gfaPerDwelling;
    console.log('Using fallback simple median:', simpleMedian);
    return simpleMedian;
  };

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
          (hasMatchingDensityType(cert.DevelopmentType, LOW_MID_DENSITY_TYPES) || 
           hasMatchingDensityType(cert.DevelopmentType, HIGH_DENSITY_TYPES))
        );

        console.log('Valid certificates:', validCertificates.map(cert => ({
          type: cert.DevelopmentType?.map(t => t.DevelopmentType).join(', '),
          gfa: cert.ProposedGrossFloorArea,
          units: cert.UnitsProposed,
          cost: cert.CostOfDevelopment,
          isLowMid: hasMatchingDensityType(cert.DevelopmentType, LOW_MID_DENSITY_TYPES),
          isHigh: hasMatchingDensityType(cert.DevelopmentType, HIGH_DENSITY_TYPES)
        })));

        // Calculate median costs and dwelling sizes for each density type
        const lowMidDensityCost = calculateMedianCost(validCertificates, LOW_MID_DENSITY_TYPES);
        const highDensityCost = calculateMedianCost(validCertificates, HIGH_DENSITY_TYPES);

        console.log('Calculating low-mid density dwelling size...');
        const lowMidDensitySize = calculateMedianDwellingSize(validCertificates, LOW_MID_DENSITY_TYPES);
        
        console.log('Calculating high density dwelling size...');
        const highDensitySize = calculateMedianDwellingSize(validCertificates, HIGH_DENSITY_TYPES);

        // Count certificates by density type
        const lowMidDensityCount = validCertificates.filter(cert => 
          hasMatchingDensityType(cert.DevelopmentType, LOW_MID_DENSITY_TYPES)
        ).length;

        const highDensityCount = validCertificates.filter(cert => 
          hasMatchingDensityType(cert.DevelopmentType, HIGH_DENSITY_TYPES)
        ).length;

        console.log('Construction data analysis:', {
          lga: councilName,
          totalCertificates: validCertificates.length,
          lowMidDensity: {
            count: lowMidDensityCount,
            medianCost: lowMidDensityCost,
            medianSize: lowMidDensitySize,
            types: LOW_MID_DENSITY_TYPES
          },
          highDensity: {
            count: highDensityCount,
            medianCost: highDensityCost,
            medianSize: highDensitySize,
            types: HIGH_DENSITY_TYPES
          }
        });

        setConstructionData({
          lowMidDensity: lowMidDensityCost,
          highDensity: highDensityCost,
          dwellingSizes: {
            lowMidDensity: lowMidDensitySize,
            highDensity: highDensitySize
          },
          loading: false,
          error: null,
          lastUpdated: new Date(),
          certificateCounts: {
            lowMidDensity: lowMidDensityCount,
            highDensity: highDensityCount
          }
        });

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
  }, [open, selectedFeature?.properties?.site_suitability__LGA]);

  // Function to handle showing median prices modal
  const handleShowMedianPrices = () => {
    setShowMedianPrices(true);
  };

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
                  
                  {constructionData.loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                      <p className="mt-4 text-gray-600">Loading construction data...</p>
                    </div>
                  ) : (
                    <FeasibilitySettings 
                      settings={settings} 
                      onSettingChange={onSettingChange} 
                      salesData={salesData}
                      constructionData={constructionData}
                      selectedFeature={selectedFeature}
                      onShowMedianPrices={handleShowMedianPrices}
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
    </>
  );
};

export default FeasibilityManager; 