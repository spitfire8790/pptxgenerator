import React, { useEffect } from 'react';
import { giraffeState, rpc } from '@gi-nx/iframe-sdk';
import { logAvailableLayers } from './utils/map/utils/layerDetails';

const MapView = ({ onFeatureSelect, planningLayer, selectedFeatures = [], isMultiSelectMode = false }) => {
  // Empty function to satisfy the reference in the cleanup
  const clearSelectedFeaturesHighlight = () => {
    // No-op function - highlighting not needed
  };

  useEffect(() => {
    // Log all available layers when component mounts
    logAvailableLayers().then(layers => {
      console.log('All available layers:', layers);
    }).catch(error => {
      console.error('Error logging layers:', error);
    });

    // Set the iframe width through Giraffe SDK
    giraffeState.set('iframeWidth', 1024);

    // If planning layer is specified, add base imagery and planning layer
    if (planningLayer) {
      // Add base imagery with 50% opacity
      rpc.addLayer({
        type: 'wms',
        url: '/metromap/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service',
        layers: 'Australia_latest',
        opacity: 0.5
      });

      // Add planning layer with 70% opacity
      rpc.addLayer({
        type: 'arcgis',
        url: planningLayer,
        opacity: 0.6
      });
    }

    // Listen for selected feature
    const unsubscribe = giraffeState.addListener(['selected'], (key, event) => {
      const featureCollection = giraffeState.get('selected');
      if (featureCollection?.features?.[0]) {
        const feature = featureCollection.features[0];
        
        // Transform feature while preserving original copiedFrom data
        const transformedFeature = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: feature.geometry.coordinates
          },
          properties: {
            street_number: feature.properties?.copiedFrom?.site__address?.split(' ')[0],
            street_name: feature.properties?.copiedFrom?.site__address?.split(' ')[1],
            suburb: feature.properties?.copiedFrom?.site_suitability__suburb,
            postcode: feature.properties?.copiedFrom?.site__address?.split(' ').pop(),
            lot: feature.properties?.copiedFrom?.site__related_lot_references?.split('/')[0],
            section: feature.properties?.copiedFrom?.site__related_lot_references?.split('/')[1],
            dp_pn: feature.properties?.copiedFrom?.site__related_lot_references?.split('/')[2],
            area: feature.properties?.copiedFrom?.site_suitability__area,
            zone: formatZoning(feature.properties?.copiedFrom?.site_suitability__landzone),
            fsr: feature.properties?.copiedFrom?.site_suitability__floorspace_ratio,
            max_building_height: feature.properties?.copiedFrom?.site_suitability__height_of_building,
            copiedFrom: feature.properties?.copiedFrom
          }
        };

        if (onFeatureSelect) {
          onFeatureSelect(transformedFeature);
        }
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
      // When component unmounts, clear any custom layers
      clearSelectedFeaturesHighlight();
    };
  }, [onFeatureSelect, planningLayer]);

  // Update selected features visual indicators whenever selectedFeatures changes
  useEffect(() => {
    // Only zoom to features when they change
    if (selectedFeatures && selectedFeatures.length > 0) {
      // Zoom to selected features bounds if features were selected programmatically
      // (e.g., from the property list rather than clicked on the map)
      zoomToSelectedFeatures(selectedFeatures);
      
      // Display the selected features on the map
      displaySelectedFeaturesOnMap(selectedFeatures);
    }
  }, [selectedFeatures]);

  // Helper function to display selected features on the map
  const displaySelectedFeaturesOnMap = (features) => {
    if (!features || features.length === 0) return;
    
    try {
      // Create a GeoJSON feature collection from the selected features
      const featureCollection = {
        type: 'FeatureCollection',
        features: features.map(feature => ({
          type: 'Feature',
          geometry: feature.geometry,
          properties: {
            id: feature.properties?.copiedFrom?.id || feature.properties?.id || feature.properties?.copiedFrom?.OBJECTID,
            address: feature.properties?.copiedFrom?.site__address || 'Unnamed Property'
          }
        }))
      };
      
      // Set the selected features in the Giraffe state so the map can access them
      giraffeState.set('programmaticSelectedFeatures', featureCollection);
      
      console.log('Set selected features on map:', featureCollection);
    } catch (error) {
      console.error('Error displaying selected features on map:', error);
    }
  };

  // Helper function to zoom to the bounds of all selected features
  const zoomToSelectedFeatures = (features) => {
    if (!features || features.length === 0) return;
    
    try {
      // Create a collection of all coordinates from all features
      const allCoordinates = [];
      
      features.forEach(feature => {
        if (feature.geometry?.coordinates) {
          // Handle different geometry types
          if (feature.geometry.type === 'Polygon') {
            // For polygons, add all exterior ring coordinates
            allCoordinates.push(...feature.geometry.coordinates[0]);
          } else if (feature.geometry.type === 'MultiPolygon') {
            // For multipolygons, add coordinates from all polygons
            feature.geometry.coordinates.forEach(polygon => {
              allCoordinates.push(...polygon[0]);
            });
          } else if (feature.geometry.type === 'Point') {
            // For points, add the point coordinates
            allCoordinates.push(feature.geometry.coordinates);
          }
        }
      });
      
      if (allCoordinates.length === 0) return;
      
      // Find bounds
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      allCoordinates.forEach(coord => {
        minX = Math.min(minX, coord[0]);
        minY = Math.min(minY, coord[1]);
        maxX = Math.max(maxX, coord[0]);
        maxY = Math.max(maxY, coord[1]);
      });
      
      // Add some padding to the bounds
      const paddingRatio = 0.3; // 30% padding
      const deltaX = (maxX - minX) * paddingRatio;
      const deltaY = (maxY - minY) * paddingRatio;
      
      // Apply the padded bounds
      const bounds = [
        [minX - deltaX, minY - deltaY], // SW
        [maxX + deltaX, maxY + deltaY]  // NE
      ];
      
      // Fly to bounds using the appropriate RPC call
      rpc.invoke('fitBounds', [bounds, { animate: true, padding: 50 }]);
      
    } catch (error) {
      console.error('Error zooming to features:', error);
    }
  };

  // Helper function to format zoning string
  const formatZoning = (zoning) => {
    if (!zoning) return 'Not specified';
    
    // Remove square brackets
    const cleanZoning = zoning.replace(/[\[\]]/g, '');
    
    // Split by colon to separate zone and details
    const [zone, details] = cleanZoning.split(':');
    
    // Format details with proper spacing and parentheses
    const formattedDetails = details ? `: ${details.split(';').join(' (')}%)` : '';
    
    return `${zone}${formattedDetails}`;
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <iframe
        id="giraffe-iframe"
        title="Map"
        style={{ width: '100%', height: '100%', border: 'none' }}
        src="https://giraffe.nsw.gov.au/iframe"
      />
      {isMultiSelectMode && (
        <div 
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '10px 15px',
            borderRadius: '4px',
            fontSize: '14px',
            zIndex: 999
          }}
        >
          Multi-Select Mode: {selectedFeatures.length} feature{selectedFeatures.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
};

export default MapView;
