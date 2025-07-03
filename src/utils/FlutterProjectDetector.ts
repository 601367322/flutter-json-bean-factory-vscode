import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class FlutterProjectDetector {
    /**
     * Check if the current workspace is a Flutter project
     */
    async isFlutterProject(): Promise<boolean> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return false;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        const pubspecPath = path.join(rootPath, 'pubspec.yaml');

        try {
            if (!fs.existsSync(pubspecPath)) {
                return false;
            }

            const pubspecContent = fs.readFileSync(pubspecPath, 'utf8');
            
            // Check if it contains Flutter dependencies
            return pubspecContent.includes('flutter:') || 
                   pubspecContent.includes('flutter_test:') ||
                   pubspecContent.includes('sdk: flutter');
        } catch (error) {
            console.error('Error checking Flutter project:', error);
            return false;
        }
    }

    /**
     * Get the Flutter project root path
     */
    getFlutterProjectRoot(): string | undefined {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return undefined;
        }

        return workspaceFolders[0].uri.fsPath;
    }

    /**
     * Get the lib directory path
     */
    getLibPath(): string | undefined {
        const rootPath = this.getFlutterProjectRoot();
        if (!rootPath) {
            return undefined;
        }

        const libPath = path.join(rootPath, 'lib');
        return fs.existsSync(libPath) ? libPath : undefined;
    }

    /**
     * Get package name from pubspec.yaml
     */
    getPackageName(): string | undefined {
        const rootPath = this.getFlutterProjectRoot();
        if (!rootPath) {
            return undefined;
        }

        const pubspecPath = path.join(rootPath, 'pubspec.yaml');
        try {
            if (!fs.existsSync(pubspecPath)) {
                return undefined;
            }

            const pubspecContent = fs.readFileSync(pubspecPath, 'utf8');

            // Extract package name from pubspec.yaml
            const nameMatch = pubspecContent.match(/^name:\s*(.+)$/m);
            if (nameMatch && nameMatch[1]) {
                return nameMatch[1].trim();
            }

            return undefined;
        } catch (error) {
            console.error('Error reading pubspec.yaml:', error);
            return undefined;
        }
    }

    /**
     * Check if a directory exists, create if not
     */
    ensureDirectoryExists(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }
}
