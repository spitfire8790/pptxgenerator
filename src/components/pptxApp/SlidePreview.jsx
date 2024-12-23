import React from 'react';

const SlidePreview = ({ selectedFeature, screenshot }) => {
  return (
    <div className="slide-preview-container mb-4">
      <h3 className="text-lg font-semibold mb-2">Preview</h3>
      
      {/* Slide preview container with 16:9 aspect ratio */}
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <div className="absolute inset-0 bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Left side blue container */}
          <div className="absolute left-0 top-0 w-1/3 h-full" style={{ backgroundColor: '#002664' }}>
            {screenshot && (
              <img 
                src={screenshot} 
                alt="Property"
                className="w-full h-full"
                style={{ 
                  objectFit: 'cover',
                  objectPosition: 'center'
                }}
              />
            )}
          </div>
          
          {/* Vertical divider line */}
          <div className="absolute left-[35%] top-[5%] bottom-[5%] w-[1px]" style={{ backgroundColor: '#002664' }} />
          
          {/* Right side content */}
          <div className="absolute right-0 top-0 w-[65%] h-full p-8">
            {/* Sensitive text */}
            <div className="absolute right-8 top-2 text-[#FF3B3B] text-[9px] font-bold">
              SENSITIVE: NSW GOVERNMENT
            </div>
            
            {/* NSW Logo */}
            <img 
              src="/images/NSW-Government-official-logo.jpg"
              alt="NSW Government"
              className="absolute right-8 top-8 w-[8%]"
            />
            
            {/* Main content */}
            <div className="mt-16">
              <div className="text-[#002664] text-xs mb-8">Property and Development NSW</div>
              <div className="text-[#002664] text-2xl font-light mb-16">
                Audit of Government<br />Land For Housing
              </div>
              <div className="text-[#002664] text-base mb-4">Desktop Due Diligence Report</div>
              <div className="text-[#FFCC31] text-base">
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