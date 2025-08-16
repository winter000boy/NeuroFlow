import { N8nService } from '../n8n.service';
import axios from 'axios';
import { AppError, ErrorCode } from '../../utils/errors';

// Mock axios
jest.mock('axios');
jest.mock('../../config/logger.config', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockAxios = axios as jest.Mocked<typeof axios>;

describe('N8nService', () => {
  let n8nService: N8nService;

  beforeEach(() => {
    n8nService = new N8nService();
    jest.clearAllMocks();
  });

  describe('executeWorkflow', () => {
    const workflowDefinition = {
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
    const inputData = { test: 'data' };

    it('should execute workflow successfully', async () => {
      const mockResponse = {
        data: {
          executionId: 'n8n-execution-123',
          status: 'running',
          data: { result: 'started' }
        }
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await n8nService.executeWorkflow(workflowDefinition, inputData);

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/webhook/'),
        expect.objectContaining({
          workflowDefinition,
          inputData
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': expect.stringContaining('Bearer')
          }),
          timeout: expect.any(Number)
        })
      );

      expect(result).toEqual({
        executionId: 'n8n-execution-123',
        status: 'running',
        data: { result: 'started' }
      });
    });

    it('should handle n8n service unavailable', async () => {
      mockAxios.post.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(
        n8nService.executeWorkflow(workflowDefinition, inputData)
      ).rejects.toThrow(new AppError(
        ErrorCode.N8N_UNAVAILABLE,
        'n8n service is unavailable',
        503
      ));
    });

    it('should handle n8n authentication error', async () => {
      mockAxios.post.mockRejectedValue({
        response: {
          status: 401,
          data: { message: 'Unauthorized' }
        }
      });

      await expect(
        n8nService.executeWorkflow(workflowDefinition, inputData)
      ).rejects.toThrow(new AppError(
        ErrorCode.UNAUTHORIZED,
        'n8n authentication failed',
        401
      ));
    });

    it('should handle n8n validation error', async () => {
      mockAxios.post.mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'Invalid workflow definition' }
        }
      });

      await expect(
        n8nService.executeWorkflow(workflowDefinition, inputData)
      ).rejects.toThrow(new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid workflow definition',
        400
      ));
    });

    it('should handle timeout errors', async () => {
      mockAxios.post.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      });

      await expect(
        n8nService.executeWorkflow(workflowDefinition, inputData)
      ).rejects.toThrow(new AppError(
        ErrorCode.N8N_UNAVAILABLE,
        'n8n request timeout',
        503
      ));
    });
  });

  describe('getExecutionStatus', () => {
    const executionId = 'n8n-execution-123';

    it('should get execution status successfully', async () => {
      const mockResponse = {
        data: {
          id: executionId,
          status: 'success',
          finished: true,
          data: { result: 'completed' }
        }
      };

      mockAxios.get.mockResolvedValue(mockResponse);

      const result = await n8nService.getExecutionStatus(executionId);

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(`/executions/${executionId}`),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer')
          }),
          timeout: expect.any(Number)
        })
      );

      expect(result).toEqual({
        id: executionId,
        status: 'success',
        finished: true,
        data: { result: 'completed' }
      });
    });

    it('should handle execution not found', async () => {
      mockAxios.get.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Execution not found' }
        }
      });

      await expect(
        n8nService.getExecutionStatus(executionId)
      ).rejects.toThrow(new AppError(
        ErrorCode.EXECUTION_NOT_FOUND,
        'Execution not found in n8n',
        404
      ));
    });

    it('should handle n8n service errors', async () => {
      mockAxios.get.mockRejectedValue({
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        }
      });

      await expect(
        n8nService.getExecutionStatus(executionId)
      ).rejects.toThrow(new AppError(
        ErrorCode.N8N_UNAVAILABLE,
        'Failed to get execution status from n8n',
        503
      ));
    });
  });

  describe('createWebhook', () => {
    const workflowId = 'workflow-123';

    it('should create webhook successfully', async () => {
      const webhookUrl = `http://localhost:3000/api/webhooks/${workflowId}`;
      const mockResponse = {
        data: {
          webhookId: 'webhook-123',
          url: webhookUrl,
          active: true
        }
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await n8nService.createWebhook(workflowId);

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/webhooks'),
        expect.objectContaining({
          workflowId,
          callbackUrl: expect.stringContaining(workflowId)
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': expect.stringContaining('Bearer')
          })
        })
      );

      expect(result).toBe(webhookUrl);
    });

    it('should handle webhook creation failure', async () => {
      mockAxios.post.mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'Invalid webhook configuration' }
        }
      });

      await expect(
        n8nService.createWebhook(workflowId)
      ).rejects.toThrow(new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Failed to create webhook in n8n',
        400
      ));
    });
  });

  describe('cancelExecution', () => {
    const executionId = 'n8n-execution-123';

    it('should cancel execution successfully', async () => {
      const mockResponse = {
        data: {
          id: executionId,
          status: 'cancelled',
          cancelled: true
        }
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await n8nService.cancelExecution(executionId);

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining(`/executions/${executionId}/cancel`),
        {},
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer')
          })
        })
      );

      expect(result).toEqual({
        id: executionId,
        status: 'cancelled',
        cancelled: true
      });
    });

    it('should handle cancellation failure', async () => {
      mockAxios.post.mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'Cannot cancel completed execution' }
        }
      });

      await expect(
        n8nService.cancelExecution(executionId)
      ).rejects.toThrow(new AppError(
        ErrorCode.INVALID_INPUT,
        'Cannot cancel execution',
        400
      ));
    });
  });

  describe('validateWorkflowDefinition', () => {
    const workflowDefinition = {
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

    it('should validate workflow definition successfully', async () => {
      const mockResponse = {
        data: {
          valid: true,
          errors: []
        }
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await n8nService.validateWorkflowDefinition(workflowDefinition);

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/workflows/validate'),
        { workflowDefinition },
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': expect.stringContaining('Bearer')
          })
        })
      );

      expect(result).toEqual({
        valid: true,
        errors: []
      });
    });

    it('should handle validation errors', async () => {
      const mockResponse = {
        data: {
          valid: false,
          errors: [
            'Node "node-1" is missing required parameter "url"',
            'Invalid connection from node-1 to node-2'
          ]
        }
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await n8nService.validateWorkflowDefinition(workflowDefinition);

      expect(result).toEqual({
        valid: false,
        errors: [
          'Node "node-1" is missing required parameter "url"',
          'Invalid connection from node-1 to node-2'
        ]
      });
    });
  });

  describe('getWorkflowTemplates', () => {
    it('should get workflow templates successfully', async () => {
      const mockResponse = {
        data: {
          templates: [
            {
              id: 'template-1',
              name: 'Email Notification',
              description: 'Send email notifications',
              category: 'communication',
              definition: {
                nodes: [
                  { id: 'trigger', name: 'Webhook', type: 'webhook' },
                  { id: 'email', name: 'Send Email', type: 'email' }
                ],
                connections: {
                  'trigger': { main: [['email']] }
                }
              }
            }
          ]
        }
      };

      mockAxios.get.mockResolvedValue(mockResponse);

      const result = await n8nService.getWorkflowTemplates();

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/templates'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer')
          })
        })
      );

      expect(result).toEqual(mockResponse.data.templates);
    });

    it('should handle templates fetch failure', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(
        n8nService.getWorkflowTemplates()
      ).rejects.toThrow(new AppError(
        ErrorCode.N8N_UNAVAILABLE,
        'Failed to fetch workflow templates',
        503
      ));
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const mockResponse = {
        data: {
          status: 'ok',
          version: '1.0.0',
          uptime: 3600
        }
      };

      mockAxios.get.mockResolvedValue(mockResponse);

      const result = await n8nService.healthCheck();

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.objectContaining({
          timeout: expect.any(Number)
        })
      );

      expect(result).toEqual({
        healthy: true,
        status: 'ok',
        version: '1.0.0',
        uptime: 3600
      });
    });

    it('should return unhealthy status on error', async () => {
      mockAxios.get.mockRejectedValue(new Error('Connection refused'));

      const result = await n8nService.healthCheck();

      expect(result).toEqual({
        healthy: false,
        error: 'Connection refused'
      });
    });
  });
});