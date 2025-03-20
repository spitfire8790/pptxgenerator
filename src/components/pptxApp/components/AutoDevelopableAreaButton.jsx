import React, { useState } from 'react';
import { Wand2, Loader2, AlertCircle } from 'lucide-react';
import { generateAutoDevelopableArea } from '../utils/autoDevelopableAreaGenerator';

/**
 * A button component that allows users to auto-generate developable areas
 * by subtracting biodiversity areas from a site boundary
 * 
 * @param {Object} props
 * @param {Object} props.selectedFeature - The currently selected site feature
 * @param {Function} props.onDevelopableAreaGenerated - Callback when developable area is generated
 */
const AutoDevelopableAreaButton = ({ 
  selectedFeature, 
  onDevelopableAreaGenerated 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [notification, setNotification] = useState(null);

  // Clear notification after a delay
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleGenerateDevelopableArea = async () => {
    try {
      setIsGenerating(true);
      
      if (!selectedFeature) {
        setNotification({
          type: 'error',
          message: 'No site selected. Please select a site first.'
        });
        return;
      }
      
      const result = await generateAutoDevelopableArea(
        selectedFeature,
        setNotification,
        setIsGenerating
      );
      
      if (result && result.developableArea && onDevelopableAreaGenerated) {
        onDevelopableAreaGenerated(result.developableArea);
      }
    } catch (error) {
      console.error('Error in handleGenerateDevelopableArea:', error);
      setNotification({
        type: 'error',
        message: `Failed to generate developable area: ${error.message}`
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Notification component
  const NotificationDisplay = ({ notification }) => {
    if (!notification) return null;
    
    const bgColor = notification.type === 'error' 
      ? 'bg-red-100 border-red-400 text-red-700'
      : notification.type === 'success'
        ? 'bg-green-100 border-green-400 text-green-700'
        : 'bg-blue-100 border-blue-400 text-blue-700';
    
    return (
      <div className={`p-1 mt-2 rounded-md border ${bgColor} text-sm flex items-start w-full z-50`}>
        {notification.type === 'error' && <AlertCircle className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />}
        <span>{notification.message}</span>
      </div>
    );
  };

  return (
    <div className="flex items-center">
      <div className="relative group">
        <button
          onClick={handleGenerateDevelopableArea}
          disabled={isGenerating || !selectedFeature}
          className={`
            p-2 rounded-full shadow-sm transition-colors flex items-center justify-center
            ${isGenerating || !selectedFeature
              ? 'bg-gray-400 cursor-not-allowed text-gray-200'
              : 'bg-purple-600 hover:bg-purple-700 text-white hover:shadow-md'
            }
          `}
        >
          {isGenerating ? (
            <Loader2 size={20} className="w-5 h-5 animate-spin" />
          ) : (
            <Wand2 className="w-5 h-5" />
          )}
        </button>
        
        {/* Tooltip - positioned to left of button rather than centered */}
        <div className="absolute z-50 right-0 w-64 p-2 mt-2 text-sm text-gray-700 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-300 border border-gray-200">
          <p className="font-semibold mb-1">Auto-Generate Developable Area</p>
          <p className="text-xs">Automatically create a developable area by excluding biodiversity zones from the site.</p>
        </div>
      </div>
      
      {/* Notification */}
      {notification && (
        <div className="relative z-50 ml-2">
          <NotificationDisplay notification={notification} />
        </div>
      )}
    </div>
  );
};

export default AutoDevelopableAreaButton; 