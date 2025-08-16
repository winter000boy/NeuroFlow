import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger.config';
import { socketAuthMiddleware } from './middleware/socketAuth.middleware';
import { connectionManagerMiddleware } from './middleware/connectionManager.middleware';
import { executionHandlers } from './handlers/execution.handlers';
import { ClientToServerEvents, ServerToClientEvents } from '../types/websocket.types';

export interface AuthenticatedSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
  userId: string;
  user: {
    id: string;
    email: string;
  };
}

export class WebSocketServer {
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(socketAuthMiddleware);
    
    // Connection management middleware
    this.io.use(connectionManagerMiddleware);
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      const authenticatedSocket = socket as AuthenticatedSocket;
      logger.info(`User ${authenticatedSocket.userId} connected via WebSocket`);

      // Join user to their personal room
      authenticatedSocket.join(`user:${authenticatedSocket.userId}`);

      // Setup execution-related handlers
      executionHandlers(authenticatedSocket, this.io);

      // Handle disconnection
      authenticatedSocket.on('disconnect', (reason) => {
        logger.info(`User ${authenticatedSocket.userId} disconnected: ${reason}`);
      });

      // Handle errors
      authenticatedSocket.on('error', (error) => {
        logger.error(`WebSocket error for user ${authenticatedSocket.userId}:`, error);
      });
    });
  }

  // Method to emit events to specific users
  public emitToUser(userId: string, event: keyof ServerToClientEvents, data: any): void {
    (this.io.to(`user:${userId}`) as any).emit(event, data);
  }

  // Method to emit events to workflow subscribers
  public emitToWorkflow(workflowId: string, event: keyof ServerToClientEvents, data: any): void {
    (this.io.to(`workflow:${workflowId}`) as any).emit(event, data);
  }

  // Method to emit events to execution subscribers
  public emitToExecution(executionId: string, event: keyof ServerToClientEvents, data: any): void {
    (this.io.to(`execution:${executionId}`) as any).emit(event, data);
  }

  // Get the Socket.IO instance
  public getIO(): SocketIOServer<ClientToServerEvents, ServerToClientEvents> {
    return this.io;
  }
}

// Singleton instance
let webSocketServer: WebSocketServer | null = null;

export const initializeWebSocketServer = (httpServer: HTTPServer): WebSocketServer => {
  if (!webSocketServer) {
    webSocketServer = new WebSocketServer(httpServer);
  }
  return webSocketServer;
};

export const getWebSocketServer = (): WebSocketServer => {
  if (!webSocketServer) {
    throw new Error('WebSocket server not initialized. Call initializeWebSocketServer first.');
  }
  return webSocketServer;
};