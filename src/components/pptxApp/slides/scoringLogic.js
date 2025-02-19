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
  ptal: {
    calculateScore: (ptalValues) => {
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
    getScoreDescription: (score, ptalValues) => {
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

      if (!developableArea?.[0] || !developableArea[0].geometry) {
        console.log('No developable area provided - returning score 0');
        return { score: 0, coverage: 0, features: [] };
      }

      // If no geoscape features, return highest score
      if (!geoscapeFeatures?.features?.length) {
        console.log('No geoscape features found - returning score 3');
        return { score: 3, coverage: 0, features: [] };
      }

      try {
        const developableCoords = developableArea[0].geometry.coordinates;
        console.log('Raw developable coordinates:', developableCoords);
        
        // Validate developable area coordinates
        if (!developableCoords || !Array.isArray(developableCoords) || developableCoords.length === 0) {
          console.error('Invalid developable area coordinates:', developableCoords);
          return { score: 0, coverage: 0, features: [] };
        }
        
        // For polygon coordinates, we need at least one ring with at least 3 points
        if (!Array.isArray(developableCoords[0]) || !Array.isArray(developableCoords[0][0]) || developableCoords[0].length < 3) {
          console.error('Invalid developable area polygon structure:', developableCoords);
          return { score: 0, coverage: 0, features: [] };
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
          console.error('Invalid developable polygon geometry');
          return { score: 0, coverage: 0, features: [] };
        }

        console.log('Created valid developable polygon:', JSON.stringify(developablePolygon));
        const totalArea = turf.area(developablePolygon);
        console.log('Total developable area:', totalArea, 'square meters');

        // Calculate total area of geoscape features
        let geoscapeArea = 0;
        const relevantFeatures = [];
        console.log('Processing geoscape features...');
        
        geoscapeFeatures.features.forEach((feature, index) => {
          console.log(`\nProcessing feature ${index + 1}:`, feature);
          if (feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon') {
            try {
              let featurePolygon = feature;
              console.log(`Feature ${index + 1} area before intersection:`, turf.area(featurePolygon), 'square meters');
              
              // First check if the feature is within or intersects the developable area
              const containsFeature = turf.booleanContains(developablePolygon, featurePolygon);
              
              if (containsFeature) {
                // If developable area contains feature, use feature area
                const featureArea = turf.area(featurePolygon);
                geoscapeArea += featureArea;
                relevantFeatures.push(feature);
                console.log(`Feature ${index + 1} is contained within developable area, using feature area:`, featureArea);
              } else {
                console.log(`Feature ${index + 1} is not within developable area`);
              }
            } catch (error) {
              console.error(`Error processing feature ${index + 1}:`, error);
              console.error('Feature geometry:', feature.geometry);
            }
          } else {
            console.log(`Feature ${index + 1} is not a Polygon/MultiPolygon: ${feature.geometry?.type}`);
          }
        });

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
          console.log('Coverage >= 50% - Score: 1');
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
      if (features?.length > 0) {
        features.forEach(feature => {
          const height = parseFloat(feature.properties?.roof_heigh) || 0;
          maxHeight = Math.max(maxHeight, height);
        });
      }

      let description = '';
      if (score === 3) {
        description = "Developable area has no building coverage.";
      } else if (score === 2) {
        description = `Developable area has limited building coverage (${coverage.toFixed(1)}%).`;
      } else if (score === 1) {
        description = `Developable area has significant building coverage (${coverage.toFixed(1)}%).`;
      } else {
        return "Building coverage not assessed";
      }

      // Add height information if buildings exist
      if (maxHeight > 0) {
        description += ` Tallest building is ${maxHeight.toFixed(1)}m.`;
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
        
        const bufferedPolygon = turf.buffer(transformedPolygon, 20, { units: 'meters' });
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
          return "Developable area has water servicing within 20m";
        case 0:
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
        
        const bufferedPolygon = turf.buffer(transformedPolygon, 20, { units: 'meters' });
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
          return "Developable area has sewer servicing within 20m";
        case 0:
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
        
        const bufferedPolygon = turf.buffer(transformedPolygon, 20, { units: 'meters' });
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
          return "Developable area has power servicing within 20m";
        case 0:
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
        return `Site has ${services[0]} servicing`;
      }
      
      if (services.length === 2) {
        return `Site has ${services[0]} and ${services[1]} servicing`;
      }
      
      return `Site has water, sewer and power servicing`;
    },
    getScoreColor: (score) => {
      return scoreColors[score] || scoreColors[0];
    }
  },
  roads: {
    calculateScore: (roadFeatures, developableArea) => {
      console.log('=== Roads Score Calculation Start ===');
      console.log('Raw road features:', JSON.stringify(roadFeatures, null, 2));
      console.log('Raw developable area:', JSON.stringify(developableArea, null, 2));

      if (!developableArea?.[0]) {
        console.log('No developable area - returning score 0');
        return { score: 0, nearbyRoads: [] };
      }

      try {
        const developableCoords = developableArea[0].geometry.coordinates[0];
        console.log('Developable coordinates:', developableCoords);
        
        const developablePolygon = turf.polygon([developableCoords]);
        console.log('Created developable polygon:', JSON.stringify(developablePolygon, null, 2));
        
        // Increase buffer distance to 20 meters to ensure we catch nearby roads
        const bufferDistance = 20;
        console.log(`Creating buffer of ${bufferDistance} meters around developable area`);
        
        const bufferedPolygon = turf.buffer(developablePolygon, bufferDistance, { units: 'meters' });
        console.log('Buffered polygon:', JSON.stringify(bufferedPolygon, null, 2));
        
        // Find intersecting roads
        const nearbyRoads = [];
        
        // Handle both direct features array and FeatureCollection format
        const features = Array.isArray(roadFeatures) ? roadFeatures : 
                        roadFeatures?.features || 
                        (roadFeatures?.properties?.roadFeatures || []);
        
        console.log(`Processing ${features.length} road features`);

        features.forEach((feature, index) => {
          console.log(`\nAnalyzing road feature ${index}:`, {
            type: feature.geometry?.type,
            properties: feature.properties
          });

          if (feature.geometry?.type === 'LineString' || feature.geometry?.type === 'MultiLineString') {
            try {
              const line = turf.lineString(feature.geometry.coordinates);
              console.log(`Road ${index} coordinates:`, feature.geometry.coordinates);
              
              const intersects = turf.booleanIntersects(bufferedPolygon, line);
              console.log(`Road ${index} intersection result:`, intersects);

              if (intersects) {
                const roadInfo = {
                  name: feature.properties?.ROADNAMEST || 'Unnamed Road',
                  function: feature.properties?.FUNCTION || 'Unknown',
                  laneCount: parseInt(feature.properties?.LANECOUNT) || 0
                };
                nearbyRoads.push(roadInfo);
                console.log(`Found nearby road:`, roadInfo);
              }
            } catch (error) {
              console.error(`Error processing road feature ${index}:`, error);
            }
          } else {
            console.log(`Skipping feature ${index} - invalid geometry type:`, feature.geometry?.type);
          }
        });

        console.log('\nNearby roads found:', nearbyRoads);

        if (nearbyRoads.length === 0) {
          console.log('No nearby roads found - returning score 1');
          return { score: 1, nearbyRoads: [] };
        }

        const hasMultipleLanes = nearbyRoads.some(road => road.laneCount >= 2);
        const score = hasMultipleLanes ? 3 : 2;
        console.log(`Final score: ${score} (Multiple lanes: ${hasMultipleLanes})`);

        return { score, nearbyRoads };
      } catch (error) {
        console.error('Error calculating roads score:', error);
        console.error('Error stack:', error.stack);
        return { score: 0, nearbyRoads: [] };
      }
    },
    getScoreDescription: (scoreObj) => {
      const { score, nearbyRoads = [] } = scoreObj;

      if (score === 3 || score === 2) {
        const roadDescriptions = nearbyRoads.map(road => {
          // Add spaces between words in road function classification
          const formattedFunction = road.function.replace(/([A-Z])/g, ' $1').trim();
          return `${road.name} which is a ${formattedFunction} with ${road.laneCount} lane${road.laneCount !== 1 ? 's' : ''}`
        });

        if (roadDescriptions.length === 0) {
          return "Road information not available";
        } else if (roadDescriptions.length === 1) {
          return `Site is accessed via ${roadDescriptions[0]}.`;
        } else {
          const lastRoad = roadDescriptions.pop();
          return `Site is accessed via ${roadDescriptions.join(', ')} and ${lastRoad}.`;
        }
      }

      return "Site does not have road access.";
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

      if (!developableArea?.[0]) {
        console.log('No developable area - returning score 0');
        return { score: 0, minDistance: Infinity, nearestPrecinct: null };
      }

      try {
        const developableCoords = developableArea[0].geometry.coordinates[0];
        console.log('Developable coordinates:', developableCoords);
        
        const developablePolygon = turf.polygon([developableCoords]);
        console.log('Created developable polygon:', JSON.stringify(developablePolygon, null, 2));

        // Handle both direct features array and FeatureCollection format
        const features = Array.isArray(precinctFeatures) ? precinctFeatures : 
                        precinctFeatures?.features || [];
        
        console.log(`Processing ${features.length} precinct features`);

        let minDistance = Infinity;
        let nearestPrecinct = null;
        let intersectionFound = false;

        features.forEach((feature, index) => {
          if (!feature.geometry) return;

          try {
            if (feature.geometry.type === 'MultiPolygon') {
              // For MultiPolygon, check each polygon
              feature.geometry.coordinates.forEach((polygonCoords, polyIndex) => {
                console.log(`Processing polygon ${polyIndex + 1} of MultiPolygon ${index + 1}`);
                const polygon = turf.polygon(polygonCoords);
                
                // First check for intersection
                const intersects = turf.booleanIntersects(developablePolygon, polygon);
                console.log(`Polygon ${polyIndex + 1} intersects:`, intersects);
                
                if (intersects) {
                  intersectionFound = true;
                  minDistance = 0;
                  nearestPrecinct = feature.properties?.Precinct_Name || null;
                  console.log('Found intersection - setting minDistance to 0');
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
                    console.log('New minimum distance found:', minDistance.toFixed(2), 'm');
                  }
                }
              });
            } else if (feature.geometry.type === 'Polygon') {
              console.log(`Processing regular polygon ${index + 1}`);
              const precinctPolygon = turf.polygon(feature.geometry.coordinates);
              
              // First check for intersection
              const intersects = turf.booleanIntersects(developablePolygon, precinctPolygon);
              console.log(`Polygon ${index + 1} intersects:`, intersects);
              
              if (intersects) {
                intersectionFound = true;
                minDistance = 0;
                nearestPrecinct = feature.properties?.Precinct_Name || null;
                console.log('Found intersection - setting minDistance to 0');
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
                  console.log('New minimum distance found:', minDistance.toFixed(2), 'm');
                }
              }
            }
          } catch (error) {
            console.error(`Error processing precinct feature ${index}:`, error);
          }
        });

        let score;
        if (minDistance === 0 || minDistance <= 800) {
          score = 3;
        } else if (minDistance <= 1600) {
          score = 2;
        } else {
          score = 1;
        }

        console.log('\nFinal result:', { score, minDistance, nearestPrecinct });
        return { score, minDistance, nearestPrecinct };
      } catch (error) {
        console.error('Error calculating UDP precincts score:', error);
        console.error('Error stack:', error.stack);
        return { score: 0, minDistance: Infinity, nearestPrecinct: null };
      }
    },
    getScoreDescription: (scoreObj) => {
      const { score, minDistance, nearestPrecinct } = scoreObj;
      
      // Special case for when the site is within a precinct
      if (minDistance === 0) {
        return `The developable area is within a UDP growth precinct (${nearestPrecinct}).`;
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
          return `Developable area is within ${formattedDistance} of a UDP growth precinct (${nearestPrecinct}).`;
        case 2:
          return `Developable area is within ${formattedDistance} of a UDP growth precinct (${nearestPrecinct}).`;
        case 1:
          return `Developable area is greater than 1.6 kilometres from a UDP precinct.`;
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

      if (!developableArea?.[0]) {
        console.log('No developable area - returning score 0');
        return { score: 0, minDistance: Infinity };
      }

      try {
        const developableCoords = developableArea[0].geometry.coordinates[0];
        console.log('Developable coordinates:', developableCoords);
        
        const developablePolygon = turf.polygon([developableCoords]);
        console.log('Created developable polygon:', JSON.stringify(developablePolygon, null, 2));

        // Handle both direct features array and FeatureCollection format
        const features = Array.isArray(floodFeatures) ? floodFeatures : 
                        floodFeatures?.features || 
                        (floodFeatures?.properties?.floodFeatures || []);
        
        console.log(`Processing ${features.length} flood features`);

        // First check if developable area intersects with any flood features
        let intersectionFound = false;
        let minDistance = Infinity;

        features.forEach((feature, index) => {
          if (!feature.geometry) return;

          try {
            if (feature.geometry.type === 'MultiPolygon') {
              // For MultiPolygon, check each polygon
              feature.geometry.coordinates.forEach((polygonCoords, polyIndex) => {
                console.log(`\nProcessing polygon ${polyIndex + 1} of MultiPolygon ${index + 1}`);
                const polygon = turf.polygon(polygonCoords);
                const intersects = turf.booleanIntersects(developablePolygon, polygon);
                console.log(`Polygon ${polyIndex + 1} intersects:`, intersects);
                
                if (intersects) {
                  intersectionFound = true;
                  minDistance = 0;
                  console.log('Found intersection - setting minDistance to 0');
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
                        console.log('New minimum distance found:', minDistance.toFixed(2), 'm');
                      }
                    });
                  });
                } catch (distError) {
                  console.error('Error calculating distance:', distError);
                }
              });
            } else if (feature.geometry.type === 'Polygon') {
              // For regular Polygon
              console.log(`\nProcessing regular polygon ${index + 1}`);
              const floodPolygon = turf.polygon(feature.geometry.coordinates);
              const intersects = turf.booleanIntersects(developablePolygon, floodPolygon);
              console.log(`Polygon ${index + 1} intersects:`, intersects);
              
              if (intersects) {
                intersectionFound = true;
                minDistance = 0;
                console.log('Found intersection - setting minDistance to 0');
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
                      console.log('New minimum distance found:', minDistance.toFixed(2), 'm');
                    }
                  });
                });
              } catch (distError) {
                console.error('Error calculating distance:', distError);
              }
            }
          } catch (error) {
            console.error(`Error processing flood feature ${index}:`, error);
          }
        });

        let score;
        if (intersectionFound) {
          score = 1; // Developable area is impacted by flood
          console.log('Intersection found - setting score to 1');
        } else if (minDistance <= 500) {
          score = 2; // Within 500m of flood area
          console.log(`Distance ${minDistance.toFixed(2)}m is within 500m - setting score to 2`);
        } else {
          score = 3; // Further than 500m from flood area
          console.log(`Distance ${minDistance.toFixed(2)}m is beyond 500m - setting score to 3`);
          // Find the nearest feature even when beyond 500m
          let nearestFeature = features[0]; // Default to first feature
          let currentMinDistance = Infinity;
          features.forEach(feature => {
            if (feature.geometry.type === 'MultiPolygon') {
              feature.geometry.coordinates.forEach(polygonCoords => {
                const polygon = turf.polygon(polygonCoords);
                const developablePoints = turf.explode(developablePolygon);
                const floodPoints = turf.explode(polygon);
                developablePoints.features.forEach(dPoint => {
                  floodPoints.features.forEach(fPoint => {
                    const distance = turf.distance(dPoint, fPoint, { units: 'meters' });
                    if (distance < currentMinDistance) {
                      currentMinDistance = distance;
                      nearestFeature = feature;
                    }
                  });
                });
              });
            } else if (feature.geometry.type === 'Polygon') {
              const polygon = turf.polygon(feature.geometry.coordinates);
              const developablePoints = turf.explode(developablePolygon);
              const floodPoints = turf.explode(polygon);
              developablePoints.features.forEach(dPoint => {
                floodPoints.features.forEach(fPoint => {
                  const distance = turf.distance(dPoint, fPoint, { units: 'meters' });
                  if (distance < currentMinDistance) {
                    currentMinDistance = distance;
                    nearestFeature = feature;
                  }
                });
              });
            }
          });
        }

        console.log('\nFinal result:', { score, minDistance: minDistance.toFixed(2) });
        return { score, minDistance };
      } catch (error) {
        console.error('Error calculating flood score:', error);
        console.error('Error stack:', error.stack);
        return { score: 0, minDistance: Infinity };
      }
    },
    getScoreDescription: (scoreObj) => {
      const { score, minDistance } = scoreObj;
      
      switch (score) {
        case 3:
          return `Developable area is not impacted by flooding and is ${minDistance.toFixed(0)}m from the nearest flood extent.`;
        case 2:
          return `Developable area is not impacted by flooding but is ${minDistance.toFixed(0)}m from the nearest flood extent.`;
        case 1:
          return "Developable area is impacted by flooding.";
        default:
          return "Flood risk not assessed";
      }
    },
    getScoreColor: (score) => {
      return scoreColors[score] || scoreColors[0];
    }
  },
  bushfire: {
    calculateScore: (bushfireFeatures, developableArea = null) => {
      console.log('=== Bushfire Score Calculation Start ===');
      console.log('Input validation:');
      console.log('bushfireFeatures:', JSON.stringify(bushfireFeatures, null, 2));
      console.log('developableArea:', JSON.stringify(developableArea, null, 2));

      if (!developableArea?.[0]) {
        console.log('No developable area - returning score 0');
        return { score: 0, minDistance: Infinity };
      }

      try {
        const developableCoords = developableArea[0].geometry.coordinates[0];
        console.log('Developable coordinates:', developableCoords);
        
        const developablePolygon = turf.polygon([developableCoords]);
        console.log('Created developable polygon:', JSON.stringify(developablePolygon, null, 2));

        // Handle both direct features array and FeatureCollection format
        const features = Array.isArray(bushfireFeatures) ? bushfireFeatures : 
                        bushfireFeatures?.features || 
                        (bushfireFeatures?.properties?.bushfireFeatures || []);
        
        console.log(`Processing ${features.length} bushfire features`);

        // First check if developable area intersects with any bushfire features
        let intersectionFound = false;
        let minDistance = Infinity;

        features.forEach((feature, index) => {
          if (!feature.geometry) return;

          try {
            if (feature.geometry.type === 'MultiPolygon') {
              // For MultiPolygon, check each polygon
              feature.geometry.coordinates.forEach((polygonCoords, polyIndex) => {
                console.log(`\nProcessing polygon ${polyIndex + 1} of MultiPolygon ${index + 1}`);
                const polygon = turf.polygon(polygonCoords);
                const intersects = turf.booleanIntersects(developablePolygon, polygon);
                console.log(`Polygon ${polyIndex + 1} intersects:`, intersects);
                
                if (intersects) {
                  intersectionFound = true;
                  minDistance = 0;
                  console.log('Found intersection - setting minDistance to 0');
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
                        console.log('New minimum distance found:', minDistance.toFixed(2), 'm');
                      }
                    });
                  });
                } catch (distError) {
                  console.error('Error calculating distance:', distError);
                }
              });
            } else if (feature.geometry.type === 'Polygon') {
              // For regular Polygon
              console.log(`\nProcessing regular polygon ${index + 1}`);
              const bushfirePolygon = turf.polygon(feature.geometry.coordinates);
              const intersects = turf.booleanIntersects(developablePolygon, bushfirePolygon);
              console.log(`Polygon ${index + 1} intersects:`, intersects);
              
              if (intersects) {
                intersectionFound = true;
                minDistance = 0;
                console.log('Found intersection - setting minDistance to 0');
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
                      console.log('New minimum distance found:', minDistance.toFixed(2), 'm');
                    }
                  });
                });
              } catch (distError) {
                console.error('Error calculating distance:', distError);
              }
            }
          } catch (error) {
            console.error(`Error processing bushfire feature ${index}:`, error);
          }
        });

        let score;
        if (intersectionFound) {
          score = 1; // Developable area is impacted by bushfire risk
          console.log('Intersection found - setting score to 1');
        } else if (minDistance <= 100) {
          score = 2; // Within 100m of bushfire risk area
          console.log(`Distance ${minDistance.toFixed(2)}m is within 100m - setting score to 2`);
        } else {
          score = 3; // Further than 100m from bushfire risk area
          console.log(`Distance ${minDistance.toFixed(2)}m is beyond 100m - setting score to 3`);
        }

        console.log('\nFinal result:', { score, minDistance: minDistance.toFixed(2) });
        return { score, minDistance };
      } catch (error) {
        console.error('Error calculating bushfire score:', error);
        console.error('Error stack:', error.stack);
        return { score: 0, minDistance: Infinity };
      }
    },
    getScoreDescription: (scoreObj) => {
      const { score, minDistance } = scoreObj;
      
      switch (score) {
        case 3:
          return `Developable area is not impacted by bushfire risk and is ${minDistance.toFixed(0)}m from the nearest bushfire prone area.`;
        case 2:
          return `Developable area is not impacted by bushfire risk but is ${minDistance.toFixed(0)}m from the nearest bushfire prone area.`;
        case 1:
          return "Developable area is within a bushfire prone area.";
        default:
          return "Bushfire risk not assessed";
      }
    },
    getScoreColor: (score) => {
      return scoreColors[score] || scoreColors[0];
    }
  },
  contamination: {
    calculateScore: (contaminationFeatures, developableArea) => {
      console.log('=== Contamination Score Calculation Start ===');
      console.log('Input validation:');
      console.log('contaminationFeatures:', JSON.stringify(contaminationFeatures, null, 2));
      console.log('developableArea:', JSON.stringify(developableArea, null, 2));

      if (!developableArea?.[0]) {
        console.log('No developable area provided - returning score 0');
        return { score: 0, minDistance: Infinity, features: [] };
      }

      try {
        const developableCoords = developableArea[0].geometry.coordinates[0];
        console.log('Developable coordinates:', developableCoords);
        
        const developablePolygon = turf.polygon([developableCoords]);
        const developableCenter = turf.center(developablePolygon);
        console.log('Created developable polygon:', JSON.stringify(developablePolygon, null, 2));

        // Handle both direct features array and FeatureCollection format
        const features = Array.isArray(contaminationFeatures) ? contaminationFeatures : 
                        contaminationFeatures?.features || [];
        
        console.log(`Processing ${features.length} contamination features`);

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
              console.log(`Created point from lat/long for feature ${index}:`, featurePoint);

              // Calculate distance from point to developable area
              const distance = turf.distance(developableCenter, featurePoint, { units: 'meters' });
              console.log(`Distance to point feature ${index}:`, distance.toFixed(2), 'm');

              if (distance < minDistance) {
                minDistance = distance;
                nearestFeature = feature;
                console.log('New minimum distance found:', minDistance.toFixed(2), 'm');
              }
            }
            // Handle polygon features
            else if (feature.geometry?.type === 'MultiPolygon') {
              feature.geometry.coordinates.forEach((polygonCoords, polyIndex) => {
                console.log(`\nProcessing polygon ${polyIndex + 1} of MultiPolygon ${index + 1}`);
                const polygon = turf.polygon(polygonCoords);
                const intersects = turf.booleanIntersects(developablePolygon, polygon);
                console.log(`Polygon ${polyIndex + 1} intersects:`, intersects);
                
                if (intersects) {
                  intersectionFound = true;
                  minDistance = 0;
                  nearestFeature = feature;
                  console.log('Found intersection - setting minDistance to 0');
                  return;
                }

                // Calculate minimum distance between polygon boundaries
                try {
                  const distance = turf.distance(
                    turf.center(developablePolygon),
                    turf.center(polygon),
                    { units: 'meters' }
                  );
                  if (distance < minDistance) {
                    minDistance = distance;
                    nearestFeature = feature;
                    console.log('New minimum distance found:', minDistance.toFixed(2), 'm');
                  }
                } catch (distError) {
                  console.error('Error calculating polygon distance:', distError);
                }
              });
            }
            else if (feature.geometry?.type === 'Polygon') {
              const polygon = turf.polygon(feature.geometry.coordinates);
              const intersects = turf.booleanIntersects(developablePolygon, polygon);
              console.log(`Polygon ${index} intersects:`, intersects);
              
              if (intersects) {
                intersectionFound = true;
                minDistance = 0;
                nearestFeature = feature;
                console.log('Found intersection - setting minDistance to 0');
                return;
              }

              // Calculate minimum distance between polygon boundaries
              try {
                const distance = turf.distance(
                  turf.center(developablePolygon),
                  turf.center(polygon),
                  { units: 'meters' }
                );
                if (distance < minDistance) {
                  minDistance = distance;
                  nearestFeature = feature;
                  console.log('New minimum distance found:', minDistance.toFixed(2), 'm');
                }
              } catch (distError) {
                console.error('Error calculating polygon distance:', distError);
              }
            }
          } catch (error) {
            console.error(`Error processing contamination feature ${index}:`, error);
          }
        });

        let score;
        if (intersectionFound || minDistance <= 20) {
          score = 1; // Developable area is impacted by contamination or within 20m
          console.log('Site is impacted by contamination or within 20m - setting score to 1');
        } else if (minDistance <= 100) {
          score = 2; // Within 100m of contaminated site
          console.log(`Distance ${minDistance.toFixed(2)}m is within 100m - setting score to 2`);
        } else {
          score = 3; // Further than 100m from contaminated site
          console.log(`Distance ${minDistance.toFixed(2)}m is beyond 100m - setting score to 3`);
        }

        console.log('=== Final Result ===');
        console.log({
          score,
          minDistance,
          nearestFeature
        });

        return {
          score,
          minDistance,
          features: nearestFeature ? [nearestFeature] : []
        };
      } catch (error) {
        console.error('Error calculating contamination score:', error);
        console.error('Error stack:', error.stack);
        return { score: 0, minDistance: Infinity };
      }
    },
    getScoreDescription: (scoreObj, developableArea) => {
      const { score, minDistance, features } = scoreObj;
      
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
        if (developableArea?.[0]?.geometry?.coordinates) {
          const polygon = turf.polygon(developableArea[0].geometry.coordinates);
          if (turf.booleanPointInPolygon(point, polygon)) {
            return `Developable area contains a contaminated site${siteName}.`;
          }
        }
      }
      
      switch (score) {
        case 3:
          if (minDistance === Infinity || features.length === 0) {
            return "Developable area is not impacted by contamination and there is no known contamination in close proximity to the site.";
          }
          return `Developable area is not impacted by contamination and is ${minDistance.toFixed(0)}m from the nearest contaminated site${siteName}.`;
        case 2:
          return `Developable area is not impacted by contamination but is ${minDistance.toFixed(0)}m from the nearest contaminated site${siteName}.`;
        case 1:
          if (minDistance === 0) {
            return `Developable area is impacted by a contaminated site${siteName}.`;
          }
          return `Developable area is within ${minDistance.toFixed(0)}m of a contaminated site${siteName}.`;
        default:
          return "Contamination risk not assessed";
      }
    },
    getScoreColor: (score) => {
      return scoreColors[score] || scoreColors[0];
    }
  },
  tec: {
    calculateScore: (tecFeatures, developableArea) => {
      console.log('=== TEC Score Calculation Start ===');
      console.log('Input validation:');
      console.log('tecFeatures:', JSON.stringify(tecFeatures));
      console.log('developableArea:', developableArea);

      if (!developableArea?.[0] || !developableArea[0].geometry) {
        console.log('No developable area provided - returning score 0');
        return { score: 0, coverage: 0, features: [] };
      }

      try {
        const developableCoords = developableArea[0].geometry.coordinates;
        console.log('Raw developable coordinates:', developableCoords);
        
        // Validate developable area coordinates
        if (!developableCoords || !Array.isArray(developableCoords) || developableCoords.length === 0) {
          console.error('Invalid developable area coordinates:', developableCoords);
          return { score: 0, coverage: 0, features: [] };
        }
        
        // For polygon coordinates, we need at least one ring with at least 3 points
        if (!Array.isArray(developableCoords[0]) || !Array.isArray(developableCoords[0][0]) || developableCoords[0].length < 3) {
          console.error('Invalid developable area polygon structure:', developableCoords);
          return { score: 0, coverage: 0, features: [] };
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
          console.error('Invalid developable polygon geometry');
          return { score: 0, coverage: 0, features: [] };
        }

        console.log('Created valid developable polygon:', JSON.stringify(developablePolygon));
        const totalArea = turf.area(developablePolygon);
        console.log('Total developable area:', totalArea, 'square meters');

        // Calculate total area of TEC features
        let tecArea = 0;
        const relevantFeatures = [];
        console.log('Processing TEC features...');
        
        const features = tecFeatures?.features || [];
        features.forEach((feature, index) => {
          console.log(`\nProcessing feature ${index + 1}:`, feature);
          
          if (!feature.geometry?.coordinates) {
            console.log(`Feature ${index + 1} has no coordinates`);
            return;
          }

          try {
            let featurePolygon;
            if (feature.geometry.type === 'Polygon') {
              try {
                console.log('Processing Polygon feature:', {
                  coordinates: feature.geometry.coordinates
                });

                // Create a valid polygon from the feature
                featurePolygon = turf.polygon(feature.geometry.coordinates);
                console.log('Created polygon feature');

                if (!turf.booleanValid(featurePolygon)) {
                  console.error('Created polygon is invalid');
                  return;
                }

                // Check intersection
                const doesIntersect = turf.booleanIntersects(developablePolygon, featurePolygon);
                console.log('Intersection check:', doesIntersect);

                if (doesIntersect) {
                  try {
                    // Calculate intersection using a try-catch block for each method
                    let intersection;
                    try {
                      intersection = turf.intersect(developablePolygon, featurePolygon);
                    } catch (intersectError) {
                      console.log('Primary intersection method failed, trying alternative...');
                      // If direct intersection fails, try with simplified geometries
                      const simplifiedDevelopable = turf.simplify(developablePolygon, { tolerance: 0.0001 });
                      const simplifiedFeature = turf.simplify(featurePolygon, { tolerance: 0.0001 });
                      intersection = turf.intersect(simplifiedDevelopable, simplifiedFeature);
                    }

                    if (intersection) {
                      const intersectionArea = turf.area(intersection);
                      tecArea += intersectionArea;
                      relevantFeatures.push({
                        ...feature,
                        intersectionArea
                      });
                      console.log('Intersection area:', intersectionArea);
                    } else {
                      console.log('No valid intersection found');
                    }
                  } catch (intersectError) {
                    console.error('All intersection calculation methods failed:', intersectError);
                    // If all intersection methods fail, estimate using overlap
                    const featureArea = turf.area(featurePolygon);
                    const estimatedIntersectionArea = Math.min(totalArea, featureArea) * 0.1; // Conservative 10% estimate
                    tecArea += estimatedIntersectionArea;
                    relevantFeatures.push({
                      ...feature,
                      intersectionArea: estimatedIntersectionArea,
                      estimated: true
                    });
                    console.log('Using estimated intersection area:', estimatedIntersectionArea);
                  }
                }
              } catch (error) {
                console.error('Error processing polygon feature:', error);
              }
            } else if (feature.geometry.type === 'MultiPolygon') {
              try {
                console.log('Processing MultiPolygon feature');
                feature.geometry.coordinates.forEach((polygonCoords, polyIndex) => {
                  try {
                    const polygon = turf.polygon(polygonCoords);
                    if (!turf.booleanValid(polygon)) {
                      console.error(`Invalid polygon ${polyIndex} in MultiPolygon`);
                      return;
                    }

                    const doesIntersect = turf.booleanIntersects(developablePolygon, polygon);
                    if (doesIntersect) {
                      try {
                        let intersection;
                        try {
                          intersection = turf.intersect(developablePolygon, polygon);
                        } catch (intersectError) {
                          console.log('Primary intersection method failed for MultiPolygon, trying alternative...');
                          const simplifiedDevelopable = turf.simplify(developablePolygon, { tolerance: 0.0001 });
                          const simplifiedPolygon = turf.simplify(polygon, { tolerance: 0.0001 });
                          intersection = turf.intersect(simplifiedDevelopable, simplifiedPolygon);
                        }

                        if (intersection) {
                          const intersectionArea = turf.area(intersection);
                          tecArea += intersectionArea;
                          relevantFeatures.push({
                            ...feature,
                            intersectionArea,
                            polygonIndex: polyIndex
                          });
                          console.log(`Intersection area for polygon ${polyIndex}:`, intersectionArea);
                        }
                      } catch (intersectError) {
                        console.error(`Intersection calculation failed for polygon ${polyIndex}:`, intersectError);
                        // Estimate intersection area
                        const polygonArea = turf.area(polygon);
                        const estimatedIntersectionArea = Math.min(totalArea, polygonArea) * 0.1;
                        tecArea += estimatedIntersectionArea;
                        relevantFeatures.push({
                          ...feature,
                          intersectionArea: estimatedIntersectionArea,
                          polygonIndex: polyIndex,
                          estimated: true
                        });
                        console.log(`Using estimated intersection area for polygon ${polyIndex}:`, estimatedIntersectionArea);
                      }
                    }
                  } catch (polyError) {
                    console.error(`Error processing polygon ${polyIndex} in MultiPolygon:`, polyError);
                  }
                });
              } catch (error) {
                console.error('Error processing MultiPolygon feature:', error);
              }
            }
          } catch (error) {
            console.error(`Error processing feature ${index + 1}:`, error);
            console.error('Feature geometry:', feature.geometry);
          }
        });

        console.log('\nTotal TEC feature area:', tecArea, 'square meters');

        // Calculate coverage percentage
        const coverage = (tecArea / totalArea) * 100;
        console.log('Coverage percentage:', coverage.toFixed(2) + '%');

        // Determine score based on coverage
        let score;
        if (coverage === 0) {
          score = 3;
          console.log('No coverage (0%) - Score: 3');
        } else if (coverage < 50) {
          score = 2;
          console.log('Coverage < 50% - Score: 2');
        } else {
          score = 1;
          console.log('Coverage >= 50% - Score: 1');
        }

        console.log('=== Final Result ===');
        console.log({ score, coverage: parseFloat(coverage.toFixed(2)), features: relevantFeatures });

        return { 
          score, 
          coverage: parseFloat(coverage.toFixed(2)), 
          features: relevantFeatures 
        };
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
  }
};

export default scoringCriteria;