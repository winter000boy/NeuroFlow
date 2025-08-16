import { WorkflowService } from '../workflow.service';
import { workflowRepository } from '../../repositories/workflow.repository';
import { WorkflowStatus } from '../../../generated/prisma';
import { AppError, ErrorCode } from '../../utils/errors';
import { 
  createMockWorkflow, 
  createMockUser,
  createPaginatedResult 
} from '../../__tests__/utils/testUtils';

// Mock dependencies
jest.mock('../../repositories/workflow.repository');
jest.mock('../../config/logger.config', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockWorkflowRepository = workflowRepository as jest.Mocked<typeof workflowRepository>;

describe('WorkflowService', () => {
  let workflowService: WorkflowService;

  beforeEach(() => {
    workflowService = new WorkflowService();
    jest.clearAllMocks();
  });

  describe('createWorkflow', () => {
    const userId = 'user-123';
    const validWorkflowData = {
      name: 'Test Workflow',
      description: 'Test description',
      definition: {
        nodes: [
          {
            id: 'node-1',
            name: 'Start',
            type: 'trigger',
            position: [100, 200],
            parameters: {}
          }
        ],
        connections: {}
      },
      status: WorkflowStatus.DRAFT,
    };

    it('should create a workflow successfully', async () => {
      const mockWorkflow = createMockWorkflow({
        name: validWorkflowData.name,
        description: validWorkflowData.description,
      });

      mockWorkflowRepository.create.mockResolvedValue(mockWorkflow);

      const result = await workflowService.createWorkflow(userId, validWorkflowData);

      expect(mockWorkflowRepository.create).toHaveBeenCalledWith({
        name: validWorkflowData.name,
        description: validWorkflowData.description,
        definition: validWorkflowData.definition,
        status: WorkflowStatus.DRAFT,
        userId,
      });
      expect(result).toEqual(mockWorkflow);
    });

    it('should sanitize workflow definition', async () => {
      const workflowDataWithDangerousContent = {
        ...validWorkflowData,
        definition: {
          nodes: [
            {
              id: 'node-1',
              name: 'Dangerous Node',
              type: 'code',
              position: [100, 200],
              parameters: {
                script: 'malicious code',
                code: 'dangerous code',
                normalParam: 'safe value'
              }
            }
          ],
          connections: {}
        }
      };

      const mockWorkflow = createMockWorkflow();
      mockWorkflowRepository.create.mockResolvedValue(mockWorkflow);

      await workflowService.createWorkflow(userId, workflowDataWithDangerousContent);

      const createCall = mockWorkflowRepository.create.mock.calls[0][0];
      const sanitizedNode = createCall.definition.nodes[0];
      
      expect(sanitizedNode.parameters).not.toHaveProperty('script');
      expect(sanitizedNode.parameters).not.toHaveProperty('code');
      expect(sanitizedNode.parameters).toHaveProperty('normalParam', 'safe value');
    });

    it('should throw validation error for invalid definition', async () => {
      const invalidWorkflowData = {
        ...validWorkflowData,
        definition: {
          nodes: [], // Empty nodes should be invalid
          connections: {}
        }
      };

      await expect(
        workflowService.createWorkflow(userId, invalidWorkflowData)
      ).rejects.toThrow(AppError);
    });

    it('should handle repository errors', async () => {
      mockWorkflowRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(
        workflowService.createWorkflow(userId, validWorkflowData)
      ).rejects.toThrow(AppError);
    });
  });

  describe('getWorkflowById', () => {
    const workflowId = 'workflow-123';
    const userId = 'user-123';

    it('should return workflow when found', async () => {
      const mockWorkflow = createMockWorkflow({ id: workflowId, userId });
      mockWorkflowRepository.findByIdAndUserId.mockResolvedValue(mockWorkflow);

      const result = await workflowService.getWorkflowById(workflowId, userId);

      expect(mockWorkflowRepository.findByIdAndUserId).toHaveBeenCalledWith(workflowId, userId);
      expect(result).toEqual(mockWorkflow);
    });

    it('should throw error when workflow not found', async () => {
      mockWorkflowRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        workflowService.getWorkflowById(workflowId, userId)
      ).rejects.toThrow(new AppError(
        ErrorCode.WORKFLOW_NOT_FOUND,
        'Workflow not found or access denied',
        404
      ));
    });
  });

  describe('getUserWorkflows', () => {
    const userId = 'user-123';
    const query = {
      page: 1,
      limit: 10,
      status: WorkflowStatus.ACTIVE,
      search: 'test',
      sortBy: 'createdAt' as const,
      sortOrder: 'desc' as const,
    };

    it('should return paginated workflows', async () => {
      const mockWorkflows = [
        createMockWorkflow({ id: 'workflow-1' }),
        createMockWorkflow({ id: 'workflow-2' }),
      ];
      const total = 2;

      mockWorkflowRepository.findByUserId.mockResolvedValue({
        workflows: mockWorkflows,
        total,
      });

      const result = await workflowService.getUserWorkflows(userId, query);

      expect(mockWorkflowRepository.findByUserId).toHaveBeenCalledWith(userId, query);
      expect(result).toEqual({
        workflows: mockWorkflows.map(expect.any(Object)), // Mapped to DTO
        total,
        page: query.page,
        limit: query.limit,
        totalPages: 1,
      });
    });
  });

  describe('updateWorkflow', () => {
    const workflowId = 'workflow-123';
    const userId = 'user-123';
    const updateData = {
      name: 'Updated Workflow',
      description: 'Updated description',
    };

    it('should update workflow successfully', async () => {
      const mockUpdatedWorkflow = createMockWorkflow({
        id: workflowId,
        name: updateData.name,
        description: updateData.description,
      });

      mockWorkflowRepository.update.mockResolvedValue(mockUpdatedWorkflow);

      const result = await workflowService.updateWorkflow(workflowId, userId, updateData);

      expect(mockWorkflowRepository.update).toHaveBeenCalledWith(
        workflowId,
        userId,
        {
          name: updateData.name,
          description: updateData.description,
        }
      );
      expect(result).toEqual(mockUpdatedWorkflow);
    });

    it('should throw error when workflow not found', async () => {
      mockWorkflowRepository.update.mockResolvedValue(null);

      await expect(
        workflowService.updateWorkflow(workflowId, userId, updateData)
      ).rejects.toThrow(new AppError(
        ErrorCode.WORKFLOW_NOT_FOUND,
        'Workflow not found or access denied',
        404
      ));
    });
  });

  describe('updateWorkflowStatus', () => {
    const workflowId = 'workflow-123';
    const userId = 'user-123';

    it('should update status with valid transition', async () => {
      const currentWorkflow = createMockWorkflow({
        id: workflowId,
        status: WorkflowStatus.DRAFT,
      });
      const updatedWorkflow = createMockWorkflow({
        id: workflowId,
        status: WorkflowStatus.ACTIVE,
      });

      mockWorkflowRepository.findByIdAndUserId.mockResolvedValue(currentWorkflow);
      mockWorkflowRepository.updateStatus.mockResolvedValue(updatedWorkflow);

      const result = await workflowService.updateWorkflowStatus(
        workflowId,
        userId,
        WorkflowStatus.ACTIVE
      );

      expect(result).toEqual(updatedWorkflow);
    });

    it('should throw error for invalid status transition', async () => {
      const currentWorkflow = createMockWorkflow({
        id: workflowId,
        status: WorkflowStatus.ACTIVE,
      });

      mockWorkflowRepository.findByIdAndUserId.mockResolvedValue(currentWorkflow);

      // Assuming ACTIVE -> ACTIVE is not a valid transition
      await expect(
        workflowService.updateWorkflowStatus(workflowId, userId, WorkflowStatus.ACTIVE)
      ).rejects.toThrow(AppError);
    });
  });

  describe('deleteWorkflow', () => {
    const workflowId = 'workflow-123';
    const userId = 'user-123';

    it('should delete workflow successfully', async () => {
      mockWorkflowRepository.delete.mockResolvedValue(true);

      await workflowService.deleteWorkflow(workflowId, userId);

      expect(mockWorkflowRepository.delete).toHaveBeenCalledWith(workflowId, userId);
    });

    it('should throw error when workflow not found', async () => {
      mockWorkflowRepository.delete.mockResolvedValue(false);

      await expect(
        workflowService.deleteWorkflow(workflowId, userId)
      ).rejects.toThrow(new AppError(
        ErrorCode.WORKFLOW_NOT_FOUND,
        'Workflow not found or access denied',
        404
      ));
    });

    it('should throw error when workflow has active executions', async () => {
      mockWorkflowRepository.delete.mockRejectedValue(
        new Error('Cannot delete workflow with active executions')
      );

      await expect(
        workflowService.deleteWorkflow(workflowId, userId)
      ).rejects.toThrow(new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Cannot delete workflow with active executions',
        400
      ));
    });
  });

  describe('duplicateWorkflow', () => {
    const workflowId = 'workflow-123';
    const userId = 'user-123';
    const newName = 'Duplicated Workflow';

    it('should duplicate workflow successfully', async () => {
      const originalWorkflow = createMockWorkflow({
        id: workflowId,
        name: 'Original Workflow',
      });
      const duplicatedWorkflow = createMockWorkflow({
        id: 'workflow-456',
        name: newName,
      });

      mockWorkflowRepository.findByIdAndUserId.mockResolvedValue(originalWorkflow);
      mockWorkflowRepository.create.mockResolvedValue(duplicatedWorkflow);

      const result = await workflowService.duplicateWorkflow(workflowId, userId, newName);

      expect(mockWorkflowRepository.create).toHaveBeenCalledWith({
        name: newName,
        description: originalWorkflow.description,
        definition: originalWorkflow.definition,
        status: WorkflowStatus.DRAFT,
        userId,
      });
      expect(result).toEqual(duplicatedWorkflow);
    });

    it('should use default name when not provided', async () => {
      const originalWorkflow = createMockWorkflow({
        id: workflowId,
        name: 'Original Workflow',
      });
      const duplicatedWorkflow = createMockWorkflow({
        id: 'workflow-456',
        name: 'Original Workflow (Copy)',
      });

      mockWorkflowRepository.findByIdAndUserId.mockResolvedValue(originalWorkflow);
      mockWorkflowRepository.create.mockResolvedValue(duplicatedWorkflow);

      await workflowService.duplicateWorkflow(workflowId, userId);

      expect(mockWorkflowRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Original Workflow (Copy)',
        })
      );
    });
  });

  describe('validateWorkflowDefinition', () => {
    it('should return true for valid definition', async () => {
      const validDefinition = {
        nodes: [
          {
            id: 'node-1',
            name: 'Start',
            type: 'trigger',
            position: [100, 200],
            parameters: {}
          }
        ],
        connections: {}
      };

      const result = await workflowService.validateWorkflowDefinition(validDefinition);

      expect(result).toBe(true);
    });

    it('should return false for invalid definition', async () => {
      const invalidDefinition = {
        nodes: [], // Empty nodes
        connections: {}
      };

      const result = await workflowService.validateWorkflowDefinition(invalidDefinition);

      expect(result).toBe(false);
    });

    it('should return false for definition with duplicate node IDs', async () => {
      const invalidDefinition = {
        nodes: [
          { id: 'node-1', name: 'Node 1', type: 'trigger', position: [100, 200] },
          { id: 'node-1', name: 'Node 2', type: 'action', position: [200, 300] }, // Duplicate ID
        ],
        connections: {}
      };

      const result = await workflowService.validateWorkflowDefinition(invalidDefinition);

      expect(result).toBe(false);
    });

    it('should return false for definition with invalid connections', async () => {
      const invalidDefinition = {
        nodes: [
          { id: 'node-1', name: 'Node 1', type: 'trigger', position: [100, 200] },
        ],
        connections: {
          'node-1': {
            main: [
              [{ node: 'non-existent-node', type: 'main', index: 0 }]
            ]
          }
        }
      };

      const result = await workflowService.validateWorkflowDefinition(invalidDefinition);

      expect(result).toBe(false);
    });
  });
});