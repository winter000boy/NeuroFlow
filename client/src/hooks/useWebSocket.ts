import { useEffect, useCallback } from 'react';
import { websocketService, WebSocketEventName, WebSocketEventHandler } from '../services/websocket.service';
import { useWebSocketConnection } from './useWebSocketConnection';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  events?: Array<{
    event: WebSocketEventName;
    handler: WebSocketEventHandler<any>;
  }>;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const { autoConnect = true, events = [] } = options;
  
  const { 
    connectionStatus, 
    connect, 
    disconnect, 
    reconnect, 
    isConnected, 
    isConnecting 
  } = useWebSocketConnection({ autoConnect });

  // Register event handlers
  useEffect(() => {
    events.forEach(({ event, handler }) => {
      websocketService.on(event, handler);
    });

    // Cleanup event handlers
    return () => {
      events.forEach(({ event, handler }) => {
        websocketService.off(event, handler);
      });
    };
  }, [events]);

  const on = useCallback(<T extends WebSocketEventName>(
    event: T,
    handler: WebSocketEventHandler<T>
  ) => {
    websocketService.on(event, handler);
    
    // Return cleanup function
    return () => {
      websocketService.off(event, handler);
    };
  }, []);

  const off = useCallback(<T extends WebSocketEventName>(
    event: T,
    handler: WebSocketEventHandler<T>
  ) => {
    websocketService.off(event, handler);
  }, []);

  const emit = useCallback((event: string, data: any) => {
    websocketService.emit(event, data);
  }, []);

  const joinExecutionRoom = useCallback((executionId: string) => {
    websocketService.joinExecutionRoom(executionId);
  }, []);

  const leaveExecutionRoom = useCallback((executionId: string) => {
    websocketService.leaveExecutionRoom(executionId);
  }, []);

  const joinWorkflowRoom = useCallback((workflowId: string) => {
    websocketService.joinWorkflowRoom(workflowId);
  }, []);

  const leaveWorkflowRoom = useCallback((workflowId: string) => {
    websocketService.leaveWorkflowRoom(workflowId);
  }, []);

  return {
    // Connection management
    connectionStatus,
    connect,
    disconnect,
    reconnect,
    isConnected,
    isConnecting,
    
    // Event handling
    on,
    off,
    emit,
    
    // Room management
    joinExecutionRoom,
    leaveExecutionRoom,
    joinWorkflowRoom,
    leaveWorkflowRoom,
  };
};