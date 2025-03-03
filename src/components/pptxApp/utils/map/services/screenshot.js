// This file serves as a central export point for all screenshot functions
// Each function is implemented in its own file in the screenshots/ directory

// Import all screenshot modules
import * as acidSulfate from './screenshots/acidSulfate';
import * as biodiversity from './screenshots/biodiversity';
import * as bushfire from './screenshots/bushfire';
import * as contamination from './screenshots/contamination';
import * as contour from './screenshots/contour';
import * as flood from './screenshots/flood';
import * as geoscape from './screenshots/geoscape';
import * as heritage from './screenshots/heritage';
import * as historicalImagery from './screenshots/historicalImagery';
import * as lmrOverlapModule from './screenshots/lmrOverlap';
import * as power from './screenshots/power';
import * as primarySiteAttributes from './screenshots/primarySiteAttributes';
import * as ptal from './screenshots/ptal';
import * as regularity from './screenshots/regularity';
import * as roads from './screenshots/roads';
import * as sewer from './screenshots/sewer';
import * as streetView from './screenshots/streetView';
import * as tec from './screenshots/tec';
import * as udpPrecinct from './screenshots/udpPrecinct';
import * as waterMains from './screenshots/waterMains';

// Re-export shared utilities
export { createCanvas, drawImage, drawBoundary, drawPolyline } from '../utils/canvas';
export { loadImage } from '../utils/image';
export { calculateMercatorParams } from '../utils/coordinates';
export { LAYER_CONFIGS } from '../config/layerConfigs';
export { SCREENSHOT_TYPES } from '../config/screenshotTypes';

// Export calculateBounds function
export function calculateBounds(feature, padding, developableArea = null, boundsSource = 'feature') {
  // Determine which coordinates to use based on boundsSource
  let coordinates;
  
  if (boundsSource === 'developableArea' && developableArea?.features?.[0]) {
    // Use only developable area coordinates
    coordinates = developableArea.features[0].geometry.coordinates[0];
  } else if (boundsSource === 'feature') {
    // Use only feature coordinates
    coordinates = feature.geometry.coordinates[0];
  } else {
    // Default: Include both feature and developableArea if available
    coordinates = feature.geometry.coordinates[0];
    
    // If we have a developable area, include its coordinates too
    if (developableArea?.features?.[0]) {
      coordinates = [
        ...coordinates,
        ...developableArea.features[0].geometry.coordinates[0]
      ];
    }
  }

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

  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const width = Math.abs(bounds.maxX - bounds.minX);
  const height = Math.abs(bounds.maxY - bounds.minY);
  const size = Math.max(width, height) * (1 + padding * 2);

  return { centerX, centerY, size };
}

export async function captureAcidSulfateMap(feature, developableArea = null, showDevelopableArea = true) {
  return acidSulfate.captureAcidSulfateMap(feature, developableArea, showDevelopableArea);
}

export async function captureBiodiversityMap(feature, developableArea = null, showDevelopableArea = true) {
  return biodiversity.captureBiodiversityMap(feature, developableArea, showDevelopableArea);
}

export async function captureBushfireMap(feature, developableArea = null, showDevelopableArea = true) {
  return bushfire.captureBushfireMap(feature, developableArea, showDevelopableArea);
}

export async function captureContaminationMap(feature, developableArea = null, showDevelopableArea = true) {
  return contamination.captureContaminationMap(feature, developableArea, showDevelopableArea);
}

export async function captureContourMap(feature, developableArea = null, showDevelopableArea = true) {
  return contour.captureContourMap(feature, developableArea, showDevelopableArea);
}

export async function captureFloodMap(feature, developableArea = null, showDevelopableArea = true) {
  return flood.captureFloodMap(feature, developableArea, showDevelopableArea);
}

export async function captureGeoscapeMap(feature, developableArea = null, showDevelopableArea = true) {
  return geoscape.captureGeoscapeMap(feature, developableArea, showDevelopableArea);
}

export async function captureHeritageMap(feature, developableArea = null, showDevelopableArea = true) {
  return heritage.captureHeritageMap(feature, developableArea, showDevelopableArea);
}

export async function captureHistoricalImagery(feature, developableArea = null, showDevelopableArea = true) {
  return historicalImagery.captureHistoricalImagery(feature, developableArea, showDevelopableArea);
}

export async function lmrOverlap(feature, developableArea = null, showDevelopableArea = true) {
  return lmrOverlapModule.lmrOverlap(feature, developableArea, showDevelopableArea);
}

export async function capturePowerMap(feature, developableArea = null, showDevelopableArea = true) {
  return power.capturePowerMap(feature, developableArea, showDevelopableArea);
}

export async function capturePrimarySiteAttributesMap(feature, developableArea = null, showDevelopableArea = true) {
  return primarySiteAttributes.capturePrimarySiteAttributesMap(feature, developableArea, showDevelopableArea);
}

export async function capturePTALMap(feature, developableArea = null, showDevelopableArea = true) {
  return ptal.capturePTALMap(feature, developableArea, showDevelopableArea);
}

export async function captureRegularityMap(feature, developableArea = null, showDevelopableArea = true) {
  return regularity.captureRegularityMap(feature, developableArea, showDevelopableArea);
}

export async function captureRoadsMap (feature, developableArea = null, showDevelopableArea = true) {
  return roads.captureRoadsMap(feature, developableArea, showDevelopableArea);
}

export async function captureSewerMap(feature, developableArea = null, showDevelopableArea = true) {
  return sewer.captureSewerMap(feature, developableArea, showDevelopableArea);
}

export async function captureStreetViewScreenshot(feature, developableArea = null, showDevelopableArea = true) {
  return streetView.captureStreetViewScreenshot(feature, developableArea, showDevelopableArea);
}

export async function captureTECMap(feature, developableArea = null, showDevelopableArea = true) {
  return tec.captureTECMap(feature, developableArea, showDevelopableArea);
}

export async function captureUDPPrecinctMap(feature, developableArea = null, showDevelopableArea = true) {
  return udpPrecinct.captureUDPPrecinctMap(feature, developableArea, showDevelopableArea);
}

export async function captureWaterMainsMap(feature, developableArea = null, showDevelopableArea = true) {
  return waterMains.captureWaterMainsMap(feature, developableArea, showDevelopableArea);
}
































