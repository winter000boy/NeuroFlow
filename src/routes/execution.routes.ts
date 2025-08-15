import { Router } from 'express';
import {
  triggerExecution,
  getExecution,
  getExecutions,
  getWorkflowExecutions,
  getRecentExecutions,
  getRunningExecutions,
  cancelExecution,
  retryExecution,
  deleteExecution,
  getUserAnalytics,
  getWorkflowAnalytics,
  exportExecutions,
  handleWebhook,
} from '../controllers/execution.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { z } from 'zod';

const router = Router();

// Validation schemas
const triggerExecutionSchema = z.object({
  body: z.object({
    workflowId: z.string().min(1, 'Workflow ID is required'),
    inputData: z.record(z.unknown()).optional().default({}),
  }),
});

const getExecutionsSchema = z.object({
  query: z.object({
    workflowId: z.string().optional(),
    status: z.enum(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED']).optional(),
    startedAfter: z.string().datetime().optional(),
    startedBefore: z.string().datetime().optional(),
    finishedAfter: z.string().datetime().optional(),
    finishedBefore: z.string().datetime().optional(),
    sortField: z.enum(['startedAt', 'finishedAt', 'status']).optional(),
    sortDirection: z.enum(['asc', 'desc']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

const paginationSchema = z.object({
  query: z.object({
    sortField: z.enum(['startedAt', 'finishedAt', 'status']).optional(),
    sortDirection: z.enum(['asc', 'desc']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

const exportSchema = z.object({
  query: z.object({
    format: z.enum(['json', 'csv']).optional(),
    workflowId: z.string().optional(),
  }),
});

const webhookSchema = z.object({
  body: z.object({
    executionId: z.string().min(1, 'Execution ID is required'),
    status: z.enum(['success', 'failed']),
    data: z.unknown().optional(),
    error: z.string().optional(),
  }),
});

// Public webhook endpoint (no auth required)
router.post('/webhook', validate(webhookSchema), handleWebhook);

// All other routes require authentication
router.use(authenticate);

// Execution management
router.post('/', validate(triggerExecutionSchema), triggerExecution);
router.get('/', validate(getExecutionsSchema), getExecutions);
router.get('/recent', getRecentExecutions);
router.get('/running', getRunningExecutions);
router.get('/analytics', getUserAnalytics);
router.get('/export', validate(exportSchema), exportExecutions);

// Individual execution operations
router.get('/:id', getExecution);
router.post('/:id/cancel', cancelExecution);
router.post('/:id/retry', retryExecution);
router.delete('/:id', deleteExecution);

// Workflow-specific execution endpoints
router.get('/workflow/:workflowId', validate(paginationSchema), getWorkflowExecutions);
router.get('/workflow/:workflowId/analytics', getWorkflowAnalytics);

export default router;