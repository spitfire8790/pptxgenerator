import React, { useState, useEffect } from 'react';
import { giraffeState } from '@gi-nx/iframe-sdk';
import { logAvailableLayers } from './utils/map/utils/layerDetails';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, AreaChart, Check, Eye, Ruler } from 'lucide-react';

const DevelopableAreaSelector = ({ onLayerSelect, selectedFeature, showDevelopableArea, setShowDevelopableArea, useDevelopableAreaForBounds, setUseDevelopableAreaForBounds }) => {
  const [drawingLayers, setDrawingLayers] = useState([]);
  const [selectedLayers, setSelectedLayers] = useState([]);

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

  // Reset selected layers when feature changes
  useEffect(() => {
    setSelectedLayers([]);
  }, [selectedFeature]);
  
  // Note: This component supports selection of multiple developable areas
  // When multiple areas are selected, they are combined into a single FeatureCollection
  // with multiple features, which is then used throughout the application

  const handleLayerSelect = async (layerId) => {
    try {
      // Toggle selection: if already selected, remove it; otherwise, add it
      const isSelected = selectedLayers.includes(layerId);
      const newSelectedLayers = isSelected
        ? selectedLayers.filter(id => id !== layerId)
        : [...selectedLayers, layerId];
      
      setSelectedLayers(newSelectedLayers);
      
      if (onLayerSelect) {
        // Create a FeatureCollection with all selected features
        const selectedFeatures = newSelectedLayers.map(id => {
          const layer = drawingLayers.find(layer => layer.id === id);
          return {
            type: 'Feature',
            geometry: layer.geometry,
            properties: layer.properties
          };
        });
        
        onLayerSelect({
          type: 'FeatureCollection',
          features: selectedFeatures
        });
      }
    } catch (error) {
      console.error('Error selecting layer:', error);
    }
  };

  return (
    <div className="mb-4">
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-start md:gap-6">
          {/* Left section: Layer Selection */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-blue-600" />
              Select Developable Area Layer
            </h3>
            {drawingLayers.length === 0 ? (
              <p className="text-gray-500">No layers available. Create one using Giraffe's drawing tools.</p>
            ) : (
              <div className="space-y-2">
                {drawingLayers.map((layer) => (
                  <label 
                    key={layer.id}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <input
                      type="checkbox"
                      name="developableArea"
                      checked={selectedLayers.includes(layer.id)}
                      onChange={() => handleLayerSelect(layer.id)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
                    />
                    <span className="flex items-center">
                      <AreaChart className="w-4 h-4 mr-2 text-blue-500" />
                      {layer.layerId}
                    </span>
                    {selectedLayers.includes(layer.id) && (
                      <Check className="w-4 h-4 text-green-500 ml-auto" />
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Right section: Options that appear when at least one area is selected */}
          <AnimatePresence>
            {selectedLayers.length > 0 && (
              <motion.div 
                className="md:flex-1 mt-4 md:mt-0 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h4 className="font-medium text-gray-700 mb-3">Developable Area Options</h4>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg shadow-sm transition-colors">
                    <Eye className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div className="flex-1">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showDevelopableArea}
                          onChange={(e) => setShowDevelopableArea(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mr-3"
                        />
                        <span className="text-sm text-gray-800">Show Blue Dash Developable Area Boundary in Screenshots?</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg shadow-sm transition-colors">
                    <Ruler className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div className="flex-1">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useDevelopableAreaForBounds}
                          onChange={(e) => setUseDevelopableAreaForBounds(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mr-3"
                        />
                        <span className="text-sm text-gray-800">Use Developable Area as Basis for Screenshot Bounds?</span>
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default DevelopableAreaSelector;
