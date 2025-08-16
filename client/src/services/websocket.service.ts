import { io, Socket } from 'socket.io-client';
import { authService } from './auth.service';
import { store } from '../store';
import { 
  updateExecutionStatus, 
  addNewExecution, 
  setRealTimeUpdates 
} from '../store/slices/executionSlice';
import { updateWorkflowInList } from '../store/slices/workflowSlice';
import { clearCredentials } from '../store/slices/authSlice';

export interface WebSocketEvents {
  'execution:started': { 
    executionId: string; 
    workflowId: string; 
    execution: any;
  };
  'execution:progress': { 
    executionId: string; 
    progress: number; 
    message?: string; 
    currentStep?: string;
  };
  'execution:completed': { 
    executionId: string; 
    status: 'success' | 'failed'; 
    result: any; 
    finishedAt: string;
    outputData?: any;
  };
  'execution:failed': { 
    executionId: string; 
    error: string; 
    finishedAt: string;
    errorMessage: string;
  };
  'execution:cancelled': {
    executionId: string;
    finishedAt: string;
  };
  'execution:log': { 
    executionId: string; 
    log: string; 
    timestamp: string; 
    level: 'info' | 'warn' | 'error' | 'debug';
  };
  'workflow:updated': {
    workflowId: string;
    workflow: any;
  };
  'workflow:status_changed': {
    workflowId: string;
    status: 'active' | 'inactive' | 'draft';
  };
}

export type WebSocketEventName = keyof WebSocketEvents;
export type WebSocketEventHandler<T extends WebSocketEventName> = (data: WebSocketEvents[T]) => void;

export interface WebSocketConnectionStatus {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  reconnectAttempts: number;
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private connectionStatus: WebSocketConnectionStatus = {
    connected: false,
    connecting: false,
    error: null,
    reconnectAttempts: 0,
  };
  private statusChangeCallbacks: Set<(status: WebSocketConnectionStatus) => void> = new Set();

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = authService.getAccessToken();
      if (!token) {
        this.updateConnectionStatus({
          connected: false,
          connecting: false,
          error: 'No access token available',
          reconnectAttempts: this.reconnectAttempts,
        });
        reject(new Error('No access token available'));
        return;
      }

      this.updateConnectionStatus({
        connected: false,
        connecting: true,
        error: null,
        reconnectAttempts: this.reconnectAttempts,
      });

      const wsUrl = process.env.REACT_APP_WS_URL || 'http://localhost:3000';
      
      this.socket = io(wsUrl, {
        auth: {
          token
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.updateConnectionStatus({
          connected: true,
          connecting: false,
          error: null,
          reconnectAttempts: 0,
        });
        
        // Enable real-time updates in Redux
        store.dispatch(setRealTimeUpdates(true));
        
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        this.updateConnectionStatus({
          connected: false,
          connecting: false,
          error: `Disconnected: ${reason}`,
          reconnectAttempts: this.reconnectAttempts,
        });
        
        // Disable real-time updates in Redux
        store.dispatch(setRealTimeUpdates(false));
        
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, try to reconnect
          this.handleReconnect();
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        this.updateConnectionStatus({
          connected: false,
          connecting: false,
          error: error.message,
          reconnectAttempts: this.reconnectAttempts,
        });
        
        if (error.message.includes('401') || error.message.includes('unauthorized')) {
          // Try to refresh token and reconnect
          this.handleAuthError();
        } else {
          this.handleReconnect();
        }
        reject(error);
      });

      // Set up event forwarding and Redux integration
      this.setupEventForwarding();
      this.setupReduxIntegration();
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventHandlers.clear();
    this.updateConnectionStatus({
      connected: false,
      connecting: false,
      error: null,
      reconnectAttempts: 0,
    });
    
    // Disable real-time updates in Redux
    store.dispatch(setRealTimeUpdates(false));
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionStatus(): WebSocketConnectionStatus {
    return { ...this.connectionStatus };
  }

  onConnectionStatusChange(callback: (status: WebSocketConnectionStatus) => void): () => void {
    this.statusChangeCallbacks.add(callback);
    // Return unsubscribe function
    return () => {
      this.statusChangeCallbacks.delete(callback);
    };
  }

  private updateConnectionStatus(status: Partial<WebSocketConnectionStatus>): void {
    this.connectionStatus = { ...this.connectionStatus, ...status };
    this.statusChangeCallbacks.forEach(callback => {
      try {
        callback(this.connectionStatus);
      } catch (error) {
        console.error('Error in connection status callback:', error);
      }
    });
  }

  on<T extends WebSocketEventName>(event: T, handler: WebSocketEventHandler<T>): void {
    const eventKey = event as string;
    if (!this.eventHandlers.has(eventKey)) {
      this.eventHandlers.set(eventKey, new Set());
    }
    this.eventHandlers.get(eventKey)!.add(handler);
  }

  off<T extends WebSocketEventName>(event: T, handler: WebSocketEventHandler<T>): void {
    const eventKey = event as string;
    const handlers = this.eventHandlers.get(eventKey);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(eventKey);
      }
    }
  }

  emit(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected, cannot emit event:', event);
    }
  }

  // Join a room for execution-specific updates
  joinExecutionRoom(executionId: string): void {
    this.emit('join:execution', { executionId });
  }

  // Leave an execution room
  leaveExecutionRoom(executionId: string): void {
    this.emit('leave:execution', { executionId });
  }

  // Join a room for workflow-specific updates
  joinWorkflowRoom(workflowId: string): void {
    this.emit('join:workflow', { workflowId });
  }

  // Leave a workflow room
  leaveWorkflowRoom(workflowId: string): void {
    this.emit('leave:workflow', { workflowId });
  }

  private setupEventForwarding(): void {
    if (!this.socket) return;

    // Forward all events to registered handlers
    const allEvents: WebSocketEventName[] = [
      'execution:started',
      'execution:progress',
      'execution:completed',
      'execution:failed',
      'execution:cancelled',
      'execution:log',
      'workflow:updated',
      'workflow:status_changed'
    ];

    allEvents.forEach(event => {
      this.socket!.on(event, (data) => {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
          handlers.forEach(handler => {
            try {
              handler(data);
            } catch (error) {
              console.error(`Error in WebSocket event handler for ${event}:`, error);
            }
          });
        }
      });
    });
  }

  private setupReduxIntegration(): void {
    if (!this.socket) return;

    // Execution events
    this.socket.on('execution:started', (data) => {
      if (data.execution) {
        store.dispatch(addNewExecution(data.execution));
      }
    });

    this.socket.on('execution:progress', (data) => {
      store.dispatch(updateExecutionStatus({
        id: data.executionId,
        status: 'running',
      }));
    });

    this.socket.on('execution:completed', (data) => {
      store.dispatch(updateExecutionStatus({
        id: data.executionId,
        status: data.status,
        finishedAt: data.finishedAt,
        outputData: data.outputData,
      }));
    });

    this.socket.on('execution:failed', (data) => {
      store.dispatch(updateExecutionStatus({
        id: data.executionId,
        status: 'failed',
        finishedAt: data.finishedAt,
        errorMessage: data.errorMessage,
      }));
    });

    this.socket.on('execution:cancelled', (data) => {
      store.dispatch(updateExecutionStatus({
        id: data.executionId,
        status: 'cancelled',
        finishedAt: data.finishedAt,
      }));
    });

    // Workflow events
    this.socket.on('workflow:updated', (data) => {
      if (data.workflow) {
        store.dispatch(updateWorkflowInList(data.workflow));
      }
    });

    this.socket.on('workflow:status_changed', (data) => {
      // Get current workflow from store and update its status
      const state = store.getState();
      const workflow = state.workflows.workflows.find(w => w.id === data.workflowId);
      if (workflow) {
        store.dispatch(updateWorkflowInList({
          ...workflow,
          status: data.status,
        }));
      }
    });
  }

  private async handleAuthError(): Promise<void> {
    try {
      await authService.refreshToken();
      // Reconnect with new token
      this.disconnect();
      await this.connect();
    } catch (error) {
      console.error('Failed to refresh token for WebSocket:', error);
      authService.clearTokens();
      store.dispatch(clearCredentials());
      this.updateConnectionStatus({
        connected: false,
        connecting: false,
        error: 'Authentication failed',
        reconnectAttempts: this.reconnectAttempts,
      });
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.updateConnectionStatus({
        connected: false,
        connecting: false,
        error: 'Max reconnection attempts reached',
        reconnectAttempts: this.reconnectAttempts,
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.updateConnectionStatus({
      connected: false,
      connecting: true,
      error: `Reconnecting... (attempt ${this.reconnectAttempts})`,
      reconnectAttempts: this.reconnectAttempts,
    });
    
    setTimeout(() => {
      if (!this.isConnected()) {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
          this.updateConnectionStatus({
            connected: false,
            connecting: false,
            error: `Reconnection failed: ${error.message}`,
            reconnectAttempts: this.reconnectAttempts,
          });
        });
      }
    }, delay);
  }
}

export const websocketService = new WebSocketService();