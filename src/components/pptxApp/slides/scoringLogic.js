import * as turf from '@turf/turf';
import proj4 from 'proj4';

// Define the coordinate systems
proj4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs');
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');

const scoreColors = {
  3: '#E6F2DE', // Green - High suitability
  2: '#FFF9DD', // Yellow - Medium suitability
  1: '#FFE6EA', // Red - Low suitability
  0: '#FFFFFF'  // White - Not assessed
};

const scoringCriteria = {
  planning: {
    highScoreZones: ['2(a)', 'A', 'B', 'B1', 'B2', 'B4', 'E1', 'MU', 'MU1', 'R', 'R1', 'R2', 'R3', 'R4', 'RU5'],
    mediumScoreZones: ['SP1', 'SP2', 'SP3'],
    thresholds: {
      fsr: 1,
      hob: 10
    },
    calculateScore: (zones, fsr, hob) => {
      // Default score if no data
      if (!zones || zones.length === 0) return 0;

      // Check if any zone matches high score criteria
      const hasHighScoreZone = zones.some(zone => scoringCriteria.planning.highScoreZones.includes(zone));
      const hasMediumScoreZone = zones.some(zone => scoringCriteria.planning.mediumScoreZones.includes(zone));

      // Convert FSR and HoB to numbers and handle null/undefined
      const numFSR = parseFloat(fsr) || 0;
      const numHoB = parseFloat(hob) || 0;

      if (hasHighScoreZone) {
        // Check if meets threshold for high score
        if (numFSR > scoringCriteria.planning.thresholds.fsr || 
            numHoB > scoringCriteria.planning.thresholds.hob) {
          return 3;
        }
        return 2; // High score zone but doesn't meet FSR/HoB thresholds
      }

      if (hasMediumScoreZone) {
        return 2;
      }

      return 1; // Default score for any other zones
    },
    getScoreDescription: (score) => {
      switch (score) {
        case 3:
          return "High suitability - Compatible zoning with favourable density controls.";
        case 2:
          return "Medium suitability - Compatible zoning with lower density controls or special purpose zoning.";
        case 1:
          return "Low suitability - Non-compatible zoning.";
        default:
          return "Not assessed";
      }
    },
    getScoreColor: (score) => {
      return scoreColors[score] || scoreColors[0];
    }
  },
  developableArea: {
    calculateScore: (areaInSqMeters) => {
      // Handle both single values and arrays of areas (for multiple developable areas)
      const totalArea = Array.isArray(areaInSqMeters) 
        ? areaInSqMeters.reduce((sum, area) => sum + area, 0)
        : areaInSqMeters;
        
      console.log('Total developable area for scoring:', totalArea);
      
      if (totalArea >= 4000) return 3;
      if (totalArea >= 2000) return 2;
      return 1;
    },
    getScoreDescription: (score) => {
      switch (score) {
        case 3:
          return "Large developable area (>4,000 sqm)";
        case 2:
          return "Medium developable area (2,000-4,000 sqm)";
        case 1:
          return "Small developable area (<2,000 sqm)";
        default:
          return "Not assessed";
      }
    },
    getScoreColor: (score) => {
      return scoreColors[score] || scoreColors[0];
    }
  },
  contours: {
    calculateScore: (elevationChange) => {
      if (elevationChange === 0 || elevationChange === null || elevationChange === undefined) return 3;
      if (elevationChange < 5) return 3;
      if (elevationChange <= 10) return 2;
      return 1;
    },
    getScoreDescription: (score) => {
      switch (score) {
        case 3:
          return "Minimal or no elevation change (<5m)";
        case 2:
          return "Moderate elevation change (5-10m)";
        case 1:
          return "Significant elevation change (>10m)";
        default:
          return "Not assessed";
      }
    },
    getScoreColor: (score) => {
      return scoreColors[score] || scoreColors[0];
    }
  },
  siteRegularity: {
    calculateScore: (geometry) => {
      if (!geometry) return 0;
      
      try {
        // First simplify the geometry slightly to remove any tiny irregularities
        const simplified = turf.simplify(geometry, { tolerance: 0.0001, highQuality: true });
        
        // Get the coordinates
        const coords = simplified.geometry.coordinates[0];
        
        // Calculate angles between consecutive edges
        const angles = [];
        for (let i = 0; i < coords.length - 1; i++) {
          const p1 = coords[i];
          const p2 = coords[(i + 1) % (coords.length - 1)];
          const p3 = coords[(i + 2) % (coords.length - 1)];
          
          // Calculate vectors
          const v1 = [p2[0] - p1[0], p2[1] - p1[1]];
          const v2 = [p3[0] - p2[0], p3[1] - p2[1]];
          
          // Calculate angle in degrees
          const angle = Math.abs(Math.atan2(
            v1[0] * v2[1] - v1[1] * v2[0],
            v1[0] * v2[0] + v1[1] * v2[1]
          ) * (180 / Math.PI));
          
          angles.push(angle);
        }

        // For a rectangle, all angles should be close to 90 degrees
        // Increased tolerance from 15 to 25 degrees to be more lenient
        const angleTolerance = 25;
        const isRectangular = angles.every(angle => Math.abs(angle - 90) < angleTolerance);
        
        // Calculate area ratio as before
        const actualArea = turf.area(simplified);
        const bbox = turf.bbox(simplified);
        const bboxPolygon = turf.bboxPolygon(bbox);
        const mbrArea = turf.area(bboxPolygon);
        const regularityRatio = actualArea / mbrArea;
        
        // Log detailed information for debugging
        console.log('Site regularity calculation:', {
          actualArea,
          mbrArea,
          regularityRatio,
          angles,
          anglesTolerance: angleTolerance,
          isRectangular,
          originalVertices: geometry.geometry.coordinates[0].length,
          simplifiedVertices: simplified.geometry.coordinates[0].length
        });
        
        // If shape is rectangular (based on angles), give it a high score
        // Lowered the ratio requirement from 0.4 to 0.3
        if (isRectangular && regularityRatio > 0.3) {
          console.log('Shape is considered rectangular with ratio:', regularityRatio);
          return 3;
        }
        
        // Otherwise use the area ratio with adjusted thresholds
        // Lowered thresholds to be more lenient
        if (regularityRatio >= 0.65) {
          console.log('High regularity ratio:', regularityRatio);
          return 3;
        }
        if (regularityRatio >= 0.5) {
          console.log('Medium regularity ratio:', regularityRatio);
          return 2;
        }
        
        console.log('Low regularity ratio:', regularityRatio);
        return 1;
        
      } catch (error) {
        console.error('Error calculating site regularity score:', error);
        return 0;
      }
    },
    getScoreDescription: (score) => {
      switch (score) {
        case 3:
          return "Highly regular shape - Optimal for development";
        case 2:
          return "Moderately regular shape";
        case 1:
          return "Irregular shape - May impact development potential";
        default:
          return "Not assessed";
      }
    },
    getScoreColor: (score) => {
      return scoreColors[score] || scoreColors[0];
    }
  },
  heritage: {
    calculateScore: (heritageData) => {
      // Now handling either a single item or an array of items
      if (!heritageData) return 3; // No heritage impact
      
      // If it's an array, process all items
      if (Array.isArray(heritageData)) {
        if (heritageData.length === 0) return 3; // Empty array, no impact
        
        // Find the lowest score (highest impact) across all areas
        let lowestScore = 3;
        
        for (const data of heritageData) {
          const significance = data.SIG?.toLowerCase();
          
          if (!significance) continue; // Skip items with no significance
          
          if (significance.includes('state') || significance.includes('national')) {
            lowestScore = Math.min(lowestScore, 1);
          } else if (significance.includes('local')) {
            lowestScore = Math.min(lowestScore, 2);
          }
        }
        
        return lowestScore;
      } else {
        // Original logic for single item
        const significance = heritageData.SIG?.toLowerCase();
        
        if (!significance) return 3; // No heritage significance specified
        
        if (significance.includes('state') || significance.includes('national')) {
          return 1;
        } else if (significance.includes('local')) {
          return 2;
        }
        
        return 3; // Default to no heritage impact if significance is unknown
      }
    },
    getScoreDescription: (score) => {
      switch (score) {
        case 3:
          return "The developable area is not impacted by heritage.";
        case 2:
          return "The developable area is impacted by local heritage.";
        case 1:
          return "The developable area is impacted by State heritage.";
        default:
          return "Heritage impact not assessed";
      }
    },
    getScoreColor: (score) => {
      return scoreColors[score] || scoreColors[0];
    }
  },
  acidSulfateSoils: {
    calculateScore: (soilsData) => {
      // Now handling either a single item or an array of items
      if (!soilsData) return 3; // No acid sulfate soils impact
      
      // If it's an array, process all items
      if (Array.isArray(soilsData)) {
        if (soilsData.length === 0) return 3; // Empty array, no impact
        
        // Find the lowest score (highest impact) across all areas
        let lowestScore = 3;
        
        for (const data of soilsData) {
          if (!data.LAY_CLASS) continue; // Skip items with no LAY_CLASS
          
          const classes = data.LAY_CLASS.split(',').map(c => c.trim());
          
          // Check for Class 1 or other high risk classifications (high risk)
          if (classes.some(c => 
            c === 'Class 1' || 
            c === 'Class 2' || 
            c === 'Disturbed terrain' || 
            c === 'High probability at or near the ground surface'
          )) {
            lowestScore = Math.min(lowestScore, 1);
            continue;
          }
          
          // Check for Class 3, 4, 5 or other medium risk classifications
          if (classes.some(c => 
            c === 'Class 3' || 
            c === 'Class 4' || 
            c === 'Class 5' ||
            c === 'Class 2a' ||
            c === 'Class 2b' ||
            c === 'High probability within 1 m of the ground surface' ||
            c === 'High probability of bottom sediments below water level' ||
            c === 'Acid Sulfate Soil Area (land up to 5 metres AHD)' ||
            c === 'Buffer Area (land greater than 5 metres but less then 10 metres AHD or within 170 metres of Acid Su*'
          )) {
            lowestScore = Math.min(lowestScore, 2);
          }
        }
        
        return lowestScore;
      } else {
        // Original logic for single item
        if (!soilsData.LAY_CLASS) return 3;
        
        const classes = soilsData.LAY_CLASS.split(',').map(c => c.trim());
        
        // Check for Class 1 or other high risk classifications (high risk)
        if (classes.some(c => 
          c === 'Class 1' || 
          c === 'Class 2' || 
          c === 'Disturbed terrain' || 
          c === 'High probability at or near the ground surface'
        )) {
          return 1;
        }
        
        // Check for Class 3, 4, 5 or other medium risk classifications
        if (classes.some(c => 
          c === 'Class 3' || 
          c === 'Class 4' || 
          c === 'Class 5' ||
          c === 'Class 2a' ||
          c === 'Class 2b' ||
          c === 'High probability within 1 m of the ground surface' ||
          c === 'High probability of bottom sediments below water level' ||
          c === 'Acid Sulfate Soil Area (land up to 5 metres AHD)' ||
          c === 'Buffer Area (land greater than 5 metres but less then 10 metres AHD or within 170 metres of Acid Su*'
        )) {
          return 2;
        }
        
        return 3; // Default to no impact if class is unknown
      }
    },
    getScoreDescription: (score, soilsData) => {
      if (!soilsData) {
        return "Developable area is not impacted by acid sulfate soils.";
      }
      
      // Handle array of soil data
      if (Array.isArray(soilsData)) {
        if (soilsData.length === 0) {
          return "Developable area is not impacted by acid sulfate soils.";
        }
        
        // For arrays, find the most significant soil data (with lowest score)
        let significantSoilData = null;
        
        // First try to find Class 1 or 2 (score 1)
        if (score === 1) {
          significantSoilData = soilsData.find(data => {
            if (!data.LAY_CLASS) return false;
            const classes = data.LAY_CLASS.split(',').map(c => c.trim());
            return classes.some(c => 
              c === 'Class 1' || 
              c === 'Class 2' || 
              c === 'Disturbed terrain' || 
              c === 'High probability at or near the ground surface'
            );
          });
        }
        
        // If not found and score is 2, look for medium risk classes
        if (!significantSoilData && score === 2) {
          significantSoilData = soilsData.find(data => {
            if (!data.LAY_CLASS) return false;
            const classes = data.LAY_CLASS.split(',').map(c => c.trim());
            return classes.some(c => 
              c === 'Class 3' || 
              c === 'Class 4' || 
              c === 'Class 5' ||
              c === 'Class 2a' ||
              c === 'Class 2b' ||
              c === 'High probability within 1 m of the ground surface' ||
              c === 'High probability of bottom sediments below water level' ||
              c === 'Acid Sulfate Soil Area (land up to 5 metres AHD)' ||
              c === 'Buffer Area (land greater than 5 metres but less then 10 metres AHD or within 170 metres of Acid Su*'
            );
          });
        }
        
        // If we found significant soil data, use it
        if (significantSoilData && significantSoilData.LAY_CLASS) {
          const classes = significantSoilData.LAY_CLASS.split(',').map(c => c.trim()).join(', ');
          
          switch (score) {
            case 3:
              return "Developable area is not impacted by acid sulfate soils.";
            case 2:
            case 1:
              return `Developable area is impacted by ${classes} Acid Sulfate Soils.`;
            default:
              return "Acid sulfate soils impact not assessed.";
          }
        }
        
        // If no specific data found but we have a score
        switch (score) {
          case 3:
            return "Developable area is not impacted by acid sulfate soils.";
          case 2:
            return "Developable area is impacted by medium risk acid sulfate soils.";
          case 1:
            return "Developable area is impacted by high risk acid sulfate soils.";
          default:
            return "Acid sulfate soils impact not assessed.";
        }
      } else {
        // Original logic for single item
        if (!soilsData.LAY_CLASS) {
          return "Developable area is not impacted by acid sulfate soils.";
        }
        
        const classes = soilsData.LAY_CLASS.split(',').map(c => c.trim()).join(', ');
        
        switch (score) {
          case 3:
            return "Developable area is not impacted by acid sulfate soils.";
          case 2:
          case 1:
            return `Developable area is impacted by ${classes} Acid Sulfate Soils.`;
          default:
            return "Acid sulfate soils impact not assessed.";
        }
      }
    },
    getScoreColor: (score) => {
      return scoreColors[score] || scoreColors[0];
    }
  },
  ptal: {
    calculateScore: (ptalValues, featurePTALs) => {
      console.log('=== PTAL Score Calculation Start ===');
      console.log('PTAL values:', ptalValues);
      console.log('Feature PTALs:', featurePTALs);
      
      // Check if we have feature-specific PTAL values
      if (featurePTALs && Array.isArray(featurePTALs)) {
        console.log('Processing PTAL for multiple features');
        
        // Find the best PTAL value across all features
        let bestPtalScore = 1;
        
        featurePTALs.forEach(featurePtal => {
          const featureValues = featurePtal.ptalValues || [];
          
          // Get the highest PTAL value from this feature
          const highestPtal = featureValues.reduce((highest, current) => {
            const valueMap = {
              '6 - Very High': 6,
              '5 - High': 5,
              '4 - Medium-High': 4,
              '3 - Medium': 3,
              '2 - Low-Medium': 2,
              '1 - Low': 1
            };
            
            const currentValue = valueMap[current] || 0;
            const highestValue = valueMap[highest] || 0;
            
            return currentValue > highestValue ? current : highest;
          }, featureValues[0]);
          
          // Score based on highest PTAL value
          let featureScore = 1;
          if (highestPtal === '6 - Very High' || highestPtal === '5 - High') {
            featureScore = 3;
          } else if (highestPtal === '4 - Medium-High' || highestPtal === '3 - Medium') {
            featureScore = 2;
          }
          
          // Update best score if this feature has a better score
          if (featureScore > bestPtalScore) {
            bestPtalScore = featureScore;
          }
        });
        
        console.log('Best PTAL score across all features:', bestPtalScore);
        return bestPtalScore;
      }
      
      // Original approach for single feature or fallback
      if (!ptalValues || ptalValues.length === 0) return 1;
      
      // Get the highest PTAL value from the intersecting values
      const valuesToScore = Array.isArray(ptalValues) ? ptalValues : [];
      
      // Get the highest PTAL value
      const highestPtal = valuesToScore.reduce((highest, current) => {
        const valueMap = {
          '6 - Very High': 6,
          '5 - High': 5,
          '4 - Medium-High': 4,
          '3 - Medium': 3,
          '2 - Low-Medium': 2,
          '1 - Low': 1
        };
        
        const currentValue = valueMap[current] || 0;
        const highestValue = valueMap[highest] || 0;
        
        return currentValue > highestValue ? current : highest;
      }, valuesToScore[0]);
      
      // Score based on highest PTAL value
      if (highestPtal === '6 - Very High' || highestPtal === '5 - High') {
        return 3;
      } else if (highestPtal === '4 - Medium-High' || highestPtal === '3 - Medium') {
        return 2;
      } else if (highestPtal === '2 - Low-Medium' || highestPtal === '1 - Low') {
        return 1;
      }
      
      return 1;
    },
    getScoreDescription: (score, ptalValues, featurePTALs) => {
      // Check if we have feature-specific PTAL values
      if (featurePTALs && Array.isArray(featurePTALs)) {
        // Find the best PTAL feature
        let bestFeature = null;
        let bestPtalValue = null;
        
        featurePTALs.forEach(featurePtal => {
          const featureValues = featurePtal.ptalValues || [];
          
          // Skip empty features
          if (featureValues.length === 0) return;
          
          // Get the highest PTAL value from this feature
          const highestPtal = featureValues.reduce((highest, current) => {
            const valueMap = {
              '6 - Very High': 6,
              '5 - High': 5,
              '4 - Medium-High': 4,
              '3 - Medium': 3,
              '2 - Low-Medium': 2,
              '1 - Low': 1
            };
            
            const currentValue = valueMap[current] || 0;
            const highestValue = valueMap[highest] || 0;
            
            return currentValue > highestValue ? current : highest;
          }, featureValues[0]);
          
          // Check if this is the best PTAL value we've seen
          const valueMap = {
            '6 - Very High': 6,
            '5 - High': 5,
            '4 - Medium-High': 4,
            '3 - Medium': 3,
            '2 - Low-Medium': 2,
            '1 - Low': 1
          };
          
          const currentValue = valueMap[highestPtal] || 0;
          const bestValue = bestPtalValue ? (valueMap[bestPtalValue] || 0) : 0;
          
          if (currentValue > bestValue) {
            bestFeature = featurePtal.featureIndex;
            bestPtalValue = highestPtal;
          }
        });
        
        // Create description based on best feature
        if (bestFeature !== null && bestPtalValue) {
          const featureText = `The site`;
          
          switch (score) {
            case 3:
              return `${featureText} has good public transport access: PTAL (8:00-9:00 AM) = ${bestPtalValue}`;
            case 2:
              return `${featureText} has moderate public transport access: PTAL (8:00-9:00 AM) = ${bestPtalValue}`;
            case 1:
              return `${featureText} has low public transport access: PTAL (8:00-9:00 AM) = ${bestPtalValue}`;
            default:
              return "PTAL not assessed";
          }
        }
      }
      
      // Original approach for single feature
      if (!ptalValues || ptalValues.length === 0) {
        return "PTAL not assessed";
      }
      
      const ptalList = Array.from(new Set(ptalValues)).join(', ');
      
      switch (score) {
        case 3:
          return `Site has good public transport access: PTAL (8:00-9:00 AM) = ${ptalList}`;
        case 2:
          return `Site has moderate public transport access: PTAL (8:00-9:00 AM) = ${ptalList}`;
        case 1:
          return `Site has low public transport access: PTAL (8:00-9:00 AM) = ${ptalList}`;
        default:
          return "PTAL not assessed";
      }
    },
    getScoreColor: (score) => {
      return scoreColors[score] || scoreColors[0];
    }
  },
  geoscape: {
    calculateScore: (geoscapeFeatures, developableArea) => {
      console.log('=== Geoscape Score Calculation Start ===');
      console.log('Input validation:');
      console.log('geoscapeFeatures:', geoscapeFeatures);
      console.log('developableArea:', developableArea);

      // Handle null/undefined developableArea
      if (!developableArea || !developableArea.features || developableArea.features.length === 0) {
        console.log('No developable area provided - returning score 0');
        return { score: 0, coverage: 0, features: [] };
      }

      // If no geoscape features, return highest score
      if (!geoscapeFeatures?.features?.length) {
        console.log('No geoscape features found - returning score 3');
        return { score: 3, coverage: 0, features: [] };
      }

      try {
        // Process all developable area features and combine them for total area calculation
        let totalArea = 0;
        const developablePolygons = [];

        // Process each feature in the developable area
        developableArea.features.forEach((feature, index) => {
          try {
            if (!feature.geometry || !feature.geometry.coordinates) {
              console.log(`Skipping developable area feature ${index} - invalid geometry`);
              return;
            }

            const developableCoords = feature.geometry.coordinates;
            console.log(`Raw developable coordinates for feature ${index}:`, developableCoords);
            
            // For polygon coordinates, we need at least one ring with at least 3 points
            if (!Array.isArray(developableCoords[0]) || !Array.isArray(developableCoords[0][0]) || developableCoords[0].length < 3) {
              console.error(`Invalid developable area polygon structure for feature ${index}:`, developableCoords);
              return;
            }
            
            // Create a valid GeoJSON polygon
            const developablePolygon = {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: developableCoords
              }
            };

            // Validate the created polygon
            if (!turf.booleanValid(developablePolygon)) {
              console.error(`Invalid developable polygon geometry for feature ${index}`);
              return;
            }

            // Calculate area for this polygon
            const area = turf.area(developablePolygon);
            console.log(`Area for developable feature ${index}:`, area, 'square meters');
            
            // Add to total area
            totalArea += area;
            
            // Add polygon to array for intersection checking
            developablePolygons.push(developablePolygon);
            console.log(`Processed developable area ${index+1}`);
          } catch (error) {
            console.error(`Error processing developable area feature ${index}:`, error);
          }
        });

        if (developablePolygons.length === 0) {
          console.error('No valid developable polygons found');
          return { score: 0, coverage: 0, features: [] };
        }

        console.log('Total combined developable area:', totalArea, 'square meters');

        // Calculate total area of geoscape features
        let geoscapeArea = 0;
        const relevantFeatures = [];
        console.log('Processing geoscape features...');
        
        try {
          if (!geoscapeFeatures.features || !Array.isArray(geoscapeFeatures.features)) {
            console.error('No valid features array in geoscapeFeatures:', geoscapeFeatures);
          } else {
            geoscapeFeatures.features.forEach((feature, index) => {
              try {
                console.log(`\nProcessing feature ${index + 1}:`, feature);
                if (feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon') {
                  try {
                    let featurePolygon = feature;
                    console.log(`Feature ${index + 1} area before intersection:`, turf.area(featurePolygon), 'square meters');
                    
                    // Check if the feature intersects ANY of the developable areas
                    let includeFeature = false;
                    let featureArea = 0;
                    
                    // Check each developable area for intersections
                    for (const developablePolygon of developablePolygons) {
                      try {
                        // Check if feature is completely contained within the developable area
                        const containsFeature = turf.booleanContains(developablePolygon, featurePolygon);
                        
                        if (containsFeature) {
                          // If developable area completely contains the feature, use the entire feature area
                          featureArea = turf.area(featurePolygon);
                          includeFeature = true;
                          console.log(`Feature ${index + 1} is completely contained within a developable area, using full feature area:`, featureArea);
                          break;
                        }
                        
                        // Check if feature partially overlaps the developable area
                        const overlapsFeature = turf.booleanOverlap(developablePolygon, featurePolygon);
                        
                        if (overlapsFeature) {
                          // Calculate the actual intersection area for overlapping features
                          try {
                            const intersection = turf.intersect(developablePolygon, featurePolygon);
                            
                            if (intersection) {
                              // Calculate area of the intersection polygon
                              const intersectionArea = turf.area(intersection);
                              featureArea = intersectionArea;
                              includeFeature = true;
                              console.log(`Feature ${index + 1} partially overlaps a developable area, using intersection area:`, featureArea);
                              break;
                            }
                          } catch (intersectError) {
                            console.error(`Error calculating intersection for feature ${index + 1}:`, intersectError);
                            // Fallback to using the entire feature area
                            featureArea = turf.area(featurePolygon);
                            includeFeature = true;
                            console.log(`Failed to calculate intersection area for feature ${index + 1}, falling back to full feature area:`, featureArea);
                            break;
                          }
                        }
                      } catch (checkError) {
                        console.error(`Error checking feature ${index + 1} against developable area:`, checkError);
                      }
                    }
                    
                    if (includeFeature) {
                      geoscapeArea += featureArea;
                      relevantFeatures.push(feature);
                    } else {
                      console.log(`Feature ${index + 1} is not within any developable area`);
                    }
                  } catch (error) {
                    console.error(`Error processing feature ${index + 1}:`, error);
                    console.error('Feature geometry:', feature.geometry);
                  }
                } else {
                  console.log(`Feature ${index + 1} is not a Polygon/MultiPolygon: ${feature.geometry?.type}`);
                }
              } catch (featureError) {
                console.error(`Error processing feature at index ${index}:`, featureError);
              }
            });
          }
        } catch (featuresError) {
          console.error('Error processing features array:', featuresError);
        }

        console.log('\nTotal geoscape feature area:', geoscapeArea, 'square meters');

        // Calculate coverage percentage
        const coverage = (geoscapeArea / totalArea) * 100;
        console.log('Coverage percentage:', coverage.toFixed(2) + '%');

        // Determine score based on coverage
        let score;
        if (coverage === 0) {
          score = 3;
          console.log('No coverage (0%) - Score: 3');
        } else if (coverage < 20) {
          score = 2;
          console.log('Coverage < 20% - Score: 2');
        } else {
          score = 1;
          console.log('Coverage >= 20% - Score: 1');
        }

        console.log('=== Final Result ===');
        console.log({ score, coverage: parseFloat(coverage.toFixed(2)), features: relevantFeatures });

        return { 
          score, 
          coverage: parseFloat(coverage.toFixed(2)), 
          features: relevantFeatures 
        };
      } catch (error) {
        console.error('Error calculating geoscape score:', error);
        console.error('Error stack:', error.stack);
        return { score: 0, coverage: 0, features: [] };
      }
    },
    getScoreDescription: (scoreObj) => {
      // Handle both object and direct score inputs
      const score = typeof scoreObj === 'object' ? scoreObj.score : scoreObj;
      const coverage = typeof scoreObj === 'object' ? scoreObj.coverage : 0;
      const features = typeof scoreObj === 'object' ? scoreObj.features : [];

      // Find the tallest building height if there are features
      let maxHeight = 0;
      let buildingCount = 0;
      
      if (features?.length > 0) {
        features.forEach(feature => {
          buildingCount++;
          
          // Check multiple possible height fields in the properties
          // Different data sources may use different field names
          const heightFields = ['roof_heigh', 'MAX_ROOF_H', 'MAX_HEIGHT', 'roofheight', 'height', 'HEIGHT'];
          let buildingHeight = 0;
          
          for (const field of heightFields) {
            if (feature.properties && feature.properties[field] !== undefined) {
              const height = parseFloat(feature.properties[field]) || 0;
              if (height > 0) {
                buildingHeight = height;
                break;
              }
            }
          }
          
          // If no specific height field was found, try a default value
          if (buildingHeight === 0 && feature.properties?.type === 'building') {
            // Assume a default single-story building height (4m) if no height is specified
            buildingHeight = 4;
          }
          
          maxHeight = Math.max(maxHeight, buildingHeight);
        });
      }

      let description = '';
      if (score === 3) {
        description = "Developable areas have no building coverage.";
      } else if (score === 2) {
        description = `Developable areas have limited building coverage (${coverage.toFixed(1)}%).`;
      } else if (score === 1) {
        description = `Developable areas have significant building coverage (${coverage.toFixed(1)}%).`;
      } else {
        return "Building coverage not assessed";
      }

      // Add height and building count information if buildings exist
      if (buildingCount > 0) {
        description += ` Found ${buildingCount} building${buildingCount !== 1 ? 's' : ''}.`;
        
        if (maxHeight > 0) {
          description += ` Tallest building is ${maxHeight.toFixed(1)}m.`;
        }
      }

      return description;
    },
    getScoreColor: (score) => {
      return scoreColors[score] || scoreColors[0];
    }
  },
  streetView: {
    calculateScore: (streetViewData) => {
      if (!streetViewData || !streetViewData.VACANT_STATUS) return 0;
      
      const status = streetViewData.VACANT_STATUS.toLowerCase();
      
      if (status.includes('vacant')) {
        return 3;
      } else if (status.includes('partially')) {
        return 2;
      }
      
      return 1;
    },
    getScoreDescription: (score, streetViewData) => {
      if (!streetViewData || !streetViewData.VACANT_STATUS) {
        return "Street view data not available";
      }
      
      switch (score) {
        case 3:
          return "Site appears vacant from street view";
        case 2:
          return "Site appears partially developed from street view";
        case 1:
          return `Site appears ${streetViewData.VACANT_STATUS.toLowerCase()} from street view`;
        default:
          return "Street view assessment not available";
      }
    },
    getScoreColor: (score) => {
      return scoreColors[score] || scoreColors[0];
    }
  },
  water: {
    calculateScore: (waterFeatures, developableArea) => {
      console.log('=== Water Score Calculation Start ===');
      console.log('Input validation:');
      console.log('waterFeatures type:', typeof waterFeatures);
      console.log('waterFeatures is array:', Array.isArray(waterFeatures));
      console.log('waterFeatures:', JSON.stringify(waterFeatures, null, 2));
      console.log('developableArea type:', typeof developableArea);
      console.log('developableArea:', JSON.stringify(developableArea, null, 2));

      // Handle null/undefined developableArea
      if (!developableArea || !developableArea.features || developableArea.features.length === 0) {
        console.log('No valid developable area provided - returning score 0');
        return { score: 0, minDistance: Infinity };
      }

      // Handle both direct features array and FeatureCollection format
      const features = Array.isArray(waterFeatures) ? waterFeatures : waterFeatures?.features || [];
      console.log('Processed features:', features);

      if (!features?.length) {
        console.log('No water features found - returning score 0');
        return { score: 0, minDistance: Infinity };
      }

      try {
        // Process all developable area features
        const developablePolygons = [];
        
        // Process each feature in the developable area
        developableArea.features.forEach((feature, index) => {
          try {
            if (!feature.geometry || !feature.geometry.coordinates) {
              console.log(`Skipping developable area feature ${index} - invalid geometry`);
              return;
            }

            // For polygon coordinates, we need at least one ring with at least 3 points
            const developableCoords = feature.geometry.coordinates;
            
            if (!Array.isArray(developableCoords[0]) || !Array.isArray(developableCoords[0][0]) || developableCoords[0].length < 3) {
              console.error(`Invalid developable area polygon structure for feature ${index}:`, developableCoords);
              return;
            }
            
            // Create a valid GeoJSON polygon
            const developablePolygon = turf.polygon(developableCoords);
            
            // Validate the created polygon
            if (!turf.booleanValid(developablePolygon)) {
              console.error(`Invalid developable polygon geometry for feature ${index}`);
              return;
            }
            
            // Transform coordinates and create buffered polygon for this feature
            const transformedPolygon = turf.transformScale(developablePolygon, 1, { units: 'meters' });
            // Changed buffer to 20m as requested
            const bufferedPolygon = turf.buffer(transformedPolygon, 20, { units: 'meters' });
            
            developablePolygons.push(bufferedPolygon);
            console.log(`Processed developable area ${index+1}: Created buffered polygon with 20m buffer`);
          } catch (error) {
            console.error(`Error processing developable area feature ${index}:`, error);
          }
        });

        if (developablePolygons.length === 0) {
          console.error('No valid developable polygons found');
          return { score: 0, minDistance: Infinity };
        }
        
        // Check intersections with any developable area
        let intersectionFound = false;
        let minDistance = Infinity;
        
        // For each water feature
        features.forEach((feature, featureIndex) => {
          console.log(`\nChecking water feature ${featureIndex}:`, feature);
          console.log(`Water feature ${featureIndex} coordinates:`, feature.geometry?.coordinates);
          
          if (feature.geometry?.type === 'LineString' || feature.geometry?.type === 'MultiLineString') {
            const line = turf.lineString(feature.geometry.coordinates);
            console.log('Created line:', line);
            console.log('Line coordinates:', line.geometry.coordinates);
            
            // Check against each developable area
            developablePolygons.forEach((bufferedPolygon, areaIndex) => {
              console.log(`Testing against developable area ${areaIndex}`);
              
              const intersects = turf.booleanIntersects(bufferedPolygon, line);
              console.log(`Intersection result for feature ${featureIndex} with area ${areaIndex}:`, intersects);
              
              if (intersects) {
                intersectionFound = true;
                minDistance = 0; // If intersects, distance is 0
                console.log(`Found intersection with area ${areaIndex} - will return score 3`);
              }
            });
          } else {
            console.log(`Feature ${featureIndex} is not a LineString:`, feature.geometry?.type);
          }
        });

        const result = {
          score: intersectionFound ? 3 : 1,  // Changed score to 3 if within 20m, 1 if not
          minDistance: minDistance
        };

        console.log('=== Final Result ===');
        console.log(result);

        return result;

      } catch (error) {
        console.error('=== Water Score Calculation Error ===');
        console.error('Error details:', error);
        console.error('Error stack:', error.stack);
        return { score: 0, minDistance: Infinity };
      }
    },
    getScoreDescription: (score, minDistance) => {
      switch (score) {
        case 3:
          return "Developable area has water servicing within 20m";
        case 1:
          return "Developable area has no water servicing within 20m";
        default:
          return "Water servicing not assessed";
      }
    },
    getScoreColor: (score) => {
      return scoreColors[score] || scoreColors[0];
    }
  },
  sewer: {
    calculateScore: (sewerFeatures, developableArea) => {
      console.log('=== Sewer Score Calculation Start ===');
      console.log('Input validation:');
      console.log('sewerFeatures type:', typeof sewerFeatures);
      console.log('sewerFeatures is array:', Array.isArray(sewerFeatures));
      console.log('sewerFeatures:', JSON.stringify(sewerFeatures, null, 2));
      console.log('developableArea type:', typeof developableArea);
      console.log('developableArea:', JSON.stringify(developableArea, null, 2));

      // Handle null/undefined developableArea
      if (!developableArea || !developableArea.features || developableArea.features.length === 0) {
        console.log('No valid developable area provided - returning score 0');
        return { score: 0, minDistance: Infinity };
      }

      // Handle both direct features array and FeatureCollection format
      const features = Array.isArray(sewerFeatures) ? sewerFeatures : sewerFeatures?.features || [];
      console.log('Processed features:', features);

      if (!features?.length) {
        console.log('No sewer features found - returning score 0');
        return { score: 0, minDistance: Infinity };
      }

      try {
        // Process all developable area features
        const developablePolygons = [];
        
        // Process each feature in the developable area
        developableArea.features.forEach((feature, index) => {
          try {
            if (!feature.geometry || !feature.geometry.coordinates) {
              console.log(`Skipping developable area feature ${index} - invalid geometry`);
              return;
            }

            // For polygon coordinates, we need at least one ring with at least 3 points
            const developableCoords = feature.geometry.coordinates;
            
            if (!Array.isArray(developableCoords[0]) || !Array.isArray(developableCoords[0][0]) || developableCoords[0].length < 3) {
              console.error(`Invalid developable area polygon structure for feature ${index}:`, developableCoords);
              return;
            }
            
            // Create a valid GeoJSON polygon
            const developablePolygon = turf.polygon(developableCoords);
            
            // Validate the created polygon
            if (!turf.booleanValid(developablePolygon)) {
              console.error(`Invalid developable polygon geometry for feature ${index}`);
              return;
            }
            
            // Transform coordinates and create buffered polygon for this feature
            const transformedPolygon = turf.transformScale(developablePolygon, 1, { units: 'meters' });
            // Changed buffer to 20m as requested
            const bufferedPolygon = turf.buffer(transformedPolygon, 20, { units: 'meters' });
            
            developablePolygons.push(bufferedPolygon);
            console.log(`Processed developable area ${index+1}: Created buffered polygon with 20m buffer`);
          } catch (error) {
            console.error(`Error processing developable area feature ${index}:`, error);
          }
        });

        if (developablePolygons.length === 0) {
          console.error('No valid developable polygons found');
          return { score: 0, minDistance: Infinity };
        }
        
        // Check intersections with any developable area
        let intersectionFound = false;
        let minDistance = Infinity;
        
        // For each sewer feature
        features.forEach((feature, featureIndex) => {
          console.log(`\nChecking sewer feature ${featureIndex}:`, feature);
          console.log(`Sewer feature ${featureIndex} coordinates:`, feature.geometry?.coordinates);
          
          if (feature.geometry?.type === 'LineString' || feature.geometry?.type === 'MultiLineString') {
            const line = turf.lineString(feature.geometry.coordinates);
            console.log('Created line:', line);
            console.log('Line coordinates:', line.geometry.coordinates);
            
            // Check against each developable area
            developablePolygons.forEach((bufferedPolygon, areaIndex) => {
              console.log(`Testing against developable area ${areaIndex}`);
              
              const intersects = turf.booleanIntersects(bufferedPolygon, line);
              console.log(`Intersection result for feature ${featureIndex} with area ${areaIndex}:`, intersects);
              
              if (intersects) {
                intersectionFound = true;
                minDistance = 0; // If intersects, distance is 0
                console.log(`Found intersection with area ${areaIndex} - will return score 3`);
              }
            });
          } else {
            console.log(`Feature ${featureIndex} is not a LineString:`, feature.geometry?.type);
          }
        });

        const result = {
          score: intersectionFound ? 3 : 1,  // Changed score to 3 if within 20m, 1 if not
          minDistance: minDistance
        };

        console.log('=== Final Result ===');
        console.log(result);

        return result;

      } catch (error) {
        console.error('=== Sewer Score Calculation Error ===');
        console.error('Error details:', error);
        console.error('Error stack:', error.stack);
        return { score: 0, minDistance: Infinity };
      }
    },
    getScoreDescription: (score, minDistance) => {
      switch (score) {
        case 3:
          return "Developable area has sewer servicing within 20m";
        case 1:
          return "Developable area has no sewer servicing within 20m";
        default:
          return "Sewer servicing not assessed";
      }
    },
    getScoreColor: (score) => {
      return scoreColors[score] || scoreColors[0];
    }
  },
  power: {
    calculateScore: (powerFeatures, developableArea) => {
      console.log('=== Power Score Calculation Start ===');
      console.log('Input validation:');
      console.log('powerFeatures type:', typeof powerFeatures);
      console.log('powerFeatures is array:', Array.isArray(powerFeatures));
      console.log('powerFeatures:', JSON.stringify(powerFeatures, null, 2));
      console.log('developableArea type:', typeof developableArea);
      console.log('developableArea:', JSON.stringify(developableArea, null, 2));

      // Handle null/undefined developableArea
      if (!developableArea || !developableArea.features || developableArea.features.length === 0) {
        console.log('No valid developable area provided - returning score 0');
        return { score: 0, minDistance: Infinity };
      }

      // Handle both direct features array and FeatureCollection format
      const features = Array.isArray(powerFeatures) ? powerFeatures : powerFeatures?.features || [];
      console.log('Processed features:', features);

      if (!features?.length) {
        console.log('No power features found - returning score 0');
        return { score: 0, minDistance: Infinity };
      }

      try {
        // Process all developable area features
        const developablePolygons = [];
        
        // Process each feature in the developable area
        developableArea.features.forEach((feature, index) => {
          try {
            if (!feature.geometry || !feature.geometry.coordinates) {
              console.log(`Skipping developable area feature ${index} - invalid geometry`);
              return;
            }

            // For polygon coordinates, we need at least one ring with at least 3 points
            const developableCoords = feature.geometry.coordinates;
            
            if (!Array.isArray(developableCoords[0]) || !Array.isArray(developableCoords[0][0]) || developableCoords[0].length < 3) {
              console.error(`Invalid developable area polygon structure for feature ${index}:`, developableCoords);
              return;
            }
            
            // Create a valid GeoJSON polygon
            const developablePolygon = turf.polygon(developableCoords);
            
            // Validate the created polygon
            if (!turf.booleanValid(developablePolygon)) {
              console.error(`Invalid developable polygon geometry for feature ${index}`);
              return;
            }
            
            // Transform coordinates and create buffered polygon for this feature
            const transformedPolygon = turf.transformScale(developablePolygon, 1, { units: 'meters' });
            // Changed buffer to 20m as requested
            const bufferedPolygon = turf.buffer(transformedPolygon, 20, { units: 'meters' });
            
            developablePolygons.push(bufferedPolygon);
            console.log(`Processed developable area ${index+1}: Created buffered polygon with 20m buffer`);
          } catch (error) {
            console.error(`Error processing developable area feature ${index}:`, error);
          }
        });

        if (developablePolygons.length === 0) {
          console.error('No valid developable polygons found');
          return { score: 0, minDistance: Infinity };
        }
        
        // Check intersections with any developable area
        let intersectionFound = false;
        let minDistance = Infinity;
        
        // For each power feature
        features.forEach((feature, featureIndex) => {
          console.log(`\nChecking power feature ${featureIndex}:`, feature);
          console.log(`Power feature ${featureIndex} coordinates:`, feature.geometry?.coordinates);
          
          if (feature.geometry?.type === 'LineString' || feature.geometry?.type === 'MultiLineString') {
            const line = turf.lineString(feature.geometry.coordinates);
            console.log('Created line:', line);
            console.log('Line coordinates:', line.geometry.coordinates);
            
            // Check against each developable area
            developablePolygons.forEach((bufferedPolygon, areaIndex) => {
              console.log(`Testing against developable area ${areaIndex}`);
              
              const intersects = turf.booleanIntersects(bufferedPolygon, line);
              console.log(`Intersection result for feature ${featureIndex} with area ${areaIndex}:`, intersects);
              
              if (intersects) {
                intersectionFound = true;
                minDistance = 0; // If intersects, distance is 0
                console.log(`Found intersection with area ${areaIndex} - will return score 3`);
              }
            });
          } else {
            console.log(`Feature ${featureIndex} is not a LineString:`, feature.geometry?.type);
          }
        });

        const result = {
          score: intersectionFound ? 3 : 1,  // Changed score to 3 if within 20m, 1 if not
          minDistance: minDistance
        };

        console.log('=== Final Result ===');
        console.log(result);

        return result;

      } catch (error) {
        console.error('=== Power Score Calculation Error ===');
        console.error('Error details:', error);
        console.error('Error stack:', error.stack);
        return { score: 0, minDistance: Infinity };
      }
    },
    getScoreDescription: (score, minDistance) => {
      switch (score) {
        case 3:
          return "Developable area has power servicing within 20m";
        case 1:
          return "Developable area has no power servicing within 20m";
        default:
          return "Power servicing not assessed";
      }
    },
    getScoreColor: (score) => {
      return scoreColors[score] || scoreColors[0];
    }
  },
  servicing: {
    calculateScore: (waterScore, sewerScore, powerScore) => {
      // Extract scores from result objects if they exist, otherwise use the raw value
      const water = typeof waterScore === 'object' ? waterScore.score : waterScore;
      const sewer = typeof sewerScore === 'object' ? sewerScore.score : sewerScore;
      const power = typeof powerScore === 'object' ? powerScore.score : powerScore;
      
      // Count how many services are available within 20m
      // Each service will be either 3 (within 20m) or 1 (not within 20m)
      let count = 0;
      if (water === 3) count++;
      if (sewer === 3) count++;
      if (power === 3) count++;
      
      // Return the appropriate score: 3 for all services, 2 for some, 1 for none
      if (count === 3) return 3;
      if (count > 0) return 2;
      return 1;
    },
    getScoreDescription: (waterScore, sewerScore, powerScore) => {
      // Extract scores from result objects if they exist
      const water = typeof waterScore === 'object' ? waterScore.score : waterScore;
      const sewer = typeof sewerScore === 'object' ? sewerScore.score : sewerScore;
      const power = typeof powerScore === 'object' ? powerScore.score : powerScore;

      const services = [];
      if (water === 3) services.push('water');
      if (sewer === 3) services.push('sewer');
      if (power === 3) services.push('power');

      if (services.length === 0) {
        return "Limited servicing infrastructure - additional infrastructure may be required";
      }
      
      if (services.length === 1) {
        return `Site has ${services[0]} servicing within 20m`;
      }
      
      if (services.length === 2) {
        return `Site has ${services[0]} and ${services[1]} servicing within 20m`;
      }
      
      return `Site has water, sewer and power servicing within 20m`;
    },
    getScoreColor: (score) => {
      return scoreColors[score] || scoreColors[0];
    }
  },
  roads: {
    calculateScore: (roadFeatures, developableArea, allProperties = null) => {
      console.log('=== Roads Score Calculation Start ===');
      console.log('Raw road features:', JSON.stringify(roadFeatures, null, 2));
      console.log('Raw developable area:', JSON.stringify(developableArea, null, 2));
      console.log('All properties:', allProperties ? allProperties.length : 'none');

      if (!developableArea?.[0]) {
        console.log('No developable area - returning score 0');
        return { score: 0, nearbyRoads: [] };
      }

      try {
        // Process all developable areas
        const nearbyRoadsForAllAreas = [];
        
        // Handle all developable areas
        for (let areaIndex = 0; areaIndex < developableArea.length; areaIndex++) {
          console.log(`Processing developable area ${areaIndex + 1}...`);
          const developableCoords = developableArea[areaIndex].geometry.coordinates[0];
          
          const developablePolygon = turf.polygon([developableCoords]);
          console.log(`Created developable polygon ${areaIndex + 1}`);
          
          // Increase buffer distance to 30 meters to ensure we catch nearby roads
          const bufferDistance = 30;
          console.log(`Creating buffer of ${bufferDistance} meters around developable area ${areaIndex + 1}`);
          
          const bufferedPolygon = turf.buffer(developablePolygon, bufferDistance, { units: 'meters' });
          
          // Find intersecting roads for this area
          const nearbyRoadsForThisArea = [];
          
          // Handle both direct features array and FeatureCollection format
          const features = Array.isArray(roadFeatures) ? roadFeatures : 
                          roadFeatures?.features || 
                          (roadFeatures?.properties?.roadFeatures || []);
          
          console.log(`Processing ${features.length} road features for area ${areaIndex + 1}`);

          features.forEach((feature, index) => {
            if (feature.geometry?.type === 'LineString' || feature.geometry?.type === 'MultiLineString') {
              try {
                console.log(`\nProcessing road feature ${index}:`);
                console.log(`Feature type: ${feature.geometry.type}`);
                console.log(`Feature properties:`, feature.properties);

                if (feature.geometry.type === 'LineString') {
                  // For LineString, create a line directly from coordinates
                  const line = turf.lineString(feature.geometry.coordinates);
                  console.log(`LineString coordinates:`, feature.geometry.coordinates);
                  console.log(`Created line feature:`, line);
                  
                  const intersects = turf.booleanIntersects(bufferedPolygon, line);
                  console.log(`Intersection check with buffered polygon: ${intersects}`);
                  console.log(`Buffer distance used: ${bufferDistance}m`);
                  
                  if (intersects) {
                    const roadInfo = {
                      name: feature.properties?.ROADNAMEST || 'Unnamed Road',
                      function: feature.properties?.FUNCTION || 'Unknown',
                      laneCount: parseInt(feature.properties?.LANECOUNT) || 0
                    };
                    console.log(`Road info for intersecting road:`, roadInfo);
                    
                    // Skip roads with blank names or 0 lanes
                    if (roadInfo.name !== 'Unnamed Road' && roadInfo.laneCount !== 0) {
                      // Check if this road is already in the array (avoid duplicates)
                      const existingRoad = nearbyRoadsForThisArea.find(r => 
                        r.name === roadInfo.name && r.function === roadInfo.function
                      );
                      if (!existingRoad) {
                        nearbyRoadsForThisArea.push(roadInfo);
                        console.log(`Added new road to area ${areaIndex + 1}:`, roadInfo);
                      } else {
                        console.log(`Road already exists in area ${areaIndex + 1}, skipping`);
                      }
                    } else {
                      console.log(`Skipping road with ${roadInfo.name === 'Unnamed Road' ? 'blank name' : 'zero lanes'}`);
                    }
                  }
                } else if (feature.geometry.type === 'MultiLineString') {
                  // For MultiLineString, check each line segment
                  console.log(`MultiLineString with ${feature.geometry.coordinates.length} segments`);
                  let hasIntersection = false;
                  
                  for (const [segmentIndex, lineCoords] of feature.geometry.coordinates.entries()) {
                    if (hasIntersection) {
                      console.log(`Already found intersection, skipping remaining segments`);
                      break;
                    }
                    
                    console.log(`\nProcessing segment ${segmentIndex + 1}/${feature.geometry.coordinates.length}`);
                    console.log(`Segment coordinates:`, lineCoords);
                    
                    const segmentLine = turf.lineString(lineCoords);
                    console.log(`Created line segment:`, segmentLine);
                    
                    const intersects = turf.booleanIntersects(bufferedPolygon, segmentLine);
                    console.log(`Segment ${segmentIndex + 1} intersection check: ${intersects}`);
                    console.log(`Buffer distance used: ${bufferDistance}m`);
                    
                    if (intersects) {
                      const roadInfo = {
                        name: feature.properties?.ROADNAMEST || 'Unnamed Road',
                        function: feature.properties?.FUNCTION || 'Unknown',
                        laneCount: parseInt(feature.properties?.LANECOUNT) || 0
                      };
                      console.log(`Road info for intersecting segment:`, roadInfo);
                      
                      // Skip roads with blank names or 0 lanes
                      if (roadInfo.name !== 'Unnamed Road' && roadInfo.laneCount !== 0) {
                        // Check if this road is already in the array (avoid duplicates)
                        const existingRoad = nearbyRoadsForThisArea.find(r => 
                          r.name === roadInfo.name && r.function === roadInfo.function
                        );
                        if (!existingRoad) {
                          nearbyRoadsForThisArea.push(roadInfo);
                          console.log(`Added new road from segment ${segmentIndex + 1} to area ${areaIndex + 1}:`, roadInfo);
                          hasIntersection = true;
                        } else {
                          console.log(`Road from segment ${segmentIndex + 1} already exists in area ${areaIndex + 1}, skipping`);
                        }
                      } else {
                        console.log(`Skipping road with ${roadInfo.name === 'Unnamed Road' ? 'blank name' : 'zero lanes'}`);
                      }
                    }
                  }
                }
              } catch (error) {
                console.error(`Error processing road feature ${index}:`, error);
                console.error('Error details:', {
                  featureType: feature.geometry?.type,
                  coordinates: feature.geometry?.coordinates,
                  properties: feature.properties
                });
              }
            } else {
              console.log(`Skipping feature ${index} - not a LineString or MultiLineString (type: ${feature.geometry?.type})`);
            }
          });
          
          // Add area-specific roads to the combined list
          nearbyRoadsForAllAreas.push({
            areaIndex,
            nearbyRoads: nearbyRoadsForThisArea
          });
        }
        
        console.log('\nNearby roads for all areas:', nearbyRoadsForAllAreas);
        
        // If we have no nearby roads for any area, return low score
        if (nearbyRoadsForAllAreas.every(area => area.nearbyRoads.length === 0)) {
          console.log('No nearby roads found for any developable area - returning score 1');
          return { score: 1, nearbyRoads: [], nearbyRoadsByArea: nearbyRoadsForAllAreas, noRoadAccess: true };
        }

        // Calculate overall score by checking if ANY developable area has roads with multiple lanes
        const hasMultipleLanes = nearbyRoadsForAllAreas.some(area => 
          area.nearbyRoads.some(road => road.laneCount >= 2)
        );
        
        // Flatten all roads for description purposes
        const allNearbyRoads = nearbyRoadsForAllAreas.flatMap(area => area.nearbyRoads);
        
        // Remove duplicates based on road name and function
        const uniqueRoads = [];
        const roadKeys = new Set();
        
        allNearbyRoads.forEach(road => {
          const key = `${road.name}|${road.function}`;
          if (!roadKeys.has(key)) {
            roadKeys.add(key);
            uniqueRoads.push(road);
          }
        });
        
        const score = hasMultipleLanes ? 3 : 2;
        console.log(`Final score: ${score} (Multiple lanes: ${hasMultipleLanes})`);

        return { 
          score, 
          nearbyRoads: uniqueRoads,
          nearbyRoadsByArea: nearbyRoadsForAllAreas,
          noRoadAccess: false
        };
      } catch (error) {
        console.error('Error calculating roads score:', error);
        console.error('Error stack:', error.stack);
        return { score: 0, nearbyRoads: [], noRoadAccess: true };
      }
    },
    getScoreDescription: (scoreObj) => {
      const { score, nearbyRoads = [], noRoadAccess } = scoreObj;

      // Explicitly check for no road access
      if (noRoadAccess || score === 1) {
        return "The developable areas do not have road access.";
      }

      if (score === 3 || score === 2) {
        const roadDescriptions = nearbyRoads.map(road => {
          // Add spaces between words in road function classification
          const formattedFunction = road.function.replace(/([A-Z])/g, ' $1').trim();
          return `${road.name} which is a ${formattedFunction.toLowerCase()} with ${road.laneCount} lane${road.laneCount !== 1 ? 's' : ''}`
        });

        if (roadDescriptions.length === 0) {
          return "Road information not available";
        } else if (roadDescriptions.length === 1) {
          return `The developable areas are accessed via ${roadDescriptions[0]}.`;
        } else {
          const lastRoad = roadDescriptions.pop();
          return `The developable areas are accessed via ${roadDescriptions.join(', ')} and ${lastRoad}.`;
        }
      }

      return "Road access information could not be determined.";
    },
    getScoreColor: (score) => {
      return scoreColors[score] || scoreColors[0];
    }
  },
  udpPrecincts: {
    calculateScore: (precinctFeatures, developableArea) => {
      console.log('=== UDP Precincts Score Calculation Start ===');
      console.log('Input validation:');
      console.log('precinctFeatures:', JSON.stringify(precinctFeatures, null, 2));
      console.log('developableArea:', JSON.stringify(developableArea, null, 2));

      // Check for LMR overlap first (this takes precedence if present)
      // Look for both direct overlap and developable area overlap
      const lmrOverlap = precinctFeatures?.lmrOverlap || 
                        (precinctFeatures?.properties?.lmrOverlap) || 
                        { hasOverlap: false, primaryOverlap: null };
      
      // Also check for developable area LMR overlap that's stored separately
      const devAreaLmrOverlap = precinctFeatures?.developableAreaLmrOverlap || 
                               (precinctFeatures?.properties?.developableAreaLmrOverlap) || 
                               [];
      
      console.log('LMR overlap data:', lmrOverlap);
      console.log('Developable area LMR overlap:', devAreaLmrOverlap);
      
      // Check if any developable area is within LMR/TOD area
      const hasDevAreaInLmr = devAreaLmrOverlap.some(overlap => overlap.hasOverlap && overlap.primaryOverlap);
      const lmrAreaName = hasDevAreaInLmr ? 
                         devAreaLmrOverlap.find(o => o.hasOverlap)?.primaryOverlap : 
                         lmrOverlap.primaryOverlap;
      
      // If we have direct LMR overlap or any developable area is in an LMR zone, return score 3
      if ((lmrOverlap.hasOverlap && lmrOverlap.primaryOverlap) || hasDevAreaInLmr) {
        console.log('Property or developable area overlaps with LMR area:', lmrAreaName);
        return { 
          score: 3, 
          minDistance: 0, 
          nearestPrecinct: null,
          lmrOverlap: lmrOverlap,
          devAreaLmrOverlap: devAreaLmrOverlap,
          hasDevAreaInLmr
        };
      }

      if (!developableArea?.[0]) {
        console.log('No developable area - returning score 0');
        return { 
          score: 0, 
          minDistance: Infinity, 
          nearestPrecinct: null, 
          lmrOverlap, 
          devAreaLmrOverlap 
        };
      }

      try {
        // Process each developable area to find closest UDP precinct
        const areaResults = [];
        
        for (let areaIndex = 0; areaIndex < developableArea.length; areaIndex++) {
          console.log(`Processing developable area ${areaIndex + 1}...`);
          const developableCoords = developableArea[areaIndex].geometry.coordinates[0];
          const developablePolygon = turf.polygon([developableCoords]);
          
          // Handle both direct features array and FeatureCollection format
          const features = Array.isArray(precinctFeatures) ? precinctFeatures : 
                          precinctFeatures?.features || [];
          
          console.log(`Processing ${features.length} precinct features for area ${areaIndex + 1}`);

          let minDistance = Infinity;
          let nearestPrecinct = null;
          let intersectionFound = false;

          features.forEach((feature, index) => {
            if (!feature.geometry) return;

            try {
              if (feature.geometry.type === 'MultiPolygon') {
                // For MultiPolygon, check each polygon
                feature.geometry.coordinates.forEach((polygonCoords, polyIndex) => {
                  const polygon = turf.polygon(polygonCoords);
                  
                  // First check for intersection
                  const intersects = turf.booleanIntersects(developablePolygon, polygon);
                  
                  if (intersects) {
                    intersectionFound = true;
                    minDistance = 0;
                    nearestPrecinct = feature.properties?.Precinct_Name || null;
                    return;
                  }

                  // If no intersection, calculate minimum distance between boundaries
                  if (!intersectionFound) {
                    const distance = turf.distance(
                      turf.nearestPoint(turf.centerOfMass(developablePolygon), turf.explode(polygon)),
                      turf.nearestPoint(turf.centerOfMass(polygon), turf.explode(developablePolygon)),
                      { units: 'meters' }
                    );
                    
                    if (distance < minDistance) {
                      minDistance = distance;
                      nearestPrecinct = feature.properties?.Precinct_Name || null;
                    }
                  }
                });
              } else if (feature.geometry.type === 'Polygon') {
                const precinctPolygon = turf.polygon(feature.geometry.coordinates);
                
                // First check for intersection
                const intersects = turf.booleanIntersects(developablePolygon, precinctPolygon);
                
                if (intersects) {
                  intersectionFound = true;
                  minDistance = 0;
                  nearestPrecinct = feature.properties?.Precinct_Name || null;
                  return;
                }

                // If no intersection, calculate minimum distance between boundaries
                if (!intersectionFound) {
                  const distance = turf.distance(
                    turf.nearestPoint(turf.centerOfMass(developablePolygon), turf.explode(precinctPolygon)),
                    turf.nearestPoint(turf.centerOfMass(precinctPolygon), turf.explode(developablePolygon)),
                    { units: 'meters' }
                  );
                  
                  if (distance < minDistance) {
                    minDistance = distance;
                    nearestPrecinct = feature.properties?.Precinct_Name || null;
                  }
                }
              }
            } catch (error) {
              console.error(`Error processing precinct feature ${index}:`, error);
            }
          });
          
          areaResults.push({
            areaIndex,
            minDistance,
            nearestPrecinct,
            intersectionFound
          });
        }
        
        console.log('Results for all developable areas:', areaResults);
        
        // Find best result across all areas (closest to UDP precinct)
        const bestResult = areaResults.reduce((best, current) => {
          return current.minDistance < best.minDistance ? current : best;
        }, { minDistance: Infinity, nearestPrecinct: null });
        
        // Check for LMR proximity (if we don't have direct overlap)
        const hasNearbyLMR = lmrOverlap?.hasOverlap || false;
        
        let score;
        if (bestResult.minDistance === 0 || bestResult.minDistance <= 800) {
          score = 3;
        } else if (bestResult.minDistance <= 1600 || hasNearbyLMR) {
          score = 2;
        } else {
          score = 1;
        }

        console.log('\nFinal result:', { 
          score, 
          bestResult,
          lmrOverlap, 
          hasNearbyLMR 
        });
        
        return { 
          score, 
          minDistance: bestResult.minDistance, 
          nearestPrecinct: bestResult.nearestPrecinct,
          lmrOverlap, 
          hasNearbyLMR,
          developableAreaResults: areaResults
        };
      } catch (error) {
        console.error('Error calculating UDP precincts score:', error);
        console.error('Error stack:', error.stack);
        return { 
          score: 0, 
          minDistance: Infinity, 
          nearestPrecinct: null, 
          lmrOverlap,
          devAreaLmrOverlap
        };
      }
    },
    getScoreDescription: (scoreObj) => {
      const { score, minDistance, nearestPrecinct, lmrOverlap, hasNearbyLMR, hasDevAreaInLmr, developableAreaResults } = scoreObj;
      
      // Check for LMR overlap first (highest priority)
      if (hasDevAreaInLmr) {
        const lmrAreaName = scoreObj.devAreaLmrOverlap.find(o => o.hasOverlap)?.primaryOverlap;
        return `One or more developable areas are within a ${lmrAreaName}.`;
      } else if (lmrOverlap?.hasOverlap && lmrOverlap.primaryOverlap) {
        return `The site is within a ${lmrOverlap.primaryOverlap}.`;
      }
      
      // Special case for when any developable area is within a precinct
      if (developableAreaResults && developableAreaResults.some(result => result.intersectionFound)) {
        const inPrecinctAreas = developableAreaResults.filter(result => result.intersectionFound);
        if (inPrecinctAreas.length === 1) {
          return `Developable area ${inPrecinctAreas[0].areaIndex + 1} is within a UDP growth precinct (${inPrecinctAreas[0].nearestPrecinct}).`;
        } else {
          const areaNumbers = inPrecinctAreas.map(area => area.areaIndex + 1).join(', ');
          return `Multiple developable areas (${areaNumbers}) are within UDP growth precincts.`;
        }
      }
      
      // Format distance based on value for other cases
      let formattedDistance;
      if (minDistance >= 1000) {
        formattedDistance = `${(minDistance / 1000).toFixed(1)} kilometres`;
      } else {
        formattedDistance = `${Math.round(minDistance)} metres`;
      }
      
      switch (score) {
        case 3:
          return `The closest developable area is within ${formattedDistance} of a UDP growth precinct (${nearestPrecinct}).`;
        case 2:
          if (hasNearbyLMR) {
            return `The developable areas are in close proximity to a TOD area or LMR area.`;
          }
          return `The closest developable area is within ${formattedDistance} of a UDP growth precinct (${nearestPrecinct}).`;
        case 1:
          return `All developable areas are greater than 1.6 kilometres from a UDP precinct. Additionally, the site is not in a TOD area or LMR area.`;
        default:
          return "UDP precinct proximity not assessed";
      }
    },
    getScoreColor: (score) => {
      return scoreColors[score] || scoreColors[0];
    }
  },
  flood: {
    calculateScore: (floodFeatures, developableArea) => {
      console.log('=== Flood Score Calculation Start ===');
      console.log('Input validation:');
      console.log('floodFeatures:', JSON.stringify(floodFeatures, null, 2));
      console.log('developableArea:', JSON.stringify(developableArea, null, 2));

      // Ensure developableArea is an array
      const developableAreas = Array.isArray(developableArea) ? developableArea : [developableArea];

      if (!developableAreas || developableAreas.length === 0 || !developableAreas[0]) {
        console.log('No developable area - returning score 0');
        return { score: 0, minDistance: Infinity };
      }

      try {
        // Process all developable areas
        const areaResults = [];
        
        // Process each feature in the developable area
        for (let areaIndex = 0; areaIndex < developableAreas.length; areaIndex++) {
          try {
            if (!developableAreas[areaIndex].geometry || !developableAreas[areaIndex].geometry.coordinates) {
              console.log(`Skipping developable area feature ${areaIndex} - invalid geometry`);
              continue;
            }
            
            const developableCoords = developableAreas[areaIndex].geometry.coordinates[0];
            console.log(`Developable coordinates for area ${areaIndex}:`, developableCoords);
            
            const developablePolygon = turf.polygon([developableCoords]);
            console.log(`Created developable polygon for area ${areaIndex}:`, JSON.stringify(developablePolygon, null, 2));

            // Handle both direct features array and FeatureCollection format
            const features = Array.isArray(floodFeatures) ? floodFeatures : 
                            floodFeatures?.features || 
                            (floodFeatures?.properties?.floodFeatures || []);
            
            console.log(`Processing ${features.length} flood features for area ${areaIndex}`);

            // First check if developable area intersects with any flood features
            let intersectionFound = false;
            let minDistance = Infinity;

            features.forEach((feature, index) => {
              if (!feature.geometry) return;

              try {
                if (feature.geometry.type === 'MultiPolygon') {
                  // For MultiPolygon, check each polygon
                  feature.geometry.coordinates.forEach((polygonCoords, polyIndex) => {
                    console.log(`\nProcessing polygon ${polyIndex + 1} of MultiPolygon ${index + 1} for area ${areaIndex}`);
                    const polygon = turf.polygon(polygonCoords);
                    const intersects = turf.booleanIntersects(developablePolygon, polygon);
                    console.log(`Polygon ${polyIndex + 1} intersects with area ${areaIndex}:`, intersects);
                    
                    if (intersects) {
                      intersectionFound = true;
                      minDistance = 0;
                      console.log(`Found intersection for area ${areaIndex} - setting minDistance to 0`);
                      return;
                    }

                    // Calculate minimum distance between polygon boundaries
                    try {
                      // Create points along the boundaries of both polygons
                      const developablePoints = turf.explode(developablePolygon);
                      const floodPoints = turf.explode(polygon);
                      
                      // Find the nearest points between the two sets of points
                      developablePoints.features.forEach(dPoint => {
                        floodPoints.features.forEach(fPoint => {
                          const distance = turf.distance(dPoint, fPoint, { units: 'meters' });
                          if (distance < minDistance) {
                            minDistance = distance;
                            console.log(`Area ${areaIndex}: New minimum distance found:`, minDistance.toFixed(2), 'm');
                          }
                        });
                      });
                    } catch (distError) {
                      console.error(`Error calculating distance for area ${areaIndex}:`, distError);
                    }
                  });
                } else if (feature.geometry.type === 'Polygon') {
                  // For regular Polygon
                  console.log(`\nProcessing regular polygon ${index + 1} for area ${areaIndex}`);
                  const floodPolygon = turf.polygon(feature.geometry.coordinates);
                  const intersects = turf.booleanIntersects(developablePolygon, floodPolygon);
                  console.log(`Polygon ${index + 1} intersects with area ${areaIndex}:`, intersects);
                  
                  if (intersects) {
                    intersectionFound = true;
                    minDistance = 0;
                    console.log(`Found intersection for area ${areaIndex} - setting minDistance to 0`);
                    return;
                  }

                  // Calculate minimum distance between polygon boundaries
                  try {
                    // Create points along the boundaries of both polygons
                    const developablePoints = turf.explode(developablePolygon);
                    const floodPoints = turf.explode(floodPolygon);
                    
                    // Find the nearest points between the two sets of points
                    developablePoints.features.forEach(dPoint => {
                      floodPoints.features.forEach(fPoint => {
                        const distance = turf.distance(dPoint, fPoint, { units: 'meters' });
                        if (distance < minDistance) {
                          minDistance = distance;
                          console.log(`Area ${areaIndex}: New minimum distance found:`, minDistance.toFixed(2), 'm');
                        }
                      });
                    });
                  } catch (distError) {
                    console.error(`Error calculating distance for area ${areaIndex}:`, distError);
                  }
                }
              } catch (error) {
                console.error(`Error processing flood feature ${index} for area ${areaIndex}:`, error);
              }
            });

            let score;
            if (intersectionFound) {
              score = 1; // Developable area is impacted by flood
              console.log(`Area ${areaIndex}: Intersection found - setting score to 1`);
            } else if (minDistance <= 500) {
              score = 2; // Within 500m of flood area
              console.log(`Area ${areaIndex}: Distance ${minDistance.toFixed(2)}m is within 500m - setting score to 2`);
            } else {
              score = 3; // Further than 500m from flood area
              console.log(`Area ${areaIndex}: Distance ${minDistance.toFixed(2)}m is beyond 500m - setting score to 3`);
            }

            areaResults.push({
              areaIndex,
              score, 
              minDistance
            });
          } catch (error) {
            console.error(`Error processing developable area ${areaIndex}:`, error);
            areaResults.push({
              areaIndex,
              score: 0,
              minDistance: Infinity
            });
          }
        }

        console.log('\nResults for all developable areas:', areaResults);
        
        // Find worst score (lowest is worst) across all areas
        const worstResult = areaResults.reduce((worst, current) => {
          return current.score < worst.score ? current : 
                 (current.score === worst.score && current.minDistance < worst.minDistance) ? current : worst;
        }, { score: 3, minDistance: Infinity });
        
        console.log('\nFinal result (worst case):', worstResult);
        return worstResult;
      } catch (error) {
        console.error('Error calculating flood score:', error);
        console.error('Error stack:', error.stack);
        return { score: 0, minDistance: Infinity };
      }
    },
    getScoreDescription: (scoreObj) => {
      const { score, minDistance, areaIndex } = scoreObj;
      
      
      switch (score) {
        case 3:
          return `Developable area is not impacted by flooding and is ${minDistance.toFixed(0)}m from the nearest flood extent.`;
        case 2:
          return `Developable area is not impacted by flooding but is ${minDistance.toFixed(0)}m from the nearest flood extent.`;
        case 1:
          return `Developable area is impacted by flooding.`;
        default:
          return "Flood risk not assessed";
      }
    },
    getScoreColor: (score) => {
      return scoreColors[score] || scoreColors[0];
    }
  },
  bushfire: {
    calculateScore: (bushfireFeatures, developableArea) => {
      console.log('=== Bushfire Score Calculation Start ===');
      console.log('Input validation:');
      console.log('bushfireFeatures:', JSON.stringify(bushfireFeatures, null, 2));
      console.log('developableArea:', JSON.stringify(developableArea, null, 2));

      // Ensure developableArea is an array
      const developableAreas = Array.isArray(developableArea) ? developableArea : [developableArea];

      if (!developableAreas || developableAreas.length === 0 || !developableAreas[0]) {
        console.log('No developable area - returning score 0');
        return { score: 0, minDistance: Infinity };
      }

      try {
        // Process all developable areas
        const areaResults = [];
        
        // Process each feature in the developable area
        for (let areaIndex = 0; areaIndex < developableAreas.length; areaIndex++) {
          try {
            if (!developableAreas[areaIndex].geometry || !developableAreas[areaIndex].geometry.coordinates) {
              console.log(`Skipping developable area feature ${areaIndex} - invalid geometry`);
              continue;
            }
            
            const developableCoords = developableAreas[areaIndex].geometry.coordinates[0];
            console.log(`Developable coordinates for area ${areaIndex}:`, developableCoords);
            
            const developablePolygon = turf.polygon([developableCoords]);
            console.log(`Created developable polygon for area ${areaIndex}:`, JSON.stringify(developablePolygon, null, 2));

            // Handle both direct features array and FeatureCollection format
            const features = Array.isArray(bushfireFeatures) ? bushfireFeatures : 
                            bushfireFeatures?.features || 
                            (bushfireFeatures?.properties?.bushfireFeatures || []);
            
            console.log(`Processing ${features.length} bushfire features for area ${areaIndex}`);

            // First check if developable area intersects with any bushfire features
            let intersectionFound = false;
            let minDistance = Infinity;

            features.forEach((feature, index) => {
              if (!feature.geometry) return;

              try {
                if (feature.geometry.type === 'MultiPolygon') {
                  // For MultiPolygon, check each polygon
                  feature.geometry.coordinates.forEach((polygonCoords, polyIndex) => {
                    console.log(`\nProcessing polygon ${polyIndex + 1} of MultiPolygon ${index + 1} for area ${areaIndex}`);
                    const polygon = turf.polygon(polygonCoords);
                    const intersects = turf.booleanIntersects(developablePolygon, polygon);
                    console.log(`Polygon ${polyIndex + 1} intersects with area ${areaIndex}:`, intersects);
                    
                    if (intersects) {
                      intersectionFound = true;
                      minDistance = 0;
                      console.log(`Found intersection for area ${areaIndex} - setting minDistance to 0`);
                      return;
                    }

                    // Calculate minimum distance between polygon boundaries
                    try {
                      // Create points along the boundaries of both polygons
                      const developablePoints = turf.explode(developablePolygon);
                      const bushfirePoints = turf.explode(polygon);
                      
                      // Find the nearest points between the two sets of points
                      developablePoints.features.forEach(dPoint => {
                        bushfirePoints.features.forEach(fPoint => {
                          const distance = turf.distance(dPoint, fPoint, { units: 'meters' });
                          if (distance < minDistance) {
                            minDistance = distance;
                            console.log(`Area ${areaIndex}: New minimum distance found:`, minDistance.toFixed(2), 'm');
                          }
                        });
                      });
                    } catch (distError) {
                      console.error(`Error calculating distance for area ${areaIndex}:`, distError);
                    }
                  });
                } else if (feature.geometry.type === 'Polygon') {
                  // For regular Polygon
                  console.log(`\nProcessing regular polygon ${index + 1} for area ${areaIndex}`);
                  const bushfirePolygon = turf.polygon(feature.geometry.coordinates);
                  const intersects = turf.booleanIntersects(developablePolygon, bushfirePolygon);
                  console.log(`Polygon ${index + 1} intersects with area ${areaIndex}:`, intersects);
                  
                  if (intersects) {
                    intersectionFound = true;
                    minDistance = 0;
                    console.log(`Found intersection for area ${areaIndex} - setting minDistance to 0`);
                    return;
                  }

                  // Calculate minimum distance between polygon boundaries
                  try {
                    // Create points along the boundaries of both polygons
                    const developablePoints = turf.explode(developablePolygon);
                    const bushfirePoints = turf.explode(bushfirePolygon);
                    
                    // Find the nearest points between the two sets of points
                    developablePoints.features.forEach(dPoint => {
                      bushfirePoints.features.forEach(fPoint => {
                        const distance = turf.distance(dPoint, fPoint, { units: 'meters' });
                        if (distance < minDistance) {
                          minDistance = distance;
                          console.log(`Area ${areaIndex}: New minimum distance found:`, minDistance.toFixed(2), 'm');
                        }
                      });
                    });
                  } catch (distError) {
                    console.error(`Error calculating distance for area ${areaIndex}:`, distError);
                  }
                }
              } catch (error) {
                console.error(`Error processing bushfire feature ${index} for area ${areaIndex}:`, error);
              }
            });

            let score;
            if (intersectionFound) {
              score = 1; // Developable area is impacted by bushfire risk
              console.log(`Area ${areaIndex}: Intersection found - setting score to 1`);
            } else if (minDistance <= 100) {
              score = 2; // Within 100m of bushfire risk area
              console.log(`Area ${areaIndex}: Distance ${minDistance.toFixed(2)}m is within 100m - setting score to 2`);
            } else {
              score = 3; // Further than 100m from bushfire risk area
              console.log(`Area ${areaIndex}: Distance ${minDistance.toFixed(2)}m is beyond 100m - setting score to 3`);
            }

            areaResults.push({
              areaIndex,
              score, 
              minDistance
            });
          } catch (error) {
            console.error(`Error processing developable area ${areaIndex}:`, error);
            areaResults.push({
              areaIndex,
              score: 0,
              minDistance: Infinity
            });
          }
        }

        console.log('\nResults for all developable areas:', areaResults);
        
        // Find worst score (lowest is worst) across all areas
        const worstResult = areaResults.reduce((worst, current) => {
          return current.score < worst.score ? current : 
                 (current.score === worst.score && current.minDistance < worst.minDistance) ? current : worst;
        }, { score: 3, minDistance: Infinity });
        
        console.log('\nFinal result (worst case):', worstResult);
        return worstResult;
      } catch (error) {
        console.error('Error calculating bushfire score:', error);
        console.error('Error stack:', error.stack);
        return { score: 0, minDistance: Infinity };
      }
    },
    getScoreDescription: (scoreObj) => {
      const { score, minDistance, areaIndex } = scoreObj;
            
      switch (score) {
        case 3:
          return `Developable area is not impacted by bushfire risk and is ${minDistance.toFixed(0)}m from the nearest bushfire prone area.`;
        case 2:
          return `Developable area is not impacted by bushfire risk but is ${minDistance.toFixed(0)}m from the nearest bushfire prone area.`;
        case 1:
          return `Developable area is within a bushfire prone area.`;
        default:
          return "Bushfire risk not assessed";
      }
    },
    getScoreColor: (score) => {
      return scoreColors[score] || scoreColors[0];
    }
  },
  
};

export default scoringCriteria;

// Add the new scoring methods
scoringCriteria.contamination = {
  calculateScore: (contaminationFeatures, developableArea) => {
    console.log('=== Contamination Score Calculation Start ===');
    console.log('Input validation:');
    console.log('contaminationFeatures:', JSON.stringify(contaminationFeatures, null, 2));
    console.log('developableArea:', JSON.stringify(developableArea, null, 2));

    // Ensure developableArea is an array
    const developableAreas = Array.isArray(developableArea) ? developableArea : [developableArea];

    if (!developableAreas || developableAreas.length === 0 || !developableAreas[0]) {
      console.log('No developable area provided - returning score 0');
      return { score: 0, minDistance: Infinity, allFeatures: [] };
    }

    try {
      // Process all developable areas
      const areaResults = [];
      // Track all contamination features and their distances
      const allContaminationFeatures = [];
      
      // Process each feature in the developable area
      for (let areaIndex = 0; areaIndex < developableAreas.length; areaIndex++) {
        try {
          if (!developableAreas[areaIndex].geometry || !developableAreas[areaIndex].geometry.coordinates) {
            console.log(`Skipping developable area feature ${areaIndex} - invalid geometry`);
            continue;
          }
          
          const developableCoords = developableAreas[areaIndex].geometry.coordinates[0];
          console.log(`Developable coordinates for area ${areaIndex}:`, developableCoords);
          
          const developablePolygon = turf.polygon([developableCoords]);
          console.log(`Created developable polygon for area ${areaIndex}:`, JSON.stringify(developablePolygon, null, 2));

          // Handle both direct features array and FeatureCollection format
          const features = Array.isArray(contaminationFeatures) ? contaminationFeatures : 
                          contaminationFeatures?.features || [];
          
          console.log(`Processing ${features.length} contamination features for area ${areaIndex}`);

          // First check if developable area intersects with any contamination features
          let intersectionFound = false;
          let minDistance = Infinity;
          let nearestFeature = null;

          features.forEach((feature, index) => {
            try {
              // Handle point features from lat/long coordinates
              if (!feature.geometry && feature.properties?.Latitude && feature.properties?.Longitude) {
                const featurePoint = turf.point([
                  parseFloat(feature.properties.Longitude),
                  parseFloat(feature.properties.Latitude)
                ]);
                console.log(`Created point from lat/long for feature ${index} for area ${areaIndex}:`, featurePoint);

                // Check if point is inside developable area
                const pointInPolygon = turf.booleanPointInPolygon(featurePoint, developablePolygon);
                if (pointInPolygon) {
                  intersectionFound = true;
                  minDistance = 0;
                  nearestFeature = feature;
                  console.log(`Area ${areaIndex}: Point is inside developable area - setting minDistance to 0`);
                } else {
                  // Calculate distance from point to developable area boundary (not centroid)
                  // Use nearestPointOnLine with the polygon boundary
                  const polygonBoundary = turf.lineString(developableCoords);
                  const nearestPoint = turf.nearestPointOnLine(polygonBoundary, featurePoint);
                  const distance = nearestPoint.properties.dist * 1000; // Convert to meters
                  
                  console.log(`Distance from point feature ${index} to area ${areaIndex} boundary:`, distance.toFixed(2), 'm');

                  // Store this feature and its distance for the description
                  allContaminationFeatures.push({
                    feature,
                    distance,
                    areaIndex
                  });

                  if (distance < minDistance) {
                    minDistance = distance;
                    nearestFeature = feature;
                    console.log(`Area ${areaIndex}: New minimum distance found:`, minDistance.toFixed(2), 'm');
                  }
                }
              }
              // Handle polygon features
              else if (feature.geometry?.type === 'MultiPolygon') {
                feature.geometry.coordinates.forEach((polygonCoords, polyIndex) => {
                  console.log(`\nProcessing polygon ${polyIndex + 1} of MultiPolygon ${index + 1} for area ${areaIndex}`);
                  const polygon = turf.polygon(polygonCoords);
                  const intersects = turf.booleanIntersects(developablePolygon, polygon);
                  console.log(`Polygon ${polyIndex + 1} intersects with area ${areaIndex}:`, intersects);
                  
                  if (intersects) {
                    intersectionFound = true;
                    minDistance = 0;
                    nearestFeature = feature;
                    console.log(`Area ${areaIndex}: Found intersection - setting minDistance to 0`);
                    
                    // Store this feature for the description
                    allContaminationFeatures.push({
                      feature,
                      distance: 0,
                      areaIndex
                    });
                    
                    return;
                  }

                  // Calculate minimum distance between polygon boundaries (not centroids)
                  try {
                    // Create lines from polygon boundaries
                    const developableBoundary = turf.lineString(developableCoords);
                    const contaminationBoundary = turf.lineString(polygonCoords[0]);
                    
                    // Find nearest points between the boundaries
                    const nearestPointOnDevelopable = turf.nearestPointOnLine(developableBoundary, turf.centroid(polygon));
                    const nearestPointOnContamination = turf.nearestPointOnLine(contaminationBoundary, turf.centroid(developablePolygon));
                    
                    // Calculate distance between these nearest points
                    const distance = turf.distance(
                      nearestPointOnDevelopable,
                      nearestPointOnContamination,
                      { units: 'meters' }
                    );
                    
                    // Store this feature and its distance for the description
                    allContaminationFeatures.push({
                      feature,
                      distance,
                      areaIndex
                    });
                    
                    if (distance < minDistance) {
                      minDistance = distance;
                      nearestFeature = feature;
                      console.log(`Area ${areaIndex}: New minimum distance found:`, minDistance.toFixed(2), 'm');
                    }
                  } catch (distError) {
                    console.error(`Error calculating polygon distance for area ${areaIndex}:`, distError);
                  }
                });
              }
              else if (feature.geometry?.type === 'Polygon') {
                const polygon = turf.polygon(feature.geometry.coordinates);
                const intersects = turf.booleanIntersects(developablePolygon, polygon);
                console.log(`Polygon ${index} intersects with area ${areaIndex}:`, intersects);
                
                if (intersects) {
                  intersectionFound = true;
                  minDistance = 0;
                  nearestFeature = feature;
                  console.log(`Area ${areaIndex}: Found intersection - setting minDistance to 0`);
                  
                  // Store this feature for the description
                  allContaminationFeatures.push({
                    feature,
                    distance: 0,
                    areaIndex
                  });
                  
                  return;
                }

                // Calculate minimum distance between polygon boundaries (not centroids)
                try {
                  // Create lines from polygon boundaries
                  const developableBoundary = turf.lineString(developableCoords);
                  const contaminationBoundary = turf.lineString(feature.geometry.coordinates[0]);
                  
                  // Find nearest points between the boundaries
                  const nearestPointOnDevelopable = turf.nearestPointOnLine(developableBoundary, turf.centroid(polygon));
                  const nearestPointOnContamination = turf.nearestPointOnLine(contaminationBoundary, turf.centroid(developablePolygon));
                  
                  // Calculate distance between these nearest points
                  const distance = turf.distance(
                    nearestPointOnDevelopable,
                    nearestPointOnContamination,
                    { units: 'meters' }
                  );
                  
                  // Store this feature and its distance for the description
                  allContaminationFeatures.push({
                    feature,
                    distance,
                    areaIndex
                  });
                  
                  if (distance < minDistance) {
                    minDistance = distance;
                    nearestFeature = feature;
                    console.log(`Area ${areaIndex}: New minimum distance found:`, minDistance.toFixed(2), 'm');
                  }
                } catch (distError) {
                  console.error(`Error calculating polygon distance for area ${areaIndex}:`, distError);
                }
              }
            } catch (error) {
              console.error(`Error processing contamination feature ${index} for area ${areaIndex}:`, error);
            }
          });

          let score;
          if (intersectionFound || minDistance <= 20) {
            score = 1; // Developable area is impacted by contamination or within 20m
            console.log(`Area ${areaIndex}: Site is impacted by contamination or within 20m - setting score to 1`);
          } else if (minDistance <= 100) {
            score = 2; // Within 100m of contaminated site
            console.log(`Area ${areaIndex}: Distance ${minDistance.toFixed(2)}m is within 100m - setting score to 2`);
          } else {
            score = 3; // Further than 100m from contaminated site
            console.log(`Area ${areaIndex}: Distance ${minDistance.toFixed(2)}m is beyond 100m - setting score to 3`);
          }

          areaResults.push({
            areaIndex,
            score,
            minDistance,
            features: nearestFeature ? [nearestFeature] : []
          });
        } catch (error) {
          console.error(`Error processing developable area ${areaIndex}:`, error);
          areaResults.push({
            areaIndex,
            score: 0,
            minDistance: Infinity,
            features: []
          });
        }
      }

      console.log('\nResults for all developable areas:', areaResults);
      
      // Find worst score (lowest is worst) across all areas
      const worstResult = areaResults.reduce((worst, current) => {
        return current.score < worst.score ? current : 
               (current.score === worst.score && current.minDistance < worst.minDistance) ? current : worst;
      }, { score: 3, minDistance: Infinity, features: [] });
      
      // Add all contamination features to the result
      worstResult.allFeatures = allContaminationFeatures;
      
      console.log('\nFinal result (worst case):', worstResult);
      return worstResult;
    } catch (error) {
      console.error('Error calculating contamination score:', error);
      console.error('Error stack:', error.stack);
      return { score: 0, minDistance: Infinity, features: [], allFeatures: [] };
    }
  },
  getScoreDescription: (scoreObj, developableArea) => {
    const { score, minDistance, features, allFeatures } = scoreObj;
    
    // Get site name from the nearest feature if available
    let siteName = '';
    if (features?.[0]?.properties?.SiteName) {
      siteName = ` (${features[0].properties.SiteName})`;
    }

    // If we have a point feature, check if it's inside the developable area
    if (features?.[0] && features[0].properties?.Latitude && features[0].properties?.Longitude) {
      const point = turf.point([
        parseFloat(features[0].properties.Longitude),
        parseFloat(features[0].properties.Latitude)
      ]);
      
      // If we have a developable area polygon, check if point is inside
      if (scoreObj.developablePolygon) {
        if (turf.booleanPointInPolygon(point, scoreObj.developablePolygon)) {
          return `Developable area contains a contaminated site${siteName}.`;
        }
      }
    }
    
    // Create a detailed description of all contamination features
    let detailedDescription = '';
    if (allFeatures && allFeatures.length > 0) {
      // Sort features by distance
      const sortedFeatures = [...allFeatures].sort((a, b) => a.distance - b.distance);
      
      // Create a map to deduplicate features (same site might be listed multiple times for different areas)
      const uniqueFeatures = new Map();
      
      sortedFeatures.forEach(item => {
        const feature = item.feature;
        const siteName = feature.properties?.SiteName || 'Unnamed site';
        const key = siteName;
        
        if (!uniqueFeatures.has(key) || item.distance < uniqueFeatures.get(key).distance) {
          uniqueFeatures.set(key, {
            siteName,
            distance: item.distance,
            areaIndex: item.areaIndex,
            comment: feature.properties?.Comment || '',
            type: feature.properties?.ContaminationActivityType || ''
          });
        }
      });
      
      // Convert to array and create description
      const uniqueFeaturesList = Array.from(uniqueFeatures.values());
      
      if (uniqueFeaturesList.length > 0) {
        detailedDescription = '\n\nContaminated sites in proximity to developable areas:';
        
        uniqueFeaturesList.forEach(item => {
          detailedDescription += `\n• ${item.siteName}: ${item.distance.toFixed(0)}m from developable area`;
          
          if (item.type) {
            detailedDescription += `\n  Type: ${item.type}`;
          }
          
          if (item.comment) {
            detailedDescription += `\n  Comments: ${item.comment}`;
          }
        });
      }
    }
    
    // Base description based on score
    let baseDescription;
    switch (score) {
      case 3:
        if (minDistance === Infinity || features.length === 0) {
          baseDescription = "Developable area is not impacted by contamination and there is no known contamination in close proximity to the site.";
        } else {
          baseDescription = `Developable area is not impacted by contamination and is ${minDistance.toFixed(0)}m from the nearest contaminated site${siteName}.`;
        }
        break;
      case 2:
        baseDescription = `Developable area is not impacted by contamination but is ${minDistance.toFixed(0)}m from the nearest contaminated site${siteName}.`;
        break;
      case 1:
        if (minDistance === 0) {
          baseDescription = `Developable area is impacted by a contaminated site${siteName}.`;
        } else {
          baseDescription = `Developable area is within ${minDistance.toFixed(0)}m of a contaminated site${siteName}.`;
        }
        break;
      default:
        baseDescription = "Contamination risk not assessed";
    }
    
    return baseDescription + detailedDescription;
  },
  getScoreColor: (score) => {
    return scoreColors[score] || scoreColors[0];
  }
};

scoringCriteria.tec = {
  calculateScore: (tecFeatures, developableArea) => {
    console.log('=== TEC Score Calculation Start ===');
    console.log('Input validation:');
    console.log('tecFeatures:', JSON.stringify(tecFeatures));
    console.log('developableArea:', developableArea);

    // Ensure developableArea is an array
    const developableAreas = Array.isArray(developableArea) ? developableArea : [developableArea];

    if (!developableAreas || developableAreas.length === 0 || !developableAreas[0]) {
      console.log('No developable area provided - returning score 0');
      return { score: 0, coverage: 0, features: [] };
    }

    try {
      // Process all developable areas together to calculate total coverage
      let totalDevelopableArea = 0;
      let totalTecArea = 0;
      const allRelevantFeatures = [];
      
      // First calculate the total area of all developable areas
      for (let areaIndex = 0; areaIndex < developableAreas.length; areaIndex++) {
        try {
          if (!developableAreas[areaIndex].geometry || !developableAreas[areaIndex].geometry.coordinates) {
            console.log(`Skipping developable area feature ${areaIndex} - invalid geometry`);
            continue;
          }
          
          const developableCoords = developableAreas[areaIndex].geometry.coordinates;
          console.log(`Raw developable coordinates for area ${areaIndex}:`, developableCoords);
          
          // Validate developable area coordinates
          if (!developableCoords || !Array.isArray(developableCoords) || developableCoords.length === 0) {
            console.error(`Invalid developable area coordinates for area ${areaIndex}:`, developableCoords);
            continue;
          }
          
          // For polygon coordinates, we need at least one ring with at least 3 points
          if (!Array.isArray(developableCoords[0]) || !Array.isArray(developableCoords[0][0]) || developableCoords[0].length < 3) {
            console.error(`Invalid developable area polygon structure for area ${areaIndex}:`, developableCoords);
            continue;
          }
          
          // Create a valid GeoJSON polygon - ensure coordinates are properly wrapped
          const developablePolygon = {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: developableCoords
            }
          };

          // Validate the created polygon
          if (!turf.booleanValid(developablePolygon)) {
            console.error(`Invalid developable polygon geometry for area ${areaIndex}`);
            continue;
          }

          console.log(`Created valid developable polygon for area ${areaIndex}:`, JSON.stringify(developablePolygon));
          const areaSize = turf.area(developablePolygon);
          totalDevelopableArea += areaSize;
          console.log(`Area ${areaIndex} size: ${areaSize} square meters, Total so far: ${totalDevelopableArea} square meters`);
          
          // Calculate TEC overlap for this developable area
          const features = tecFeatures?.features || [];
          features.forEach((feature, index) => {
            console.log(`\nProcessing feature ${index + 1} for area ${areaIndex}:`, feature);
            
            if (!feature.geometry?.coordinates) {
              console.log(`Feature ${index + 1} has no coordinates`);
              return;
            }

            try {
              let featurePolygon;
              if (feature.geometry.type === 'Polygon') {
                try {
                  console.log(`Processing Polygon feature ${index} for area ${areaIndex}:`, {
                    coordinates: feature.geometry.coordinates
                  });

                  // Create a valid polygon from the feature
                  featurePolygon = turf.polygon(feature.geometry.coordinates);
                  console.log(`Created polygon feature for area ${areaIndex}`);

                  if (!turf.booleanValid(featurePolygon)) {
                    console.error(`Created polygon is invalid for area ${areaIndex}`);
                    return;
                  }

                  // Check intersection
                  const doesIntersect = turf.booleanIntersects(developablePolygon, featurePolygon);
                  console.log(`Intersection check for area ${areaIndex}:`, doesIntersect);

                  if (doesIntersect) {
                    try {
                      // Calculate intersection using a try-catch block for each method
                      let intersection;
                      try {
                        intersection = turf.intersect(developablePolygon, featurePolygon);
                      } catch (intersectError) {
                        console.log(`Primary intersection method failed for area ${areaIndex}, trying alternative...`);
                        // If direct intersection fails, try with simplified geometries
                        const simplifiedDevelopable = turf.simplify(developablePolygon, { tolerance: 0.0001 });
                        const simplifiedFeature = turf.simplify(featurePolygon, { tolerance: 0.0001 });
                        intersection = turf.intersect(simplifiedDevelopable, simplifiedFeature);
                      }

                      if (intersection) {
                        const intersectionArea = turf.area(intersection);
                        totalTecArea += intersectionArea;
                        allRelevantFeatures.push({
                          ...feature,
                          areaIndex,
                          intersectionArea
                        });
                        console.log(`Intersection area for area ${areaIndex}:`, intersectionArea);
                        console.log(`Total TEC area so far: ${totalTecArea} square meters`);
                      } else {
                        console.log(`No valid intersection found for area ${areaIndex}`);
                      }
                    } catch (intersectError) {
                      console.error(`All intersection calculation methods failed for area ${areaIndex}:`, intersectError);
                      // If all intersection methods fail, estimate using overlap
                      const featureArea = turf.area(featurePolygon);
                      const estimatedIntersectionArea = Math.min(areaSize, featureArea) * 0.1; // Conservative 10% estimate
                      totalTecArea += estimatedIntersectionArea;
                      allRelevantFeatures.push({
                        ...feature,
                        areaIndex,
                        intersectionArea: estimatedIntersectionArea,
                        estimated: true
                      });
                      console.log(`Using estimated intersection area for area ${areaIndex}:`, estimatedIntersectionArea);
                      console.log(`Total TEC area so far: ${totalTecArea} square meters`);
                    }
                  }
                } catch (error) {
                  console.error(`Error processing polygon feature for area ${areaIndex}:`, error);
                }
              } else if (feature.geometry.type === 'MultiPolygon') {
                try {
                  console.log(`Processing MultiPolygon feature for area ${areaIndex}`);
                  feature.geometry.coordinates.forEach((polygonCoords, polyIndex) => {
                    try {
                      const polygon = turf.polygon(polygonCoords);
                      if (!turf.booleanValid(polygon)) {
                        console.error(`Invalid polygon ${polyIndex} in MultiPolygon for area ${areaIndex}`);
                        return;
                      }

                      const doesIntersect = turf.booleanIntersects(developablePolygon, polygon);
                      if (doesIntersect) {
                        try {
                          let intersection;
                          try {
                            intersection = turf.intersect(developablePolygon, polygon);
                          } catch (intersectError) {
                            console.log(`Primary intersection method failed for MultiPolygon in area ${areaIndex}, trying alternative...`);
                            const simplifiedDevelopable = turf.simplify(developablePolygon, { tolerance: 0.0001 });
                            const simplifiedPolygon = turf.simplify(polygon, { tolerance: 0.0001 });
                            intersection = turf.intersect(simplifiedDevelopable, simplifiedPolygon);
                          }

                          if (intersection) {
                            const intersectionArea = turf.area(intersection);
                            totalTecArea += intersectionArea;
                            allRelevantFeatures.push({
                              ...feature,
                              areaIndex,
                              intersectionArea,
                              polygonIndex: polyIndex
                            });
                            console.log(`Intersection area for polygon ${polyIndex} in area ${areaIndex}:`, intersectionArea);
                            console.log(`Total TEC area so far: ${totalTecArea} square meters`);
                          }
                        } catch (intersectError) {
                          console.error(`Intersection calculation failed for polygon ${polyIndex} in area ${areaIndex}:`, intersectError);
                          // Estimate intersection area
                          const polygonArea = turf.area(polygon);
                          const estimatedIntersectionArea = Math.min(areaSize, polygonArea) * 0.1;
                          totalTecArea += estimatedIntersectionArea;
                          allRelevantFeatures.push({
                            ...feature,
                            areaIndex,
                            intersectionArea: estimatedIntersectionArea,
                            polygonIndex: polyIndex,
                            estimated: true
                          });
                          console.log(`Using estimated intersection area for polygon ${polyIndex} in area ${areaIndex}:`, estimatedIntersectionArea);
                          console.log(`Total TEC area so far: ${totalTecArea} square meters`);
                        }
                      }
                    } catch (polyError) {
                      console.error(`Error processing polygon ${polyIndex} in MultiPolygon for area ${areaIndex}:`, polyError);
                    }
                  });
                } catch (error) {
                  console.error(`Error processing MultiPolygon feature for area ${areaIndex}:`, error);
                }
              }
            } catch (error) {
              console.error(`Error processing feature ${index + 1} for area ${areaIndex}:`, error);
              console.error('Feature geometry:', feature.geometry);
            }
          });
        } catch (error) {
          console.error(`Error processing developable area ${areaIndex}:`, error);
        }
      }

      console.log('\nTotal developable area across all areas:', totalDevelopableArea, 'square meters');
      console.log('Total TEC area across all areas:', totalTecArea, 'square meters');

      // Calculate overall coverage percentage across all areas
      const totalCoverage = totalDevelopableArea > 0 ? (totalTecArea / totalDevelopableArea) * 100 : 0;
      console.log('Total coverage percentage:', totalCoverage.toFixed(2) + '%');

      // Determine score based on total coverage
      let score;
      if (totalCoverage === 0) {
        score = 3;
        console.log('No coverage (0%) - Score: 3');
      } else if (totalCoverage < 50) {
        score = 2;
        console.log('Coverage < 50% - Score: 2');
      } else {
        score = 1;
        console.log('Coverage >= 50% - Score: 1');
      }

      console.log('=== Final Result ===');
      const result = { 
        score, 
        coverage: parseFloat(totalCoverage.toFixed(2)), 
        features: allRelevantFeatures,
        totalDevelopableArea,
        totalTecArea
      };
      console.log(result);
      
      return result;
    } catch (error) {
      console.error('Error calculating TEC score:', error);
      console.error('Error stack:', error.stack);
      return { score: 0, coverage: 0, features: [] };
    }
  },
  getScoreDescription: (scoreObj) => {
    const { score, coverage, features = [] } = scoreObj;
    
    switch (score) {
      case 3:
        return "Developable area is not impacted by any Threatened Ecological Communities.";
      case 2:
        return `Developable area has limited TEC coverage (${coverage.toFixed(1)}%).`;
      case 1:
        return `Developable area has significant TEC coverage (${coverage.toFixed(1)}%).`;
      default:
        return "TEC impact not assessed";
    }
  },
  getScoreColor: (score) => {
    return scoreColors[score] || scoreColors[0];
  }
};
