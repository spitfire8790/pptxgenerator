import React, { useState, useEffect, useRef } from 'react';
import { generateReport } from '../../lib/powerpoint';
import { addCoverSlide } from './slides/coverSlide';
import { addPropertySnapshotSlide } from './slides/propertySnapshotSlide';
import { addPlanningSlide } from './slides/planningSlide';
import { addPlanningSlide2 } from './slides/planningSlide2';
import { addServicingSlide } from './slides/servicingSlide';
import { createScoringSlide } from './slides/scoringSlide';
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
  captureRoadsMap,
  captureUDPPrecinctMap,
  captureFloodMap,
  captureBushfireMap,
  capturePTALMap,
  captureContaminationMap,
  captureTECMap,
  captureBiodiversityMap,
  captureHistoricalImagery
} from './utils/map/services/screenshot';
import { clearServiceCache } from './utils/map/services/wmsService';
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
import { addContaminationSlide } from './slides/contaminationSlide';
import { addEnviroSlide } from './slides/enviroSlide';
import { 
  FaHome, 
  FaImage, 
  FaMapMarkedAlt, 
  FaList, 
  FaBuilding, 
  FaLandmark, 
  FaWrench, 
  FaChartBar, 
  FaRoad, 
  FaExclamationTriangle, 
  FaLeaf, 
  FaSkull, 
  FaChartLine 
} from 'react-icons/fa';

const slideOptions = [
  { id: 'cover', label: 'Cover Page', addSlide: addCoverSlide, icon: FaHome },
  { id: 'snapshot', label: 'Property Snapshot', addSlide: addPropertySnapshotSlide, icon: FaImage },
  { id: 'primaryAttributes', label: 'Primary Site Attributes', addSlide: addPrimarySiteAttributesSlide, icon: FaMapMarkedAlt },
  { id: 'secondaryAttributes', label: 'Secondary Attributes', addSlide: addSecondaryAttributesSlide, icon: FaList },
  { id: 'planning', label: 'Planning', addSlide: addPlanningSlide, icon: FaBuilding },
  { id: 'planningTwo', label: 'Heritage & Acid Sulfate Soils', addSlide: addPlanningSlide2, icon: FaLandmark },
  { id: 'servicing', label: 'Servicing', addSlide: addServicingSlide, icon: FaWrench },
  { id: 'utilisation', label: 'Utilisation and Improvements', addSlide: addUtilisationSlide, icon: FaChartBar },
  { id: 'access', label: 'Access', addSlide: addAccessSlide, icon: FaRoad },
  { id: 'hazards', label: 'Natural Hazards', addSlide: addHazardsSlide, icon: FaExclamationTriangle },
  { id: 'environmental', label: 'Environmental', addSlide: addEnviroSlide, icon: FaLeaf },
  { id: 'contamination', label: 'Site Contamination', addSlide: addContaminationSlide, icon: FaSkull },
  { id: 'scoring', label: 'Scoring', addSlide: createScoringSlide, icon: FaChartLine }
];

const getStepDescription = (stepId) => {
  switch (stepId) {
    case 'screenshots':
      return 'Capturing map screenshots...';
    case 'cover':
      return 'Creating title page and overview...';
    case 'snapshot':
      return 'Adding aerial imagery and property details...';
    case 'primaryAttributes':
      return 'Processing site attributes and measurements...';
    case 'secondaryAttributes':
      return 'Adding topography and site characteristics...';
    case 'planning':
      return 'Analysing zoning and planning controls...';
    case 'planningTwo':
      return 'Checking heritage listings and soil conditions...';
    case 'servicing':
      return 'Mapping utility connections and infrastructure...';
    case 'utilisation':
      return 'Analysing site improvements and usage...';
    case 'access':
      return 'Evaluating transport and accessibility...';
    case 'hazards':
      return 'Assessing natural hazard exposure...';
    case 'environmental':
      return 'Checking environmental constraints...';
    case 'contamination':
      return 'Analysing potential contamination...';
    case 'scoring':
      return 'Calculating final site scores...';
    default:
      return 'Processing...';
  }
};

// Define friendly names for each layer type
const layerNames = {
  aerial: "Aerial Imagery",
  acidSulfateSoils: "Acid Sulfate Soils",
  biodiversity: "Biodiversity Values",
  bushfire: "Bushfire Prone Land",
  composite: "Composite Map",
  contamination: "Contamination",
  contour: "Contours",
  cover: "Cover Map",
  flood: "Flood Extents",
  fsr: "Floor Space Ratio",
  geoscape: "Geoscape Buildings",
  heritage: "Heritage",
  historical: "Historical Imagery",
  hob: "Height of Buildings",
  power: "Power Infrastructure",
  ptal: "Public Transport Access",
  regularity: "Site Regularity",
  roads: "Road Network",
  sewer: "Sewer Infrastructure",
  snapshot: "Site Snapshot",
  tec: "Threatened Ecological Communities",
  udpPrecincts: "UDP Growth Precincts",
  waterMains: "Water Infrastructure",
  zoning: "Zoning"
};

const ScreenshotProgress = ({ screenshots, failedScreenshots }) => {
  // Create array of all possible layers, excluding specific ones
  const excludedLayers = ['composite', 'cover', 'regularity', 'snapshot'];
  
  const layers = Object.entries(layerNames)
    .filter(([id]) => !excludedLayers.includes(id))
    .map(([id, name]) => ({
      id,
      name,
      status: screenshots[`${id}Screenshot`] 
        ? 'captured' 
        : (failedScreenshots?.includes(`${id}Screenshot`) ? 'failed' : 'pending')
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mt-4 p-6 bg-gray-50 rounded-lg">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Map Layer Progress</h3>
      <div className="max-h-[400px] overflow-y-auto pr-2">
        <div className="grid grid-cols-2 gap-3">
          {layers.map(layer => (
            <div 
              key={layer.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                layer.status === 'captured' ? 'bg-green-50' :
                layer.status === 'failed' ? 'bg-red-50' :
                'bg-white'
              }`}
            >
              <span className="text-sm font-medium text-gray-900 mr-2">{layer.name}</span>
              <div className="flex items-center flex-shrink-0">
                {layer.status === 'captured' ? (
                  <span className="text-green-600 flex items-center text-sm whitespace-nowrap">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Captured
                  </span>
                ) : layer.status === 'failed' ? (
                  <span className="text-red-600 flex items-center text-sm whitespace-nowrap">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Failed
                  </span>
                ) : (
                  <span className="text-gray-400 text-sm flex items-center whitespace-nowrap">
                    <svg className="w-4 h-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

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
    hazards: true,
    environmental: true,
    contamination: true,
    scoring: true
  });
  const [developableArea, setDevelopableArea] = useState(null);
  const planningMapRef = useRef();
  const [currentStep, setCurrentStep] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [progress, setProgress] = useState(0);
  const [showHowTo, setShowHowTo] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [failedScreenshots, setFailedScreenshots] = useState([]);

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
    setFailedScreenshots([]);
    
    // Clear the service cache at the start of report generation
    clearServiceCache();
    
    try {
      const failed = [];
      
      // Initialize screenshots state with all pending layers
      const initialScreenshots = {};
      Object.keys(layerNames).forEach(id => {
        initialScreenshots[`${id}Screenshot`] = null;
      });
      setScreenshots(initialScreenshots);
      
      // Helper function to update screenshot state
      const updateScreenshot = (key, value) => {
        setScreenshots(prev => ({
          ...prev,
          [key]: value
        }));
      };

      // Only capture screenshots for selected slides
      if (selectedSlides.cover) {
        try {
          const coverShot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.COVER);
          updateScreenshot('coverScreenshot', coverShot);
        } catch (error) {
          console.error('Failed to capture cover screenshot:', error);
          failed.push('coverScreenshot');
        }
      }
      
      if (selectedSlides.snapshot) {
        try {
          const aerialShot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.AERIAL);
          updateScreenshot('aerialScreenshot', aerialShot);
          const snapshotShot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.SNAPSHOT);
          updateScreenshot('snapshotScreenshot', snapshotShot);
        } catch (error) {
          console.error('Failed to capture snapshot screenshots:', error);
          failed.push('aerialScreenshot', 'snapshotScreenshot');
        }
      }
      
      if (selectedSlides.planning) {
        await planningMapRef.current?.captureScreenshots();
        const zoningShot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.ZONING, true, developableArea);
        updateScreenshot('zoningScreenshot', zoningShot);
        const fsrShot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.FSR, true, developableArea);
        updateScreenshot('fsrScreenshot', fsrShot);
        const hobShot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.HOB, true, developableArea);
        updateScreenshot('hobScreenshot', hobShot);
      }
      
      if (selectedSlides.primaryAttributes) {
        const compositeShot = await capturePrimarySiteAttributesMap(selectedFeature, developableArea);
        updateScreenshot('compositeMapScreenshot', compositeShot);
      }
      
      if (selectedSlides.secondaryAttributes) {
        const contourShot = await captureContourMap(selectedFeature, developableArea);
        updateScreenshot('contourScreenshot', contourShot);
        const regularityShot = await captureRegularityMap(selectedFeature, developableArea);
        updateScreenshot('regularityScreenshot', regularityShot);
      }
      
      if (selectedSlides.planningTwo) {
        const heritageShot = await captureHeritageMap(selectedFeature, developableArea);
        updateScreenshot('heritageScreenshot', heritageShot);
        const acidShot = await captureAcidSulfateMap(selectedFeature, developableArea);
        updateScreenshot('acidSulfateSoilsScreenshot', acidShot);
      }
      
      if (selectedSlides.servicing) {
        const waterMains = await captureWaterMainsMap(selectedFeature, developableArea);
        updateScreenshot('waterMainsScreenshot', waterMains?.image);
        
        const sewer = await captureSewerMap(selectedFeature, developableArea);
        updateScreenshot('sewerScreenshot', sewer?.image);
        
        const power = await capturePowerMap(selectedFeature, developableArea);
        updateScreenshot('powerScreenshot', power?.image);
      }
      
      if (selectedSlides.utilisation) {
        const geoscape = await captureGeoscapeMap(selectedFeature, developableArea);
        updateScreenshot('geoscapeScreenshot', geoscape?.image);
      }
      
      if (selectedSlides.access) {
        const roadsShot = await captureRoadsMap(selectedFeature, developableArea);
        updateScreenshot('roadsScreenshot', roadsShot);
        const udpShot = await captureUDPPrecinctMap(selectedFeature, developableArea);
        updateScreenshot('udpPrecinctsScreenshot', udpShot);
        const ptalShot = await capturePTALMap(selectedFeature, developableArea);
        updateScreenshot('ptalScreenshot', ptalShot);
      }
      
      if (selectedSlides.hazards) {
        const floodShot = await captureFloodMap(selectedFeature, developableArea);
        updateScreenshot('floodScreenshot', floodShot);
        const bushfireShot = await captureBushfireMap(selectedFeature, developableArea);
        updateScreenshot('bushfireScreenshot', bushfireShot);
      }
      
      if (selectedSlides.environmental) {
        const tecShot = await captureTECMap(selectedFeature, developableArea);
        updateScreenshot('tecScreenshot', tecShot);
        const bioShot = await captureBiodiversityMap(selectedFeature, developableArea);
        updateScreenshot('biodiversityScreenshot', bioShot);
      }
      
      if (selectedSlides.contamination) {
        const contaminationResult = await captureContaminationMap(selectedFeature, developableArea);
        updateScreenshot('contaminationScreenshot', contaminationResult?.image);
        
        const historicalShot = await captureHistoricalImagery(selectedFeature);
        updateScreenshot('historicalScreenshot', historicalShot);
      }

      setFailedScreenshots(failed);
      if (failed.length > 0) {
        throw new Error('Some screenshots failed to capture');
      }

      setCompletedSteps(prev => [...prev, 'screenshots']);
      setCurrentStep('cover');

      const reportDate = new Date().toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const propertyData = {
        ...selectedFeature.properties.copiedFrom,
        reportDate,
        selectedSlides,
        site__geometry: selectedFeature.geometry.coordinates[0],
        developableArea: developableArea?.features || null,
        scores: {},
        screenshot: screenshots.coverScreenshot,
        ...screenshots,
        // Include any features stored during screenshot capture
        ...Object.fromEntries(
          Object.entries(selectedFeature.properties || {})
            .filter(([key]) => key.startsWith('site_suitability__') || 
                             key === 'roadFeatures' || 
                             key === 'udpPrecincts' || 
                             key === 'ptalValues' ||
                             key === 'contaminationFeatures')
        )
      };

      // Generate the report with progress tracking
      await generateReport(propertyData, (progress) => {
        setProgress(progress);
        
        // Create an array of selected slide steps in order
        const selectedSteps = [
          ...(selectedSlides.cover ? ['cover'] : []),
          ...(selectedSlides.snapshot ? ['snapshot'] : []),
          ...(selectedSlides.primaryAttributes ? ['primaryAttributes'] : []),
          ...(selectedSlides.secondaryAttributes ? ['secondaryAttributes'] : []),
          ...(selectedSlides.planning ? ['planning'] : []),
          ...(selectedSlides.planningTwo ? ['planningTwo'] : []),
          ...(selectedSlides.servicing ? ['servicing'] : []),
          ...(selectedSlides.utilisation ? ['utilisation'] : []),
          ...(selectedSlides.access ? ['access'] : []),
          ...(selectedSlides.hazards ? ['hazards'] : []),
          ...(selectedSlides.environmental ? ['environmental'] : []),
          ...(selectedSlides.contamination ? ['contamination'] : []),
          ...(selectedSlides.scoring ? ['scoring'] : [])
        ];

        if (selectedSteps.length === 0) return;

        // Calculate which step we're on based on progress
        const stepIndex = Math.min(
          Math.floor((progress / 100) * selectedSteps.length),
          selectedSteps.length - 1
        );

        // Set current step
        setCurrentStep(selectedSteps[stepIndex]);

        // Add all previous steps to completed steps
        setCompletedSteps(prev => [
          ...new Set([
            ...prev,
            ...selectedSteps.slice(0, stepIndex)
          ])
        ]);
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
      // Clear the service cache before capturing preview screenshots
      clearServiceCache();
      
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

  const handleCancelGeneration = () => {
    setIsCancelling(true);
    setIsGenerating(false);
    setStatus('cancelled');
    setCurrentStep(null);
    setCompletedSteps([]);
    setProgress(0);
    // Reset cancelling state after a short delay
    setTimeout(() => {
      setIsCancelling(false);
    }, 500);
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
              <label className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                <input
                  type="checkbox"
                  checked={Object.values(selectedSlides).every(Boolean)}
                  onChange={(e) => {
                    const value = e.target.checked;
                    setSelectedSlides(
                      Object.keys(selectedSlides).reduce((acc, key) => ({
                        ...acc,
                        [key]: value
                      }), {})
                    );
                  }}
                  className="w-4 h-4 text-blue-600 rounded"
                  disabled={isGenerating}
                />
                <span className="font-medium">{Object.values(selectedSlides).every(Boolean) ? 'Deselect All' : 'Select All'}</span>
              </label>

              <div className="grid grid-cols-1 gap-2">
                {slideOptions.map((option) => {
                  const isActive = currentStep === option.id;
                  const isCompleted = completedSteps.includes(option.id);
                  const Icon = option.icon;
                  
                  return (
                    <div key={option.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                      <div className={`flex items-center ${isGenerating && !selectedSlides[option.id] ? 'opacity-50' : ''}`}>
                        <input
                          type="checkbox"
                          id={option.id}
                          checked={selectedSlides[option.id]}
                          onChange={(e) => setSelectedSlides(prev => ({
                            ...prev,
                            [option.id]: e.target.checked
                          }))}
                          disabled={isGenerating}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor={option.id} className="ml-3 flex items-center text-sm font-medium text-gray-700">
                          <Icon className="w-4 h-4 mr-2" />
                          {option.label}
                        </label>
                      </div>
                      
                      {isGenerating && selectedSlides[option.id] && (
                        <div className="flex items-center space-x-3">
                          {isCompleted ? (
                            <div className="flex items-center text-green-600">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span className="ml-2 text-sm">Complete</span>
                            </div>
                          ) : isActive ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                              <span className="text-sm text-blue-500">{getStepDescription(option.id)}</span>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400">Pending</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {isGenerating && currentStep === 'screenshots' && (
              <ScreenshotProgress 
                screenshots={screenshots}
                failedScreenshots={failedScreenshots}
              />
            )}

            <div className="flex gap-4">
              <button
                onClick={generatePropertyReport}
                disabled={!selectedFeature || isGenerating}
                className={`${isGenerating ? 'w-3/4' : 'w-full'} px-4 py-2 rounded text-white font-medium
                  ${!selectedFeature || isGenerating 
                    ? 'bg-gray-400' 
                    : 'bg-blue-600 hover:bg-blue-700'
                  } transition-all`}
              >
                {isGenerating ? 'Generating Report...' : 'Generate Report'}
              </button>

              {isGenerating && (
                <button
                  onClick={handleCancelGeneration}
                  disabled={isCancelling}
                  className="w-1/4 px-4 py-2 rounded text-white font-medium bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Cancel
                </button>
              )}
            </div>

            {!isGenerating && status === 'success' && (
              <div className="text-green-600">Report generated successfully</div>
            )}
            
            {!isGenerating && status === 'error' && (
              <div className="text-red-600">Error generating report</div>
            )}

            {!isGenerating && status === 'cancelled' && (
              <div className="text-yellow-600">Report generation cancelled</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;