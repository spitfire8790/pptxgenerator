import React, { useEffect, useState, useRef } from 'react';
import { giraffeState, rpc } from '@gi-nx/iframe-sdk';

const PLANNING_LAYERS = {
  ZONING: {
    url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Principal_Planning/MapServer/17',
    type: 'arcgis'
  },
  FSR: {
    url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Principal_Planning/MapServer/9',
    type: 'arcgis'
  },
  HOB: {
    url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Principal_Planning/MapServer/12',
    type: 'arcgis'
  }
};

const PlanningMapView = ({ feature, onScreenshotCapture }) => {
  const [isReady, setIsReady] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    const initializeMap = async () => {
      try {
        await giraffeState.set('iframeWidth', 1024);
        await giraffeState.set('iframeHeight', 768);
        setIsReady(true);
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener('load', () => {
        console.log('Planning iframe loaded');
        setTimeout(initializeMap, 2000);
      });
      return () => iframe.removeEventListener('load', initializeMap);
    }
  }, []);

  useEffect(() => {
    if (!feature || !isReady) return;

    const captureScreenshots = async () => {
      try {
        console.log('Starting planning screenshots capture');
        const screenshots = {};

        for (const [layerName, layerConfig] of Object.entries(PLANNING_LAYERS)) {
          try {
            console.log(`Capturing ${layerName} screenshot...`);
            
            // Clear existing layers
            await rpc.removeAllLayers();
            console.log('Cleared existing layers');

            // Add base imagery with 50% opacity
            await rpc.addLayer({
              type: 'wms',
              url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service',
              layers: 'Australia_latest',
              opacity: 0.5
            });
            console.log('Added base imagery');

            // Add planning layer with 70% opacity
            await rpc.addLayer({
              type: layerConfig.type,
              url: layerConfig.url,
              opacity: 0.7
            });
            console.log(`Added ${layerName} layer`);

            // Add property boundary
            await rpc.addLayer({
              type: 'geojson',
              data: feature,
              style: {
                color: '#FF0000',
                weight: 2,
                fillOpacity: 0
              }
            });
            console.log('Added property boundary');

            // Set view to feature bounds with padding
            const bounds = getBounds(feature.geometry.coordinates[0]);
            const padding = 0.0002;
            await rpc.setView({
              bounds: [
                [bounds.minY - padding, bounds.minX - padding],
                [bounds.maxY + padding, bounds.maxX + padding]
              ]
            });
            console.log('Set map view');

            // Wait for layers to load and render
            console.log('Waiting for layers to render...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Capture screenshot
            console.log('Capturing screenshot...');
            const screenshot = await rpc.screenshot({
              width: 800,
              height: 600,
              format: 'png'
            });
            console.log(`${layerName} screenshot captured`);

            screenshots[layerName.toLowerCase()] = screenshot;

            // Wait before next screenshot
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`Error capturing ${layerName} screenshot:`, error);
          }
        }

        console.log('All planning screenshots captured:', Object.keys(screenshots));
        onScreenshotCapture(screenshots);
      } catch (error) {
        console.error('Error capturing planning screenshots:', error);
      }
    };

    captureScreenshots();
  }, [feature, isReady, onScreenshotCapture]);

  const getBounds = (coordinates) => {
    return coordinates.reduce((acc, coord) => ({
      minX: Math.min(acc.minX, coord[0]),
      minY: Math.min(acc.minY, coord[1]),
      maxX: Math.max(acc.maxX, coord[0]),
      maxY: Math.max(acc.maxY, coord[1])
    }), {
      minX: coordinates[0][0],
      minY: coordinates[0][1],
      maxX: coordinates[0][0],
      maxY: coordinates[0][1]
    });
  };

  return (
    <div style={{ width: '1024px', height: '768px', position: 'absolute', left: '-9999px' }}>
      <iframe
        ref={iframeRef}
        id="planning-iframe"
        title="Planning Map"
        style={{ width: '100%', height: '100%', border: 'none' }}
        src="https://giraffe.nsw.gov.au/iframe"
      />
    </div>
  );
};

export default PlanningMapView;
