import { apiService } from './api';
import { authService } from './auth.service';
import { Workflow, PaginatedResult } from '../types';

export interface CreateWorkflowData {
  name: string;
  description?: string;
  definition: {
    nodes: any[];
    connections: Record<string, any>;
    settings?: Record<string, any>;
  };
  status?: 'draft' | 'active' | 'inactive';
}

export interface UpdateWorkflowData {
  name?: string;
  description?: string;
  definition?: {
    nodes: any[];
    connections: Record<string, any>;
    settings?: Record<string, any>;
  };
  status?: 'draft' | 'active' | 'inactive';
}

export interface WorkflowQueryParams {
  page?: number;
  limit?: number;
  status?: 'draft' | 'active' | 'inactive';
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export class WorkflowService {
  /**
   * Get user's workflows with pagination and filtering
   */
  async getWorkflows(
    params: WorkflowQueryParams = {}
  ): Promise<PaginatedResult<Workflow>> {
    const queryString = new URLSearchParams();

    if (params.page) queryString.append('page', params.page.toString());
    if (params.limit) queryString.append('limit', params.limit.toString());
    if (params.status) queryString.append('status', params.status);
    if (params.search) queryString.append('search', params.search);
    if (params.sortBy) queryString.append('sortBy', params.sortBy);
    if (params.sortOrder) queryString.append('sortOrder', params.sortOrder);

    const endpoint = `/workflows${queryString.toString() ? `?${queryString.toString()}` : ''}`;

    // We need to access the raw response to get both data and meta
    const makeRequest = async (token: string) => {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}${endpoint}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('UNAUTHORIZED');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    };

    let token = authService.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    try {
      const result = await makeRequest(token);

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch workflows');
      }

      return {
        items: result.data || [],
        meta: {
          page: result.meta?.pagination?.page || params.page || 1,
          limit: result.meta?.pagination?.limit || params.limit || 10,
          total: result.meta?.pagination?.total || 0,
          totalPages: result.meta?.pagination?.totalPages || 0,
        },
      };
    } catch (error) {
      // If request fails with 401, try to refresh token
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        try {
          await authService.refreshToken();
          token = authService.getAccessToken();
          if (token) {
            const result = await makeRequest(token);

            if (!result.success) {
              throw new Error(
                result.error?.message || 'Failed to fetch workflows'
              );
            }

            return {
              items: result.data || [],
              meta: {
                page: result.meta?.pagination?.page || params.page || 1,
                limit: result.meta?.pagination?.limit || params.limit || 10,
                total: result.meta?.pagination?.total || 0,
                totalPages: result.meta?.pagination?.totalPages || 0,
              },
            };
          }
        } catch (refreshError) {
          authService.clearTokens();
          throw new Error('Authentication failed');
        }
      }
      throw error;
    }
  }

  /**
   * Get workflow by ID
   */
  async getWorkflowById(id: string): Promise<Workflow> {
    return apiService.getAuthenticated<Workflow>(`/workflows/${id}`);
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(data: CreateWorkflowData): Promise<Workflow> {
    return apiService.postAuthenticated<Workflow>('/workflows', data);
  }

  /**
   * Update workflow
   */
  async updateWorkflow(
    id: string,
    data: UpdateWorkflowData
  ): Promise<Workflow> {
    return apiService.putAuthenticated<Workflow>(`/workflows/${id}`, data);
  }

  /**
   * Update workflow status
   */
  async updateWorkflowStatus(
    id: string,
    status: 'draft' | 'active' | 'inactive'
  ): Promise<Workflow> {
    return apiService.putAuthenticated<Workflow>(`/workflows/${id}/status`, {
      status,
    });
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(id: string): Promise<void> {
    return apiService.deleteAuthenticated<void>(`/workflows/${id}`);
  }

  /**
   * Duplicate workflow
   */
  async duplicateWorkflow(id: string, name?: string): Promise<Workflow> {
    return apiService.postAuthenticated<Workflow>(
      `/workflows/${id}/duplicate`,
      { name }
    );
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(id: string, inputData?: any): Promise<{ executionId: string }> {
    return apiService.postAuthenticated<{ executionId: string }>(
      `/workflows/${id}/execute`,
      { inputData }
    );
  }

  /**
   * Validate workflow definition
   */
  async validateWorkflowDefinition(
    definition: any
  ): Promise<{ valid: boolean; errors?: string[] }> {
    return apiService.postAuthenticated<{ valid: boolean; errors?: string[] }>(
      '/workflows/validate',
      { definition }
    );
  }

  /**
   * Get workflow execution history
   */
  async getWorkflowExecutions(
    id: string,
    params: { page?: number; limit?: number; status?: string } = {}
  ): Promise<PaginatedResult<any>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString 
      ? `/workflows/${id}/executions?${queryString}` 
      : `/workflows/${id}/executions`;
    
    return apiService.getAuthenticated<PaginatedResult<any>>(endpoint);
  }

  /**
   * Get workflow analytics
   */
  async getWorkflowAnalytics(id: string): Promise<{
    totalExecutions: number;
    successRate: number;
    averageExecutionTime: number;
    lastExecution?: string;
    executionTrend: Array<{ date: string; count: number }>;
  }> {
    return apiService.getAuthenticated(`/workflows/${id}/analytics`);
  }

  /**
   * Export workflow definition
   */
  async exportWorkflow(id: string): Promise<Blob> {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}/workflows/${id}/export`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to export workflow');
    }

    return response.blob();
  }

  /**
   * Import workflow definition
   */
  async importWorkflow(file: File): Promise<Workflow> {
    const formData = new FormData();
    formData.append('workflow', file);

    const response = await fetch(
      `${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}/workflows/import`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to import workflow');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to import workflow');
    }

    return result.data;
  }

  /**
   * Get workflow templates
   */
  async getWorkflowTemplates(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    definition: any;
  }>> {
    return apiService.get('/workflows/templates');
  }

  /**
   * Create workflow from template
   */
  async createFromTemplate(templateId: string, name: string): Promise<Workflow> {
    return apiService.postAuthenticated<Workflow>('/workflows/from-template', {
      templateId,
      name,
    });
  }
}

export const workflowService = new WorkflowService();
