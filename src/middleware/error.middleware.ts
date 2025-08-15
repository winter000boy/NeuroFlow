import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.config';
import { AppError, ErrorCode } from '../utils/errors';
import { ZodError } from 'zod';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Log error details
  logger.error(err.message, { 
    stack: err.stack, 
    path: req.path,
    method: req.method,
    userId: req.user?.userId,
  });

  // Handle AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errorMessages = err.errors.map(error => ({
      field: error.path.join('.'),
      message: error.message,
      code: error.code,
    }));

    return res.status(400).json({
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        details: errorMessages,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Handle Prisma errors
  if (err.code && err.code.startsWith('P')) {
    let message = 'Database error';
    let statusCode = 500;

    switch (err.code) {
      case 'P2002':
        message = 'A record with this data already exists';
        statusCode = 409;
        break;
      case 'P2025':
        message = 'Record not found';
        statusCode = 404;
        break;
      case 'P2003':
        message = 'Foreign key constraint failed';
        statusCode = 400;
        break;
    }

    return res.status(statusCode).json({
      success: false,
      error: {
        code: ErrorCode.DATABASE_ERROR,
        message,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        code: ErrorCode.UNAUTHORIZED,
        message: 'Invalid token',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: ErrorCode.TOKEN_EXPIRED,
        message: 'Token expired',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Default error response
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : err.message || 'Internal Server Error',
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};
