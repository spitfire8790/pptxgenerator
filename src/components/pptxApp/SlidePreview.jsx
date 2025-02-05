import React, { useState } from 'react';

const SlidePreview = ({ selectedFeature, screenshot }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  return (
    <div className="slide-preview-container mb-4">
      <h3 className="text-lg font-semibold mb-2">Preview</h3>
      
      {/* Slide preview container with proper aspect ratio */}
      <div className="relative w-full" style={{ paddingBottom: '60%' }}>
        <div className="absolute inset-0 bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Left side container */}
          <div className="absolute left-0 top-0 w-1/2 h-full" style={{ backgroundColor: '#002664' }}>
            {screenshot && (
              <div className="w-full h-full relative">
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}
                {imageError && (
                  <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                    Failed to load image
                  </div>
                )}
                <img 
                  src={screenshot} 
                  alt="Property"
                  className="w-full h-full"
                  style={{
                    objectFit: 'cover',
                    objectPosition: 'top',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    display: imageError ? 'none' : 'block'
                  }}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              </div>
            )}
          </div>
          
          {/* Vertical divider line */}
          <div 
            className="absolute left-[52%] top-[2%] bottom-[2%] w-[1px]" 
            style={{ backgroundColor: '#002664', transform: 'translateX(2%)' }} 
          />
          
          {/* Right side content */}
          <div className="absolute right-0 top-0 w-1/2 h-full p-8">
            {/* Sensitive text */}
            <div className="absolute left-52% top-2 text-[#FF3B3B] text-[10px] font-bold">
              SENSITIVE: NSW GOVERNMENT
            </div>
            
            {/* NSW Logo */}
            <img 
              src="/images/NSW-Government-official-logo.jpg"
              alt="NSW Government"
              className="absolute right-8 top-8 w-[8%]"
            />
            
            {/* Main content */}
            <div className="mt-8">
              <div className="text-[#002664] text-[16px] mb-8">Property and Development NSW</div>
              <div className="text-[#002664] text-[36px] font-light mb-20 leading-9">
                Audit of Government<br />Land For Housing
              </div>
              <div className="text-[#002664] text-[18px] mb-2">Desktop Due Diligence Report</div>
              <div className="text-[#FFCC31] text-[18px]">
                {selectedFeature?.properties?.copiedFrom?.site__address}
              </div>
              <div className="absolute bottom-8 text-[#363636] text-sm">
                {new Date().toLocaleDateString('en-GB', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlidePreview;