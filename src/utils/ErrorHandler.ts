import * as vscode from 'vscode';
import { Logger, logger } from './Logger';

export enum ErrorType {
    VALIDATION = 'VALIDATION',
    FILE_SYSTEM = 'FILE_SYSTEM',
    PARSING = 'PARSING',
    GENERATION = 'GENERATION',
    PROJECT = 'PROJECT',
    NETWORK = 'NETWORK',
    UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

export interface ErrorInfo {
    type: ErrorType;
    severity: ErrorSeverity;
    userMessage: string;
    technicalMessage: string;
    context?: string;
    suggestions?: string[];
    originalError?: Error;
}

export class AppError extends Error {
    public readonly type: ErrorType;
    public readonly severity: ErrorSeverity;
    public readonly userMessage: string;
    public readonly technicalMessage: string;
    public readonly context?: string;
    public readonly suggestions?: string[];
    public readonly originalError?: Error;

    constructor(errorInfo: ErrorInfo) {
        super(errorInfo.technicalMessage);
        this.name = 'AppError';
        this.type = errorInfo.type;
        this.severity = errorInfo.severity;
        this.userMessage = errorInfo.userMessage;
        this.technicalMessage = errorInfo.technicalMessage;
        this.context = errorInfo.context;
        this.suggestions = errorInfo.suggestions;
        this.originalError = errorInfo.originalError;
    }
}

export class ErrorHandler {
    private static instance: ErrorHandler;
    private logger: Logger;

    private constructor() {
        this.logger = logger;
    }

    public static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    /**
     * Handle an error and show appropriate user message
     */
    public async handleError(error: Error | AppError, context?: string): Promise<void> {
        let errorInfo: ErrorInfo;

        if (error instanceof AppError) {
            errorInfo = {
                type: error.type,
                severity: error.severity,
                userMessage: error.userMessage,
                technicalMessage: error.technicalMessage,
                context: error.context || context,
                suggestions: error.suggestions,
                originalError: error.originalError
            };
        } else {
            errorInfo = this.categorizeError(error, context);
        }

        // Log the error
        this.logger.error(
            errorInfo.technicalMessage,
            errorInfo.originalError || error,
            errorInfo.context,
            { type: errorInfo.type, severity: errorInfo.severity }
        );

        // Show user message based on severity
        await this.showUserMessage(errorInfo);
    }

    /**
     * Categorize unknown errors
     */
    private categorizeError(error: Error, context?: string): ErrorInfo {
        const message = error.message.toLowerCase();

        // File system errors
        if (message.includes('enoent') || message.includes('file not found')) {
            return {
                type: ErrorType.FILE_SYSTEM,
                severity: ErrorSeverity.MEDIUM,
                userMessage: 'File or directory not found. Please check the file path.',
                technicalMessage: error.message,
                context,
                suggestions: ['Verify the file path exists', 'Check file permissions'],
                originalError: error
            };
        }

        // Permission errors
        if (message.includes('eacces') || message.includes('permission denied')) {
            return {
                type: ErrorType.FILE_SYSTEM,
                severity: ErrorSeverity.HIGH,
                userMessage: 'Permission denied. Please check file permissions.',
                technicalMessage: error.message,
                context,
                suggestions: ['Check file permissions', 'Run VS Code as administrator if needed'],
                originalError: error
            };
        }

        // JSON parsing errors
        if (message.includes('json') || message.includes('parse')) {
            return {
                type: ErrorType.PARSING,
                severity: ErrorSeverity.MEDIUM,
                userMessage: 'Invalid JSON format. Please check your JSON syntax.',
                technicalMessage: error.message,
                context,
                suggestions: ['Validate JSON syntax', 'Use the Format button to check JSON'],
                originalError: error
            };
        }

        // Network errors
        if (message.includes('network') || message.includes('timeout')) {
            return {
                type: ErrorType.NETWORK,
                severity: ErrorSeverity.MEDIUM,
                userMessage: 'Network error occurred. Please check your connection.',
                technicalMessage: error.message,
                context,
                suggestions: ['Check internet connection', 'Try again later'],
                originalError: error
            };
        }

        // Default unknown error
        return {
            type: ErrorType.UNKNOWN,
            severity: ErrorSeverity.MEDIUM,
            userMessage: 'An unexpected error occurred. Please check the output for details.',
            technicalMessage: error.message,
            context,
            suggestions: ['Check the output panel for more details', 'Try the operation again'],
            originalError: error
        };
    }

    /**
     * Show appropriate user message based on error severity
     */
    private async showUserMessage(errorInfo: ErrorInfo): Promise<void> {
        const message = errorInfo.userMessage;
        const actions: string[] = [];

        // Add suggestions as actions
        if (errorInfo.suggestions && errorInfo.suggestions.length > 0) {
            actions.push('Show Details');
        }

        // Add "Show Logs" action for higher severity errors
        if (errorInfo.severity === ErrorSeverity.HIGH || errorInfo.severity === ErrorSeverity.CRITICAL) {
            actions.push('Show Logs');
        }

        let selectedAction: string | undefined;

        switch (errorInfo.severity) {
            case ErrorSeverity.LOW:
                // Just log, don't show user message
                break;
            case ErrorSeverity.MEDIUM:
                selectedAction = await vscode.window.showWarningMessage(message, ...actions);
                break;
            case ErrorSeverity.HIGH:
            case ErrorSeverity.CRITICAL:
                selectedAction = await vscode.window.showErrorMessage(message, ...actions);
                break;
        }

        // Handle user action
        if (selectedAction === 'Show Details' && errorInfo.suggestions) {
            const detailMessage = `${message}\n\nSuggestions:\n${errorInfo.suggestions.map(s => `• ${s}`).join('\n')}`;
            await vscode.window.showInformationMessage(detailMessage);
        } else if (selectedAction === 'Show Logs') {
            this.logger.showOutputChannel();
        }
    }

    /**
     * Create validation error
     */
    public createValidationError(message: string, context?: string, suggestions?: string[]): AppError {
        return new AppError({
            type: ErrorType.VALIDATION,
            severity: ErrorSeverity.MEDIUM,
            userMessage: message,
            technicalMessage: message,
            context,
            suggestions
        });
    }

    /**
     * Create file system error
     */
    public createFileSystemError(message: string, originalError?: Error, context?: string): AppError {
        return new AppError({
            type: ErrorType.FILE_SYSTEM,
            severity: ErrorSeverity.HIGH,
            userMessage: 'File operation failed. Please check file permissions and paths.',
            technicalMessage: message,
            context,
            suggestions: ['Check file permissions', 'Verify file paths exist'],
            originalError
        });
    }

    /**
     * Create parsing error
     */
    public createParsingError(message: string, originalError?: Error, context?: string): AppError {
        return new AppError({
            type: ErrorType.PARSING,
            severity: ErrorSeverity.MEDIUM,
            userMessage: 'Failed to parse content. Please check the format.',
            technicalMessage: message,
            context,
            suggestions: ['Verify content format', 'Check for syntax errors'],
            originalError
        });
    }

    /**
     * Create generation error
     */
    public createGenerationError(message: string, originalError?: Error, context?: string): AppError {
        return new AppError({
            type: ErrorType.GENERATION,
            severity: ErrorSeverity.HIGH,
            userMessage: 'Code generation failed. Please check your input and try again.',
            technicalMessage: message,
            context,
            suggestions: ['Verify JSON input', 'Check project structure', 'Try regenerating'],
            originalError
        });
    }

    /**
     * Create project error
     */
    public createProjectError(message: string, context?: string): AppError {
        return new AppError({
            type: ErrorType.PROJECT,
            severity: ErrorSeverity.HIGH,
            userMessage: 'Flutter project error. Please ensure you are in a valid Flutter project.',
            technicalMessage: message,
            context,
            suggestions: ['Open a Flutter project', 'Check pubspec.yaml exists', 'Verify project structure']
        });
    }

    /**
     * Wrap async operations with error handling
     */
    public async wrapAsync<T>(
        operation: () => Promise<T>,
        context: string,
        errorMessage?: string
    ): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            const wrappedError = error instanceof AppError ? error : new AppError({
                type: ErrorType.UNKNOWN,
                severity: ErrorSeverity.MEDIUM,
                userMessage: errorMessage || 'Operation failed',
                technicalMessage: (error as Error).message,
                context,
                originalError: error as Error
            });
            
            await this.handleError(wrappedError, context);
            throw wrappedError;
        }
    }
}

// Export a default instance for convenience
export const errorHandler = ErrorHandler.getInstance();
