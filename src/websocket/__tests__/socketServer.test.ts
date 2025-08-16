import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import Client from 'socket.io-client';
import { createSocketServer } from '../socketServer';
import { webSocketService } from '../../services/websocket.service';

// Mock dependencies
jest.mock('../../services/websocket.service');
jest.mock('../../config/logger.config', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockWebSocketService = webSocketService as jest.Mocked<typeof webSocketService>;

describe('SocketServer', () => {
  let httpServer: any;
  let io: SocketIOServer;
  let clientSocket: any;
  let serverSocket: any;

  beforeAll((done) => {
    httpServer = createServer();
    io = createSocketServer(httpServer);
    
    httpServer.listen(() => {
      const port = (httpServer.address() as any).port;
      clientSocket = Client(`http://localhost:${port}`, {
        auth: {
          token: 'valid-jwt-token'
        }
      });
      
      io.on('connection', (socket) => {
        serverSocket = socket;
      });
      
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    io.close();
    clientSocket.close();
    httpServer.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection', () => {
    it('should establish WebSocket connection', (done) => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    it('should authenticate user on connection', () => {
      expect(serverSocket.userId).toBeDefined();
    });

    it('should join user to their room', () => {
      expect(serverSocket.rooms.has(`user:${serverSocket.userId}`)).toBe(true);
    });
  });

  describe('Execution Events', () => {
    const mockExecutionData = {
      executionId: 'execution-123',
      workflowId: 'workflow-123',
      workflowName: 'Test Workflow',
      startedAt: new Date(),
      inputData: { test: 'data' }
    };

    it('should handle execution started event', (done) => {
      clientSocket.on('execution:started', (data: any) => {
        expect(data).toEqual(mockExecutionData);
        done();
      });

      serverSocket.emit('execution:started', mockExecutionData);
    });

    it('should handle execution progress event', (done) => {
      const progressData = {
        executionId: 'execution-123',
        progress: 50,
        currentStep: 'Processing data',
        message: 'Halfway done'
      };

      clientSocket.on('execution:progress', (data: any) => {
        expect(data).toEqual(progressData);
        done();
      });

      serverSocket.emit('execution:progress', progressData);
    });

    it('should handle execution completed event', (done) => {
      const completedData = {
        executionId: 'execution-123',
        workflowId: 'workflow-123',
        status: 'SUCCESS',
        finishedAt: new Date(),
        outputData: { result: 'success' },
        duration: 5000
      };

      clientSocket.on('execution:completed', (data: any) => {
        expect(data).toEqual(completedData);
        done();
      });

      serverSocket.emit('execution:completed', completedData);
    });

    it('should handle execution failed event', (done) => {
      const failedData = {
        executionId: 'execution-123',
        workflowId: 'workflow-123',
        error: 'Execution failed',
        finishedAt: new Date(),
        duration: 3000
      };

      clientSocket.on('execution:failed', (data: any) => {
        expect(data).toEqual(failedData);
        done();
      });

      serverSocket.emit('execution:failed', failedData);
    });

    it('should handle execution log event', (done) => {
      const logData = {
        executionId: 'execution-123',
        timestamp: new Date(),
        level: 'info',
        message: 'Processing step 1',
        data: { step: 1 }
      };

      clientSocket.on('execution:log', (data: any) => {
        expect(data).toEqual(logData);
        done();
      });

      serverSocket.emit('execution:log', logData);
    });
  });

  describe('Room Management', () => {
    it('should join execution room', (done) => {
      const executionId = 'execution-123';
      
      serverSocket.on('join:execution', (data: any) => {
        expect(data.executionId).toBe(executionId);
        expect(serverSocket.rooms.has(`execution:${executionId}`)).toBe(true);
        done();
      });

      clientSocket.emit('join:execution', { executionId });
    });

    it('should leave execution room', (done) => {
      const executionId = 'execution-123';
      
      // First join the room
      serverSocket.join(`execution:${executionId}`);
      
      serverSocket.on('leave:execution', (data: any) => {
        expect(data.executionId).toBe(executionId);
        expect(serverSocket.rooms.has(`execution:${executionId}`)).toBe(false);
        done();
      });

      clientSocket.emit('leave:execution', { executionId });
    });

    it('should join workflow room', (done) => {
      const workflowId = 'workflow-123';
      
      serverSocket.on('join:workflow', (data: any) => {
        expect(data.workflowId).toBe(workflowId);
        expect(serverSocket.rooms.has(`workflow:${workflowId}`)).toBe(true);
        done();
      });

      clientSocket.emit('join:workflow', { workflowId });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid authentication', (done) => {
      const invalidClient = Client(`http://localhost:${(httpServer.address() as any).port}`, {
        auth: {
          token: 'invalid-token'
        }
      });

      invalidClient.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication failed');
        invalidClient.close();
        done();
      });
    });

    it('should handle missing authentication', (done) => {
      const unauthClient = Client(`http://localhost:${(httpServer.address() as any).port}`);

      unauthClient.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication required');
        unauthClient.close();
        done();
      });
    });

    it('should handle socket errors gracefully', (done) => {
      serverSocket.on('error', (error: Error) => {
        expect(error).toBeInstanceOf(Error);
        done();
      });

      // Simulate an error
      serverSocket.emit('error', new Error('Test error'));
    });
  });

  describe('Disconnection', () => {
    it('should clean up on disconnect', (done) => {
      const userId = serverSocket.userId;
      
      serverSocket.on('disconnect', () => {
        // Verify cleanup was called
        expect(mockWebSocketService.handleDisconnection).toHaveBeenCalledWith(userId);
        done();
      });

      clientSocket.disconnect();
    });

    it('should leave all rooms on disconnect', (done) => {
      const executionId = 'execution-123';
      const workflowId = 'workflow-123';
      
      // Join some rooms
      serverSocket.join(`execution:${executionId}`);
      serverSocket.join(`workflow:${workflowId}`);
      
      serverSocket.on('disconnect', () => {
        expect(serverSocket.rooms.size).toBe(0);
        done();
      });

      clientSocket.disconnect();
    });
  });

  describe('Broadcasting', () => {
    let secondClientSocket: any;

    beforeAll((done) => {
      const port = (httpServer.address() as any).port;
      secondClientSocket = Client(`http://localhost:${port}`, {
        auth: {
          token: 'valid-jwt-token-2'
        }
      });
      
      secondClientSocket.on('connect', done);
    });

    afterAll(() => {
      secondClientSocket.close();
    });

    it('should broadcast to specific user room', (done) => {
      const userId = serverSocket.userId;
      const testData = { message: 'test broadcast' };
      
      clientSocket.on('test:broadcast', (data: any) => {
        expect(data).toEqual(testData);
        done();
      });

      // Broadcast to user room
      io.to(`user:${userId}`).emit('test:broadcast', testData);
    });

    it('should broadcast to execution room', (done) => {
      const executionId = 'execution-123';
      const testData = { executionId, message: 'execution broadcast' };
      
      // Both clients join the execution room
      serverSocket.join(`execution:${executionId}`);
      
      let receivedCount = 0;
      const checkDone = () => {
        receivedCount++;
        if (receivedCount === 1) done(); // Only one client should receive
      };

      clientSocket.on('test:execution', checkDone);
      secondClientSocket.on('test:execution', () => {
        // This should not be called since second client is not in the room
        done(new Error('Second client should not receive the message'));
      });

      // Broadcast to execution room
      io.to(`execution:${executionId}`).emit('test:execution', testData);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rapid event emissions', (done) => {
      let eventCount = 0;
      const maxEvents = 10;
      
      serverSocket.on('rapid:test', () => {
        eventCount++;
        if (eventCount === maxEvents) {
          done();
        }
      });

      // Emit events rapidly
      for (let i = 0; i < maxEvents; i++) {
        clientSocket.emit('rapid:test', { count: i });
      }
    });

    it('should throttle excessive events', (done) => {
      let eventCount = 0;
      const startTime = Date.now();
      
      serverSocket.on('throttle:test', () => {
        eventCount++;
        
        // After receiving some events, check if throttling is working
        if (eventCount === 5) {
          const elapsed = Date.now() - startTime;
          // Should take some time due to throttling
          expect(elapsed).toBeGreaterThan(100);
          done();
        }
      });

      // Emit many events quickly
      for (let i = 0; i < 20; i++) {
        setTimeout(() => {
          clientSocket.emit('throttle:test', { count: i });
        }, i * 10);
      }
    });
  });
});