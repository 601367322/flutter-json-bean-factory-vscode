import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { GeneratorConfig } from '../generators/DartCodeGenerator';

export class ProjectManager {
    private _projectRoot: string | undefined;
    private _packageName: string | undefined;

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
        if (this._projectRoot) {
            return this._projectRoot;
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return undefined;
        }

        this._projectRoot = workspaceFolders[0].uri.fsPath;
        return this._projectRoot;
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
     * Get package name from pubspec.yaml (async version)
     */
    async getPackageName(): Promise<string> {
        if (this._packageName) {
            return this._packageName;
        }

        const rootPath = this.getFlutterProjectRoot();
        if (!rootPath) {
            return 'app'; // fallback
        }

        try {
            const pubspecPath = path.join(rootPath, 'pubspec.yaml');
            if (!fs.existsSync(pubspecPath)) {
                return 'app'; // fallback
            }

            const pubspecContent = fs.readFileSync(pubspecPath, 'utf8');
            const nameMatch = pubspecContent.match(/^name:\s*(.+)$/m);
            
            if (nameMatch && nameMatch[1]) {
                this._packageName = nameMatch[1].trim();
                return this._packageName;
            }

            return 'app'; // fallback
        } catch (error) {
            console.error('Error reading pubspec.yaml:', error);
            return 'app'; // fallback
        }
    }

    /**
     * Get package name from pubspec.yaml (sync version)
     */
    getPackageNameSync(): string {
        if (this._packageName) {
            return this._packageName;
        }

        try {
            const rootPath = this.getFlutterProjectRoot();
            if (!rootPath) {
                return 'app'; // fallback
            }

            const pubspecPath = path.join(rootPath, 'pubspec.yaml');
            if (!fs.existsSync(pubspecPath)) {
                return 'app'; // fallback
            }

            const pubspecContent = fs.readFileSync(pubspecPath, 'utf8');
            const nameMatch = pubspecContent.match(/^name:\s*(.+)$/m);
            
            if (nameMatch && nameMatch[1]) {
                this._packageName = nameMatch[1].trim();
                return this._packageName;
            }

            return 'app'; // fallback
        } catch (error) {
            console.error('Error reading pubspec.yaml:', error);
            return 'app'; // fallback
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

    /**
     * Get configuration from VSCode settings
     */
    getConfig(): GeneratorConfig {
        const configuration = vscode.workspace.getConfiguration('flutter-json-bean-factory');

        return {
            nullSafety: configuration.get('nullSafety', true),
            useJsonAnnotation: configuration.get('useJsonAnnotation', true),
            classNamePrefix: configuration.get('classNamePrefix', ''),
            classNameSuffix: configuration.get('classNameSuffix', ''),
            generatedPath: configuration.get('generatedPath', 'lib/generated/json'),
            entityPath: configuration.get('entityPath', 'lib/models'),
            forceNonNullable: configuration.get('forceNonNullable', false),
            addNullChecks: configuration.get('addNullChecks', true),
            useAsserts: configuration.get('useAsserts', false),
            generateToString: configuration.get('generateToString', true),
            generateEquality: configuration.get('generateEquality', false),
            scanPath: configuration.get('scanPath', 'lib')
        };
    }

    /**
     * Get target directory for entity files
     */
    getTargetDirectory(targetUri?: vscode.Uri): string {
        const config = this.getConfig();
        const projectRoot = this.getFlutterProjectRoot();

        if (!projectRoot) {
            throw new Error('Flutter project root not found');
        }

        // Determine target directory
        if (targetUri && targetUri.scheme === 'file') {
            const stat = fs.statSync(targetUri.fsPath);
            return stat.isDirectory() ? targetUri.fsPath : path.dirname(targetUri.fsPath);
        } else {
            return path.join(projectRoot, config.entityPath);
        }
    }

    /**
     * Get generated directory path
     */
    getGeneratedDirectory(): string {
        const config = this.getConfig();
        const projectRoot = this.getFlutterProjectRoot();

        if (!projectRoot) {
            throw new Error('Flutter project root not found');
        }

        return path.join(projectRoot, config.generatedPath);
    }

    /**
     * Setup required directories for code generation
     */
    setupDirectories(targetUri?: vscode.Uri): { targetDir: string; generatedDir: string } {
        const targetDir = this.getTargetDirectory(targetUri);
        const generatedDir = this.getGeneratedDirectory();

        // Ensure directories exist
        this.ensureDirectoryExists(targetDir);
        this.ensureDirectoryExists(generatedDir);
        this.ensureDirectoryExists(path.join(generatedDir, 'base'));

        return { targetDir, generatedDir };
    }

    /**
     * Clean up old helper files (like original plugin)
     */
    async cleanupOldHelperFiles(generatedDir: string, expectedHelperFiles: string[]): Promise<void> {
        try {
            if (!fs.existsSync(generatedDir)) {
                return;
            }

            const files = fs.readdirSync(generatedDir);

            // Remove old helper files that are no longer needed
            for (const file of files) {
                if (file.endsWith('.g.dart') && !expectedHelperFiles.includes(file)) {
                    const filePath = path.join(generatedDir, file);
                    fs.unlinkSync(filePath);
                    console.log(`Removed old helper file: ${file}`);
                }
            }
        } catch (error) {
            console.error('Error cleaning up old helper files:', error);
        }
    }

    /**
     * Delete ALL auto-generated files to ensure clean regeneration
     * This addresses the issue where removed properties don't get updated in generated files
     */
    async deleteAllGeneratedFiles(generatedDir: string): Promise<void> {
        try {
            if (!fs.existsSync(generatedDir)) {
                return;
            }

            const files = fs.readdirSync(generatedDir);

            // Delete all .g.dart files
            for (const file of files) {
                if (file.endsWith('.g.dart')) {
                    const filePath = path.join(generatedDir, file);
                    fs.unlinkSync(filePath);
                    console.log(`Deleted generated file: ${file}`);
                }
            }

            // Also delete and recreate base directory contents
            const baseDir = path.join(generatedDir, 'base');
            if (fs.existsSync(baseDir)) {
                const baseFiles = fs.readdirSync(baseDir);
                for (const file of baseFiles) {
                    if (file === 'json_convert_content.dart') {
                        const filePath = path.join(baseDir, file);
                        fs.unlinkSync(filePath);
                        console.log(`Deleted base file: ${file}`);
                    }
                }
            }
        } catch (error) {
            console.error('Error deleting all generated files:', error);
        }
    }

    /**
     * Convert string to snake_case
     */
    toSnakeCase(str: string): string {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
    }

    /**
     * Calculate relative import path from project root
     */
    calculateImportPath(filePath: string): string {
        const projectRoot = this.getFlutterProjectRoot();
        if (!projectRoot) {
            throw new Error('Flutter project root not found');
        }

        // Calculate relative path from project root for imports
        const relativePath = path.relative(projectRoot, filePath);
        let importPath = relativePath.replace(/\.dart$/, '').replace(/\\/g, '/');

        // Remove lib/ prefix for package imports
        if (importPath.startsWith('lib/')) {
            importPath = importPath.substring(4);
        }

        return importPath;
    }

    /**
     * Reset cached values (useful for testing or when project changes)
     */
    resetCache(): void {
        this._projectRoot = undefined;
        this._packageName = undefined;
    }
}
