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
   * Validate workflow definition
   */
  async validateWorkflowDefinition(
    definition: any
  ): Promise<{ valid: boolean }> {
    return apiService.postAuthenticated<{ valid: boolean }>(
      '/workflows/validate',
      { definition }
    );
  }
}

export const workflowService = new WorkflowService();
