import * as turf from '@turf/turf';

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
        return "Developable area is not impacted by acid sulfate soils";
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
  }
};

export default scoringCriteria; 