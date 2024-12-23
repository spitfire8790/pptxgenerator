import React, { useEffect } from 'react';
import { giraffeState, rpc } from '@gi-nx/iframe-sdk';

const MapView = ({ onFeatureSelect, planningLayer }) => {
  useEffect(() => {
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
        opacity: 0.7
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
    };
  }, [onFeatureSelect, planningLayer]);

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
    </div>
  );
};

export default MapView;
