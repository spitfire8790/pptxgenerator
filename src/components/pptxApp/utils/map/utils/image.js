export function loadImage(url) {
  console.log(`loadImage: Loading image from ${url}`);
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    // Set a timeout to reject the promise if the image doesn't load within 30 seconds
    const timeoutId = setTimeout(() => {
      console.error(`loadImage: Timed out loading image from ${url}`);
      
      // Create a fallback transparent image
      createFallbackImage()
        .then(fallbackImg => {
          console.log('Using fallback transparent image');
          resolve(fallbackImg);
        })
        .catch(fallbackError => {
          reject(new Error(`Timed out loading image from ${url} and fallback failed: ${fallbackError.message}`));
        });
    }, 30000);
    
    img.onload = () => {
      clearTimeout(timeoutId);
      console.log(`loadImage: Successfully loaded image from ${url}`);
      resolve(img);
    };
    
    img.onerror = (error) => {
      clearTimeout(timeoutId);
      console.error(`loadImage: Failed to load image from ${url}`, error);
      
      // Create a fallback transparent image
      createFallbackImage()
        .then(fallbackImg => {
          console.log('Using fallback transparent image');
          resolve(fallbackImg);
        })
        .catch(fallbackError => {
          reject(new Error(`Failed to load image from ${url} and fallback failed: ${fallbackError.message}`));
        });
    };
    
    img.src = url;
  });
}

// Create a transparent fallback image
function createFallbackImage(width = 1024, height = 1024) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // Fill with transparent background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(0, 0, width, height);
      
      // Create an image from the canvas
      const fallbackImg = new Image();
      fallbackImg.onload = () => resolve(fallbackImg);
      fallbackImg.onerror = (err) => reject(new Error('Failed to create fallback image'));
      
      // Convert canvas to data URL and set as image source
      fallbackImg.src = canvas.toDataURL('image/png');
    } catch (error) {
      reject(new Error(`Failed to create fallback image: ${error.message}`));
    }
  });
} 