import { Router } from 'express';
import {
  createWorkflow,
  getWorkflows,
  getWorkflowById,
  getWorkflowStats,
  updateWorkflow,
  updateWorkflowStatus,
  duplicateWorkflow,
  softDeleteWorkflow,
  deleteWorkflow,
  validateWorkflowDefinition,
} from '../controllers/workflow.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  validateBody,
  validateQuery,
  validateParams,
  validatePagination,
} from '../middleware/validation.middleware';
import {
  CreateWorkflowSchema,
  UpdateWorkflowSchema,
  WorkflowQuerySchema,
  WorkflowParamsSchema,
} from '../schemas/workflow.schema';

const router = Router();

// Apply authentication to all workflow routes
router.use(authenticate);

/**
 * @swagger
 * /api/workflows:
 *   post:
 *     summary: Create a new workflow
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - definition
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               definition:
 *                 type: object
 *               status:
 *                 type: string
 *                 enum: [DRAFT, ACTIVE, INACTIVE]
 *     responses:
 *       201:
 *         description: Workflow created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', validateBody(CreateWorkflowSchema), createWorkflow);

/**
 * @swagger
 * /api/workflows:
 *   get:
 *     summary: Get user's workflows with pagination and filtering
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, ACTIVE, INACTIVE]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, updatedAt, status]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Workflows retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', validateQuery(WorkflowQuerySchema), getWorkflows);

/**
 * @swagger
 * /api/workflows/validate:
 *   post:
 *     summary: Validate workflow definition
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - definition
 *             properties:
 *               definition:
 *                 type: object
 *     responses:
 *       200:
 *         description: Validation result
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/validate', validateWorkflowDefinition);

/**
 * @swagger
 * /api/workflows/{id}:
 *   get:
 *     summary: Get workflow by ID
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workflow retrieved successfully
 *       404:
 *         description: Workflow not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', validateParams(WorkflowParamsSchema), getWorkflowById);

/**
 * @swagger
 * /api/workflows/{id}/stats:
 *   get:
 *     summary: Get workflow with execution statistics
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workflow with stats retrieved successfully
 *       404:
 *         description: Workflow not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/stats', validateParams(WorkflowParamsSchema), getWorkflowStats);

/**
 * @swagger
 * /api/workflows/{id}:
 *   put:
 *     summary: Update workflow
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               definition:
 *                 type: object
 *               status:
 *                 type: string
 *                 enum: [DRAFT, ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: Workflow updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Workflow not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', validateParams(WorkflowParamsSchema), validateBody(UpdateWorkflowSchema), updateWorkflow);

/**
 * @swagger
 * /api/workflows/{id}/status:
 *   patch:
 *     summary: Update workflow status
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [DRAFT, ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: Workflow status updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Workflow not found
 *       401:
 *         description: Unauthorized
 */
router.patch('/:id/status', validateParams(WorkflowParamsSchema), updateWorkflowStatus);

/**
 * @swagger
 * /api/workflows/{id}/duplicate:
 *   post:
 *     summary: Duplicate workflow
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name for the duplicated workflow
 *     responses:
 *       201:
 *         description: Workflow duplicated successfully
 *       404:
 *         description: Workflow not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/duplicate', validateParams(WorkflowParamsSchema), duplicateWorkflow);

/**
 * @swagger
 * /api/workflows/{id}/soft:
 *   delete:
 *     summary: Soft delete workflow (set to INACTIVE)
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workflow soft deleted successfully
 *       404:
 *         description: Workflow not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id/soft', validateParams(WorkflowParamsSchema), softDeleteWorkflow);

/**
 * @swagger
 * /api/workflows/{id}:
 *   delete:
 *     summary: Hard delete workflow
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Workflow deleted successfully
 *       400:
 *         description: Cannot delete workflow with active executions
 *       404:
 *         description: Workflow not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', validateParams(WorkflowParamsSchema), deleteWorkflow);

export default router;