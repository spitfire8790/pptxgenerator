import { convertCmValues } from '../utils/units';
import scoringCriteria from './scoringLogic';
import { proxyRequest } from '../utils/services/proxyService';
import { captureRoadsMap } from '../utils/map/services/screenshots/roadScreenshot';
import { captureUDPPrecinctMap } from '../utils/map/services/screenshots/strategicScreenshot';
import { capturePTALMap } from '../utils/map/services/screenshots/ptalScreenshot';
import { formatAddresses } from '../utils/addressFormatting';

const styles = {
  title: {
    x: '4%',
    y: '7%',
    w: '80%',
    h: '8%',
    fontSize: 26,
    fontFace: 'Public Sans Light',
    autoFit: true,
    breakLine: false,
    color: '002664',
    lineSpacing: 26
  },
  subtitle: {
    color: '363636',
  },
  titleLine: {
    x: '5%',
    y: '17%',
    w: '90%',
    h: 0.01,
    line: { color: '002664', width: 0.7 },
    fill: { color: '002664' }
  },
  sensitiveText: {
    x: '72%',
    y: '2%',
    w: '25%',
    h: '3%',
    fontSize: 9,
    color: 'FF3B3B',
    bold: true,
    align: 'right',
    fontFace: 'Public Sans'
  },
  nswLogo: {
    x: '90%',
    y: '5%',
    w: '8%',
    h: '8%',
    sizing: { type: 'contain' }
  },
  footerLine: {
    x: '5%',
    y: '93%',
    w: '90%',
    h: 0.01,
    line: { color: '002664', width: 0.7 },
    fill: { color: '002664' }
  },
  footer: {
    x: '4%',
    y: '94%',
    w: '90%',
    h: '4%',
    fontSize: 10,
    color: '002664',
    fontFace: 'Public Sans',
    align: 'left'
  },
  pageNumber: {
    x: '94%',
    y: '94%',
    w: '4%',
    h: '4%',
    fontSize: 8,
    color: '002664',
    fontFace: 'Public Sans',
    align: 'left'
  }
};

function ensureCorrectCRS(geometry) {
  // Here we're checking if coordinates appear to be in the wrong CRS
  // Basic check: If coordinates are outside reasonable GDA94 bounds for Australia
  if (!geometry || !geometry.coordinates) return geometry;
  
  // Check first coordinate of first ring (for polygons)
  if (geometry.type === 'Polygon' && geometry.coordinates[0]?.[0]) {
    const [lon, lat] = geometry.coordinates[0][0];
    // If coordinates look like they're already in Web Mercator or another projected system
    if (Math.abs(lon) > 180 || Math.abs(lat) > 90) {
      console.warn('Detected potential CRS issue in developable area geometry - skipping this geometry');
      return null; // Skip this geometry as it's likely in the wrong CRS
    }
  }
  
  return geometry;
}

export async function addAccessSlide(pptx, propertyData) {
  try {
    console.log('Starting to add access slide...');
    
    // Format developableArea consistently for both scoring and screenshots
    const formattedDevelopableArea = propertyData.developableArea?.length ? {
      type: 'FeatureCollection',
      features: propertyData.developableArea
        .map(area => {
          const validGeometry = ensureCorrectCRS(area.geometry);
          return validGeometry ? {
            type: 'Feature',
            geometry: validGeometry
          } : null;
        })
        .filter(Boolean) // Remove null entries
    } : null;
    
    // Get feature geometries from all possible sources
    let featureToUse = null;

    // Add detailed logging of each potential geometry source
    console.log('CombinedGeometry:', JSON.stringify(propertyData.combinedGeometry));
    console.log('SiteGeometry:', JSON.stringify(propertyData.site__geometry));
    console.log('DevelopableArea sample:', propertyData.developableArea ? JSON.stringify(propertyData.developableArea[0]) : 'null');
    console.log('AllProperties sample:', propertyData.allProperties ? JSON.stringify(propertyData.allProperties[0]) : 'null');

    // First, handle multiple properties case
    if (propertyData.isMultipleProperties && propertyData.allProperties && Array.isArray(propertyData.allProperties)) {
      console.log('Using multiple properties for access slide');
      
      // Create a FeatureCollection to represent all properties
      featureToUse = {
        type: 'FeatureCollection',
        features: propertyData.allProperties.map(prop => {
          let geometry = null;
          
          // Try to extract geometry from various possible locations
          if (prop.geometry) {
            geometry = prop.geometry;
          } else if (prop.copiedFrom?.site__geometry) {
            geometry = prop.copiedFrom.site__geometry;
          } else if (prop.site?.geometry) {
            geometry = prop.site.geometry;
          }
          
          if (!geometry) {
            console.warn('Could not find geometry for property:', prop);
            return null;
          }
          
          return {
            type: 'Feature',
            geometry: geometry,
            properties: prop
          };
        }).filter(Boolean) // Remove any null features
      };
      
      // If no valid features were found, log error and try individual approach
      if (!featureToUse.features || featureToUse.features.length === 0) {
        console.warn('No valid features found in allProperties, trying combinedGeometry');
        featureToUse = null;
      }
    }
    
    // If not using multiple properties or if multiple properties approach failed, 
    // use the normal combinedGeometry approach
    if (!featureToUse) {
      // First, try combined geometry (for multiple properties)
      if (propertyData.combinedGeometry) {
        console.log('Using combinedGeometry for multiple properties');
        
        // Handle string JSON format (common in some APIs)
        if (typeof propertyData.combinedGeometry === 'string') {
          try {
            console.log('combinedGeometry is a string, trying to parse as JSON');
            propertyData.combinedGeometry = JSON.parse(propertyData.combinedGeometry);
            console.log('Successfully parsed combinedGeometry string');
          } catch (e) {
            console.error('Failed to parse combinedGeometry string:', e);
          }
        }
        
        // Validate combinedGeometry structure
        if (typeof propertyData.combinedGeometry === 'object') {
          if (!propertyData.combinedGeometry.geometry && propertyData.combinedGeometry.features) {
            // It might be a FeatureCollection - use first feature
            console.log('combinedGeometry appears to be a FeatureCollection, using all features');
            featureToUse = propertyData.combinedGeometry;
          } else if (propertyData.combinedGeometry.geometry) {
            // It's already a Feature
            featureToUse = propertyData.combinedGeometry;
          } else if (propertyData.combinedGeometry.type === 'Polygon' || 
                    propertyData.combinedGeometry.type === 'MultiPolygon' ||
                    propertyData.combinedGeometry.coordinates) {
            // It's a raw geometry object, wrap it
            console.log('combinedGeometry appears to be a raw geometry, wrapping as Feature');
            featureToUse = {
              type: 'Feature',
              geometry: propertyData.combinedGeometry,
              properties: propertyData
            };
          } else {
            console.warn('combinedGeometry has unexpected structure:', propertyData.combinedGeometry);
          }
        } else {
          console.warn('combinedGeometry is not an object:', typeof propertyData.combinedGeometry);
        }
      }
    }

    // Then try site__geometry if we still don't have a feature
    if (!featureToUse && propertyData.site__geometry) {
      console.log('Trying site__geometry:', JSON.stringify(propertyData.site__geometry).substring(0, 100));
      
      // Check different formats that site__geometry might be in
      if (Array.isArray(propertyData.site__geometry)) {
        if (propertyData.site__geometry.length > 0) {
          // Check if it's coordinates array or array of features
          if (Array.isArray(propertyData.site__geometry[0])) {
            // Looks like coordinates
            console.log('site__geometry appears to be coordinates array');
            featureToUse = {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [propertyData.site__geometry]
              },
              properties: propertyData
            };
          } else if (typeof propertyData.site__geometry[0] === 'object') {
            // Might be features array
            console.log('site__geometry appears to be features array');
            // Create a FeatureCollection
            featureToUse = {
              type: 'FeatureCollection',
              features: propertyData.site__geometry.map(item => {
                if (item.geometry) {
                  return {
                    type: 'Feature',
                    geometry: item.geometry,
                    properties: propertyData
                  }
                }
                return null;
              }).filter(Boolean)
            };
            
            // If no valid features, try just using the first item directly
            if (featureToUse.features.length === 0 && propertyData.site__geometry[0].geometry) {
              featureToUse = {
                type: 'Feature',
                geometry: propertyData.site__geometry[0].geometry,
                properties: propertyData
              };
            }
          } else {
            console.warn('site__geometry array has unexpected structure:', propertyData.site__geometry[0]);
          }
        } else {
          console.warn('site__geometry is an empty array');
        }
      } else if (typeof propertyData.site__geometry === 'object') {
        // Might be a direct geometry object
        console.log('site__geometry appears to be a geometry object');
        featureToUse = {
          type: 'Feature',
          geometry: propertyData.site__geometry,
          properties: propertyData
        };
      } else {
        console.warn('site__geometry has unexpected type:', typeof propertyData.site__geometry);
      }
    }

    // Try to use the developable area if available
    if (!featureToUse && formattedDevelopableArea && formattedDevelopableArea.features && formattedDevelopableArea.features.length > 0) {
      console.log('Using developable area with', formattedDevelopableArea.features.length, 'features');
      console.log('First developable area feature:', JSON.stringify(formattedDevelopableArea.features[0]).substring(0, 200));
      
      // Use all developable area features in a FeatureCollection
      featureToUse = formattedDevelopableArea;
      
      // Add propertyData to each feature
      featureToUse.features.forEach(feature => {
        feature.properties = { ...propertyData, ...feature.properties };
      });
    }

    // Check for allProperties array (for multiple properties)
    if (!featureToUse && propertyData.allProperties && Array.isArray(propertyData.allProperties) && propertyData.allProperties.length > 0) {
      console.log('Trying to construct feature from allProperties array with', propertyData.allProperties.length, 'properties');
      
      const features = [];
      
      // Try to extract geometry from each property
      for (let i = 0; i < propertyData.allProperties.length; i++) {
        const prop = propertyData.allProperties[i];
        console.log(`Checking property ${i} for geometry`);
        
        let geometry = null;
        
        if (prop.site__geometry) {
          console.log(`Property ${i} has site__geometry`);
          geometry = prop.site__geometry;
        } else if (prop.geometry) {
          console.log(`Property ${i} has direct geometry`);
          geometry = prop.geometry;
        } else if (prop.site && prop.site.geometry) {
          console.log(`Property ${i} has site.geometry`);
          geometry = prop.site.geometry;
        } else if (prop.copiedFrom?.site__geometry) {
          console.log(`Property ${i} has copiedFrom.site__geometry`);
          geometry = prop.copiedFrom.site__geometry;
        }
        
        if (geometry) {
          // Check if the geometry is an array of coordinates or a proper GeoJSON geometry
          const geomObj = Array.isArray(geometry) ? 
            { type: 'Polygon', coordinates: [geometry] } : 
            geometry;
            
          features.push({
            type: 'Feature',
            geometry: geomObj,
            properties: { ...propertyData, ...prop }
          });
          console.log(`Added feature from property ${i}`);
        }
      }
      
      // If we found any valid features, create a FeatureCollection
      if (features.length > 0) {
        featureToUse = {
          type: 'FeatureCollection',
          features: features
        };
        console.log(`Created FeatureCollection with ${features.length} features from allProperties`);
      }
    }

    // Last resort - try to handle any stringified geometry
    if (!featureToUse) {
      try {
        // Check if any of the geometry fields might be stringified JSON
        if (typeof propertyData.combinedGeometry === 'string' && propertyData.combinedGeometry.includes('{')) {
          console.log('Attempting to parse stringified combinedGeometry');
          const parsedGeometry = JSON.parse(propertyData.combinedGeometry);
          featureToUse = {
            type: 'Feature',
            geometry: parsedGeometry.geometry || parsedGeometry,
            properties: propertyData
          };
        } else if (typeof propertyData.site__geometry === 'string' && propertyData.site__geometry.includes('[')) {
          console.log('Attempting to parse stringified site__geometry');
          const parsedGeometry = JSON.parse(propertyData.site__geometry);
          featureToUse = {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [parsedGeometry]
            },
            properties: propertyData
          };
        }
        
        // Check for site_geometry (with single underscore) which is used in some APIs
        if (!featureToUse && propertyData.site_geometry) {
          console.log('Trying site_geometry (single underscore)');
          if (Array.isArray(propertyData.site_geometry)) {
            featureToUse = {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [propertyData.site_geometry]
              },
              properties: propertyData
            };
          } else if (typeof propertyData.site_geometry === 'object') {
            featureToUse = {
              type: 'Feature',
              geometry: propertyData.site_geometry,
              properties: propertyData
            };
          } else if (typeof propertyData.site_geometry === 'string' && propertyData.site_geometry.includes('[')) {
            // Try to parse string
            const parsedGeometry = JSON.parse(propertyData.site_geometry);
            featureToUse = {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [parsedGeometry]
              },
              properties: propertyData
            };
          }
        }
      } catch (parseError) {
        console.error('Error parsing stringified geometry:', parseError);
      }
    }

    // Final validation of the selected feature
    if (featureToUse) {
      console.log('Selected feature:', {
        type: featureToUse.type,
        hasGeometry: featureToUse.type === 'FeatureCollection' ? 
                    `FeatureCollection with ${featureToUse.features?.length || 0} features` :
                    !!featureToUse.geometry,
        geometryType: featureToUse.type === 'FeatureCollection' ? 
                    featureToUse.features?.map(f => f.geometry?.type).join(', ') :
                    featureToUse.geometry?.type,
        hasCoordinates: featureToUse.type === 'FeatureCollection' ?
                    `Multiple features` :
                    !!featureToUse.geometry?.coordinates,
        coordinatesLength: featureToUse.type === 'FeatureCollection' ?
                    `Multiple features` :
                    (featureToUse.geometry?.coordinates ? 
                    (Array.isArray(featureToUse.geometry.coordinates) ? featureToUse.geometry.coordinates.length : 'not array') : 'no coordinates'),
        coordinatesSample: featureToUse.type === 'FeatureCollection' ?
                    `Multiple features` :
                    (featureToUse.geometry?.coordinates ? 
                    JSON.stringify(featureToUse.geometry.coordinates).substring(0, 100) : 'none')
      });

      // If we have a FeatureCollection, check each feature's coordinates
      if (featureToUse.type === 'FeatureCollection' && featureToUse.features) {
        for (let i = 0; i < featureToUse.features.length; i++) {
          const feature = featureToUse.features[i];
          console.log(`Feature ${i+1} details:`, {
            hasGeometry: !!feature.geometry,
            geometryType: feature.geometry?.type,
            hasCoordinates: !!feature.geometry?.coordinates,
            coordinatesLength: feature.geometry?.coordinates ? 
                            (Array.isArray(feature.geometry.coordinates) ? feature.geometry.coordinates.length : 'not array') : 'no coordinates',
            coordinatesSample: feature.geometry?.coordinates ? 
                            JSON.stringify(feature.geometry.coordinates).substring(0, 100) : 'none'
          });
          
          // Check for empty or invalid coordinates
          if (feature.geometry && (!feature.geometry.coordinates || 
              (Array.isArray(feature.geometry.coordinates) && feature.geometry.coordinates.length === 0))) {
            console.warn(`Feature ${i+1} has empty coordinates, checking for alternative geometry sources`);
            
            // Try to get coordinates from another source
            if (propertyData.site__geometry && Array.isArray(propertyData.site__geometry) && propertyData.site__geometry.length > 0) {
              console.log('Using site__geometry as fallback for empty coordinates');
              feature.geometry = {
                type: 'Polygon',
                coordinates: [propertyData.site__geometry]
              };
            } else if (propertyData.developableArea && propertyData.developableArea.length > 0 && 
                      propertyData.developableArea[0].geometry && propertyData.developableArea[0].geometry.coordinates) {
              console.log('Using developableArea geometry as fallback for empty coordinates');
              feature.geometry = propertyData.developableArea[0].geometry;
            }
          }
        }
      } 
      // Check for empty or invalid coordinates on a single feature
      else if (featureToUse.geometry && (!featureToUse.geometry.coordinates || 
          (Array.isArray(featureToUse.geometry.coordinates) && featureToUse.geometry.coordinates.length === 0))) {
        console.warn('Feature has empty coordinates, checking for alternative geometry sources');
        
        // Try to get coordinates from another source
        if (propertyData.site__geometry && Array.isArray(propertyData.site__geometry) && propertyData.site__geometry.length > 0) {
          console.log('Using site__geometry as fallback for empty coordinates');
          featureToUse.geometry = {
            type: 'Polygon',
            coordinates: [propertyData.site__geometry]
          };
        } else if (propertyData.developableArea && propertyData.developableArea.length > 0 && 
                  propertyData.developableArea[0].geometry && propertyData.developableArea[0].geometry.coordinates) {
          console.log('Using developableArea geometry as fallback for empty coordinates');
          featureToUse.geometry = propertyData.developableArea[0].geometry;
        }
      }
    }

    // If we still don't have valid geometry, check if we have partial geometry we can fix
    if (!featureToUse || !featureToUse.geometry || !featureToUse.geometry.coordinates) {
      console.log('No fully valid geometry found, checking for fixable geometries');
      
      // Check if we have geometry without proper coordinates
      if (featureToUse && featureToUse.geometry && !featureToUse.geometry.coordinates && featureToUse.geometry.type) {
        console.log('Found geometry without coordinates, attempting to fix');
        
        // Common case: geometry with missing coordinates
        // Try to find coordinates from any other source
        if (propertyData.site__geometry && Array.isArray(propertyData.site__geometry)) {
          console.log('Fixing geometry with site__geometry coordinates');
          featureToUse.geometry.coordinates = [propertyData.site__geometry];
          featureToUse.geometry.type = 'Polygon';
        } 
        else if (propertyData.site_geometry && Array.isArray(propertyData.site_geometry)) {
          console.log('Fixing geometry with site_geometry coordinates');
          featureToUse.geometry.coordinates = [propertyData.site_geometry];
          featureToUse.geometry.type = 'Polygon';
        }
        // Check if coordinates is a string that needs parsing
        else if (featureToUse.geometry.coordinates === null && 
                typeof featureToUse.geometry.rawCoordinates === 'string') {
          try {
            console.log('Attempting to parse rawCoordinates string');
            featureToUse.geometry.coordinates = JSON.parse(featureToUse.geometry.rawCoordinates);
          } catch(e) {
            console.error('Failed to parse rawCoordinates:', e);
          }
        }
      }
    }

    // Final error check
    if (!featureToUse || 
       (featureToUse.type !== 'FeatureCollection' && (!featureToUse.geometry || !featureToUse.geometry.coordinates)) ||
       (featureToUse.type === 'FeatureCollection' && (!featureToUse.features || featureToUse.features.length === 0))) {
      console.error('No valid geometry found in property data:', {
        hasCombinedGeometry: !!propertyData.combinedGeometry,
        combinedGeometryType: propertyData.combinedGeometry ? typeof propertyData.combinedGeometry : 'none',
        hasSiteGeometry: !!propertyData.site__geometry,
        siteGeometryType: propertyData.site__geometry ? (Array.isArray(propertyData.site__geometry) ? 'array' : typeof propertyData.site__geometry) : 'none',
        hasGeometry: !!propertyData.geometry,
        hasSite: !!propertyData.site,
        hasSiteWithGeometry: !!(propertyData.site && propertyData.site.geometry),
        hasDevelopableArea: !!(propertyData.developableArea && propertyData.developableArea.length > 0),
        developableAreaLength: propertyData.developableArea ? propertyData.developableArea.length : 0,
        hasAllProperties: !!(propertyData.allProperties && Array.isArray(propertyData.allProperties) && propertyData.allProperties.length > 0),
        allPropertiesLength: propertyData.allProperties ? propertyData.allProperties.length : 0
      });
      
      throw new Error('No valid geometry data found in property data. Check console for details.');
    }
    
    // Create an object to store all screenshots
    const screenshots = {};
    
    // Generate access maps in parallel
    console.log('Generating access maps in parallel...');

    // First get the roads map and features
    try {
      console.log('Capturing roads map...');
      console.log('Using feature for roads map:', {
        type: featureToUse.type,
        features: featureToUse.type === 'FeatureCollection' ? `${featureToUse.features.length} features` : 'single feature'
      });
      
      const roadsResult = await captureRoadsMap(
        featureToUse, 
        formattedDevelopableArea,
        propertyData.showDevelopableArea !== undefined ? propertyData.showDevelopableArea : true, // Use user toggle
        true, // useDevelopableAreaForBounds - keep true to include developable area in bounds
        false  // showLabels - set to false to remove "Subject Site" labels
      );
      
      // Store the road features in propertyData
      if (roadsResult?.roadFeatures) {
        console.log('Road features extracted from map:', roadsResult.roadFeatures);
        propertyData.roadFeatures = roadsResult.roadFeatures;
      } else {
        console.warn('No road features found in roadsResult');
        // Try to get road features from the feature properties if available
        if (featureToUse.properties?.roadFeatures) {
          console.log('Using road features from feature properties');
          propertyData.roadFeatures = featureToUse.properties.roadFeatures;
        } else if (featureToUse.type === 'FeatureCollection' && featureToUse.features[0]?.properties?.roadFeatures) {
          console.log('Using road features from first feature properties in collection');
          propertyData.roadFeatures = featureToUse.features[0].properties.roadFeatures;
        } else {
          console.warn('No road features found in feature properties either');
          propertyData.roadFeatures = []; // Initialize with empty array to avoid undefined
        }
      }
      
      // Store the screenshot
      if (roadsResult?.dataURL) {
        screenshots.roadsScreenshot = roadsResult.dataURL;
      }
    } catch (roadsError) {
      console.error('Error capturing roads map:', roadsError);
      propertyData.roadFeatures = propertyData.roadFeatures || [];
    }

    // Log the road features before scoring
    console.log('Road features before scoring:', propertyData.roadFeatures);

    // Now calculate the roads score with the loaded features
    let roadsScoreResult;
    let roadsDescription;
    try {
      roadsScoreResult = scoringCriteria.roads.calculateScore(
        propertyData.roadFeatures, 
        propertyData.developableArea,
        propertyData.isMultipleProperties ? propertyData.allProperties : null
      );
      roadsDescription = scoringCriteria.roads.getScoreDescription(roadsScoreResult);
    } catch (scoringError) {
      console.error('Error calculating road score:', scoringError);
      // Fallback for scoring error
      roadsScoreResult = { score: 1 };
      roadsDescription = "Unable to calculate road score due to insufficient data.";
    }

    // Get the remaining maps in parallel
    try {
      console.log('Capturing UDP and PTAL maps in parallel');
      console.log('Using feature for UDP map:', {
        type: featureToUse.type,
        features: featureToUse.type === 'FeatureCollection' ? `${featureToUse.features.length} features` : 'single feature'
      });
      
      const [udpScreenshot, ptalScreenshot] = await Promise.allSettled([
        // Get UDP precincts map with LMR layers
        captureUDPPrecinctMap(
          featureToUse, 
          formattedDevelopableArea,
          propertyData.showDevelopableArea !== undefined ? propertyData.showDevelopableArea : true, // Use user toggle
          false, // useDevelopableAreaForBounds
          false  // showLabels - set to false to remove "Subject Site" labels
        ),
        
        // Get PTAL map
        capturePTALMap(
          featureToUse, 
          formattedDevelopableArea,
          propertyData.showDevelopableArea !== undefined ? propertyData.showDevelopableArea : true, // Use user toggle
          false, // useDevelopableAreaForBounds
          false  // showLabels - set to false to remove "Subject Site" labels
        )
      ]);
      
      // Process UDP result
      if (udpScreenshot.status === 'fulfilled' && udpScreenshot.value) {
        console.log('UDP map capture successful');
        screenshots.udpScreenshot = udpScreenshot.value.dataURL || udpScreenshot.value;
        
        // Store UDP features data for scoring if available
        if (udpScreenshot.value.udpFeatures) {
          console.log('UDP features found:', udpScreenshot.value.udpFeatures);
          propertyData.udpFeatures = udpScreenshot.value.udpFeatures;
        }
        
        // Store LMR overlap data if available
        if (udpScreenshot.value.lmrOverlap) {
          console.log('LMR overlap data found:', udpScreenshot.value.lmrOverlap);
          propertyData.lmrOverlap = udpScreenshot.value.lmrOverlap;
        }
      } else {
        console.error('Error capturing UDP map:', udpScreenshot.reason);
      }
      
      // Process PTAL result
      if (ptalScreenshot.status === 'fulfilled' && ptalScreenshot.value) {
        console.log('PTAL map capture successful');
        screenshots.ptalScreenshot = ptalScreenshot.value.dataURL || ptalScreenshot.value;
        
        // Store PTAL values if available
        if (ptalScreenshot.value.ptalValues) {
          console.log('PTAL values found:', ptalScreenshot.value.ptalValues);
          if (!featureToUse.properties) featureToUse.properties = {};
          featureToUse.properties.ptalValues = ptalScreenshot.value.ptalValues;
        }
        
        if (ptalScreenshot.value.featurePTALs) {
          console.log('Feature PTALs found:', ptalScreenshot.value.featurePTALs);
          if (!featureToUse.properties) featureToUse.properties = {};
          featureToUse.properties.featurePTALs = ptalScreenshot.value.featurePTALs;
        }
      } else {
        console.error('Error capturing PTAL map:', ptalScreenshot.reason);
      }
    } catch (mapError) {
      console.error('Error in parallel map generation:', mapError);
    }

    // Get the LMR overlap information with safe fallbacks
    const lmrOverlap = featureToUse.properties?.lmrOverlap || { 
      hasOverlap: false, 
      primaryOverlap: null
    };

    // Get developable area LMR overlap information with safe fallbacks
    const developableAreaLmrOverlap = featureToUse.properties?.developableAreaLmrOverlap || [];

    // Calculate strategic centre score with town centre buffer data if available
    let strategicCentreScore = 1; // Default score
    let strategicCentreDescription = "Unable to calculate strategic centre score.";
    try {
      strategicCentreScore = scoringCriteria.strategicCentre.calculateScore(propertyData);
      strategicCentreDescription = scoringCriteria.strategicCentre.getScoreDescription(strategicCentreScore);
    } catch (scoringError) {
      console.error('Error calculating strategic centre score:', scoringError);
    }

    // Store LMR status in propertyData for use by other slides
    propertyData.isInLMRArea = lmrOverlap.hasOverlap || developableAreaLmrOverlap.some(o => o.hasOverlap);
    propertyData.lmrOverlap = lmrOverlap;  // Store full overlap data for reference
    propertyData.developableAreaLmrOverlap = developableAreaLmrOverlap;

    // Calculate UDP score using the enhanced scoring logic that includes LMR overlap
    let udpScoreResult = { score: 3, minDistance: 5000 }; // Default to score 3
    let udpDescription = "Please update description and scoring based on site location.";
    
    // Note: We're keeping the calculation logic but overriding the results
    try {
      // Run the scoring logic but don't use the result
      const calculatedScore = scoringCriteria.udpPrecincts.calculateScore(
        { 
          ...propertyData.udpPrecincts, 
          lmrOverlap,
          developableAreaLmrOverlap
        }, 
        propertyData.developableArea
      );
      
      console.log('UDP score calculation ran but using placeholder instead:', calculatedScore);
      // We're not using the calculated score but keeping the calculation for future reference
    } catch (udpError) {
      console.error('Error calculating UDP score:', udpError);
    }

    // Get PTAL values with safe fallbacks
    const ptalValues = featureToUse.properties?.ptalValues || [];
    const featurePTALs = featureToUse.properties?.featurePTALs || [];

    // Calculate PTAL score based on the best PTAL for different features
    let ptalScoreResult = 0;
    let ptalDescription = "No PTAL data available for this location.";

    try {
      // Only try to calculate scores if we have values
      if (ptalValues.length > 0 || featurePTALs.length > 0) {
        ptalScoreResult = scoringCriteria.ptal.calculateScore(ptalValues, featurePTALs);
        ptalDescription = scoringCriteria.ptal.getScoreDescription(ptalScoreResult, ptalValues, featurePTALs);
      } else {
        console.warn('No PTAL values available for scoring');
      }
    } catch (ptalScoringError) {
      console.error('Error calculating PTAL score:', ptalScoringError);
    }

    console.log('PTAL score result:', ptalScoreResult);
    console.log('PTAL description:', ptalDescription);

    // Ensure scores object exists and store the scores
    if (!propertyData.scores) {
      propertyData.scores = {};
    }
    propertyData.scores.roads = roadsScoreResult.score;
    propertyData.scores.udpPrecincts = udpScoreResult.score;
    propertyData.scores.ptal = ptalScoreResult;
    
    // Create slide
    const slide = pptx.addSlide({ masterName: 'NSW_MASTER' });

    // Determine if we're dealing with multiple properties
    const isMultipleProperties = propertyData.isMultipleProperties || 
                               (propertyData.site__multiple_addresses && 
                               Array.isArray(propertyData.site__multiple_addresses) && 
                               propertyData.site__multiple_addresses.length > 1);
    
    // Use the pre-formatted address if available, otherwise fall back to the old logic
    const addressText = propertyData.formatted_address || 
                      (isMultipleProperties 
                        ? formatAddresses(propertyData.site__multiple_addresses)
                        : propertyData.site__address);

    // Add title
    slide.addText([
      { text: addressText, options: { color: styles.title.color } },
      { text: ' ', options: { breakLine: true } },
      { text: 'Access and Proximity to Strategic Centres', options: { color: styles.subtitle.color } }
    ], convertCmValues({
      ...styles.title,
      color: undefined
    }));

    // Add horizontal line under title
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.titleLine));

    // Add sensitive text
    slide.addText("SENSITIVE: NSW GOVERNMENT", convertCmValues(styles.sensitiveText));

    // Add NSW Logo
    slide.addImage({
      path: "/images/NSW-Government-official-logo.jpg",
      ...convertCmValues(styles.nswLogo)
    });

    // Section 1 - Roads (Left)
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '5%',
      y: '18%',
      w: '28%',
      h: '56%',
      fill: 'FFFFFF',
      line: { color: '002664', width: 1 }
    }));

    // Roads Title
    slide.addText('Roads (by classification)', convertCmValues({
      x: '5%',
      y: '18%',
      w: '28%',
      h: '6%',
      fill: '002664',
      color: 'FFFFFF',
      fontSize: 14,
      fontFace: 'Public Sans',
      align: 'center',
      valign: 'middle'
    }));

    // Add roads map
    if (screenshots.roadsScreenshot) {
      slide.addImage({
        data: screenshots.roadsScreenshot,
        ...convertCmValues({
          x: '5%',
          y: '24%',
          w: '28%',
          h: '50%',
          sizing: { type: 'contain', align: 'center', valign: 'middle' }
        })
      });
    } else {
      // Add fallback message when roads map is missing
      slide.addText('Roads map data unavailable', convertCmValues({
        x: '5%',
        y: '35%',
        w: '28%',
        h: '10%',
        fontSize: 10,
        color: '8C8C8C',
        fontFace: 'Public Sans',
        align: 'center',
        italic: true
      }));
    }

    // Roads description box
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '5%',
      y: '75%',
      w: '28%',
      h: '12%',
      fill: scoringCriteria.roads.getScoreColor(roadsScoreResult.score).replace('#', ''),
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // Roads description text
    slide.addText(roadsDescription, convertCmValues({
      x: '5%',
      y: '75%',
      w: '28%',
      h: '8%',
      fontSize: 7,
      color: '363636',
      fontFace: 'Public Sans',
      align: 'left',
      valign: 'top',
      wrap: true
    }));

    // Roads score text
    slide.addText(`Score: ${roadsScoreResult.score}/3`, convertCmValues({
      x: '5%',
      y: '80%',
      w: '28%',
      h: '4%',
      fontSize: 7,
      color: '363636',
      fontFace: 'Public Sans',
      bold: true,
      align: 'right'
    }));

    // Roads line
    slide.addShape(pptx.shapes.LINE, convertCmValues({
      x: '6%',
      y: '83.5%',
      w: '26%',
      h: 0,
      line: { color: '8C8C8C', width: 0.4 }
    }));

    // Roads source text
    slide.addText('Source: NSW Road Segments, DPHI, 2024', convertCmValues({
      x: '5%',
      y: '83%',
      w: '28%',
      h: '3%',
      fontSize: 6,
      color: '363636',
      fontFace: 'Public Sans Light',
      italic: true,
      align: 'left',
      wrap: true
    }));

    // For Roads section (left)
    slide.addShape(pptx.shapes.LINE, convertCmValues({
      x: '6%',
      y: '86%',
      w: '26%',
      h: 0,
      line: { color: '8C8C8C', width: 0.4 }
    }));

    // Section 2 - Strategic (Middle)
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '36%',
      y: '18%',
      w: '28%',
      h: '56%',
      fill: 'FFFFFF',
      line: { color: '002664', width: 1 }
    }));

    // Strategic Title
    slide.addText('Proximity to Strategic Centre', convertCmValues({
      x: '36%',
      y: '18%',
      w: '28%',
      h: '6%',
      fill: '002664',
      color: 'FFFFFF',
      fontSize: 14,
      fontFace: 'Public Sans',
      align: 'center',
      valign: 'middle'
    }));

    // Add UDP precincts map
    if (screenshots.udpScreenshot) {
      slide.addImage({
        data: screenshots.udpScreenshot,
        ...convertCmValues({
          x: '36%',
          y: '24%',
          w: '28%',
          h: '50%',
          sizing: { type: 'contain', align: 'center', valign: 'middle' }
        })
      });
    } else {
      // Add fallback message when UDP map is missing
      slide.addText('Strategic centre map data unavailable', convertCmValues({
        x: '36%',
        y: '35%',
        w: '28%',
        h: '10%',
        fontSize: 10,
        color: '8C8C8C',
        fontFace: 'Public Sans',
        align: 'center',
        italic: true
      }));
    }

    // UDP Precincts description box
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '36%',
      y: '75%',
      w: '28%',
      h: '12%',
      fill: scoringCriteria.udpPrecincts.getScoreColor(udpScoreResult.score).replace('#', ''),
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // UDP Precincts description text
    slide.addText(udpDescription, convertCmValues({
      x: '36%',
      y: '75%',
      w: '28%',
      h: '8%',
      fontSize: 7,
      color: '363636',
      fontFace: 'Public Sans',
      align: 'left',
      valign: 'top',
      wrap: true
    }));

    // UDP Precincts score text
    slide.addText(`Score: ${udpScoreResult.score}/3`, convertCmValues({
      x: '36%',
      y: '80%',
      w: '28%',
      h: '4%',
      fontSize: 7,
      color: '363636',
      fontFace: 'Public Sans',
      bold: true,
      align: 'right'
    }));

    // UDP Precincts line
    slide.addShape(pptx.shapes.LINE, convertCmValues({
      x: '37%',
      y: '83.5%',
      w: '26%',
      h: 0,
      line: { color: '8C8C8C', width: 0.4 }
    }));

    // UDP Precincts source text
    slide.addText('Source: Department of Planning, Housing and Infrastructure, 2025', convertCmValues({
      x: '36%',
      y: '83%',
      w: '28%',
      h: '3%',
      fontSize: 6,
      color: '363636',
      fontFace: 'Public Sans Light',
      italic: true,
      align: 'left',
      wrap: true
    }));

    // For UDP Precincts section (middle)
    slide.addShape(pptx.shapes.LINE, convertCmValues({
      x: '37%',
      y: '86%',
      w: '26%',
      h: 0,
      line: { color: '8C8C8C', width: 0.4 }
    }));

    // Section 3 - PTAL (Right)
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '67%',
      y: '18%',
      w: '28%',
      h: '56%',
      fill: 'FFFFFF',
      line: { color: '002664', width: 1 }
    }));

    // PTAL Title
    slide.addText('Public Transport Access Level (PTAL)', convertCmValues({
      x: '67%',
      y: '18%',
      w: '28%',
      h: '6%',
      fill: '002664',
      color: 'FFFFFF',
      fontSize: 14,
      fontFace: 'Public Sans',
      align: 'center',
      valign: 'middle'
    }));

    // Add PTAL map
    if (screenshots.ptalScreenshot) {
      slide.addImage({
        data: screenshots.ptalScreenshot,
        ...convertCmValues({
          x: '67%',
          y: '24%',
          w: '28%',
          h: '50%',
          sizing: { type: 'contain', align: 'center', valign: 'middle' }
        })
      });
      
      // Legend removed as it's already captured in the screenshot
    } else {
      // Add fallback message when PTAL map is missing
      slide.addText('PTAL map data unavailable', convertCmValues({
        x: '67%',
        y: '35%',
        w: '28%',
        h: '10%',
        fontSize: 10,
        color: '8C8C8C',
        fontFace: 'Public Sans',
        align: 'center',
        italic: true
      }));
    }

    // PTAL description box
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
      x: '67%',
      y: '75%',
      w: '28%',
      h: '12%',
      fill: ptalScoreResult ? scoringCriteria.ptal.getScoreColor(ptalScoreResult).replace('#', '') : 'F2F2F2',
      line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
    }));

    // PTAL description text
    slide.addText(ptalDescription, convertCmValues({
      x: '67%',
      y: '75%',
      w: '28%',
      h: '8%',
      fontSize: 7,
      color: '363636',
      fontFace: 'Public Sans',
      align: 'left',
      valign: 'top',
      wrap: true
    }));

    // PTAL score text
    slide.addText(`Score: ${ptalScoreResult || 'N/A'}/3`, convertCmValues({
      x: '67%',
      y: '80%',
      w: '28%',
      h: '4%',
      fontSize: 7,
      color: '363636',
      fontFace: 'Public Sans',
      bold: true,
      align: 'right'
    }));

    // PTAL line
    slide.addShape(pptx.shapes.LINE, convertCmValues({
      x: '68%',
      y: '83.5%',
      w: '26%',
      h: 0,
      line: { color: '8C8C8C', width: 0.4 }
    }));

    // PTAL source text
    slide.addText('Source: Transport for NSW, 2024', convertCmValues({
      x: '67%',
      y: '83%',
      w: '28%',
      h: '3%',
      fontSize: 6,
      color: '363636',
      fontFace: 'Public Sans Light',
      italic: true,
      align: 'left',
      wrap: true
    }));

    // For PTAL section (right)
    slide.addShape(pptx.shapes.LINE, convertCmValues({
      x: '68%',
      y: '86%',
      w: '26%',
      h: 0,
      line: { color: '8C8C8C', width: 0.4 }
    }));

    // Add footer line
    slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.footerLine));

    // Add footer text and page number
    slide.addText('Property and Development NSW', convertCmValues(styles.footer));
    slide.addText('9', convertCmValues(styles.pageNumber));

    return slide;
  } catch (error) {
    console.error('Error adding access slide:', error);
    try {
      const errorSlide = pptx.addSlide({ masterName: 'NSW_MASTER' });
      errorSlide.addText('Error generating access slide: ' + error.message, {
        x: '10%',
        y: '45%',
        w: '80%',
        h: '10%',
        fontSize: 14,
        color: 'FF0000',
        align: 'center'
      });
      return errorSlide;
    } catch (slideError) {
      console.error('Failed to add error message to slide:', slideError);
      throw error; // Re-throw the original error
    }
  }
}
