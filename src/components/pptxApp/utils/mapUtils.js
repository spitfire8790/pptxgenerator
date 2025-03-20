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
    
    // Create a name for the drawing layer
    // Only append timestamp if includeTimestamp is true
    const drawingName = styleOptions.includeTimestamp 
      ? `${styleOptions.namePrefix || 'Drawing'}-${Date.now()}` 
      : `${styleOptions.namePrefix || 'Drawing'}`;
    
    // Add layerId to the properties
    const featureWithLayerId = {
      ...selectedFeature,
      properties: {
        ...selectedFeature.properties,
        layerId: drawingName,
        name: drawingName,
        description: styleOptions.description || 'Created from application',
        fillColor: styleOptions.fillColor,
        fillOpacity: styleOptions.fillOpacity,
        outlineColor: styleOptions.outlineColor
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