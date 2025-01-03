import React, { useCallback, useEffect } from 'react';
import { SCREENSHOT_TYPES } from './utils/map/config/screenshotTypes';
import { captureMapScreenshot } from './utils/map/services/screenshot';

const PlanningMapView = ({ feature, onScreenshotCapture, developableArea }, ref) => {
  const captureScreenshots = useCallback(async () => {
    if (!feature) return;
    
    try {
      const screenshots = {};
      const planningTypes = [SCREENSHOT_TYPES.ZONING, SCREENSHOT_TYPES.FSR, SCREENSHOT_TYPES.HOB];

      for (const type of planningTypes) {
        const screenshot = await captureMapScreenshot(feature, type, true, developableArea);
        if (screenshot) {
          screenshots[`${type}Screenshot`] = screenshot;
        }
      }

      onScreenshotCapture(screenshots);
    } catch (error) {
      console.error('Error capturing screenshots:', error);
    }
  }, [feature, developableArea, onScreenshotCapture]);

  // Add effect to trigger screenshot capture when feature or developableArea changes
  useEffect(() => {
    captureScreenshots();
  }, [feature, developableArea, captureScreenshots]);

  // Expose the capture function to parent
  React.useImperativeHandle(ref, () => ({
    captureScreenshots
  }));

  return null;
};

export default React.forwardRef(PlanningMapView);

