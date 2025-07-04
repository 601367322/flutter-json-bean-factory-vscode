import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { JsonClass } from '../parsers/JsonParser';
import { DartCodeGenerator } from '../generators/DartCodeGenerator';
import { DartClassParser } from '../parsers/DartClassParser';
import { FileScanner, EntityFileInfo } from './FileScanner';
import { ProjectManager } from './ProjectManager';

export class CodeGenerationOrchestrator {
    private fileScanner: FileScanner;
    private projectManager: ProjectManager;
    private dartClassParser: DartClassParser;
    private codeGenerator!: DartCodeGenerator;

    constructor() {
        this.fileScanner = new FileScanner();
        this.projectManager = new ProjectManager();
        this.dartClassParser = new DartClassParser();
        this.updateCodeGenerator();
    }

    /**
     * Generate and save files from JSON classes
     */
    async generateAndSaveFiles(classes: JsonClass[], targetUri?: vscode.Uri): Promise<void> {
        const projectRoot = this.projectManager.getFlutterProjectRoot();
        if (!projectRoot) {
            throw new Error('Flutter project root not found');
        }

        // Setup directories
        const { targetDir, generatedDir } = this.projectManager.setupDirectories(targetUri);

        // 扫描已存在的entity文件，获取所有已生成的models
        const config = this.projectManager.getConfig();
        const existingModels = await this.fileScanner.scanExistingModels(projectRoot, config);

        // Generate only the main class file (original plugin style)
        // All nested classes are included in the main file, no separate files for nested classes
        const mainClass = classes[0]; // The root class
        const fileName = this.projectManager.toSnakeCase(mainClass.name);
        const entityPath = path.join(targetDir, `${fileName}.dart`);

        // Calculate import path for new classes
        const importPath = this.projectManager.calculateImportPath(entityPath);

        // Add import path to new classes for json_convert_content.dart
        const newClassesWithPath = classes.map(cls => ({
            ...cls,
            filePath: importPath
        }));

        // 合并新生成的classes和已存在的models
        const allClasses = this.fileScanner.mergeWithExistingModels(newClassesWithPath, existingModels, config);

        // Generate base JSON convert file with ALL classes (new + existing)
        await this.generateBaseJsonConvert(generatedDir, allClasses);

        // Generate main class file
        await this.generateMainClassFile(mainClass, targetDir, generatedDir);
    }

    /**
     * Regenerate all existing Dart beans (equivalent to Alt+J in original plugin)
     */
    async regenerateAllBeans(): Promise<void> {
        const projectRoot = this.projectManager.getFlutterProjectRoot();
        if (!projectRoot) {
            throw new Error('Flutter project root not found');
        }

        const generatedDir = this.projectManager.getGeneratedDirectory();

        // Step 1: Scan all entity files (like original plugin's getAllEntityFiles)
        const packageName = await this.projectManager.getPackageName();
        const allEntityFiles = await this.fileScanner.getAllEntityFiles(projectRoot, packageName);

        if (allEntityFiles.length === 0) {
            vscode.window.showInformationMessage('No classes that contain @JsonSerializable were found');
            return;
        }

        // Step 2: Ensure directories exist
        this.projectManager.ensureDirectoryExists(generatedDir);
        this.projectManager.ensureDirectoryExists(path.join(generatedDir, 'base'));

        // Step 3: Clean up old helper files (like original plugin)
        const expectedHelperFiles = allEntityFiles.map(entityFile => {
            const baseName = path.basename(entityFile.filePath, '.dart');
            return `${baseName}.g.dart`;
        });
        await this.projectManager.cleanupOldHelperFiles(generatedDir, expectedHelperFiles);

        // Step 4: Generate all helper files (like original plugin's generateAllDartEntityHelper)
        await this.generateAllDartEntityHelper(generatedDir, allEntityFiles);

        // Step 5: Generate json_convert_content.dart (like original plugin)
        await this.generateJsonConvertContentFromEntityFiles(generatedDir, allEntityFiles, packageName);

        vscode.window.showInformationMessage(
            `Successfully regenerated all Dart beans (${allEntityFiles.length} classes)`
        );
    }

    /**
     * Generate main class file (entity file)
     */
    private async generateMainClassFile(cls: JsonClass, entityDir: string, generatedDir: string): Promise<void> {
        const fileName = this.projectManager.toSnakeCase(cls.name);

        // Generate single entity file containing all classes (original plugin style)
        const entityContent = this.codeGenerator.generateDartClass(cls);
        const entityPath = path.join(entityDir, `${fileName}.dart`);
        fs.writeFileSync(entityPath, entityContent);

        // Calculate import path
        const importPath = this.projectManager.calculateImportPath(entityPath);

        // Generate helper file for the main class only
        const helperContent = this.codeGenerator.generateHelperFile(cls, importPath);
        const helperPath = path.join(generatedDir, `${fileName}.g.dart`);
        fs.writeFileSync(helperPath, helperContent);
    }

    /**
     * Generate base JSON convert files
     */
    private async generateBaseJsonConvert(generatedDir: string, allClasses: JsonClass[]): Promise<void> {
        const baseDir = path.join(generatedDir, 'base');

        // Generate json_convert_content.dart with all classes
        const basePath = path.join(baseDir, 'json_convert_content.dart');
        const baseContent = this.codeGenerator.generateBaseJsonConvert(allClasses);
        fs.writeFileSync(basePath, baseContent);

        // Generate json_field.dart
        const fieldPath = path.join(baseDir, 'json_field.dart');
        if (!fs.existsSync(fieldPath)) {
            const fieldContent = this.codeGenerator.generateJsonField();
            fs.writeFileSync(fieldPath, fieldContent);
        }
    }

    /**
     * Generate all dart entity helper files (like original plugin's generateAllDartEntityHelper)
     */
    private async generateAllDartEntityHelper(generatedDir: string, allEntityFiles: EntityFileInfo[]): Promise<void> {
        for (const entityFile of allEntityFiles) {
            try {
                const baseName = path.basename(entityFile.filePath, '.dart');
                const helperFileName = `${baseName}.g.dart`;
                const helperPath = path.join(generatedDir, helperFileName);

                // Generate helper content for all classes in this file
                const helperContent = this.generateHelperContentForFile(entityFile);

                fs.writeFileSync(helperPath, helperContent);
            } catch (error) {
                console.error(`Error generating helper for ${entityFile.filePath}:`, error);
            }
        }
    }

    /**
     * Generate helper content for a single entity file
     */
    private generateHelperContentForFile(entityFile: EntityFileInfo): string {
        const packageName = this.projectManager.getPackageNameSync();
        const projectRoot = this.projectManager.getFlutterProjectRoot()!;
        const content: string[] = [];

        // Add imports
        content.push(`import 'package:${packageName}/generated/json/base/json_convert_content.dart';`);
        content.push(entityFile.importStatement);

        // Collect all nested types that need imports (exclude types defined in current file)
        const nestedTypes = new Set<string>();
        const currentFileClasses = new Set(entityFile.classes.map(cls => cls.className));

        for (const dartClass of entityFile.classes) {
            // Convert DartClassInfo to JsonClass for processing
            const jsonClass = this.convertDartClassToJsonClass(dartClass);
            for (const prop of jsonClass.properties) {
                if (prop.isNestedObject) {
                    let nestedTypeName: string;
                    if (prop.isArray && prop.arrayElementType) {
                        nestedTypeName = prop.arrayElementType;
                    } else {
                        nestedTypeName = prop.dartType;
                    }

                    // Only add import if the type is not defined in the current file
                    if (!currentFileClasses.has(nestedTypeName)) {
                        nestedTypes.add(nestedTypeName);
                    }
                }
            }
        }

        // Add imports for external nested types by finding their actual file locations
        for (const nestedType of nestedTypes) {
            const actualFilePath = this.fileScanner.findActualFilePathForType(nestedType, projectRoot);
            if (actualFilePath) {
                content.push(`import 'package:${packageName}/${actualFilePath}';`);
            } else {
                // Fallback to snake_case conversion if file not found
                const snakeTypeName = this.projectManager.toSnakeCase(nestedType);
                content.push(`import 'package:${packageName}/modal/response/${snakeTypeName}.dart';`);
            }
        }

        content.push('');

        // Generate helper functions for each class (like original plugin)
        for (const dartClass of entityFile.classes) {
            const jsonClass = this.convertDartClassToJsonClass(dartClass);
            const helperFunctions = this.generateHelperFunctionsForClass(jsonClass);
            content.push(helperFunctions);
            content.push('');
        }

        return content.join('\n');
    }

    /**
     * Generate helper functions for a single class (fromJson, toJson, copyWith)
     */
    private generateHelperFunctionsForClass(jsonClass: JsonClass): string {
        const className = jsonClass.name;
        const functions: string[] = [];

        // Generate fromJson function
        functions.push(this.codeGenerator.generateFromJsonFunction(className, jsonClass.properties));
        functions.push('');

        // Generate toJson function
        functions.push(this.codeGenerator.generateToJsonFunction(className, jsonClass.properties));
        functions.push('');

        // Generate copyWith extension
        functions.push(this.codeGenerator.generateCopyWithExtension(className, jsonClass.properties));

        return functions.join('\n');
    }

    /**
     * Generate json_convert_content.dart from entity files (like original plugin)
     */
    private async generateJsonConvertContentFromEntityFiles(
        generatedDir: string, 
        allEntityFiles: EntityFileInfo[], 
        packageName: string
    ): Promise<void> {
        const baseDir = path.join(generatedDir, 'base');

        // Generate json_convert_content.dart content (based on original plugin logic)
        const content = this.codeGenerator.generateBaseJsonConvertFromEntityFiles(allEntityFiles, packageName);

        const filePath = path.join(baseDir, 'json_convert_content.dart');
        fs.writeFileSync(filePath, content);

        // Also generate json_field.dart if it doesn't exist
        const fieldPath = path.join(baseDir, 'json_field.dart');
        if (!fs.existsSync(fieldPath)) {
            const fieldContent = this.codeGenerator.generateJsonField();
            fs.writeFileSync(fieldPath, fieldContent);
        }
    }

    /**
     * Update code generator with current configuration
     */
    private updateCodeGenerator(): void {
        const config = this.projectManager.getConfig();
        const packageName = this.projectManager.getPackageNameSync();
        this.codeGenerator = new DartCodeGenerator(config, packageName);
    }

    /**
     * Update generator config with dialog settings
     */
    updateGeneratorConfig(settings: any): void {
        const config = this.projectManager.getConfig();

        // Update config with dialog settings
        if (settings.isOpenNullable !== undefined) {
            config.forceNonNullable = !settings.isOpenNullable;
        }

        // Apply default values if setDefault is enabled
        if (settings.setDefault) {
            // Store default values for use in code generation
            (config as any).stringDefaultValue = settings.stringDefaultValue || "''";
            (config as any).intDefaultValue = settings.intDefaultValue || '0';
            (config as any).boolDefaultValue = settings.boolDefaultValue || 'false';
            (config as any).listDefaultValue = settings.listDefaultValue || '[]';
        }

        const packageName = this.projectManager.getPackageNameSync();
        this.codeGenerator = new DartCodeGenerator(config, packageName);
    }

    /**
     * Convert DartClassInfo to JsonClass (simplified conversion for helper generation)
     */
    private convertDartClassToJsonClass(dartClass: any): JsonClass {
        // Use the DartClassParser's convertToJsonClass method
        return this.dartClassParser.convertToJsonClass(dartClass);
    }
}
