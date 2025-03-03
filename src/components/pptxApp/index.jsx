import React from 'react';
import MapView from './MapView';
import AmenityChart from './AmenityChart';
import ImageryMap from './ImageryMap';
import GrowthProjections from './GrowthProjections';
import PropertyOverview from './PropertyOverview';
import Planning from './Planning';
import Sales from './Sales';
import Development from './Development';
import Topography from './Topography';
import Climate from './Climate';
import AreaOverview from './AreaOverview';
import LayerDrawing from './LayerDrawing';
import ReportGenerator from './ReportGenerator';
import IssueModal from './IssueModal';
import { AlertCircle } from 'lucide-react';
import { setNewWidthInPixels } from '../../lib/sidebarWidth';

const MapScreenshotApp = () => {
  const [selectedFeature, setSelectedFeature] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState('overview');
  const [sidebarWidth, setSidebarWidth] = React.useState(1000);  // Default width 1000px
  const [isIssueModalOpen, setIsIssueModalOpen] = React.useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = React.useState(false);

  React.useEffect(() => {
    setNewWidthInPixels(sidebarWidth);
  }, [sidebarWidth]);

  const handleWidthChange = (newWidth) => {
    const width = Math.max(400, Math.min(newWidth, 1200));
    setSidebarWidth(width);
  };

  const handleInputChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      handleWidthChange(value);
    }
  };

  const adjustWidth = (amount) => {
    handleWidthChange(sidebarWidth + amount);
  };

  const handleFeatureSelect = (feature) => {
    const transformedFeature = {
      properties: {
        copiedFrom: {
          ...feature.properties?.copiedFrom
        }
      },
      geometry: feature.geometry
    };
    setSelectedFeature(transformedFeature);
  };
  
  // Handler for when report generation starts or ends
  const handleReportGenerationStateChange = (isGenerating) => {
    setIsGeneratingReport(isGenerating);
  };

  // Determine if map layers should be loaded
  // Only load them when on the report tab or when actively generating a report
  const shouldLoadLayers = activeTab === 'report' || isGeneratingReport;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'planning', label: 'Planning' },
    { id: 'development', label: 'Development' },
    { id: 'imagery', label: 'Imagery' },
    { id: 'amenity', label: 'Amenity' },
    { id: 'growth', label: 'Growth Projections' },
    { id: 'sales', label: 'Sales' },
    { id: 'topography', label: 'Topography' },
    { id: 'climate', label: 'Climate' },
    { id: 'scenario', label: 'Area Overview' },
    { id: 'report', label: 'Report Generator' }
  ];

  return (
    <div className="flex h-screen bg-white">
      {/* Left Side Navigation */}
      <div className="w-48 border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
        <div className="p-4">
          <h1 className="text-xl font-bold mb-4 text-gray-900 break-words">
            Desktop Due Diligence PowerPoint Report Generator
          </h1>
          <div className="flex space-x-2 mb-4">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
            >
              How to use
            </button>
            <button
              className="px-4 py-2 bg-amber-600 text-white rounded-md text-sm hover:bg-amber-700"
            >
              Leaderboard
            </button>
            <button
              onClick={() => setIsIssueModalOpen(true)}
              className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-md flex items-center justify-center text-sm"
            >
              <AlertCircle className="w-4 h-4 mr-1" />
              Log Issue
            </button>
          </div>
          <h2 className="text-lg font-semibold mb-2">
            {selectedFeature 
              ? selectedFeature.properties.copiedFrom.site__address 
              : 'Select a Property'}
          </h2>
        </div>
        <nav className="flex flex-col flex-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                text-left py-2 px-4 border-l-4 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Width Controls */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between space-x-2">
            <button
              onClick={() => adjustWidth(-50)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded"
              title="Decrease width by 50px"
            >
              ←
            </button>
            <input
              type="number"
              value={sidebarWidth}
              onChange={handleInputChange}
              className="w-20 px-2 py-1 text-center border rounded"
              min="400"
              max="1200"
              step="50"
            />
            <button
              onClick={() => adjustWidth(50)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded"
              title="Increase width by 50px"
            >
              →
            </button>
          </div>
          <div className="mt-1 text-xs text-gray-500 text-center">
            Width (px)
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'overview' && (
          <div className="flex h-full">
            <div 
              style={{ width: `${sidebarWidth}px` }}
              className="flex-shrink-0 overflow-auto bg-white"
            >
              <PropertyOverview selectedFeature={selectedFeature} />
            </div>
            <div className="flex-1">
              <MapView onFeatureSelect={handleFeatureSelect} loadLayers={shouldLoadLayers} />
            </div>
          </div>
        )}
        {activeTab === 'planning' && (
          <div className="flex h-full">
            <div 
              style={{ width: `${sidebarWidth}px` }}
              className="flex-shrink-0 overflow-auto bg-white"
            >
              <Planning selectedFeature={selectedFeature} />
            </div>
            <div className="flex-1">
              <MapView onFeatureSelect={handleFeatureSelect} loadLayers={shouldLoadLayers} />
            </div>
          </div>
        )}
        {activeTab === 'development' && (
          <div className="flex h-full">
            <div 
              style={{ width: `${sidebarWidth}px` }}
              className="flex-shrink-0 overflow-auto bg-white"
            >
              <Development selectedFeature={selectedFeature} />
            </div>
            <div className="flex-1">
              <MapView onFeatureSelect={handleFeatureSelect} loadLayers={shouldLoadLayers} />
            </div>
          </div>
        )}
        {activeTab === 'imagery' && (
          <div className="w-full h-full">
            <ImageryMap selectedFeature={selectedFeature} />
          </div>
        )}
        {activeTab === 'amenity' && (
          <div className="w-full h-full p-4">
            <AmenityChart selectedFeature={selectedFeature} />
          </div>
        )}
        {activeTab === 'growth' && (
          <div className="w-full h-full">
            <GrowthProjections selectedFeature={selectedFeature} />
          </div>
        )}
        {activeTab === 'sales' && (
          <div className="flex h-full">
            <div 
              style={{ width: `${sidebarWidth}px` }}
              className="flex-shrink-0 overflow-auto bg-white"
            >
              <Sales selectedFeature={selectedFeature} />
            </div>
            <div className="flex-1">
              <MapView onFeatureSelect={handleFeatureSelect} loadLayers={shouldLoadLayers} />
            </div>
          </div>
        )}
        {activeTab === 'topography' && (
          <div className="flex h-full">
            <div 
              style={{ width: `${sidebarWidth}px` }}
              className="flex-shrink-0 overflow-auto bg-white p-4"
            >
              <Topography selectedFeature={selectedFeature} />
            </div>
            <div className="flex-1">
              <MapView onFeatureSelect={handleFeatureSelect} loadLayers={shouldLoadLayers} />
            </div>
          </div>
        )}
        {activeTab === 'climate' && (
          <div className="flex h-full">
            <div 
              style={{ width: `${sidebarWidth}px` }}
              className="flex-shrink-0 overflow-auto bg-white"
            >
              <Climate selectedFeature={selectedFeature} />
            </div>
            <div className="flex-1">
              <MapView onFeatureSelect={handleFeatureSelect} loadLayers={shouldLoadLayers} />
            </div>
          </div>
        )}
        {activeTab === 'scenario' && (
          <div className="flex h-full">
            <div 
              style={{ width: `${sidebarWidth}px` }}
              className="flex-shrink-0 overflow-auto bg-white"
            >
              <AreaOverview selectedFeature={selectedFeature} />
            </div>
            <div className="flex-1">
              <MapView onFeatureSelect={handleFeatureSelect} loadLayers={shouldLoadLayers} />
            </div>
          </div>
        )}
        {activeTab === 'drawing' && (
          <div className="flex h-full">
            <div 
              style={{ width: `${sidebarWidth}px` }}
              className="flex-shrink-0 overflow-auto bg-white"
            >
              <LayerDrawing selectedFeature={selectedFeature} />
            </div>
            <div className="flex-1">
              <MapView onFeatureSelect={handleFeatureSelect} loadLayers={shouldLoadLayers} />
            </div>
          </div>
        )}
        {activeTab === 'report' && (
          <div className="flex h-full">
            <div 
              style={{ width: `${sidebarWidth}px` }}
              className="flex-shrink-0 overflow-auto bg-white"
            >
              <ReportGenerator 
                selectedFeature={selectedFeature} 
                onGenerationStateChange={handleReportGenerationStateChange}
              />
            </div>
            <div className="flex-1">
              <MapView onFeatureSelect={handleFeatureSelect} loadLayers={shouldLoadLayers} />
            </div>
          </div>
        )}
      </div>
      {/* Issue Modal */}
      <IssueModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
      />
    </div>
  );
};

export default MapScreenshotApp;
