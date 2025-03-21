import { LAYER_CONFIGS } from '../../config/layerConfigs';
import { SCREENSHOT_TYPES } from '../../config/screenshotTypes';
import { calculateMercatorParams } from '../../utils/coordinates';
import { getWMSImage } from '../wmsService';
import { getArcGISImage } from '../arcgisService';
import { createCanvas, drawImage, drawBoundary, drawPolyline } from '../../utils/canvas';
import { proxyRequest } from '../../../services/proxyService';
import { loadImage } from '../../utils/image';
import { giraffeState } from '@gi-nx/iframe-sdk';
import proj4 from 'proj4';
import { getPTALToken } from '../tokenService';
import * as turf from '@turf/turf';
import { calculateBounds } from '../../utils/boundsUtils';
import { drawFeatureBoundaries, drawDevelopableAreaBoundaries, drawRoundedTextBox } from '../../utils/drawingUtils';

export async function captureStreetViewScreenshot(feature, developableArea = null) {
    // Check if feature is a FeatureCollection
    const isFeatureCollection = feature && feature.type === 'FeatureCollection' && Array.isArray(feature.features);
    
    // Get all features to consider
    let allFeatures = [];
    
    // Add features from the main feature object if it's a collection
    if (isFeatureCollection) {
      allFeatures = [...feature.features];
    } else if (feature) {
      // Single feature
      allFeatures = [feature];
    }
    
    // Add features from developable area if provided
    if (developableArea && developableArea.features && developableArea.features.length > 0) {
      allFeatures = [...allFeatures, ...developableArea.features];
    }
    
    // Ensure we have at least one feature
    if (allFeatures.length === 0) {
      console.log('No valid features provided for Street View screenshot');
      return null;
    }
    
    // Filter out features without valid geometry
    allFeatures = allFeatures.filter(f => 
      f && f.geometry && f.geometry.coordinates && f.geometry.coordinates.length > 0
    );
    
    if (allFeatures.length === 0) {
      console.log('No features with valid geometry for Street View screenshot');
      return null;
    }
    
    // We'll try each feature until we find one with valid Street View coverage
    const API_KEY = 'AIzaSyA39asjosevcj5vdSAlPoTNkrQ0Vmcouts';
  
    // Try each feature until we find a valid street view
    for (const currentFeature of allFeatures) {
      try {
        // Get the coordinates from the feature
        const coordinates = currentFeature.geometry.coordinates[0];
        if (!coordinates || coordinates.length === 0) {
          console.log('Invalid coordinates in feature, trying next feature');
          continue;
        }
      
        // Calculate center point
        const center = {
          lng: coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length,
          lat: coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length
        };
        
        console.log(`Trying property center: ${center.lat}, ${center.lng}`);
      
        // Generate test points at different distances
        const distances = [20, 30, 40, 50]; // meters
        const angles = Array.from({ length: 8 }, (_, i) => i * 45); // 8 directions
      
        const testPoints = [];
        for (const distance of distances) {
          for (const angle of angles) {
            // Convert angle to radians
            const angleRad = angle * Math.PI / 180;
            
            // Calculate offsets in meters and convert to degrees
            const latOffset = (distance * Math.cos(angleRad)) / 111111; // meters to degrees at equator
            const lngOffset = (distance * Math.sin(angleRad)) / (111111 * Math.cos(center.lat * Math.PI / 180));
      
            const testPoint = {
              lat: center.lat + latOffset,
              lng: center.lng + lngOffset,
              bearing: (angle + 180) % 360 // Point towards center
            };
      
            testPoints.push(testPoint);
          }
        }
      
        // Try each point until we find one with Street View coverage
        for (const point of testPoints) {
          console.log('Trying Street View at point:', point);
      
          try {
            // First check if Street View is available using the metadata API
            const metadataUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${point.lat},${point.lng}&radius=50&source=outdoor&key=${API_KEY}`;
            const metadataResponse = await fetch(metadataUrl);
            const metadata = await metadataResponse.json();
      
            if (metadata.status === 'OK') {
              // Calculate bearing from panorama location to property center
              const panoramaLat = metadata.location.lat;
              const panoramaLng = metadata.location.lng;
              
              // Calculate bearing from panorama to center
              const dLng = (center.lng - panoramaLng) * Math.PI / 180;
              const y = Math.sin(dLng) * Math.cos(center.lat * Math.PI / 180);
              const x = Math.cos(panoramaLat * Math.PI / 180) * Math.sin(center.lat * Math.PI / 180) -
                       Math.sin(panoramaLat * Math.PI / 180) * Math.cos(center.lat * Math.PI / 180) * Math.cos(dLng);
              const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
      
              // Create the street view image
              const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=3840x2160&location=${panoramaLat},${panoramaLng}&heading=${bearing}&pitch=0&fov=90&key=${API_KEY}`;
              console.log('Found valid Street View location, requesting image');
              const streetViewImage = await loadImage(streetViewUrl);
      
              // Create the mini map image showing camera position and all features
              // Prepare static map URL base
              let staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=400x400&key=${API_KEY}`;
              
              // Add all features to the map
              for (let i = 0; i < allFeatures.length; i++) {
                const featureToMap = allFeatures[i];
                if (featureToMap.geometry && featureToMap.geometry.coordinates && featureToMap.geometry.coordinates[0]) {
                  const pathCoords = featureToMap.geometry.coordinates[0].map(coord => `${coord[1]},${coord[0]}`).join('|');
                  
                  // Use different colors for main features vs developable areas
                  const isMainFeature = isFeatureCollection 
                    ? feature.features.includes(featureToMap)
                    : (featureToMap === feature);
                  
                  const color = isMainFeature ? '0xFF0000' : '0xFF9900'; // Red for main features, orange for developable
                  const opacity = isMainFeature ? '33' : '33'; // Same opacity for all
                  
                  staticMapUrl += `&path=color:${color}|weight:${isMainFeature ? 4 : 3}|fillcolor:${color}${opacity}|${pathCoords}`;
                }
              }
              
              // Calculate bounds based on all features
              let allCoordinates = [];
              
              // Collect coordinates from all features
              allFeatures.forEach(featureToMap => {
                if (featureToMap.geometry && featureToMap.geometry.coordinates && featureToMap.geometry.coordinates[0]) {
                  allCoordinates = [...allCoordinates, ...featureToMap.geometry.coordinates[0]];
                }
              });
              
              // Calculate bounds based on all coordinates
              const bounds = allCoordinates.reduce((acc, coord) => ({
                minLat: Math.min(acc.minLat, coord[1]),
                maxLat: Math.max(acc.maxLat, coord[1]),
                minLng: Math.min(acc.minLng, coord[0]),
                maxLng: Math.max(acc.maxLng, coord[0])
              }), {
                minLat: Infinity,
                maxLat: -Infinity,
                minLng: Infinity,
                maxLng: -Infinity
              });
      
              // Calculate center of all features
              const mapCenter = {
                lat: (bounds.minLat + bounds.maxLat) / 2,
                lng: (bounds.minLng + bounds.maxLng) / 2
              };
      
              // Calculate zoom level based on the size of all features
              const latSpan = bounds.maxLat - bounds.minLat;
              const lngSpan = bounds.maxLng - bounds.minLng;
              const maxSpan = Math.max(latSpan, lngSpan);
              // Reduce zoom level by 1 to add more padding
              const zoom = Math.floor(Math.log2(360 / maxSpan)) - 1;  // Further reduced to show more context
              
              // Add remaining parameters to the static map URL
              staticMapUrl += `&markers=anchor:center|icon:https://maps.google.com/mapfiles/dir_${Math.round(bearing/22.5) % 16}.png|${panoramaLat},${panoramaLng}`
                + `&center=${mapCenter.lat},${mapCenter.lng}`
                + `&zoom=${zoom}`  // Using adjusted zoom level
                + '&style=feature:all|element:labels|visibility:off'
                + '&style=feature:landscape|element:geometry|color:0xffffff'
                + '&style=feature:road|element:geometry|color:0xe5e5e5'
                + '&style=feature:road.arterial|element:geometry|color:0xd4d4d4'
                + '&style=feature:road.local|element:geometry|color:0xe5e5e5'
                + '&style=feature:water|element:geometry|visibility:off'
                + '&maptype=roadmap';
              
              console.log('Requesting mini map');
              const miniMapImage = await loadImage(staticMapUrl);
      
              // Create final canvas with both images
              const canvas = createCanvas(1920, 1080);
              const ctx = canvas.getContext('2d');
      
              // Draw street view
              ctx.drawImage(streetViewImage, 0, 0, canvas.width, canvas.height);
      
              // Draw mini map in bottom right corner with solid black border
              const legendHeight = 225;
              const legendWidth = 400;
              const padding = 20;
              const borderWidth = 4;
              
              // Draw solid black border
              ctx.strokeStyle = '#000000';
              ctx.lineWidth = borderWidth;
              ctx.setLineDash([]); // Remove dash pattern
              ctx.strokeRect(
                canvas.width - legendWidth - padding - borderWidth/2, 
                canvas.height - legendHeight - padding - borderWidth/2,
                legendWidth + borderWidth,
                legendHeight + borderWidth
              );
      
              // Draw mini map
              ctx.drawImage(
                miniMapImage,
                canvas.width - legendWidth - padding,
                canvas.height - legendHeight - padding,
                legendWidth,
                legendHeight
              );
              
              // Success! Return the screenshot for this feature
              return canvas.toDataURL('image/png', 1.0);
            }
            
            console.log('No Street View at this point, trying next point...');
          } catch (error) {
            console.log('Error checking Street View at this point, trying next point...', error);
            continue;
          }
        }
        
        console.log('No Street View coverage found at any test points for this feature, trying next feature...');
      } catch (featureError) {
        console.log('Error processing feature, trying next one:', featureError);
      }
    }
  
    console.log('No Street View coverage found for any features');
    return null;
  }