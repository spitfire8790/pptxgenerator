import React from 'react';

const getStepDescription = (stepId) => {
  switch (stepId) {
    case 'screenshots':
      return {
        title: 'Capturing Screenshots',
        detail: 'Generating high-quality map captures for each slide...'
      };
    case 'cover':
      return {
        title: 'Creating Cover Page',
        detail: 'Setting up title page with property overview...'
      };
    case 'snapshot':
      return {
        title: 'Building Property Snapshot',
        detail: 'Adding aerial imagery and key property details...'
      };
    case 'primaryAttributes':
      return {
        title: 'Adding Primary Attributes',
        detail: 'Processing core site characteristics and measurements...'
      };
    case 'secondaryAttributes':
      return {
        title: 'Adding Secondary Attributes',
        detail: 'Including topography and additional site features...'
      };
    case 'planning':
      return {
        title: 'Generating Planning Details',
        detail: 'Analysing zoning and development controls...'
      };
    case 'planningTwo':
      return {
        title: 'Adding Heritage & Acid Sulfate Soils',
        detail: 'Checking heritage listings and soil conditions...'
      };
    case 'servicing':
      return {
        title: 'Checking Site Servicing',
        detail: 'Mapping utility connections and infrastructure...'
      };
    case 'utilisation':
      return {
        title: 'Adding Utilisation Data',
        detail: 'Analysing current site improvements and usage...'
      };
    case 'access':
      return {
        title: 'Assessing Site Access',
        detail: 'Evaluating transport and strategic centre accessibility factors...'
      };
    case 'hazards':
      return {
        title: 'Assessing Natural Hazards',
        detail: 'Checking flood, bushfire and other hazard exposure...'
      };
    case 'environmental':
      return {
        title: 'Assessing Environmental Factors',
        detail: 'Analysing biodiversity and environmental constraints...'
      };
    case 'contamination':
      return {
        title: 'Checking Site Contamination',
        detail: 'Reviewing potential contamination...'
      };
    case 'scoring':
      return {
        title: 'Generating Scoring Summary',
        detail: 'Calculating final site suitability scores...'
      };
    case 'finalising':
      return {
        title: 'Finalising Report',
        detail: 'Compiling all sections and formatting...'
      };
    default:
      return {
        title: 'Processing',
        detail: 'Working on report generation...'
      };
  }
};

const GenerationProgress = ({ currentStep, completedSteps, progress, selectedSlides }) => {
  // Filter steps based on selected slides
  const steps = [
    { id: 'screenshots', title: 'Capturing Screenshots' }, // Always include screenshots step
    ...Object.entries(selectedSlides)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => ({ id, ...getStepDescription(id) })),
    { id: 'finalising', title: 'Finalising Report' } // Always include finalising step
  ];

  const currentStepInfo = currentStep ? getStepDescription(currentStep) : null;

  return (
    <div className="bg-white shadow-sm rounded-lg p-4">
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Report Generation Progress
          </h3>
          <span className="text-sm font-medium text-gray-500">
            {Math.round(progress)}%
          </span>
        </div>
        {currentStepInfo && (
          <div className="mt-2">
            <p className="text-sm text-gray-600">{currentStepInfo.detail}</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {steps.map(step => {
          const isActive = currentStep === step.id;
          const isCompleted = completedSteps.includes(step.id);
          const stepInfo = getStepDescription(step.id);
          
          return (
            <div 
              key={step.id}
              className={`flex items-start space-x-3 transition-all duration-300
                ${isActive ? 'scale-102' : 'scale-100'}
                ${isCompleted ? 'text-green-600' : isActive ? 'text-blue-600' : 'text-gray-400'}`}
            >
              <div className={`
                mt-1 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
                transition-colors duration-300
                ${isCompleted ? 'bg-green-100' : isActive ? 'bg-blue-100' : 'bg-gray-100'}
              `}>
                {isCompleted ? (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : isActive ? (
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                ) : (
                  <div className="w-2 h-2 bg-gray-300 rounded-full" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  isCompleted ? 'text-green-600' : isActive ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {stepInfo.title}
                </p>
                {isActive && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    {stepInfo.detail}
                  </p>
                )}
              </div>

              {isActive && (
                <div className="flex-shrink-0">
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GenerationProgress; 