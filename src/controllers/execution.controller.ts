import { Request, Response, NextFunction } from 'express';
import { executionService } from '../services/execution.service';
import { ExecutionStatus } from '../../generated/prisma';
import { 
  ExecutionFilterDTO, 
  ExecutionSortDTO, 
  PaginationDTO 
} from '../types/execution.types';
import { AppError, ErrorCode } from '../utils/errors';
import { asyncHandler } from '../utils/asyncHandler.util';

/**
 * Trigger a new workflow execution
 */
export const triggerExecution = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'User authentication required', 401);
  }

  const { workflowId, inputData = {} } = req.body;

  if (!workflowId) {
    throw new AppError(ErrorCode.INVALID_INPUT, 'workflowId is required', 400);
  }

  const execution = await executionService.triggerExecution(
    workflowId,
    req.user.userId,
    inputData
  );

  res.status(202).json({ 
    success: true, 
    data: execution,
    message: 'Execution triggered successfully'
  });
});

/**
 * Get execution by ID
 */
export const getExecution = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'User authentication required', 401);
  }

  const execution = await executionService.getExecution(req.params.id, req.user.userId);
  
  res.json({ 
    success: true, 
    data: execution 
  });
});

/**
 * Get executions with filtering, sorting, and pagination
 */
export const getExecutions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'User authentication required', 401);
  }

  // Parse query parameters
  const {
    workflowId,
    status,
    startedAfter,
    startedBefore,
    finishedAfter,
    finishedBefore,
    sortField = 'startedAt',
    sortDirection = 'desc',
    page = '1',
    limit = '20'
  } = req.query;

  // Build filters
  const filters: Omit<ExecutionFilterDTO, 'userId'> = {};
  
  if (workflowId && typeof workflowId === 'string') {
    filters.workflowId = workflowId;
  }
  
  if (status && typeof status === 'string' && Object.values(ExecutionStatus).includes(status as ExecutionStatus)) {
    filters.status = status as ExecutionStatus;
  }
  
  if (startedAfter && typeof startedAfter === 'string') {
    filters.startedAfter = new Date(startedAfter);
  }
  
  if (startedBefore && typeof startedBefore === 'string') {
    filters.startedBefore = new Date(startedBefore);
  }
  
  if (finishedAfter && typeof finishedAfter === 'string') {
    filters.finishedAfter = new Date(finishedAfter);
  }
  
  if (finishedBefore && typeof finishedBefore === 'string') {
    filters.finishedBefore = new Date(finishedBefore);
  }

  // Build sort
  const sort: ExecutionSortDTO = {
    field: ['startedAt', 'finishedAt', 'status'].includes(sortField as string) 
      ? (sortField as ExecutionSortDTO['field']) 
      : 'startedAt',
    direction: ['asc', 'desc'].includes(sortDirection as string) 
      ? (sortDirection as 'asc' | 'desc') 
      : 'desc'
  };

  // Build pagination
  const pagination: PaginationDTO = {
    page: Math.max(1, parseInt(page as string) || 1),
    limit: Math.min(100, Math.max(1, parseInt(limit as string) || 20))
  };

  const result = await executionService.getExecutions(
    req.user.userId,
    filters,
    sort,
    pagination
  );

  res.json({ 
    success: true, 
    data: result.items,
    meta: result.meta
  });
});

/**
 * Get executions for a specific workflow
 */
export const getWorkflowExecutions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'User authentication required', 401);
  }

  const { workflowId } = req.params;
  const {
    sortField = 'startedAt',
    sortDirection = 'desc',
    page = '1',
    limit = '20'
  } = req.query;

  // Build sort
  const sort: ExecutionSortDTO = {
    field: ['startedAt', 'finishedAt', 'status'].includes(sortField as string) 
      ? (sortField as ExecutionSortDTO['field']) 
      : 'startedAt',
    direction: ['asc', 'desc'].includes(sortDirection as string) 
      ? (sortDirection as 'asc' | 'desc') 
      : 'desc'
  };

  // Build pagination
  const pagination: PaginationDTO = {
    page: Math.max(1, parseInt(page as string) || 1),
    limit: Math.min(100, Math.max(1, parseInt(limit as string) || 20))
  };

  const result = await executionService.getWorkflowExecutions(
    workflowId,
    req.user.userId,
    pagination,
    sort
  );

  res.json({ 
    success: true, 
    data: result.items,
    meta: result.meta
  });
});

/**
 * Get recent executions for the user
 */
export const getRecentExecutions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'User authentication required', 401);
  }

  const { limit = '10' } = req.query;
  const parsedLimit = Math.min(50, Math.max(1, parseInt(limit as string) || 10));

  const executions = await executionService.getRecentExecutions(req.user.userId, parsedLimit);

  res.json({ 
    success: true, 
    data: executions 
  });
});

/**
 * Get running executions for the user
 */
export const getRunningExecutions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'User authentication required', 401);
  }

  const executions = await executionService.getRunningExecutions(req.user.userId);

  res.json({ 
    success: true, 
    data: executions 
  });
});

/**
 * Cancel an execution
 */
export const cancelExecution = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'User authentication required', 401);
  }

  const execution = await executionService.cancelExecution(req.params.id, req.user.userId);

  res.json({ 
    success: true, 
    data: execution,
    message: 'Execution cancelled successfully'
  });
});

/**
 * Retry a failed execution
 */
export const retryExecution = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'User authentication required', 401);
  }

  const execution = await executionService.retryExecution(req.params.id, req.user.userId);

  res.status(202).json({ 
    success: true, 
    data: execution,
    message: 'Execution retry triggered successfully'
  });
});

/**
 * Delete an execution
 */
export const deleteExecution = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'User authentication required', 401);
  }

  await executionService.deleteExecution(req.params.id, req.user.userId);

  res.status(204).send();
});

/**
 * Get user execution analytics
 */
export const getUserAnalytics = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'User authentication required', 401);
  }

  const analytics = await executionService.getUserAnalytics(req.user.userId);

  res.json({ 
    success: true, 
    data: analytics 
  });
});

/**
 * Get workflow execution analytics
 */
export const getWorkflowAnalytics = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'User authentication required', 401);
  }

  const { workflowId } = req.params;
  const analytics = await executionService.getWorkflowAnalytics(workflowId, req.user.userId);

  res.json({ 
    success: true, 
    data: analytics 
  });
});

/**
 * Export executions to CSV/JSON
 */
export const exportExecutions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'User authentication required', 401);
  }

  const { format = 'json', workflowId } = req.query;

  // Build filters
  const filters: Omit<ExecutionFilterDTO, 'userId'> = {};
  if (workflowId && typeof workflowId === 'string') {
    filters.workflowId = workflowId;
  }

  // Get all executions (with a reasonable limit)
  const result = await executionService.getExecutions(
    req.user.userId,
    filters,
    { field: 'startedAt', direction: 'desc' },
    { page: 1, limit: 1000 }
  );

  if (format === 'csv') {
    // Convert to CSV format
    const csvHeaders = [
      'ID',
      'Workflow ID',
      'Status',
      'Started At',
      'Finished At',
      'Duration (ms)',
      'Has Error'
    ].join(',');

    const csvRows = result.items.map(execution => {
      const duration = execution.finishedAt 
        ? execution.finishedAt.getTime() - execution.startedAt.getTime()
        : null;

      return [
        execution.id,
        execution.workflowId,
        execution.status,
        execution.startedAt.toISOString(),
        execution.finishedAt?.toISOString() || '',
        duration || '',
        execution.errorMessage ? 'Yes' : 'No'
      ].join(',');
    });

    const csvContent = [csvHeaders, ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=executions.csv');
    res.send(csvContent);
  } else {
    // JSON format
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=executions.json');
    res.json({
      success: true,
      data: result.items,
      meta: result.meta,
      exportedAt: new Date().toISOString()
    });
  }
});

/**
 * Handle n8n webhook callbacks
 */
export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const { executionId, status, data, error } = req.body;

  if (!executionId) {
    throw new AppError(ErrorCode.INVALID_INPUT, 'executionId is required', 400);
  }

  if (!['success', 'failed'].includes(status)) {
    throw new AppError(ErrorCode.INVALID_INPUT, 'status must be "success" or "failed"', 400);
  }

  await executionService.handleWebhookCallback(executionId, status, data, error);

  res.json({ 
    success: true, 
    message: 'Webhook processed successfully' 
  });
});

// Legacy exports for backward compatibility
export const triggerExecution_legacy = triggerExecution;
export const getExecutionStatus = getExecution;
