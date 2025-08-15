import { Router } from 'express';
import { authController, userController, workflowController, executionController, healthController } from './controllers';
import { authenticate } from './middleware/auth.middleware';
import { notFound } from './middleware/notFound.middleware';
import { errorHandler } from './middleware/error.middleware';
import { httpLogger } from './middleware/logger.middleware';
import { validate } from './middleware/validate.middleware';

// Example: Zod validation schemas
import { z } from 'zod';
const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
});
const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
});
const workflowSchema = z.object({
  body: z.object({
    name: z.string().min(3),
    description: z.string().optional(),
  }),
});

const router = Router();

// Apply request logger to all routes
router.use(httpLogger);

// Health check
router.get('/health', healthController.healthCheck);

// Auth routes
router.post('/auth/register', validate(registerSchema), authController.register);
router.post('/auth/login', validate(loginSchema), authController.login);
router.post('/auth/refresh', authController.refreshToken);

// User routes (protected)
router.get('/users', authenticate, userController.getAllUsers);
router.get('/users/:id', authenticate, userController.getUserById);

// Workflow routes (protected)
router.post('/workflows', authenticate, validate(workflowSchema), workflowController.createWorkflow);
router.get('/workflows', authenticate, workflowController.getAllWorkflows);

// Execution routes (protected)
router.post('/executions', authenticate, executionController.triggerExecution);
router.get('/executions/:id', authenticate, executionController.getExecutionStatus);

// 404 handler
router.use(notFound);

// Error handler (last in chain)
router.use(errorHandler);

export default router;
