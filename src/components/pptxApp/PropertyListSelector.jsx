import React, { useState, useEffect } from 'react';
import { rpc, giraffeState } from '@gi-nx/iframe-sdk';
import { logAvailableLayers } from './utils/map/utils/layerDetails';
import { Building2 } from 'lucide-react';

const PropertyListSelector = ({ onSelect, selectedFeatures = [] }) => {
  const [availableLayers, setAvailableLayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch available layers function moved outside useEffect
  const fetchLayers = async () => {
    setIsLoading(true);
    try {
      // First log available layers to ensure data is loaded
      await logAvailableLayers();
      
      // Get rawSections from giraffeState, exactly like DevelopableAreaSelector
      const rawSections = giraffeState.get('rawSections');
      
      if (!rawSections?.features) {
        console.log('No valid rawSections data available');
        setAvailableLayers([]);
        setIsLoading(false);
        return;
      }
      
      // Filter layers where usage = "Site boundary"
      const siteBoundaryLayers = rawSections.features
        .filter(feature => 
          feature.properties?.usage === "Site boundary"
        )
        .map(feature => ({
          id: feature.properties.id || feature.id || feature.properties?.OBJECTID,
          name: feature.properties?.copiedFrom?.site__address || 'Unnamed Boundary',
          feature: feature
        }));
      
      console.log('Site boundary layers:', siteBoundaryLayers);
      setAvailableLayers(siteBoundaryLayers);
    } catch (error) {
      console.error('Error fetching layers:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch available layers, including listener for changes
  useEffect(() => {
    console.log('Setting up rawSections listener in PropertyListSelector');
    
    // Initial fetch
    fetchLayers();

    // Set up listener for rawSections changes
    const unsubscribe = giraffeState.addListener(['rawSections'], () => {
      console.log('rawSections changed, refreshing site boundaries');
      fetchLayers();
    });

    return () => {
      console.log('Cleaning up PropertyListSelector');
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Handle layer selection, transforming the feature to the expected format
  const handleLayerSelect = (layer) => {
    // Create a transformed feature just like in MapView.jsx
    const transformedFeature = {
      type: 'Feature',
      geometry: layer.feature.geometry,
      properties: {
        // Use the entire properties object as copiedFrom to ensure address information is preserved
        copiedFrom: layer.feature.properties?.copiedFrom || layer.feature.properties
      }
    };
    
    // Add a consistent ID to the transformed feature for reliable matching
    const layerId = layer.id;
    transformedFeature.id = layerId;
    
    console.log('Handling selection for layer:', {
      layerId: layerId,
      layerName: layer.name,
      currentSelection: selectedFeatures.map(f => ({
        id: f.id,
        address: f.properties?.copiedFrom?.site__address
      }))
    });
    
    // Check if already selected - using the specific ID we added for better matching
    const isSelected = selectedFeatures.some(feature => feature.id === layerId);
    
    if (isSelected) {
      console.log('Removing feature from selection:', layerId);
      // Remove from selection
      onSelect(selectedFeatures.filter(feature => feature.id !== layerId));
    } else {
      console.log('Adding feature to selection:', layerId);
      // Add to selection
      onSelect([...selectedFeatures, transformedFeature]);
    }
  };

  // Check if a layer is currently selected
  const isLayerSelected = (layer) => {
    return selectedFeatures.some(feature => feature.id === layer.id);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow h-full">
      <h3 className="text-lg font-semibold mb-2 flex items-center">
        <Building2 className="w-5 h-5 mr-2 text-blue-600" />
        Select Site(s)
      </h3>
      
      <div className="max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-4 text-gray-500">
            Loading site boundaries...
          </div>
        ) : availableLayers.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            No site boundary layers found
          </div>
        ) : (
          <div className="space-y-1">
            {availableLayers.map((layer) => (
              <div
                key={layer.id}
                onClick={() => handleLayerSelect(layer)}
                className={`
                  flex items-center px-3 py-2 rounded-md cursor-pointer border
                  ${isLayerSelected(layer) 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'}
                `}
              >
                <input
                  type="checkbox"
                  checked={isLayerSelected(layer)}
                  onChange={() => {}}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <div className="ml-3 flex-1">
                  {layer.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyListSelector;