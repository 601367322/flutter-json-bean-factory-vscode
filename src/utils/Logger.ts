import * as vscode from 'vscode';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    message: string;
    context?: string;
    data?: any;
    error?: Error;
}

export class Logger {
    private static instance: Logger;
    private outputChannel: vscode.OutputChannel;
    private logLevel: LogLevel;
    private logEntries: LogEntry[] = [];
    private maxEntries: number = 1000;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Flutter JSON Bean Factory');
        this.logLevel = this.getConfiguredLogLevel();
        
        // Watch for configuration changes
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('flutter-json-bean-factory.logLevel')) {
                this.logLevel = this.getConfiguredLogLevel();
            }
        });
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private getConfiguredLogLevel(): LogLevel {
        const config = vscode.workspace.getConfiguration('flutter-json-bean-factory');
        const levelString = config.get<string>('logLevel', 'INFO');
        
        switch (levelString.toUpperCase()) {
            case 'DEBUG': return LogLevel.DEBUG;
            case 'INFO': return LogLevel.INFO;
            case 'WARN': return LogLevel.WARN;
            case 'ERROR': return LogLevel.ERROR;
            default: return LogLevel.INFO;
        }
    }

    private shouldLog(level: LogLevel): boolean {
        return level >= this.logLevel;
    }

    private formatMessage(entry: LogEntry): string {
        const timestamp = entry.timestamp.toISOString();
        const levelName = LogLevel[entry.level].padEnd(5);
        const context = entry.context ? `[${entry.context}] ` : '';
        
        let message = `${timestamp} ${levelName} ${context}${entry.message}`;
        
        if (entry.data) {
            message += `\nData: ${JSON.stringify(entry.data, null, 2)}`;
        }
        
        if (entry.error) {
            message += `\nError: ${entry.error.message}`;
            if (entry.error.stack) {
                message += `\nStack: ${entry.error.stack}`;
            }
        }
        
        return message;
    }

    private addLogEntry(entry: LogEntry): void {
        this.logEntries.push(entry);
        
        // Keep only the most recent entries
        if (this.logEntries.length > this.maxEntries) {
            this.logEntries = this.logEntries.slice(-this.maxEntries);
        }
        
        // Output to VS Code output channel
        if (this.shouldLog(entry.level)) {
            const formattedMessage = this.formatMessage(entry);
            this.outputChannel.appendLine(formattedMessage);
            
            // Also log to console for development
            if (entry.level >= LogLevel.ERROR) {
                console.error(formattedMessage);
            } else if (entry.level >= LogLevel.WARN) {
                console.warn(formattedMessage);
            } else {
                console.log(formattedMessage);
            }
        }
    }

    public debug(message: string, context?: string, data?: any): void {
        this.addLogEntry({
            timestamp: new Date(),
            level: LogLevel.DEBUG,
            message,
            context,
            data
        });
    }

    public info(message: string, context?: string, data?: any): void {
        this.addLogEntry({
            timestamp: new Date(),
            level: LogLevel.INFO,
            message,
            context,
            data
        });
    }

    public warn(message: string, context?: string, data?: any): void {
        this.addLogEntry({
            timestamp: new Date(),
            level: LogLevel.WARN,
            message,
            context,
            data
        });
    }

    public error(message: string, error?: Error, context?: string, data?: any): void {
        this.addLogEntry({
            timestamp: new Date(),
            level: LogLevel.ERROR,
            message,
            context,
            data,
            error
        });
    }

    public logOperation<T>(
        operation: string,
        context: string,
        fn: () => T | Promise<T>
    ): T | Promise<T> {
        this.debug(`Starting operation: ${operation}`, context);
        const startTime = Date.now();
        
        try {
            const result = fn();
            
            if (result instanceof Promise) {
                return result
                    .then((value) => {
                        const duration = Date.now() - startTime;
                        this.debug(`Operation completed: ${operation} (${duration}ms)`, context);
                        return value;
                    })
                    .catch((error) => {
                        const duration = Date.now() - startTime;
                        this.error(`Operation failed: ${operation} (${duration}ms)`, error, context);
                        throw error;
                    });
            } else {
                const duration = Date.now() - startTime;
                this.debug(`Operation completed: ${operation} (${duration}ms)`, context);
                return result;
            }
        } catch (error) {
            const duration = Date.now() - startTime;
            this.error(`Operation failed: ${operation} (${duration}ms)`, error as Error, context);
            throw error;
        }
    }

    public getRecentLogs(count: number = 100): LogEntry[] {
        return this.logEntries.slice(-count);
    }

    public clearLogs(): void {
        this.logEntries = [];
        this.outputChannel.clear();
    }

    public showOutputChannel(): void {
        this.outputChannel.show();
    }

    public dispose(): void {
        this.outputChannel.dispose();
    }
}

// Export a default instance for convenience
export const logger = Logger.getInstance();
