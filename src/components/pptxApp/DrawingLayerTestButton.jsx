import React, { useState, useEffect } from 'react';

const DrawingLayerTestButton = () => {
  const [status, setStatus] = useState('Ready');
  const [geometry, setGeometry] = useState('Polygon');
  const [layerId, setLayerId] = useState('');

  // Test the drawing layer functionality
  const handleTestDrawingLayer = async () => {
    try {
      setStatus('Starting drawing test...');
      
      // 1. Create an empty GeoJSON feature collection
      const emptyFeatureCollection = {
        type: 'FeatureCollection',
        features: []
      };
      
      // 2. Add a temporary GeoJSON layer
      const layerName = `drawing-test-${Date.now()}`;
      
      // Use the addTempLayerGeoJSON function from the SDK
      const id = await window.rpc.addTempLayerGeoJSON(
        layerName,
        emptyFeatureCollection,
        {
          // Basic style depending on geometry type
          type: geometry.toLowerCase(),
          paint: geometry === 'Polygon' 
            ? { 'fill-color': '#0080ff', 'fill-opacity': 0.5 }
            : geometry === 'LineString'
              ? { 'line-color': '#0080ff', 'line-width': 3 }
              : { 'circle-color': '#0080ff', 'circle-radius': 6 }
        }
      );
      
      setLayerId(id);
      setStatus(`Created temporary layer: ${layerName}`);
      
      // 3. Activate the drawing layer
      window.rpc.activateDrawingLayer(layerName);
      setStatus(`Activated drawing on layer: ${layerName}`);
      
      // 4. Set the draw tool based on selected geometry
      window.rpc.setDrawTool(geometry.toLowerCase());
      setStatus(`Drawing tool set to: ${geometry}. Please draw on the map.`);
      
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      console.error('Drawing layer test failed:', error);
    }
  };

  // Get the drawn polygon when requested
  const handleGetDrawnPolygon = async () => {
    try {
      setStatus('Getting user-drawn polygon...');
      const polygon = await window.rpc.getUserDrawnPolygon();
      
      if (polygon) {
        setStatus(`Successfully captured polygon with ${polygon.coordinates[0].length} points`);
        console.log('User drawn polygon:', polygon);
      } else {
        setStatus('No polygon drawn yet');
      }
    } catch (error) {
      setStatus(`Error getting polygon: ${error.message}`);
      console.error('Failed to get drawn polygon:', error);
    }
  };

  return (
    <div className="drawing-layer-test-container" style={{ padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
      <h3>Drawing Layer Test</h3>
      <div>
        <label>
          Geometry Type:
          <select 
            value={geometry} 
            onChange={(e) => setGeometry(e.target.value)}
            style={{ margin: '0 10px' }}
          >
            <option value="Polygon">Polygon</option>
            <option value="LineString">Line</option>
            <option value="Point">Point</option>
          </select>
        </label>
        <button 
          onClick={handleTestDrawingLayer}
          style={{ marginRight: '10px', padding: '5px 10px' }}
        >
          Start Drawing Test
        </button>
        <button 
          onClick={handleGetDrawnPolygon}
          style={{ padding: '5px 10px' }}
          disabled={!layerId}
        >
          Get Drawn Polygon
        </button>
      </div>
      <div style={{ marginTop: '10px', padding: '5px', background: '#e0e0e0', borderRadius: '3px' }}>
        Status: {status}
      </div>
      {layerId && (
        <div style={{ marginTop: '5px', fontSize: '12px' }}>
          Layer ID: {layerId}
        </div>
      )}
    </div>
  );
};

export default DrawingLayerTestButton; 