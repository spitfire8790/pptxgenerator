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
      if (areaInSqMeters >= 4000) return 3;
      if (areaInSqMeters >= 2000) return 2;
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
      if (!elevationChange || typeof elevationChange !== 'number') return 0;
      if (elevationChange < 5) return 3;
      if (elevationChange <= 10) return 2;
      return 1;
    },
    getScoreDescription: (score) => {
      switch (score) {
        case 3:
          return "Minimal elevation change (<5m)";
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
        const isRectangular = angles.every(angle => Math.abs(angle - 90) < 15);
        
        // Calculate area ratio as before
        const actualArea = turf.area(simplified);
        const bbox = turf.bbox(simplified);
        const bboxPolygon = turf.bboxPolygon(bbox);
        const mbrArea = turf.area(bboxPolygon);
        const regularityRatio = actualArea / mbrArea;
        
        console.log('Site regularity calculation:', {
          actualArea,
          mbrArea,
          regularityRatio,
          angles,
          isRectangular,
          originalVertices: geometry.geometry.coordinates[0].length,
          simplifiedVertices: simplified.geometry.coordinates[0].length
        });
        
        // If shape is rectangular (based on angles), give it a high score
        if (isRectangular && regularityRatio > 0.4) {
          return 3;
        }
        
        // Otherwise use the area ratio with adjusted thresholds
        if (regularityRatio >= 0.75) return 3;
        if (regularityRatio >= 0.60) return 2;
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
      if (!heritageData) return 3; // No heritage impact
      
      const significance = heritageData.SIG?.toLowerCase();
      
      if (!significance) return 3; // No heritage significance specified
      
      if (significance.includes('state') || significance.includes('national')) {
        return 1;
      } else if (significance.includes('local')) {
        return 2;
      }
      
      return 3; // Default to no heritage impact if significance is unknown
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
      if (!soilsData || !soilsData.LAY_CLASS) return 3; // No acid sulfate soils impact
      
      const classes = soilsData.LAY_CLASS.split(',').map(c => c.trim());
      
      // Check for Class 1 or 2 (high risk)
      if (classes.some(c => c === 'Class 1' || c === 'Class 2')) {
        return 1;
      }
      
      // Check for Class 3, 4, or 5 (medium risk)
      if (classes.some(c => c === 'Class 3' || c === 'Class 4' || c === 'Class 5')) {
        return 2;
      }
      
      return 3; // Default to no impact if class is unknown
    },
    getScoreDescription: (score, soilsData) => {
      if (!soilsData || !soilsData.LAY_CLASS) {
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

      // Handle both direct features array and FeatureCollection format
      const features = Array.isArray(waterFeatures) ? waterFeatures : waterFeatures?.features || [];
      console.log('Processed features:', features);

      if (!features?.length || !developableArea?.[0]) {
        console.log('Missing required inputs - returning 0 score');
        return { score: 0, minDistance: Infinity };
      }

      try {
        const developableCoords = developableArea[0].geometry.coordinates[0];
        console.log('Developable area coordinates:', developableCoords);
        
        const developablePolygon = turf.polygon([developableCoords]);
        console.log('Created developable polygon:', developablePolygon);
        
        // Transform coordinates to EPSG:3857 if they are in EPSG:4326
        const transformedPolygon = turf.transformScale(developablePolygon, 1, { units: 'meters' });
        console.log('Transformed polygon:', transformedPolygon);
        
        const bufferedPolygon = turf.buffer(transformedPolygon, 5, { units: 'meters' });
        console.log('Buffered polygon:', bufferedPolygon);
        
        // Check intersections
        let intersectionFound = false;
        features.forEach((feature, index) => {
          console.log(`\nChecking water feature ${index}:`, feature);
          console.log(`Water feature ${index} coordinates:`, feature.geometry?.coordinates);
          
          if (feature.geometry?.type === 'LineString' || feature.geometry?.type === 'MultiLineString') {
            const line = turf.lineString(feature.geometry.coordinates);
            console.log('Created line:', line);
            console.log('Line coordinates:', line.geometry.coordinates);
        
            const intersects = turf.booleanIntersects(bufferedPolygon, line);
            console.log(`Intersection result for feature ${index}:`, intersects);
            console.log('Intersection test between:', {
              bufferedPolygonCoords: bufferedPolygon.geometry.coordinates[0],
              lineCoords: line.geometry.coordinates
            });
        
            if (intersects) {
              intersectionFound = true;
              console.log('Found intersection - will return score 1');
            }
          } else {
            console.log(`Feature ${index} is not a LineString:`, feature.geometry?.type);
          }
        });

        const result = {
          score: intersectionFound ? 1 : 0,
          minDistance: intersectionFound ? 0 : Infinity
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
        case 1:
          return "Site has water infrastructure within 5m";
        case 0:
          return "No water infrastructure found near site";
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

      // Handle both direct features array and FeatureCollection format
      const features = Array.isArray(sewerFeatures) ? sewerFeatures : sewerFeatures?.features || [];
      console.log('Processed features:', features);

      if (!features?.length || !developableArea?.[0]) {
        console.log('Missing required inputs - returning 0 score');
        return { score: 0, minDistance: Infinity };
      }

      try {
        const developableCoords = developableArea[0].geometry.coordinates[0];
        console.log('Developable area coordinates:', developableCoords);
        
        const developablePolygon = turf.polygon([developableCoords]);
        console.log('Created developable polygon:', developablePolygon);
        
        // Transform coordinates to EPSG:3857 if they are in EPSG:4326
        const transformedPolygon = turf.transformScale(developablePolygon, 1, { units: 'meters' });
        console.log('Transformed polygon:', transformedPolygon);
        
        const bufferedPolygon = turf.buffer(transformedPolygon, 5, { units: 'meters' });
        console.log('Buffered polygon:', bufferedPolygon);
        
        // Check intersections
        let intersectionFound = false;
        features.forEach((feature, index) => {
          console.log(`\nChecking sewer feature ${index}:`, feature);
          console.log(`Sewer feature ${index} coordinates:`, feature.geometry?.coordinates);
          
          if (feature.geometry?.type === 'LineString' || feature.geometry?.type === 'MultiLineString') {
            const line = turf.lineString(feature.geometry.coordinates);
            console.log('Created line:', line);
            console.log('Line coordinates:', line.geometry.coordinates);
        
            const intersects = turf.booleanIntersects(bufferedPolygon, line);
            console.log(`Intersection result for feature ${index}:`, intersects);
            console.log('Intersection test between:', {
              bufferedPolygonCoords: bufferedPolygon.geometry.coordinates[0],
              lineCoords: line.geometry.coordinates
            });
        
            if (intersects) {
              intersectionFound = true;
              console.log('Found intersection - will return score 1');
            }
          } else {
            console.log(`Feature ${index} is not a LineString:`, feature.geometry?.type);
          }
        });

        const result = {
          score: intersectionFound ? 1 : 0,
          minDistance: intersectionFound ? 0 : Infinity
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
        case 1:
          return "Site has sewer infrastructure within 5m";
        case 0:
          return "No sewer infrastructure found near site";
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

      // Handle both direct features array and FeatureCollection format
      const features = Array.isArray(powerFeatures) ? powerFeatures : powerFeatures?.features || [];
      console.log('Processed features:', features);

      if (!features?.length || !developableArea?.[0]) {
        console.log('Missing required inputs - returning 0 score');
        return { score: 0, minDistance: Infinity };
      }

      try {
        const developableCoords = developableArea[0].geometry.coordinates[0];
        console.log('Developable area coordinates:', developableCoords);
        
        const developablePolygon = turf.polygon([developableCoords]);
        console.log('Created developable polygon:', developablePolygon);
        
        // Transform coordinates to EPSG:3857 if they are in EPSG:4326
        const transformedPolygon = turf.transformScale(developablePolygon, 1, { units: 'meters' });
        console.log('Transformed polygon:', transformedPolygon);
        
        const bufferedPolygon = turf.buffer(transformedPolygon, 5, { units: 'meters' });
        console.log('Buffered polygon:', bufferedPolygon);
        
        // Check intersections
        let intersectionFound = false;
        features.forEach((feature, index) => {
          console.log(`\nChecking power feature ${index}:`, feature);
          console.log(`Power feature ${index} coordinates:`, feature.geometry?.coordinates);
          
          if (feature.geometry?.type === 'LineString' || feature.geometry?.type === 'MultiLineString') {
            const line = turf.lineString(feature.geometry.coordinates);
            console.log('Created line:', line);
            console.log('Line coordinates:', line.geometry.coordinates);
        
            const intersects = turf.booleanIntersects(bufferedPolygon, line);
            console.log(`Intersection result for feature ${index}:`, intersects);
            console.log('Intersection test between:', {
              bufferedPolygonCoords: bufferedPolygon.geometry.coordinates[0],
              lineCoords: line.geometry.coordinates
            });
        
            if (intersects) {
              intersectionFound = true;
              console.log('Found intersection - will return score 1');
            }
          } else {
            console.log(`Feature ${index} is not a LineString:`, feature.geometry?.type);
          }
        });

        const result = {
          score: intersectionFound ? 1 : 0,
          minDistance: intersectionFound ? 0 : Infinity
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
        case 1:
          return "Site has power infrastructure within 5m";
        case 0:
          return "No power infrastructure found near site";
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
      
      // Sum up the individual scores (each will be 0 or 1)
      return water + sewer + power;
    },
    getScoreDescription: (waterScore, sewerScore, powerScore) => {
      // Extract scores from result objects if they exist
      const water = typeof waterScore === 'object' ? waterScore.score : waterScore;
      const sewer = typeof sewerScore === 'object' ? sewerScore.score : sewerScore;
      const power = typeof powerScore === 'object' ? powerScore.score : powerScore;

      const services = [];
      if (water === 1) services.push('water');
      if (sewer === 1) services.push('sewer');
      if (power === 1) services.push('power');

      if (services.length === 0) {
        return "No servicing infrastructure found";
      }
      
      if (services.length === 1) {
        return `Site has ${services[0]} infrastructure`;
      }
      
      if (services.length === 2) {
        return `Site has ${services[0]} and ${services[1]} infrastructure`;
      }
      
      return `Site has water, sewer and power infrastructure`;
    },
    getScoreColor: (score) => {
      return scoreColors[score] || scoreColors[0];
    }
  }
};

export default scoringCriteria;