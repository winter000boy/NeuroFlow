import { Router } from 'express';
import { healthController } from '../controllers';
import { getMetrics, resetMetrics } from '../middleware/monitoring.middleware';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     HealthStatus:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [healthy, unhealthy, degraded]
 *           description: Overall health status
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Timestamp of the health check
 *         uptime:
 *           type: number
 *           description: Application uptime in seconds
 *         version:
 *           type: string
 *           description: Application version
 *         environment:
 *           type: string
 *           description: Current environment (development, production, etc.)
 *     
 *     DetailedHealthStatus:
 *       allOf:
 *         - $ref: '#/components/schemas/HealthStatus'
 *         - type: object
 *           properties:
 *             dependencies:
 *               type: object
 *               properties:
 *                 database:
 *                   $ref: '#/components/schemas/DependencyStatus'
 *                 redis:
 *                   $ref: '#/components/schemas/DependencyStatus'
 *                 n8n:
 *                   $ref: '#/components/schemas/DependencyStatus'
 *             system:
 *               type: object
 *               properties:
 *                 memory:
 *                   type: object
 *                   properties:
 *                     used:
 *                       type: number
 *                       description: Used memory in bytes
 *                     total:
 *                       type: number
 *                       description: Total memory in bytes
 *                     percentage:
 *                       type: number
 *                       description: Memory usage percentage
 *                 cpu:
 *                   type: object
 *                   properties:
 *                     usage:
 *                       type: number
 *                       description: CPU usage in seconds
 *     
 *     DependencyStatus:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [healthy, unhealthy]
 *           description: Dependency health status
 *         responseTime:
 *           type: number
 *           description: Response time in milliseconds
 *         error:
 *           type: string
 *           description: Error message if unhealthy
 *         lastChecked:
 *           type: string
 *           format: date-time
 *           description: Timestamp of last check
 */

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Basic health check
 *     description: Returns basic health status of the application
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 *             example:
 *               status: "healthy"
 *               timestamp: "2024-01-15T10:30:00.000Z"
 *               uptime: 3600
 *               version: "1.0.0"
 *               environment: "development"
 */
router.get('/', healthController.healthCheck);

/**
 * @swagger
 * /api/health/detailed:
 *   get:
 *     summary: Detailed health check
 *     description: Returns comprehensive health status including dependencies and system metrics
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DetailedHealthStatus'
 *       503:
 *         description: Application is unhealthy or degraded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DetailedHealthStatus'
 */
router.get('/detailed', healthController.detailedHealthCheck);

/**
 * @swagger
 * /api/health/ready:
 *   get:
 *     summary: Readiness probe
 *     description: Kubernetes/Docker readiness probe endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is ready to serve traffic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ready"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       503:
 *         description: Application is not ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "not ready"
 *                 reason:
 *                   type: string
 *                   example: "Database not available"
 */
router.get('/ready', healthController.readinessCheck);

/**
 * @swagger
 * /api/health/live:
 *   get:
 *     summary: Liveness probe
 *     description: Kubernetes/Docker liveness probe endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is alive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "alive"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Application uptime in seconds
 */
router.get('/live', healthController.livenessCheck);

/**
 * @swagger
 * /api/health/metrics:
 *   get:
 *     summary: Application metrics
 *     description: Get comprehensive application metrics including request counts, response times, and error rates
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     requests:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                           description: Total number of requests
 *                         byMethod:
 *                           type: object
 *                           description: Request count by HTTP method
 *                         byStatus:
 *                           type: object
 *                           description: Request count by status code
 *                         byEndpoint:
 *                           type: object
 *                           description: Request count by endpoint
 *                     responseTime:
 *                       type: object
 *                       properties:
 *                         average:
 *                           type: number
 *                           description: Average response time in ms
 *                         min:
 *                           type: number
 *                           description: Minimum response time in ms
 *                         max:
 *                           type: number
 *                           description: Maximum response time in ms
 *                     errors:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                           description: Total number of errors
 *                         byType:
 *                           type: object
 *                           description: Error count by type
 *                         recent:
 *                           type: array
 *                           description: Recent errors
 *                     healthScore:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 100
 *                       description: Overall health score (0-100)
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/metrics', authenticate, getMetrics);

/**
 * @swagger
 * /api/health/metrics/reset:
 *   post:
 *     summary: Reset metrics
 *     description: Reset all collected metrics (development/testing only)
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Metrics reset successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
if (process.env.NODE_ENV !== 'production') {
  router.post('/metrics/reset', authenticate, resetMetrics);
}

export default router;