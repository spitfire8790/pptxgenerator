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

export async function capturePrimarySiteAttributesMap(feature, developableArea = null, showDevelopableArea = true, useDevelopableAreaForBounds = false) {
    if (!feature) return null;
    
    try {
      const config = LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL];
      const { centerX, centerY, size } = calculateBounds(feature, config.padding, developableArea, useDevelopableAreaForBounds);
      
      // Create base canvas
      const canvas = createCanvas(config.width || config.size, config.height || config.size);
      const ctx = canvas.getContext('2d', { alpha: true });
  
      try {
        // 1. Aerial imagery (base)
        const baseMap = await getWMSImage(LAYER_CONFIGS[SCREENSHOT_TYPES.AERIAL], centerX, centerY, size);
        drawImage(ctx, baseMap, canvas.width, canvas.height, 0.7);
      } catch (error) {
        console.warn('Failed to load aerial layer:', error);
      }
  
      try {
        // 2. Zoning
        const zoningLayer = await getArcGISImage(LAYER_CONFIGS[SCREENSHOT_TYPES.ZONING], centerX, centerY, size);
        drawImage(ctx, zoningLayer, canvas.width, canvas.height, 0.3);
      } catch (error) {
        console.warn('Failed to load zoning layer:', error);
      }
  
      try {
        // 3. Easements layer using arcgisService
        const easementsConfig = {
          url: 'https://mapuat3.environment.nsw.gov.au/arcgis/rest/services/Common/Admin_3857/MapServer',
          layerId: 25,
          size: 2048,
          width: 2048,
          height: 2048,
          padding: 0.2,
          format: 'png32',
          transparent: true,
          dpi: 96
        };
  
        const easementsLayer = await getArcGISImage(easementsConfig, centerX, centerY, size);
        drawImage(ctx, easementsLayer, canvas.width, canvas.height, 1);
      } catch (error) {
        console.warn('Failed to load easements layer:', error);
      }
  
      try {
        // 4. Biodiversity Values using arcgisService
        const biodiversityConfig = {
          url: 'https://www.lmbc.nsw.gov.au/arcgis/rest/services/BV/BiodiversityValues/MapServer',
          layerId: 0,
          size: 2048,
          width: 2048,
          height: 2048,
          padding: 0.2,
          format: 'png32',
          transparent: true,
          dpi: 96
        };
        
        const biodiversityLayer = await getArcGISImage(biodiversityConfig, centerX, centerY, size);
        drawImage(ctx, biodiversityLayer, canvas.width, canvas.height, 1);
      } catch (error) {
        console.warn('Failed to load biodiversity layer:', error);
      }
  
      try {
        // 5. High Voltage Power Lines using arcgisService
        const powerLinesConfig = {
          url: 'https://services.ga.gov.au/gis/rest/services/Foundation_Electricity_Infrastructure/MapServer',
          layerId: 2,
          size: 2048,
          width: 2048,
          height: 2048,
          padding: 0.2,
          format: 'png32',
          transparent: true,
          dpi: 96
        };
        
        const powerLinesLayer = await getArcGISImage(powerLinesConfig, centerX, centerY, size);
        drawImage(ctx, powerLinesLayer, canvas.width, canvas.height, 1);
      } catch (error) {
        console.warn('Failed to load power lines layer:', error);
      }
  
      try {
        // 6. 1AEP Flood Extents from Giraffe layer
        console.log('Starting flood extents capture...');
        const floodConfig = {
          baseUrl: 'https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/nsw_1aep_flood_extents/FeatureServer/0',
          layerId: 5180
        };
  
        // Get the flood layer data from Giraffe
        console.log('Fetching project layers from Giraffe...');
        const projectLayers = await giraffeState.get('projectLayers');
        const floodLayer = projectLayers?.find(layer => layer.layer === floodConfig.layerId);
        console.log('Found flood layer:', floodLayer);
        
        if (floodLayer) {
          console.log('Calculating Mercator parameters...');
          const { bbox } = calculateMercatorParams(centerX, centerY, size);
          console.log('Bbox:', bbox);
          
          // Extract the actual service URL and token from the vector tiles URL
          const vectorTileUrl = floodLayer.layer_full?.vector_source?.tiles?.[0];
          console.log('Vector tile URL:', vectorTileUrl);
          
          // Decode the URL-encoded portion to extract the token
          if (vectorTileUrl) {
            const decodedUrl = decodeURIComponent(vectorTileUrl.split('/featureServer/{z}/{x}/{y}/')?.[1] || '');
            console.log('Decoded URL:', decodedUrl);
            
            const extractedToken = decodedUrl.split('token=')?.[1]?.split('&')?.[0];
            console.log('Extracted token:', extractedToken);
            
            const params = new URLSearchParams({
              where: '1=1',
              geometry: bbox,
              geometryType: 'esriGeometryEnvelope',
              inSR: 3857,
              spatialRel: 'esriSpatialRelIntersects',
              outFields: '*',
              returnGeometry: true,
              f: 'geojson',
              token: extractedToken
            });
  
            const url = `${floodConfig.baseUrl}/query?${params.toString()}`;
            console.log('Final flood request URL (with sensitive info removed):', url.replace(extractedToken, 'REDACTED'));
            
            const floodResponse = await proxyRequest(url);
            console.log('Flood response:', floodResponse);
  
            if (floodResponse.features?.length > 0) {
              console.log(`Drawing ${floodResponse.features.length} flood features...`);
              // Store the flood features and transformation parameters in the feature object
              floodResponse.transformParams = { centerX, centerY, size };
              
              // Ensure feature.properties exists before setting properties
              if (!feature.properties) {
                feature.properties = {};
              }
              feature.properties.site_suitability__floodFeatures = floodResponse;
              
              floodResponse.features.forEach((feature, index) => {
                console.log(`Drawing flood feature ${index + 1}...`);
                
                // Handle MultiPolygon geometry type
                if (feature.geometry.type === 'MultiPolygon') {
                  feature.geometry.coordinates.forEach(polygonCoords => {
                    // Draw each polygon in the MultiPolygon separately
                    polygonCoords.forEach(coords => {
                      drawBoundary(ctx, coords, centerX, centerY, size, config.size || config.width, {
                        fill: true,
                        strokeStyle: 'rgba(0, 0, 255, 0.6)',
                        fillStyle: 'rgba(0, 0, 255, 0.6)',
                        lineWidth: 2
                      });
                    });
                  });
                } else {
                  // Handle regular Polygon geometry type
                  drawBoundary(ctx, feature.geometry.coordinates[0], centerX, centerY, size, config.size || config.width, {
                    fill: true,
                    strokeStyle: 'rgba(0, 0, 255, 0.6)',
                    fillStyle: 'rgba(0, 0, 255, 0.6)',
                    lineWidth: 2
                  });
                }
              });
              console.log('Finished drawing flood features');
            } else {
              console.log('No flood features found in response');
            }
          }
        } else {
          console.log('Flood layer not found in project layers');
        }
      } catch (error) {
        console.error('Failed to load flood extents:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
  
      // Always draw boundaries even if some layers fail
      drawFeatureBoundaries(ctx, feature, centerX, centerY, size, config.width || config.size, {
        showLabels: !showDevelopableArea // Show property labels when developable area is hidden
      });
  
      if (developableArea?.features?.length > 0 && showDevelopableArea) {
        // Use the new helper function to draw developable areas with labels
        drawDevelopableAreaBoundaries(ctx, developableArea, centerX, centerY, size, config.width || config.size, true);
      }
  
      return canvas.toDataURL('image/png', 1.0);
    } catch (error) {
      console.error('Failed to capture primary site attributes map:', error);
      return null; // Return null instead of throwing
    }
  }