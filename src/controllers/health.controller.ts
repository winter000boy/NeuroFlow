import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { createClient } from 'redis';
import { logger } from '../config/logger.config';

const prisma = new PrismaClient();

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  dependencies: {
    database: DependencyStatus;
    redis: DependencyStatus;
    n8n: DependencyStatus;
  };
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
  };
}

interface DependencyStatus {
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
  lastChecked: string;
}

// Simple health check for basic monitoring
export const healthCheck = (req: Request, res: Response) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };

  res.status(200).json(healthData);
};

// Comprehensive health check with dependency status
export const detailedHealthCheck = async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const healthStatus: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      dependencies: {
        database: await checkDatabase(),
        redis: await checkRedis(),
        n8n: await checkN8n()
      },
      system: {
        memory: getMemoryUsage(),
        cpu: {
          usage: process.cpuUsage().user / 1000000 // Convert to seconds
        }
      }
    };

    // Determine overall status based on dependencies
    const dependencyStatuses = Object.values(healthStatus.dependencies);
    const hasUnhealthyDependency = dependencyStatuses.some(dep => dep.status === 'unhealthy');
    
    if (hasUnhealthyDependency) {
      healthStatus.status = 'degraded';
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    
    // Log health check if there are issues
    if (healthStatus.status !== 'healthy') {
      logger.warn('Health check detected issues', { healthStatus });
    }

    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed', { error });
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      responseTime: Date.now() - startTime
    });
  }
};

// Readiness probe for Kubernetes/Docker
export const readinessCheck = async (req: Request, res: Response) => {
  try {
    // Check critical dependencies
    const dbStatus = await checkDatabase();
    
    if (dbStatus.status === 'unhealthy') {
      return res.status(503).json({
        status: 'not ready',
        reason: 'Database not available'
      });
    }

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness check failed', { error });
    res.status(503).json({
      status: 'not ready',
      error: 'Readiness check failed'
    });
  }
};

// Liveness probe for Kubernetes/Docker
export const livenessCheck = (req: Request, res: Response) => {
  // Simple check to ensure the process is alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};

// Database health check
async function checkDatabase(): Promise<DependencyStatus> {
  const startTime = Date.now();
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    
    return {
      status: 'healthy',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Database health check failed', { error });
    
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown database error',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString()
    };
  }
}

// Redis health check
async function checkRedis(): Promise<DependencyStatus> {
  const startTime = Date.now();
  
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const client = createClient({ url: redisUrl });
    
    await client.connect();
    await client.ping();
    await client.disconnect();
    
    return {
      status: 'healthy',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Redis health check failed', { error });
    
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown Redis error',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString()
    };
  }
}

// n8n health check
async function checkN8n(): Promise<DependencyStatus> {
  const startTime = Date.now();
  
  try {
    const n8nUrl = process.env.N8N_API_URL || 'http://localhost:5678';
    const response = await axios.get(`${n8nUrl}/healthz`, {
      timeout: 5000,
      validateStatus: (status) => status < 500 // Accept 4xx as healthy (auth issues)
    });
    
    return {
      status: 'healthy',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    logger.error('n8n health check failed', { error });
    
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown n8n error',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString()
    };
  }
}

// Get memory usage information
function getMemoryUsage() {
  const memUsage = process.memoryUsage();
  const totalMemory = require('os').totalmem();
  
  return {
    used: memUsage.heapUsed,
    total: totalMemory,
    percentage: Math.round((memUsage.heapUsed / totalMemory) * 100)
  };
}
