import { useToast } from '../contexts/ToastContext';

export interface AppError {
    code: string;
    message: string;
    details?: any;
    statusCode?: number;
}

export class ErrorHandler {
    private static toast: ReturnType<typeof useToast> | null = null;

    static setToast(toast: ReturnType<typeof useToast>) {
        this.toast = toast;
    }

    static handle(error: any, context?: string): AppError {
        const appError = this.parseError(error);

        // Log error for debugging
        console.error(`Error in ${context || 'unknown context'}:`, appError);

        // Show user-friendly toast notification
        if (this.toast) {
            this.toast.addToast('error', this.getUserFriendlyMessage(appError), appError.message);
        }

        return appError;
    }

    private static parseError(error: any): AppError {
        // Handle different error types
        if (error instanceof Error) {
            return {
                code: 'GENERIC_ERROR',
                message: error.message,
                details: error.stack,
            };
        }

        // Handle API errors
        if (error?.response) {
            return {
                code: error.response.data?.error?.code || 'API_ERROR',
                message: error.response.data?.error?.message || 'An API error occurred',
                details: error.response.data?.error?.details,
                statusCode: error.response.status,
            };
        }

        // Handle network errors
        if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
            return {
                code: 'NETWORK_ERROR',
                message: 'Network connection failed. Please check your internet connection.',
                details: error,
            };
        }

        // Handle timeout errors
        if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
            return {
                code: 'TIMEOUT_ERROR',
                message: 'Request timed out. Please try again.',
                details: error,
            };
        }

        // Handle validation errors
        if (error?.name === 'ValidationError' || error?.code === 'VALIDATION_ERROR') {
            return {
                code: 'VALIDATION_ERROR',
                message: 'Invalid input data provided',
                details: error.details || error.errors,
            };
        }

        // Handle authentication errors
        if (error?.statusCode === 401 || error?.code === 'UNAUTHORIZED') {
            return {
                code: 'UNAUTHORIZED',
                message: 'Authentication required. Please log in again.',
                details: error,
            };
        }

        // Handle authorization errors
        if (error?.statusCode === 403 || error?.code === 'FORBIDDEN') {
            return {
                code: 'FORBIDDEN',
                message: 'You do not have permission to perform this action.',
                details: error,
            };
        }

        // Handle not found errors
        if (error?.statusCode === 404 || error?.code === 'NOT_FOUND') {
            return {
                code: 'NOT_FOUND',
                message: 'The requested resource was not found.',
                details: error,
            };
        }

        // Handle server errors
        if (error?.statusCode >= 500 || error?.code === 'INTERNAL_ERROR') {
            return {
                code: 'SERVER_ERROR',
                message: 'A server error occurred. Please try again later.',
                details: error,
            };
        }

        // Default error
        return {
            code: 'UNKNOWN_ERROR',
            message: typeof error === 'string' ? error : 'An unexpected error occurred',
            details: error,
        };
    }

    private static getUserFriendlyMessage(error: AppError): string {
        const messages: Record<string, string> = {
            NETWORK_ERROR: 'Connection Problem',
            TIMEOUT_ERROR: 'Request Timeout',
            VALIDATION_ERROR: 'Invalid Input',
            UNAUTHORIZED: 'Authentication Required',
            FORBIDDEN: 'Access Denied',
            NOT_FOUND: 'Not Found',
            SERVER_ERROR: 'Server Error',
            WORKFLOW_NOT_FOUND: 'Workflow Not Found',
            EXECUTION_FAILED: 'Execution Failed',
            N8N_UNAVAILABLE: 'Service Unavailable',
            GENERIC_ERROR: 'Error',
            UNKNOWN_ERROR: 'Unexpected Error',
        };

        return messages[error.code] || 'Error';
    }

    static isRetryable(error: AppError): boolean {
        const retryableCodes = [
            'NETWORK_ERROR',
            'TIMEOUT_ERROR',
            'SERVER_ERROR',
            'N8N_UNAVAILABLE',
        ];

        return retryableCodes.includes(error.code);
    }

    static getRetryDelay(attempt: number): number {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s (max)
        return Math.min(1000 * Math.pow(2, attempt), 16000);
    }
}

// Hook for using error handler in components
export const useErrorHandler = () => {
    const toast = useToast();

    // Set toast instance for static methods
    React.useEffect(() => {
        ErrorHandler.setToast(toast);
    }, [toast]);

    const handleError = (error: any, context?: string) => {
        return ErrorHandler.handle(error, context);
    };

    const handleAsyncError = async <T>(
        asyncFn: () => Promise<T>,
        context?: string,
        retries = 0
    ): Promise<T | null> => {
        try {
            return await asyncFn();
        } catch (error) {
            const appError = handleError(error, context);

            // Retry logic for retryable errors
            if (retries > 0 && ErrorHandler.isRetryable(appError)) {
                const delay = ErrorHandler.getRetryDelay(3 - retries);
                await new Promise(resolve => setTimeout(resolve, delay));
                return handleAsyncError(asyncFn, context, retries - 1);
            }

            return null;
        }
    };

    return {
        handleError,
        handleAsyncError,
        isRetryable: ErrorHandler.isRetryable,
    };
};

// React import for useEffect
import React from 'react';