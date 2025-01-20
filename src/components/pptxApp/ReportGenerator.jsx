import React, { useState, useEffect, useRef } from 'react';
import { generateReport } from '../../lib/powerpoint';
import { addCoverSlide } from './slides/coverSlide';
import { addPropertySnapshotSlide } from './slides/propertySnapshotSlide';
import { addPlanningSlide } from './slides/planningSlide';
import { addPlanningSlide2 } from './slides/planningSlide2';
import { addServicingSlide } from './slides/servicingSlide';
import { 
  captureMapScreenshot, 
  capturePrimarySiteAttributesMap, 
  captureContourMap, 
  captureRegularityMap, 
  captureHeritageMap, 
  captureAcidSulfateMap, 
  captureWaterMainsMap, 
  captureSewerMap, 
  capturePowerMap,
  captureGeoscapeMap,
  captureFloodMap,
  captureBushfireMap
} from './utils/map/services/screenshot';
import { SCREENSHOT_TYPES } from './utils/map/config/screenshotTypes';
import SlidePreview from './SlidePreview';
import PlanningMapView from './PlanningMapView';
import PptxGenJS from 'pptxgenjs';
import DevelopableAreaSelector from './DevelopableAreaSelector';
import GenerationProgress from './GenerationProgress';
import { addPrimarySiteAttributesSlide } from './slides/primarySiteAttributesSlide';
import { addSecondaryAttributesSlide } from './slides/secondaryAttributesSlide';
import { addUtilisationSlide } from './slides/utilisationSlide';
import { addAccessSlide } from './slides/accessSlide';
import { addHazardsSlide } from './slides/hazardsSlide';

const slideOptions = [
  { id: 'cover', label: 'Cover Page', addSlide: addCoverSlide },
  { id: 'snapshot', label: 'Property Snapshot', addSlide: addPropertySnapshotSlide },
  { id: 'primaryAttributes', label: 'Primary Site Attributes', addSlide: addPrimarySiteAttributesSlide },
  { id: 'secondaryAttributes', label: 'Secondary Attributes', addSlide: addSecondaryAttributesSlide },
  { id: 'planning', label: 'Planning', addSlide: addPlanningSlide },
  { id: 'planningTwo', label: 'Heritage & Acid Sulfate Soils', addSlide: addPlanningSlide2 },
  { id: 'servicing', label: 'Servicing', addSlide: addServicingSlide },
  { id: 'utilisation', label: 'Utilisation and Improvements', addSlide: addUtilisationSlide },
  { id: 'access', label: 'Access', addSlide: addAccessSlide },
  { id: 'hazards', label: 'Natural Hazards', addSlide: addHazardsSlide }
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
    planning: true,
    planningTwo: true,
    servicing: true,
    utilisation: true,
    access: true,
    hazards: true
  });
  const [developableArea, setDevelopableArea] = useState(null);
  const planningMapRef = useRef();
  const [currentStep, setCurrentStep] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [progress, setProgress] = useState(0);
  const [showHowTo, setShowHowTo] = useState(false);

  useEffect(() => {
    if (selectedFeature) {
      handleScreenshotCapture();
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
      const regularityScreenshot = await captureRegularityMap(selectedFeature, developableArea);
      const heritageScreenshot = await captureHeritageMap(selectedFeature, developableArea);
      const acidSulfateScreenshot = await captureAcidSulfateMap(selectedFeature, developableArea);
      const { image: waterMainsScreenshot } = await captureWaterMainsMap(selectedFeature, developableArea) || {};
      const { image: sewerScreenshot } = await captureSewerMap(selectedFeature, developableArea) || {};
      const powerScreenshot = await capturePowerMap(selectedFeature, developableArea);
      const { image: geoscapeScreenshot, features: geoscapeFeatures } = await captureGeoscapeMap(selectedFeature, developableArea) || {};
      const floodMapScreenshot = await captureFloodMap(selectedFeature, developableArea);
      const bushfireMapScreenshot = await captureBushfireMap(selectedFeature, developableArea);

      console.log('Aerial Screenshot:', aerialScreenshot ? 'Present' : 'Missing');
      console.log('Snapshot Screenshot:', snapshotScreenshot ? 'Present' : 'Missing');
      console.log('Zoning Screenshot:', zoningScreenshot ? 'Present' : 'Missing');
      console.log('FSR Screenshot:', fsrScreenshot ? 'Present' : 'Missing');
      console.log('HOB Screenshot:', hobScreenshot ? 'Present' : 'Missing');
      console.log('Composite Map Screenshot:', compositeMapScreenshot ? 'Present' : 'Missing');
      console.log('Contour Screenshot:', contourScreenshot ? 'Present' : 'Missing');
      console.log('Regularity Screenshot:', regularityScreenshot ? 'Present' : 'Missing');
      console.log('Heritage Screenshot:', heritageScreenshot ? 'Present' : 'Missing');
      console.log('Acid Sulfate Screenshot:', acidSulfateScreenshot ? 'Present' : 'Missing');
      console.log('Water Mains Screenshot:', waterMainsScreenshot ? 'Present' : 'Missing');
      console.log('Geoscape Screenshot:', geoscapeScreenshot ? 'Present' : 'Missing');
      console.log('Flood Map Screenshot:', floodMapScreenshot ? 'Present' : 'Missing');
      console.log('Bushfire Map Screenshot:', bushfireMapScreenshot ? 'Present' : 'Missing');

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
        site__geometry: selectedFeature.geometry.coordinates[0],
        screenshot: coverScreenshot,
        snapshotScreenshot: aerialScreenshot,
        zoningScreenshot: zoningScreenshot,
        fsrScreenshot: fsrScreenshot,
        hobScreenshot: hobScreenshot,
        developableArea: developableArea?.features || null,
        compositeMapScreenshot,
        scores: {},
        contourScreenshot,
        regularityScreenshot,
        heritageScreenshot,
        acidSulfateSoilsScreenshot: acidSulfateScreenshot,
        acidSulfateScreenshot,
        waterMainsScreenshot,
        sewerScreenshot,
        powerScreenshot,
        waterFeatures: selectedFeature.properties?.waterFeatures,
        sewerFeatures: selectedFeature.properties?.sewerFeatures,
        powerFeatures: selectedFeature.properties?.powerFeatures,
        site_suitability__floodFeatures: selectedFeature.properties?.site_suitability__floodFeatures,
        site_suitability__bushfireFeatures: selectedFeature.properties?.site_suitability__bushfireFeatures,
        geoscapeScreenshot,
        geoscapeFeatures,
        floodMapScreenshot,
        bushfireMapScreenshot,
      };

      // Generate the report with progress tracking
      await generateReport(propertyData, (progress) => {
        if (progress <= 12) {
          setCurrentStep('cover');
        } else if (progress <= 24) {
          setCompletedSteps(prev => [...new Set([...prev, 'cover'])]);
          setCurrentStep('snapshot');
        } else if (progress <= 36) {
          setCompletedSteps(prev => [...new Set([...prev, 'cover', 'snapshot'])]);
          setCurrentStep('primaryAttributes');
        } else if (progress <= 48) {
          setCompletedSteps(prev => [...new Set([...prev, 'cover', 'snapshot', 'primaryAttributes'])]);
          setCurrentStep('secondaryAttributes');
        } else if (progress <= 60) {
          setCompletedSteps(prev => [...new Set([...prev, 'cover', 'snapshot', 'primaryAttributes', 'secondaryAttributes'])]);
          setCurrentStep('planning');
        } else if (progress <= 72) {
          setCompletedSteps(prev => [...new Set([...prev, 'cover', 'snapshot', 'primaryAttributes', 'secondaryAttributes', 'planning'])]);
          setCurrentStep('planningTwo');
        } else if (progress <= 84) {
          setCompletedSteps(prev => [...new Set([...prev, 'cover', 'snapshot', 'primaryAttributes', 'secondaryAttributes', 'planning', 'planningTwo'])]);
          setCurrentStep('servicing');
        } else if (progress <= 96) {
          setCompletedSteps(prev => [...new Set([...prev, 'cover', 'snapshot', 'primaryAttributes', 'secondaryAttributes', 'planning', 'planningTwo', 'servicing'])]);
          setCurrentStep('utilisation');
        } else {
          setCompletedSteps(prev => [...new Set([...prev, 'cover', 'snapshot', 'primaryAttributes', 'secondaryAttributes', 'planning', 'planningTwo', 'servicing', 'utilisation'])]);
          setCurrentStep('finalising');
        }
      });

      setCompletedSteps(prev => [...prev, 'finalising']);
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Desktop Due Diligence PowerPoint Report Generator (WIP)</h2>
          
          <div className="relative">
            <button
              className="w-full px-4 py-2 rounded text-white font-medium bg-blue-600 hover:bg-blue-700 transition-colors"
              onClick={() => setShowHowTo(true)}
            >
              How to use
            </button>
            
            {showHowTo && (
              <div className="fixed inset-0 bg-black/20 z-50 flex items-start justify-end p-4">
                <div className="w-[500px] rounded-xl border-2 border-blue-600 bg-white p-6 shadow-xl mt-12 mr-4">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">How to use</h3>
                    <button 
                      onClick={() => setShowHowTo(false)}
                      className="rounded-full p-1 hover:bg-gray-100 transition-colors"
                    >
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                      </svg>
                    </button>
                  </div>
                  
                  <ol className="space-y-4 text-sm list-decimal pl-5">
                    <li className="pl-2 leading-relaxed">
                      Using Land iQ Site Search, identify a property of interest and create a feature on the 'Site Boundary' drawing layer. Ensure you are creating a feature using the Land iQ search results so the data is attached to the feature.
                    </li>
                    <li className="pl-2 leading-relaxed">
                      Draw the developable area boundary as a new feature on the 'Developable Area Boundary' drawing layer.
                    </li>
                    <li className="pl-2 leading-relaxed">
                      Click on the Site Boundary and then select the Developable Area Boundary under 'Select Developable Area Layer' up the top.
                    </li>
                    <li className="pl-2 leading-relaxed">
                      A preview will load of the cover slide and if everything looks good to go, select the slides you want and click on the blue 'Generate Report' button.
                    </li>
                    <li className="pl-2 leading-relaxed">
                      ???
                    </li>
                    <li className="pl-2 leading-relaxed">
                      Profit
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
        
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