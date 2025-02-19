import React, { useCallback, useEffect } from 'react';
import { SCREENSHOT_TYPES } from './utils/map/config/screenshotTypes';
import { captureMapScreenshot } from './utils/map/services/screenshot';

const PlanningMapView = ({ feature, onScreenshotCapture, developableArea, showDevelopableArea }, ref) => {
  const captureScreenshots = useCallback(async () => {
    if (!feature) return;
    
    try {
      const screenshots = {};
      const planningTypes = [SCREENSHOT_TYPES.ZONING, SCREENSHOT_TYPES.FSR, SCREENSHOT_TYPES.HOB];

      for (const type of planningTypes) {
        const screenshot = await captureMapScreenshot(feature, type, true, developableArea, showDevelopableArea);
        if (screenshot) {
          screenshots[`${type}Screenshot`] = screenshot;
        }
      }

      onScreenshotCapture(screenshots);
    } catch (error) {
      console.error('Error capturing screenshots:', error);
    }
  }, [feature, developableArea, showDevelopableArea, onScreenshotCapture]);

  useEffect(() => {
    captureScreenshots();
  }, [feature, developableArea, showDevelopableArea, captureScreenshots]);

  React.useImperativeHandle(ref, () => ({
    captureScreenshots
  }));

  return null;
};

export default React.forwardRef(PlanningMapView);

