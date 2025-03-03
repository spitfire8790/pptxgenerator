// Import necessary React library and components
import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import { track } from '@vercel/analytics';
// Import MapView which handles Giraffe SDK map interactions
import MapView from './components/pptxApp/MapView';
// Import ReportGenerator which handles the PowerPoint generation UI and logic
import ReportGenerator from './components/pptxApp/ReportGenerator';

function App() {
  // State to store the currently selected map feature (property)
  // null when no feature is selected
  const [selectedFeature, setSelectedFeature] = React.useState(null);
  // State to track if a report is being generated
  const [isGeneratingReport, setIsGeneratingReport] = React.useState(false);

  // Callback function triggered when a feature is selected on the map
  // Transforms the raw feature data into the format we need
  const handleFeatureSelect = (feature) => {
    const transformedFeature = {
      properties: {
        // Preserve the original copiedFrom data which contains all property details
        copiedFrom: {
          ...feature.properties?.copiedFrom
        }
      },
      // Keep the geometry data for map operations (screenshots, bounds, etc.)
      geometry: feature.geometry
    };
    setSelectedFeature(transformedFeature);
    
    // Track feature selection event
    track('feature_selected', {
      propertyId: feature.properties?.copiedFrom?.id || 'unknown',
      propertyType: feature.properties?.copiedFrom?.type || 'unknown'
    });
  };

  // Handler for when report generation starts or ends
  const handleReportGenerationStateChange = (isGenerating) => {
    setIsGeneratingReport(isGenerating);
  };

  return (
    // Main container that takes up the full viewport height
    <div className="h-screen">
      {/* 
        Report Generator UI Container
        - absolute positioning to float over the map
        - top-4 and left-4 give 16px padding from top-left corner
        - z-10 ensures it stays above the map
        - w-[950px] sets a fixed width
        - bg-white, rounded-lg, and shadow-lg give it a card-like appearance
      */}
      <div className="absolute top-2 left-2 z-10 w-[980px] bg-white rounded-8g shadow-2g">
        <ReportGenerator 
          selectedFeature={selectedFeature} 
          onGenerationStateChange={handleReportGenerationStateChange}
        />
      </div>

      {/* 
        MapView component
        - Takes up full container space
        - Handles all Giraffe SDK map interactions
        - Triggers handleFeatureSelect when user selects a property
        - Only loads layers when a report is being generated
      */}
      <MapView 
        onFeatureSelect={handleFeatureSelect} 
        loadLayers={isGeneratingReport}
      />
      <Analytics 
        debug={import.meta.env.MODE === 'development'}
        beforeSend={(event) => {
          // You can modify or filter events before they're sent
          if (event.type === 'pageview') {
            // Add custom properties to all pageview events
            return {
              ...event,
              properties: {
                ...event.properties,
                appVersion: import.meta.env.VITE_APP_VERSION,
              },
            };
          }
          return event;
        }}
      />
    </div>
  );
}

// Export the App component as the default export
export default App;
