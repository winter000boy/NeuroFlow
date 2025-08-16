import morgan from 'morgan';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.config';
import { v4 as uuidv4 } from 'uuid';

// Extend Request interface to include correlation ID
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      startTime?: number;
    }
  }
}

// Custom morgan token for correlation ID
morgan.token('correlation-id', (req: Request) => req.correlationId || 'unknown');

// Custom morgan token for response time in milliseconds
morgan.token('response-time-ms', (req: Request, res: Response) => {
  if (!req.startTime) return '0';
  return `${Date.now() - req.startTime}ms`;
});

// Custom morgan token for user ID (if authenticated)
morgan.token('user-id', (req: Request) => {
  return (req as any).user?.id || 'anonymous';
});

// Custom morgan format with additional fields
const customFormat = ':correlation-id :user-id :method :url :status :res[content-length] - :response-time-ms :user-agent';

// HTTP request logger using morgan
export const httpLogger = morgan(customFormat, {
  stream: {
    write: (message) => {
      // Parse the log message to extract structured data
      const parts = message.trim().split(' ');
      const [correlationId, userId, method, url, status, contentLength, , responseTime, ...userAgentParts] = parts;
      
      const logData = {
        correlationId,
        userId: userId !== 'anonymous' ? userId : undefined,
        method,
        url,
        status: parseInt(status),
        contentLength: contentLength !== '-' ? parseInt(contentLength) : undefined,
        responseTime,
        userAgent: userAgentParts.join(' '),
        type: 'http_request'
      };

      // Log at different levels based on status code
      if (parseInt(status) >= 500) {
        logger.error('HTTP Request', logData);
      } else if (parseInt(status) >= 400) {
        logger.warn('HTTP Request', logData);
      } else {
        logger.info('HTTP Request', logData);
      }
    },
  },
  skip: (req: Request) => {
    // Skip logging for health check endpoints to reduce noise
    return req.url.includes('/health') && process.env.NODE_ENV === 'production';
  }
});

// Correlation ID middleware - adds unique ID to each request
export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Check if correlation ID is provided in headers, otherwise generate one
  req.correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  req.startTime = Date.now();
  
  // Add correlation ID to response headers
  res.setHeader('X-Correlation-ID', req.correlationId);
  
  next();
};

// Request/Response logging middleware for detailed API monitoring
export const apiLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  // Capture request details
  const requestData = {
    correlationId: req.correlationId,
    method: req.method,
    url: req.url,
    headers: filterSensitiveHeaders(req.headers),
    query: req.query,
    body: filterSensitiveData(req.body),
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
    timestamp: new Date().toISOString()
  };

  // Log incoming request
  logger.info('API Request', {
    type: 'api_request_start',
    ...requestData
  });

  // Override res.send to capture response
  res.send = function(data: any) {
    const responseTime = Date.now() - startTime;
    
    // Capture response details
    const responseData = {
      correlationId: req.correlationId,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('Content-Length'),
      headers: filterSensitiveHeaders(res.getHeaders()),
      body: filterSensitiveData(data),
      timestamp: new Date().toISOString()
    };

    // Log response based on status code
    if (res.statusCode >= 500) {
      logger.error('API Response', {
        type: 'api_response_error',
        request: requestData,
        response: responseData
      });
    } else if (res.statusCode >= 400) {
      logger.warn('API Response', {
        type: 'api_response_client_error',
        request: requestData,
        response: responseData
      });
    } else {
      logger.info('API Response', {
        type: 'api_response_success',
        request: requestData,
        response: responseData
      });
    }

    // Call original send method
    return originalSend.call(this, data);
  };

  next();
};

// Error logging middleware
export const errorLogger = (error: Error, req: Request, res: Response, next: NextFunction) => {
  const errorData = {
    correlationId: req.correlationId,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    request: {
      method: req.method,
      url: req.url,
      headers: filterSensitiveHeaders(req.headers),
      body: filterSensitiveData(req.body),
      query: req.query,
      params: req.params,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id
    },
    timestamp: new Date().toISOString()
  };

  logger.error('API Error', {
    type: 'api_error',
    ...errorData
  });

  next(error);
};

// Performance monitoring middleware
export const performanceLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const memoryDelta = {
      rss: endMemory.rss - startMemory.rss,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      external: endMemory.external - startMemory.external
    };

    // Only log performance data for slow requests or significant memory changes
    if (duration > 1000 || Math.abs(memoryDelta.heapUsed) > 10 * 1024 * 1024) { // 1s or 10MB
      logger.info('Performance Metrics', {
        type: 'performance',
        correlationId: req.correlationId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration.toFixed(2)}ms`,
        memory: {
          before: startMemory,
          after: endMemory,
          delta: memoryDelta
        },
        timestamp: new Date().toISOString()
      });
    }
  });

  next();
};

// Utility function to filter sensitive headers
function filterSensitiveHeaders(headers: any): any {
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
  const filtered = { ...headers };
  
  sensitiveHeaders.forEach(header => {
    if (filtered[header]) {
      filtered[header] = '[REDACTED]';
    }
  });
  
  return filtered;
}

// Utility function to filter sensitive data from request/response bodies
function filterSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  const filtered = Array.isArray(data) ? [...data] : { ...data };
  
  const filterObject = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(filterObject);
    }
    
    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          result[key] = filterObject(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    }
    
    return obj;
  };

  return filterObject(filtered);
}
