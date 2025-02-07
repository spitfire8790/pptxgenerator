import React, { useState, useEffect } from 'react';
import { giraffeState } from '@gi-nx/iframe-sdk';
import { logAvailableLayers } from './utils/map/utils/layerDetails';

const PropertySelector = ({ onPropertySelect }) => {
  const [propertyLayers, setPropertyLayers] = useState([]);
  const [selectedProperties, setSelectedProperties] = useState(new Set());

  const fetchLayers = async () => {
    try {
      await logAvailableLayers();
      
      const rawSections = giraffeState.get('rawSections');
      
      if (!rawSections?.features) {
        console.log('No valid rawSections data available');
        setPropertyLayers([]); // Reset to empty array when no data
        return;
      }
      
      const availableLayers = rawSections.features
        .filter(feature => {
          // Only include features from the Site Boundary layer
          if (!feature.properties?.layerId || !feature.properties.layerId.includes('Site Boundary')) {
            console.log('Filtered out feature:', feature);
            return false;
          }
          return true;
        })
        .map(feature => ({
          id: feature.properties.id,
          layerId: feature.properties.layerId,
          geometry: feature.geometry,
          properties: feature.properties,
          address: feature.properties.copiedFrom?.site__address || 'Unknown Address'
        }));
      
      console.log('Available Property Layers:', availableLayers);
      setPropertyLayers(availableLayers);
      
    } catch (error) {
      console.error('Error in fetchLayers:', error);
      setPropertyLayers([]); // Reset to empty array on error
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
      console.log('Cleaning up PropertySelector');
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []); // Empty dependency array - only run once on mount

  const handlePropertySelect = async (propertyId) => {
    try {
      const newSelectedProperties = new Set(selectedProperties);
      if (newSelectedProperties.has(propertyId)) {
        newSelectedProperties.delete(propertyId);
      } else {
        newSelectedProperties.add(propertyId);
      }
      setSelectedProperties(newSelectedProperties);
      
      if (onPropertySelect) {
        const selectedFeatures = propertyLayers
          .filter(layer => newSelectedProperties.has(layer.id))
          .map(layer => ({
            type: 'Feature',
            geometry: layer.geometry,
            properties: layer.properties
          }));

        onPropertySelect({
          type: 'FeatureCollection',
          features: selectedFeatures
        });
      }
    } catch (error) {
      console.error('Error selecting property:', error);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow mb-4">
      <h3 className="text-lg font-semibold mb-2">Select Properties</h3>
      {propertyLayers.length === 0 ? (
        <p className="text-gray-500">No properties available. Create one using Land iQ Site Search and the Site Boundary drawing layer.</p>
      ) : (
        <div className="space-y-2">
          {propertyLayers.map((layer) => (
            <label 
              key={layer.id}
              className="flex items-center space-x-2"
            >
              <input
                type="checkbox"
                name="property"
                checked={selectedProperties.has(layer.id)}
                onChange={() => handlePropertySelect(layer.id)}
                className="w-4 h-4 text-blue-600"
              />
              <span>{layer.address}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default PropertySelector; 