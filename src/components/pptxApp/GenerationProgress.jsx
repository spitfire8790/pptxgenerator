import React from 'react';

const steps = [
  { id: 'screenshots', label: 'Capturing Screenshots' },
  { id: 'cover', label: 'Creating Cover Page' },
  { id: 'snapshot', label: 'Building Property Snapshot' },
  { id: 'primaryAttributes', label: 'Adding Primary Attributes' },
  { id: 'secondaryAttributes', label: 'Adding Secondary Attributes' },
  { id: 'planning', label: 'Generating Planning Details' },
  { id: 'servicing', label: 'Checking Site Servicing' },
  { id: 'geoscape', label: 'Adding Utilisation Data' },
  { id: 'access', label: 'Assessing Site Access' },
  { id: 'hazards', label: 'Assessing Natural Hazards' },
  { id: 'finalizing', label: 'Finalising Report' }
];

const GenerationProgress = ({ currentStep, completedSteps }) => {
  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="text-lg font-semibold text-gray-700 mb-4">
        Generating Report...
      </div>
      
      {steps.map((step, index) => {
        const isActive = currentStep === step.id;
        const isCompleted = completedSteps.includes(step.id);
        
        return (
          <div 
            key={step.id}
            className={`flex items-center space-x-3 transition-all duration-300
              ${isActive ? 'scale-105' : 'scale-100'}
              ${isCompleted ? 'text-green-600' : isActive ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <div className={`
              w-6 h-6 rounded-full flex items-center justify-center
              transition-colors duration-300
              ${isCompleted ? 'bg-green-100' : isActive ? 'bg-blue-100' : 'bg-gray-100'}
            `}>
              {isCompleted ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : isActive ? (
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              ) : (
                <div className="w-2 h-2 bg-gray-300 rounded-full" />
              )}
            </div>
            <span className="text-sm font-medium">{step.label}</span>
            {isActive && (
              <div className="flex-1 flex justify-end">
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GenerationProgress; 