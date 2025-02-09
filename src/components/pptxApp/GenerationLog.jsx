import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Map,
  Image as ImageIcon,
  Database,
  Calculator,
  CheckCircle2,
  Loader2,
  AlertCircle
} from 'lucide-react';

const LogItem = ({ message, type, timestamp, isNew }) => {
  const getIcon = () => {
    switch (type) {
      case 'map':
        return <Map className="w-4 h-4" />;
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'data':
        return <Database className="w-4 h-4" />;
      case 'calculation':
        return <Calculator className="w-4 h-4" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Loader2 className="w-4 h-4 animate-spin" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`flex items-center gap-3 p-3 rounded-lg ${
        isNew ? 'bg-blue-50' : 'bg-white'
      } border border-gray-200 shadow-sm`}
    >
      <div className={`p-2 rounded-full ${
        isNew ? 'bg-blue-100' : 'bg-gray-100'
      }`}>
        {getIcon()}
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-700">{message}</p>
        <p className="text-xs text-gray-400">{timestamp}</p>
      </div>
    </motion.div>
  );
};

const GenerationLog = ({ logs, isGenerating }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isGenerating && logs.length === 0) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="mt-4 border rounded-lg bg-gray-50 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">Generation Progress</h3>
        {isGenerating && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </div>
        )}
      </div>

      <div 
        ref={containerRef}
        className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar"
      >
        <AnimatePresence mode="popLayout">
          {logs.map((log, index) => (
            <LogItem
              key={log.id}
              {...log}
              isNew={index === logs.length - 1}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default GenerationLog; 