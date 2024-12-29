import React, { useState, useEffect, useRef } from 'react';
import { generateReport } from '../../lib/powerpoint';
import { addCoverSlide } from './slides/coverSlide';
import { addPropertySnapshotSlide } from './slides/propertySnapshotSlide';
import { addPlanningSlide } from './slides/planningSlide';
import { captureMapScreenshot, capturePrimarySiteAttributesMap, captureContourMap } from './utils/map/services/screenshot';
import { SCREENSHOT_TYPES } from './utils/map/config/screenshotTypes';
import SlidePreview from './SlidePreview';
import PlanningMapView from './PlanningMapView';
import PptxGenJS from 'pptxgenjs';
import DevelopableAreaSelector from './DevelopableAreaSelector';
import GenerationProgress from './GenerationProgress';
import { addPrimarySiteAttributesSlide } from './slides/primarySiteAttributesSlide';
import { addSecondaryAttributesSlide } from './slides/secondaryAttributesSlide';

const slideOptions = [
  { id: 'cover', label: 'Cover Page', addSlide: addCoverSlide },
  { id: 'snapshot', label: 'Property Snapshot', addSlide: addPropertySnapshotSlide },
  { id: 'primaryAttributes', label: 'Primary Site Attributes', addSlide: addPrimarySiteAttributesSlide },
  { id: 'secondaryAttributes', label: 'Secondary Attributes', addSlide: addSecondaryAttributesSlide },
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
    primaryAttributes: true,
    secondaryAttributes: true,
    planning: true
  });
  const [developableArea, setDevelopableArea] = useState(null);
  const planningMapRef = useRef();
  const [currentStep, setCurrentStep] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    async function getPreviewScreenshot() {
      if (selectedFeature) {
        const screenshot = await captureMapScreenshot(selectedFeature);
        setPreviewScreenshot(screenshot);
      }
    }
    getPreviewScreenshot();
  }, [selectedFeature]);

  useEffect(() => {
    if (selectedFeature && planningMapRef.current) {
      // Reset screenshots state for planning views
      setScreenshots(prev => ({
        ...prev,
        zoningScreenshot: null,
        fsrScreenshot: null,
        hobScreenshot: null
      }));
      
      // Trigger new screenshots capture
      planningMapRef.current.captureScreenshots();
    }
  }, [selectedFeature]);

  const generatePropertyReport = async () => {
    if (!selectedFeature) return;
    
    setIsGenerating(true);
    setStatus('generating');
    setCurrentStep('screenshots');
    setCompletedSteps([]);
    
    try {
      // Capture screenshots
      await planningMapRef.current?.captureScreenshots();
      const aerialScreenshot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.AERIAL);
      const coverScreenshot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.COVER);
      const snapshotScreenshot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.SNAPSHOT);
      const zoningScreenshot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.ZONING, true, developableArea);
      const fsrScreenshot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.FSR, true, developableArea);
      const hobScreenshot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.HOB, true, developableArea);
      const compositeMapScreenshot = await capturePrimarySiteAttributesMap(selectedFeature, developableArea);
      const contourScreenshot = await captureContourMap(selectedFeature, developableArea);
      
      console.log('Aerial Screenshot:', aerialScreenshot ? 'Present' : 'Missing');
      console.log('Snapshot Screenshot:', snapshotScreenshot ? 'Present' : 'Missing');
      console.log('Zoning Screenshot:', zoningScreenshot ? 'Present' : 'Missing');
      console.log('FSR Screenshot:', fsrScreenshot ? 'Present' : 'Missing');
      console.log('HOB Screenshot:', hobScreenshot ? 'Present' : 'Missing');

      setCompletedSteps(prev => [...prev, 'screenshots']);
      setCurrentStep('cover');

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
        site_suitability__landzone: selectedFeature.properties.copiedFrom.site_suitability__landzone,
        reportDate,
        selectedSlides,
        screenshot: coverScreenshot,
        snapshotScreenshot: aerialScreenshot,
        zoningScreenshot: screenshots.zoningScreenshot || zoningScreenshot,
        fsrScreenshot: screenshots.fsrScreenshot || fsrScreenshot,
        hobScreenshot: screenshots.hobScreenshot || hobScreenshot,
        developableArea: developableArea?.features || null,
        compositeMapScreenshot,
        scores: {},
        contourScreenshot: screenshots.contourScreenshot,
        regularityScreenshot: screenshots.regularityScreenshot
      };

      // Generate the report with progress tracking
      await generateReport(propertyData, (progress) => {
        // Map progress percentage to steps
        if (progress <= 20) {
          setCurrentStep('cover');
        } else if (progress <= 40) {
          setCompletedSteps(prev => [...new Set([...prev, 'cover'])]);
          setCurrentStep('snapshot');
        } else if (progress <= 60) {
          setCompletedSteps(prev => [...new Set([...prev, 'cover', 'snapshot'])]);
          setCurrentStep('primaryAttributes');
        } else if (progress <= 80) {
          setCompletedSteps(prev => [...new Set([...prev, 'cover', 'snapshot', 'primaryAttributes'])]);
          setCurrentStep('secondaryAttributes');
        } else if (progress <= 90) {
          setCompletedSteps(prev => [...new Set([...prev, 'cover', 'snapshot', 'primaryAttributes', 'secondaryAttributes'])]);
          setCurrentStep('planning');
        } else {
          setCompletedSteps(prev => [...new Set([...prev, 'cover', 'snapshot', 'primaryAttributes', 'secondaryAttributes', 'planning'])]);
          setCurrentStep('finalizing');
        }
      });

      setCompletedSteps(prev => [...prev, 'finalizing']);
      setStatus('success');
    } catch (error) {
      console.error('Error generating report:', error);
      setStatus('error');
    } finally {
      setIsGenerating(false);
      setCurrentStep(null);
    }
  };

  const handleScreenshotCapture = async () => {
    if (selectedFeature) {
      // For cover slide, use COVER type without boundary
      const coverScreenshot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.COVER, false);
      // For other slides, keep boundary and use AERIAL type
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

  const handleDevelopableAreaSelect = (layerData) => {
    setDevelopableArea(layerData);
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Desktop Due Diligence PowerPoint Report Generator</h2>
        
        <PlanningMapView 
          ref={planningMapRef}
          feature={selectedFeature} 
          onScreenshotCapture={handlePlanningScreenshotsCapture}
          developableArea={developableArea}
        />

        <DevelopableAreaSelector onLayerSelect={handleDevelopableAreaSelect} selectedFeature={selectedFeature} />

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

            {isGenerating && (
              <GenerationProgress 
                currentStep={currentStep}
                completedSteps={completedSteps}
                progress={progress}
              />
            )}

            {!isGenerating && status === 'success' && (
              <div className="text-green-600">Report generated successfully</div>
            )}
            
            {!isGenerating && status === 'error' && (
              <div className="text-red-600">Error generating report</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;