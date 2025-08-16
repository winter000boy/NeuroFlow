import { ExecutionService } from '../execution.service';
import { executionRepository } from '../../repositories/execution.repository';
import { workflowRepository } from '../../repositories/workflow.repository';
import { webSocketService } from '../websocket.service';
import { ExecutionStatus } from '../../../generated/prisma';
import { AppError, ErrorCode } from '../../utils/errors';
import { 
  createMockExecution, 
  createMockWorkflow,
  createMockAxios 
} from '../../__tests__/utils/testUtils';
import axios from 'axios';

// Mock dependencies
jest.mock('../../repositories/execution.repository');
jest.mock('../../repositories/workflow.repository');
jest.mock('../websocket.service');
jest.mock('axios');
jest.mock('../../config/logger.config', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockExecutionRepository = executionRepository as jest.Mocked<typeof executionRepository>;
const mockWorkflowRepository = workflowRepository as jest.Mocked<typeof workflowRepository>;
const mockWebSocketService = webSocketService as jest.Mocked<typeof webSocketService>;
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('ExecutionService', () => {
  let executionService: ExecutionService;

  beforeEach(() => {
    executionService = new ExecutionService();
    jest.clearAllMocks();
    
    // Default WebSocket service mock
    mockWebSocketService.isAvailable.mockReturnValue(true);
  });

  describe('createExecution', () => {
    const createExecutionData = {
      workflowId: 'workflow-123',
      userId: 'user-123',
      status: ExecutionStatus.PENDING,
      inputData: { test: 'data' },
    };

    it('should create execution successfully', async () => {
      const mockWorkflow = createMockWorkflow({
        id: createExecutionData.workflowId,
        userId: createExecutionData.userId,
      });
      const mockExecution = createMockExecution(createExecutionData);

      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow);
      mockExecutionRepository.create.mockResolvedValue(mockExecution);

      const result = await executionService.createExecution(createExecutionData);

      expect(mockWorkflowRepository.findById).toHaveBeenCalledWith(createExecutionData.workflowId);
      expect(mockExecutionRepository.create).toHaveBeenCalledWith(createExecutionData);
      expect(result).toEqual(mockExecution);
    });

    it('should throw error when workflow not found', async () => {
      mockWorkflowRepository.findById.mockResolvedValue(null);

      await expect(
        executionService.createExecution(createExecutionData)
      ).rejects.toThrow(new AppError(
        ErrorCode.WORKFLOW_NOT_FOUND,
        'Workflow not found',
        404
      ));
    });

    it('should throw error when user does not own workflow', async () => {
      const mockWorkflow = createMockWorkflow({
        id: createExecutionData.workflowId,
        userId: 'different-user',
      });

      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow);

      await expect(
        executionService.createExecution(createExecutionData)
      ).rejects.toThrow(new AppError(
        ErrorCode.FORBIDDEN,
        'Access denied to workflow',
        403
      ));
    });
  });

  describe('triggerExecution', () => {
    const workflowId = 'workflow-123';
    const userId = 'user-123';
    const inputData = { test: 'input' };

    it('should trigger execution successfully', async () => {
      const mockExecution = createMockExecution({
        workflowId,
        userId,
        status: ExecutionStatus.PENDING,
      });
      const mockRunningExecution = createMockExecution({
        ...mockExecution,
        status: ExecutionStatus.RUNNING,
      });

      mockExecutionRepository.create.mockResolvedValue(mockExecution);
      mockExecutionRepository.update.mockResolvedValue(mockRunningExecution);
      mockExecutionRepository.findById.mockResolvedValue(mockRunningExecution);
      
      mockAxios.post.mockResolvedValue({
        data: { executionId: 'n8n-execution-123' }
      });

      const result = await executionService.triggerExecution(workflowId, userId, inputData);

      expect(mockExecutionRepository.create).toHaveBeenCalled();
      expect(mockAxios.post).toHaveBeenCalledWith(
        `http://localhost:5678/webhook/${workflowId}`,
        expect.objectContaining({
          executionId: mockExecution.id,
          ...inputData,
        }),
        expect.any(Object)
      );
      expect(result).toEqual(mockRunningExecution);
    });

    it('should handle n8n service failure', async () => {
      const mockExecution = createMockExecution({
        workflowId,
        userId,
        status: ExecutionStatus.PENDING,
      });
      const mockRunningExecution = createMockExecution({
        ...mockExecution,
        status: ExecutionStatus.RUNNING,
      });

      mockExecutionRepository.create.mockResolvedValue(mockExecution);
      mockExecutionRepository.update.mockResolvedValue(mockRunningExecution);
      mockAxios.post.mockRejectedValue(new Error('n8n service unavailable'));

      await expect(
        executionService.triggerExecution(workflowId, userId, inputData)
      ).rejects.toThrow(new AppError(
        ErrorCode.N8N_UNAVAILABLE,
        'Failed to trigger workflow execution: n8n service unavailable',
        503
      ));

      // Should update execution status to failed
      expect(mockExecutionRepository.update).toHaveBeenCalledWith(
        mockExecution.id,
        expect.objectContaining({
          status: ExecutionStatus.FAILED,
        })
      );
    });
  });

  describe('updateExecutionStatus', () => {
    const executionId = 'execution-123';
    const status = ExecutionStatus.SUCCESS;
    const outputData = { result: 'success' };

    it('should update execution status and emit WebSocket events', async () => {
      const mockExecution = createMockExecution({
        id: executionId,
        status,
        outputData,
      });

      mockExecutionRepository.update.mockResolvedValue(mockExecution);

      const result = await executionService.updateExecutionStatus(
        executionId,
        status,
        undefined,
        outputData
      );

      expect(mockExecutionRepository.update).toHaveBeenCalledWith(
        executionId,
        {
          status,
          errorMessage: undefined,
          outputData,
        }
      );
      expect(mockWebSocketService.emitExecutionCompleted).toHaveBeenCalled();
      expect(result).toEqual(mockExecution);
    });

    it('should emit failed event for failed status', async () => {
      const failedStatus = ExecutionStatus.FAILED;
      const errorMessage = 'Execution failed';
      const mockExecution = createMockExecution({
        id: executionId,
        status: failedStatus,
        errorMessage,
      });

      mockExecutionRepository.update.mockResolvedValue(mockExecution);

      await executionService.updateExecutionStatus(
        executionId,
        failedStatus,
        errorMessage
      );

      expect(mockWebSocketService.emitExecutionFailed).toHaveBeenCalled();
    });

    it('should emit progress event for running status', async () => {
      const runningStatus = ExecutionStatus.RUNNING;
      const mockExecution = createMockExecution({
        id: executionId,
        status: runningStatus,
      });

      mockExecutionRepository.update.mockResolvedValue(mockExecution);

      await executionService.updateExecutionStatus(executionId, runningStatus);

      expect(mockWebSocketService.emitExecutionProgress).toHaveBeenCalled();
    });
  });

  describe('cancelExecution', () => {
    const executionId = 'execution-123';
    const userId = 'user-123';

    it('should cancel running execution successfully', async () => {
      const mockExecution = createMockExecution({
        id: executionId,
        userId,
        status: ExecutionStatus.RUNNING,
      });
      const mockCancelledExecution = createMockExecution({
        ...mockExecution,
        status: ExecutionStatus.CANCELLED,
      });

      mockExecutionRepository.findById.mockResolvedValue(mockExecution);
      mockExecutionRepository.cancel.mockResolvedValue(mockCancelledExecution);

      const result = await executionService.cancelExecution(executionId, userId);

      expect(mockExecutionRepository.cancel).toHaveBeenCalledWith(executionId);
      expect(mockWebSocketService.emitExecutionCompleted).toHaveBeenCalled();
      expect(result).toEqual(mockCancelledExecution);
    });

    it('should throw error when execution not found', async () => {
      mockExecutionRepository.findById.mockResolvedValue(null);

      await expect(
        executionService.cancelExecution(executionId, userId)
      ).rejects.toThrow(new AppError(
        ErrorCode.EXECUTION_NOT_FOUND,
        'Execution not found',
        404
      ));
    });

    it('should throw error when user does not own execution', async () => {
      const mockExecution = createMockExecution({
        id: executionId,
        userId: 'different-user',
      });

      mockExecutionRepository.findById.mockResolvedValue(mockExecution);

      await expect(
        executionService.cancelExecution(executionId, userId)
      ).rejects.toThrow(new AppError(
        ErrorCode.FORBIDDEN,
        'Access denied to execution',
        403
      ));
    });

    it('should throw error when execution cannot be cancelled', async () => {
      const mockExecution = createMockExecution({
        id: executionId,
        userId,
        status: ExecutionStatus.SUCCESS, // Already completed
      });

      mockExecutionRepository.findById.mockResolvedValue(mockExecution);

      await expect(
        executionService.cancelExecution(executionId, userId)
      ).rejects.toThrow(new AppError(
        ErrorCode.INVALID_INPUT,
        'Cannot cancel execution that is not pending or running',
        400
      ));
    });
  });

  describe('getExecution', () => {
    const executionId = 'execution-123';
    const userId = 'user-123';

    it('should return execution when found and user has access', async () => {
      const mockExecution = createMockExecution({
        id: executionId,
        userId,
      });

      mockExecutionRepository.findById.mockResolvedValue(mockExecution);

      const result = await executionService.getExecution(executionId, userId);

      expect(mockExecutionRepository.findById).toHaveBeenCalledWith(executionId);
      expect(result).toEqual(mockExecution);
    });

    it('should throw error when execution not found', async () => {
      mockExecutionRepository.findById.mockResolvedValue(null);

      await expect(
        executionService.getExecution(executionId, userId)
      ).rejects.toThrow(new AppError(
        ErrorCode.EXECUTION_NOT_FOUND,
        'Execution not found',
        404
      ));
    });

    it('should throw error when user does not have access', async () => {
      const mockExecution = createMockExecution({
        id: executionId,
        userId: 'different-user',
      });

      mockExecutionRepository.findById.mockResolvedValue(mockExecution);

      await expect(
        executionService.getExecution(executionId, userId)
      ).rejects.toThrow(new AppError(
        ErrorCode.FORBIDDEN,
        'Access denied to execution',
        403
      ));
    });
  });

  describe('retryExecution', () => {
    const executionId = 'execution-123';
    const userId = 'user-123';

    it('should retry failed execution successfully', async () => {
      const mockFailedExecution = createMockExecution({
        id: executionId,
        userId,
        status: ExecutionStatus.FAILED,
        workflowId: 'workflow-123',
        inputData: { test: 'data' },
      });
      const mockNewExecution = createMockExecution({
        id: 'execution-456',
        userId,
        workflowId: 'workflow-123',
      });

      mockExecutionRepository.findById.mockResolvedValue(mockFailedExecution);
      
      // Mock the triggerExecution method
      jest.spyOn(executionService, 'triggerExecution').mockResolvedValue(mockNewExecution);

      const result = await executionService.retryExecution(executionId, userId);

      expect(executionService.triggerExecution).toHaveBeenCalledWith(
        mockFailedExecution.workflowId,
        userId,
        mockFailedExecution.inputData
      );
      expect(result).toEqual(mockNewExecution);
    });

    it('should throw error when execution is not failed', async () => {
      const mockExecution = createMockExecution({
        id: executionId,
        userId,
        status: ExecutionStatus.SUCCESS, // Not failed
      });

      mockExecutionRepository.findById.mockResolvedValue(mockExecution);

      await expect(
        executionService.retryExecution(executionId, userId)
      ).rejects.toThrow(new AppError(
        ErrorCode.INVALID_INPUT,
        'Can only retry failed executions',
        400
      ));
    });
  });

  describe('streamExecutionLogs', () => {
    const executionId = 'execution-123';
    const userId = 'user-123';
    const message = 'Test log message';

    it('should stream logs via WebSocket', async () => {
      const mockExecution = createMockExecution({
        id: executionId,
        userId,
      });

      mockExecutionRepository.findById.mockResolvedValue(mockExecution);

      await executionService.streamExecutionLogs(executionId, userId, message);

      expect(mockWebSocketService.emitExecutionLog).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          executionId,
          message,
          level: 'info',
        })
      );
    });

    it('should handle different log levels', async () => {
      const mockExecution = createMockExecution({
        id: executionId,
        userId,
      });

      mockExecutionRepository.findById.mockResolvedValue(mockExecution);

      await executionService.streamExecutionLogs(executionId, userId, message, 'error', { error: 'details' });

      expect(mockWebSocketService.emitExecutionLog).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          executionId,
          message,
          level: 'error',
          data: { error: 'details' },
        })
      );
    });
  });

  describe('updateExecutionProgress', () => {
    const executionId = 'execution-123';
    const userId = 'user-123';
    const progress = 75;
    const currentStep = 'Processing data';

    it('should update progress via WebSocket', async () => {
      const mockExecution = createMockExecution({
        id: executionId,
        userId,
      });

      mockExecutionRepository.findById.mockResolvedValue(mockExecution);

      await executionService.updateExecutionProgress(executionId, userId, progress, currentStep);

      expect(mockWebSocketService.emitExecutionProgress).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          executionId,
          progress,
          currentStep,
        })
      );
    });

    it('should clamp progress between 0 and 100', async () => {
      const mockExecution = createMockExecution({
        id: executionId,
        userId,
      });

      mockExecutionRepository.findById.mockResolvedValue(mockExecution);

      // Test progress > 100
      await executionService.updateExecutionProgress(executionId, userId, 150);
      expect(mockWebSocketService.emitExecutionProgress).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          progress: 100,
        })
      );

      // Test progress < 0
      await executionService.updateExecutionProgress(executionId, userId, -10);
      expect(mockWebSocketService.emitExecutionProgress).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          progress: 0,
        })
      );
    });
  });

  describe('handleWebhookCallback', () => {
    const executionId = 'execution-123';

    it('should handle successful webhook callback', async () => {
      const mockExecution = createMockExecution({
        id: executionId,
        userId: 'user-123',
      });
      const outputData = { result: 'success' };

      mockExecutionRepository.findById.mockResolvedValue(mockExecution);
      mockExecutionRepository.update.mockResolvedValue({
        ...mockExecution,
        status: ExecutionStatus.SUCCESS,
        outputData,
      });

      await executionService.handleWebhookCallback(executionId, 'success', outputData);

      expect(mockExecutionRepository.update).toHaveBeenCalledWith(
        executionId,
        expect.objectContaining({
          status: ExecutionStatus.SUCCESS,
          outputData,
        })
      );
      expect(mockWebSocketService.emitExecutionCompleted).toHaveBeenCalled();
    });

    it('should handle failed webhook callback', async () => {
      const mockExecution = createMockExecution({
        id: executionId,
        userId: 'user-123',
      });
      const errorMessage = 'Execution failed';

      mockExecutionRepository.findById.mockResolvedValue(mockExecution);
      mockExecutionRepository.update.mockResolvedValue({
        ...mockExecution,
        status: ExecutionStatus.FAILED,
        errorMessage,
      });

      await executionService.handleWebhookCallback(executionId, 'failed', undefined, errorMessage);

      expect(mockExecutionRepository.update).toHaveBeenCalledWith(
        executionId,
        expect.objectContaining({
          status: ExecutionStatus.FAILED,
          errorMessage,
        })
      );
      expect(mockWebSocketService.emitExecutionFailed).toHaveBeenCalled();
    });

    it('should handle webhook for non-existent execution', async () => {
      mockExecutionRepository.findById.mockResolvedValue(null);

      // Should not throw error, just log warning
      await expect(
        executionService.handleWebhookCallback(executionId, 'success')
      ).resolves.not.toThrow();
    });
  });
});