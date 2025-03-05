// Import necessary React library and components
import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import { track } from '@vercel/analytics';
// Import MapView which handles Giraffe SDK map interactions
import MapView from './components/pptxApp/MapView';
// Import ReportGenerator which handles the PowerPoint generation UI and logic
import ReportGenerator from './components/pptxApp/ReportGenerator';

function App() {
  // State to store the currently selected map features (properties)
  // Empty array when no features are selected
  const [selectedFeatures, setSelectedFeatures] = React.useState([]);
  
  // State to track if we're in multi-select mode
  const [isMultiSelectMode, setIsMultiSelectMode] = React.useState(false);

  // Callback function triggered when a feature is selected on the map
  // Transforms the raw feature data into the format we need
  const handleFeatureSelect = (feature) => {
    const transformedFeature = {
      type: 'Feature', // Add type for consistency
      properties: {
        // Preserve the original copiedFrom data which contains all property details
        copiedFrom: {
          ...feature.properties?.copiedFrom
        }
      },
      // Keep the geometry data for map operations (screenshots, bounds, etc.)
      geometry: feature.geometry
    };
    
    if (isMultiSelectMode) {
      // Check if feature is already selected (to toggle)
      const featureIndex = selectedFeatures.findIndex(
        f => f.properties?.copiedFrom?.id === transformedFeature.properties?.copiedFrom?.id
      );
      
      if (featureIndex >= 0) {
        // Feature exists, remove it (toggle off)
        setSelectedFeatures(prev => prev.filter((_, index) => index !== featureIndex));
      } else {
        // Feature doesn't exist, add it to the collection
        setSelectedFeatures(prev => [...prev, transformedFeature]);
      }
    } else {
      // Single select mode - replace the entire selection
      setSelectedFeatures([transformedFeature]);
    }
    
    // Track feature selection event
    track('feature_selected', {
      propertyId: feature.properties?.copiedFrom?.id || 'unknown',
      propertyType: feature.properties?.copiedFrom?.type || 'unknown',
      multiSelectMode: isMultiSelectMode
    });
  };

  // Toggle the multi-select mode
  const toggleMultiSelectMode = () => {
    // If turning off multi-select mode with multiple features selected,
    // keep only the first feature
    if (isMultiSelectMode && selectedFeatures.length > 1) {
      setSelectedFeatures([selectedFeatures[0]]);
    }
    
    setIsMultiSelectMode(!isMultiSelectMode);
  };

  // Clear all selected features
  const clearSelectedFeatures = () => {
    setSelectedFeatures([]);
  };
  
  // Handle selection from the property list - keep this function to be passed to ReportGenerator
  const handlePropertyListSelect = (features) => {
    setSelectedFeatures(features);
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
        {/* Remove all the top controls and property list selector */}
        
        <ReportGenerator 
          selectedFeatures={selectedFeatures} 
          onPropertySelect={handlePropertyListSelect}
          isMultiSelectMode={isMultiSelectMode}
          toggleMultiSelectMode={toggleMultiSelectMode}
          clearSelectedFeatures={clearSelectedFeatures}
        />
      </div>

      {/* 
        MapView component
        - Takes up full container space
        - Handles all Giraffe SDK map interactions
        - Triggers handleFeatureSelect when user selects a property
      */}
      <MapView 
        onFeatureSelect={handleFeatureSelect} 
        selectedFeatures={selectedFeatures} 
        isMultiSelectMode={isMultiSelectMode}
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
