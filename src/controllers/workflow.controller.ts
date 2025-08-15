import { Request, Response, NextFunction } from 'express';
import { workflowService } from '../services/workflow.service';
import { 
  CreateWorkflowSchema, 
  UpdateWorkflowSchema, 
  WorkflowQuerySchema,
  WorkflowParamsSchema 
} from '../schemas/workflow.schema';
import { AppError, ErrorCode } from '../utils/errors';
import { asyncHandler } from '../utils/asyncHandler.util';
import { WorkflowStatus } from '../../generated/prisma';

/**
 * Create a new workflow
 * POST /api/workflows
 */
export const createWorkflow = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'User not authenticated', 401);
  }

  // Validate request body
  const validatedData = CreateWorkflowSchema.parse(req.body);
  
  const workflow = await workflowService.createWorkflow(userId, validatedData);
  
  res.status(201).json({
    success: true,
    data: workflow,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Get user's workflows with pagination and filtering
 * GET /api/workflows
 */
export const getWorkflows = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'User not authenticated', 401);
  }

  // Validate query parameters
  const queryParams = WorkflowQuerySchema.parse(req.query);
  
  const result = await workflowService.getUserWorkflows(userId, queryParams);
  
  res.json({
    success: true,
    data: result.workflows,
    meta: {
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Get workflow by ID
 * GET /api/workflows/:id
 */
export const getWorkflowById = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'User not authenticated', 401);
  }

  // Validate parameters
  const { id } = WorkflowParamsSchema.parse(req.params);
  
  const workflow = await workflowService.getWorkflowById(id, userId);
  
  res.json({
    success: true,
    data: workflow,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Get workflow with statistics
 * GET /api/workflows/:id/stats
 */
export const getWorkflowStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'User not authenticated', 401);
  }

  // Validate parameters
  const { id } = WorkflowParamsSchema.parse(req.params);
  
  const workflowWithStats = await workflowService.getWorkflowWithStats(id, userId);
  
  res.json({
    success: true,
    data: workflowWithStats,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Update workflow
 * PUT /api/workflows/:id
 */
export const updateWorkflow = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'User not authenticated', 401);
  }

  // Validate parameters and body
  const { id } = WorkflowParamsSchema.parse(req.params);
  const validatedData = UpdateWorkflowSchema.parse(req.body);
  
  const workflow = await workflowService.updateWorkflow(id, userId, validatedData);
  
  res.json({
    success: true,
    data: workflow,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Update workflow status
 * PATCH /api/workflows/:id/status
 */
export const updateWorkflowStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'User not authenticated', 401);
  }

  // Validate parameters
  const { id } = WorkflowParamsSchema.parse(req.params);
  const { status } = req.body;
  
  if (!Object.values(WorkflowStatus).includes(status)) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR, 
      'Invalid workflow status', 
      400
    );
  }
  
  const workflow = await workflowService.updateWorkflowStatus(id, userId, status);
  
  res.json({
    success: true,
    data: workflow,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Duplicate workflow
 * POST /api/workflows/:id/duplicate
 */
export const duplicateWorkflow = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'User not authenticated', 401);
  }

  // Validate parameters
  const { id } = WorkflowParamsSchema.parse(req.params);
  const { name } = req.body;
  
  const workflow = await workflowService.duplicateWorkflow(id, userId, name);
  
  res.status(201).json({
    success: true,
    data: workflow,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Soft delete workflow (set to INACTIVE)
 * DELETE /api/workflows/:id/soft
 */
export const softDeleteWorkflow = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'User not authenticated', 401);
  }

  // Validate parameters
  const { id } = WorkflowParamsSchema.parse(req.params);
  
  const workflow = await workflowService.softDeleteWorkflow(id, userId);
  
  res.json({
    success: true,
    data: workflow,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Hard delete workflow
 * DELETE /api/workflows/:id
 */
export const deleteWorkflow = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'User not authenticated', 401);
  }

  // Validate parameters
  const { id } = WorkflowParamsSchema.parse(req.params);
  
  await workflowService.deleteWorkflow(id, userId);
  
  res.status(204).send();
});

/**
 * Validate workflow definition
 * POST /api/workflows/validate
 */
export const validateWorkflowDefinition = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'User not authenticated', 401);
  }

  const { definition } = req.body;
  
  if (!definition) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR, 
      'Workflow definition is required', 
      400
    );
  }
  
  const isValid = await workflowService.validateWorkflowDefinition(definition);
  
  res.json({
    success: true,
    data: {
      valid: isValid,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});
