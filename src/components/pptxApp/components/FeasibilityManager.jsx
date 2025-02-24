import React, { useState } from 'react';
import { Calculator, Banknote, X } from 'lucide-react';
import FeasibilitySettings from './FeasibilitySettings';
import MedianPriceModal from './MedianPriceModal';

const FeasibilityManager = ({ settings, onSettingChange, salesData, open, onClose }) => {
  const [showMedianPrices, setShowMedianPrices] = useState(false);

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