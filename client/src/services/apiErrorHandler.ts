import { store } from '../store';
import { clearCredentials } from '../store/slices/authSlice';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode?: number;
}

export class ApiErrorHandler {
  static handle(error: any): ApiError {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed. Please check your internet connection.',
        statusCode: 0,
      };
    }

    // Handle timeout errors
    if (error.name === 'AbortError') {
      return {
        code: 'TIMEOUT_ERROR',
        message: 'Request timed out. Please try again.',
        statusCode: 408,
      };
    }

    // Handle structured API errors
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return {
            code: 'VALIDATION_ERROR',
            message: data?.error?.message || 'Invalid request data',
            details: data?.error?.details,
            statusCode: 400,
          };
        
        case 401:
          // Clear authentication state
          store.dispatch(clearCredentials());
          return {
            code: 'UNAUTHORIZED',
            message: 'Your session has expired. Please log in again.',
            statusCode: 401,
          };
        
        case 403:
          return {
            code: 'FORBIDDEN',
            message: 'You do not have permission to perform this action.',
            statusCode: 403,
          };
        
        case 404:
          return {
            code: 'NOT_FOUND',
            message: data?.error?.message || 'The requested resource was not found.',
            statusCode: 404,
          };
        
        case 409:
          return {
            code: 'CONFLICT',
            message: data?.error?.message || 'A conflict occurred with the current state.',
            statusCode: 409,
          };
        
        case 422:
          return {
            code: 'VALIDATION_ERROR',
            message: data?.error?.message || 'Validation failed',
            details: data?.error?.details,
            statusCode: 422,
          };
        
        case 429:
          return {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please wait a moment and try again.',
            statusCode: 429,
          };
        
        case 500:
          return {
            code: 'INTERNAL_ERROR',
            message: 'An internal server error occurred. Please try again later.',
            statusCode: 500,
          };
        
        case 502:
        case 503:
        case 504:
          return {
            code: 'SERVICE_UNAVAILABLE',
            message: 'The service is temporarily unavailable. Please try again later.',
            statusCode: status,
          };
        
        default:
          return {
            code: 'UNKNOWN_ERROR',
            message: data?.error?.message || `An unexpected error occurred (${status})`,
            statusCode: status,
          };
      }
    }

    // Handle string errors
    if (typeof error === 'string') {
      return {
        code: 'GENERIC_ERROR',
        message: error,
      };
    }

    // Handle Error objects
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        store.dispatch(clearCredentials());
        return {
          code: 'UNAUTHORIZED',
          message: 'Your session has expired. Please log in again.',
          statusCode: 401,
        };
      }

      if (error.message.includes('403') || error.message.includes('Forbidden')) {
        return {
          code: 'FORBIDDEN',
          message: 'You do not have permission to perform this action.',
          statusCode: 403,
        };
      }

      if (error.message.includes('404') || error.message.includes('Not Found')) {
        return {
          code: 'NOT_FOUND',
          message: 'The requested resource was not found.',
          statusCode: 404,
        };
      }

      return {
        code: 'GENERIC_ERROR',
        message: error.message,
      };
    }

    // Fallback for unknown error types
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred. Please try again.',
    };
  }

  static isRetryable(error: ApiError): boolean {
    const retryableCodes = [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'SERVICE_UNAVAILABLE',
      'INTERNAL_ERROR',
    ];
    
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    
    return (
      retryableCodes.includes(error.code) ||
      Boolean(error.statusCode && retryableStatusCodes.includes(error.statusCode))
    );
  }

  static getRetryDelay(attemptNumber: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    return Math.min(1000 * Math.pow(2, attemptNumber - 1), 16000);
  }
}

// Utility function to create a retry wrapper
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  maxRetries: number = 3
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        const apiError = ApiErrorHandler.handle(error);
        
        // Don't retry if it's not a retryable error or we've exhausted retries
        if (!ApiErrorHandler.isRetryable(apiError) || attempt > maxRetries) {
          throw apiError;
        }
        
        // Wait before retrying
        const delay = ApiErrorHandler.getRetryDelay(attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw ApiErrorHandler.handle(lastError);
  }) as T;
}