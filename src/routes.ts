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
    name: z.string().optional(),
  }),
});
const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
});
const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string(),
  }),
});
const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(6),
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
router.post('/auth/refresh', validate(refreshTokenSchema), authController.refreshToken);
router.post('/auth/logout', validate(refreshTokenSchema), authController.logout);
router.post('/auth/logout-all', authenticate, authController.logoutAll);

// User routes (protected)
router.get('/users', authenticate, userController.getAllUsers);
router.get('/users/:id', authenticate, userController.getUserById);

// User profile routes (protected)
router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, validate(updateProfileSchema), userController.updateProfile);
router.put('/profile/password', authenticate, validate(changePasswordSchema), userController.changePassword);
router.delete('/profile', authenticate, userController.deleteAccount);

// Workflow routes (protected)
import workflowRoutes from './routes/workflow.routes';
router.use('/workflows', workflowRoutes);

// Execution routes (protected)
import executionRoutes from './routes/execution.routes';
router.use('/executions', executionRoutes);

// 404 handler
router.use(notFound);

// Error handler (last in chain)
router.use(errorHandler);

export default router;
