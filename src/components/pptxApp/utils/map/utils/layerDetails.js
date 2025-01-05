import { giraffeState } from '@gi-nx/iframe-sdk';

/**
 * Logs all available project layers from Giraffe to console
 */
export async function logAvailableLayers() {
  try {
    // Get the individual layers from the project
    const projectLayers = giraffeState.get('projectLayers');
    console.log('Project Layers:', projectLayers);  
    
    return {
      projectLayers,
    };
  } catch (error) {
    console.error('Error getting available layers:', error);
    return {};
  }
} 