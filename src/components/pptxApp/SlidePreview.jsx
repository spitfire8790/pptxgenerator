import React from 'react';

const SlidePreview = ({ selectedFeature, screenshot }) => {
  return (
    <div className="slide-preview-container mb-4">
      <h3 className="text-lg font-semibold mb-2">Preview</h3>
      
      {/* Slide preview container with 16:9 aspect ratio */}
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <div className="absolute inset-0 bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Left side image */}
          <div className="absolute left-0 top-0 w-1/3 h-full bg-[#002664] flex items-center justify-center">
            {screenshot && (
              <div className="w-full aspect-square relative">
                <img 
                  src={screenshot} 
                  alt="Property"
                  className="w-full h-full object-contain opacity-70"
                />
                <div className="absolute inset-0 bg-white/30" />
              </div>
            )}
          </div>
          
          {/* Right side content */}
          <div className="absolute left-[38%] top-[20%] w-[57%]">
            <div className="text-[#002664] text-2xl font-light mb-4">
              Audit of Government<br />Land For Housing
            </div>
            <div className="text-[#363636] text-lg mb-2">
              Desktop Due Diligence Report
            </div>
            {selectedFeature?.properties?.copiedFrom?.site__address && (
              <div className="text-[#FFB800] text-lg">
                {selectedFeature.properties.copiedFrom.site__address}
              </div>
            )}
            <div className="text-[#363636] text-sm mt-4">
              {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
          
          {/* NSW Government logo */}
          <img 
            src="/images/NSW-Government-official-logo.jpg"
            alt="NSW Government"
            className="absolute top-4 right-4 w-24"
          />
        </div>
      </div>
    </div>
  );
};

export default SlidePreview; 