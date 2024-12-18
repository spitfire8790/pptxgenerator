export const CM_TO_INCHES = 0.393701;

/**
 * Converts a string with cm units to inches
 * @param {string|number} value - Value with optional 'cm' suffix or number
 * @returns {number} - Value in inches
 */
export function cmToInches(value) {
  if (typeof value === 'number') return value;
  
  const match = String(value).match(/^([\d.]+)(?:cm)?$/);
  if (!match) return value;
  
  const numValue = parseFloat(match[1]);
  return numValue * CM_TO_INCHES;
}

/**
 * Recursively processes an object and converts any cm values to inches
 * @param {Object} obj - Object containing style properties
 * @returns {Object} - New object with converted values
 */
export function convertCmValues(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const result = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      result[key] = convertCmValues(value);
    } else if (typeof value === 'string' && value.endsWith('cm')) {
      result[key] = cmToInches(value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
} 