export function loadImage(url) {
  console.log(`loadImage: Loading image from ${url}`);
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    // Set a timeout to reject the promise if the image doesn't load within 30 seconds
    const timeoutId = setTimeout(() => {
      console.error(`loadImage: Timed out loading image from ${url}`);
      reject(new Error(`Timed out loading image from ${url}`));
    }, 30000);
    
    img.onload = () => {
      clearTimeout(timeoutId);
      console.log(`loadImage: Successfully loaded image from ${url}`);
      resolve(img);
    };
    
    img.onerror = (error) => {
      clearTimeout(timeoutId);
      console.error(`loadImage: Failed to load image from ${url}`, error);
      reject(new Error(`Failed to load image from ${url}`));
    };
    
    img.src = url;
  });
} 