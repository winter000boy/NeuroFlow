import React, { useState, useEffect } from 'react';
import { Execution } from '../../../types';
import { executionService } from '../../../services/execution.service';
import { useExecutionMonitoring } from '../../../hooks/useExecutionMonitoring';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ExecutionStatusIndicator from './ExecutionStatusIndicator';
import LiveExecutionLogs from './LiveExecutionLogs';

interface ExecutionDetailProps {
  executionId: string;
  onClose: () => void;
}

const ExecutionDetail: React.FC<ExecutionDetailProps> = ({ executionId, onClose }) => {
  const [execution, setExecution] = useState<Execution | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'input' | 'output' | 'logs'>('overview');

  // Real-time execution monitoring
  const { getExecutionUpdate, connectionStatus } = useExecutionMonitoring({
    executionId,
    onExecutionUpdate: (update) => {
      if (update.executionId === executionId && execution) {
        setExecution(prev => prev ? {
          ...prev,
          status: (update.status as any) || prev.status,
          ...(update.result ? { outputData: update.result } : {}),
          ...(update.error ? { errorMessage: update.error } : {}),
          ...(update.status === 'success' || update.status === 'failed' ? {
            finishedAt: new Date()
          } : {})
        } : prev);
      }
    }
  });

  useEffect(() => {
    loadExecutionDetails();
  }, [executionId]);

  const loadExecutionDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const executionData = await executionService.getExecutionById(executionId);
      setExecution(executionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load execution details');
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    if (!execution) return;
    
    try {
      setLogsLoading(true);
      const logsData = await executionService.getExecutionLogs(execution.id);
      setLogs(logsData.logs);
    } catch (err) {
      console.error('Failed to load logs:', err);
      setLogs(['Failed to load execution logs']);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs' && execution) {
      loadLogs();
    }
  }, [activeTab, execution]);

  const getCurrentStatus = () => {
    const realtimeUpdate = getExecutionUpdate(executionId);
    return realtimeUpdate?.status || execution?.status || 'unknown';
  };

  const getCurrentProgress = () => {
    const realtimeUpdate = getExecutionUpdate(executionId);
    return realtimeUpdate?.progress;
  };

  const getCurrentMessage = () => {
    const realtimeUpdate = getExecutionUpdate(executionId);
    return realtimeUpdate?.message;
  };

  const formatDuration = (startedAt: Date, finishedAt?: Date) => {
    const start = new Date(startedAt);
    const end = finishedAt ? new Date(finishedAt) : new Date();
    const duration = end.getTime() - start.getTime();
    
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);
    
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const handleRetry = async () => {
    if (!execution) return;
    
    try {
      await executionService.retryExecution(execution.id);
      loadExecutionDetails(); // Refresh the execution details
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry execution');
    }
  };

  const handleCancel = async () => {
    if (!execution) return;
    
    try {
      await executionService.cancelExecution(execution.id);
      loadExecutionDetails(); // Refresh the execution details
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel execution');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  if (error || !execution) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Execution Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error || 'Execution not found'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Execution Details</h3>
            <p className="text-sm text-gray-500 mt-1">ID: {execution.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Connection Status */}
        {connectionStatus !== 'connected' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
              }`} />
              <span className="text-sm text-yellow-800">
                {connectionStatus === 'connecting' 
                  ? 'Connecting to real-time updates...' 
                  : 'Real-time updates unavailable'
                }
              </span>
            </div>
          </div>
        )}

        {/* Status and Actions */}
        <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-4">
            <ExecutionStatusIndicator
              status={getCurrentStatus()}
              progress={getCurrentProgress()}
              message={getCurrentMessage()}
              showProgress={getCurrentStatus() === 'running'}
              size="lg"
            />
            <div className="text-sm text-gray-600">
              <p>Started: {new Date(execution.startedAt).toLocaleString()}</p>
              {execution.finishedAt && (
                <p>Finished: {new Date(execution.finishedAt).toLocaleString()}</p>
              )}
              <p>Duration: {formatDuration(execution.startedAt, execution.finishedAt)}</p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            {getCurrentStatus() === 'failed' && (
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            )}
            {(getCurrentStatus() === 'running' || getCurrentStatus() === 'pending') && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {execution.errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <h4 className="text-sm font-medium text-red-800 mb-2">Error Message</h4>
            <p className="text-sm text-red-700 font-mono">{execution.errorMessage}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'input', label: 'Input Data' },
              { id: 'output', label: 'Output Data' },
              { id: 'logs', label: 'Logs' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Execution Info</h4>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Workflow ID</dt>
                      <dd className="text-sm text-gray-900 font-mono">{execution.workflowId}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd className="text-sm text-gray-900">{getCurrentStatus()}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Started At</dt>
                      <dd className="text-sm text-gray-900">{new Date(execution.startedAt).toLocaleString()}</dd>
                    </div>
                    {execution.finishedAt && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Finished At</dt>
                        <dd className="text-sm text-gray-900">{new Date(execution.finishedAt).toLocaleString()}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Duration</dt>
                      <dd className="text-sm text-gray-900">{formatDuration(execution.startedAt, execution.finishedAt)}</dd>
                    </div>
                  </dl>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Data Summary</h4>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Input Data</dt>
                      <dd className="text-sm text-gray-900">
                        {execution.inputData ? 'Available' : 'No input data'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Output Data</dt>
                      <dd className="text-sm text-gray-900">
                        {execution.outputData ? 'Available' : 'No output data'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Error Message</dt>
                      <dd className="text-sm text-gray-900">
                        {execution.errorMessage ? 'Available' : 'No errors'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'input' && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Input Data</h4>
              {execution.inputData ? (
                <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm overflow-x-auto">
                  {JSON.stringify(execution.inputData, null, 2)}
                </pre>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No input data available for this execution</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'output' && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Output Data</h4>
              {execution.outputData ? (
                <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm overflow-x-auto">
                  {JSON.stringify(execution.outputData, null, 2)}
                </pre>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No output data available for this execution</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div>
              <LiveExecutionLogs
                executionId={executionId}
                autoScroll={true}
                maxHeight="500px"
              />
              
              {/* Static logs fallback */}
              {logs.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Static Logs</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-sm max-h-64 overflow-y-auto">
                    {logs.map((log, index) => (
                      <div key={index} className="mb-1 text-gray-700">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExecutionDetail;