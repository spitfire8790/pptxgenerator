import React, { useEffect } from 'react';
import { giraffeState, rpc } from '@gi-nx/iframe-sdk';

const MapView = ({ onFeatureSelect }) => {
  useEffect(() => {
    // Set the iframe width through Giraffe SDK
    giraffeState.set('iframeWidth', 1024);

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
  }, [onFeatureSelect]);

  // Helper function to format zoning string
  const formatZoning = (zoning) => {
    if (!zoning) return '';
    const match = zoning.match(/\[(.*?):(.*?):(.*?):(.*?):%\]/);
    if (match) {
      const [_, zone, area, unit, percentage] = match;
      return `${zone} - ${percentage}% (${area} ${unit})`;
    }
    return zoning;
  };

  return (
    <div className="w-full h-full">
      {/* The Giraffe iframe will be rendered here */}
    </div>
  );
};

export default MapView;
