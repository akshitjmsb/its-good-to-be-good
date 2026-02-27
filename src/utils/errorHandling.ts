/**
 * Centralized error handling utilities for It's Good To Be King
 */

export enum ErrorType {
    API_ERROR = 'API_ERROR',
    NETWORK_ERROR = 'NETWORK_ERROR',
    PARSE_ERROR = 'PARSE_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface AppError {
    type: ErrorType;
    message: string;
    originalError?: Error;
    context?: string;
    timestamp: number;
}

export class ErrorHandler {
    /**
     * Creates a structured error object
     */
    static createError(
        type: ErrorType,
        message: string,
        originalError?: Error,
        context?: string
    ): AppError {
        return {
            type,
            message,
            originalError,
            context,
            timestamp: Date.now()
        };
    }

    /**
     * Handles API-related errors
     */
    static handleApiError(error: any, context?: string): AppError {
        if (error instanceof TypeError && error.message.includes('fetch')) {
            return this.createError(
                ErrorType.NETWORK_ERROR,
                'Network connection failed. Please check your internet connection.',
                error,
                context
            );
        }

        if (error.message?.includes('JSON')) {
            return this.createError(
                ErrorType.PARSE_ERROR,
                'Failed to parse server response. Please try again.',
                error,
                context
            );
        }

        return this.createError(
            ErrorType.API_ERROR,
            error.message || 'An API error occurred. Please try again.',
            error,
            context
        );
    }

    /**
     * Handles validation errors
     */
    static handleValidationError(message: string, context?: string): AppError {
        return this.createError(
            ErrorType.VALIDATION_ERROR,
            message,
            undefined,
            context
        );
    }

    /**
     * Handles unknown errors
     */
    static handleUnknownError(error: any, context?: string): AppError {
        return this.createError(
            ErrorType.UNKNOWN_ERROR,
            'An unexpected error occurred. Please try again.',
            error,
            context
        );
    }

    /**
     * Logs error to console with structured format
     */
    static logError(error: AppError): void {
        console.error(`[${error.type}] ${error.message}`, {
            context: error.context,
            timestamp: new Date(error.timestamp).toISOString(),
            originalError: error.originalError
        });
    }

    /**
     * Shows user-friendly error message in the UI
     */
    static showUserError(error: AppError): void {
        const statusEl = document.getElementById('sync-status');
        if (statusEl) {
            let userMessage = error.message;
            
            // Add context-specific messages
            if (error.context) {
                userMessage = `${error.context}: ${userMessage}`;
            }

            statusEl.textContent = `⚠️ ${userMessage}`;
            statusEl.classList.remove('hidden');
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                statusEl.classList.add('hidden');
            }, 5000);
        }
    }

    /**
     * Handles and displays error in one call
     */
    static handleAndShowError(
        error: any,
        context: string
    ): AppError {
        const appError = this.handleUnknownError(error, context);
        this.logError(appError);
        this.showUserError(appError);
        return appError;
    }
}

/**
 * Wrapper for async functions with error handling
 */
export async function withErrorHandling<T>(
    fn: () => Promise<T>,
    context: string,
    fallback?: T
): Promise<T | undefined> {
    try {
        return await fn();
    } catch (error) {
        const appError = ErrorHandler.handleApiError(error, context);
        ErrorHandler.logError(appError);
        ErrorHandler.showUserError(appError);
        return fallback;
    }
}

/**
 * Wrapper for sync functions with error handling
 */
export function withSyncErrorHandling<T>(
    fn: () => T,
    context: string,
    fallback?: T
): T | undefined {
    try {
        return fn();
    } catch (error) {
        const appError = ErrorHandler.handleUnknownError(error, context);
        ErrorHandler.logError(appError);
        ErrorHandler.showUserError(appError);
        return fallback;
    }
}
