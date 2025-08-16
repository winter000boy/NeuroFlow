import { apiService } from './api';
import { Execution, PaginatedResult } from '../types';

export interface ExecutionFilters {
  workflowId?: string;
  status?: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: 'startedAt' | 'finishedAt' | 'status' | 'workflowName';
  sortOrder?: 'asc' | 'desc';
}

export interface ExecutionPagination {
  page?: number;
  limit?: number;
}

export interface ExecutionQueryParams extends ExecutionFilters, ExecutionPagination {}

export interface ExecutionAnalytics {
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  executionsByStatus: Record<string, number>;
  executionTrends: Array<{
    date: string;
    count: number;
    successCount: number;
    failureCount: number;
  }>;
  topFailingWorkflows: Array<{
    workflowId: string;
    workflowName: string;
    failureCount: number;
    failureRate: number;
  }>;
  performanceMetrics: {
    fastestExecution: number;
    slowestExecution: number;
    medianExecutionTime: number;
  };
}

export interface ExecutionExportOptions {
  format: 'csv' | 'json';
  filters?: ExecutionFilters;
  fields?: string[];
}

export class ExecutionService {
  private readonly basePath = '/executions';

  /**
   * Get executions with pagination and filtering
   */
  async getExecutions(params: ExecutionQueryParams = {}): Promise<PaginatedResult<Execution>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `${this.basePath}?${queryString}` : this.basePath;
    
    return apiService.getAuthenticated<PaginatedResult<Execution>>(endpoint);
  }

  /**
   * Get execution by ID with full details
   */
  async getExecutionById(id: string): Promise<Execution> {
    return apiService.getAuthenticated<Execution>(`${this.basePath}/${id}`);
  }

  /**
   * Get executions for a specific workflow
   */
  async getWorkflowExecutions(workflowId: string, params: ExecutionQueryParams = {}): Promise<PaginatedResult<Execution>> {
    return this.getExecutions({ ...params, workflowId });
  }

  /**
   * Retry a failed execution
   */
  async retryExecution(id: string): Promise<Execution> {
    return apiService.postAuthenticated<Execution>(`${this.basePath}/${id}/retry`);
  }

  /**
   * Cancel a running execution
   */
  async cancelExecution(id: string): Promise<Execution> {
    return apiService.postAuthenticated<Execution>(`${this.basePath}/${id}/cancel`);
  }

  /**
   * Delete an execution record
   */
  async deleteExecution(id: string): Promise<void> {
    return apiService.deleteAuthenticated<void>(`${this.basePath}/${id}`);
  }

  /**
   * Get execution logs
   */
  async getExecutionLogs(id: string): Promise<{ logs: string[] }> {
    return apiService.getAuthenticated<{ logs: string[] }>(`${this.basePath}/${id}/logs`);
  }

  /**
   * Get comprehensive execution analytics
   */
  async getExecutionAnalytics(params: {
    workflowId?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}): Promise<ExecutionAnalytics> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        queryParams.append(key, value);
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString 
      ? `${this.basePath}/analytics?${queryString}` 
      : `${this.basePath}/analytics`;
    
    return apiService.getAuthenticated<ExecutionAnalytics>(endpoint);
  }

  /**
   * Get execution statistics for dashboard
   */
  async getExecutionStats(): Promise<{
    totalExecutions: number;
    runningExecutions: number;
    successRate: number;
    recentExecutions: Execution[];
  }> {
    return apiService.getAuthenticated(`${this.basePath}/stats`);
  }

  /**
   * Export executions data
   */
  async exportExecutions(options: ExecutionExportOptions): Promise<Blob> {
    const queryParams = new URLSearchParams();
    queryParams.append('format', options.format);
    
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value);
        }
      });
    }
    
    if (options.fields) {
      queryParams.append('fields', options.fields.join(','));
    }

    const response = await fetch(
      `${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}${this.basePath}/export?${queryParams}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to export executions');
    }

    return response.blob();
  }

  /**
   * Get execution timeline for a workflow
   */
  async getExecutionTimeline(workflowId: string, days: number = 30): Promise<Array<{
    date: string;
    executions: number;
    successes: number;
    failures: number;
  }>> {
    return apiService.getAuthenticated(
      `${this.basePath}/timeline?workflowId=${workflowId}&days=${days}`
    );
  }

  /**
   * Get execution performance metrics
   */
  async getPerformanceMetrics(workflowId?: string): Promise<{
    averageExecutionTime: number;
    medianExecutionTime: number;
    p95ExecutionTime: number;
    throughput: number;
    errorRate: number;
  }> {
    const endpoint = workflowId 
      ? `${this.basePath}/performance?workflowId=${workflowId}`
      : `${this.basePath}/performance`;
    
    return apiService.getAuthenticated(endpoint);
  }
}

export const executionService = new ExecutionService();