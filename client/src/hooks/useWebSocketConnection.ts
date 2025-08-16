import { useEffect, useState, useCallback } from 'react';
import { useAppSelector } from '../store';
import { websocketService, WebSocketConnectionStatus } from '../services/websocket.service';

export interface UseWebSocketConnectionOptions {
  autoConnect?: boolean;
  reconnectOnAuthChange?: boolean;
}

export function useWebSocketConnection(options: UseWebSocketConnectionOptions = {}) {
  const { autoConnect = true, reconnectOnAuthChange = true } = options;
  
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const [connectionStatus, setConnectionStatus] = useState<WebSocketConnectionStatus>(
    websocketService.getConnectionStatus()
  );

  const connect = useCallback(async () => {
    if (!isAuthenticated) {
      console.warn('Cannot connect WebSocket: user not authenticated');
      return;
    }

    try {
      await websocketService.connect();
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [isAuthenticated]);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  const reconnect = useCallback(async () => {
    disconnect();
    await connect();
  }, [connect, disconnect]);

  // Subscribe to connection status changes
  useEffect(() => {
    const unsubscribe = websocketService.onConnectionStatusChange(setConnectionStatus);
    return unsubscribe;
  }, []);

  // Auto-connect when authenticated
  useEffect(() => {
    if (autoConnect && isAuthenticated && !connectionStatus.connected && !connectionStatus.connecting) {
      connect();
    }
  }, [autoConnect, isAuthenticated, connectionStatus.connected, connectionStatus.connecting, connect]);

  // Disconnect when not authenticated
  useEffect(() => {
    if (!isAuthenticated && connectionStatus.connected) {
      disconnect();
    }
  }, [isAuthenticated, connectionStatus.connected, disconnect]);

  // Reconnect when authentication changes (if enabled)
  useEffect(() => {
    if (reconnectOnAuthChange && isAuthenticated && !connectionStatus.connected) {
      connect();
    }
  }, [reconnectOnAuthChange, isAuthenticated, connectionStatus.connected, connect]);

  return {
    connectionStatus,
    connect,
    disconnect,
    reconnect,
    isConnected: connectionStatus.connected,
    isConnecting: connectionStatus.connecting,
    error: connectionStatus.error,
  };
}