import { Socket } from 'socket.io';
import { logger } from '../../config/logger.config';
import { AuthenticatedSocket } from '../socketServer';

// Connection state management
const userConnections = new Map<string, Set<string>>();
const socketUsers = new Map<string, string>();

export const connectionManagerMiddleware = (socket: Socket, next: (err?: Error) => void) => {
  const authenticatedSocket = socket as AuthenticatedSocket;
  
  // Track user connections
  const userId = authenticatedSocket.userId;
  const socketId = socket.id;

  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set());
  }
  
  userConnections.get(userId)!.add(socketId);
  socketUsers.set(socketId, userId);

  logger.info(`User ${userId} connected with socket ${socketId}. Total connections: ${userConnections.get(userId)!.size}`);

  // Handle disconnection cleanup
  socket.on('disconnect', (reason) => {
    const userId = socketUsers.get(socketId);
    if (userId) {
      const userSockets = userConnections.get(userId);
      if (userSockets) {
        userSockets.delete(socketId);
        if (userSockets.size === 0) {
          userConnections.delete(userId);
          logger.info(`User ${userId} fully disconnected`);
        } else {
          logger.info(`User ${userId} disconnected socket ${socketId}. Remaining connections: ${userSockets.size}`);
        }
      }
      socketUsers.delete(socketId);
    }
  });

  next();
};

// Utility functions for connection management
export const getConnectedUsers = (): string[] => {
  return Array.from(userConnections.keys());
};

export const getUserConnectionCount = (userId: string): number => {
  return userConnections.get(userId)?.size || 0;
};

export const isUserConnected = (userId: string): boolean => {
  return userConnections.has(userId) && userConnections.get(userId)!.size > 0;
};

export const getTotalConnections = (): number => {
  let total = 0;
  for (const connections of userConnections.values()) {
    total += connections.size;
  }
  return total;
};