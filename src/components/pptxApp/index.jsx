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
import { setNewWidthInPixels } from '../../lib/sidebarWidth';

const MapScreenshotApp = () => {
  const [selectedFeature, setSelectedFeature] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState('overview');
  const [sidebarWidth, setSidebarWidth] = React.useState(1000);  // Default width 1000px

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
    <div className="flex h-screen">
      {/* Left Side Navigation */}
      <div className="w-48 border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
        <div className="p-4">
          <h1 className="text-xl font-bold mb-4 text-gray-900 break-words">
            {selectedFeature 
              ? selectedFeature.properties.copiedFrom.site__address 
              : 'Select a Property'}
          </h1>
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
              className="flex-shrink-0 overflow-auto bg-gray-50"
            >
              <PropertyOverview selectedFeature={selectedFeature} />
            </div>
            <div className="flex-1">
              <MapView onFeatureSelect={handleFeatureSelect} />
            </div>
          </div>
        )}
        {activeTab === 'planning' && (
          <div className="flex h-full">
            <div 
              style={{ width: `${sidebarWidth}px` }}
              className="flex-shrink-0 overflow-auto bg-gray-50"
            >
              <Planning selectedFeature={selectedFeature} />
            </div>
            <div className="flex-1">
              <MapView onFeatureSelect={handleFeatureSelect} />
            </div>
          </div>
        )}
        {activeTab === 'development' && (
          <div className="flex h-full">
            <div 
              style={{ width: `${sidebarWidth}px` }}
              className="flex-shrink-0 overflow-auto bg-gray-50"
            >
              <Development selectedFeature={selectedFeature} />
            </div>
            <div className="flex-1">
              <MapView onFeatureSelect={handleFeatureSelect} />
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
              className="flex-shrink-0 overflow-auto bg-gray-50"
            >
              <Sales selectedFeature={selectedFeature} />
            </div>
            <div className="flex-1">
              <MapView onFeatureSelect={handleFeatureSelect} />
            </div>
          </div>
        )}
        {activeTab === 'topography' && (
          <div className="flex h-full">
            <div 
              style={{ width: `${sidebarWidth}px` }}
              className="flex-shrink-0 overflow-auto bg-gray-50 p-4"
            >
              <Topography selectedFeature={selectedFeature} />
            </div>
            <div className="flex-1">
              <MapView onFeatureSelect={handleFeatureSelect} />
            </div>
          </div>
        )}
        {activeTab === 'climate' && (
          <div className="flex h-full">
            <div 
              style={{ width: `${sidebarWidth}px` }}
              className="flex-shrink-0 overflow-auto bg-gray-50"
            >
              <Climate selectedFeature={selectedFeature} />
            </div>
            <div className="flex-1">
              <MapView onFeatureSelect={handleFeatureSelect} />
            </div>
          </div>
        )}
        {activeTab === 'scenario' && (
          <div className="flex h-full">
            <div 
              style={{ width: `${sidebarWidth}px` }}
              className="flex-shrink-0 overflow-auto bg-gray-50"
            >
              <AreaOverview selectedFeature={selectedFeature} />
            </div>
            <div className="flex-1">
              <MapView onFeatureSelect={handleFeatureSelect} />
            </div>
          </div>
        )}
        {activeTab === 'drawing' && (
          <div className="flex h-full">
            <div 
              style={{ width: `${sidebarWidth}px` }}
              className="flex-shrink-0 overflow-auto bg-gray-50"
            >
              <LayerDrawing selectedFeature={selectedFeature} />
            </div>
            <div className="flex-1">
              <MapView onFeatureSelect={handleFeatureSelect} />
            </div>
          </div>
        )}
        {activeTab === 'report' && (
          <div className="flex h-full">
            <div 
              style={{ width: `${sidebarWidth}px` }}
              className="flex-shrink-0 overflow-auto bg-gray-50"
            >
              <ReportGenerator selectedFeature={selectedFeature} />
            </div>
            <div className="flex-1">
              <MapView onFeatureSelect={handleFeatureSelect} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapScreenshotApp;
