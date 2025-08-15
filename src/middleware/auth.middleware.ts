import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AUTH_CONFIG } from '../config';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      error: { 
        code: 'UNAUTHORIZED',
        message: 'Authorization header missing or invalid format' 
      } 
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: { 
        code: 'UNAUTHORIZED',
        message: 'Access token missing' 
      } 
    });
  }

  try {
    const payload = jwt.verify(token, AUTH_CONFIG.jwtSecret) as { userId: string };
    req.user = { userId: payload.userId };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ 
        success: false, 
        error: { 
          code: 'TOKEN_EXPIRED',
          message: 'Access token expired' 
        } 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      error: { 
        code: 'UNAUTHORIZED',
        message: 'Invalid access token' 
      } 
    });
  }
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, AUTH_CONFIG.jwtSecret) as { userId: string };
    req.user = { userId: payload.userId };
  } catch (error) {
    // For optional auth, we don't return an error, just continue without user
  }
  
  next();
};
