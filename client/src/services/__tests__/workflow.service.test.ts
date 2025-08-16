import { workflowService } from '../workflow.service';
import { apiService } from '../api';
import { Workflow, PaginatedResult } from '../../types';

// Mock the API service
jest.mock('../api');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('WorkflowService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWorkflows', () => {
    it('should fetch workflows with default parameters', async () => {
      const mockWorkflows: PaginatedResult<Workflow> = {
        items: [
          {
            id: '1',
            name: 'Test Workflow',
            description: 'Test Description',
            definition: { nodes: [], connections: [], settings: {} },
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: 'user1',
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockApiService.getAuthenticated.mockResolvedValue(mockWorkflows);

      const result = await workflowService.getWorkflows();

      expect(mockApiService.getAuthenticated).toHaveBeenCalledWith('/workflows?page=1&limit=10');
      expect(result).toEqual(mockWorkflows);
    });

    it('should fetch workflows with custom parameters', async () => {
      const mockWorkflows: PaginatedResult<Workflow> = {
        items: [],
        meta: { page: 2, limit: 5, total: 0, totalPages: 0 },
      };

      mockApiService.getAuthenticated.mockResolvedValue(mockWorkflows);

      const params = {
        page: 2,
        limit: 5,
        search: 'test',
        status: 'active' as const,
        sortBy: 'name' as const,
        sortOrder: 'asc' as const,
      };

      await workflowService.getWorkflows(params);

      expect(mockApiService.getAuthenticated).toHaveBeenCalledWith(
        '/workflows?page=2&limit=5&search=test&status=active&sortBy=name&sortOrder=asc'
      );
    });

    it('should handle API errors', async () => {
      mockApiService.getAuthenticated.mockRejectedValue(new Error('API Error'));

      await expect(workflowService.getWorkflows()).rejects.toThrow('API Error');
    });
  });

  describe('getWorkflowById', () => {
    it('should fetch workflow by ID', async () => {
      const mockWorkflow: Workflow = {
        id: '1',
        name: 'Test Workflow',
        description: 'Test Description',
        definition: { nodes: [], connections: [], settings: {} },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user1',
      };

      mockApiService.getAuthenticated.mockResolvedValue(mockWorkflow);

      const result = await workflowService.getWorkflowById('1');

      expect(mockApiService.getAuthenticated).toHaveBeenCalledWith('/workflows/1');
      expect(result).toEqual(mockWorkflow);
    });

    it('should handle not found error', async () => {
      mockApiService.getAuthenticated.mockRejectedValue(new Error('Workflow not found'));

      await expect(workflowService.getWorkflowById('nonexistent')).rejects.toThrow(
        'Workflow not found'
      );
    });
  });

  describe('createWorkflow', () => {
    it('should create workflow successfully', async () => {
      const workflowData = {
        name: 'New Workflow',
        description: 'New Description',
        definition: { nodes: [], connections: [], settings: {} },
      };

      const mockCreatedWorkflow: Workflow = {
        id: '1',
        ...workflowData,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user1',
      };

      mockApiService.postAuthenticated.mockResolvedValue(mockCreatedWorkflow);

      const result = await workflowService.createWorkflow(workflowData);

      expect(mockApiService.postAuthenticated).toHaveBeenCalledWith('/workflows', workflowData);
      expect(result).toEqual(mockCreatedWorkflow);
    });

    it('should handle validation errors', async () => {
      const workflowData = {
        name: '',
        description: '',
        definition: { nodes: [], connections: [], settings: {} },
      };

      mockApiService.postAuthenticated.mockRejectedValue(new Error('Validation failed'));

      await expect(workflowService.createWorkflow(workflowData)).rejects.toThrow(
        'Validation failed'
      );
    });
  });

  describe('updateWorkflow', () => {
    it('should update workflow successfully', async () => {
      const updateData = {
        name: 'Updated Workflow',
        description: 'Updated Description',
      };

      const mockUpdatedWorkflow: Workflow = {
        id: '1',
        name: 'Updated Workflow',
        description: 'Updated Description',
        definition: { nodes: [], connections: [], settings: {} },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user1',
      };

      mockApiService.putAuthenticated.mockResolvedValue(mockUpdatedWorkflow);

      const result = await workflowService.updateWorkflow('1', updateData);

      expect(mockApiService.putAuthenticated).toHaveBeenCalledWith('/workflows/1', updateData);
      expect(result).toEqual(mockUpdatedWorkflow);
    });
  });

  describe('deleteWorkflow', () => {
    it('should delete workflow successfully', async () => {
      mockApiService.deleteAuthenticated.mockResolvedValue({ success: true });

      await workflowService.deleteWorkflow('1');

      expect(mockApiService.deleteAuthenticated).toHaveBeenCalledWith('/workflows/1');
    });

    it('should handle delete errors', async () => {
      mockApiService.deleteAuthenticated.mockRejectedValue(new Error('Cannot delete workflow'));

      await expect(workflowService.deleteWorkflow('1')).rejects.toThrow('Cannot delete workflow');
    });
  });

  describe('executeWorkflow', () => {
    it('should execute workflow successfully', async () => {
      const inputData = { param1: 'value1' };
      const mockExecution = {
        id: 'exec1',
        workflowId: '1',
        status: 'pending',
        startedAt: new Date(),
        inputData,
        userId: 'user1',
      };

      mockApiService.postAuthenticated.mockResolvedValue(mockExecution);

      const result = await workflowService.executeWorkflow('1', inputData);

      expect(mockApiService.postAuthenticated).toHaveBeenCalledWith('/workflows/1/execute', {
        inputData,
      });
      expect(result).toEqual(mockExecution);
    });

    it('should execute workflow without input data', async () => {
      const mockExecution = {
        id: 'exec1',
        workflowId: '1',
        status: 'pending',
        startedAt: new Date(),
        userId: 'user1',
      };

      mockApiService.postAuthenticated.mockResolvedValue(mockExecution);

      await workflowService.executeWorkflow('1');

      expect(mockApiService.postAuthenticated).toHaveBeenCalledWith('/workflows/1/execute', {});
    });
  });

  describe('updateWorkflowStatus', () => {
    it('should update workflow status successfully', async () => {
      const mockUpdatedWorkflow: Workflow = {
        id: '1',
        name: 'Test Workflow',
        description: 'Test Description',
        definition: { nodes: [], connections: [], settings: {} },
        status: 'inactive',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user1',
      };

      mockApiService.putAuthenticated.mockResolvedValue(mockUpdatedWorkflow);

      const result = await workflowService.updateWorkflowStatus('1', 'inactive');

      expect(mockApiService.putAuthenticated).toHaveBeenCalledWith('/workflows/1/status', {
        status: 'inactive',
      });
      expect(result).toEqual(mockUpdatedWorkflow);
    });
  });

  describe('duplicateWorkflow', () => {
    it('should duplicate workflow successfully', async () => {
      const mockDuplicatedWorkflow: Workflow = {
        id: '2',
        name: 'Test Workflow (Copy)',
        description: 'Test Description',
        definition: { nodes: [], connections: [], settings: {} },
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user1',
      };

      mockApiService.postAuthenticated.mockResolvedValue(mockDuplicatedWorkflow);

      const result = await workflowService.duplicateWorkflow('1');

      expect(mockApiService.postAuthenticated).toHaveBeenCalledWith('/workflows/1/duplicate');
      expect(result).toEqual(mockDuplicatedWorkflow);
    });
  });

  describe('getWorkflowExecutions', () => {
    it('should fetch workflow executions', async () => {
      const mockExecutions = {
        items: [
          {
            id: 'exec1',
            workflowId: '1',
            status: 'success',
            startedAt: new Date(),
            finishedAt: new Date(),
            userId: 'user1',
          },
        ],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };

      mockApiService.getAuthenticated.mockResolvedValue(mockExecutions);

      const result = await workflowService.getWorkflowExecutions('1');

      expect(mockApiService.getAuthenticated).toHaveBeenCalledWith(
        '/workflows/1/executions?page=1&limit=10'
      );
      expect(result).toEqual(mockExecutions);
    });

    it('should fetch workflow executions with custom parameters', async () => {
      const mockExecutions = {
        items: [],
        meta: { page: 2, limit: 5, total: 0, totalPages: 0 },
      };

      mockApiService.getAuthenticated.mockResolvedValue(mockExecutions);

      const params = {
        page: 2,
        limit: 5,
        status: 'success' as const,
      };

      await workflowService.getWorkflowExecutions('1', params);

      expect(mockApiService.getAuthenticated).toHaveBeenCalledWith(
        '/workflows/1/executions?page=2&limit=5&status=success'
      );
    });
  });
});