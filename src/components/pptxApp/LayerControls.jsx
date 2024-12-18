import React, { useEffect, useState } from 'react';
import { giraffeState } from "@gi-nx/iframe-sdk";

const LayerControls = () => {
  const [layers, setLayers] = useState([
    {
      id: 'metromap',
      name: 'Metromap',
      opacity: 1,
      order: 1
    },
    {
      id: 'labels',
      name: 'Labels',
      opacity: 1,
      order: 2
    },
    {
      id: 'site-boundary',
      name: 'Site Boundary',
      opacity: 1,
      order: 3
    }
  ]);

  // Handle layer opacity change
  const handleOpacityChange = (layerId, opacity) => {
    // Update local state
    setLayers(layers.map(layer => 
      layer.id === layerId ? { ...layer, opacity } : layer
    ));

    // Update layer in parent window
    giraffeState.set(`mapContent.layers.${layerId}.paint.opacity`, opacity);
  };

  return (
    <div className="layer-controls">
      <h2 className="text-lg font-semibold mb-4">Layer Controls</h2>
      <div className="space-y-4">
        {layers.map(layer => (
          <div
            key={layer.id}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{layer.name}</span>
              <span className="text-sm text-gray-500">
                {Math.round(layer.opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={layer.opacity}
              onChange={(e) => handleOpacityChange(layer.id, parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default LayerControls;
