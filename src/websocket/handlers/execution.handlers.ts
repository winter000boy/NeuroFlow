import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../socketServer';
import { logger } from '../../config/logger.config';
import { executionRepository, workflowRepository } from '../../repositories';
import { ClientToServerEvents, ServerToClientEvents } from '../../types/websocket.types';

export const executionHandlers = (socket: AuthenticatedSocket, io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>) => {
  // Subscribe to execution updates
  socket.on('execution:subscribe', async (data: { executionId: string }) => {
    try {
      const { executionId } = data;
      
      // Verify user has access to this execution
      const execution = await executionRepository.findById(executionId);
      
      if (!execution) {
        socket.emit('error', { 
          message: 'Execution not found',
          code: 'EXECUTION_NOT_FOUND'
        });
        return;
      }

      if (execution.userId !== socket.userId) {
        socket.emit('error', { 
          message: 'Access denied to execution',
          code: 'ACCESS_DENIED'
        });
        return;
      }

      // Join execution room
      socket.join(`execution:${executionId}`);
      
      logger.info(`User ${socket.userId} subscribed to execution ${executionId}`);
      
      // Calculate progress based on status
      let progress = 0;
      switch (execution.status) {
        case 'PENDING':
          progress = 0;
          break;
        case 'RUNNING':
          progress = 50; // Default progress for running executions
          break;
        case 'SUCCESS':
          progress = 100;
          break;
        case 'FAILED':
        case 'CANCELLED':
          progress = 0;
          break;
        default:
          progress = 0;
      }
      
      // Send current execution status
      socket.emit('execution:status', {
        executionId,
        status: execution.status,
        startedAt: execution.startedAt,
        finishedAt: execution.finishedAt || undefined,
        progress,
        message: execution.errorMessage || undefined
      });
      
      // If execution is running, send periodic progress updates
      if (execution.status === 'RUNNING') {
        socket.emit('execution:progress', {
          executionId,
          progress,
          currentStep: 'Processing workflow...',
          message: 'Execution in progress'
        });
      }
      
    } catch (error) {
      logger.error('Error subscribing to execution:', error);
      socket.emit('error', { 
        message: 'Failed to subscribe to execution',
        code: 'SUBSCRIPTION_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Unsubscribe from execution updates
  socket.on('execution:unsubscribe', (data: { executionId: string }) => {
    const { executionId } = data;
    socket.leave(`execution:${executionId}`);
    logger.info(`User ${socket.userId} unsubscribed from execution ${executionId}`);
  });

  // Subscribe to workflow executions
  socket.on('workflow:subscribe', async (data: { workflowId: string }) => {
    try {
      const { workflowId } = data;
      
      // Verify user has access to this workflow
      const workflow = await workflowRepository.findByIdAndUserId(workflowId, socket.userId);
      
      if (!workflow) {
        socket.emit('error', { 
          message: 'Workflow not found or access denied',
          code: 'WORKFLOW_ACCESS_DENIED'
        });
        return;
      }

      // Join workflow room
      socket.join(`workflow:${workflowId}`);
      
      logger.info(`User ${socket.userId} subscribed to workflow ${workflowId}`);
      
      // Get recent executions for this workflow
      const recentExecutions = await executionRepository.findByWorkflowId(workflowId, { page: 1, limit: 5 });
      
      // Send workflow status with recent executions
      socket.emit('workflow:execution:started', {
        workflowId,
        executionId: '', // Will be filled when actual execution starts
        workflowName: workflow.name,
        startedAt: new Date()
      });
      
    } catch (error) {
      logger.error('Error subscribing to workflow:', error);
      socket.emit('error', { 
        message: 'Failed to subscribe to workflow',
        code: 'WORKFLOW_SUBSCRIPTION_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Unsubscribe from workflow updates
  socket.on('workflow:unsubscribe', (data: { workflowId: string }) => {
    const { workflowId } = data;
    socket.leave(`workflow:${workflowId}`);
    logger.info(`User ${socket.userId} unsubscribed from workflow ${workflowId}`);
  });

  // Get execution logs (for real-time log streaming)
  socket.on('execution:getLogs', async (data: { executionId: string }) => {
    try {
      const { executionId } = data;
      
      // Verify user has access to this execution
      const execution = await executionRepository.findById(executionId);
      
      if (!execution || execution.userId !== socket.userId) {
        socket.emit('error', { 
          message: 'Access denied to execution logs',
          code: 'LOG_ACCESS_DENIED'
        });
        return;
      }

      // For now, send basic log information
      // In a real implementation, you'd have a separate logs table/service
      const logEntries: Array<{
        executionId: string;
        timestamp: Date;
        level: 'info' | 'warn' | 'error' | 'debug';
        message: string;
        data?: any;
      }> = [
        {
          executionId,
          timestamp: execution.startedAt,
          level: 'info',
          message: 'Execution started',
          data: { inputData: execution.inputData }
        }
      ];

      if (execution.finishedAt) {
        logEntries.push({
          executionId,
          timestamp: execution.finishedAt,
          level: execution.status === 'SUCCESS' ? 'info' : 'error',
          message: execution.status === 'SUCCESS' ? 'Execution completed successfully' : 'Execution failed',
          data: { 
            outputData: execution.outputData,
            errorMessage: execution.errorMessage
          }
        });
      }

      // Send log entries
      logEntries.forEach(logEntry => {
        socket.emit('execution:log', logEntry);
      });
      
    } catch (error) {
      logger.error('Error getting execution logs:', error);
      socket.emit('error', { 
        message: 'Failed to get execution logs',
        code: 'LOG_RETRIEVAL_ERROR'
      });
    }
  });

  // Handle connection health check
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // Handle client reconnection
  socket.on('reconnect', () => {
    logger.info(`User ${socket.userId} reconnected via WebSocket`);
    // Rejoin user to their personal room
    socket.join(`user:${socket.userId}`);
  });

  // Handle connection errors
  socket.on('connect_error', (error) => {
    logger.error(`WebSocket connection error for user ${socket.userId}:`, error);
  });
};