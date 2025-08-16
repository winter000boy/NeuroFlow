import request from 'supertest';
import express from 'express';
import { workflowController } from '../workflow.controller';
import { workflowService } from '../../services/workflow.service';
import { WorkflowStatus } from '../../../generated/prisma';
import { AppError, ErrorCode } from '../../utils/errors';
import { 
  createMockWorkflow,
  createMockRequest,
  createMockResponse,
  createMockNext 
} from '../../__tests__/utils/testUtils';

// Mock dependencies
jest.mock('../../services/workflow.service');
jest.mock('../../config/logger.config', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockWorkflowService = workflowService as jest.Mocked<typeof workflowService>;

// Create Express app for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Mock auth middleware
  app.use((req, res, next) => {
    req.user = { userId: 'user-123' };
    next();
  });
  
  return app;
};

describe('WorkflowController', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('POST /workflows', () => {
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

    beforeEach(() => {
      app.post('/workflows', workflowController.createWorkflow);
    });

    it('should create workflow successfully', async () => {
      const mockWorkflow = createMockWorkflow(validWorkflowData);
      mockWorkflowService.createWorkflow.mockResolvedValue(mockWorkflow);

      const response = await request(app)
        .post('/workflows')
        .send(validWorkflowData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: mockWorkflow.id,
          name: validWorkflowData.name,
        }),
        meta: {
          timestamp: expect.any(String),
        },
      });

      expect(mockWorkflowService.createWorkflow).toHaveBeenCalledWith(
        'user-123',
        validWorkflowData
      );
    });

    it('should return 400 for invalid workflow data', async () => {
      const invalidData = {
        name: '', // Empty name should be invalid
        definition: {},
      };

      const response = await request(app)
        .post('/workflows')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 401 when user not authenticated', async () => {
      // Create app without auth middleware
      const unauthApp = express();
      unauthApp.use(express.json());
      unauthApp.post('/workflows', workflowController.createWorkflow);

      const response = await request(unauthApp)
        .post('/workflows')
        .send(validWorkflowData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    it('should handle service errors', async () => {
      mockWorkflowService.createWorkflow.mockRejectedValue(
        new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid workflow definition', 400)
      );

      const response = await request(app)
        .post('/workflows')
        .send(validWorkflowData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });
  });

  describe('GET /workflows', () => {
    beforeEach(() => {
      app.get('/workflows', workflowController.getWorkflows);
    });

    it('should return paginated workflows', async () => {
      const mockWorkflows = [
        createMockWorkflow({ id: 'workflow-1' }),
        createMockWorkflow({ id: 'workflow-2' }),
      ];
      const mockResult = {
        workflows: mockWorkflows,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockWorkflowService.getUserWorkflows.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/workflows')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockWorkflows,
        meta: {
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
          },
          timestamp: expect.any(String),
        },
      });

      expect(mockWorkflowService.getUserWorkflows).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          page: 1,
          limit: 10,
        })
      );
    });

    it('should handle query parameters', async () => {
      const mockResult = {
        workflows: [],
        total: 0,
        page: 2,
        limit: 5,
        totalPages: 0,
      };

      mockWorkflowService.getUserWorkflows.mockResolvedValue(mockResult);

      await request(app)
        .get('/workflows')
        .query({
          page: 2,
          limit: 5,
          status: WorkflowStatus.ACTIVE,
          search: 'test',
          sortBy: 'name',
          sortOrder: 'asc',
        })
        .expect(200);

      expect(mockWorkflowService.getUserWorkflows).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          page: 2,
          limit: 5,
          status: WorkflowStatus.ACTIVE,
          search: 'test',
          sortBy: 'name',
          sortOrder: 'asc',
        })
      );
    });
  });

  describe('GET /workflows/:id', () => {
    const workflowId = 'workflow-123';

    beforeEach(() => {
      app.get('/workflows/:id', workflowController.getWorkflowById);
    });

    it('should return workflow by ID', async () => {
      const mockWorkflow = createMockWorkflow({ id: workflowId });
      mockWorkflowService.getWorkflowById.mockResolvedValue(mockWorkflow);

      const response = await request(app)
        .get(`/workflows/${workflowId}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: workflowId,
        }),
        meta: {
          timestamp: expect.any(String),
        },
      });

      expect(mockWorkflowService.getWorkflowById).toHaveBeenCalledWith(
        workflowId,
        'user-123'
      );
    });

    it('should return 404 when workflow not found', async () => {
      mockWorkflowService.getWorkflowById.mockRejectedValue(
        new AppError(ErrorCode.WORKFLOW_NOT_FOUND, 'Workflow not found', 404)
      );

      const response = await request(app)
        .get(`/workflows/${workflowId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.WORKFLOW_NOT_FOUND);
    });

    it('should validate workflow ID parameter', async () => {
      const response = await request(app)
        .get('/workflows/invalid-id-format')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /workflows/:id', () => {
    const workflowId = 'workflow-123';
    const updateData = {
      name: 'Updated Workflow',
      description: 'Updated description',
    };

    beforeEach(() => {
      app.put('/workflows/:id', workflowController.updateWorkflow);
    });

    it('should update workflow successfully', async () => {
      const mockUpdatedWorkflow = createMockWorkflow({
        id: workflowId,
        ...updateData,
      });

      mockWorkflowService.updateWorkflow.mockResolvedValue(mockUpdatedWorkflow);

      const response = await request(app)
        .put(`/workflows/${workflowId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: workflowId,
          name: updateData.name,
          description: updateData.description,
        }),
        meta: {
          timestamp: expect.any(String),
        },
      });

      expect(mockWorkflowService.updateWorkflow).toHaveBeenCalledWith(
        workflowId,
        'user-123',
        updateData
      );
    });

    it('should validate update data', async () => {
      const invalidData = {
        name: '', // Empty name should be invalid
      };

      const response = await request(app)
        .put(`/workflows/${workflowId}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /workflows/:id/status', () => {
    const workflowId = 'workflow-123';

    beforeEach(() => {
      app.patch('/workflows/:id/status', workflowController.updateWorkflowStatus);
    });

    it('should update workflow status successfully', async () => {
      const mockUpdatedWorkflow = createMockWorkflow({
        id: workflowId,
        status: WorkflowStatus.ACTIVE,
      });

      mockWorkflowService.updateWorkflowStatus.mockResolvedValue(mockUpdatedWorkflow);

      const response = await request(app)
        .patch(`/workflows/${workflowId}/status`)
        .send({ status: WorkflowStatus.ACTIVE })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: workflowId,
          status: WorkflowStatus.ACTIVE,
        }),
        meta: {
          timestamp: expect.any(String),
        },
      });

      expect(mockWorkflowService.updateWorkflowStatus).toHaveBeenCalledWith(
        workflowId,
        'user-123',
        WorkflowStatus.ACTIVE
      );
    });

    it('should validate status value', async () => {
      const response = await request(app)
        .patch(`/workflows/${workflowId}/status`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });
  });

  describe('DELETE /workflows/:id', () => {
    const workflowId = 'workflow-123';

    beforeEach(() => {
      app.delete('/workflows/:id', workflowController.deleteWorkflow);
    });

    it('should delete workflow successfully', async () => {
      mockWorkflowService.deleteWorkflow.mockResolvedValue();

      const response = await request(app)
        .delete(`/workflows/${workflowId}`)
        .expect(204);

      expect(response.body).toEqual({});
      expect(mockWorkflowService.deleteWorkflow).toHaveBeenCalledWith(
        workflowId,
        'user-123'
      );
    });

    it('should return 404 when workflow not found', async () => {
      mockWorkflowService.deleteWorkflow.mockRejectedValue(
        new AppError(ErrorCode.WORKFLOW_NOT_FOUND, 'Workflow not found', 404)
      );

      const response = await request(app)
        .delete(`/workflows/${workflowId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.WORKFLOW_NOT_FOUND);
    });
  });

  describe('POST /workflows/:id/duplicate', () => {
    const workflowId = 'workflow-123';

    beforeEach(() => {
      app.post('/workflows/:id/duplicate', workflowController.duplicateWorkflow);
    });

    it('should duplicate workflow successfully', async () => {
      const newName = 'Duplicated Workflow';
      const mockDuplicatedWorkflow = createMockWorkflow({
        id: 'workflow-456',
        name: newName,
      });

      mockWorkflowService.duplicateWorkflow.mockResolvedValue(mockDuplicatedWorkflow);

      const response = await request(app)
        .post(`/workflows/${workflowId}/duplicate`)
        .send({ name: newName })
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: 'workflow-456',
          name: newName,
        }),
        meta: {
          timestamp: expect.any(String),
        },
      });

      expect(mockWorkflowService.duplicateWorkflow).toHaveBeenCalledWith(
        workflowId,
        'user-123',
        newName
      );
    });

    it('should duplicate workflow without custom name', async () => {
      const mockDuplicatedWorkflow = createMockWorkflow({
        id: 'workflow-456',
        name: 'Original Workflow (Copy)',
      });

      mockWorkflowService.duplicateWorkflow.mockResolvedValue(mockDuplicatedWorkflow);

      const response = await request(app)
        .post(`/workflows/${workflowId}/duplicate`)
        .send({})
        .expect(201);

      expect(mockWorkflowService.duplicateWorkflow).toHaveBeenCalledWith(
        workflowId,
        'user-123',
        undefined
      );
    });
  });

  describe('POST /workflows/validate', () => {
    beforeEach(() => {
      app.post('/workflows/validate', workflowController.validateWorkflowDefinition);
    });

    it('should validate workflow definition successfully', async () => {
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

      mockWorkflowService.validateWorkflowDefinition.mockResolvedValue(true);

      const response = await request(app)
        .post('/workflows/validate')
        .send({ definition: validDefinition })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          valid: true,
        },
        meta: {
          timestamp: expect.any(String),
        },
      });

      expect(mockWorkflowService.validateWorkflowDefinition).toHaveBeenCalledWith(
        validDefinition
      );
    });

    it('should return validation error for invalid definition', async () => {
      mockWorkflowService.validateWorkflowDefinition.mockResolvedValue(false);

      const response = await request(app)
        .post('/workflows/validate')
        .send({ definition: { nodes: [], connections: {} } })
        .expect(200);

      expect(response.body.data.valid).toBe(false);
    });

    it('should return 400 when definition is missing', async () => {
      const response = await request(app)
        .post('/workflows/validate')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });
  });
});