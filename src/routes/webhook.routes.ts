import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';
import { rateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

/**
 * @swagger
 * /api/webhooks/n8n:
 *   post:
 *     summary: Handle n8n execution webhook
 *     description: Receives webhook callbacks from n8n when workflow executions start, progress, or complete
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               executionId:
 *                 type: string
 *                 description: The execution ID
 *               workflowId:
 *                 type: string
 *                 description: The workflow ID
 *               finished:
 *                 type: boolean
 *                 description: Whether the execution is finished
 *               mode:
 *                 type: string
 *                 description: Execution mode
 *               startedAt:
 *                 type: string
 *                 format: date-time
 *                 description: When the execution started
 *               stoppedAt:
 *                 type: string
 *                 format: date-time
 *                 description: When the execution stopped (if finished)
 *               data:
 *                 type: object
 *                 description: Execution result data
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid webhook payload
 *       401:
 *         description: Invalid webhook signature
 *       500:
 *         description: Internal server error
 */
router.post('/n8n', rateLimiter({ windowMs: 60000, max: 1000 }), webhookController.handleN8nWebhook);

/**
 * @swagger
 * /api/webhooks/n8n/start:
 *   post:
 *     summary: Handle n8n execution start webhook
 *     description: Receives webhook when n8n workflow execution starts
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               executionId:
 *                 type: string
 *               workflowId:
 *                 type: string
 *               startedAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Execution start processed
 *       400:
 *         description: Invalid payload
 */
router.post('/n8n/start', rateLimiter({ windowMs: 60000, max: 1000 }), webhookController.handleExecutionStart);

/**
 * @swagger
 * /api/webhooks/n8n/complete:
 *   post:
 *     summary: Handle n8n execution completion webhook
 *     description: Receives webhook when n8n workflow execution completes
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               executionId:
 *                 type: string
 *               workflowId:
 *                 type: string
 *               finished:
 *                 type: boolean
 *               stoppedAt:
 *                 type: string
 *                 format: date-time
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Execution completion processed
 *       400:
 *         description: Invalid payload
 */
router.post('/n8n/complete', rateLimiter({ windowMs: 60000, max: 1000 }), webhookController.handleExecutionComplete);

/**
 * @swagger
 * /api/webhooks/health:
 *   get:
 *     summary: Webhook service health check
 *     description: Check if the webhook service is healthy
 *     tags: [Webhooks]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                     service:
 *                       type: string
 */
router.get('/health', webhookController.healthCheck);

export default router;