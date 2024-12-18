import React, { useState, useEffect } from 'react';
import { giraffeState, rpc } from '@gi-nx/iframe-sdk';

const LayerDrawing = ({ selectedFeature }) => {
  const [availableLayers, setAvailableLayers] = useState([]);
  const [selectedSourceLayer, setSelectedSourceLayer] = useState('');

  useEffect(() => {
    const fetchLayers = () => {
      try {
        const projectLayers = giraffeState.get('projectLayers');
        if (projectLayers) {
          const shortlistLayers = projectLayers
            .filter(layer => layer.layer_full?.layer_type === 1)
            .map(layer => ({
              id: layer.id,
              name: layer.layer_full?.name?.replace('/', '')
            }));
          setAvailableLayers(shortlistLayers);
        }
      } catch (error) {
        console.error('Error fetching project layers:', error);
      }
    };

    fetchLayers();
    const unsubscribe = giraffeState.addListener(['projectLayers'], fetchLayers);

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const copyLayerData = async () => {
    if (!selectedSourceLayer) return;

    try {
      console.log('Selected layer:', selectedSourceLayer);
      
      // Get layer contents
      const layerContents = await rpc.invoke('getLayerContents', [selectedSourceLayer]);
      
      // Create a minimal FeatureCollection
      const fc = {
        type: 'FeatureCollection',
        features: layerContents.features.map(feature => {
          const { geometry, properties } = feature;
          return {
            type: 'Feature',
            geometry: {
              type: geometry.type,
              coordinates: geometry.coordinates
            },
            properties: {
              id: properties.site_id,
              address: properties.site_address
            }
          };
        })
      };
      
      const newLayerName = `${selectedSourceLayer}_copy`;

      // Create temp layer with minimal data
      await rpc.invoke('addTempLayerGeoJSON', [
        newLayerName,
        fc,
        {
          type: 'fill',
          paint: {
            'fill-color': '#088',
            'fill-opacity': 0.8
          }
        }
      ]);
      
    } catch (error) {
      console.error('Failed to copy layer data:', error);
    }
  };

  return (
    <div className="flex-shrink-0 overflow-auto max-w-[calc(100vw-192px)]">
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Layer Drawing</h2>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Select Source Layer</h3>
          <div className="space-y-2">
            <select
              value={selectedSourceLayer}
              onChange={(e) => setSelectedSourceLayer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a layer</option>
              {availableLayers.map(layer => (
                <option key={layer.id} value={layer.name}>{layer.name}</option>
              ))}
            </select>
            <button
              onClick={copyLayerData}
              disabled={!selectedSourceLayer}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              Copy Layer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LayerDrawing; 