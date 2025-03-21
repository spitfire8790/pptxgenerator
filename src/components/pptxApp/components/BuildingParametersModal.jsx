import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  Maximize, 
  MinusCircle, 
  ArrowRightLeft,
  Ratio, 
  ArrowUpDown,
  Info,
  RotateCw,
  Layers,
  AlertTriangle,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DialogContent } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/**
 * A modal component that allows users to adjust building parameters
 * with sliders and visual controls
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {Object} props.defaultParameters - Default parameter values
 * @param {Function} props.onSave - Function called with updated parameters when saved
 */
const BuildingParametersModal = ({ 
  isOpen, 
  onClose, 
  defaultParameters = {}, 
  onSave 
}) => {
  // Set up state with default parameters
  const [parameters, setParameters] = useState({
    maxBuildingHeight: defaultParameters.maxBuildingHeight || 100,
    minBuildingSeparation: defaultParameters.minBuildingSeparation || 6,
    maxBuildingDepth: defaultParameters.maxBuildingDepth || 18,
    siteEfficiencyRatio: defaultParameters.siteEfficiencyRatio || 0.6,
    floorToFloorHeight: defaultParameters.floorToFloorHeight || 3.1,
    gbaToGfaRatio: defaultParameters.gbaToGfaRatio || 0.85,
    roadBoundaryId: defaultParameters.roadBoundaryId || null,
    hasRoadBoundary: defaultParameters.hasRoadBoundary || false,
    defineRoadBoundary: false
  });
  
  // Track which parameter info tooltips are visible
  const [visibleTooltip, setVisibleTooltip] = useState(null);
  
  // Track whether changes have been made
  const [hasChanges, setHasChanges] = useState(false);
  
  // Handle parameter change
  const handleParameterChange = (name, value) => {
    setParameters(prev => ({
      ...prev,
      [name]: value
    }));
    setHasChanges(true);
  };
  
  // Handle save button click
  const handleSave = () => {
    if (onSave) {
      onSave(parameters);
    }
    onClose();
  };
  
  // Handle cancel button click
  const handleCancel = () => {
    onClose();
  };
  
  // Handle road boundary definition button click
  const handleDefineRoadBoundary = () => {
    setParameters(prev => ({
      ...prev,
      defineRoadBoundary: true
    }));
    
    // Save and close so that the parent component can activate the road boundary drawing mode
    if (onSave) {
      onSave({
        ...parameters,
        defineRoadBoundary: true
      });
    }
    onClose();
  };
  
  // If modal is not open, don't render anything
  if (!isOpen) return null;
  
  // Parameter definitions
  const parameterDefinitions = [
    {
      id: 'maxBuildingHeight',
      label: 'Maximum Building Height',
      icon: <Building2 className="w-5 h-5 text-purple-600" />,
      description: 'Maximum allowed height for any building in meters. This is the absolute maximum regardless of HOB limits.',
      min: 10,
      max: 200,
      step: 1,
      unit: 'm',
      preview: (value) => (
        <div className="relative w-6 h-14 flex items-end justify-center">
          <div 
            className="absolute bottom-0 w-6 bg-purple-500 rounded-t"
            style={{ height: `${(value / 200) * 100}%` }}
          ></div>
          <span className="text-[10px] text-white z-10 mb-1">{value}m</span>
        </div>
      )
    },
    {
      id: 'minBuildingSeparation',
      label: 'Min Building Separation',
      icon: <MinusCircle className="w-5 h-5 text-blue-600" />,
      description: 'Minimum required distance between buildings in meters.',
      min: 3,
      max: 15,
      step: 0.5,
      unit: 'm',
      preview: (value) => (
        <div className="flex items-end space-x-1 h-14 w-12">
          <div className="w-4 h-10 bg-blue-500 rounded-t"></div>
          <div 
            className="h-1 bg-blue-300 rounded"
            style={{ width: `${value * 2}px` }}
          ></div>
          <div className="w-4 h-10 bg-blue-500 rounded-t"></div>
        </div>
      )
    },
    {
      id: 'maxBuildingDepth',
      label: 'Max Building Depth',
      icon: <ArrowRightLeft className="w-5 h-5 text-green-600" />,
      description: 'Maximum allowed depth of a building in meters. Buildings deeper than this will be split into multiple buildings.',
      min: 10,
      max: 50,
      step: 1,
      unit: 'm',
      preview: (value) => (
        <div className="relative h-8 flex items-center justify-center">
          <div 
            className="h-6 bg-green-500 rounded"
            style={{ width: `${(value/50) * 48}px` }}
          ></div>
        </div>
      )
    },
    {
      id: 'siteEfficiencyRatio',
      label: 'Site Efficiency Ratio',
      icon: <Ratio className="w-5 h-5 text-amber-600" />,
      description: 'The proportion of developable area that can be covered by building footprints.',
      min: 0.3,
      max: 0.9,
      step: 0.05,
      unit: '',
      preview: (value) => (
        <div className="relative w-12 h-10 border border-dashed border-amber-300 flex items-center justify-center">
          <div 
            className="bg-amber-500 rounded"
            style={{ 
              width: `${value * 100}%`, 
              height: `${value * 100}%` 
            }}
          ></div>
        </div>
      )
    },
    {
      id: 'floorToFloorHeight',
      label: 'Floor-to-Floor Height',
      icon: <ArrowUpDown className="w-5 h-5 text-red-600" />,
      description: 'The height of each floor in meters.',
      min: 2.5,
      max: 5,
      step: 0.1,
      unit: 'm',
      preview: (value) => (
        <div className="flex flex-col space-y-0.5 h-12 items-center">
          <div className="w-10 h-2 bg-red-300 rounded"></div>
          <div 
            className="w-10 bg-red-200"
            style={{ height: `${value * 4}px` }}
          ></div>
          <div className="w-10 h-2 bg-red-300 rounded"></div>
        </div>
      )
    },
    {
      id: 'gbaToGfaRatio',
      label: 'GBA to GFA Ratio',
      icon: <Layers className="w-5 h-5 text-indigo-600" />,
      description: 'Efficiency ratio between Gross Building Area and Gross Floor Area.',
      min: 0.7,
      max: 0.95,
      step: 0.05,
      unit: '',
      preview: (value) => (
        <div className="relative w-12 h-8 flex items-center justify-center">
          <div className="absolute w-full h-full border border-dashed border-indigo-300 rounded"></div>
          <div 
            className="bg-indigo-500 rounded"
            style={{ 
              width: `${value * 100}%`, 
              height: `${value * 100}%` 
            }}
          ></div>
        </div>
      )
    },
  ];
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-16">
      <AnimatePresence>
        <motion.div 
          className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
            <motion.h3 
              className="text-lg font-semibold flex items-center"
              initial={{ x: -20 }}
              animate={{ x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Building2 className="mr-2" /> Building Parameters
            </motion.h3>
            <button 
              onClick={handleCancel}
              className="text-white hover:text-white/70 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Description */}
          <div className="p-4 bg-purple-50 border-b flex items-start">
            <div className="flex-shrink-0 mr-3 pt-1">
              <Info className="text-purple-500 w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">
                Adjust building parameters to control the generation of building massings. 
                These parameters affect how buildings are placed and sized within the developable area.
              </p>
            </div>
          </div>
          
          {/* Parameters */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {parameterDefinitions.map((param, index) => (
                <motion.div 
                  key={param.id}
                  className="bg-white border rounded-lg shadow-sm p-4 hover:shadow transition-shadow relative"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  {/* Parameter tooltip */}
                  {visibleTooltip === param.id && (
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full z-10">
                      <div className="bg-gray-800 text-white text-xs rounded p-2 shadow-lg max-w-[200px]">
                        {param.description}
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center">
                      <div className="mr-2">{param.icon}</div>
                      <h4 className="font-medium text-sm">{param.label}</h4>
                    </div>
                    <button 
                      type="button"
                      className="text-gray-400 hover:text-gray-600"
                      onClick={() => setVisibleTooltip(visibleTooltip === param.id ? null : param.id)}
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-14 h-14 flex items-center justify-center border rounded bg-gray-50">
                      {param.preview(parameters[param.id])}
                    </div>
                    
                    <div className="flex-grow">
                      <input 
                        type="range"
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        value={parameters[param.id]}
                        onChange={(e) => handleParameterChange(param.id, parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>
                    
                    <div className="w-16 flex items-center">
                      <input 
                        type="number"
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        value={parameters[param.id]}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value) && value >= param.min && value <= param.max) {
                            handleParameterChange(param.id, value);
                          }
                        }}
                        className="w-full p-1 text-sm text-center border rounded"
                      />
                      <span className="ml-1 text-xs text-gray-500">{param.unit}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* Road Boundary Section */}
            <motion.div 
              className="mt-6 bg-white border rounded-lg shadow-sm p-4 hover:shadow transition-shadow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center">
                  <div className="mr-2">
                    <Maximize className="w-5 h-5 text-orange-600" />
                  </div>
                  <h4 className="font-medium text-sm">Primary Road Boundary</h4>
                </div>
                <button 
                  type="button"
                  className="text-gray-400 hover:text-gray-600"
                  onClick={() => setVisibleTooltip(visibleTooltip === 'roadBoundary' ? null : 'roadBoundary')}
                >
                  <Info className="w-4 h-4" />
                </button>
                
                {/* Road boundary tooltip */}
                {visibleTooltip === 'roadBoundary' && (
                  <div className="absolute right-4 top-0 transform -translate-y-full z-10">
                    <div className="bg-gray-800 text-white text-xs rounded p-2 shadow-lg max-w-[250px]">
                      Define the primary road boundary to apply the maximum building depth rule of {parameters.maxBuildingDepth}m from the road.
                      <div className="absolute -bottom-1 right-2 transform w-2 h-2 bg-gray-800 rotate-45"></div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-sm text-gray-600 mb-3">
                {parameters.hasRoadBoundary 
                  ? <div className="flex items-center text-green-600">
                      <Check className="w-4 h-4 mr-1" /> Road boundary defined
                    </div>
                  : 'Define the primary road boundary to measure maximum building depth from. If not defined, depth will be calculated based on the building\'s width.'
                }
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center text-sm">
                  <span className="text-gray-500">Max depth:</span>
                  <span className="ml-1 font-medium">{parameters.maxBuildingDepth}m</span>
                </div>
                
                <div className="flex space-x-2">
                  {parameters.hasRoadBoundary && (
                    <button
                      type="button"
                      className="px-3 py-1.5 text-sm border border-red-500 text-red-500 rounded hover:bg-red-50"
                      onClick={() => handleParameterChange('hasRoadBoundary', false)}
                    >
                      Clear Boundary
                    </button>
                  )}
                  
                  <button
                    type="button"
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    onClick={handleDefineRoadBoundary}
                  >
                    {parameters.hasRoadBoundary ? 'Redefine Boundary' : 'Define Boundary'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t flex justify-between items-center">
            <div className="flex items-center text-sm">
              {hasChanges && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center text-amber-600 mr-3"
                >
                  <AlertTriangle size={16} className="mr-1 animate-pulse" />
                  <span>Unsaved changes</span>
                </motion.div>
              )}
              
              {/* Road boundary status indicator */}
              {parameters.hasRoadBoundary && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center text-green-600 mr-3"
                >
                  <Check size={16} className="mr-1" />
                  <span>Road boundary set</span>
                </motion.div>
              )}
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
              >
                <RotateCw size={16} className="mr-2" />
                Apply Parameters
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default BuildingParametersModal; 