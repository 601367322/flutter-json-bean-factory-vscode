import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { JsonParser, JsonClass } from '../parsers/JsonParser';
import { DartCodeGenerator, GeneratorConfig } from './DartCodeGenerator';
import { FlutterProjectDetector } from '../utils/FlutterProjectDetector';

export class JsonBeanGenerator {
    private jsonParser: JsonParser;
    private codeGenerator!: DartCodeGenerator;
    private projectDetector: FlutterProjectDetector;

    constructor() {
        this.jsonParser = new JsonParser();
        this.projectDetector = new FlutterProjectDetector();
        this.updateConfig();
    }

    /**
     * Generate Dart bean from JSON input
     */
    async generateFromJson(uri?: vscode.Uri): Promise<void> {
        try {
            // Get JSON input from user
            const jsonInput = await this.getJsonInput();
            if (!jsonInput) {
                return;
            }

            // Validate JSON
            const validation = this.jsonParser.validateJson(jsonInput);
            if (!validation.isValid) {
                vscode.window.showErrorMessage(`Invalid JSON: ${validation.error}`);
                return;
            }

            // Get class name from user
            const className = await this.getClassName();
            if (!className) {
                return;
            }

            // Parse JSON and generate classes
            const rootClass = this.jsonParser.parseJson(jsonInput, className);
            const allClasses = this.jsonParser.getAllClasses(rootClass);

            // Generate and save files
            await this.generateAndSaveFiles(allClasses, uri);

            vscode.window.showInformationMessage(
                `Successfully generated ${allClasses.length} Dart class(es) for ${className}`
            );

        } catch (error) {
            vscode.window.showErrorMessage(`Error generating Dart bean: ${error}`);
        }
    }

    /**
     * Regenerate existing Dart bean
     */
    async regenerateBean(uri: vscode.Uri): Promise<void> {
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            const content = document.getText();

            // Extract class name from file
            const classNameMatch = content.match(/class\s+(\w+)\s*{/);
            if (!classNameMatch) {
                vscode.window.showErrorMessage('Could not find class definition in file');
                return;
            }

            const className = classNameMatch[1];

            // Get JSON input for regeneration
            const jsonInput = await this.getJsonInput();
            if (!jsonInput) {
                return;
            }

            // Validate JSON
            const validation = this.jsonParser.validateJson(jsonInput);
            if (!validation.isValid) {
                vscode.window.showErrorMessage(`Invalid JSON: ${validation.error}`);
                return;
            }

            // Parse and regenerate
            const rootClass = this.jsonParser.parseJson(jsonInput, className);
            const allClasses = this.jsonParser.getAllClasses(rootClass);

            await this.generateAndSaveFiles(allClasses);

            vscode.window.showInformationMessage(`Successfully regenerated ${className}`);

        } catch (error) {
            vscode.window.showErrorMessage(`Error regenerating Dart bean: ${error}`);
        }
    }

    private async getJsonInput(): Promise<string | undefined> {
        const options: vscode.InputBoxOptions = {
            prompt: 'Enter JSON string',
            placeHolder: '{"name": "John", "age": 30}',
            validateInput: (value: string) => {
                if (!value.trim()) {
                    return 'JSON string cannot be empty';
                }
                const validation = this.jsonParser.validateJson(value);
                return validation.isValid ? null : validation.error;
            }
        };

        return await vscode.window.showInputBox(options);
    }

    private async getClassName(): Promise<string | undefined> {
        const options: vscode.InputBoxOptions = {
            prompt: 'Enter class name',
            placeHolder: 'User',
            validateInput: (value: string) => {
                if (!value.trim()) {
                    return 'Class name cannot be empty';
                }
                if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
                    return 'Class name must start with uppercase letter and contain only letters and numbers';
                }
                return null;
            }
        };

        return await vscode.window.showInputBox(options);
    }

    private async generateAndSaveFiles(classes: JsonClass[], targetUri?: vscode.Uri): Promise<void> {
        const config = this.getConfig();
        const projectRoot = this.projectDetector.getFlutterProjectRoot();
        
        if (!projectRoot) {
            throw new Error('Flutter project root not found');
        }

        // Determine target directory
        let targetDir: string;
        if (targetUri && targetUri.scheme === 'file') {
            const stat = fs.statSync(targetUri.fsPath);
            targetDir = stat.isDirectory() ? targetUri.fsPath : path.dirname(targetUri.fsPath);
        } else {
            targetDir = path.join(projectRoot, config.entityPath);
        }

        // Ensure directories exist
        this.projectDetector.ensureDirectoryExists(targetDir);
        const generatedDir = path.join(projectRoot, config.generatedPath);
        this.projectDetector.ensureDirectoryExists(generatedDir);
        this.projectDetector.ensureDirectoryExists(path.join(generatedDir, 'base'));

        // Generate base JSON convert file
        await this.generateBaseJsonConvert(generatedDir);

        // Generate classes
        for (const cls of classes) {
            await this.generateClassFiles(cls, targetDir, generatedDir);
        }
    }

    private async generateClassFiles(cls: JsonClass, entityDir: string, generatedDir: string): Promise<void> {
        const fileName = this.toSnakeCase(cls.name);
        
        // Generate entity file
        const entityContent = this.codeGenerator.generateDartClass(cls);
        const entityPath = path.join(entityDir, `${fileName}.dart`);
        fs.writeFileSync(entityPath, entityContent);

        // Generate helper file
        const helperContent = this.codeGenerator.generateHelperFile(cls);
        const helperPath = path.join(generatedDir, `${fileName}.g.dart`);
        fs.writeFileSync(helperPath, helperContent);
    }

    private async generateBaseJsonConvert(generatedDir: string): Promise<void> {
        const baseDir = path.join(generatedDir, 'base');
        const basePath = path.join(baseDir, 'json_convert_content.dart');
        
        if (!fs.existsSync(basePath)) {
            const baseContent = this.codeGenerator.generateBaseJsonConvert();
            fs.writeFileSync(basePath, baseContent);
        }
    }

    private updateConfig(): void {
        const config = this.getConfig();
        this.codeGenerator = new DartCodeGenerator(config);
    }

    private getConfig(): GeneratorConfig {
        const configuration = vscode.workspace.getConfiguration('flutter-json-bean-factory');
        
        return {
            nullSafety: configuration.get('nullSafety', true),
            useJsonAnnotation: configuration.get('useJsonAnnotation', true),
            classNamePrefix: configuration.get('classNamePrefix', ''),
            classNameSuffix: configuration.get('classNameSuffix', ''),
            generatedPath: configuration.get('generatedPath', 'lib/generated/json'),
            entityPath: configuration.get('entityPath', 'lib/models')
        };
    }

    private toSnakeCase(str: string): string {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
    }
}
