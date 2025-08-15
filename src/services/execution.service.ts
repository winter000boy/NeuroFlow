import { executionRepository } from '../repositories';
import { workflowRepository } from '../repositories';
import { ExecutionStatus, Execution } from '../../generated/prisma';
import {
  CreateExecutionDTO,
  UpdateExecutionDTO,
  ExecutionFilterDTO,
  ExecutionSortDTO,
  PaginationDTO,
  PaginatedResult,
  ExecutionAnalytics,
} from '../types/execution.types';
import { AppError, ErrorCode } from '../utils/errors';
import { logger } from '../config/logger.config';
import axios from 'axios';
import { N8N_CONFIG } from '../config';

export class ExecutionService {
  /**
   * Create a new execution
   */
  async createExecution(data: CreateExecutionDTO): Promise<Execution> {
    try {
      // Validate that the workflow exists and belongs to the user
      const workflow = await workflowRepository.findById(data.workflowId);
      if (!workflow) {
        throw new AppError(
          ErrorCode.WORKFLOW_NOT_FOUND,
          'Workflow not found',
          404
        );
      }

      if (workflow.userId !== data.userId) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          'Access denied to workflow',
          403
        );
      }

      // Create execution record
      const execution = await executionRepository.create(data);

      logger.info('Execution created', {
        executionId: execution.id,
        workflowId: data.workflowId,
        userId: data.userId,
      });

      return execution;
    } catch (error) {
      logger.error('Failed to create execution', {
        workflowId: data.workflowId,
        userId: data.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Trigger workflow execution via n8n
   */
  async triggerExecution(workflowId: string, userId: string, inputData: Record<string, unknown> = {}): Promise<Execution> {
    try {
      // Create execution record first
      const execution = await this.createExecution({
        workflowId,
        userId,
        status: ExecutionStatus.PENDING,
        inputData,
      });

      // Update status to RUNNING
      await this.updateExecutionStatus(execution.id, ExecutionStatus.RUNNING);

      try {
        // Call n8n webhook to execute workflow
        const n8nResponse = await axios.post(
          `${N8N_CONFIG.baseUrl}/webhook/${workflowId}`,
          {
            executionId: execution.id,
            ...inputData,
          },
          {
            timeout: 30000, // 30 second timeout for initial trigger
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        // Update execution with n8n execution ID if provided
        if (n8nResponse.data?.executionId) {
          await executionRepository.update(execution.id, {
            n8nExecutionId: n8nResponse.data.executionId,
          });
        }

        logger.info('Workflow execution triggered successfully', {
          executionId: execution.id,
          workflowId,
          n8nExecutionId: n8nResponse.data?.executionId,
        });

        return await executionRepository.findById(execution.id) || execution;
      } catch (n8nError) {
        // Update execution status to failed if n8n call fails
        const errorMessage = n8nError instanceof Error ? n8nError.message : 'n8n execution failed';
        await this.updateExecutionStatus(execution.id, ExecutionStatus.FAILED, errorMessage);

        logger.error('n8n execution failed', {
          executionId: execution.id,
          workflowId,
          error: errorMessage,
        });

        throw new AppError(
          ErrorCode.N8N_UNAVAILABLE,
          `Failed to trigger workflow execution: ${errorMessage}`,
          503
        );
      }
    } catch (error) {
      logger.error('Failed to trigger execution', {
        workflowId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update execution status with logging
   */
  async updateExecutionStatus(
    executionId: string,
    status: ExecutionStatus,
    errorMessage?: string,
    outputData?: any
  ): Promise<Execution> {
    try {
      const updateData: UpdateExecutionDTO = {
        status,
        errorMessage,
        outputData,
      };

      const execution = await executionRepository.update(executionId, updateData);

      logger.info('Execution status updated', {
        executionId,
        status,
        hasError: !!errorMessage,
        hasOutput: !!outputData,
      });

      return execution;
    } catch (error) {
      logger.error('Failed to update execution status', {
        executionId,
        status,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Complete execution with success
   */
  async completeExecution(executionId: string, outputData?: any): Promise<Execution> {
    return this.updateExecutionStatus(executionId, ExecutionStatus.SUCCESS, undefined, outputData);
  }

  /**
   * Fail execution with error
   */
  async failExecution(executionId: string, errorMessage: string): Promise<Execution> {
    return this.updateExecutionStatus(executionId, ExecutionStatus.FAILED, errorMessage);
  }

  /**
   * Cancel execution
   */
  async cancelExecution(executionId: string, userId: string): Promise<Execution> {
    try {
      const execution = await executionRepository.findById(executionId);
      if (!execution) {
        throw new AppError(
          ErrorCode.EXECUTION_NOT_FOUND,
          'Execution not found',
          404
        );
      }

      // Check if user has permission to cancel this execution
      if (execution.userId !== userId) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          'Access denied to execution',
          403
        );
      }

      // Only allow cancellation of pending or running executions
      if (!['PENDING', 'RUNNING'].includes(execution.status)) {
        throw new AppError(
          ErrorCode.INVALID_INPUT,
          'Cannot cancel execution that is not pending or running',
          400
        );
      }

      const cancelledExecution = await executionRepository.cancel(executionId);

      logger.info('Execution cancelled', {
        executionId,
        userId,
        previousStatus: execution.status,
      });

      return cancelledExecution;
    } catch (error) {
      logger.error('Failed to cancel execution', {
        executionId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get execution by ID with permission check
   */
  async getExecution(executionId: string, userId: string): Promise<Execution> {
    try {
      const execution = await executionRepository.findById(executionId);
      if (!execution) {
        throw new AppError(
          ErrorCode.EXECUTION_NOT_FOUND,
          'Execution not found',
          404
        );
      }

      // Check if user has permission to view this execution
      if (execution.userId !== userId) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          'Access denied to execution',
          403
        );
      }

      return execution;
    } catch (error) {
      logger.error('Failed to get execution', {
        executionId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get executions with filtering, sorting, and pagination
   */
  async getExecutions(
    userId: string,
    filters: Omit<ExecutionFilterDTO, 'userId'> = {},
    sort: ExecutionSortDTO = { field: 'startedAt', direction: 'desc' },
    pagination: PaginationDTO = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<Execution>> {
    try {
      // Add userId to filters to ensure user can only see their executions
      const userFilters: ExecutionFilterDTO = {
        ...filters,
        userId,
      };

      return await executionRepository.findMany(userFilters, sort, pagination);
    } catch (error) {
      logger.error('Failed to get executions', {
        userId,
        filters,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get executions for a specific workflow
   */
  async getWorkflowExecutions(
    workflowId: string,
    userId: string,
    pagination: PaginationDTO = { page: 1, limit: 20 },
    sort: ExecutionSortDTO = { field: 'startedAt', direction: 'desc' }
  ): Promise<PaginatedResult<Execution>> {
    try {
      // Verify user has access to the workflow
      const workflow = await workflowRepository.findById(workflowId);
      if (!workflow) {
        throw new AppError(
          ErrorCode.WORKFLOW_NOT_FOUND,
          'Workflow not found',
          404
        );
      }

      if (workflow.userId !== userId) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          'Access denied to workflow',
          403
        );
      }

      return await executionRepository.findByWorkflowId(workflowId, pagination, sort);
    } catch (error) {
      logger.error('Failed to get workflow executions', {
        workflowId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get recent executions for a user
   */
  async getRecentExecutions(userId: string, limit: number = 10): Promise<Execution[]> {
    try {
      return await executionRepository.getRecentExecutions(userId, limit);
    } catch (error) {
      logger.error('Failed to get recent executions', {
        userId,
        limit,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get running executions for a user
   */
  async getRunningExecutions(userId: string): Promise<Execution[]> {
    try {
      return await executionRepository.getRunningExecutions(userId);
    } catch (error) {
      logger.error('Failed to get running executions', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get execution analytics for a user
   */
  async getUserAnalytics(userId: string): Promise<ExecutionAnalytics> {
    try {
      return await executionRepository.getAnalytics({ userId });
    } catch (error) {
      logger.error('Failed to get user analytics', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get execution analytics for a specific workflow
   */
  async getWorkflowAnalytics(workflowId: string, userId: string): Promise<ExecutionAnalytics> {
    try {
      // Verify user has access to the workflow
      const workflow = await workflowRepository.findById(workflowId);
      if (!workflow) {
        throw new AppError(
          ErrorCode.WORKFLOW_NOT_FOUND,
          'Workflow not found',
          404
        );
      }

      if (workflow.userId !== userId) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          'Access denied to workflow',
          403
        );
      }

      return await executionRepository.getAnalytics({ workflowId });
    } catch (error) {
      logger.error('Failed to get workflow analytics', {
        workflowId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Retry a failed execution
   */
  async retryExecution(executionId: string, userId: string): Promise<Execution> {
    try {
      const originalExecution = await this.getExecution(executionId, userId);

      // Only allow retry of failed executions
      if (originalExecution.status !== ExecutionStatus.FAILED) {
        throw new AppError(
          ErrorCode.INVALID_INPUT,
          'Can only retry failed executions',
          400
        );
      }

      // Create a new execution with the same input data
      const inputData = originalExecution.inputData as Record<string, unknown> || {};
      const newExecution = await this.triggerExecution(
        originalExecution.workflowId,
        userId,
        inputData
      );

      logger.info('Execution retried', {
        originalExecutionId: executionId,
        newExecutionId: newExecution.id,
        workflowId: originalExecution.workflowId,
        userId,
      });

      return newExecution;
    } catch (error) {
      logger.error('Failed to retry execution', {
        executionId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete execution (soft delete by updating status)
   */
  async deleteExecution(executionId: string, userId: string): Promise<void> {
    try {
      const execution = await this.getExecution(executionId, userId);

      // Don't allow deletion of running executions
      if (execution.status === ExecutionStatus.RUNNING) {
        throw new AppError(
          ErrorCode.INVALID_INPUT,
          'Cannot delete running execution. Cancel it first.',
          400
        );
      }

      await executionRepository.delete(executionId);

      logger.info('Execution deleted', {
        executionId,
        userId,
        workflowId: execution.workflowId,
      });
    } catch (error) {
      logger.error('Failed to delete execution', {
        executionId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Handle n8n webhook callback
   */
  async handleWebhookCallback(
    executionId: string,
    status: 'success' | 'failed',
    data?: any,
    error?: string
  ): Promise<void> {
    try {
      const execution = await executionRepository.findById(executionId);
      if (!execution) {
        logger.warn('Received webhook for non-existent execution', { executionId });
        return;
      }

      const newStatus = status === 'success' ? ExecutionStatus.SUCCESS : ExecutionStatus.FAILED;
      
      await this.updateExecutionStatus(
        executionId,
        newStatus,
        error,
        data
      );

      logger.info('Webhook callback processed', {
        executionId,
        status: newStatus,
        hasData: !!data,
        hasError: !!error,
      });
    } catch (error) {
      logger.error('Failed to process webhook callback', {
        executionId,
        status,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

// Export singleton instance
export const executionService = new ExecutionService();

// Export legacy functions for backward compatibility
export const trigger = (workflowId: string, userId: string, payload: Record<string, unknown>) =>
  executionService.triggerExecution(workflowId, userId, payload);

export const getStatus = (id: string, userId: string) =>
  executionService.getExecution(id, userId);
