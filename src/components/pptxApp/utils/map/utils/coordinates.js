export function convertToWebMercator(lng, lat) {
  const x = lng * 20037508.34 / 180;
  let y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
  y = y * 20037508.34 / 180;
  return [x, y];
}

export function calculateMercatorParams(centerX, centerY, size) {
  const [centerMercX, centerMercY] = convertToWebMercator(centerX, centerY);
  const sizeInMeters = size * (20037508.34 / 180);
  const bbox = `${centerMercX - sizeInMeters/2},${centerMercY - sizeInMeters/2},${centerMercX + sizeInMeters/2},${centerMercY + sizeInMeters/2}`;
  return { centerMercX, centerMercY, sizeInMeters, bbox };
} 