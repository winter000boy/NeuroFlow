import { WebSocketService, webSocketService } from '../websocket.service';
import { getWebSocketServer } from '../../websocket/socketServer';
import { ExecutionStatus } from '../../../generated/prisma';

// Mock dependencies
jest.mock('../../websocket/socketServer');
jest.mock('../../config/logger.config', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockGetWebSocketServer = getWebSocketServer as jest.MockedFunction<typeof getWebSocketServer>;

describe('WebSocketService', () => {
  let mockServer: any;

  beforeEach(() => {
    mockServer = {
      emitToUser: jest.fn(),
      emitToExecution: jest.fn(),
      emitToWorkflow: jest.fn(),
      getIO: jest.fn(() => ({
        sockets: {
          sockets: new Map([
            ['socket1', { userId: 'user1' }],
            ['socket2', { userId: 'user2' }],
          ])
        }
      }))
    };

    mockGetWebSocketServer.mockReturnValue(mockServer);
    jest.clearAllMocks();
  });

  describe('isAvailable', () => {
    it('should return true when server is available', () => {
      expect(webSocketService.isAvailable()).toBe(true);
    });

    it('should return false when server is not available', () => {
      mockGetWebSocketServer.mockImplementation(() => {
        throw new Error('Server not available');
      });

      expect(webSocketService.isAvailable()).toBe(false);
    });
  });

  describe('emitExecutionStarted', () => {
    const userId = 'user-123';
    const executionData = {
      executionId: 'execution-123',
      workflowId: 'workflow-123',
      workflowName: 'Test Workflow',
      startedAt: new Date(),
      inputData: { test: 'data' },
    };

    it('should emit execution started event to user and rooms', () => {
      webSocketService.emitExecutionStarted(userId, executionData);

      expect(mockServer.emitToUser).toHaveBeenCalledWith(userId, 'execution:started', executionData);
      expect(mockServer.emitToExecution).toHaveBeenCalledWith(
        executionData.executionId,
        'execution:started',
        executionData
      );
      expect(mockServer.emitToWorkflow).toHaveBeenCalledWith(
        executionData.workflowId,
        'workflow:execution:started',
        expect.objectContaining({
          workflowId: executionData.workflowId,
          executionId: executionData.executionId,
        })
      );
    });

    it('should handle server unavailable gracefully', () => {
      mockGetWebSocketServer.mockImplementation(() => {
        throw new Error('Server not available');
      });

      expect(() => {
        webSocketService.emitExecutionStarted(userId, executionData);
      }).not.toThrow();
    });
  });

  describe('emitExecutionProgress', () => {
    const userId = 'user-123';
    const progressData = {
      executionId: 'execution-123',
      progress: 50,
      currentStep: 'Processing data',
      message: 'Halfway done',
    };

    it('should emit execution progress event', () => {
      webSocketService.emitExecutionProgress(userId, progressData);

      expect(mockServer.emitToUser).toHaveBeenCalledWith(userId, 'execution:progress', progressData);
      expect(mockServer.emitToExecution).toHaveBeenCalledWith(
        progressData.executionId,
        'execution:progress',
        progressData
      );
    });
  });

  describe('emitExecutionCompleted', () => {
    const userId = 'user-123';
    const completedData = {
      executionId: 'execution-123',
      workflowId: 'workflow-123',
      status: ExecutionStatus.SUCCESS,
      finishedAt: new Date(),
      outputData: { result: 'success' },
      duration: 5000,
    };

    it('should emit execution completed event', () => {
      webSocketService.emitExecutionCompleted(userId, completedData);

      expect(mockServer.emitToUser).toHaveBeenCalledWith(userId, 'execution:completed', completedData);
      expect(mockServer.emitToExecution).toHaveBeenCalledWith(
        completedData.executionId,
        'execution:completed',
        completedData
      );
      expect(mockServer.emitToWorkflow).toHaveBeenCalledWith(
        completedData.workflowId,
        'workflow:execution:completed',
        expect.objectContaining({
          workflowId: completedData.workflowId,
          executionId: completedData.executionId,
          status: completedData.status,
        })
      );
    });
  });

  describe('emitExecutionFailed', () => {
    const userId = 'user-123';
    const failedData = {
      executionId: 'execution-123',
      workflowId: 'workflow-123',
      error: 'Execution failed',
      finishedAt: new Date(),
      duration: 3000,
    };

    it('should emit execution failed event', () => {
      webSocketService.emitExecutionFailed(userId, failedData);

      expect(mockServer.emitToUser).toHaveBeenCalledWith(userId, 'execution:failed', failedData);
      expect(mockServer.emitToExecution).toHaveBeenCalledWith(
        failedData.executionId,
        'execution:failed',
        failedData
      );
      expect(mockServer.emitToWorkflow).toHaveBeenCalledWith(
        failedData.workflowId,
        'workflow:execution:completed',
        expect.objectContaining({
          workflowId: failedData.workflowId,
          executionId: failedData.executionId,
          status: 'FAILED',
        })
      );
    });
  });

  describe('emitExecutionLog', () => {
    const userId = 'user-123';
    const logData = {
      executionId: 'execution-123',
      timestamp: new Date(),
      level: 'info' as const,
      message: 'Processing step 1',
      data: { step: 1 },
    };

    it('should emit execution log event', () => {
      webSocketService.emitExecutionLog(userId, logData);

      expect(mockServer.emitToUser).toHaveBeenCalledWith(userId, 'execution:log', logData);
      expect(mockServer.emitToExecution).toHaveBeenCalledWith(
        logData.executionId,
        'execution:log',
        logData
      );
    });
  });

  describe('emitError', () => {
    const userId = 'user-123';
    const message = 'Test error';
    const code = 'TEST_ERROR';
    const details = { additional: 'info' };

    it('should emit error event to user', () => {
      webSocketService.emitError(userId, message, code, details);

      expect(mockServer.emitToUser).toHaveBeenCalledWith(userId, 'error', {
        message,
        code,
        details,
      });
    });
  });

  describe('getConnectedUsersCount', () => {
    it('should return connected users count', () => {
      const count = webSocketService.getConnectedUsersCount();

      expect(count).toBe(2);
      expect(mockServer.getIO).toHaveBeenCalled();
    });

    it('should return 0 when server is not available', () => {
      mockGetWebSocketServer.mockImplementation(() => {
        throw new Error('Server not available');
      });

      const count = webSocketService.getConnectedUsersCount();

      expect(count).toBe(0);
    });

    it('should handle errors gracefully', () => {
      mockServer.getIO.mockImplementation(() => {
        throw new Error('IO error');
      });

      const count = webSocketService.getConnectedUsersCount();

      expect(count).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle emit errors gracefully', () => {
      mockServer.emitToUser.mockImplementation(() => {
        throw new Error('Emit failed');
      });

      expect(() => {
        webSocketService.emitExecutionStarted('user-123', {
          executionId: 'execution-123',
          workflowId: 'workflow-123',
          workflowName: 'Test',
          startedAt: new Date(),
          inputData: {},
        });
      }).not.toThrow();
    });
  });
});