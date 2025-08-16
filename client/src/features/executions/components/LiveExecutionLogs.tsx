import React, { useEffect, useRef, useState } from 'react';
import { useExecutionMonitoring } from '../../../hooks/useExecutionMonitoring';

interface LiveExecutionLogsProps {
  executionId: string;
  autoScroll?: boolean;
  maxHeight?: string;
}

const LiveExecutionLogs: React.FC<LiveExecutionLogsProps> = ({
  executionId,
  autoScroll = true,
  maxHeight = '400px'
}) => {
  const [logs, setLogs] = useState<Array<{ log: string; timestamp: string }>>([]);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(autoScroll);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const { getExecutionLogs, connectionStatus } = useExecutionMonitoring({
    executionId,
    onExecutionLog: (execId, log, timestamp) => {
      if (execId === executionId) {
        setLogs(prevLogs => [...prevLogs, { log, timestamp }]);
      }
    }
  });

  // Load existing logs on mount
  useEffect(() => {
    const existingLogs = getExecutionLogs(executionId);
    setLogs(existingLogs);
  }, [executionId, getExecutionLogs]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isAutoScrollEnabled && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isAutoScrollEnabled]);

  // Handle manual scroll to detect if user scrolled up
  const handleScroll = () => {
    if (!logsContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px threshold

    setIsAutoScrollEnabled(isAtBottom);
  };

  const scrollToBottom = () => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setIsAutoScrollEnabled(true);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getLogLevel = (log: string) => {
    const lowerLog = log.toLowerCase();
    if (lowerLog.includes('error') || lowerLog.includes('failed')) {
      return 'error';
    }
    if (lowerLog.includes('warn') || lowerLog.includes('warning')) {
      return 'warning';
    }
    if (lowerLog.includes('info') || lowerLog.includes('success')) {
      return 'info';
    }
    return 'default';
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      case 'info':
        return 'text-blue-400';
      default:
        return 'text-green-400';
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h4 className="text-sm font-medium text-gray-900">Live Execution Logs</h4>
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' : 
            connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <span className="text-xs text-gray-500 capitalize">{connectionStatus}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAutoScrollEnabled(!isAutoScrollEnabled)}
            className={`px-2 py-1 text-xs rounded ${
              isAutoScrollEnabled
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Auto-scroll: {isAutoScrollEnabled ? 'ON' : 'OFF'}
          </button>
          
          {!isAutoScrollEnabled && (
            <button
              onClick={scrollToBottom}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Scroll to bottom
            </button>
          )}
        </div>
      </div>

      {/* Logs Container */}
      <div
        ref={logsContainerRef}
        onScroll={handleScroll}
        className="bg-black rounded-lg p-4 font-mono text-sm overflow-y-auto"
        style={{ maxHeight }}
      >
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            {connectionStatus === 'connected' 
              ? 'Waiting for execution logs...'
              : 'Connecting to live logs...'
            }
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((logEntry, index) => {
              const level = getLogLevel(logEntry.log);
              const colorClass = getLogLevelColor(level);
              
              return (
                <div key={index} className="flex items-start space-x-2">
                  <span className="text-gray-500 text-xs flex-shrink-0 mt-0.5">
                    {formatTimestamp(logEntry.timestamp)}
                  </span>
                  <span className={`${colorClass} break-all`}>
                    {logEntry.log}
                  </span>
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{logs.length} log entries</span>
        {logs.length > 0 && (
          <span>
            Latest: {formatTimestamp(logs[logs.length - 1]?.timestamp || new Date().toISOString())}
          </span>
        )}
      </div>
    </div>
  );
};

export default LiveExecutionLogs;