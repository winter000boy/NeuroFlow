import axios, { AxiosInstance, AxiosError } from 'axios';
import { N8N_CONFIG } from '../config';
import { WorkflowDefinition } from '../schemas/workflow.schema';
import {
  N8nServiceInterface,
  N8nWorkflow,
  N8nExecution,
  N8nExecutionResult,
  N8nApiError,
  N8nExecuteWorkflowRequest,
  N8nCreateWorkflowRequest,
  N8nUpdateWorkflowRequest,
} from '../types/n8n.types';
import { AppError, ErrorCode } from '../utils/errors';
import { logger } from '../config/logger.config';

export class N8nService implements N8nServiceInterface {
  private client: AxiosInstance;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second base delay

  constructor() {
    this.client = axios.create({
      baseURL: N8N_CONFIG.baseUrl,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
        ...(N8N_CONFIG.apiKey && { 'X-N8N-API-KEY': N8N_CONFIG.apiKey }),
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`N8N API Request: ${config.method?.toUpperCase()} ${config.url}`, {
          headers: config.headers,
          data: config.data,
        });
        return config;
      },
      (error) => {
        logger.error('N8N API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`N8N API Response: ${response.status}`, {
          data: response.data,
        });
        return response;
      },
      (error) => {
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Execute a workflow with the given definition and input data
   */
  async executeWorkflow(
    workflowDefinition: WorkflowDefinition,
    inputData?: any
  ): Promise<N8nExecutionResult> {
    try {
      const payload: N8nExecuteWorkflowRequest = {
        workflowData: {
          nodes: workflowDefinition.nodes,
          connections: workflowDefinition.connections,
          settings: workflowDefinition.settings,
        },
        inputData,
      };

      const response = await this.client.post('/api/v1/workflows/run', payload);
      
      logger.info(`Workflow execution started: ${response.data.id}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to execute workflow:', error);
      throw this.transformError(error, 'Failed to execute workflow');
    }
  }

  /**
   * Get execution details by ID
   */
  async getExecution(executionId: string): Promise<N8nExecution> {
    try {
      const response = await this.client.get(`/api/v1/executions/${executionId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to get execution ${executionId}:`, error);
      throw this.transformError(error, `Failed to get execution ${executionId}`);
    }
  }

  /**
   * Get execution status by ID
   */
  async getExecutionStatus(executionId: string): Promise<'running' | 'success' | 'failed' | 'waiting'> {
    try {
      const execution = await this.getExecution(executionId);
      
      if (!execution.finished) {
        return 'running';
      }
      
      if (execution.data?.resultData?.error) {
        return 'failed';
      }
      
      return 'success';
    } catch (error) {
      logger.error(`Failed to get execution status ${executionId}:`, error);
      return 'failed';
    }
  }

  /**
   * Cancel a running execution
   */
  async cancelExecution(executionId: string): Promise<void> {
    try {
      await this.client.post(`/api/v1/executions/${executionId}/stop`);
      logger.info(`Execution ${executionId} cancelled`);
    } catch (error) {
      logger.error(`Failed to cancel execution ${executionId}:`, error);
      throw this.transformError(error, `Failed to cancel execution ${executionId}`);
    }
  }

  /**
   * Create a new workflow in n8n
   */
  async createWorkflow(name: string, definition: WorkflowDefinition): Promise<N8nWorkflow> {
    try {
      const payload: N8nCreateWorkflowRequest = {
        name,
        nodes: definition.nodes,
        connections: definition.connections,
        settings: definition.settings,
        active: false, // Start inactive by default
      };

      const response = await this.client.post('/api/v1/workflows', payload);
      logger.info(`Workflow created in n8n: ${response.data.id}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to create workflow in n8n:', error);
      throw this.transformError(error, 'Failed to create workflow in n8n');
    }
  }

  /**
   * Update an existing workflow in n8n
   */
  async updateWorkflow(workflowId: string, definition: WorkflowDefinition): Promise<N8nWorkflow> {
    try {
      const payload: N8nUpdateWorkflowRequest = {
        nodes: definition.nodes,
        connections: definition.connections,
        settings: definition.settings,
      };

      const response = await this.client.patch(`/api/v1/workflows/${workflowId}`, payload);
      logger.info(`Workflow updated in n8n: ${workflowId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to update workflow ${workflowId} in n8n:`, error);
      throw this.transformError(error, `Failed to update workflow ${workflowId} in n8n`);
    }
  }

  /**
   * Delete a workflow from n8n
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    try {
      await this.client.delete(`/api/v1/workflows/${workflowId}`);
      logger.info(`Workflow deleted from n8n: ${workflowId}`);
    } catch (error) {
      logger.error(`Failed to delete workflow ${workflowId} from n8n:`, error);
      throw this.transformError(error, `Failed to delete workflow ${workflowId} from n8n`);
    }
  }

  /**
   * Test connection to n8n instance
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/healthz');
      return response.status === 200;
    } catch (error) {
      logger.error('n8n connection test failed:', error);
      return false;
    }
  }

  /**
   * Retry mechanism with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        const delay = this.retryDelay * Math.pow(2, this.maxRetries - retries);
        logger.warn(`Retrying n8n operation in ${delay}ms. Retries left: ${retries - 1}`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryWithBackoff(operation, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (axios.isAxiosError(error)) {
      // Retry on network errors or 5xx server errors
      return !error.response || (error.response.status >= 500 && error.response.status < 600);
    }
    return false;
  }

  /**
   * Handle API errors and log them
   */
  private handleApiError(error: AxiosError): void {
    if (error.response) {
      logger.error(`N8N API Error: ${error.response.status}`, {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
        method: error.config?.method,
      });
    } else if (error.request) {
      logger.error('N8N API Network Error:', {
        message: error.message,
        url: error.config?.url,
        method: error.config?.method,
      });
    } else {
      logger.error('N8N API Request Setup Error:', error.message);
    }
  }

  /**
   * Transform axios errors to application errors
   */
  private transformError(error: any, defaultMessage: string): AppError {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        // Network error
        return new AppError(
          ErrorCode.N8N_UNAVAILABLE,
          'n8n service is unavailable',
          503
        );
      }

      const status = error.response.status;
      const data = error.response.data as N8nApiError;

      if (status === 401) {
        return new AppError(
          ErrorCode.UNAUTHORIZED,
          'Invalid n8n API credentials',
          401
        );
      }

      if (status === 404) {
        return new AppError(
          ErrorCode.WORKFLOW_NOT_FOUND,
          data.message || 'Resource not found in n8n',
          404
        );
      }

      if (status >= 400 && status < 500) {
        return new AppError(
          ErrorCode.INVALID_INPUT,
          data.message || 'Invalid request to n8n',
          status
        );
      }

      if (status >= 500) {
        return new AppError(
          ErrorCode.N8N_UNAVAILABLE,
          'n8n service error',
          503
        );
      }
    }

    return new AppError(
      ErrorCode.INTERNAL_ERROR,
      defaultMessage,
      500
    );
  }
}

// Export singleton instance
export const n8nService = new N8nService();