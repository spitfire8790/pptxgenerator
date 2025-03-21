import * as turf from '@turf/turf';

// Calculate the visual center of a polygon
export const calculateVisualCenter = (coordinates) => {
  try {
    // First try to use turf.pointOnFeature which often gives better results than centroid
    const polygon = turf.polygon([coordinates]);
    
    // Use pointOnFeature which finds a point guaranteed to be inside the polygon
    // This is often more visually appealing than centroid for irregular shapes
    const point = turf.pointOnFeature(polygon);
    
    // Further improve the point by running a simple pole of inaccessibility algorithm
    // This tries to find a point that's as far from the boundary as possible
    const boundaryDistance = (pt) => {
      // Calculate minimum distance to any segment of the boundary
      let minDistance = Infinity;
      
      for (let i = 0; i < coordinates.length - 1; i++) {
        const start = coordinates[i];
        const end = coordinates[i + 1];
        const distance = turf.pointToLineDistance(
          turf.point(pt.geometry.coordinates),
          turf.lineString([start, end])
        );
        minDistance = Math.min(minDistance, distance);
      }
      
      return minDistance;
    };
    
    // Start from the point inside the polygon
    let bestPoint = point;
    let bestDistance = boundaryDistance(bestPoint);
    
    // Try some small adjustments to find better placement
    const delta = 0.0001; // Small coordinate adjustment
    const directions = [
      [delta, 0], [-delta, 0], [0, delta], [0, -delta],
      [delta, delta], [-delta, delta], [delta, -delta], [-delta, -delta]
    ];
    
    // Try each direction to see if we get a better point
    for (let i = 0; i < directions.length; i++) {
      const [dx, dy] = directions[i];
      const newCoords = [
        bestPoint.geometry.coordinates[0] + dx,
        bestPoint.geometry.coordinates[1] + dy
      ];
      
      // Make sure the new point is inside the polygon
      if (turf.booleanPointInPolygon(turf.point(newCoords), polygon)) {
        const newPoint = turf.point(newCoords);
        const distance = boundaryDistance(newPoint);
        
        if (distance > bestDistance) {
          bestPoint = newPoint;
          bestDistance = distance;
        }
      }
    }
    
    return bestPoint;
  } catch (error) {
    console.warn('Error calculating visual center, falling back to centroid:', error);
    const polygon = turf.polygon([coordinates]);
    return turf.centroid(polygon);
  }
};

// Calculate distance from a point to a line
export const calculateDistanceToRoadBoundary = (point, roadBoundaryFeature) => {
  if (!roadBoundaryFeature || !roadBoundaryFeature.geometry || !point) {
    return Infinity;
  }
  
  try {
    const pointFeature = turf.point(point);
    
    // Handle different geometry types for the road boundary
    if (roadBoundaryFeature.geometry.type === 'LineString') {
      // Direct distance calculation from point to linestring
      return turf.pointToLineDistance(pointFeature, roadBoundaryFeature, { units: 'meters' });
    } else if (roadBoundaryFeature.geometry.type === 'MultiLineString') {
      // Calculate distance to each linestring and return minimum
      let minDistance = Infinity;
      for (const line of roadBoundaryFeature.geometry.coordinates) {
        const lineFeature = turf.lineString(line);
        const distance = turf.pointToLineDistance(pointFeature, lineFeature, { units: 'meters' });
        minDistance = Math.min(minDistance, distance);
      }
      return minDistance;
    }
    
    return Infinity;
  } catch (error) {
    console.error('Error calculating distance to road boundary:', error);
    return Infinity;
  }
};

// Check if a building exceeds maximum depth from road boundary
export const buildingExceedsDepthFromRoad = (coordinates, roadBoundaryFeature, maxDepth) => {
  if (!roadBoundaryFeature || !coordinates || coordinates.length === 0) {
    return false;
  }
  
  try {
    // Create a polygon from the coordinates
    const polygon = turf.polygon([coordinates]);
    
    // Find points in the polygon that are furthest from the road
    // We'll sample points throughout the polygon
    const bbox = turf.bbox(polygon);
    const cellSize = 2; // Sample every 2 meters
    const gridPoints = turf.pointGrid(bbox, cellSize, { units: 'meters' });
    
    // Filter to only points inside the polygon
    const pointsInPolygon = turf.pointsWithinPolygon(gridPoints, polygon);
    
    if (pointsInPolygon.features.length === 0) {
      // Not enough resolution, use simplified approach
      // Calculate distances from vertices to the road boundary
      for (const coord of coordinates) {
        const distance = calculateDistanceToRoadBoundary(coord, roadBoundaryFeature);
        if (distance > maxDepth) {
          return true;
        }
      }
      return false;
    }
    
    // For each point, check distance to road boundary
    for (const point of pointsInPolygon.features) {
      const distance = calculateDistanceToRoadBoundary(point.geometry.coordinates, roadBoundaryFeature);
      if (distance > maxDepth) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking building depth from road:', error);
    return false;
  }
};

// Create scaled polygon based on center point and scale factor
export const createScaledPolygon = (coordinates, center, scaleFactor) => {
  const centerPoint = center.geometry.coordinates;
  
  // Scale each coordinate relative to the center point
  const scaledCoordinates = coordinates.map(coord => {
    const dx = coord[0] - centerPoint[0];
    const dy = coord[1] - centerPoint[1];
    return [
      centerPoint[0] + dx * scaleFactor,
      centerPoint[1] + dy * scaleFactor
    ];
  });
  
  return scaledCoordinates;
};

// Create a setback building section (smaller upper section)
export const createSetbackSection = (coordinates, center, scaleFactor) => {
  const centerPoint = center.geometry.coordinates;
  
  // Apply an additional internal offset (3m setback)
  // by using a smaller scale factor for the upper section
  const setbackScaleFactor = scaleFactor * 0.85; // Additional reduction for setback

  // Scale each coordinate relative to the center point
  const scaledCoordinates = coordinates.map(coord => {
    const dx = coord[0] - centerPoint[0];
    const dy = coord[1] - centerPoint[1];
    return [
      centerPoint[0] + dx * setbackScaleFactor,
      centerPoint[1] + dy * setbackScaleFactor
    ];
  });
  
  return scaledCoordinates;
};

// Generate building footprint based on the developable area and building footprint percentage
export const generateBuildingFootprint = (feature, buildingFootprintRatio) => {
  if (!feature || !feature.geometry || !feature.geometry.coordinates) {
    return null;
  }
  
  try {
    // Handle different geometry types
    if (feature.geometry.type === 'Polygon') {
      const coordinates = feature.geometry.coordinates[0];
      const center = calculateVisualCenter(coordinates);
      
      // Calculate scale factor (square root because we're scaling in 2D)
      const scaleFactor = Math.sqrt(buildingFootprintRatio);
      
      // Create scaled polygon
      const scaledCoordinates = createScaledPolygon(coordinates, center, scaleFactor);
      
      // Create new feature with scaled geometry
      return {
        ...feature,
        geometry: {
          ...feature.geometry,
          coordinates: [[...scaledCoordinates, scaledCoordinates[0]]] // Close the polygon by repeating first point
        }
      };
    } else if (feature.geometry.type === 'MultiPolygon') {
      // For MultiPolygon, scale each polygon separately
      const newCoordinates = feature.geometry.coordinates.map(polygon => {
        const ringCoordinates = polygon[0];
        const center = calculateVisualCenter(ringCoordinates);
        const scaleFactor = Math.sqrt(buildingFootprintRatio);
        const scaledCoordinates = createScaledPolygon(ringCoordinates, center, scaleFactor);
        return [[...scaledCoordinates, scaledCoordinates[0]]]; // Close each polygon
      });
      
      return {
        ...feature,
        geometry: {
          ...feature.geometry,
          coordinates: newCoordinates
        }
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error generating building footprint:", error);
    return null;
  }
};

// Calculate building height in meters based on GFA and footprint
export const calculateBuildingHeight = (gfa, footprintArea, floorToFloorHeight) => {
  if (!footprintArea || footprintArea === 0) return 0;
  
  // Calculate the number of floors needed to achieve the desired GFA
  const numberOfFloors = Math.ceil(gfa / footprintArea);
  
  // Calculate height by multiplying the number of floors by the floor-to-floor height
  return numberOfFloors * floorToFloorHeight;
};

// Calculate area of a polygon in square meters
export const calculatePolygonArea = (coordinates) => {
  try {
    const polygon = turf.polygon([coordinates]);
    // turf.area returns area in square meters
    return turf.area(polygon);
  } catch (error) {
    console.error('Error calculating polygon area:', error);
    return 0;
  }
};

// Calculate polygon width in meters
export const calculatePolygonWidth = (coordinates) => {
  try {
    const polygon = turf.polygon([coordinates]);
    const bbox = turf.bbox(polygon);
    
    // Calculate width as the distance between west and east points
    const westPoint = turf.point([bbox[0], (bbox[1] + bbox[3]) / 2]);
    const eastPoint = turf.point([bbox[2], (bbox[1] + bbox[3]) / 2]);
    
    // Calculate the width in meters
    const width = turf.distance(westPoint, eastPoint, { units: 'meters' });
    
    // Calculate height (north-south) as well
    const southPoint = turf.point([(bbox[0] + bbox[2]) / 2, bbox[1]]);
    const northPoint = turf.point([(bbox[0] + bbox[2]) / 2, bbox[3]]);
    const height = turf.distance(southPoint, northPoint, { units: 'meters' });
    
    return { width, height, maxDimension: Math.max(width, height) };
  } catch (error) {
    console.error('Error calculating polygon width:', error);
    return { width: 0, height: 0, maxDimension: 0 };
  }
};

// Check if two buildings are too close
export const areBuildingsTooClose = (pos1, pos2, minSeparation) => {
  const point1 = turf.point(pos1);
  const point2 = turf.point(pos2);
  const distance = turf.distance(point1, point2, { units: 'meters' });
  return distance < minSeparation;
};

// Calculate optimal building configuration based on developable area
export const calculateOptimalBuildingConfig = (developableAreaFeature, parameters) => {
  if (!developableAreaFeature) return null;
  
  try {
    // Extract parameters with defaults
    const {
      siteEfficiencyRatio = 0.6,
      floorToFloorHeight = 3.1,
      gbaToGfaRatio = 0.85,
      maxBuildingHeight = 100,
      minBuildingSeparation = 6,
      maxBuildingDepth = 18,  // Renamed from maxBuildingWidth
      roadBoundaryFeature = null
    } = parameters;
    
    // Constants
    const MIN_BUILDING_SEPARATION = minBuildingSeparation;
    const MAX_DEPTH_METERS = maxBuildingDepth;  // Renamed from MAX_WIDTH_METERS
    const HOB_LIMIT = maxBuildingHeight;
    const SETBACK_FLOOR_THRESHOLD = 4; // Apply setback above 4 floors
    
    // Generate initial building footprint within the site efficiency ratio constraints
    const buildingFootprint = generateBuildingFootprint(developableAreaFeature, siteEfficiencyRatio);
    if (!buildingFootprint) return null;
    
    // Calculate the footprint area
    let footprintArea = 0;
    
    if (buildingFootprint.geometry.type === 'Polygon') {
      footprintArea = calculatePolygonArea(buildingFootprint.geometry.coordinates[0]);
    } else if (buildingFootprint.geometry.type === 'MultiPolygon') {
      // Calculate area of each polygon and sum them
      footprintArea = buildingFootprint.geometry.coordinates.reduce((total, polygon) => {
        return total + calculatePolygonArea(polygon[0]);
      }, 0);
    }
    
    if (footprintArea === 0) return null;
    
    // Calculate maximum GFA based on height constraints
    const maxFloorsFromHeight = Math.floor(HOB_LIMIT / floorToFloorHeight);
    const maxGFA = maxFloorsFromHeight * footprintArea * gbaToGfaRatio;
    
    // Calculate aspect ratio and check if footprint is too deep
    let aspectRatio = 1; // Default square
    let maxDimension = 0;
    let exceedsMaxDepth = false;  // Renamed from exceedsMaxWidth
    
    if (buildingFootprint.geometry.type === 'Polygon') {
      const boundingBox = turf.bbox(buildingFootprint);
      const width = boundingBox[2] - boundingBox[0];
      const height = boundingBox[3] - boundingBox[1];
      aspectRatio = Math.max(width, height) / Math.min(width, height);
      
      // Calculate actual dimensions in meters
      const dimensions = calculatePolygonWidth(buildingFootprint.geometry.coordinates[0]);
      maxDimension = dimensions.maxDimension;
      
      // Check depth restriction either from overall dimensions or from road boundary
      if (roadBoundaryFeature) {
        // Check if any part of the building exceeds max depth from road boundary
        exceedsMaxDepth = buildingExceedsDepthFromRoad(
          buildingFootprint.geometry.coordinates[0], 
          roadBoundaryFeature, 
          MAX_DEPTH_METERS
        );
      } else {
        // Use standard dimension check if no road boundary is defined
        exceedsMaxDepth = maxDimension > MAX_DEPTH_METERS;
      }
    }
    
    // Threshold for multiple buildings - if aspect ratio is too high, building is too tall,
    // exceeds HOB limit, or is too deep
    const maxAspectRatio = 3;
    const maxFloors = 30;
    const shouldUseMultipleBuildings = aspectRatio > maxAspectRatio || 
                                      maxFloorsFromHeight > maxFloors || 
                                      exceedsMaxDepth;  // Renamed from exceedsMaxWidth
    
    // If we need multiple buildings, determine optimal number and distribution
    if (shouldUseMultipleBuildings) {
      // Calculate optimal number of buildings
      // Consider all constraints, including depth
      let depthBasedBuildingCount = exceedsMaxDepth ? Math.ceil(maxDimension / MAX_DEPTH_METERS) : 1;  // Renamed from widthBasedBuildingCount
      
      let optimalBuildingCount = Math.max(
        aspectRatio > maxAspectRatio ? Math.ceil(aspectRatio / maxAspectRatio) : 1,
        depthBasedBuildingCount  // Renamed from widthBasedBuildingCount
      );
      
      // Maximum number of buildings to fit within the developable area
      // For very small sites, we should limit the number of buildings
      // so there's enough space between them
      const siteDiameterM = Math.sqrt(footprintArea);
      const maxBuildingsForSite = Math.max(1, Math.floor(siteDiameterM / (MAX_DEPTH_METERS + MIN_BUILDING_SEPARATION)));  // Updated to MAX_DEPTH_METERS
      
      optimalBuildingCount = Math.min(Math.max(optimalBuildingCount, 2), maxBuildingsForSite, 8); // Never more than 8 buildings
      
      // Create multiple buildings
      const buildings = [];
      const gfaPerBuilding = maxGFA / optimalBuildingCount;  // Using calculated maxGFA instead of input gfa
      
      // For building placement, we'll use a circular arrangement
      // with minimum separation enforced
      // Calculate the radius of the circle based on site size and min separation
      const optimalRadius = Math.max(
        siteDiameterM / 4, // Base radius on site size
        MIN_BUILDING_SEPARATION / (2 * Math.sin(Math.PI / optimalBuildingCount)) // Ensure min separation
      );
      
      // Get the center of the developable area for placement
      let centerPoint;
      if (buildingFootprint.geometry.type === 'Polygon') {
        const coordinates = buildingFootprint.geometry.coordinates[0];
        const center = calculateVisualCenter(coordinates);
        centerPoint = center.geometry.coordinates;
      } else {
        // For MultiPolygon, use the first polygon's center
        const coordinates = buildingFootprint.geometry.coordinates[0][0];
        const center = calculateVisualCenter(coordinates);
        centerPoint = center.geometry.coordinates;
      }
      
      // Building placements: collect all positions before creating buildings
      // so we can check for collisions
      const buildingPlacements = [];
      
      for (let i = 0; i < optimalBuildingCount; i++) {
        // Create smaller building footprints that together have the same total area
        // Use a smaller scale factor if we're dividing due to depth constraints to ensure narrow buildings
        const baseScaleFactor = 1 / Math.sqrt(optimalBuildingCount);
        
        // If depth is the constraint, make buildings narrower in the widest dimension
        const scaleFactor = exceedsMaxDepth ? 
          baseScaleFactor * (depthBasedBuildingCount > optimalBuildingCount ? 0.8 : 0.6) : 
          baseScaleFactor;
        
        // Calculate angle and position on the circle
        const angle = (2 * Math.PI * i) / optimalBuildingCount;
        
        // Calculate offset in longitude/latitude
        // Convert optimalRadius from meters to degrees approximately
        // 111,320 meters is approximately 1 degree of latitude
        // For longitude, we adjust for latitude (becomes wider near equator, narrower near poles)
        const latFactor = 111320; // meters per degree latitude
        const lonFactor = 111320 * Math.cos(centerPoint[1] * (Math.PI / 180)); // meters per degree longitude at this latitude
        
        const offsetLat = (optimalRadius * Math.sin(angle)) / latFactor;
        const offsetLon = (optimalRadius * Math.cos(angle)) / lonFactor;
        
        buildingPlacements.push({
          index: i,
          angle: angle,
          position: [centerPoint[0] + offsetLon, centerPoint[1] + offsetLat],
          scaleFactor: scaleFactor
        });
      }
      
      // Adjust placements if buildings are too close - improved algorithm
      let maxIterations = 10; // Increase iterations for better convergence
      for (let iteration = 0; iteration < maxIterations; iteration++) {
        let adjustmentsMade = false;
        
        for (let i = 0; i < buildingPlacements.length; i++) {
          for (let j = i + 1; j < buildingPlacements.length; j++) {
            if (areBuildingsTooClose(buildingPlacements[i].position, buildingPlacements[j].position, MIN_BUILDING_SEPARATION)) {
              // Move both buildings away from each other
              const point1 = turf.point(buildingPlacements[i].position);
              const point2 = turf.point(buildingPlacements[j].position);
              const bearing = turf.bearing(point1, point2);
              
              // Calculate current distance
              const currentDistance = turf.distance(point1, point2, { units: 'meters' });
              // Calculate how much more distance we need
              const additionalDistance = MIN_BUILDING_SEPARATION - currentDistance;
              // Add extra buffer to ensure separation
              const adjustmentDistance = (additionalDistance / 2) + 0.5; 
              
              // Move in opposite directions along the bearing line
              const adjustedPoint1 = turf.destination(point1, adjustmentDistance, bearing - 180, { units: 'meters' });
              const adjustedPoint2 = turf.destination(point2, adjustmentDistance, bearing, { units: 'meters' });
              
              buildingPlacements[i].position = adjustedPoint1.geometry.coordinates;
              buildingPlacements[j].position = adjustedPoint2.geometry.coordinates;
              
              adjustmentsMade = true;
            }
          }
        }
        
        if (!adjustmentsMade) break;
      }
      
      // Verify all buildings have proper spacing
      let allBuildingsProperlySpaced = true;
      for (let i = 0; i < buildingPlacements.length; i++) {
        for (let j = i + 1; j < buildingPlacements.length; j++) {
          if (areBuildingsTooClose(buildingPlacements[i].position, buildingPlacements[j].position, MIN_BUILDING_SEPARATION)) {
            allBuildingsProperlySpaced = false;
            console.warn(`Buildings ${i} and ${j} are still too close after adjustments`);
          }
        }
      }
      
      // If buildings are still too close, reduce the number of buildings
      if (!allBuildingsProperlySpaced && optimalBuildingCount > 2) {
        console.log(`Reducing building count from ${optimalBuildingCount} to ${optimalBuildingCount-1} due to spacing constraints`);
        optimalBuildingCount--;
        // Remove the last building placement
        buildingPlacements.pop();
      }
      
      // Create a polygon object for checking if points are inside developable area
      let developableAreaPolygon;
      if (developableAreaFeature.geometry.type === 'Polygon') {
        developableAreaPolygon = turf.polygon(developableAreaFeature.geometry.coordinates);
      } else if (developableAreaFeature.geometry.type === 'MultiPolygon') {
        // For multipolygon, we'll just use the first polygon for now
        // This is a simplification, but should work for most cases
        developableAreaPolygon = turf.polygon(developableAreaFeature.geometry.coordinates[0]);
      }
      
      // Check if building placements are within the developable area
      for (let i = 0; i < buildingPlacements.length; i++) {
        const placement = buildingPlacements[i];
        const point = turf.point(placement.position);
        
        // Check if point is inside developable area
        if (!turf.booleanPointInPolygon(point, developableAreaPolygon)) {
          console.warn(`Building ${i} initially outside developable area - automatically adjusting position to fit within boundaries`);
          
          // Move point back toward center until it's inside the polygon
          const center = turf.point(centerPoint);
          const bearing = turf.bearing(center, point);
          const originalDistance = turf.distance(center, point, { units: 'meters' });
          
          // Binary search to find the maximum distance we can go while staying inside
          let minDistance = 0; // Definitely inside (at center)
          let maxDistance = originalDistance;
          let currentDistance = maxDistance * 0.8; // Start at 80% of original distance
          let iterations = 0;
          const maxSearchIterations = 10;
          
          while (iterations < maxSearchIterations) {
            iterations++;
            
            // Move point toward center by the current distance percentage
            const adjustedPoint = turf.destination(center, currentDistance, bearing, { units: 'meters' });
            
            if (turf.booleanPointInPolygon(adjustedPoint, developableAreaPolygon)) {
              // This position works, try going a bit further out
              minDistance = currentDistance;
              currentDistance = (currentDistance + maxDistance) / 2;
            } else {
              // This position is outside, try moving closer to center
              maxDistance = currentDistance;
              currentDistance = (minDistance + currentDistance) / 2;
            }
            
            // If we've converged to a good enough solution, stop
            if (maxDistance - minDistance < 1) {
              break;
            }
          }
          
          // Use the found distance that keeps the point inside
          const finalPoint = turf.destination(center, minDistance, bearing, { units: 'meters' });
          buildingPlacements[i].position = finalPoint.geometry.coordinates;
          
          // Add a small buffer from the edge (move slightly toward center)
          const safetyBufferMeters = 2;
          const bufferedPoint = turf.destination(
            turf.point(buildingPlacements[i].position),
            safetyBufferMeters,
            turf.bearing(turf.point(buildingPlacements[i].position), center),
            { units: 'meters' }
          );
          buildingPlacements[i].position = bufferedPoint.geometry.coordinates;
        }
      }
      
      // Create buildings using the final placements
      let maxBuildingHeight = 0; // Track maximum height across all buildings
      for (const placement of buildingPlacements) {
        let buildingFeature;
        
        if (buildingFootprint.geometry.type === 'Polygon') {
          const coordinates = buildingFootprint.geometry.coordinates[0];
          const center = { geometry: { coordinates: centerPoint } };
          
          // Create a smaller footprint for this building
          const scaledCoordinates = createScaledPolygon(coordinates, center, placement.scaleFactor);
          
          // Move the scaled footprint to the designated position
          const offsetCoordinates = scaledCoordinates.map(coord => {
            // Calculate the offset from center to the new position
            const offsetLon = placement.position[0] - centerPoint[0];
            const offsetLat = placement.position[1] - centerPoint[1];
            
            return [
              coord[0] + offsetLon,
              coord[1] + offsetLat
            ];
          });
          
          buildingFeature = {
            ...buildingFootprint,
            geometry: {
              ...buildingFootprint.geometry,
              coordinates: [[...offsetCoordinates, offsetCoordinates[0]]] // Close the polygon
            }
          };
        } else if (buildingFootprint.geometry.type === 'MultiPolygon') {
          // For simplicity, we'll just use the first polygon of the MultiPolygon
          // and create similarly sized buildings at each placement point
          const coordinates = buildingFootprint.geometry.coordinates[0][0];
          const center = { geometry: { coordinates: centerPoint } };
          
          // Scale and offset for this building
          const scaledCoordinates = createScaledPolygon(coordinates, center, placement.scaleFactor);
          
          // Apply offset to move to the designated position
          const offsetCoordinates = scaledCoordinates.map(coord => {
            const offsetLon = placement.position[0] - centerPoint[0];
            const offsetLat = placement.position[1] - centerPoint[1];
            
            return [
              coord[0] + offsetLon,
              coord[1] + offsetLat
            ];
          });
          
          buildingFeature = {
            ...buildingFootprint,
            geometry: {
              type: 'Polygon', // Convert to a single polygon
              coordinates: [[...offsetCoordinates, offsetCoordinates[0]]] // Close the polygon
            }
          };
        }
        
        if (buildingFeature) {
          // Calculate height and floors for this building
          const footprintArea = calculatePolygonArea(buildingFeature.geometry.coordinates[0]);
          const buildingGFA = maxGFA / optimalBuildingCount / gbaToGfaRatio;  // Using calculated maxGFA
          const floors = Math.min(Math.ceil(buildingGFA / footprintArea), maxFloorsFromHeight);
          const height = floors * floorToFloorHeight;
          
          // Update max height if this building is taller
          maxBuildingHeight = Math.max(maxBuildingHeight, height);
          
          // Check if we need to apply the setback rule (building > 4 floors)
          const needsSetback = floors > SETBACK_FLOOR_THRESHOLD;
          
          if (needsSetback) {
            // Calculate height of base and top sections
            const baseFloors = SETBACK_FLOOR_THRESHOLD;
            const topFloors = floors - SETBACK_FLOOR_THRESHOLD;
            
            const baseHeight = baseFloors * floorToFloorHeight;
            const topHeight = topFloors * floorToFloorHeight;
            
            // Create base section
            const baseSection = {
              ...buildingFeature,
              properties: {
                ...buildingFeature.properties,
                floors: baseFloors,
                height: baseHeight,
                footprintArea: footprintArea,
                gfa: (footprintArea * baseFloors * gbaToGfaRatio),
                buildingIndex: placement.index + 1,
                _isBaseSection: true,
                _isTopOfStack: false,
                _baseHeight: 0
              }
            };
            
            // Create top section with setback
            // Create a smaller footprint for the upper floors
            let topCoordinates = [];
            if (buildingFeature.geometry.type === 'Polygon') {
              const coordinates = buildingFeature.geometry.coordinates[0];
              const center = { 
                geometry: { 
                  coordinates: [
                    coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length,
                    coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length
                  ] 
                } 
              };
              
              // Apply the setback to create smaller upper section
              topCoordinates = createSetbackSection(coordinates, center, 1);
            }
            
            const topSection = {
              ...buildingFeature,
              geometry: {
                ...buildingFeature.geometry,
                coordinates: [[...topCoordinates, topCoordinates[0]]] // Close the polygon
              },
              properties: {
                ...buildingFeature.properties,
                floors: topFloors,
                height: topHeight,
                footprintArea: calculatePolygonArea([...topCoordinates, topCoordinates[0]]),
                gfa: (calculatePolygonArea([...topCoordinates, topCoordinates[0]]) * topFloors * gbaToGfaRatio),
                buildingIndex: placement.index + 1,
                _isBaseSection: false,
                _isTopOfStack: true,
                _baseHeight: baseHeight
              }
            };
            
            // Add both sections to the buildings array
            buildings.push(baseSection);
            buildings.push(topSection);
          } else {
            // Set building properties for visualization (single section building)
            buildingFeature.properties = {
              ...buildingFeature.properties,
              floors: floors,
              height: height,
              footprintArea: footprintArea,
              gfa: maxGFA / optimalBuildingCount,  // Using calculated maxGFA
              buildingIndex: placement.index + 1,
              _isBaseSection: true,
              _isTopOfStack: true,
              _baseHeight: 0
            };
            
            buildings.push(buildingFeature);
          }
        }
      }
      
      return {
        buildingCount: buildings.length,
        buildings: buildings,
        isSingleBuilding: false,
        hobRestricted: false,  // Always using max height, so never restricted
        hobLimit: HOB_LIMIT,
        calculatedGFA: maxGFA,
        maxBuildingHeight: maxBuildingHeight,
        depthLimited: exceedsMaxDepth,  // Renamed from widthLimited
        maxAllowedFloors: maxFloorsFromHeight
      };
    } else {
      // Single building configuration
      const maxFloors = Math.min(maxFloorsFromHeight, 30);  // Cap at 30 floors or maxFloorsFromHeight
      const height = maxFloors * floorToFloorHeight;
      const buildingGFA = maxFloors * footprintArea * gbaToGfaRatio;
      
      // Check if we need to apply the setback rule (building > 4 floors)
      const needsSetback = maxFloors > SETBACK_FLOOR_THRESHOLD;
      
      if (needsSetback) {
        // Calculate height of base and top sections
        const baseFloors = SETBACK_FLOOR_THRESHOLD;
        const topFloors = maxFloors - SETBACK_FLOOR_THRESHOLD;
        
        const baseHeight = baseFloors * floorToFloorHeight;
        const topHeight = topFloors * floorToFloorHeight;
        
        // Create base section
        const baseSection = {
          ...buildingFootprint,
          properties: {
            ...buildingFootprint.properties,
            floors: baseFloors,
            height: baseHeight,
            footprintArea: footprintArea,
            gfa: (footprintArea * baseFloors * gbaToGfaRatio),
            buildingIndex: 1,
            _isBaseSection: true,
            _isTopOfStack: false,
            _baseHeight: 0
          }
        };
        
        // Create top section with setback
        // Create a smaller footprint for the upper floors
        let topCoordinates = [];
        if (buildingFootprint.geometry.type === 'Polygon') {
          const coordinates = buildingFootprint.geometry.coordinates[0];
          const center = { 
            geometry: { 
              coordinates: [
                coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length,
                coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length
              ] 
            } 
          };
          
          // Apply the setback to create smaller upper section
          topCoordinates = createSetbackSection(coordinates, center, 1);
        }
        
        const topSection = {
          ...buildingFootprint,
          geometry: {
            ...buildingFootprint.geometry,
            coordinates: [[...topCoordinates, topCoordinates[0]]] // Close the polygon
          },
          properties: {
            ...buildingFootprint.properties,
            floors: topFloors,
            height: topHeight,
            footprintArea: calculatePolygonArea([...topCoordinates, topCoordinates[0]]),
            gfa: (calculatePolygonArea([...topCoordinates, topCoordinates[0]]) * topFloors * gbaToGfaRatio),
            buildingIndex: 1,
            _isBaseSection: false,
            _isTopOfStack: true,
            _baseHeight: baseHeight
          }
        };
        
        return {
          buildingCount: 1, // Still count as 1 building even though it has 2 sections
          buildings: [baseSection, topSection],
          isSingleBuilding: true,
          hobRestricted: false,  // Always using max height, so never restricted
          hobLimit: HOB_LIMIT,
          calculatedGFA: buildingGFA,
          maxBuildingHeight: height,
          depthLimited: exceedsMaxDepth,  // Renamed from widthLimited
          maxAllowedFloors: maxFloorsFromHeight
        };
      } else {
        // Set building properties for visualization (single section building)
        buildingFootprint.properties = {
          ...buildingFootprint.properties,
          floors: maxFloors,
          height: height,
          footprintArea: footprintArea,
          gfa: buildingGFA,
          buildingIndex: 1,
          _isBaseSection: true,
          _isTopOfStack: true,
          _baseHeight: 0
        };
        
        return {
          buildingCount: 1,
          buildings: [buildingFootprint],
          isSingleBuilding: true,
          hobRestricted: false,  // Always using max height, so never restricted
          hobLimit: HOB_LIMIT,
          calculatedGFA: buildingGFA,
          maxBuildingHeight: height,
          depthLimited: exceedsMaxDepth,  // Renamed from widthLimited
          maxAllowedFloors: maxFloorsFromHeight
        };
      }
    }
  } catch (error) {
    console.error('Error calculating optimal building configuration:', error);
    return null;
  }
}; 