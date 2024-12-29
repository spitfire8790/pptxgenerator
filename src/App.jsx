// Import necessary React library and components
import React from 'react';
// Import MapView which handles Giraffe SDK map interactions
import MapView from './components/pptxApp/MapView';
// Import ReportGenerator which handles the PowerPoint generation UI and logic
import ReportGenerator from './components/pptxApp/ReportGenerator';

function App() {
  // State to store the currently selected map feature (property)
  // null when no feature is selected
  const [selectedFeature, setSelectedFeature] = React.useState(null);

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
  };

  return (
    // Main container that takes up the full viewport height
    <div className="h-screen">
      {/* 
        Report Generator UI Container
        - absolute positioning to float over the map
        - top-4 and left-4 give 16px padding from top-left corner
        - z-10 ensures it stays above the map
        - w-[400px] sets a fixed width
        - bg-white, rounded-lg, and shadow-lg give it a card-like appearance
      */}
      <div className="absolute top-4 left-4 z-10 w-[950px] bg-white rounded-4g shadow-lg">
        <ReportGenerator selectedFeature={selectedFeature} />
      </div>

      {/* 
        MapView component
        - Takes up full container space
        - Handles all Giraffe SDK map interactions
        - Triggers handleFeatureSelect when user selects a property
      */}
      <MapView onFeatureSelect={handleFeatureSelect} />
    </div>
  );
}

// Export the App component as the default export
export default App;
