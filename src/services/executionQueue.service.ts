import { EventEmitter } from 'events';
import { logger } from '../config/logger.config';
import { n8nService } from './n8n.service';
import { executionService } from './execution.service';
import { WorkflowDefinition } from '../schemas/workflow.schema';
import { ExecutionStatus } from '../../generated/prisma';
import { AppError, ErrorCode } from '../utils/errors';

export interface QueuedExecution {
  id: string;
  executionId: string;
  workflowId: string;
  userId: string;
  workflowDefinition: WorkflowDefinition;
  inputData?: any;
  retryCount: number;
  maxRetries: number;
  priority: number;
  scheduledAt: Date;
  timeout: number; // in milliseconds
}

export interface ExecutionQueueOptions {
  maxConcurrentExecutions?: number;
  defaultTimeout?: number;
  defaultMaxRetries?: number;
  retryDelayBase?: number;
  retryDelayMax?: number;
}

export class ExecutionQueueService extends EventEmitter {
  private queue: QueuedExecution[] = [];
  private runningExecutions = new Map<string, NodeJS.Timeout>();
  private readonly maxConcurrentExecutions: number;
  private readonly defaultTimeout: number;
  private readonly defaultMaxRetries: number;
  private readonly retryDelayBase: number;
  private readonly retryDelayMax: number;
  private isProcessing = false;

  constructor(options: ExecutionQueueOptions = {}) {
    super();
    
    this.maxConcurrentExecutions = options.maxConcurrentExecutions || 5;
    this.defaultTimeout = options.defaultTimeout || 300000; // 5 minutes
    this.defaultMaxRetries = options.defaultMaxRetries || 3;
    this.retryDelayBase = options.retryDelayBase || 1000; // 1 second
    this.retryDelayMax = options.retryDelayMax || 60000; // 1 minute

    // Start processing queue
    this.startProcessing();
  }

  /**
   * Add execution to queue
   */
  async enqueue(
    executionId: string,
    workflowId: string,
    userId: string,
    workflowDefinition: WorkflowDefinition,
    inputData?: any,
    options: {
      priority?: number;
      timeout?: number;
      maxRetries?: number;
    } = {}
  ): Promise<void> {
    const queuedExecution: QueuedExecution = {
      id: `${executionId}-${Date.now()}`,
      executionId,
      workflowId,
      userId,
      workflowDefinition,
      inputData,
      retryCount: 0,
      maxRetries: options.maxRetries || this.defaultMaxRetries,
      priority: options.priority || 0,
      scheduledAt: new Date(),
      timeout: options.timeout || this.defaultTimeout,
    };

    // Insert in priority order (higher priority first)
    const insertIndex = this.queue.findIndex(item => item.priority < queuedExecution.priority);
    if (insertIndex === -1) {
      this.queue.push(queuedExecution);
    } else {
      this.queue.splice(insertIndex, 0, queuedExecution);
    }

    logger.info(`Execution ${executionId} added to queue`, {
      queueLength: this.queue.length,
      priority: queuedExecution.priority,
    });

    this.emit('enqueued', queuedExecution);
    this.processQueue();
  }

  /**
   * Cancel execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    // Remove from queue if not started
    const queueIndex = this.queue.findIndex(item => item.executionId === executionId);
    if (queueIndex !== -1) {
      const removed = this.queue.splice(queueIndex, 1)[0];
      logger.info(`Execution ${executionId} removed from queue`);
      
      // Update execution status
      await executionService.updateExecutionStatus(executionId, ExecutionStatus.CANCELLED);
      this.emit('cancelled', removed);
      return true;
    }

    // Cancel running execution
    const timeout = this.runningExecutions.get(executionId);
    if (timeout) {
      clearTimeout(timeout);
      this.runningExecutions.delete(executionId);
      
      try {
        // Try to cancel in n8n
        await n8nService.cancelExecution(executionId);
      } catch (error) {
        logger.warn(`Failed to cancel execution ${executionId} in n8n:`, error);
      }

      // Update execution status
      await executionService.updateExecutionStatus(executionId, ExecutionStatus.CANCELLED);
      logger.info(`Running execution ${executionId} cancelled`);
      this.emit('cancelled', { executionId });
      return true;
    }

    return false;
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      runningExecutions: this.runningExecutions.size,
      maxConcurrentExecutions: this.maxConcurrentExecutions,
    };
  }

  /**
   * Start processing queue
   */
  private startProcessing(): void {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.processQueue();
  }

  /**
   * Process queue items
   */
  private async processQueue(): Promise<void> {
    if (this.runningExecutions.size >= this.maxConcurrentExecutions) {
      return;
    }

    const nextExecution = this.queue.shift();
    if (!nextExecution) {
      return;
    }

    // Check if execution should be delayed (for retries)
    const now = new Date();
    if (nextExecution.scheduledAt > now) {
      // Re-queue for later
      const delay = nextExecution.scheduledAt.getTime() - now.getTime();
      setTimeout(() => {
        this.queue.unshift(nextExecution);
        this.processQueue();
      }, delay);
      return;
    }

    // Execute
    this.executeWorkflow(nextExecution);

    // Continue processing
    setImmediate(() => this.processQueue());
  }

  /**
   * Execute workflow
   */
  private async executeWorkflow(queuedExecution: QueuedExecution): Promise<void> {
    const { executionId, workflowDefinition, inputData } = queuedExecution;

    try {
      logger.info(`Starting execution ${executionId}`, {
        workflowId: queuedExecution.workflowId,
        retryCount: queuedExecution.retryCount,
      });

      // Set timeout
      const timeoutHandle = setTimeout(() => {
        this.handleExecutionTimeout(queuedExecution);
      }, queuedExecution.timeout);

      this.runningExecutions.set(executionId, timeoutHandle);

      // Update execution status to running
      await executionService.updateExecutionStatus(executionId, ExecutionStatus.RUNNING);

      // Execute workflow in n8n
      const result = await n8nService.executeWorkflow(workflowDefinition, inputData);

      // Clear timeout
      clearTimeout(timeoutHandle);
      this.runningExecutions.delete(executionId);

      // Update execution with result
      await executionService.updateExecutionWithResult(
        executionId,
        ExecutionStatus.SUCCESS,
        result.data?.resultData?.runData,
        undefined
      );

      logger.info(`Execution ${executionId} completed successfully`);
      this.emit('completed', { executionId, status: 'success', result });

    } catch (error) {
      // Clear timeout
      const timeoutHandle = this.runningExecutions.get(executionId);
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        this.runningExecutions.delete(executionId);
      }

      await this.handleExecutionError(queuedExecution, error);
    }
  }

  /**
   * Handle execution timeout
   */
  private async handleExecutionTimeout(queuedExecution: QueuedExecution): Promise<void> {
    const { executionId } = queuedExecution;
    
    logger.warn(`Execution ${executionId} timed out`);
    this.runningExecutions.delete(executionId);

    try {
      // Try to cancel in n8n
      await n8nService.cancelExecution(executionId);
    } catch (error) {
      logger.warn(`Failed to cancel timed out execution ${executionId}:`, error);
    }

    // Retry or fail
    const timeoutError = new AppError(
      ErrorCode.EXECUTION_FAILED,
      `Execution timed out after ${queuedExecution.timeout}ms`,
      408
    );

    await this.handleExecutionError(queuedExecution, timeoutError);
  }

  /**
   * Handle execution error with retry logic
   */
  private async handleExecutionError(queuedExecution: QueuedExecution, error: any): Promise<void> {
    const { executionId, retryCount, maxRetries } = queuedExecution;

    logger.error(`Execution ${executionId} failed:`, error);

    // Check if we should retry
    if (retryCount < maxRetries && this.isRetryableError(error)) {
      const nextRetryCount = retryCount + 1;
      const delay = this.calculateRetryDelay(nextRetryCount);
      const scheduledAt = new Date(Date.now() + delay);

      logger.info(`Scheduling retry ${nextRetryCount}/${maxRetries} for execution ${executionId} in ${delay}ms`);

      // Re-queue with updated retry count and scheduled time
      const retryExecution: QueuedExecution = {
        ...queuedExecution,
        retryCount: nextRetryCount,
        scheduledAt,
      };

      // Insert at beginning to prioritize retries
      this.queue.unshift(retryExecution);
      this.emit('retrying', { executionId, retryCount: nextRetryCount, delay });

    } else {
      // Max retries reached or non-retryable error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await executionService.updateExecutionWithResult(
        executionId,
        ExecutionStatus.FAILED,
        undefined,
        errorMessage
      );

      logger.error(`Execution ${executionId} failed permanently after ${retryCount} retries`);
      this.emit('failed', { executionId, error: errorMessage, retryCount });
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (error instanceof AppError) {
      // Don't retry validation errors or client errors
      return ![
        ErrorCode.VALIDATION_ERROR,
        ErrorCode.INVALID_INPUT,
        ErrorCode.UNAUTHORIZED,
        ErrorCode.FORBIDDEN,
      ].includes(error.code);
    }

    // Retry network errors and server errors by default
    return true;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    const delay = this.retryDelayBase * Math.pow(2, retryCount - 1);
    const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
    return Math.min(delay + jitter, this.retryDelayMax);
  }

  /**
   * Stop processing and clear queue
   */
  async shutdown(): Promise<void> {
    this.isProcessing = false;
    
    // Cancel all running executions
    for (const [executionId, timeout] of this.runningExecutions) {
      clearTimeout(timeout);
      try {
        await this.cancelExecution(executionId);
      } catch (error) {
        logger.error(`Error cancelling execution ${executionId} during shutdown:`, error);
      }
    }

    this.runningExecutions.clear();
    this.queue.length = 0;
    
    logger.info('Execution queue service shut down');
  }
}

// Export singleton instance
export const executionQueueService = new ExecutionQueueService();