import { getWebSocketServer } from '../websocket/socketServer';
import { logger } from '../config/logger.config';
import { 
  ExecutionStartedEvent, 
  ExecutionProgressEvent, 
  ExecutionCompletedEvent, 
  ExecutionFailedEvent,
  ExecutionLogEvent,
  WorkflowExecutionStartedEvent,
  WorkflowExecutionCompletedEvent
} from '../types/websocket.types';

export class WebSocketService {
  private getServer() {
    try {
      return getWebSocketServer();
    } catch (error) {
      logger.warn('WebSocket server not available:', error);
      return null;
    }
  }

  /**
   * Emit execution started event
   */
  public emitExecutionStarted(userId: string, data: ExecutionStartedEvent): void {
    const server = this.getServer();
    if (!server) return;

    try {
      // Emit to user's personal room
      server.emitToUser(userId, 'execution:started', data);
      
      // Emit to execution room
      server.emitToExecution(data.executionId, 'execution:started', data);
      
      // Emit to workflow room
      server.emitToWorkflow(data.workflowId, 'workflow:execution:started', {
        workflowId: data.workflowId,
        executionId: data.executionId,
        workflowName: data.workflowName,
        startedAt: data.startedAt
      });

      logger.info(`Emitted execution started event for execution ${data.executionId}`);
    } catch (error) {
      logger.error('Error emitting execution started event:', error);
    }
  }

  /**
   * Emit execution progress event
   */
  public emitExecutionProgress(userId: string, data: ExecutionProgressEvent): void {
    const server = this.getServer();
    if (!server) return;

    try {
      // Emit to user's personal room
      server.emitToUser(userId, 'execution:progress', data);
      
      // Emit to execution room
      server.emitToExecution(data.executionId, 'execution:progress', data);

      logger.debug(`Emitted execution progress event for execution ${data.executionId}: ${data.progress}%`);
    } catch (error) {
      logger.error('Error emitting execution progress event:', error);
    }
  }

  /**
   * Emit execution completed event
   */
  public emitExecutionCompleted(userId: string, data: ExecutionCompletedEvent): void {
    const server = this.getServer();
    if (!server) return;

    try {
      // Emit to user's personal room
      server.emitToUser(userId, 'execution:completed', data);
      
      // Emit to execution room
      server.emitToExecution(data.executionId, 'execution:completed', data);
      
      // Emit to workflow room
      server.emitToWorkflow(data.workflowId, 'workflow:execution:completed', {
        workflowId: data.workflowId,
        executionId: data.executionId,
        status: data.status,
        finishedAt: data.finishedAt,
        duration: data.duration
      });

      logger.info(`Emitted execution completed event for execution ${data.executionId} with status ${data.status}`);
    } catch (error) {
      logger.error('Error emitting execution completed event:', error);
    }
  }

  /**
   * Emit execution failed event
   */
  public emitExecutionFailed(userId: string, data: ExecutionFailedEvent): void {
    const server = this.getServer();
    if (!server) return;

    try {
      // Emit to user's personal room
      server.emitToUser(userId, 'execution:failed', data);
      
      // Emit to execution room
      server.emitToExecution(data.executionId, 'execution:failed', data);
      
      // Emit to workflow room
      server.emitToWorkflow(data.workflowId, 'workflow:execution:completed', {
        workflowId: data.workflowId,
        executionId: data.executionId,
        status: 'FAILED',
        finishedAt: data.finishedAt,
        duration: data.duration
      });

      logger.info(`Emitted execution failed event for execution ${data.executionId}`);
    } catch (error) {
      logger.error('Error emitting execution failed event:', error);
    }
  }

  /**
   * Emit execution log event
   */
  public emitExecutionLog(userId: string, data: ExecutionLogEvent): void {
    const server = this.getServer();
    if (!server) return;

    try {
      // Emit to user's personal room
      server.emitToUser(userId, 'execution:log', data);
      
      // Emit to execution room
      server.emitToExecution(data.executionId, 'execution:log', data);

      logger.debug(`Emitted execution log event for execution ${data.executionId}: ${data.message}`);
    } catch (error) {
      logger.error('Error emitting execution log event:', error);
    }
  }

  /**
   * Emit generic error event to user
   */
  public emitError(userId: string, message: string, code?: string, details?: any): void {
    const server = this.getServer();
    if (!server) return;

    try {
      server.emitToUser(userId, 'error', {
        message,
        code,
        details
      });

      logger.warn(`Emitted error event to user ${userId}: ${message}`);
    } catch (error) {
      logger.error('Error emitting error event:', error);
    }
  }

  /**
   * Check if WebSocket server is available
   */
  public isAvailable(): boolean {
    return this.getServer() !== null;
  }

  /**
   * Get connected users count (for monitoring)
   */
  public getConnectedUsersCount(): number {
    const server = this.getServer();
    if (!server) return 0;

    try {
      return server.getIO().sockets.sockets.size;
    } catch (error) {
      logger.error('Error getting connected users count:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();