import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.config';

// In-memory metrics storage (in production, use Redis or external metrics service)
interface Metrics {
  requests: {
    total: number;
    byMethod: Record<string, number>;
    byStatus: Record<string, number>;
    byEndpoint: Record<string, number>;
  };
  responseTime: {
    total: number;
    count: number;
    average: number;
    min: number;
    max: number;
    p95: number[];
  };
  errors: {
    total: number;
    byType: Record<string, number>;
    recent: Array<{
      timestamp: string;
      error: string;
      endpoint: string;
      correlationId: string;
    }>;
  };
  system: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    cpu: NodeJS.CpuUsage;
  };
}

class MetricsCollector {
  private metrics: Metrics;
  private responseTimes: number[] = [];
  private readonly maxRecentErrors = 100;
  private readonly maxResponseTimes = 1000;

  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        byMethod: {},
        byStatus: {},
        byEndpoint: {}
      },
      responseTime: {
        total: 0,
        count: 0,
        average: 0,
        min: Infinity,
        max: 0,
        p95: []
      },
      errors: {
        total: 0,
        byType: {},
        recent: []
      },
      system: {
        uptime: 0,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };

    // Update system metrics every 30 seconds
    setInterval(() => {
      this.updateSystemMetrics();
    }, 30000);
  }

  recordRequest(method: string, endpoint: string, statusCode: number, responseTime: number) {
    // Update request metrics
    this.metrics.requests.total++;
    this.metrics.requests.byMethod[method] = (this.metrics.requests.byMethod[method] || 0) + 1;
    this.metrics.requests.byStatus[statusCode] = (this.metrics.requests.byStatus[statusCode] || 0) + 1;
    this.metrics.requests.byEndpoint[endpoint] = (this.metrics.requests.byEndpoint[endpoint] || 0) + 1;

    // Update response time metrics
    this.recordResponseTime(responseTime);

    // Record errors
    if (statusCode >= 400) {
      this.recordError(statusCode >= 500 ? 'server_error' : 'client_error', endpoint);
    }
  }

  recordResponseTime(responseTime: number) {
    this.responseTimes.push(responseTime);
    
    // Keep only recent response times for percentile calculation
    if (this.responseTimes.length > this.maxResponseTimes) {
      this.responseTimes = this.responseTimes.slice(-this.maxResponseTimes);
    }

    this.metrics.responseTime.total += responseTime;
    this.metrics.responseTime.count++;
    this.metrics.responseTime.average = this.metrics.responseTime.total / this.metrics.responseTime.count;
    this.metrics.responseTime.min = Math.min(this.metrics.responseTime.min, responseTime);
    this.metrics.responseTime.max = Math.max(this.metrics.responseTime.max, responseTime);

    // Calculate 95th percentile
    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.ceil(sorted.length * 0.95) - 1;
    this.metrics.responseTime.p95 = sorted.slice(p95Index);
  }

  recordError(errorType: string, endpoint: string, correlationId?: string, errorMessage?: string) {
    this.metrics.errors.total++;
    this.metrics.errors.byType[errorType] = (this.metrics.errors.byType[errorType] || 0) + 1;

    // Add to recent errors
    this.metrics.errors.recent.unshift({
      timestamp: new Date().toISOString(),
      error: errorMessage || errorType,
      endpoint,
      correlationId: correlationId || 'unknown'
    });

    // Keep only recent errors
    if (this.metrics.errors.recent.length > this.maxRecentErrors) {
      this.metrics.errors.recent = this.metrics.errors.recent.slice(0, this.maxRecentErrors);
    }
  }

  updateSystemMetrics() {
    this.metrics.system.uptime = process.uptime();
    this.metrics.system.memory = process.memoryUsage();
    this.metrics.system.cpu = process.cpuUsage();
  }

  getMetrics(): Metrics {
    this.updateSystemMetrics();
    return { ...this.metrics };
  }

  getHealthScore(): number {
    const errorRate = this.metrics.requests.total > 0 
      ? this.metrics.errors.total / this.metrics.requests.total 
      : 0;
    
    const avgResponseTime = this.metrics.responseTime.average;
    
    // Calculate health score (0-100)
    let score = 100;
    
    // Penalize high error rates
    if (errorRate > 0.1) score -= 50; // >10% error rate
    else if (errorRate > 0.05) score -= 25; // >5% error rate
    else if (errorRate > 0.01) score -= 10; // >1% error rate
    
    // Penalize slow response times
    if (avgResponseTime > 5000) score -= 30; // >5s average
    else if (avgResponseTime > 2000) score -= 20; // >2s average
    else if (avgResponseTime > 1000) score -= 10; // >1s average
    
    return Math.max(0, score);
  }

  reset() {
    this.metrics = {
      requests: {
        total: 0,
        byMethod: {},
        byStatus: {},
        byEndpoint: {}
      },
      responseTime: {
        total: 0,
        count: 0,
        average: 0,
        min: Infinity,
        max: 0,
        p95: []
      },
      errors: {
        total: 0,
        byType: {},
        recent: []
      },
      system: {
        uptime: 0,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };
    this.responseTimes = [];
  }
}

// Global metrics collector instance
const metricsCollector = new MetricsCollector();

// Middleware to collect metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Override res.end to capture metrics when response is sent
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const responseTime = Date.now() - startTime;
    const endpoint = `${req.method} ${req.route?.path || req.path}`;
    
    // Record metrics
    metricsCollector.recordRequest(
      req.method,
      endpoint,
      res.statusCode,
      responseTime
    );

    // Log slow requests
    if (responseTime > 2000) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        responseTime: `${responseTime}ms`,
        statusCode: res.statusCode,
        correlationId: req.correlationId
      });
    }

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Error metrics middleware
export const errorMetricsMiddleware = (error: Error, req: Request, res: Response, next: NextFunction) => {
  const endpoint = `${req.method} ${req.route?.path || req.path}`;
  
  metricsCollector.recordError(
    error.name || 'UnknownError',
    endpoint,
    req.correlationId,
    error.message
  );

  next(error);
};

// Metrics endpoint controller
export const getMetrics = (req: Request, res: Response) => {
  try {
    const metrics = metricsCollector.getMetrics();
    const healthScore = metricsCollector.getHealthScore();

    res.json({
      success: true,
      data: {
        ...metrics,
        healthScore,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get metrics', { error });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve metrics',
        code: 'METRICS_ERROR'
      }
    });
  }
};

// Reset metrics endpoint (for testing/debugging)
export const resetMetrics = (req: Request, res: Response) => {
  try {
    metricsCollector.reset();
    logger.info('Metrics reset', { correlationId: req.correlationId });
    
    res.json({
      success: true,
      message: 'Metrics reset successfully'
    });
  } catch (error) {
    logger.error('Failed to reset metrics', { error });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to reset metrics',
        code: 'METRICS_RESET_ERROR'
      }
    });
  }
};

export { metricsCollector };