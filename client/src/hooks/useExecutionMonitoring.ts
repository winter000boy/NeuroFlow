import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useAppSelector, useAppDispatch } from '../store';
import { updateExecutionStatus } from '../store/slices/executionSlice';

interface ExecutionLog {
  executionId: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

interface ExecutionProgress {
  executionId: string;
  progress: number;
  currentStep?: string;
  message?: string;
}

interface UseExecutionMonitoringOptions {
  executionId?: string;
  workflowId?: string;
  onExecutionUpdate?: (update: any) => void;
  onExecutionComplete?: (executionId: string, status: string, result: any) => void;
  onExecutionFailed?: (executionId: string, error: string) => void;
  onExecutionLog?: (executionId: string, log: string, timestamp: string) => void;
}

export const useExecutionMonitoring = (options: UseExecutionMonitoringOptions = {}) => {
  const {
    executionId,
    workflowId,
    onExecutionUpdate,
    onExecutionComplete,
    onExecutionFailed,
    onExecutionLog
  } = options;

  const dispatch = useAppDispatch();
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [executionProgress, setExecutionProgress] = useState<Record<string, ExecutionProgress>>({});
  
  const realTimeUpdates = useAppSelector(state => state.executions.realTimeUpdates);
  const currentExecution = useAppSelector(state => state.executions.currentExecution);

  const handleExecutionLog = useCallback((data: any) => {
    const log: ExecutionLog = {
      executionId: data.executionId,
      timestamp: data.timestamp,
      level: data.level || 'info',
      message: data.log,
    };
    
    setExecutionLogs(prev => [...prev, log]);
    onExecutionLog?.(data.executionId, data.log, data.timestamp);
  }, [onExecutionLog]);

  const handleExecutionProgress = useCallback((data: any) => {
    const progress: ExecutionProgress = {
      executionId: data.executionId,
      progress: data.progress,
      currentStep: data.currentStep,
      message: data.message,
    };
    
    setExecutionProgress(prev => ({
      ...prev,
      [data.executionId]: progress,
    }));

    const update = {
      executionId: data.executionId,
      status: 'running',
      progress: data.progress,
      message: data.message
    };
    onExecutionUpdate?.(update);
  }, [onExecutionUpdate]);

  const handleExecutionStarted = useCallback((data: any) => {
    const update = {
      executionId: data.executionId,
      status: 'running',
      progress: 0
    };
    onExecutionUpdate?.(update);
  }, [onExecutionUpdate]);

  const handleExecutionCompleted = useCallback((data: any) => {
    const update = {
      executionId: data.executionId,
      status: data.status,
      progress: 100,
      result: data.result
    };
    onExecutionUpdate?.(update);
    onExecutionComplete?.(data.executionId, data.status, data.result);
  }, [onExecutionUpdate, onExecutionComplete]);

  const handleExecutionFailed = useCallback((data: any) => {
    const update = {
      executionId: data.executionId,
      status: 'failed',
      error: data.error
    };
    onExecutionUpdate?.(update);
    onExecutionFailed?.(data.executionId, data.error);
  }, [onExecutionUpdate, onExecutionFailed]);

  const { 
    isConnected, 
    joinExecutionRoom, 
    leaveExecutionRoom,
    joinWorkflowRoom,
    leaveWorkflowRoom,
    on 
  } = useWebSocket({
    autoConnect: true,
  });

  // Set up event listeners
  useEffect(() => {
    const unsubscribeLog = on('execution:log', handleExecutionLog);
    const unsubscribeProgress = on('execution:progress', handleExecutionProgress);
    const unsubscribeStarted = on('execution:started', handleExecutionStarted);
    const unsubscribeCompleted = on('execution:completed', handleExecutionCompleted);
    const unsubscribeFailed = on('execution:failed', handleExecutionFailed);

    return () => {
      unsubscribeLog();
      unsubscribeProgress();
      unsubscribeStarted();
      unsubscribeCompleted();
      unsubscribeFailed();
    };
  }, [on, handleExecutionLog, handleExecutionProgress, handleExecutionStarted, handleExecutionCompleted, handleExecutionFailed]);

  // Join/leave execution room when executionId changes
  useEffect(() => {
    if (executionId && isConnected) {
      joinExecutionRoom(executionId);
      
      return () => {
        leaveExecutionRoom(executionId);
      };
    }
  }, [executionId, isConnected, joinExecutionRoom, leaveExecutionRoom]);

  // Join/leave workflow room when workflowId changes
  useEffect(() => {
    if (workflowId && isConnected) {
      joinWorkflowRoom(workflowId);
      
      return () => {
        leaveWorkflowRoom(workflowId);
      };
    }
  }, [workflowId, isConnected, joinWorkflowRoom, leaveWorkflowRoom]);

  const clearLogs = useCallback(() => {
    setExecutionLogs([]);
  }, []);

  const clearProgress = useCallback(() => {
    setExecutionProgress({});
  }, []);

  const getLogsForExecution = useCallback((id: string) => {
    return executionLogs.filter(log => log.executionId === id);
  }, [executionLogs]);

  const getProgressForExecution = useCallback((id: string) => {
    return executionProgress[id];
  }, [executionProgress]);

  const clearExecutionData = useCallback((id: string) => {
    setExecutionLogs(prev => prev.filter(log => log.executionId !== id));
    setExecutionProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[id];
      return newProgress;
    });
  }, []);

  // Filter logs for current execution if executionId is provided
  const currentExecutionLogs = executionId 
    ? getLogsForExecution(executionId)
    : executionLogs;

  const currentExecutionProgress = executionId 
    ? getProgressForExecution(executionId)
    : undefined;

  return {
    // Connection status
    isConnected,
    realTimeUpdates,
    
    // Current execution data
    currentExecution,
    currentExecutionLogs,
    currentExecutionProgress,
    
    // All execution data
    executionLogs,
    executionProgress,
    
    // Utility functions
    clearLogs,
    clearProgress,
    getLogsForExecution,
    getProgressForExecution,
    clearExecutionData,
    
    // Room management
    joinExecutionRoom,
    leaveExecutionRoom,
    joinWorkflowRoom,
    leaveWorkflowRoom,

    // Legacy compatibility
    connectionStatus: isConnected ? 'connected' : 'disconnected',
    getExecutionUpdate: getProgressForExecution,
    getExecutionLogs: getLogsForExecution,
  };
};