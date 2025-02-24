import React from 'react';

const FeasibilitySettings = ({ settings, onSettingChange }) => {
  const handleChange = (setting) => (event) => {
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

    onSettingChange(setting, value);
  };

  const formatValue = (setting, value) => {
    if (setting.endsWith('Ratio') || 
        setting === 'agentsSalesCommission' || 
        setting === 'legalFeesOnSales' || 
        setting === 'marketingCosts' || 
        setting === 'profitAndRisk' || 
        setting === 'professionalFees' || 
        setting === 'interestRate') {
      return (value * 100).toString();
    }
    return value.toString();
  };

  const renderInput = (label, setting, unit) => (
    <div className="col-span-1">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          value={formatValue(setting, settings[setting])}
          onChange={handleChange(setting)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          step={unit === '%' ? '0.1' : '1'}
          min="0"
          max={unit === '%' ? '100' : undefined}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <span className="text-gray-500 sm:text-sm">{unit}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Feasibility Settings
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {renderInput('Site Efficiency Ratio', 'siteEfficiencyRatio', '%')}
        {renderInput('Floor to Floor Height', 'floorToFloorHeight', 'm')}
        {renderInput('GBA to GFA Ratio', 'gbaToGfaRatio', '%')}
        {renderInput('GFA to NSA Ratio', 'gfaToNsaRatio', '%')}
        {renderInput('Unit Size', 'unitSize', 'm²')}
        {renderInput('Agent\'s Sales Commission', 'agentsSalesCommission', '%')}
        {renderInput('Legal Fees on Sales', 'legalFeesOnSales', '%')}
        {renderInput('Marketing Costs', 'marketingCosts', '%')}
        {renderInput('Profit and Risk', 'profitAndRisk', '%')}
        {renderInput('DA Application Fees', 'daApplicationFees', '$')}
        {renderInput('Professional Fees', 'professionalFees', '%')}
        {renderInput('Interest Rate', 'interestRate', '%')}
        {renderInput('Project Period', 'projectPeriod', 'months')}
      </div>
    </div>
  );
};

export default FeasibilitySettings; 