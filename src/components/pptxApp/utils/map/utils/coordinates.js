import proj4 from 'proj4';

// Define coordinate systems
const GDA94 = 'EPSG:4283';
const WGS84 = 'EPSG:4326';
const MERCATOR = 'EPSG:3857';

// Define proj4 definitions if not already in the proj4 registry
proj4.defs(GDA94, '+proj=longlat +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +no_defs');
proj4.defs(MERCATOR, '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs');

export function convertToWebMercator(lng, lat) {
  return proj4(GDA94, MERCATOR, [lng, lat]);
}

export function calculateMercatorParams(centerX, centerY, size) {
  const [centerMercX, centerMercY] = convertToWebMercator(centerX, centerY);
  
  // Convert size from degrees to meters using the scale factor at the center latitude
  const metersPerDegree = 20037508.34 / 180;
  const sizeInMeters = size * metersPerDegree;
  
  const bbox = `${centerMercX - sizeInMeters/2},${centerMercY - sizeInMeters/2},${centerMercX + sizeInMeters/2},${centerMercY + sizeInMeters/2}`;
  
  return { 
    centerMercX, 
    centerMercY, 
    sizeInMeters, 
    bbox,
    mercatorCoords: [centerMercX, centerMercY]
  };
}

// Add helper functions for other transformations
export function gda94ToWebMercator(x, y) {
  return proj4(GDA94, MERCATOR, [x, y]);
}

export function webMercatorToGda94(x, y) {
  return proj4(MERCATOR, GDA94, [x, y]);
}

export function mercatorToWGS84(x, y) {
  return proj4(MERCATOR, WGS84, [x, y]);
}

export function wgs84ToMercator(x, y) {
  return proj4(WGS84, MERCATOR, [x, y]);
} 