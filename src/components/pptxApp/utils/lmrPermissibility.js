/**
 * Utility functions for determining permissibility of different housing types 
 * in Low Medium Rise (LMR) housing areas.
 */

/**
 * Check if a zone is one of the residential zones that permit LMR development
 * @param {string} zone - The zone identifier
 * @returns {boolean} - Whether the zone is permissible for LMR development
 */
export function isPermissibleZone(zone) {
  if (!zone) return false;
  
  // Extract just the zone code (e.g., "R2" from "R2 - Low Density Residential")
  const zoneCode = zone.split('-')[0].trim();
  
  // Check if the zone code starts with one of the permissible residential zones
  const permissibleZones = ['R1', 'R2', 'R3', 'R4'];
  return permissibleZones.some(permissibleZone => zoneCode.startsWith(permissibleZone));
}

/**
 * Check if dual occupancy is permissible based on property characteristics
 * @param {Object} properties - The property data
 * @returns {Object} - Permissibility details including criteria and potential FSR/HOB values
 */
export function checkDualOccupancy(properties) {
  const zone = properties.site_suitability__principal_zone_identifier || '';
  const zoneCode = zone.split('-')[0].trim();
  const area = parseFloat(properties.site_suitability__area) || 0;
  const width = parseFloat(properties.site_suitability__site_width) || 0;
  const currentFSR = parseFloat(properties.site_suitability__floorspace_ratio) || 0;
  const currentHOB = parseFloat(properties.site_suitability__height_of_building) || 0;
  
  // Define criteria for dual occupancy
  const criteria = {
    zone: {
      required: 'R1, R2, R3, or R4',
      met: isPermissibleZone(zone),
      actual: zoneCode || 'Unknown'
    },
    area: {
      required: '≥ 400m²',
      met: area >= 400,
      actual: `${area.toLocaleString()}m²`
    },
    width: {
      required: '≥ 12m',
      met: width >= 12,
      actual: `${Math.round(width)}m`
    }
  };
  
  // Define requirements for display in the table
  const requirements = {
    area: 400,
    width: 12
  };
  
  // Check if all criteria are met
  const isPermissible = Object.values(criteria).every(criterion => criterion.met);
  
  // Potential FSR and HOB values for dual occupancy
  // Note: These are standard values for dual occupancy
  const potentialFSR = 0.5;
  const potentialHOB = 8.5;
  
  return {
    type: 'Dual Occupancy',
    isPermissible,
    criteria,
    requirements,
    currentFSR,
    currentHOB,
    potentialFSR,
    potentialHOB
  };
}

/**
 * Check if multi-dwelling housing is permissible based on property characteristics
 * @param {Object} properties - The property data
 * @returns {Object} - Permissibility details including criteria and potential FSR/HOB values
 */
export function checkMultiDwellingHousing(properties) {
  const zone = properties.site_suitability__principal_zone_identifier || '';
  const zoneCode = zone.split('-')[0].trim();
  const area = parseFloat(properties.site_suitability__area) || 0;
  const width = parseFloat(properties.site_suitability__site_width) || 0;
  const currentFSR = parseFloat(properties.site_suitability__floorspace_ratio) || 0;
  const currentHOB = parseFloat(properties.site_suitability__height_of_building) || 0;
  
  // Define criteria for multi-dwelling housing
  const criteria = {
    zone: {
      required: 'R1, R2, R3, or R4',
      met: isPermissibleZone(zone),
      actual: zoneCode || 'Unknown'
    },
    area: {
      required: '≥ 600m²',
      met: area >= 600,
      actual: `${area.toLocaleString()}m²`
    },
    width: {
      required: '≥ 15m',
      met: width >= 15,
      actual: `${Math.round(width)}m`
    }
  };
  
  // Define requirements for display in the table
  const requirements = {
    area: 600,
    width: 15
  };
  
  // Check if all criteria are met
  const isPermissible = Object.values(criteria).every(criterion => criterion.met);
  
  // Potential FSR and HOB values for multi-dwelling housing
  // Note: These values align with LMR guidelines for multi-dwelling housing
  const potentialFSR = 0.75;
  const potentialHOB = 9.0;
  
  return {
    type: 'Multi-dwelling Housing',
    isPermissible,
    criteria,
    requirements,
    currentFSR,
    currentHOB,
    potentialFSR,
    potentialHOB
  };
}

/**
 * Check if multi-dwelling housing (terraces) is permissible based on property characteristics
 * @param {Object} properties - The property data
 * @returns {Object} - Permissibility details including criteria and potential FSR/HOB values
 */
export function checkMultiDwellingTerraces(properties) {
  const zone = properties.site_suitability__principal_zone_identifier || '';
  const zoneCode = zone.split('-')[0].trim();
  const area = parseFloat(properties.site_suitability__area) || 0;
  const width = parseFloat(properties.site_suitability__site_width) || 0;
  const currentFSR = parseFloat(properties.site_suitability__floorspace_ratio) || 0;
  const currentHOB = parseFloat(properties.site_suitability__height_of_building) || 0;
  
  // Define criteria for multi-dwelling terraces
  const criteria = {
    zone: {
      required: 'R1, R2, R3, or R4',
      met: isPermissibleZone(zone),
      actual: zoneCode || 'Unknown'
    },
    area: {
      required: '≥ 800m²',
      met: area >= 800,
      actual: `${area.toLocaleString()}m²`
    },
    width: {
      required: '≥ 18m',
      met: width >= 18,
      actual: `${Math.round(width)}m`
    }
  };
  
  // Define requirements for display in the table
  const requirements = {
    area: 800,
    width: 18
  };
  
  // Check if all criteria are met
  const isPermissible = Object.values(criteria).every(criterion => criterion.met);
  
  // Potential FSR and HOB values for multi-dwelling terraces
  // Note: These values align with LMR guidelines for terrace housing
  const potentialFSR = 0.85;
  const potentialHOB = 9.5;
  
  return {
    type: 'Multi-dwelling Housing (Terraces)',
    isPermissible,
    criteria,
    requirements,
    currentFSR,
    currentHOB,
    potentialFSR,
    potentialHOB
  };
}

/**
 * Check if residential flat buildings are permissible based on property characteristics
 * @param {Object} properties - The property data
 * @returns {Object} - Permissibility details including criteria and potential FSR/HOB values
 */
export async function checkResidentialFlatBuilding(properties) {
  const zone = properties.site_suitability__principal_zone_identifier || '';
  const zoneCode = zone.split('-')[0].trim();
  const area = parseFloat(properties.site_suitability__area) || 0;
  const width = parseFloat(properties.site_suitability__site_width) || 0;
  const currentFSR = parseFloat(properties.site_suitability__floorspace_ratio) || 0;
  const currentHOB = parseFloat(properties.site_suitability__height_of_building) || 0;
  
  // Define base criteria for residential flat buildings - only zone requirement
  const criteria = {
    zone: {
      required: 'R1, R2, R3, or R4',
      met: isPermissibleZone(zone),
      actual: zoneCode || 'Unknown'
    }
  };
  
  // Define requirements for display in the table - no minimum requirements
  const requirements = {};
  
  // Check if zone criteria is met
  const isPermissible = criteria.zone.met;
  
  // FSR and HOB ranges for different zone types
  const fsrRange = {
    min: 0.8,
    max: zoneCode === 'R1' || zoneCode === 'R2' ? 0.8 : 2.2
  };
  
  const hobRange = {
    min: 17.5,
    max: zoneCode === 'R1' || zoneCode === 'R2' ? 9.5 : 22.0
  };
  
  return {
    type: 'Residential Flat Buildings',
    isPermissible,
    criteria,
    requirements,
    currentFSR,
    currentHOB,
    fsrRange,
    hobRange,
    // Use a middle value for display purposes
    potentialFSR: (fsrRange.min + fsrRange.max) / 2,
    potentialHOB: (hobRange.min + hobRange.max) / 2
  };
}

/**
 * Get all permissible housing types for a property in an LMR area
 * @param {Object} properties - The property data
 * @returns {Array} - Array of permissible housing types with details
 */
export async function getAllPermissibleHousingTypes(properties) {
  // Don't proceed if property isn't in an LMR area
  if (!properties.isInLMRArea) {
    return [];
  }
  
  // Check each housing type
  const dualOccupancy = checkDualOccupancy(properties);
  const multiDwellingHousing = checkMultiDwellingHousing(properties);
  const multiDwellingTerraces = checkMultiDwellingTerraces(properties);
  const residentialFlatBuilding = await checkResidentialFlatBuilding(properties);
  
  // Return all housing types, regardless of permissibility
  // This allows displaying all options in the table, with indicators for which are permissible
  return [
    dualOccupancy,
    multiDwellingHousing,
    multiDwellingTerraces,
    residentialFlatBuilding
  ];
} 