import React, { useState, useEffect } from 'react';
import { giraffeState } from '@gi-nx/iframe-sdk';

const DevelopableAreaSelector = ({ onLayerSelect, selectedFeature }) => {
  const [drawingLayers, setDrawingLayers] = useState([]);
  const [selectedLayer, setSelectedLayer] = useState(null);

  useEffect(() => {
    console.log('DevelopableAreaSelector mounted');

    const fetchLayers = () => {
      try {
        console.log('Fetching layers...');
        const rawSections = giraffeState.get('rawSections');
        
        console.log('Raw Sections Data:', rawSections);
        
        if (!rawSections) {
          console.log('No rawSections data available');
          return;
        }
        
        if (!rawSections.features) {
          console.log('No features array in rawSections');
          return;
        }
        
        console.log('All Features:', rawSections.features);
        
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
        
        console.log('Filtered Layers:', availableLayers);
        
        setDrawingLayers(availableLayers);
        
      } catch (error) {
        console.error('Error in fetchLayers:', error);
      }
    };

    fetchLayers();
    
    console.log('Setting up giraffeState listener');
    const unsubscribe = giraffeState.addListener(['rawSections'], (key, value) => {
      console.log('rawSections changed:', { key, value });
      if (value?.features?.length > 0) {
        console.log('Calling fetchLayers due to rawSections update');
        fetchLayers();
      } else {
        console.log('Skipping fetchLayers - no features in update');
      }
    });
    
    return () => {
      console.log('DevelopableAreaSelector unmounting');
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [selectedFeature]);

  // Reset selected layer when feature changes
  useEffect(() => {
    setSelectedLayer(null);
  }, [selectedFeature]);

  // Log when drawingLayers state changes
  useEffect(() => {
    console.log('drawingLayers updated:', drawingLayers);
  }, [drawingLayers]);

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

  // Don't render anything if we don't have layers
  if (drawingLayers.length === 0) {
    return (
      <div className="p-4 bg-white rounded-lg shadow mb-4">
        <h3 className="text-lg font-semibold mb-2">Select Developable Area Layer</h3>
        <p className="text-gray-500">No layers available. Create one using Giraffe's drawing tools.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow mb-4">
      <h3 className="text-lg font-semibold mb-2">Select Developable Area Layer</h3>
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
    </div>
  );
};

export default DevelopableAreaSelector; 