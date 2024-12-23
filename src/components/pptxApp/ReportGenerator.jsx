import React, { useState, useEffect } from 'react';
import { generateReport } from '../../lib/powerpoint';
import { addCoverSlide } from './slides/coverSlide';
import { addPropertySnapshotSlide } from './slides/propertySnapshotSlide';
import { addPlanningSlide } from './slides/planningSlide';
import { captureMapScreenshot, SCREENSHOT_TYPES } from './utils/mapScreenshot';
import SlidePreview from './SlidePreview';
import PlanningMapView from './PlanningMapView';
import PptxGenJS from 'pptxgenjs';

const slideOptions = [
  { id: 'cover', label: 'Cover Page', addSlide: addCoverSlide },
  { id: 'snapshot', label: 'Property Snapshot', addSlide: addPropertySnapshotSlide },
  { id: 'planning', label: 'Planning', addSlide: addPlanningSlide }
];

const ReportGenerator = ({ selectedFeature }) => {
  const [screenshots, setScreenshots] = useState({});
  const [previewScreenshot, setPreviewScreenshot] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState(null);
  const [selectedSlides, setSelectedSlides] = useState({
    cover: true,
    snapshot: true,
    planning: true
  });

  useEffect(() => {
    async function getPreviewScreenshot() {
      if (selectedFeature) {
        const screenshot = await captureMapScreenshot(selectedFeature);
        setPreviewScreenshot(screenshot);
      }
    }
    getPreviewScreenshot();
  }, [selectedFeature]);

  const generatePropertyReport = async () => {
    if (!selectedFeature) return;
    
    setIsGenerating(true);
    setStatus('generating');
    
    try {
      const aerialScreenshot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.AERIAL);
      const snapshotScreenshot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.SNAPSHOT);
      const zoningScreenshot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.ZONING);
      const fsrScreenshot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.FSR);
      const hobScreenshot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.HOB);
      
      console.log('Aerial Screenshot:', aerialScreenshot ? 'Present' : 'Missing');
      console.log('Snapshot Screenshot:', snapshotScreenshot ? 'Present' : 'Missing');
      console.log('Zoning Screenshot:', zoningScreenshot ? 'Present' : 'Missing');
      console.log('FSR Screenshot:', fsrScreenshot ? 'Present' : 'Missing');
      console.log('HOB Screenshot:', hobScreenshot ? 'Present' : 'Missing');

      const reportDate = new Date().toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const propertyData = {
        ...selectedFeature.properties.copiedFrom,
        site__address: selectedFeature.properties.copiedFrom.site__address,
        site__area: selectedFeature.properties.copiedFrom.site__area,
        site__area_sqm: selectedFeature.properties.copiedFrom.site__area_sqm,
        site__council: selectedFeature.properties.copiedFrom.site__council,
        site__description: selectedFeature.properties.copiedFrom.site__description,
        site__lot_dp: selectedFeature.properties.copiedFrom.site__lot_dp,
        site__ownership: selectedFeature.properties.copiedFrom.site__ownership,
        site__portfolio: selectedFeature.properties.copiedFrom.site__portfolio,
        site__region: selectedFeature.properties.copiedFrom.site__region,
        site_suitability__principal_zone_identifier: selectedFeature.properties.copiedFrom.site_suitability__principal_zone_identifier,
        site_suitability__floorspace_ratio: selectedFeature.properties.copiedFrom.site_suitability__floorspace_ratio,
        site_suitability__height_of_building: selectedFeature.properties.copiedFrom.site_suitability__height_of_building,
        reportDate,
        selectedSlides,
        screenshot: aerialScreenshot,
        snapshotScreenshot,
        zoningScreenshot: screenshots.zoningScreenshot || zoningScreenshot,
        fsrScreenshot: screenshots.fsrScreenshot || fsrScreenshot,
        hobScreenshot: screenshots.hobScreenshot || hobScreenshot
      };

      await generateReport(propertyData);
      setStatus('success');
    } catch (error) {
      console.error('Error generating report:', error);
      setStatus('error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleScreenshotCapture = async () => {
    if (selectedFeature) {
      // For cover slide, don't draw boundary
      const coverScreenshot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.AERIAL, false);
      // For other slides, keep boundary
      const snapshotScreenshot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.AERIAL, true);
      
      setPreviewScreenshot(coverScreenshot);
      setScreenshots({
        coverScreenshot,
        snapshotScreenshot
      });
    }
  };

  const handlePlanningScreenshotsCapture = (planningScreenshots) => {
    setScreenshots(prev => ({
      ...prev,
      ...planningScreenshots
    }));
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Property Report Generator</h2>
        
        <PlanningMapView 
          feature={selectedFeature} 
          onScreenshotCapture={handlePlanningScreenshotsCapture}
        />

        <div className="bg-white p-6 rounded-lg shadow mb-4">
          <SlidePreview 
            selectedFeature={selectedFeature}
            screenshot={previewScreenshot}
          />

          <div className="space-y-4">
            <div className="space-y-2">
              {slideOptions.map(option => (
                <label key={option.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedSlides[option.id]}
                    onChange={(e) => 
                      setSelectedSlides(prev => ({...prev, [option.id]: e.target.checked}))
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>

            <button
              onClick={generatePropertyReport}
              disabled={!selectedFeature || isGenerating}
              className={`w-full px-4 py-2 rounded text-white font-medium
                ${!selectedFeature || isGenerating 
                  ? 'bg-gray-400' 
                  : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {isGenerating ? 'Generating Report...' : 'Generate Report'}
            </button>

            {status === 'success' && (
              <div className="text-green-600">Report generated successfully</div>
            )}
            
            {status === 'error' && (
              <div className="text-red-600">Error generating report</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;