import React, { useState, useEffect, useRef } from 'react';
import { generateReport } from '../../lib/powerpoint';

// Import Slides

import { addCoverSlide } from './slides/coverSlide';
import { addPropertySnapshotSlide } from './slides/propertySnapshotSlide';
import { addPrimarySiteAttributesSlide } from './slides/primarySiteAttributesSlide';
import { addSecondaryAttributesSlide } from './slides/secondaryAttributesSlide';
import { addPlanningSlide } from './slides/planningSlide';
import { addPlanningSlide2 } from './slides/planningSlide2';
import { addServicingSlide } from './slides/servicingSlide';
import { addUtilisationSlide } from './slides/utilisationSlide';
import { addAccessSlide } from './slides/accessSlide';
import { addHazardsSlide } from './slides/hazardsSlide';
import { addEnviroSlide } from './slides/enviroSlide';
import { addContaminationSlide } from './slides/contaminationSlide';
import { createScoringSlide } from './slides/scoringSlide';
import { addContextSlide } from './slides/contextSlide';
import { addPermissibilitySlide } from './slides/permissibilitySlide';
import { addDevelopmentSlide } from './slides/developmentSlide';
import { addFeasibilitySlide } from './slides/feasibilitySlide';
import area from '@turf/area';

// Import Screenshots

import { 
  captureMapScreenshot, 
  captureRegularityMap,  
} from './utils/map/services/screenshot';
import { capturePrimarySiteAttributesMap } from './utils/map/services/screenshots/primarySiteAttributesScreenshot';
import { captureContourMap } from './utils/map/services/screenshots/contourScreenshot';
import { captureZoningMap } from './utils/map/services/screenshots/zoningScreenshot';
import { captureFSRMap } from './utils/map/services/screenshots/fsrScreenshot';
import { captureHOBMap } from './utils/map/services/screenshots/hobScreenshot';
import { captureHeritageMap } from './utils/map/services/screenshots/heritageScreenshot';
import { captureAcidSulfateMap } from './utils/map/services/screenshots/acidSulphateScreenshot';
import { captureWaterMainsMap } from './utils/map/services/screenshots/waterMainsScreenshot';
import { captureSewerMap } from './utils/map/services/screenshots/sewerMainsScreenshot';
import { capturePowerMap } from './utils/map/services/screenshots/powerMainsScreenshot';
import { captureGeoscapeMap } from './utils/map/services/screenshots/geoscapeScreenshot';
import { captureRoadsMap } from './utils/map/services/screenshots/roadScreenshot';
import { captureUDPPrecinctMap } from './utils/map/services/screenshots/strategicScreenshot';
import { capturePTALMap } from './utils/map/services/screenshots/ptalScreenshot';
import { captureFloodMap } from './utils/map/services/screenshots/floodScreenshot';
import { captureBushfireMap } from './utils/map/services/screenshots/bushfireScreenshot';
import { captureTECMap } from './utils/map/services/screenshots/tecScreenshot';
import { captureBiodiversityMap } from './utils/map/services/screenshots/biodiversityScreenshot';
import { captureContaminationMap } from './utils/map/services/screenshots/contaminationScreenshot';
import { captureHistoricalImagery } from './utils/map/services/screenshots/historicalImageryScreenshot';
import { captureGPRMap } from './utils/map/services/screenshots/contextScreenshot';
import { clearServiceCache } from './utils/map/services/wmsService';
import { SCREENSHOT_TYPES } from './utils/map/config/screenshotTypes';
import SlidePreview from './SlidePreview';
import PptxGenJS from 'pptxgenjs';
import DevelopableAreaSelector, { DevelopableAreaOptions } from './DevelopableAreaSelector';
import { checkUserClaims } from './utils/auth/tokenUtils';

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
  HelpCircle,
  Calculator,
  Settings2,
  Banknote,
  FileStack,
  X,
  MessageSquare,
  Mail,
  BellRing,
  Layers as LayersIcon,
  Bell,
  ClipboardCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import './Timer.css';
import Leaderboard from './Leaderboard';
import IssueModal from './IssueModal';
import { recordReportGeneration } from './utils/stats/reportStats';
import './GenerationLog.css';
import { motion, AnimatePresence } from 'framer-motion';
import IssuesList from './IssuesList';
import FeasibilityManager from './components/FeasibilityManager';
import Papa from 'papaparse';
import PropertyListSelector from './PropertyListSelector';
import Chat from './Chat';
import NotificationCenter from '../NotificationCenter';
import './styles.css';
import PropertyTriage from './PropertyTriage';

const slideOptions = [
  { id: 'cover', label: 'Cover Page', addSlide: addCoverSlide, icon: Home },
  { id: 'propertySnapshot', label: 'Property Snapshot', addSlide: addPropertySnapshotSlide, icon: ImageIcon },
  { id: 'primarySiteAttributes', label: 'Primary Site Attributes', addSlide: addPrimarySiteAttributesSlide, icon: MapPin },
  { id: 'secondaryAttributes', label: 'Secondary Attributes', addSlide: addSecondaryAttributesSlide, icon: ListTodo },
  { id: 'planning', label: 'Planning', addSlide: addPlanningSlide, icon: Building2 },
  { id: 'planningTwo', label: 'Heritage & Acid Sulfate Soils', addSlide: addPlanningSlide2, icon: Landmark },
  { id: 'servicing', label: 'Servicing', addSlide: addServicingSlide, icon: Wrench },
  { id: 'utilisation', label: 'Utilisation and Improvements', addSlide: addUtilisationSlide, icon: BarChart3 },
  { id: 'access', label: 'Access and Strategic Centres', addSlide: addAccessSlide, icon: Navigation },
  { id: 'hazards', label: 'Natural Hazards', addSlide: addHazardsSlide, icon: AlertTriangle },
  { id: 'environmental', label: 'Environmental', addSlide: addEnviroSlide, icon: Leaf },
  { id: 'contamination', label: 'Site Contamination', addSlide: addContaminationSlide, icon: Skull },
  { id: 'scoring', label: 'Scoring', addSlide: createScoringSlide, icon: LineChart },
  { id: 'context', label: 'Site Context', addSlide: addContextSlide, icon: Globe2 },
  { id: 'permissibility', label: 'Permissible Uses', addSlide: addPermissibilitySlide, icon: ListTodo },
  { id: 'development', label: 'Development', addSlide: addDevelopmentSlide, icon: Building2 },
  { id: 'feasibility', label: 'Feasibility', addSlide: addFeasibilitySlide, icon: Calculator }
];

const getStepDescription = (stepId) => {
  switch (stepId) {
    case 'screenshots':
      return 'Capturing map screenshots...';
    case 'cover':
      return 'Creating title page and overview...';
    case 'propertySnapshot':
      return 'Adding aerial imagery and property details...';
    case 'primarySiteAttributes':
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
  
  // If this is a feature collection with multiple features, calculate the total area
  if (geometry.features && Array.isArray(geometry.features)) {
    return Math.round(geometry.features.reduce((total, feature) => {
      return total + area(feature.geometry);
    }, 0));
  }
  
  // Single geometry case
  const areaInSqMeters = area(geometry);
  return Math.round(areaInSqMeters);
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

const ReportGenerator = ({ 
  selectedFeatures = [], 
  onPropertySelect, 
  isMultiSelectMode, 
  toggleMultiSelectMode,
  clearSelectedFeatures
}) => {
  const [screenshots, setScreenshots] = useState({});
  const [previewScreenshot, setPreviewScreenshot] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState(null);
  const [selectedSlides, setSelectedSlides] = useState({
    cover: true,
    propertySnapshot: true,
    primarySiteAttributes: true,
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
    context: true,
    development: true,
    feasibility: false
  });
  const [developableArea, setDevelopableArea] = useState(null);
  const [showDevelopableArea, setShowDevelopableArea] = useState(true);
  const [useDevelopableAreaForBounds, setUseDevelopableAreaForBounds] = useState(false);
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
  const [logs, setLogs] = useState([]);
  const logCounterRef = useRef(0);
  const [userInfo, setUserInfo] = useState(null);
  const [feasibilitySettings, setFeasibilitySettings] = useState({
    mediumDensity: {
      siteEfficiencyRatio: 0.70,
      floorToFloorHeight: 3.1,
      gbaToGfaRatio: 0.90,
      gfaToNsaRatio: 0.85,
      dwellingPrice: null,
      assumedDwellingSize: null,
      constructionCostM2: null,
      assumedConstructionCostM2: null,
      agentsSalesCommission: 0.02,
      legalFeesOnSales: 0.005,
      marketingCosts: 0.0075,
      profitAndRisk: 0.20,
      daApplicationFees: 200000,
      professionalFees: 0.05,
      developmentContribution: 0.01,
      interestRate: 0.075,
      projectPeriod: 24,
      useLMR: false
    },
    highDensity: {
      siteEfficiencyRatio: 0.60,
      floorToFloorHeight: 3.1,
      gbaToGfaRatio: 0.75,
      gfaToNsaRatio: 0.85,
      dwellingPrice: null,
      assumedDwellingSize: 75,
      constructionCostM2: null,
      assumedConstructionCostM2: null,
      agentsSalesCommission: 0.02,
      legalFeesOnSales: 0.005,
      marketingCosts: 0.0075,
      profitAndRisk: 0.20,
      daApplicationFees: 200000,
      professionalFees: 0.05,
      developmentContribution: 0.01,
      interestRate: 0.075,
      projectPeriod: 48,
      useLMR: false
    }
  });
  const [salesData, setSalesData] = useState([]);
  const [showFeasibilitySettings, setShowFeasibilitySettings] = useState(false);
  const [selectedSiteFeatures, setSelectedSiteFeatures] = useState(selectedFeatures);
  const [showChat, setShowChat] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [showNewsTicker, setShowNewsTicker] = useState(true); // Changed to true to make the ticker visible
  const [showDevelopableAreaOptions, setShowDevelopableAreaOptions] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showTriageUI, setShowTriageUI] = useState(false);
  const [allProperties, setAllProperties] = useState([]);
  
  // Use the first selected feature as the primary for display
  const primaryFeature = selectedSiteFeatures.length > 0 ? selectedSiteFeatures[0] : null;

  // When selectedFeatures prop changes, update our internal state
  useEffect(() => {
    setSelectedSiteFeatures(selectedFeatures);
  }, [selectedFeatures]);

  // Fetch user info from GiraffeSDK when component mounts and check notification permission
  useEffect(() => {
    const getUserInfo = async () => {
      try {
        console.log('Attempting to retrieve user info...');
        const info = await checkUserClaims();
        console.log('User info returned from checkUserClaims:', info);
        
        // Always set userInfo even if null to avoid sign-in required message
        setUserInfo(info || { email: 'user@example.com', name: 'User' });
        
        // Check notification permission regardless of user info
        checkNotificationPermission();
      } catch (error) {
        console.error('Error getting user info:', error);
        // Use a default user object to prevent sign-in required messages
        setUserInfo({ email: 'user@example.com', name: 'User' });
      }
    };

    getUserInfo();
    
    // For good measure, recheck periodically in case user logs in during session
    const interval = setInterval(getUserInfo, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);

  // Check notification permission
  const checkNotificationPermission = () => {
    try {
      if (!('Notification' in window)) {
        console.log('This browser does not support desktop notifications');
        setNotificationPermission('not-supported');
        return;
      }
      
      setNotificationPermission(Notification.permission);
      
      // If permission isn't denied or granted, we'll leave it for user action later
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        console.log('Notification permission status:', Notification.permission);
      }
    } catch (error) {
      console.error('Error checking notification permission:', error);
    }
  };

  // Function to send desktop notification
  const sendDesktopNotification = (title, message) => {
    try {
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        console.log('This browser does not support desktop notifications');
        return;
      }

      // Check if permission is already granted
      if (Notification.permission === 'granted') {
        new Notification(title, { body: message });
      } 
      // If permission isn't denied, request it
      else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, { body: message });
          }
        });
      }
    } catch (error) {
      console.error('Error sending desktop notification:', error);
    }
  };

  // Function to save notification locally
  const saveNotification = (notification) => {
    try {
      const notifications = JSON.parse(localStorage.getItem('userNotifications') || '[]');
      const isSuccess = notification.title.includes('Complete') || notification.title.includes('success');
      
      notifications.push({
        ...notification,
        to: userInfo?.email || 'anonymous', // Add recipient info
        subject: notification.title,
        text: notification.message,
        status: isSuccess ? 'success' : 'error',
      });
      localStorage.setItem('userNotifications', JSON.stringify(notifications));
      return true;
    } catch (error) {
      console.error('Error saving notification to localStorage:', error);
      return false;
    }
  };

  // Function to save notification
  const sendEmailNotification = async (reportName, status) => {
    // We'll always have userInfo now, so just save the notification
    try {
      addLog('Saving notification...', 'default');
      
      // Standardize status for display purposes
      const displayStatus = status === 'success' ? 'Complete' : status;
      const isSuccess = status === 'success' || status === 'Complete';
      
      // Save to localStorage
      const notification = {
        id: Date.now(),
        title: `Report ${displayStatus}: ${reportName}`,
        message: `Your property report "${reportName}" has ${isSuccess ? 'been generated' : 'failed to generate'}.`,
        timestamp: new Date().toISOString(),
        read: false
      };
      
      saveNotification(notification);
      addLog('Notification saved locally', 'success');
    } catch (error) {
      console.error('Error saving notification:', error);
      addLog(`Error saving notification: ${error.message}`, 'error');
    }
  };

  // Handler for when sites are selected in the PropertyListSelector
  const handleSiteSelection = (features) => {
    // Ensure each feature has a unique ID
    const processedFeatures = features.map(feature => {
      if (feature.id) {
        return feature;
      }
      
      const id = feature.properties?.copiedFrom?.id || 
                feature.properties?.id || 
                feature.properties?.copiedFrom?.OBJECTID ||
                Math.random().toString(36).substring(2, 9);
                
      return { ...feature, id };
    });
    
    // Update allProperties to include these features
    setAllProperties(prevProperties => {
      // Create a map of existing property IDs for quick lookup
      const existingIds = new Map(prevProperties.map(prop => [
        prop.id || prop.properties?.copiedFrom?.id || Math.random().toString(36).substring(2, 9),
        true
      ]));
      
      // Filter out duplicates and add new properties
      const newProperties = processedFeatures.filter(feature => 
        !existingIds.has(feature.id || feature.properties?.copiedFrom?.id)
      );
      
      return [...prevProperties, ...newProperties];
    });
    
    // Use the onPropertySelect prop to update the parent's state
    if (onPropertySelect) {
      onPropertySelect(processedFeatures);
    } else {
      setSelectedSiteFeatures(processedFeatures);
    }
  };
  
  // Compute combined area of all selected features
  const combinedArea = React.useMemo(() => {
    if (!selectedFeatures.length) return 0;
    
    return selectedFeatures.reduce((total, feature) => {
      const featureArea = feature.properties?.copiedFrom?.site_suitability__area
        ? parseFloat(feature.properties.copiedFrom.site_suitability__area)
        : calculateDevelopableArea(feature.geometry);
        
      return total + featureArea;
    }, 0);
  }, [selectedFeatures]);
  
  // Create a combined geometry from all selected features
  const combinedGeometry = React.useMemo(() => {
    if (!selectedFeatures.length) return null;
    if (selectedFeatures.length === 1) return selectedFeatures[0].geometry;
    
    // Create a GeoJSON FeatureCollection with all geometries
    return {
      type: 'FeatureCollection',
      features: selectedFeatures.map(feature => ({
        type: 'Feature',
        geometry: feature.geometry
      }))
    };
  }, [selectedFeatures]);

  useEffect(() => {
    if (selectedFeatures.length > 0) {
      console.log('Selected Features:', selectedFeatures);
      console.log('Addresses:', selectedFeatures.map(feature => feature.properties?.copiedFrom?.site__address));
      handleScreenshotCapture();
    }
  }, [selectedFeatures]);

  useEffect(() => {
    if (selectedFeatures.length > 0 && selectedFeatures[0].properties?.copiedFrom?.site_suitability__suburb) {
      const fetchSalesData = async () => {
        const suburb = selectedFeatures[0].properties.copiedFrom.site_suitability__suburb.toUpperCase();
        console.log('Starting fetchSalesData with params:', {
          originalSuburb: selectedFeatures[0].properties.copiedFrom.site_suitability__suburb,
          uppercaseSuburb: suburb,
          fullProperties: selectedFeatures[0].properties
        });
        
        try {
          console.log('Fetching CSV data for:', suburb);
          const response = await fetch('/nsw_property_sales.csv');
          const csvText = await response.text();
          
          Papa.parse(csvText, {
            header: true,
            complete: (results) => {
              console.log('CSV parsing complete:', {
                totalRows: results.data.length,
                sampleRow: results.data[0],
                headers: results.meta.fields
              });

              // First try exact suburb match
              let filteredData = results.data
                .filter(row => 
                  row.suburb?.toUpperCase() === suburb && 
                  row.price && row.bedrooms
                );

              // If no results, try searching for suburbs containing the original suburb name
              if (filteredData.length === 0) {
                console.log('No exact suburb matches found, searching for related suburbs containing:', suburb);
                const baseSuburb = suburb.split(' ').pop(); // Get the base suburb name (e.g., 'KILLARA' from 'EAST KILLARA')
                filteredData = results.data
                  .filter(row => 
                    row.suburb?.toUpperCase().includes(baseSuburb) && 
                    row.price && row.bedrooms
                  );
                
                console.log('Found related suburbs:', {
                  baseSuburb,
                  matchedSuburbs: [...new Set(filteredData.map(row => row.suburb))],
                  matchCount: filteredData.length
                });
              }

              // Process the filtered data
              const processedData = filteredData
                .map(row => ({
                  price: parseFloat(row.price),
                  bedrooms: parseInt(row.bedrooms),
                  bathrooms: parseInt(row.bathrooms) || 0,
                  parking: parseInt(row.parking) || 0,
                  address: row.address || 'Address not provided',
                  property_type: row.property_type || 'Apartment',
                  sold_date: row.sold_date || 'Date not provided',
                  suburb: row.suburb // Include suburb in the processed data
                }))
                .filter(item => 
                  !isNaN(item.price) && 
                  !isNaN(item.bedrooms) && 
                  item.price > 0
                )
                .sort((a, b) => new Date(b.sold_date) - new Date(a.sold_date));

              console.log('Processed sales data:', {
                originalLength: results.data.length,
                filteredLength: processedData.length,
                sample: processedData.slice(0, 3),
                suburb,
                uniqueSuburbs: [...new Set(processedData.map(item => item.suburb))]
              });

              setSalesData(processedData);
            },
            error: (error) => {
              console.error('CSV parsing error:', error);
              setSalesData([]);
            }
          });
        } catch (error) {
          console.error('Error fetching CSV:', error);
          setSalesData([]);
        }
      };

      fetchSalesData();
    } else {
      console.log('No suburb data available:', {
        properties: selectedFeatures.map(feature => feature.properties),
        copiedFrom: selectedFeatures.map(feature => feature.properties?.copiedFrom),
        suburb: selectedFeatures.map(feature => feature.properties?.copiedFrom?.site_suitability__suburb)
      });
    }
  }, [selectedFeatures]);

  useEffect(() => {
    if (selectedFeatures.length > 0 && selectedFeatures[0].properties?.copiedFrom?.site_suitability__suburb) {
      const fetchSalesData = async () => {
        const suburb = selectedFeatures[0].properties.copiedFrom.site_suitability__suburb.toUpperCase();
        console.log('Starting fetchSalesData with params:', {
          originalSuburb: selectedFeatures[0].properties.copiedFrom.site_suitability__suburb,
          uppercaseSuburb: suburb,
          fullProperties: selectedFeatures[0].properties
        });
        
        try {
          console.log('Fetching CSV data for:', suburb);
          const response = await fetch('/nsw_property_sales.csv');
          const csvText = await response.text();
          
          Papa.parse(csvText, {
            header: true,
            complete: (results) => {
              console.log('CSV parsing complete:', {
                totalRows: results.data.length,
                sampleRow: results.data[0],
                headers: results.meta.fields
              });

              // First try exact suburb match
              let filteredData = results.data
                .filter(row => 
                  row.suburb?.toUpperCase() === suburb && 
                  row.price && row.bedrooms
                );

              // If no results, try searching for suburbs containing the original suburb name
              if (filteredData.length === 0) {
                console.log('No exact suburb matches found, searching for related suburbs containing:', suburb);
                const baseSuburb = suburb.split(' ').pop(); // Get the base suburb name (e.g., 'KILLARA' from 'EAST KILLARA')
                filteredData = results.data
                  .filter(row => 
                    row.suburb?.toUpperCase().includes(baseSuburb) && 
                    row.price && row.bedrooms
                  );
                
                console.log('Found related suburbs:', {
                  baseSuburb,
                  matchedSuburbs: [...new Set(filteredData.map(row => row.suburb))],
                  matchCount: filteredData.length
                });
              }

              // Process the filtered data
              const processedData = filteredData
                .map(row => ({
                  price: parseFloat(row.price),
                  bedrooms: parseInt(row.bedrooms),
                  bathrooms: parseInt(row.bathrooms) || 0,
                  parking: parseInt(row.parking) || 0,
                  address: row.address || 'Address not provided',
                  property_type: row.property_type || 'Apartment',
                  sold_date: row.sold_date || 'Date not provided',
                  suburb: row.suburb // Include suburb in the processed data
                }))
                .filter(item => 
                  !isNaN(item.price) && 
                  !isNaN(item.bedrooms) && 
                  item.price > 0
                )
                .sort((a, b) => new Date(b.sold_date) - new Date(a.sold_date));

              console.log('Processed sales data:', {
                originalLength: results.data.length,
                filteredLength: processedData.length,
                sample: processedData.slice(0, 3),
                suburb,
                uniqueSuburbs: [...new Set(processedData.map(item => item.suburb))]
              });

              setSalesData(processedData);
            },
            error: (error) => {
              console.error('CSV parsing error:', error);
              setSalesData([]);
            }
          });
        } catch (error) {
          console.error('Error fetching CSV:', error);
          setSalesData([]);
        }
      };

      fetchSalesData();
    } else {
      console.log('No suburb data available:', {
        properties: selectedFeatures.map(feature => feature.properties),
        copiedFrom: selectedFeatures.map(feature => feature.properties?.copiedFrom),
        suburb: selectedFeatures.map(feature => feature.properties?.copiedFrom?.site_suitability__suburb)
      });
    }
  }, [selectedFeatures]);

  useEffect(() => {
    if (selectedFeatures.length > 0 && selectedFeatures[0].properties?.copiedFrom?.site_suitability__suburb) {
      const fetchSalesData = async () => {
        const suburb = selectedFeatures[0].properties.copiedFrom.site_suitability__suburb.toUpperCase();
        console.log('Starting fetchSalesData with params:', {
          originalSuburb: selectedFeatures[0].properties.copiedFrom.site_suitability__suburb,
          uppercaseSuburb: suburb,
          fullProperties: selectedFeatures[0].properties
        });
        
        try {
          console.log('Fetching CSV data for:', suburb);
          const response = await fetch('/nsw_property_sales.csv');
          const csvText = await response.text();
          
          Papa.parse(csvText, {
            header: true,
            complete: (results) => {
              console.log('CSV parsing complete:', {
                totalRows: results.data.length,
                sampleRow: results.data[0],
                headers: results.meta.fields
              });

              // First try exact suburb match
              let filteredData = results.data
                .filter(row => 
                  row.suburb?.toUpperCase() === suburb && 
                  row.price && row.bedrooms
                );

              // If no results, try searching for suburbs containing the original suburb name
              if (filteredData.length === 0) {
                console.log('No exact suburb matches found, searching for related suburbs containing:', suburb);
                const baseSuburb = suburb.split(' ').pop(); // Get the base suburb name (e.g., 'KILLARA' from 'EAST KILLARA')
                filteredData = results.data
                  .filter(row => 
                    row.suburb?.toUpperCase().includes(baseSuburb) && 
                    row.price && row.bedrooms
                  );
                
                console.log('Found related suburbs:', {
                  baseSuburb,
                  matchedSuburbs: [...new Set(filteredData.map(row => row.suburb))],
                  matchCount: filteredData.length
                });
              }

              // Process the filtered data
              const processedData = filteredData
                .map(row => ({
                  price: parseFloat(row.price),
                  bedrooms: parseInt(row.bedrooms),
                  bathrooms: parseInt(row.bathrooms) || 0,
                  parking: parseInt(row.parking) || 0,
                  address: row.address || 'Address not provided',
                  property_type: row.property_type || 'Apartment',
                  sold_date: row.sold_date || 'Date not provided',
                  suburb: row.suburb // Include suburb in the processed data
                }))
                .filter(item => 
                  !isNaN(item.price) && 
                  !isNaN(item.bedrooms) && 
                  item.price > 0
                )
                .sort((a, b) => new Date(b.sold_date) - new Date(a.sold_date));

              console.log('Processed sales data:', {
                originalLength: results.data.length,
                filteredLength: processedData.length,
                sample: processedData.slice(0, 3),
                suburb,
                uniqueSuburbs: [...new Set(processedData.map(item => item.suburb))]
              });

              setSalesData(processedData);
            },
            error: (error) => {
              console.error('CSV parsing error:', error);
              setSalesData([]);
            }
          });
        } catch (error) {
          console.error('Error fetching CSV:', error);
          setSalesData([]);
        }
      };

      fetchSalesData();
    } else {
      console.log('No suburb data available:', {
        properties: selectedFeatures.map(feature => feature.properties),
        copiedFrom: selectedFeatures.map(feature => feature.properties?.copiedFrom),
        suburb: selectedFeatures.map(feature => feature.properties?.copiedFrom?.site_suitability__suburb)
      });
    }
  }, [selectedFeatures]);

  const addLog = (message, type = 'default') => {
    const timestamp = new Date().toLocaleTimeString();
    logCounterRef.current += 1;
    setGenerationLogs(prev => [...prev, {
      id: `${logCounterRef.current}-${Date.now()}`,
      message,
      type,
      timestamp
    }]);
    // Also update the logs state for backward compatibility
    setLogs(prev => [...prev, { message, type }]);
  };

  const generatePropertyReport = async () => {
    if (!selectedSiteFeatures.length) return;
    
    setIsGenerating(true);
    setStatus('generating');
    setProgress(0);
    setCurrentStep('screenshots');
    setCompletedSteps([]);
    setFailedScreenshots([]);
    setGenerationStartTime(Date.now());
    setGenerationLogs([]);
    logCounterRef.current = 0;
    setLogs([{ message: 'Starting report generation...', type: 'info' }]);
    
    clearServiceCache();
    
    try {
      // Fetch fresh sales data before generating report
      let currentSalesData = [];
      if (selectedSiteFeatures.length > 0 && selectedSiteFeatures[0].properties?.copiedFrom?.site_suitability__suburb) {
        const suburb = selectedSiteFeatures[0].properties.copiedFrom.site_suitability__suburb.toUpperCase();
        console.log('Attempting to fetch sales data for:', {
          suburb,
          rawSuburb: selectedSiteFeatures[0].properties.copiedFrom.site_suitability__suburb,
          fullProperties: selectedSiteFeatures[0].properties.copiedFrom
        });

        try {
          const response = await fetch('/nsw_property_sales.csv');
          const csvText = await response.text();
          
          await new Promise((resolve, reject) => {
            Papa.parse(csvText, {
              header: true,
              complete: (results) => {
                console.log('CSV parsing complete for report generation:', {
                  totalRows: results.data.length,
                  headers: results.meta.fields
                });

                // Filter for matching suburb and property_type
                currentSalesData = results.data
                  .filter(row => 
                    row.suburb?.toUpperCase() === suburb && 
                    row.price && row.bedrooms
                  )
                  .map(row => ({
                    price: parseFloat(row.price),
                    bedrooms: parseInt(row.bedrooms),
                    bathrooms: parseInt(row.bathrooms) || 0,
                    parking: parseInt(row.parking) || 0,
                    address: row.address || 'Address not provided',
                    property_type: row.property_type || 'Apartment',
                    sold_date: row.sold_date || 'Date not provided'
                  }))
                  .filter(item => 
                    !isNaN(item.price) && 
                    !isNaN(item.bedrooms) && 
                    item.price > 0
                  )
                  .sort((a, b) => new Date(b.sold_date) - new Date(a.sold_date));

                console.log('Processed sales data for report:', {
                  originalLength: results.data.length,
                  filteredLength: currentSalesData.length,
                  sample: currentSalesData.slice(0, 3),
                  suburb
                });

                resolve();
              },
              error: (error) => {
                console.error('CSV parsing error during report generation:', error);
                reject(error);
              }
            });
          });
        } catch (error) {
          console.error('Error fetching CSV during report generation:', error);
          currentSalesData = [];
        }
      }

      console.log('Final sales data check before report generation:', {
        hasData: currentSalesData.length > 0,
        length: currentSalesData.length,
        sample: currentSalesData.slice(0, 3),
        suburb: selectedSiteFeatures[0]?.properties.copiedFrom?.site_suitability__suburb
      });

      const screenshots = {};
      const failed = [];
      
      addLog('Starting report generation...', 'default');
      
      // Initialize pptx instance early to avoid reference errors
      const pptx = new PptxGenJS();
      
      // Set document properties
      pptx.title = getCombinedSiteName();
      pptx.subject = `Property Analysis for ${getPropertiesDescription()}`;
      pptx.author = "Property Analysis Tool";
  
      if (selectedSlides.cover) {
        addLog('Capturing cover screenshot...', 'image');
        try {
          // Use combinedGeometry if multiple features are selected, otherwise use primaryFeature
          let featureToCapture;
          if (selectedSiteFeatures.length > 1) {
            // For multiple features, create a FeatureCollection instead of flatmapping the coordinates
            // This prevents the line drawing between the features
            featureToCapture = {
              type: 'FeatureCollection',
              features: selectedSiteFeatures.map(feature => ({
                type: 'Feature',
                geometry: feature.geometry
              }))
            };
          } else {
            featureToCapture = primaryFeature;
          }
          
          // For cover slide, use COVER type and always show the boundary in red (drawBoundaryLine = true)
          // Pass showLabels: false to prevent adding A, B, etc. labels on the cover slide
          const coverScreenshot = await captureMapScreenshot(
            featureToCapture, 
            SCREENSHOT_TYPES.COVER, 
            true, 
            developableArea, 
            false, // Don't show developable area on cover
            useDevelopableAreaForBounds, 
            false, // Don't show feature labels on cover
            false  // Don't show developable area labels on cover
          );
          screenshots.coverScreenshot = coverScreenshot;
          addLog('Cover screenshot captured successfully', 'success');
        } catch (error) {
          console.error('Failed to capture cover screenshot:', error);
          failed.push('coverScreenshot');
          addLog('Failed to capture cover screenshot', 'error');
        }
      }
      
      if (selectedSlides.propertySnapshot) {
        addLog('Capturing aerial and snapshot images...', 'image');
        try {
          // For multiple features, create a FeatureCollection
          let featureToCapture;
          if (selectedSiteFeatures.length > 1) {
            featureToCapture = {
              type: 'FeatureCollection',
              features: selectedSiteFeatures.map(feature => ({
                type: 'Feature',
                geometry: feature.geometry
              }))
            };
          } else {
            featureToCapture = primaryFeature;
          }
          
          screenshots.aerialScreenshot = await captureMapScreenshot(
            featureToCapture, 
            SCREENSHOT_TYPES.AERIAL, 
            true, 
            developableArea, 
            showDevelopableArea, 
            useDevelopableAreaForBounds, 
            true, // Show feature labels
            true  // Show developable area labels
          );
          
          // For the snapshot screenshot, we want to show the developable area boundaries but not the labels
          // Pass an additional parameter to control developable area labels separately from feature labels
          screenshots.snapshotScreenshot = await captureMapScreenshot(
            featureToCapture, 
            SCREENSHOT_TYPES.SNAPSHOT, 
            true, 
            developableArea, 
            showDevelopableArea, 
            useDevelopableAreaForBounds, 
            true, 
            false // Don't show developable area labels
          );
          
          addLog('Aerial and snapshot images captured successfully', 'success');
        } catch (error) {
          console.error('Failed to capture snapshot screenshots:', error);
          failed.push('aerialScreenshot', 'snapshotScreenshot');
          addLog('Failed to capture aerial/snapshot images', 'error');
        }
      }
      
      if (selectedSlides.planning) {
        // Use featureToCapture for multiple features
        let featureToCapture;
        if (selectedSiteFeatures.length > 1) {
          featureToCapture = {
            type: 'FeatureCollection',
            features: selectedSiteFeatures.map(feature => ({
              type: 'Feature',
              geometry: feature.geometry
            }))
          };
        } else {
          featureToCapture = primaryFeature;
        }
        
        // Directly capture planning screenshots instead of using planningMapRef
        screenshots.zoningScreenshot = await captureZoningMap(
          featureToCapture, 
          developableArea, 
          showDevelopableArea, 
          useDevelopableAreaForBounds, 
          false, // Don't show feature labels
          false  // Don't show developable area labels
        );
        
        screenshots.fsrScreenshot = await captureFSRMap(
          featureToCapture, 
          developableArea, 
          showDevelopableArea, 
          useDevelopableAreaForBounds, 
          false, // Don't show feature labels
          false  // Don't show developable area labels
        );
        
        screenshots.hobScreenshot = await captureHOBMap(
          featureToCapture, 
          developableArea, 
          showDevelopableArea, 
          useDevelopableAreaForBounds, 
          false, // Don't show feature labels
          false  // Don't show developable area labels
        );
      }
      
      if (selectedSlides.primarySiteAttributes) {
        // Use featureToCapture for multiple features, similar to the property snapshot slide
        let featureToCapture;
        if (selectedSiteFeatures.length > 1) {
          // For multiple features, create a FeatureCollection
          featureToCapture = {
            type: 'FeatureCollection',
            features: selectedSiteFeatures.map(feature => ({
              type: 'Feature',
              geometry: feature.geometry
            }))
          };
        } else {
          featureToCapture = primaryFeature;
        }
        screenshots.compositeMapScreenshot = await capturePrimarySiteAttributesMap(featureToCapture, developableArea, showDevelopableArea, useDevelopableAreaForBounds, true);
      }
      
      if (selectedSlides.secondaryAttributes) {
        // Use featureToCapture for multiple features
        let featureToCapture;
        if (selectedSiteFeatures.length > 1) {
          featureToCapture = {
            type: 'FeatureCollection',
            features: selectedSiteFeatures.map(feature => ({
              type: 'Feature',
              geometry: feature.geometry
            }))
          };
        } else {
          featureToCapture = primaryFeature;
        }
        screenshots.contourScreenshot = await captureContourMap(featureToCapture, developableArea, showDevelopableArea, useDevelopableAreaForBounds, false, false);
        screenshots.regularityScreenshot = await captureRegularityMap(featureToCapture, developableArea, showDevelopableArea, useDevelopableAreaForBounds, false, false);
      }
      
      if (selectedSlides.planningTwo) {
        // Use featureToCapture for multiple features
        let featureToCapture;
        if (selectedSiteFeatures.length > 1) {
          featureToCapture = {
            type: 'FeatureCollection',
            features: selectedSiteFeatures.map(feature => ({
              type: 'Feature',
              geometry: feature.geometry
            }))
          };
        } else {
          featureToCapture = primaryFeature;
        }
        screenshots.heritageScreenshot = await captureHeritageMap(featureToCapture, developableArea, showDevelopableArea, useDevelopableAreaForBounds, true);
        screenshots.acidSulfateSoilsScreenshot = await captureAcidSulfateMap(featureToCapture, developableArea, showDevelopableArea, useDevelopableAreaForBounds, true);
      }
      
      if (selectedSlides.servicing) {
        // Use featureToCapture for multiple features
        let featureToCapture;
        if (selectedSiteFeatures.length > 1) {
          featureToCapture = {
            type: 'FeatureCollection',
            features: selectedSiteFeatures.map(feature => ({
              type: 'Feature',
              geometry: feature.geometry
            }))
          };
        } else {
          featureToCapture = primaryFeature;
        }
        const waterMains = await captureWaterMainsMap(featureToCapture, developableArea, showDevelopableArea, useDevelopableAreaForBounds, true);
        screenshots.waterMainsScreenshot = waterMains?.image;
        screenshots.waterFeatures = waterMains?.features || [];
        
        const sewer = await captureSewerMap(featureToCapture, developableArea, showDevelopableArea, useDevelopableAreaForBounds, true);
        screenshots.sewerScreenshot = sewer?.image;
        screenshots.sewerFeatures = sewer?.features || [];
        
        const power = await capturePowerMap(featureToCapture, developableArea, showDevelopableArea, useDevelopableAreaForBounds, true);
        console.log('Power screenshot data received:', {
          hasImage: Boolean(power?.image),
          hasFeatures: Boolean(power?.features),
          featuresLength: power?.features?.length || 0,
          featuresType: power?.features ? typeof power.features : 'N/A'
        });
        screenshots.powerScreenshot = power?.image;
        screenshots.powerFeatures = power?.features || [];
      }
      
      if (selectedSlides.utilisation) {
        // Use featureToCapture for multiple features
        let featureToCapture;
        if (selectedSiteFeatures.length > 1) {
          featureToCapture = {
            type: 'FeatureCollection',
            features: selectedSiteFeatures.map(feature => ({
              type: 'Feature',
              geometry: feature.geometry
            }))
          };
        } else {
          featureToCapture = primaryFeature;
        }
        const geoscape = await captureGeoscapeMap(featureToCapture, developableArea, showDevelopableArea, useDevelopableAreaForBounds, true);
        screenshots.geoscapeScreenshot = geoscape?.image;
        screenshots.geoscapeFeatures = geoscape?.features;
      }
      
      if (selectedSlides.access) {
        // Use featureToCapture for multiple features
        let featureToCapture;
        if (selectedSiteFeatures.length > 1) {
          featureToCapture = {
            type: 'FeatureCollection',
            features: selectedSiteFeatures.map(feature => ({
              type: 'Feature',
              geometry: feature.geometry
            }))
          };
        } else {
          featureToCapture = primaryFeature;
        }
        
        // Run all map operations in parallel instead of sequentially
        addLog('Generating access maps in parallel...', 'info');
        const [roadsResult, udpPrecinctsResult, ptalScreenshot] = await Promise.all([
          captureRoadsMap(featureToCapture, developableArea, showDevelopableArea, useDevelopableAreaForBounds, true, showDevelopableArea),
          captureUDPPrecinctMap(featureToCapture, developableArea, showDevelopableArea, useDevelopableAreaForBounds, true, showDevelopableArea),
          capturePTALMap(featureToCapture, developableArea, showDevelopableArea, useDevelopableAreaForBounds, true, showDevelopableArea)
        ]);

        // Create propertyData if not already created
        const propertyData = {};

        // Ensure we have valid image data
        const roadsImageData = roadsResult?.dataURL || roadsResult;

        // Store the results
        screenshots.roadsScreenshot = roadsImageData;
        screenshots.roadFeatures = roadsResult?.roadFeatures;

        // Log the road features to verify they're being captured correctly
        console.log('Road features captured:', screenshots.roadFeatures);

        // Ensure the road features are also stored in propertyData for scoring
        propertyData.roadFeatures = screenshots.roadFeatures;

        // Store UDP precinct data - handle both old string format and new object format
        if (typeof udpPrecinctsResult === 'string') {
          screenshots.udpPrecinctsScreenshot = udpPrecinctsResult;
        } else {
          // Store just the dataURL in the screenshot field for PowerPoint
          screenshots.udpPrecinctsScreenshot = udpPrecinctsResult?.dataURL || null;
          // Store features data in propertyData for scoring
          propertyData.udpFeatures = udpPrecinctsResult?.udpFeatures || null;
        }

        // Handle PTAL data similarly to UDP data
        if (typeof ptalScreenshot === 'string') {
          screenshots.ptalScreenshot = ptalScreenshot;
        } else {
          // Store just the dataURL in the screenshot field for PowerPoint
          screenshots.ptalScreenshot = ptalScreenshot?.dataURL || null;
          
          // Extract and store PTAL values from feature if they exist
          if (featureToCapture.properties?.ptalValues) {
            console.log('Found PTAL values in feature:', featureToCapture.properties.ptalValues);
            propertyData.ptalValues = featureToCapture.properties.ptalValues;
          } else if (featureToCapture.type === 'FeatureCollection' && featureToCapture.features?.length > 0) {
            // For FeatureCollection, check each feature's properties for PTAL values
            const allPtalValues = [];
            featureToCapture.features.forEach(f => {
              if (f.properties?.ptalValues && Array.isArray(f.properties.ptalValues)) {
                f.properties.ptalValues.forEach(val => {
                  if (!allPtalValues.includes(val)) {
                    allPtalValues.push(val);
                  }
                });
              }
            });
            
            if (allPtalValues.length > 0) {
              console.log('Collected PTAL values from multiple features:', allPtalValues);
              propertyData.ptalValues = allPtalValues;
            }
          }
          
          // Extract and store feature-specific PTAL data if it exists
          if (featureToCapture.properties?.featurePTALs) {
            console.log('Found feature-specific PTAL data:', featureToCapture.properties.featurePTALs);
            propertyData.featurePTALs = featureToCapture.properties.featurePTALs;
          } else if (featureToCapture.type === 'FeatureCollection') {
            // For feature collections, combine all feature-specific PTAL data
            const combinedFeaturePTALs = [];
            featureToCapture.features.forEach((f, index) => {
              if (f.properties?.featurePTALs) {
                combinedFeaturePTALs.push({
                  featureIndex: index,
                  ptalValues: f.properties.featurePTALs
                });
              }
            });
            
            if (combinedFeaturePTALs.length > 0) {
              console.log('Combined feature-specific PTAL data from multiple features:', combinedFeaturePTALs);
              propertyData.featurePTALs = combinedFeaturePTALs;
            }
          }
        }
        
        // Add more detailed property data to help with slide generation
        if (selectedSiteFeatures.length > 0) {
          const primaryFeatureProp = selectedSiteFeatures[0]?.properties || {};
          
          propertyData.isMultipleProperties = selectedSiteFeatures.length > 1;
          propertyData.site__address = primaryFeatureProp.address || primaryFeatureProp.properties?.address;
          propertyData.site__geometry = selectedSiteFeatures[0]?.geometry?.coordinates || null;
          
          if (selectedSiteFeatures.length > 1) {
            propertyData.site__multiple_addresses = selectedSiteFeatures.map(f => f.properties?.address || null).filter(Boolean);
            propertyData.allProperties = selectedSiteFeatures;
          }
          
          // If feature has any developable area, format it for slides
          if (developableArea && developableArea.features) {
            propertyData.developableArea = developableArea.features;
          }
          
          // Include captured FeatureToUse object which might have PTAL data
          propertyData.combinedGeometry = featureToCapture;
        }
        
        // Make sure access slide has all the data it needs for proper scoring
        if (selectedSlides.access) {
          try {
            addLog('Creating access slide...', 'info');
            await addAccessSlide(pptx, propertyData);
          } catch (error) {
            addLog(`Error creating access slide: ${error.message}`, 'error');
            console.error('Error creating access slide:', error);
          }
        }
      }
      
      if (selectedSlides.hazards) {
        // Use featureToCapture for multiple features
        let featureToCapture;
        if (selectedSiteFeatures.length > 1) {
          featureToCapture = {
            type: 'FeatureCollection',
            features: selectedSiteFeatures.map(feature => ({
              type: 'Feature',
              geometry: feature.geometry
            }))
          };
        } else {
          featureToCapture = primaryFeature;
        }
        const floodResult = await captureFloodMap(featureToCapture, developableArea, showDevelopableArea, useDevelopableAreaForBounds, true);
        const bushfireResult = await captureBushfireMap(featureToCapture, developableArea, showDevelopableArea, useDevelopableAreaForBounds, true);
        
        // Store both images and feature data
        screenshots.floodMapScreenshot = floodResult?.dataURL;
        screenshots.site_suitability__floodFeatures = floodResult?.properties?.site_suitability__floodFeatures;
        
        screenshots.bushfireMapScreenshot = bushfireResult?.dataURL;
        screenshots.site_suitability__bushfireFeatures = bushfireResult?.properties?.site_suitability__bushfireFeatures;
      }
      
      if (selectedSlides.environmental) {
        // Use featureToCapture for multiple features
        let featureToCapture;
        if (selectedSiteFeatures.length > 1) {
          featureToCapture = {
            type: 'FeatureCollection',
            features: selectedSiteFeatures.map(feature => ({
              type: 'Feature',
              geometry: feature.geometry
            }))
          };
        } else {
          featureToCapture = primaryFeature;
        }
        const tecMapResult = await captureTECMap(featureToCapture, developableArea, showDevelopableArea, useDevelopableAreaForBounds, false, false);
        screenshots.tecMapScreenshot = tecMapResult?.dataURL;
        
        // Store the TEC features for scoring
        if (tecMapResult?.tecFeatures) {
          screenshots.site_suitability__tecFeatures = tecMapResult.tecFeatures;
          console.log('Stored TEC features from map capture:', tecMapResult.tecFeatures);
        }
        
        const biodiversityMapResult = await captureBiodiversityMap(featureToCapture, developableArea, showDevelopableArea, useDevelopableAreaForBounds, false, false);
        screenshots.biodiversityMapScreenshot = biodiversityMapResult?.dataURL;
        
        // Store the biodiversity features for scoring
        if (biodiversityMapResult?.biodiversityFeatures) {
          screenshots.site_suitability__biodiversityFeatures = biodiversityMapResult.biodiversityFeatures;
          console.log('Stored biodiversity features from map capture:', biodiversityMapResult.biodiversityFeatures);
        }
      }
      
      if (selectedSlides.contamination) {
        // Use featureToCapture for multiple features
        let featureToCapture;
        if (selectedSiteFeatures.length > 1) {
          featureToCapture = {
            type: 'FeatureCollection',
            features: selectedSiteFeatures.map(feature => ({
              type: 'Feature',
              geometry: feature.geometry
            }))
          };
        } else {
          featureToCapture = primaryFeature;
        }
        const contaminationResult = await captureContaminationMap(featureToCapture, developableArea, showDevelopableArea, useDevelopableAreaForBounds, true);
        screenshots.contaminationMapScreenshot = contaminationResult?.image;
        screenshots.contaminationFeatures = contaminationResult?.features;
        
        screenshots.historicalImagery = await captureHistoricalImagery(featureToCapture, developableArea, showDevelopableArea, useDevelopableAreaForBounds, false);
      }

      setFailedScreenshots(failed);
      if (failed.length > 0) {
        addLog(`${failed.length} screenshots failed to capture`, 'warning');
      }

      setCompletedSteps(prev => [...prev, 'screenshots']);
      setCurrentStep('cover');

      const reportDate = new Date().toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Prepare data for all selected properties
      const propertiesData = selectedSiteFeatures.map(feature => {
        const props = feature.properties?.copiedFrom || {};
        return {
          ...feature.properties,
          copiedFrom: props,
          address: props.site__address || 'Unknown Address',
          suburb: props.site_suitability__suburb || 'Unknown Suburb',
          lga: props.site_suitability__LGA || 'Unknown LGA',
          lot: props.site__related_lot_references?.split('/')[0] || 'Unknown',
          dp: props.site__related_lot_references?.split('/')[2] || 'Unknown',
          zoning: props.site_suitability__landzone || 'Unknown',
          area: props.site_suitability__area || 'Unknown',
        };
      });

      // Prepare data for report generation
      const propertyData = {
        ...primaryFeature.properties,
        copiedFrom: primaryFeature.properties.copiedFrom,
        
        // Include isMultipleProperties flag and multiple addresses if needed
        isMultipleProperties: selectedSiteFeatures.length > 1,
        site__multiple_addresses: selectedSiteFeatures.length > 1 ? 
          selectedSiteFeatures
            .map(feature => feature.properties?.copiedFrom?.site__address || 'Unnamed Location')
            .filter(address => address && address.trim() !== '')
          : undefined,
        
        // Include all properties' details for multi-property table
        allProperties: selectedSiteFeatures.length > 1 ? 
          selectedSiteFeatures.map(feature => ({
            // Include both properties from the feature and its copiedFrom
            ...feature.properties,
            copiedFrom: feature.properties?.copiedFrom || {}
          }))
          : undefined,
        
        reportDate,
        selectedSlides,

        // Data from Land iQ

        site_suitability__principal_zone_identifier: primaryFeature.properties.copiedFrom?.site_suitability__principal_zone_identifier,
        site_suitability__area: primaryFeature.properties.copiedFrom?.site_suitability__area,
        site_suitability__site_width: primaryFeature.properties.copiedFrom?.site_suitability__site_width,
        site__related_lot_references: primaryFeature.properties.copiedFrom?.site__related_lot_references,
        site_suitability__public_transport_access_level_AM: primaryFeature.properties.copiedFrom?.site_suitability__public_transport_access_level_AM,
        site_suitability__current_government_land_use: primaryFeature.properties.copiedFrom?.site_suitability__current_government_land_use,
        site_suitability__floorspace_ratio: primaryFeature.properties.copiedFrom?.site_suitability__floorspace_ratio,  
        site_suitability__height_of_building: primaryFeature.properties.copiedFrom?.site_suitability__height_of_building,
        site_suitability__heritage_significance: primaryFeature.properties.copiedFrom?.site_suitability__heritage_significance,
        site_suitability__NSW_government_agency: primaryFeature.properties.copiedFrom?.site_suitability__NSW_government_agency,
        site_suitability__landzone: primaryFeature.properties.copiedFrom?.site_suitability__landzone,
        site__address: primaryFeature.properties.copiedFrom?.site__address || 'Unnamed Location',
        site__property_id: primaryFeature.properties.copiedFrom?.site__property_id,
        site_suitability__property_value: primaryFeature.properties.copiedFrom?.site_suitability__property_value,
        site_suitability__LGA: primaryFeature.properties.copiedFrom?.site_suitability__LGA,
        site_suitability__electorate: primaryFeature.properties.copiedFrom?.site_suitability__electorate,
        site_suitability__suburb: primaryFeature.properties.copiedFrom?.site_suitability__suburb?.toUpperCase(),

        site__geometry: primaryFeature.geometry.type === 'Polygon' ? 
                        primaryFeature.geometry.coordinates[0] : 
                        primaryFeature.geometry.coordinates,

        developableArea: developableArea?.features || null,
        showDevelopableArea,
        scores: {}, // Initialize empty scores object that will be populated by each slide
        screenshot: screenshots.coverScreenshot,
        feasibilitySettings,
        salesData: currentSalesData,
        allProperties: propertiesData,
        combinedArea, // Add the combined area calculation
        combinedGeometry, // Add the combined geometry
        ...screenshots,
        site_suitability__floodFeatures: screenshots.site_suitability__floodFeatures || primaryFeature.properties?.site_suitability__floodFeatures,
        site_suitability__bushfireFeatures: screenshots.site_suitability__bushfireFeatures || primaryFeature.properties?.site_suitability__bushfireFeatures,
        site_suitability__tecFeatures: screenshots.site_suitability__tecFeatures || primaryFeature.properties?.site_suitability__tecFeatures,
        site_suitability__biodiversityFeatures: screenshots.site_suitability__biodiversityFeatures || primaryFeature.properties?.site_suitability__biodiversityFeatures,
        // Include any features stored during screenshot capture
        ...Object.fromEntries(
          Object.entries(primaryFeature.properties || {})
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
          ...(selectedSlides.propertySnapshot ? ['propertySnapshot'] : []),
          ...(selectedSlides.primarySiteAttributes ? ['primarySiteAttributes'] : []),
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
          ...(selectedSlides.permissibility ? ['permissibility'] : []),
          ...(selectedSlides.development ? ['development'] : []),
          ...(selectedSlides.feasibility ? ['feasibility'] : [])
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
      await recordReportGeneration(generationTime, selectedSlides, primaryFeature.properties.copiedFrom);
      
      setCompletedSteps(prev => [...prev, 'finalising']);
      setStatus('success');
      triggerConfetti();
      sendDesktopNotification('Report Generation Complete', 'Your report has been generated successfully!');
      sendEmailNotification(pptx.title, 'success');
    } catch (error) {
      console.error('Error generating report:', error);
      setStatus('error');
      addLog(`Error generating report: ${error.message}`, 'error');
      sendDesktopNotification('Report Generation Failed', 'An error occurred while generating your report.');
      sendEmailNotification(pptx.title, 'error');
    } finally {
      setIsGenerating(false);
      setCurrentStep(null);
      setGenerationStartTime(null);
    }
  };

  const handleScreenshotCapture = async () => {
    if (selectedFeatures.length > 0) {
      // Clear the service cache before capturing preview screenshots
      clearServiceCache();
      
      // Use combinedGeometry if multiple features are selected, otherwise use the first feature
      let featureToCapture;
      if (selectedFeatures.length > 1) {
        // For multiple features, create a FeatureCollection instead of flatmapping the coordinates
        // This prevents the line drawing between the features
        featureToCapture = {
          type: 'FeatureCollection',
          features: selectedFeatures.map(feature => ({
            type: 'Feature',
            geometry: feature.geometry
          }))
        };
      } else {
        featureToCapture = selectedFeatures[0];
      }
      
      // For cover slide, use COVER type and always show the boundary in red (drawBoundaryLine = true)
      // Pass showLabels: false to prevent adding A, B, etc. labels on the cover slide
      const coverScreenshot = await captureMapScreenshot(
        featureToCapture, 
        SCREENSHOT_TYPES.COVER, 
        true, 
        developableArea, 
        false, // Don't show developable area on cover
        useDevelopableAreaForBounds, 
        false, // Don't show feature labels on cover
        false  // Don't show developable area labels on cover
      );
      // For other slides, keep boundary and use AERIAL type with labels
      const snapshotScreenshot = await captureMapScreenshot(
        featureToCapture, 
        SCREENSHOT_TYPES.AERIAL, 
        true, 
        developableArea, 
        showDevelopableArea, 
        useDevelopableAreaForBounds, 
        true, // Show feature labels
        true  // Show developable area labels
      );
      
      // Capture GPR map for context slide
      const gprResult = await captureGPRMap(
        featureToCapture, 
        developableArea, 
        showDevelopableArea, 
        useDevelopableAreaForBounds,
        true, // Show feature labels
        showDevelopableArea // Match showDevelopableArea for labels
      );
      
      setPreviewScreenshot(coverScreenshot);
      setScreenshots({
        coverScreenshot,
        snapshotScreenshot,
        GPRScreenshot: gprResult?.image,
        gprFeatures: gprResult?.features
      });
    }
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

  const handleFeasibilitySettingChange = (setting, value, density) => {
    setFeasibilitySettings(prev => ({
      ...prev,
      [density]: {
        ...prev[density],
        [setting]: value
      }
    }));
  };

  // Generate a descriptive name for the combined site
  const getCombinedSiteName = () => {
    if (!selectedSiteFeatures.length) return 'No Site Selected';
    if (selectedSiteFeatures.length === 1) {
      return primaryFeature.properties?.copiedFrom?.site__address || 'Selected Site';
    }
    
    // If multiple features, create a combined name
    const firstFeatureAddress = primaryFeature.properties?.copiedFrom?.site__address || '';
    const suburb = primaryFeature.properties?.copiedFrom?.site_suitability__suburb || '';
    return `Combined Site (${selectedSiteFeatures.length} properties) - ${suburb}`;
  };
  
  // Get a descriptor of all selected properties for the report
  const getPropertiesDescription = () => {
    if (!selectedSiteFeatures.length) return 'No properties selected';
    if (selectedSiteFeatures.length === 1) return primaryFeature.properties?.copiedFrom?.site__address || 'Single property';
    
    // List all addresses with numbers
    return selectedSiteFeatures.map((feature, index) => 
      `${index + 1}. ${feature.properties?.copiedFrom?.site__address || 'Unnamed property'}`
    ).join('\n');
  };

  return (
    <div className="relative w-full flex flex-col px-4 py-6">
      <div className="grid grid-cols-5 gap-4 mb-6 relative">
        <button
          className="px-4 py-2.5 rounded-xl text-gray-900 font-medium bg-white border-2 border-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowHowTo(prev => !prev);
          }}
        >
          <HelpCircle className="w-5 h-5 text-blue-600" />
          How to use
        </button>
        
        <button
          className="px-4 py-2.5 rounded-xl text-gray-900 font-medium bg-white border-2 border-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowLeaderboard(prev => !prev);
          }}
        >
          <Trophy className="w-5 h-5 text-yellow-500" />
          Leaderboard
        </button>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowIssuesList(prev => !prev);
          }}
          className="px-4 py-2.5 rounded-xl text-gray-900 font-medium bg-white border-2 border-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
        >
          <AlertCircle className="w-5 h-5 text-blue-600" />
          View Issues
        </button>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsIssueModalOpen(prev => !prev);
          }}
          className="px-4 py-2.5 rounded-xl text-gray-900 font-medium bg-white border-2 border-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
        >
          <AlertCircle className="w-5 h-5 text-red-600" />
          Log Issue
        </button>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowChat(prev => !prev);
          }}
          className="px-4 py-2.5 rounded-xl text-gray-900 font-medium bg-white border-2 border-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
        >
          <MessageSquare className="w-5 h-5 text-blue-600" />
          Chat
        </button>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Desktop Due Diligence PowerPoint Report Generator</h2>
          <div className="flex items-center">
            <button
              onClick={() => setShowTriageUI(true)}
              className="bg-transparent border-none cursor-pointer relative p-2 rounded-full flex items-center justify-center mr-2"
              aria-label="Property Triage"
              title="Property Triage"
            >
              <ClipboardCheck size={20} className="text-gray-800" />
            </button>
            <NotificationCenter userEmail={userInfo?.email} />
          </div>
        </div>
        <div className="h-1 bg-[#da2244] mt-2 rounded-full"></div>
        
        {/* Animated scrolling news ticker - hidden but kept for later reuse */}
        {showNewsTicker && (
          <div className="mt-2 py-2 bg-blue-50 rounded-md overflow-hidden border border-blue-200">
            <div className="news-ticker-container overflow-hidden">
              <div className="news-ticker-content flex items-center whitespace-nowrap text-blue-800 font-medium px-4">
                <span className="inline-flex items-center bg-blue-600 text-white px-2 py-0.5 rounded-md text-xs mr-3">
                  NEW
                </span>
                21 March 2025 Update: Automated developable area generator added to the app functionality.
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Property selection and Developable Area panels - changed to 2-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <PropertyListSelector 
          onSelect={handleSiteSelection}
          selectedFeatures={selectedSiteFeatures}
        />
        <div className="relative">
          <DevelopableAreaSelector 
            onLayerSelect={handleDevelopableAreaSelect} 
            selectedFeature={primaryFeature}
            selectedFeatures={selectedSiteFeatures}
            showDevelopableArea={showDevelopableArea}
            setShowDevelopableArea={setShowDevelopableArea}
            useDevelopableAreaForBounds={useDevelopableAreaForBounds}
            setUseDevelopableAreaForBounds={setUseDevelopableAreaForBounds}
          />
          <button 
            onClick={() => setShowDevelopableAreaOptions(true)}
            className="absolute top-4 right-16 p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full shadow-sm transition-colors duration-200 flex items-center justify-center"
            title="Developable Area Options"
          >
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow mb-4">
        <SlidePreview 
          selectedFeature={primaryFeature}
          selectedFeatures={selectedSiteFeatures}
          screenshot={previewScreenshot}
        />

        <div className="flex items-center justify-between mt-4 mb-2 pb-2 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => {
                e.preventDefault();
                const newValue = !Object.values(selectedSlides).every(Boolean);
                const updatedSlides = {};
                Object.keys(selectedSlides).forEach(key => {
                  updatedSlides[key] = newValue;
                });
                setSelectedSlides(updatedSlides);
              }}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium
                transition-all duration-300 transform hover:scale-105
                ${Object.values(selectedSlides).every(Boolean) 
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' 
                  : 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50'
                }
              `}
            >
              {Object.values(selectedSlides).every(Boolean) ? (
                <>
                  <LayersIcon className="w-5 h-5 animate-pulse" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <LayersIcon className="w-5 h-5" />
                  <span>Select All Slides</span>
                </>
              )}
            </button>
          </div>
        </div>

        {isGenerating && (
          <Timer 
            isRunning={isGenerating} 
            onComplete={handleTimerComplete}
          />
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {slideOptions.map((option) => {
              const isCompleted = completedSteps.includes(option.id);
              const isActive = currentStep === option.id;
              const Icon = option.icon;
              const isDisabled = option.id === 'feasibility' && !selectedSlides.development;

              return (
                <div
                  key={option.id}
                  className={`
                    relative p-3 rounded-xl border transition-all transform
                    ${isActive ? 'slide-card-active border-gray-500 shadow-lg' : 'border-gray-200'}
                    ${isDisabled ? 'opacity-50 cursor-not-allowed group' : 'hover:shadow-md hover:scale-105 hover:border-gray-400 cursor-pointer'}
                    ${selectedSlides[option.id] ? 'bg-gray-100 selected-card' : 'bg-white hover:bg-gray-50'}
                  `}
                  onClick={() => {
                    if (!isGenerating && !isDisabled) {
                      if (option.id === 'feasibility') {
                        // When selecting feasibility, ensure development is also selected
                        setSelectedSlides(prev => ({
                          ...prev,
                          development: true,
                          feasibility: !prev.feasibility
                        }));
                      } else if (option.id === 'development' && selectedSlides.feasibility) {
                        // If development is being deselected and feasibility is selected,
                        // also deselect feasibility
                        setSelectedSlides(prev => ({
                          ...prev,
                          development: false,
                          feasibility: false
                        }));
                      } else {
                        setSelectedSlides(prev => ({
                          ...prev,
                          [option.id]: !prev[option.id]
                        }));
                      }
                    }
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className={`
                      slide-icon p-2.5 rounded-xl transition-all duration-300
                      ${isCompleted ? 'bg-green-100' : selectedSlides[option.id] ? 'bg-gray-200' : 'bg-gray-100'}
                      ${selectedSlides[option.id] ? 'scale-110' : ''}
                    `}>
                      {option.id === 'feasibility' ? (
                        <div className="flex items-center space-x-2">
                          <Calculator 
                            className={`w-6 h-6 ${isCompleted ? 'text-green-600' : selectedSlides[option.id] ? 'text-gray-900' : 'text-gray-600'}`} 
                            strokeWidth={1.5} 
                          />
                          <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-800 rounded-lg">Beta</span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowFeasibilitySettings(true);
                            }}
                            className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <Settings2 className="w-3 h-3" />
                            <span>Settings</span>
                          </button>
                        </div>
                      ) : (
                        <Icon 
                          className={`w-6 h-6 ${isCompleted ? 'text-green-600' : selectedSlides[option.id] ? 'text-gray-900' : 'text-gray-600'}`} 
                          strokeWidth={1.5} 
                        />
                      )}
                    </div>
                    <div className="checkbox-wrapper">
                      <input
                        type="checkbox"
                        id={option.id}
                        checked={selectedSlides[option.id]}
                        onChange={(e) => e.stopPropagation()}
                        disabled={isGenerating}
                        className={`w-4 h-4 rounded border-gray-300 focus:ring-gray-500 checkbox-animated ${selectedSlides[option.id] ? 'checkbox-checked' : ''}`}
                      />
                    </div>
                  </div>
                  
                  <h3 className={`font-medium text-sm ${selectedSlides[option.id] ? 'text-gray-900' : 'text-gray-700'}`}>{option.label}</h3>
                  
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
                        <div className="flex items-center space-x-1.5 text-xs text-gray-500">
                          <div className="w-2.5 h-2.5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                          <span className="truncate">{getStepDescription(option.id)}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">Pending</div>
                      )}
                    </div>
                  )}

                  {isDisabled && (
                    <div className="absolute invisible group-hover:visible bg-gray-900 text-white text-xs rounded py-1 px-2 -top-12 left-1/2 transform -translate-x-1/2 w-64 text-center after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-gray-900">
                      In order to generate feasibility slide, please select the development slide as the feasibility slide requires data to be passed from the development slide.
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

          <div className="mt-6">
            <button
              onClick={generatePropertyReport}
              disabled={isGenerating || !selectedFeatures.length || Object.values(selectedSlides).every(v => !v)}
              className={`
                w-full px-4 py-3 rounded-lg font-medium
                ${isGenerating || !selectedFeatures.length || Object.values(selectedSlides).every(v => !v)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'}
                flex items-center justify-center gap-2 transition-colors
              `}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <FileStack className="w-7 h-7" />
                  Generate Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Portal Container */}
      <div className="relative z-[9999]">
        <Leaderboard 
          isOpen={showLeaderboard} 
          onClose={() => setShowLeaderboard(false)} 
        />

        <IssueModal 
          isOpen={isIssueModalOpen} 
          onClose={() => setIsIssueModalOpen(false)} 
        />

        <IssuesList 
          isOpen={showIssuesList} 
          onClose={() => setShowIssuesList(false)} 
        />

        <FeasibilityManager
          settings={feasibilitySettings}
          onSettingChange={handleFeasibilitySettingChange}
          salesData={salesData}
          open={showFeasibilitySettings}
          onClose={() => setShowFeasibilitySettings(false)}
          selectedFeature={primaryFeature ? {
            ...primaryFeature,
            properties: {
              ...primaryFeature.properties,
              copiedFrom: primaryFeature.properties.copiedFrom,
              site__address: primaryFeature.properties.copiedFrom?.site__address,
              site_suitability__LGA: primaryFeature.properties.copiedFrom?.site_suitability__LGA,
              site_suitability__suburb: primaryFeature.properties.copiedFrom?.site_suitability__suburb
            }
          } : null}
          developableArea={developableArea}  // Pass the complete developableArea object for maximum flexibility
        />

        <Chat
          isOpen={showChat}
          onClose={() => setShowChat(false)}
        />

        {/* Developable Area Options Modal */}
        {showDevelopableAreaOptions && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center">
                  <Settings2 className="w-6 h-6 mr-2 text-blue-600" />
                  <h2 className="text-xl font-semibold">Developable Area Options</h2>
                </div>
                <button
                  onClick={() => setShowDevelopableAreaOptions(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <DevelopableAreaOptions
                  selectedLayers={developableArea ? [1] : []}
                  showDevelopableArea={showDevelopableArea}
                  setShowDevelopableArea={setShowDevelopableArea}
                  useDevelopableAreaForBounds={useDevelopableAreaForBounds}
                  setUseDevelopableAreaForBounds={setUseDevelopableAreaForBounds}
                  developableArea={developableArea}
                />
              </div>

              <div className="border-t p-4 flex justify-end">
                <button
                  onClick={() => setShowDevelopableAreaOptions(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* How To Use Modal */}
        {showHowTo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center">
                  <HelpCircle className="w-6 h-6 mr-2" />
                  <h2 className="text-xl font-semibold">How to Use the Report Generator</h2>
                </div>
                <button
                  onClick={() => setShowHowTo(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="space-y-6">
                  {/* How to Use steps */}
                  <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
                    <p className="text-gray-700 mb-2">Welcome to the Property Report Generator! Follow these simple steps to generate comprehensive property reports.</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex">
                      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold mr-3">1</div>
                      <div>
                        <h3 className="font-semibold mb-1">Select Properties</h3>
                        <p className="text-gray-700">Use the Property List Selector panel to choose one or more properties you want to analyze.</p>
                      </div>
                    </div>
                    
                    <div className="flex">
                      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold mr-3">2</div>
                      <div>
                        <h3 className="font-semibold mb-1">Define Developable Areas (Optional)</h3>
                        <p className="text-gray-700">If needed, use the Developable Area Selector to define specific areas within the properties for development analysis.</p>
                      </div>
                    </div>
                    
                    <div className="flex">
                      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold mr-3">3</div>
                      <div>
                        <h3 className="font-semibold mb-1">Select Slides</h3>
                        <p className="text-gray-700">Choose which slides you want to include in your report by checking/unchecking the respective options. You can select all slides or just those you need.</p>
                      </div>
                    </div>
                    
                    <div className="flex">
                      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold mr-3">4</div>
                      <div>
                        <h3 className="font-semibold mb-1">Configure Feasibility Settings (Optional)</h3>
                        <p className="text-gray-700">If you've selected the Feasibility slide, click the settings icon to customize feasibility parameters for different density scenarios.</p>
                      </div>
                    </div>
                    
                    <div className="flex">
                      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold mr-3">5</div>
                      <div>
                        <h3 className="font-semibold mb-1">Generate Report</h3>
                        <p className="text-gray-700">Click the "Generate Report" button and wait for the report to be created. You'll see progress for each slide in real-time.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400 mt-4">
                    <h3 className="font-semibold mb-1">Additional Features:</h3>
                    <ul className="list-disc ml-5 space-y-1 mt-2">
                      <li>Use the <strong>Leaderboard</strong> to see report generation statistics</li>
                      <li>Report <strong>Issues</strong> if you encounter any problems</li>
                      <li>Use the <strong>Chat</strong> feature for assistance</li>
                      <li>Check <strong>Notifications</strong> for updates on your reports</li>
                    </ul>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500 flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-gray-700">Once your report is generated, it will automatically download as a PowerPoint file. You can then view, edit, and share it as needed.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
      {/* Triage UI */}
      {showTriageUI && (
        <div className="fixed inset-0 bg-white z-50">
          <div className="w-full h-full overflow-hidden flex flex-col">
            <div className="p-4 flex-grow overflow-auto">
              <PropertyTriage 
                onClose={() => setShowTriageUI(false)} 
                properties={allProperties}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportGenerator;
