import React, { useEffect, useRef } from 'react';
import { SCREENSHOT_TYPES, captureMapScreenshot } from './utils/mapScreenshot';

const PlanningMapView = ({ feature, onScreenshotCapture }) => {
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!feature || hasRunRef.current) return;
    hasRunRef.current = true;

    const captureScreenshots = async () => {
      try {
        const screenshots = {};
        const planningTypes = [SCREENSHOT_TYPES.ZONING, SCREENSHOT_TYPES.FSR, SCREENSHOT_TYPES.HOB];

        for (const type of planningTypes) {
          const screenshot = await captureMapScreenshot(feature, type);
          if (screenshot) {
            screenshots[`${type}Screenshot`] = screenshot;
          }
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

