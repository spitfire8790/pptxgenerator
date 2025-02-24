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

const FeasibilityManager = ({ settings, onSettingChange, salesData, open, onClose, selectedFeature }) => {
  const [showMedianPrices, setShowMedianPrices] = useState(false);
  const [constructionData, setConstructionData] = useState({
    lowMidDensity: null,
    highDensity: null,
    loading: true,
    error: null
  });

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

        // Filter and process construction certificates
        const validCertificates = data.Application.filter(cert => 
          cert.CostOfDevelopment && 
          cert.ProposedGrossFloorArea && 
          cert.ProposedGrossFloorArea > 0 && 
          cert.DevelopmentType
        );

        console.log('Valid certificates:', validCertificates);

        // Separate by density type and calculate median costs
        const lowMidDensityCerts = validCertificates.filter(cert => 
          cert.DevelopmentType?.some(type => LOW_MID_DENSITY_TYPES.includes(type.DevelopmentType))
        );

        const highDensityCerts = validCertificates.filter(cert => 
          cert.DevelopmentType?.some(type => HIGH_DENSITY_TYPES.includes(type.DevelopmentType))
        );

        // Calculate median cost per m² for each density type
        const calculateMedianCost = (certificates) => {
          if (!certificates.length) return null;
          const costPerM2List = certificates
            .map(cert => cert.CostOfDevelopment / cert.ProposedGrossFloorArea)
            .filter(cost => cost > 0 && cost < 10000); // Filter out unrealistic values
          
          if (costPerM2List.length === 0) return null;
          const sortedCosts = costPerM2List.sort((a, b) => a - b);
          const medianIndex = Math.floor(sortedCosts.length / 2);
          return sortedCosts[medianIndex];
        };

        const lowMidDensityCost = calculateMedianCost(lowMidDensityCerts);
        const highDensityCost = calculateMedianCost(highDensityCerts);

        console.log('Construction cost analysis:', {
          lga: councilName,
          totalCertificates: validCertificates.length,
          lowMidDensity: {
            count: lowMidDensityCerts.length,
            medianCost: lowMidDensityCost,
            types: [...new Set(lowMidDensityCerts.map(c => c.DevelopmentType))]
          },
          highDensity: {
            count: highDensityCerts.length,
            medianCost: highDensityCost,
            types: [...new Set(highDensityCerts.map(c => c.DevelopmentType))]
          }
        });

        setConstructionData({
          lowMidDensity: lowMidDensityCost,
          highDensity: highDensityCost,
          loading: false,
          error: null,
          lastUpdated: new Date(),
          certificateCounts: {
            lowMidDensity: lowMidDensityCerts.length,
            highDensity: highDensityCerts.length
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center">
            <Calculator className="w-6 h-6 mr-2" />
            <h2 className="text-xl font-semibold">Feasibility Calculator Settings</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setShowMedianPrices(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-lg transition-colors"
              title="View Sales Analysis"
            >
              <Banknote className="w-5 h-5" />
              <span>Sales</span>
            </button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <FeasibilitySettings 
            settings={settings} 
            onSettingChange={onSettingChange}
            salesData={salesData}
            constructionData={constructionData}
            selectedFeature={selectedFeature}
          />
        </div>
      </div>

      <MedianPriceModal
        open={showMedianPrices}
        onClose={() => setShowMedianPrices(false)}
        salesData={salesData}
      />
    </div>
  );
};

export default FeasibilityManager; 