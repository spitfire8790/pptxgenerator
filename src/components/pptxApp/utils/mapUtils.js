import { rpc } from '@gi-nx/iframe-sdk';

/**
 * Creates a drawing feature from a GeoJSON feature
 * @param {Object} selectedFeature - GeoJSON feature to convert to drawing
 * @param {Function} setNotification - Function to set notification state
 * @param {Function} setIsDrawing - Function to update drawing state
 * @returns {Promise<Object>} Result from the drawing operation
 */
export const createDrawingFromFeature = async (selectedFeature, setNotification, setIsDrawing) => {
  try {
    setIsDrawing(true);
    
    if (!selectedFeature) {
      setNotification({
        type: 'error',
        message: 'No developable area selected. Please select an area first.'
      });
      setIsDrawing(false);
      return null;
    }
    
    // Create a name for the drawing layer
    const drawingName = `Developable-Area-${Date.now()}`;
    
    // Add layerId to the properties
    const featureWithLayerId = {
      ...selectedFeature,
      properties: {
        ...selectedFeature.properties,
        layerId: drawingName,
        name: drawingName,
        description: 'Created from feasibility calculation',
        fillColor: '#00ff00',
        fillOpacity: 0.5,
        outlineColor: '#00aa00'
      }
    };
    
    // Truncate coordinates to 7 decimal places to avoid precision issues
    const truncatedFeature = {
      ...featureWithLayerId,
      geometry: {
        ...featureWithLayerId.geometry,
        coordinates: Array.isArray(featureWithLayerId.geometry.coordinates[0][0])
          ? featureWithLayerId.geometry.coordinates.map(ring => 
              ring.map(coord => [
                parseFloat(coord[0].toFixed(7)), 
                parseFloat(coord[1].toFixed(7))
              ])
            )
          : [featureWithLayerId.geometry.coordinates.map(coord => [
              parseFloat(coord[0].toFixed(7)), 
              parseFloat(coord[1].toFixed(7))
            ])]
      }
    };
    
    // Check to make sure serialized feature isn't too large
    const featureString = JSON.stringify(truncatedFeature);
    if (featureString.length >= 15000) {
      setNotification({
        type: 'error',
        message: 'Feature is too large to create as a drawing. Please select a smaller area.'
      });
      setIsDrawing(false);
      return null;
    }
    
    // Create the drawing feature using createRawSections
    const result = await rpc.invoke('createRawSections', [[truncatedFeature]]);
    
    setNotification({
      type: 'success',
      message: 'Drawing feature created successfully!'
    });
    
    return result;
  } catch (error) {
    console.error("Error creating drawing feature:", error);
    setNotification({
      type: 'error',
      message: 'Error creating drawing feature. Please try again.'
    });
    return null;
  } finally {
    setIsDrawing(false);
  }
};

/**
 * Creates a drawing feature with custom styling options
 * @param {Object} selectedFeature - GeoJSON feature to convert to drawing
 * @param {Object} styleOptions - Options for styling the feature
 * @param {Function} setNotification - Function to set notification state
 * @param {Function} setIsDrawing - Function to update drawing state
 * @returns {Promise<Object>} Result from the drawing operation
 */
export const createStyledDrawingFromFeature = async (
  selectedFeature, 
  styleOptions = {
    fillColor: '#00ff00',
    fillOpacity: 0.5,
    outlineColor: '#00aa00',
    namePrefix: 'Developable-Area',
    includeTimestamp: false
  },
  setNotification, 
  setIsDrawing
) => {
  try {
    setIsDrawing(true);
    
    if (!selectedFeature) {
      setNotification({
        type: 'error',
        message: 'No feature selected. Please select an area first.'
      });
      setIsDrawing(false);
      return null;
    }
    
    // Validate the feature has proper geometry
    if (!selectedFeature.geometry || !selectedFeature.geometry.coordinates) {
      setNotification({
        type: 'error',
        message: 'Invalid feature geometry. Missing coordinates.'
      });
      setIsDrawing(false);
      return null;
    }
    
    // Create a name for the drawing layer
    // Only append timestamp if includeTimestamp is true
    const drawingName = styleOptions.includeTimestamp 
      ? `${styleOptions.namePrefix || 'Drawing'}-${Date.now()}` 
      : `${styleOptions.namePrefix || 'Drawing'}`;
    
    // Add layerId and other required properties to the feature
    const featureWithLayerId = {
      ...selectedFeature,
      properties: {
        ...selectedFeature.properties,
        layerId: drawingName,
        name: drawingName,
        description: styleOptions.description || 'Created from application',
        fillColor: styleOptions.fillColor || '#00ff00',
        fillOpacity: styleOptions.fillOpacity || 0.5,
        outlineColor: styleOptions.outlineColor || '#00aa00',
        height: selectedFeature.properties?.height || 0,
        shiny: selectedFeature.properties?.shiny || true,
        // Add group property for later filtering if provided
        ...(styleOptions.group && { group: styleOptions.group })
      }
    };
    
    // Ensure the feature geometry type is properly set
    if (!featureWithLayerId.geometry.type) {
      // Default to Polygon if not specified
      featureWithLayerId.geometry.type = 'Polygon';
    }
    
    // Make sure coordinates are in the right format
    // Polygon coordinates should be an array of arrays of coordinates
    let processedCoordinates;
    
    if (featureWithLayerId.geometry.type === 'Polygon') {
      // Check if coordinates are properly structured for a Polygon
      if (!Array.isArray(featureWithLayerId.geometry.coordinates)) {
        setNotification({
          type: 'error',
          message: 'Invalid polygon coordinates. Expected array of coordinate arrays.'
        });
        setIsDrawing(false);
        return null;
      }
      
      // If first element is not an array, wrap it in an array
      if (!Array.isArray(featureWithLayerId.geometry.coordinates[0])) {
        processedCoordinates = [featureWithLayerId.geometry.coordinates];
      }
      // If first element is an array but second element is not, we have flat list of coordinates
      else if (featureWithLayerId.geometry.coordinates.length > 0 && 
               !Array.isArray(featureWithLayerId.geometry.coordinates[0][0])) {
        processedCoordinates = [featureWithLayerId.geometry.coordinates];
      } 
      // Coordinates are already properly structured
      else {
        processedCoordinates = featureWithLayerId.geometry.coordinates;
      }
      
      // Ensure polygon is closed (first point equals last point)
      for (let i = 0; i < processedCoordinates.length; i++) {
        const ring = processedCoordinates[i];
        if (ring.length > 0) {
          // If not closed, close it
          if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
            ring.push([...ring[0]]);
          }
        }
      }
    } else {
      // For other geometry types, just use the original coordinates
      processedCoordinates = featureWithLayerId.geometry.coordinates;
    }
    
    // Truncate coordinates to 7 decimal places to avoid precision issues
    const truncatedCoordinates = Array.isArray(processedCoordinates[0][0])
      ? processedCoordinates.map(ring => 
          ring.map(coord => [
            parseFloat(coord[0].toFixed(7)), 
            parseFloat(coord[1].toFixed(7))
          ])
        )
      : [processedCoordinates.map(coord => [
          parseFloat(coord[0].toFixed(7)), 
          parseFloat(coord[1].toFixed(7))
        ])];
    
    const truncatedFeature = {
      ...featureWithLayerId,
      geometry: {
        ...featureWithLayerId.geometry,
        coordinates: truncatedCoordinates
      }
    };
    
    // Check to make sure serialized feature isn't too large
    const featureString = JSON.stringify(truncatedFeature);
    console.log(`Feature string length: ${featureString.length} bytes`);
    
    if (featureString.length >= 15000) {
      setNotification({
        type: 'error',
        message: 'Feature is too large to create as a drawing. Please select a smaller area.'
      });
      setIsDrawing(false);
      return null;
    }
    
    console.log('Creating drawing with feature:', truncatedFeature);
    
    // Use a direct feature object approach that works with Giraffe
    const featureForGiraffe = {
      type: "Feature",
      properties: {
        name: drawingName,
        description: truncatedFeature.properties.description,
        layerId: drawingName,
        fillColor: truncatedFeature.properties.fillColor,
        fillOpacity: truncatedFeature.properties.fillOpacity,
        outlineColor: truncatedFeature.properties.outlineColor,
        height: truncatedFeature.properties.height || 0,
        shiny: truncatedFeature.properties.shiny || true,
        is3D: truncatedFeature.properties.is3D || false,
        extrude: truncatedFeature.properties.extrude || false,
        extrudeHeight: truncatedFeature.properties.extrudeHeight || truncatedFeature.properties.height || 0,
        // Include custom groupTag in the name if needed for filtering later
        ...(truncatedFeature.properties.group && { 
          name: `${drawingName}-${truncatedFeature.properties.group}` 
        })
      },
      geometry: {
        type: "Polygon",
        coordinates: truncatedFeature.geometry.coordinates
      }
    };
    
    console.log('Sending feature to Giraffe:', featureForGiraffe);
    
    // Try both approaches to ensure compatibility with the SDK
    let result;
    
    try {
      // First try direct createRawSections call
      result = await rpc.invoke('createRawSections', [[featureForGiraffe]]);
      console.log('Created drawing using createRawSections:', result);
    } catch (rpcError) {
      console.error('Failed with createRawSections, trying alternative method:', rpcError);
      
      // Try the legacy createDrawing approach as fallback
      try {
        result = await rpc.invoke('createDrawing', {
          features: [featureForGiraffe]
        });
        console.log('Created drawing using createDrawing:', result);
      } catch (legacyError) {
        console.error('Failed with legacy method too:', legacyError);
        throw new Error(`Failed to create drawing: ${legacyError.message}`);
      }
    }
    
    setNotification({
      type: 'success',
      message: 'Drawing feature created successfully!'
    });
    
    return result;
  } catch (error) {
    console.error("Error creating drawing feature:", error);
    setNotification({
      type: 'error',
      message: `Error creating drawing feature: ${error.message}`
    });
    return null;
  } finally {
    setIsDrawing(false);
  }
}; 