import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError, ErrorCode } from '../utils/errors';

/**
 * Generic validation middleware factory
 */
export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const validatedData = schema.parse(data);
      
      // Replace the original data with validated data
      req[source] = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
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
      
      next(error);
    }
  };
};

/**
 * Validate request body
 */
export const validateBody = (schema: ZodSchema) => validate(schema, 'body');

/**
 * Validate query parameters
 */
export const validateQuery = (schema: ZodSchema) => validate(schema, 'query');

/**
 * Validate route parameters
 */
export const validateParams = (schema: ZodSchema) => validate(schema, 'params');

/**
 * Workflow-specific validation middleware
 */
export const validateWorkflowOwnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const workflowId = req.params.id;
    
    if (!userId) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'User not authenticated', 401);
    }
    
    if (!workflowId) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Workflow ID is required', 400);
    }
    
    // This will be used by the service layer to check ownership
    req.workflowId = workflowId;
    req.userId = userId;
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Pagination validation middleware
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const { page = 1, limit = 10 } = req.query;
  
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  
  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Page must be a positive integer',
      },
    });
  }
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return res.status(400).json({
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Limit must be between 1 and 100',
      },
    });
  }
  
  req.query.page = pageNum.toString();
  req.query.limit = limitNum.toString();
  
  next();
};