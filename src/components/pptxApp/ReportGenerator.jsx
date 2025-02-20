import React, { useState, useEffect, useRef } from 'react';
import { generateReport } from '../../lib/powerpoint';
import { addCoverSlide } from './slides/coverSlide';
import { addPropertySnapshotSlide } from './slides/propertySnapshotSlide';
import { addPlanningSlide } from './slides/planningSlide';
import { addPlanningSlide2 } from './slides/planningSlide2';
import { addServicingSlide } from './slides/servicingSlide';
import { createScoringSlide } from './slides/scoringSlide';
import { checkUserClaims } from './utils/auth/tokenUtils';
import scoringCriteria from './slides/scoringLogic';
import { area } from '@turf/area';
import { addContextSlide } from './slides/contextSlide';
import { addPermissibilitySlide } from './slides/permissibilitySlide';
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
import { captureGPRMap } from './utils/map/services/screenshots/contextScreenshot';
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
  Home,
  Image as ImageIcon,
  MapPin,
  ListTodo,
  Building2,
  Landmark,
  Wrench,
  BarChart3,
  Navigation,
  AlertTriangle,
  Leaf,
  Skull,
  LineChart,
  Trophy,
  Loader2,
  Globe2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import './Timer.css';
import Leaderboard from './Leaderboard';
import IssueModal from './IssueModal';
import { recordReportGeneration } from './utils/stats/reportStats';
import './GenerationLog.css';
import { motion, AnimatePresence } from 'framer-motion';
import IssuesList from './IssuesList';

const slideOptions = [
  { id: 'cover', label: 'Cover Page', addSlide: addCoverSlide, icon: Home },
  { id: 'snapshot', label: 'Property Snapshot', addSlide: addPropertySnapshotSlide, icon: ImageIcon },
  { id: 'primaryAttributes', label: 'Primary Site Attributes', addSlide: addPrimarySiteAttributesSlide, icon: MapPin },
  { id: 'secondaryAttributes', label: 'Secondary Attributes', addSlide: addSecondaryAttributesSlide, icon: ListTodo },
  { id: 'planning', label: 'Planning', addSlide: addPlanningSlide, icon: Building2 },
  { id: 'planningTwo', label: 'Heritage & Acid Sulfate Soils', addSlide: addPlanningSlide2, icon: Landmark },
  { id: 'servicing', label: 'Servicing', addSlide: addServicingSlide, icon: Wrench },
  { id: 'utilisation', label: 'Utilisation and Improvements', addSlide: addUtilisationSlide, icon: BarChart3 },
  { id: 'access', label: 'Access', addSlide: addAccessSlide, icon: Navigation },
  { id: 'hazards', label: 'Natural Hazards', addSlide: addHazardsSlide, icon: AlertTriangle },
  { id: 'environmental', label: 'Environmental', addSlide: addEnviroSlide, icon: Leaf },
  { id: 'contamination', label: 'Site Contamination', addSlide: addContaminationSlide, icon: Skull },
  { id: 'scoring', label: 'Scoring', addSlide: createScoringSlide, icon: LineChart },
  { id: 'context', label: 'Site Context', addSlide: addContextSlide, icon: Globe2 },
  { id: 'permissibility', label: 'Permissible Uses', addSlide: addPermissibilitySlide, icon: ListTodo }
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
    case 'context':
      return 'Analysing site context and nearby services...';
    case 'scoring':
      return 'Calculating final site scores...';
    default:
      return 'Processing...';
  }
};

const calculateDevelopableArea = (geometry) => {
  if (!geometry) return 0;
  const areaInSqMeters = area(geometry);
  return Math.round(areaInSqMeters);
};

const ScreenshotProgress = ({ screenshots, failedScreenshots }) => {
  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Screenshot Progress</h3>
      <div className="space-y-2">
        {Object.entries(screenshots).map(([key, value]) => {
          const isFailed = failedScreenshots?.includes(key);
          return (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{key.replace(/Screenshot$/, '')}</span>
              <div className="flex items-center">
                {value ? (
                  <span className="text-green-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Captured
                  </span>
                ) : isFailed ? (
                  <span className="text-red-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Failed
                  </span>
                ) : (
                  <span className="text-gray-400">Pending</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const formatTime = (ms) => {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / 1000 / 60) % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const Timer = ({ isRunning, onComplete }) => {
  const [time, setTime] = useState(0);
  const [completed, setCompleted] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      setCompleted(false);
      const startTime = Date.now() - time;
      intervalRef.current = setInterval(() => {
        setTime(Date.now() - startTime);
      }, 10);
    } else if (!isRunning && time !== 0) {
      clearInterval(intervalRef.current);
      setCompleted(true);
      if (onComplete) {
        onComplete(time);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  return (
    <div className={`timer ${isRunning ? 'running' : ''} ${completed ? 'completed' : ''}`}>
      {formatTime(time)}
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
    permissibility: true,
    scoring: true,
    context: true
  });
  const [developableArea, setDevelopableArea] = useState(null);
  const [showDevelopableArea, setShowDevelopableArea] = useState(true);
  const planningMapRef = useRef();
  const [currentStep, setCurrentStep] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [progress, setProgress] = useState(0);
  const [showHowTo, setShowHowTo] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [failedScreenshots, setFailedScreenshots] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [showIssuesList, setShowIssuesList] = useState(false);
  const [generationStartTime, setGenerationStartTime] = useState(null);
  const [generationLogs, setGenerationLogs] = useState([]);
  const logCounterRef = useRef(0);

  useEffect(() => {
    if (selectedFeature) {
      handleScreenshotCapture();
    }
  }, [selectedFeature]);

  useEffect(() => {
    // Test JWT claims when component mounts
    const fetchClaims = async () => {
      try {
        const claims = await checkUserClaims();
        console.log('Successfully retrieved user claims:', claims);
      } catch (error) {
        console.error('Failed to get user claims:', error);
      }
    };
    fetchClaims();
  }, []);

  const addLog = (message, type = 'default') => {
    const timestamp = new Date().toLocaleTimeString();
    logCounterRef.current += 1;
    setGenerationLogs(prev => [...prev, {
      id: `${logCounterRef.current}-${Date.now()}`,
      message,
      type,
      timestamp
    }]);
  };

  const generatePropertyReport = async () => {
    if (!selectedFeature) return;
    
    setIsGenerating(true);
    setStatus('generating');
    setCurrentStep('screenshots');
    setCompletedSteps([]);
    setFailedScreenshots([]);
    setGenerationStartTime(Date.now());
    setGenerationLogs([]);
    logCounterRef.current = 0;
    
    clearServiceCache();
    
    try {
      const screenshots = {};
      const failed = [];
      
      addLog('Starting report generation...', 'default');
      
      if (selectedSlides.cover) {
        addLog('Capturing cover screenshot...', 'image');
        try {
          screenshots.coverScreenshot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.COVER);
          addLog('Cover screenshot captured successfully', 'success');
        } catch (error) {
          console.error('Failed to capture cover screenshot:', error);
          failed.push('coverScreenshot');
          addLog('Failed to capture cover screenshot', 'error');
        }
      }
      
      if (selectedSlides.snapshot) {
        addLog('Capturing aerial and snapshot images...', 'image');
        try {
          screenshots.aerialScreenshot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.AERIAL);
          screenshots.snapshotScreenshot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.SNAPSHOT);
          addLog('Aerial and snapshot images captured successfully', 'success');
        } catch (error) {
          console.error('Failed to capture snapshot screenshots:', error);
          failed.push('aerialScreenshot', 'snapshotScreenshot');
          addLog('Failed to capture aerial/snapshot images', 'error');
        }
      }
      
      if (selectedSlides.planning) {
        await planningMapRef.current?.captureScreenshots();
        screenshots.zoningScreenshot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.ZONING, true, developableArea, showDevelopableArea);
        screenshots.fsrScreenshot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.FSR, true, developableArea, showDevelopableArea);
        screenshots.hobScreenshot = await captureMapScreenshot(selectedFeature, SCREENSHOT_TYPES.HOB, true, developableArea, showDevelopableArea);
      }
      
      if (selectedSlides.primaryAttributes) {
        screenshots.compositeMapScreenshot = await capturePrimarySiteAttributesMap(selectedFeature, developableArea, showDevelopableArea);
      }
      
      if (selectedSlides.secondaryAttributes) {
        screenshots.contourScreenshot = await captureContourMap(selectedFeature, developableArea, showDevelopableArea);
        screenshots.regularityScreenshot = await captureRegularityMap(selectedFeature, developableArea, showDevelopableArea);
      }
      
      if (selectedSlides.planningTwo) {
        screenshots.heritageScreenshot = await captureHeritageMap(selectedFeature, developableArea, showDevelopableArea);
        screenshots.acidSulfateSoilsScreenshot = await captureAcidSulfateMap(selectedFeature, developableArea, showDevelopableArea);
      }
      
      if (selectedSlides.servicing) {
        const waterMains = await captureWaterMainsMap(selectedFeature, developableArea, showDevelopableArea);
        screenshots.waterMainsScreenshot = waterMains?.image;
        screenshots.waterFeatures = waterMains?.features;
        
        const sewer = await captureSewerMap(selectedFeature, developableArea, showDevelopableArea);
        screenshots.sewerScreenshot = sewer?.image;
        screenshots.sewerFeatures = sewer?.features;
        
        const power = await capturePowerMap(selectedFeature, developableArea, showDevelopableArea);
        screenshots.powerScreenshot = power?.image;
        screenshots.powerFeatures = power?.features;
      }
      
      if (selectedSlides.utilisation) {
        const geoscape = await captureGeoscapeMap(selectedFeature, developableArea, showDevelopableArea);
        screenshots.geoscapeScreenshot = geoscape?.image;
        screenshots.geoscapeFeatures = geoscape?.features;
      }
      
      if (selectedSlides.access) {
        screenshots.roadsScreenshot = await captureRoadsMap(selectedFeature, developableArea, showDevelopableArea);
        screenshots.udpPrecinctsScreenshot = await captureUDPPrecinctMap(selectedFeature, developableArea, showDevelopableArea);
        screenshots.ptalScreenshot = await capturePTALMap(selectedFeature, developableArea, showDevelopableArea);
      }
      
      if (selectedSlides.hazards) {
        screenshots.floodMapScreenshot = await captureFloodMap(selectedFeature, developableArea, showDevelopableArea);
        screenshots.bushfireMapScreenshot = await captureBushfireMap(selectedFeature, developableArea, showDevelopableArea);
      }
      
      if (selectedSlides.environmental) {
        screenshots.tecMapScreenshot = await captureTECMap(selectedFeature, developableArea, showDevelopableArea);
        screenshots.tecFeatures = screenshots.tecMapScreenshot?.features;
        screenshots.biodiversityMapScreenshot = await captureBiodiversityMap(selectedFeature, developableArea, showDevelopableArea);
        screenshots.biodiversityFeatures = screenshots.biodiversityMapScreenshot?.features;
      }
      
      if (selectedSlides.contamination) {
        const contaminationResult = await captureContaminationMap(selectedFeature, developableArea, showDevelopableArea);
        screenshots.contaminationMapScreenshot = contaminationResult?.image;
        screenshots.contaminationFeatures = contaminationResult?.features;
        
        screenshots.historicalImagery = await captureHistoricalImagery(selectedFeature, developableArea, showDevelopableArea);
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
        showDevelopableArea,
        scores: {}, // Initialize empty scores object that will be populated by each slide
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
          ...(selectedSlides.scoring ? ['scoring'] : []),
          ...(selectedSlides.context ? ['context'] : []),
          ...(selectedSlides.permissibility ? ['permissibility'] : [])
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

      const generationTime = Date.now() - generationStartTime;
      await recordReportGeneration(generationTime, selectedSlides, selectedFeature.properties.copiedFrom);
      
      setCompletedSteps(prev => [...prev, 'finalising']);
      setStatus('success');
    } catch (error) {
      console.error('Error generating report:', error);
      setStatus('error');
    } finally {
      setIsGenerating(false);
      setCurrentStep(null);
      setGenerationStartTime(null);
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
      
      // Capture GPR map for context slide
      const gprResult = await captureGPRMap(selectedFeature, developableArea);
      
      setPreviewScreenshot(coverScreenshot);
      setScreenshots({
        coverScreenshot,
        snapshotScreenshot,
        GPRScreenshot: gprResult?.image,
        gprFeatures: gprResult?.features
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

  const triggerConfetti = () => {
    setShowConfetti(true);
    const end = Date.now() + 5000; // Increased duration to 5 seconds

    const colors = ['#002664', '#363636', '#FFD700', '#4CAF50', '#2196F3'];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.8 },
        colors: colors,
        shapes: ['circle', 'square'],
        gravity: 0.7,
        scalar: 1.5,
        drift: 0,
        ticks: 300
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.8 },
        colors: colors,
        shapes: ['circle', 'square'],
        gravity: 0.7,
        scalar: 1.5,
        drift: 0,
        ticks: 300
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();

    // Fire a few bursts for more impact
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { x: 0.5, y: 0.8 },
        colors: colors,
        shapes: ['circle', 'square'],
        scalar: 1.5
      });
    }, 500);

    setTimeout(() => {
      setShowConfetti(false);
    }, 5000);
  };

  const handleTimerComplete = (time) => {
    console.log(`Report generated in ${formatTime(time)}`);
    triggerConfetti();
  };

  // Add this helper to get the latest log
  const getLatestLog = (logs) => {
    return logs[logs.length - 1] || null;
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-4">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <button
            className="px-4 py-2.5 rounded-xl text-gray-900 font-medium bg-white border-2 border-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            onClick={() => setShowHowTo(true)}
          >
            <HelpCircle className="w-5 h-5 text-blue-600" />
            How to use
          </button>
          
          <button
            className="px-4 py-2.5 rounded-xl text-gray-900 font-medium bg-white border-2 border-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            onClick={() => setShowLeaderboard(true)}
          >
            <Trophy className="w-5 h-5 text-yellow-500" />
            Leaderboard
          </button>

          <button
            onClick={() => setShowIssuesList(true)}
            className="px-4 py-2.5 rounded-xl text-gray-900 font-medium bg-white border-2 border-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
          >
            <AlertCircle className="w-5 h-5 text-blue-600" />
            View Issues
          </button>

          <button
            onClick={() => setIsIssueModalOpen(true)}
            className="px-4 py-2.5 rounded-xl text-gray-900 font-medium bg-white border-2 border-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
          >
            <AlertCircle className="w-5 h-5 text-red-600" />
            Log Issue
          </button>
        </div>

        <div className="mb-4">
          <h2 className="text-xl font-semibold">Desktop Due Diligence PowerPoint Report Generator (WIP)</h2>
        </div>
        
        <PlanningMapView 
          ref={planningMapRef}
          feature={selectedFeature} 
          onScreenshotCapture={handlePlanningScreenshotsCapture}
          developableArea={developableArea}
          showDevelopableArea={showDevelopableArea}
        />

        <DevelopableAreaSelector onLayerSelect={handleDevelopableAreaSelect} selectedFeature={selectedFeature} />
        
        {developableArea && (
          <div className="p-4 bg-white rounded-lg shadow mb-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={showDevelopableArea}
                  onChange={(e) => setShowDevelopableArea(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                  disabled={isGenerating}
                />
                <span className="text-0.5g font-small">Show Blue Dash Developable Area Boundary in Screenshots?</span>
              </label>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow mb-4">
          <SlidePreview 
            selectedFeature={selectedFeature}
            screenshot={previewScreenshot}
          />

          <div className="flex items-center justify-between mt-4 mb-2 pb-2 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <label className="flex items-center space-x-2">
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
            </div>

            {isGenerating && (
              <Timer 
                isRunning={isGenerating} 
                onComplete={handleTimerComplete}
              />
            )}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {slideOptions.map((option) => {
                const isActive = currentStep === option.id;
                const isCompleted = completedSteps.includes(option.id);
                const Icon = option.icon;
                
                return (
                  <div 
                    key={option.id} 
                    className={`
                      slide-card relative p-2.5 rounded-lg border-2 transition-all duration-200
                      ${isGenerating && !selectedSlides[option.id] ? 'opacity-50' : ''}
                      ${isCompleted ? 'slide-card-completed border-green-200 bg-green-50' : 'border-gray-200 hover:border-blue-400'}
                      ${isActive ? 'slide-card-active border-blue-400 shadow-lg' : ''}
                      hover:shadow-md cursor-pointer
                    `}
                    onClick={() => {
                      if (!isGenerating) {
                        setSelectedSlides(prev => ({
                          ...prev,
                          [option.id]: !prev[option.id]
                        }));
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <div className={`slide-icon p-1.5 rounded-lg ${isCompleted ? 'bg-green-100' : 'bg-gray-100'}`}>
                        <Icon 
                          className={`w-4 h-4 ${isCompleted ? 'text-green-600' : 'text-gray-600'}`} 
                          strokeWidth={1.5} 
                        />
                      </div>
                      <input
                        type="checkbox"
                        id={option.id}
                        checked={selectedSlides[option.id]}
                        onChange={(e) => e.stopPropagation()}
                        disabled={isGenerating}
                        className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                    </div>
                    
                    <h3 className="font-medium text-sm text-gray-900">{option.label}</h3>
                    
                    {isGenerating && selectedSlides[option.id] && (
                      <div className="mt-1">
                        {isCompleted ? (
                          <div className="flex items-center text-green-600 text-xs">
                            <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Complete
                          </div>
                        ) : isActive ? (
                          <div className="flex items-center space-x-1.5 text-xs text-blue-500">
                            <div className="w-2.5 h-2.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span className="truncate">{getStepDescription(option.id)}</span>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">Pending</div>
                        )}
                      </div>
                    )}

                    {isActive && (
                      <div 
                        className="absolute inset-0 border-2 border-blue-400 rounded-lg animate-pulse pointer-events-none"
                        style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4">
              <motion.div
                className={`${isGenerating ? 'w-3/4' : 'w-full'}`}
                layout
              >
                <motion.button
                  onClick={generatePropertyReport}
                  disabled={!selectedFeature || isGenerating}
                  className={`w-full px-4 py-3 rounded text-white font-medium relative overflow-hidden
                    ${!selectedFeature || isGenerating 
                      ? 'bg-gray-400' 
                      : 'bg-blue-600 hover:bg-blue-700'
                    } transition-all`}
                >
                  {isGenerating ? (
                    <motion.div 
                      className="flex items-center justify-center gap-3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={getLatestLog(generationLogs)?.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-sm"
                        >
                          {getLatestLog(generationLogs)?.message || 'Initializing...'}
                        </motion.span>
                      </AnimatePresence>
                    </motion.div>
                  ) : (
                    'Generate Report'
                  )}
                </motion.button>
              </motion.div>

              {isGenerating && (
                <motion.button
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={handleCancelGeneration}
                  disabled={isCancelling}
                  className="w-1/4 px-4 py-2 rounded text-white font-medium bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Cancel
                </motion.button>
              )}
            </div>

            {!isGenerating && status === 'success' && (
              <div className="text-green-600 success-message">Report generated successfully</div>
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

      {showHowTo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-[80%] max-h-[90vh] rounded-xl border-2 border-blue-600 bg-white shadow-xl relative flex flex-col"
          >
            <div className="sticky top-0 z-10 bg-white p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <motion.h3 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="text-2xl font-semibold text-gray-900"
                >
                  How to Generate a Report
                </motion.h3>
                <button 
                  onClick={() => setShowHowTo(false)}
                  className="rounded-full p-2 hover:bg-gray-100 transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.8536 2.85355C13.0488 2.65829 13.0488 2.34171 12.8536 2.14645C12.6583 1.95118 12.3417 1.95118 12.1464 2.14645L7.5 6.79289L2.85355 2.14645C2.65829 1.95118 2.34171 1.95118 2.14645 2.14645C1.95118 2.34171 1.95118 2.65829 2.14645 2.85355L6.79289 7.5L2.14645 12.1464C1.95118 12.3417 1.95118 12.6583 2.14645 12.8536C2.34171 13.0488 2.65829 13.0488 2.85355 12.8536L7.5 8.20711L12.1464 12.8536C12.3417 13.0488 12.6583 13.0488 12.8536 12.8536C13.0488 12.6583 13.0488 12.3417 12.8536 12.1464L8.20711 7.5L12.8536 2.85355Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8">
              <div className="space-y-6">
                {[
                  {
                    step: 1,
                    title: "Disable VPN",
                    content: "Temporarily turn off Harmony / VPN."
                  },
                  {
                    step: 2,
                    title: "Search Property",
                    content: "Use Land iQ Site Search to identify the property of interest."
                  },
                  {
                    step: 3,
                    title: "Generate Shortlist",
                    content: "In Site Search, select the property and generate a shortlist using that selection."
                  },
                  {
                    step: 4,
                    title: "Activate Drawing Layer",
                    content: "Left-click on the 'Site Boundary' drawing layer to activate it."
                  },
                  {
                    step: 5,
                    title: "Create Property Boundary",
                    content: "Right click on the property on the map and wait until you see the shortlist appear and your property highlighted - then hover over the little arrow and click 'Create'."
                  },
                  {
                    step: 6,
                    title: "Complete Property Coverage",
                    content: "If it didn't create a polygon that covers the whole property, click on the part that was added first and then right click along the boundary of any missing parts of the property and select 'Merge'. Do this until the complete property is covered. Once complete, on the left panel change the usage to be 'Site Boundary'."
                  },
                  {
                    step: 7,
                    title: "Add Developable Area (Optional)",
                    content: "If you want to include a developable area, left-click on the 'Developable Area' drawing layer on the left panel and use Giraffe's drawing tools to draw the boundary. Once complete, on the left panel change the usage to be 'Developable Area'."
                  },
                  {
                    step: 8,
                    title: "Select Area Type",
                    content: "On the right panel, select the developable area to use (just the Site Boundary or the Developable Area you've just drawn)."
                  },
                  {
                    step: 9,
                    title: "Configure Visibility",
                    content: "Confirm in the check-box if you want to show the developable area as a blue-dash line or not in the report (uncheck this if you have selected to just use the Site Boundary and not a separate Developable Area)."
                  },
                  {
                    step: 10,
                    title: "Review and Generate",
                    content: "A preview will load of the cover slide and if everything looks good to go, select the slides you want (default is all slides) and click on the blue 'Generate Report' button."
                  },
                  {
                    step: 11,
                    title: "Wait for Generation",
                    content: "Report will generate and for a full report should take approximately 4 minutes to produce. If any of the slides fail or you would like to produce a sub-set of the full report you can check the appropriate slides and select Generate Report again as needed."
                  }
                ].map((item, index) => (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative pl-12 pr-4"
                  >
                    <div className="absolute left-0 top-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">{item.title}</h4>
                      <p className="text-gray-600 leading-relaxed">{item.content}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showLeaderboard && (
        <Leaderboard 
          isOpen={showLeaderboard} 
          onClose={() => setShowLeaderboard(false)} 
        />
      )}

      <IssueModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
      />

      <IssuesList
        isOpen={showIssuesList}
        onClose={() => setShowIssuesList(false)}
      />
    </div>
  );
};

export default ReportGenerator;