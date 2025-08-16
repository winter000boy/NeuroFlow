import { executionQueueService } from './executionQueue.service';
import { executionService } from './execution.service';
import { workflowService } from './workflow.service';
import { ExecutionStatus } from '../../generated/prisma';
import { logger } from '../config/logger.config';
import { AppError, ErrorCode } from '../utils/errors';

export interface ExecuteWorkflowOptions {
  priority?: number;
  timeout?: number;
  maxRetries?: number;
  inputData?: any;
}

export class WorkflowExecutionService {
  constructor() {
    // Set up event listeners for queue events
    this.setupQueueEventListeners();
  }

  /**
   * Execute a workflow through the queue system
   */
  async executeWorkflow(
    workflowId: string,
    userId: string,
    options: ExecuteWorkflowOptions = {}
  ): Promise<string> {
    try {
      // Get workflow and validate access
      const workflow = await workflowService.getWorkflowById(workflowId, userId);
      
      if (workflow.status !== 'ACTIVE') {
        throw new AppError(
          ErrorCode.INVALID_INPUT,
          'Cannot execute inactive workflow',
          400
        );
      }

      // Create execution record
      const execution = await executionService.createExecution({
        workflowId,
        userId,
        status: ExecutionStatus.PENDING,
        inputData: options.inputData,
      });

      // Add to execution queue
      await executionQueueService.enqueue(
        execution.id,
        workflowId,
        userId,
        workflow.definition as any, // Type assertion needed due to Prisma JsonValue type
        options.inputData,
        {
          priority: options.priority,
          timeout: options.timeout,
          maxRetries: options.maxRetries,
        }
      );

      logger.info('Workflow execution queued', {
        executionId: execution.id,
        workflowId,
        userId,
        priority: options.priority,
      });

      return execution.id;
    } catch (error) {
      logger.error('Failed to queue workflow execution', {
        workflowId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Execute workflow with high priority (for immediate execution)
   */
  async executeWorkflowImmediate(
    workflowId: string,
    userId: string,
    inputData?: any
  ): Promise<string> {
    return this.executeWorkflow(workflowId, userId, {
      priority: 10, // High priority
      inputData,
    });
  }

  /**
   * Schedule workflow execution for later
   */
  async scheduleWorkflowExecution(
    workflowId: string,
    userId: string,
    scheduledAt: Date,
    inputData?: any
  ): Promise<string> {
    // For now, we'll use the queue system with normal priority
    // In a more advanced implementation, this could integrate with a job scheduler
    return this.executeWorkflow(workflowId, userId, {
      priority: 0,
      inputData,
    });
  }

  /**
   * Cancel workflow execution
   */
  async cancelWorkflowExecution(executionId: string, userId: string): Promise<boolean> {
    try {
      // Verify user has access to the execution
      await executionService.getExecution(executionId, userId);

      // Try to cancel in queue first
      const cancelledInQueue = await executionQueueService.cancelExecution(executionId);
      
      if (!cancelledInQueue) {
        // If not in queue, try to cancel through execution service
        await executionService.cancelExecution(executionId, userId);
      }

      logger.info('Workflow execution cancelled', {
        executionId,
        userId,
        cancelledInQueue,
      });

      return true;
    } catch (error) {
      logger.error('Failed to cancel workflow execution', {
        executionId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get execution queue status
   */
  getQueueStatus() {
    return executionQueueService.getQueueStatus();
  }

  /**
   * Retry failed execution
   */
  async retryExecution(executionId: string, userId: string): Promise<string> {
    try {
      // Get original execution
      const originalExecution = await executionService.getExecution(executionId, userId);
      
      if (originalExecution.status !== ExecutionStatus.FAILED) {
        throw new AppError(
          ErrorCode.INVALID_INPUT,
          'Can only retry failed executions',
          400
        );
      }

      // Execute with same parameters
      const newExecutionId = await this.executeWorkflow(
        originalExecution.workflowId,
        userId,
        {
          inputData: originalExecution.inputData,
          priority: 5, // Medium-high priority for retries
        }
      );

      logger.info('Execution retry queued', {
        originalExecutionId: executionId,
        newExecutionId,
        workflowId: originalExecution.workflowId,
        userId,
      });

      return newExecutionId;
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
   * Bulk execute workflows
   */
  async bulkExecuteWorkflows(
    requests: Array<{
      workflowId: string;
      userId: string;
      inputData?: any;
      priority?: number;
    }>
  ): Promise<string[]> {
    const executionIds: string[] = [];

    for (const request of requests) {
      try {
        const executionId = await this.executeWorkflow(
          request.workflowId,
          request.userId,
          {
            inputData: request.inputData,
            priority: request.priority || 0,
          }
        );
        executionIds.push(executionId);
      } catch (error) {
        logger.error('Failed to queue workflow in bulk execution', {
          workflowId: request.workflowId,
          userId: request.userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Continue with other workflows even if one fails
      }
    }

    logger.info('Bulk workflow execution queued', {
      totalRequests: requests.length,
      successfullyQueued: executionIds.length,
    });

    return executionIds;
  }

  /**
   * Set up event listeners for queue events
   */
  private setupQueueEventListeners(): void {
    executionQueueService.on('enqueued', (queuedExecution) => {
      logger.debug('Execution enqueued', {
        executionId: queuedExecution.executionId,
        workflowId: queuedExecution.workflowId,
        priority: queuedExecution.priority,
      });
    });

    executionQueueService.on('completed', ({ executionId, status, result }) => {
      logger.info('Execution completed via queue', {
        executionId,
        status,
        hasResult: !!result,
      });
    });

    executionQueueService.on('failed', ({ executionId, error, retryCount }) => {
      logger.error('Execution failed permanently via queue', {
        executionId,
        error,
        retryCount,
      });
    });

    executionQueueService.on('retrying', ({ executionId, retryCount, delay }) => {
      logger.info('Execution retry scheduled via queue', {
        executionId,
        retryCount,
        delayMs: delay,
      });
    });

    executionQueueService.on('cancelled', (data) => {
      logger.info('Execution cancelled via queue', {
        executionId: data.executionId || data.id,
      });
    });
  }

  /**
   * Shutdown the execution pipeline
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down workflow execution service');
    await executionQueueService.shutdown();
  }
}

// Export singleton instance
export const workflowExecutionService = new WorkflowExecutionService();