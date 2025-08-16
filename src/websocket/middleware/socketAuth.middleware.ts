import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../../config/logger.config';
import { userRepository } from '../../repositories';

export interface AuthenticatedSocket extends Socket {
  userId: string;
  user: {
    id: string;
    email: string;
  };
}

export const socketAuthMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    // Extract token from handshake auth or query
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      logger.warn('WebSocket connection attempted without token');
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token as string, process.env.JWT_SECRET!) as { userId: string };
    
    if (!decoded.userId) {
      logger.warn('WebSocket connection attempted with invalid token payload');
      return next(new Error('Invalid token payload'));
    }

    // Fetch user details
    const user = await userRepository.findById(decoded.userId);
    
    if (!user) {
      logger.warn(`WebSocket connection attempted with token for non-existent user: ${decoded.userId}`);
      return next(new Error('User not found'));
    }

    // Attach user info to socket
    (socket as AuthenticatedSocket).userId = user.id;
    (socket as AuthenticatedSocket).user = {
      id: user.id,
      email: user.email
    };

    logger.info(`WebSocket authentication successful for user: ${user.email}`);
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('WebSocket connection attempted with invalid JWT token');
      return next(new Error('Invalid authentication token'));
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('WebSocket connection attempted with expired JWT token');
      return next(new Error('Authentication token expired'));
    }

    logger.error('WebSocket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};