import * as turf from '@turf/turf';

/**
 * Calculates the bounds for a feature with optional padding and developable area
 * @param {Object} feature - GeoJSON feature
 * @param {Number} padding - Padding to add around the bounds
 * @param {Object} developableArea - Optional developable area GeoJSON
 * @param {Boolean} useDevelopableAreaForBounds - Whether to use developable area for bounds calculation
 * @returns {Object} Object containing centerX, centerY, and size
 */
export function calculateBounds(feature, padding, developableArea = null, useDevelopableAreaForBounds = false) {
  if (!feature) return { centerX: 0, centerY: 0, size: 0 };

  let bounds;
  
  if (developableArea && useDevelopableAreaForBounds && developableArea.features.length > 0) {
    // Use developable area for bounds calculation
    bounds = getBoundsFromFeatures(developableArea.features);
  } else {
    // Use the main feature for bounds calculation
    bounds = getBoundsFromFeature(feature);
  }

  // Apply padding
  const width = bounds.east - bounds.west;
  const height = bounds.north - bounds.south;
  const size = Math.max(width, height) * (1 + padding);

  // Calculate center
  const centerX = (bounds.east + bounds.west) / 2;
  const centerY = (bounds.north + bounds.south) / 2;

  return { centerX, centerY, size };
}

/**
 * Gets bounds from a single feature
 * @param {Object} feature - GeoJSON feature
 * @returns {Object} Bounds object with north, south, east, west properties
 */
function getBoundsFromFeature(feature) {
  if (feature.geometry?.type === 'Point') {
    const [lon, lat] = feature.geometry.coordinates;
    return {
      north: lat + 0.001,
      south: lat - 0.001,
      east: lon + 0.001,
      west: lon - 0.001
    };
  }

  const bbox = turf.bbox(feature);
  return {
    west: bbox[0],
    south: bbox[1],
    east: bbox[2],
    north: bbox[3]
  };
}

/**
 * Gets bounds from multiple features
 * @param {Array} features - Array of GeoJSON features
 * @returns {Object} Bounds object with north, south, east, west properties
 */
function getBoundsFromFeatures(features) {
  if (!features || features.length === 0) {
    return { north: 0, south: 0, east: 0, west: 0 };
  }

  const featureCollection = turf.featureCollection(features);
  const bbox = turf.bbox(featureCollection);
  
  return {
    west: bbox[0],
    south: bbox[1],
    east: bbox[2],
    north: bbox[3]
  };
}

/**
 * Calculates the visual center of a polygon
 * @param {Array} coordinates - Array of coordinate pairs
 * @returns {Array} [x, y] center coordinates
 */
export function calculateVisualCenter(coordinates) {
  if (!coordinates || coordinates.length === 0) return null;
  
  // Use the first ring of coordinates for calculation
  const points = coordinates.map(coord => ({ x: coord[0], y: coord[1] }));
  
  // Calculate centroid
  let sumX = 0;
  let sumY = 0;
  
  points.forEach(point => {
    sumX += point.x;
    sumY += point.y;
  });
  
  return [sumX / points.length, sumY / points.length];
}