import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';
import { websocketService } from '../../services/websocket.service';
import { useWebSocketConnection } from '../useWebSocketConnection';

// Mock the websocket service
jest.mock('../../services/websocket.service');
const mockWebsocketService = websocketService as jest.Mocked<typeof websocketService>;

// Mock the useWebSocketConnection hook
jest.mock('../useWebSocketConnection');
const mockUseWebSocketConnection = useWebSocketConnection as jest.MockedFunction<typeof useWebSocketConnection>;

describe('useWebSocket', () => {
  const mockConnectionHook = {
    connectionStatus: 'connected' as const,
    connect: jest.fn(),
    disconnect: jest.fn(),
    reconnect: jest.fn(),
    isConnected: true,
    isConnecting: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWebSocketConnection.mockReturnValue(mockConnectionHook);
  });

  it('should initialize with default options', () => {
    const { result } = renderHook(() => useWebSocket());

    expect(result.current.connectionStatus).toBe('connected');
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isConnecting).toBe(false);
    expect(mockUseWebSocketConnection).toHaveBeenCalledWith({ autoConnect: true });
  });

  it('should initialize with custom options', () => {
    const options = {
      autoConnect: false,
      events: [
        {
          event: 'execution:started' as const,
          handler: jest.fn(),
        },
      ],
    };

    renderHook(() => useWebSocket(options));

    expect(mockUseWebSocketConnection).toHaveBeenCalledWith({ autoConnect: false });
    expect(mockWebsocketService.on).toHaveBeenCalledWith('execution:started', options.events[0].handler);
  });

  it('should register and cleanup event handlers', () => {
    const handler = jest.fn();
    const options = {
      events: [
        {
          event: 'execution:completed' as const,
          handler,
        },
      ],
    };

    const { unmount } = renderHook(() => useWebSocket(options));

    expect(mockWebsocketService.on).toHaveBeenCalledWith('execution:completed', handler);

    unmount();

    expect(mockWebsocketService.off).toHaveBeenCalledWith('execution:completed', handler);
  });

  it('should provide connection management functions', () => {
    const { result } = renderHook(() => useWebSocket());

    expect(typeof result.current.connect).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
    expect(typeof result.current.reconnect).toBe('function');

    act(() => {
      result.current.connect();
    });
    expect(mockConnectionHook.connect).toHaveBeenCalled();

    act(() => {
      result.current.disconnect();
    });
    expect(mockConnectionHook.disconnect).toHaveBeenCalled();

    act(() => {
      result.current.reconnect();
    });
    expect(mockConnectionHook.reconnect).toHaveBeenCalled();
  });

  it('should provide event handling functions', () => {
    const { result } = renderHook(() => useWebSocket());
    const handler = jest.fn();

    act(() => {
      const cleanup = result.current.on('execution:started', handler);
      expect(mockWebsocketService.on).toHaveBeenCalledWith('execution:started', handler);

      cleanup();
      expect(mockWebsocketService.off).toHaveBeenCalledWith('execution:started', handler);
    });

    act(() => {
      result.current.off('execution:started', handler);
    });
    expect(mockWebsocketService.off).toHaveBeenCalledWith('execution:started', handler);
  });

  it('should provide emit function', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.emit('test-event', { data: 'test' });
    });

    expect(mockWebsocketService.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
  });

  it('should provide room management functions', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.joinExecutionRoom('execution-123');
    });
    expect(mockWebsocketService.joinExecutionRoom).toHaveBeenCalledWith('execution-123');

    act(() => {
      result.current.leaveExecutionRoom('execution-123');
    });
    expect(mockWebsocketService.leaveExecutionRoom).toHaveBeenCalledWith('execution-123');

    act(() => {
      result.current.joinWorkflowRoom('workflow-456');
    });
    expect(mockWebsocketService.joinWorkflowRoom).toHaveBeenCalledWith('workflow-456');

    act(() => {
      result.current.leaveWorkflowRoom('workflow-456');
    });
    expect(mockWebsocketService.leaveWorkflowRoom).toHaveBeenCalledWith('workflow-456');
  });

  it('should handle connection status changes', () => {
    const { rerender } = renderHook(() => useWebSocket());

    // Simulate connection status change
    mockUseWebSocketConnection.mockReturnValue({
      ...mockConnectionHook,
      connectionStatus: 'connecting',
      isConnected: false,
      isConnecting: true,
    });

    rerender();

    const { result } = renderHook(() => useWebSocket());
    expect(result.current.connectionStatus).toBe('connecting');
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(true);
  });

  it('should handle multiple event registrations', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    const options = {
      events: [
        {
          event: 'execution:started' as const,
          handler: handler1,
        },
        {
          event: 'execution:completed' as const,
          handler: handler2,
        },
      ],
    };

    const { unmount } = renderHook(() => useWebSocket(options));

    expect(mockWebsocketService.on).toHaveBeenCalledWith('execution:started', handler1);
    expect(mockWebsocketService.on).toHaveBeenCalledWith('execution:completed', handler2);

    unmount();

    expect(mockWebsocketService.off).toHaveBeenCalledWith('execution:started', handler1);
    expect(mockWebsocketService.off).toHaveBeenCalledWith('execution:completed', handler2);
  });
});