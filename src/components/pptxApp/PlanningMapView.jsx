import React, { useEffect, useRef } from 'react';
import { LAYER_CONFIGS, SCREENSHOT_TYPES } from './utils/mapScreenshot';

const PlanningMapView = ({ feature, onScreenshotCapture }) => {
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!feature || hasRunRef.current) return;
    hasRunRef.current = true;

    const captureScreenshots = async () => {
      const screenshots = {};
      
      try {
        // Calculate bounds
        const coordinates = feature.geometry.coordinates[0];
        const bounds = coordinates.reduce((acc, coord) => ({
          minX: Math.min(acc.minX, coord[0]),
          minY: Math.min(acc.minY, coord[1]),
          maxX: Math.max(acc.maxX, coord[0]),
          maxY: Math.max(acc.maxY, coord[1])
        }), {
          minX: Infinity,
          minY: Infinity,
          maxX: -Infinity,
          maxY: -Infinity
        });

        // Add padding
        const width = Math.abs(bounds.maxX - bounds.minX);
        const height = Math.abs(bounds.maxY - bounds.minY);
        const padding = Math.max(width, height) * 0.25;

        // Use the planning layer configs from mapScreenshot.js
        const planningTypes = [SCREENSHOT_TYPES.ZONING, SCREENSHOT_TYPES.FSR, SCREENSHOT_TYPES.HOB];

        for (const type of planningTypes) {
          const config = LAYER_CONFIGS[type];
          const params = new URLSearchParams({
            f: 'image',
            format: 'png32',
            transparent: 'true',
            size: `${config.width},${config.height}`,
            bboxSR: 4326,
            imageSR: 4326,
            bbox: `${bounds.minX - padding},${bounds.minY - padding},${bounds.maxX + padding},${bounds.maxY + padding}`,
            layers: `show:${config.layerId}`,
            dpi: 100
          });

          const exportUrl = `${config.url}/export?${params.toString()}`;
          console.log(`Requesting ${type} map:`, exportUrl);

          const response = await fetch(exportUrl);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const blob = await response.blob();
          const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });

          screenshots[`${type}Screenshot`] = base64;
        }

        onScreenshotCapture(screenshots);
      } catch (error) {
        console.error('Error capturing screenshots:', error);
      }
    };

    captureScreenshots();
  }, [feature]);

  return null;
};

export default PlanningMapView;

