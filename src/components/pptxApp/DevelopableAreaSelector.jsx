import React, { useState, useEffect } from 'react';
import { giraffeState } from '@gi-nx/iframe-sdk';
import { logAvailableLayers } from './utils/map/utils/layerDetails';

const DevelopableAreaSelector = ({ onLayerSelect, selectedFeature }) => {
  const [drawingLayers, setDrawingLayers] = useState([]);
  const [selectedLayer, setSelectedLayer] = useState(null);

  const fetchLayers = async () => {
    try {
      await logAvailableLayers();
      
      const rawSections = giraffeState.get('rawSections');
      
      if (!rawSections?.features) {
        console.log('No valid rawSections data available');
        setDrawingLayers([]); // Reset to empty array when no data
        return;
      }
      
      const availableLayers = rawSections.features
        .filter(feature => {
          if (!feature.properties?.layerId) {
            console.log('Filtered out feature:', feature);
            return false;
          }
          return true;
        })
        .map(feature => ({
          id: feature.properties.id,
          layerId: feature.properties.layerId,
          geometry: feature.geometry,
          properties: feature.properties
        }));
      
      console.log('Available Layers:', availableLayers);
      setDrawingLayers(availableLayers);
      
    } catch (error) {
      console.error('Error in fetchLayers:', error);
      setDrawingLayers([]); // Reset to empty array on error
    }
  };

  // Set up listener for rawSections changes
  useEffect(() => {
    console.log('Setting up rawSections listener');
    
    // Initial fetch
    fetchLayers();

    // Set up listener for rawSections changes
    const unsubscribe = giraffeState.addListener(['rawSections'], () => {
      console.log('rawSections changed, fetching layers');
      fetchLayers();
    });

    return () => {
      console.log('Cleaning up DevelopableAreaSelector');
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []); // Empty dependency array - only run once on mount

  // Reset selected layer when feature changes
  useEffect(() => {
    setSelectedLayer(null);
  }, [selectedFeature]);

  const handleLayerSelect = async (layerId) => {
    try {
      setSelectedLayer(layerId);
      
      if (onLayerSelect) {
        const selectedFeature = drawingLayers.find(layer => layer.id === layerId);
        if (selectedFeature) {
          onLayerSelect({
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: selectedFeature.geometry,
              properties: selectedFeature.properties
            }]
          });
        }
      }
    } catch (error) {
      console.error('Error selecting layer:', error);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow mb-4">
      <h3 className="text-lg font-semibold mb-2">Select Developable Area Layer</h3>
      {drawingLayers.length === 0 ? (
        <p className="text-gray-500">No layers available. Create one using Giraffe's drawing tools.</p>
      ) : (
        <div className="space-y-2">
          {drawingLayers.map((layer) => (
            <label 
              key={layer.id}
              className="flex items-center space-x-2"
            >
              <input
                type="radio"
                name="developableArea"
                checked={selectedLayer === layer.id}
                onChange={() => handleLayerSelect(layer.id)}
                className="w-4 h-4 text-blue-600"
              />
              <span>{layer.layerId}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default DevelopableAreaSelector; 