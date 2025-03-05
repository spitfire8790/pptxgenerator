import React, { useCallback, useEffect } from 'react';
import { SCREENSHOT_TYPES } from './utils/map/config/screenshotTypes';
import { captureMapScreenshot } from './utils/map/services/screenshot';

const PlanningMapView = ({ feature, onScreenshotCapture, developableArea, showDevelopableArea }, ref) => {
  const captureScreenshots = useCallback(async () => {
    if (!feature) return;
    
    try {
      console.log('Capturing planning screenshots on explicit request');
      const screenshots = {};
      const planningTypes = [SCREENSHOT_TYPES.ZONING, SCREENSHOT_TYPES.FSR, SCREENSHOT_TYPES.HOB];

      for (const type of planningTypes) {
        const screenshot = await captureMapScreenshot(
          feature, 
          type, 
          true, 
          developableArea, 
          showDevelopableArea, 
          true, // useDevelopableAreaForBounds
          true, // showLabels
          true  // showDevelopableAreaLabels - show labels for planning maps
        );
        if (screenshot) {
          screenshots[`${type}Screenshot`] = screenshot;
        }
      }

      onScreenshotCapture(screenshots);
    } catch (error) {
      console.error('Error capturing screenshots:', error);
    }
  }, [feature, developableArea, showDevelopableArea, onScreenshotCapture]);

  // Remove the automatic useEffect trigger
  // useEffect(() => {
  //   captureScreenshots();
  // }, [feature, developableArea, showDevelopableArea, captureScreenshots]);

  // Only expose the captureScreenshots method via ref
  React.useImperativeHandle(ref, () => ({
    captureScreenshots
  }));

  return null;
};

export default React.forwardRef(PlanningMapView);
