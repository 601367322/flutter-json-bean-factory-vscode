import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { JsonParser, JsonClass } from '../parsers/JsonParser';
import { DartClassParser, DartClassInfo } from '../parsers/DartClassParser';
import { DartCodeGenerator, GeneratorConfig } from './DartCodeGenerator';
import { FlutterProjectDetector } from '../utils/FlutterProjectDetector';
import { JsonInputDialog, JsonInputResult } from '../ui/JsonInputDialog';

// Interface for entity file information (like original plugin's HelperFileGeneratorInfo)
interface EntityFileInfo {
    filePath: string;           // Relative path from lib/ (e.g., "models/user.dart")
    importStatement: string;    // Import statement for this file
    classes: DartClassInfo[];   // All @JsonSerializable classes in this file
}

export class JsonBeanGenerator {
    private jsonParser: JsonParser;
    private dartClassParser: DartClassParser;
    private codeGenerator!: DartCodeGenerator;
    private projectDetector: FlutterProjectDetector;
    private context?: vscode.ExtensionContext;

    constructor(context?: vscode.ExtensionContext) {
        this.jsonParser = new JsonParser();
        this.dartClassParser = new DartClassParser();
        this.projectDetector = new FlutterProjectDetector();
        this.context = context;
        this.updateConfig();
    }

    /**
     * Generate Dart bean from JSON input
     */
    async generateFromJson(uri?: vscode.Uri): Promise<void> {
        try {
            // Show enhanced input dialog
            const dialog = new JsonInputDialog(this.context!);
            const result = await dialog.show();

            if (!result) {
                return;
            }

            // Update generator config with dialog settings
            this.updateGeneratorConfig(result.settings);

            // Parse JSON and generate classes
            const rootClass = this.jsonParser.parseJson(result.jsonString, result.className);
            const allClasses = this.jsonParser.getAllClasses(rootClass);

            // Generate and save files
            await this.generateAndSaveFiles(allClasses, uri);

            vscode.window.showInformationMessage(
                `Successfully generated ${allClasses.length} Dart class(es) for ${result.className}`
            );

        } catch (error) {
            vscode.window.showErrorMessage(`Error generating Dart bean: ${error}`);
        }
    }

    /**
     * Regenerate existing Dart bean from existing entity file (original plugin style)
     */
    async regenerateBean(uri: vscode.Uri): Promise<void> {
        try {
            // Simply call regenerateAllBeans since original plugin regenerates all files
            // when Alt+J is pressed, regardless of which file is active
            await this.regenerateAllBeans();
        } catch (error) {
            vscode.window.showErrorMessage(`Error regenerating Dart bean: ${error}`);
        }
    }

    /**
     * Regenerate all existing Dart beans (equivalent to Alt+J in original plugin)
     * Based on original plugin logic: scan all @JsonSerializable files and regenerate everything
     */
    async regenerateAllBeans(): Promise<void> {
        try {
            const projectRoot = this.projectDetector.getFlutterProjectRoot();
            if (!projectRoot) {
                vscode.window.showErrorMessage('Flutter project root not found');
                return;
            }

            const config = this.getConfig();
            const generatedDir = path.join(projectRoot, config.generatedPath);

            // Step 1: Scan all entity files (like original plugin's getAllEntityFiles)
            const allEntityFiles = await this.getAllEntityFiles();

            if (allEntityFiles.length === 0) {
                vscode.window.showInformationMessage('No classes that contain @JsonSerializable were found');
                return;
            }

            // Step 2: Ensure directories exist
            this.projectDetector.ensureDirectoryExists(generatedDir);
            this.projectDetector.ensureDirectoryExists(path.join(generatedDir, 'base'));

            // Step 3: Clean up old helper files (like original plugin)
            await this.cleanupOldHelperFiles(generatedDir, allEntityFiles);

            // Step 4: Generate all helper files (like original plugin's generateAllDartEntityHelper)
            await this.generateAllDartEntityHelper(generatedDir, allEntityFiles);

            // Step 5: Generate json_convert_content.dart (like original plugin)
            await this.generateJsonConvertContentFromEntityFiles(generatedDir, allEntityFiles);

            vscode.window.showInformationMessage(
                `Successfully regenerated all Dart beans (${allEntityFiles.length} classes)`
            );

        } catch (error) {
            vscode.window.showErrorMessage(`Error regenerating all Dart beans: ${error}`);
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

        // 扫描已存在的entity文件，获取所有已生成的models
        const existingModels = await this.scanExistingModels();

        // Generate only the main class file (original plugin style)
        // All nested classes are included in the main file, no separate files for nested classes
        const mainClass = classes[0]; // The root class
        const fileName = this.toSnakeCase(mainClass.name);
        const entityPath = path.join(targetDir, `${fileName}.dart`);

        // Calculate relative path from project root for imports
        const relativePath = path.relative(projectRoot, entityPath);
        let importPath = relativePath.replace(/\.dart$/, '').replace(/\\/g, '/');

        // Remove lib/ prefix for package imports
        if (importPath.startsWith('lib/')) {
            importPath = importPath.substring(4);
        }

        // Add import path to new classes for json_convert_content.dart
        const newClassesWithPath = classes.map(cls => ({
            ...cls,
            filePath: importPath
        }));

        // 合并新生成的classes和已存在的models
        const allClasses = this.mergeWithExistingModels(newClassesWithPath, existingModels);

        // Generate base JSON convert file with ALL classes (new + existing)
        await this.generateBaseJsonConvert(generatedDir, allClasses);

        await this.generateMainClassFile(mainClass, targetDir, generatedDir);
    }

    private async generateMainClassFile(cls: JsonClass, entityDir: string, generatedDir: string): Promise<void> {
        const fileName = this.toSnakeCase(cls.name);
        const projectRoot = this.projectDetector.getFlutterProjectRoot()!;

        // Generate single entity file containing all classes (original plugin style)
        const entityContent = this.codeGenerator.generateDartClass(cls);
        const entityPath = path.join(entityDir, `${fileName}.dart`);
        fs.writeFileSync(entityPath, entityContent);

        // Calculate relative path from project root for imports
        const relativePath = path.relative(projectRoot, entityPath);
        let importPath = relativePath.replace(/\.dart$/, '').replace(/\\/g, '/');

        // Remove lib/ prefix for package imports
        if (importPath.startsWith('lib/')) {
            importPath = importPath.substring(4);
        }

        // Generate helper file for the main class only
        const helperContent = this.codeGenerator.generateHelperFile(cls, importPath);
        const helperPath = path.join(generatedDir, `${fileName}.g.dart`);
        fs.writeFileSync(helperPath, helperContent);
    }

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

    private updateConfig(): void {
        const config = this.getConfig();
        const packageName = this.projectDetector.getPackageName() || 'your_app';
        this.codeGenerator = new DartCodeGenerator(config, packageName);
    }

    private updateGeneratorConfig(settings: any): void {
        const config = this.getConfig();

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

        const packageName = this.projectDetector.getPackageName() || 'your_app';
        this.codeGenerator = new DartCodeGenerator(config, packageName);
    }

    private getConfig(): GeneratorConfig {
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
     * 扫描已存在的entity文件，提取类名和路径信息
     * 支持多路径扫描，路径用逗号分隔
     */
    private async scanExistingModels(): Promise<Array<{className: string, filePath: string}>> {
        const existingModels: Array<{className: string, filePath: string}> = [];
        const config = this.getConfig();
        const projectRoot = this.projectDetector.getFlutterProjectRoot();

        if (!projectRoot) {
            return existingModels;
        }

        try {
            // 解析扫描路径，支持多路径（逗号分隔）
            const scanPaths = config.scanPath.split(',').map(p => p.trim());

            for (const scanPath of scanPaths) {
                if (!scanPath) continue;

                const fullScanPath = path.join(projectRoot, scanPath);
                await this.scanDirectoryForModels(fullScanPath, existingModels, projectRoot);
            }

            // 去重（基于类名）
            const uniqueModels = existingModels.filter((model, index, self) =>
                index === self.findIndex(m => m.className === model.className)
            );

            return uniqueModels;

        } catch (error) {
            console.error('Error scanning existing models:', error);
            return existingModels;
        }
    }

    /**
     * 递归扫描目录中的entity文件
     */
    private async scanDirectoryForModels(dirPath: string, existingModels: Array<{className: string, filePath: string}>, projectRoot: string): Promise<void> {
        try {
            if (!fs.existsSync(dirPath)) {
                return;
            }

            const stat = fs.statSync(dirPath);
            if (!stat.isDirectory()) {
                return;
            }

            const files = fs.readdirSync(dirPath);

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const fileStat = fs.statSync(filePath);

                if (fileStat.isDirectory()) {
                    // 递归扫描子目录
                    await this.scanDirectoryForModels(filePath, existingModels, projectRoot);
                } else if (file.endsWith('.dart')) {
                    // 检查Dart文件
                    await this.scanDartFileForModels(filePath, existingModels, projectRoot);
                }
            }
        } catch (error) {
            console.error(`Error scanning directory ${dirPath}:`, error);
        }
    }

    /**
     * 扫描单个Dart文件中的entity类
     */
    private async scanDartFileForModels(filePath: string, existingModels: Array<{className: string, filePath: string}>, projectRoot: string): Promise<void> {
        try {
            const content = fs.readFileSync(filePath, 'utf8');

            // 提取类名，匹配 @JsonSerializable() 后面的 class 声明
            const classMatches = content.matchAll(/@JsonSerializable\(\)\s*class\s+(\w+)/g);

            for (const match of classMatches) {
                if (match[1]) {
                    // 计算相对于项目根目录的路径
                    const relativePath = path.relative(projectRoot, filePath);
                    // 移除.dart扩展名，并转换路径分隔符
                    let importPath = relativePath.replace(/\.dart$/, '').replace(/\\/g, '/');

                    // 移除lib/前缀（package导入不需要lib前缀）
                    if (importPath.startsWith('lib/')) {
                        importPath = importPath.substring(4);
                    }

                    existingModels.push({
                        className: match[1],
                        filePath: importPath
                    });
                }
            }
        } catch (error) {
            console.error(`Error scanning file ${filePath}:`, error);
        }
    }

    /**
     * 合并新生成的classes和已存在的models
     */
    private mergeWithExistingModels(newClasses: JsonClass[], existingModels: Array<{className: string, filePath: string}>): JsonClass[] {
        const allClasses = [...newClasses];
        const config = this.getConfig();

        // 为已存在的models创建简单的JsonClass对象（用于生成导入和映射）
        for (const model of existingModels) {
            // 检查是否已经在新classes中存在
            const exists = newClasses.some(cls => {
                const generatedClassName = config.classNamePrefix + cls.name + config.classNameSuffix;
                return generatedClassName === model.className;
            });

            if (!exists) {
                // 创建一个简单的JsonClass对象，包含类名和文件路径信息
                let baseName = model.className;
                // 移除前缀和后缀得到原始名称
                if (config.classNamePrefix && baseName.startsWith(config.classNamePrefix)) {
                    baseName = baseName.substring(config.classNamePrefix.length);
                }
                if (config.classNameSuffix && baseName.endsWith(config.classNameSuffix)) {
                    baseName = baseName.substring(0, baseName.length - config.classNameSuffix.length);
                }

                const existingClass: JsonClass & {filePath?: string} = {
                    name: baseName,
                    properties: [],
                    nestedClasses: [],
                    filePath: model.filePath  // 保存实际文件路径
                };
                allClasses.push(existingClass);
            }
        }

        return allClasses;
    }

    /**
     * Get all entity files containing @JsonSerializable classes (like original plugin's getAllEntityFiles)
     */
    private async getAllEntityFiles(): Promise<EntityFileInfo[]> {
        const projectRoot = this.projectDetector.getFlutterProjectRoot();
        if (!projectRoot) {
            return [];
        }

        const entityFiles: EntityFileInfo[] = [];
        const libDir = path.join(projectRoot, 'lib');

        if (!fs.existsSync(libDir)) {
            return [];
        }

        // Recursively scan all .dart files in lib directory
        await this.scanDirectoryForEntityFiles(libDir, entityFiles, projectRoot);

        return entityFiles;
    }

    /**
     * Recursively scan directory for entity files
     */
    private async scanDirectoryForEntityFiles(dirPath: string, entityFiles: EntityFileInfo[], projectRoot: string): Promise<void> {
        try {
            const files = fs.readdirSync(dirPath);

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stat = fs.statSync(filePath);

                if (stat.isDirectory()) {
                    // Skip generated directory and other non-entity directories
                    if (!file.includes('generated') && !file.includes('.dart_tool')) {
                        await this.scanDirectoryForEntityFiles(filePath, entityFiles, projectRoot);
                    }
                } else if (file.endsWith('.dart') && !file.endsWith('.g.dart')) {
                    // Check if this dart file contains @JsonSerializable classes
                    const content = fs.readFileSync(filePath, 'utf8');

                    if (this.dartClassParser.hasJsonSerializableClasses(content)) {
                        const dartClasses = this.dartClassParser.parseDartFile(content);

                        if (dartClasses.length > 0) {
                            // Calculate relative path from lib directory
                            const relativePath = path.relative(path.join(projectRoot, 'lib'), filePath);
                            const importPath = relativePath.replace(/\\/g, '/');

                            // Get package name from pubspec.yaml
                            const packageName = await this.getPackageName(projectRoot);

                            entityFiles.push({
                                filePath: importPath,
                                importStatement: `import 'package:${packageName}/${importPath}';`,
                                classes: dartClasses
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error scanning directory ${dirPath}:`, error);
        }
    }

    /**
     * Get package name from pubspec.yaml
     */
    private async getPackageName(projectRoot: string): Promise<string> {
        try {
            const pubspecPath = path.join(projectRoot, 'pubspec.yaml');
            if (fs.existsSync(pubspecPath)) {
                const content = fs.readFileSync(pubspecPath, 'utf8');
                const nameMatch = content.match(/^name:\s*(.+)$/m);
                if (nameMatch) {
                    return nameMatch[1].trim();
                }
            }
        } catch (error) {
            console.error('Error reading pubspec.yaml:', error);
        }
        return 'app'; // fallback
    }

    /**
     * Clean up old helper files (like original plugin)
     */
    private async cleanupOldHelperFiles(generatedDir: string, allEntityFiles: EntityFileInfo[]): Promise<void> {
        try {
            if (!fs.existsSync(generatedDir)) {
                return;
            }

            const files = fs.readdirSync(generatedDir);
            const expectedHelperFiles = allEntityFiles.map(entityFile => {
                const baseName = path.basename(entityFile.filePath, '.dart');
                return `${baseName}.g.dart`;
            });

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
        const packageName = this.getPackageNameSync();
        const content: string[] = [];

        // Add imports
        content.push(`import 'package:${packageName}/generated/json/base/json_convert_content.dart';`);
        content.push(entityFile.importStatement);

        // Collect all nested types that need imports (exclude types defined in current file)
        const nestedTypes = new Set<string>();
        const currentFileClasses = new Set(entityFile.classes.map(cls => cls.className));

        for (const dartClass of entityFile.classes) {
            const jsonClass = this.dartClassParser.convertToJsonClass(dartClass);
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
            const actualFilePath = this.findActualFilePathForType(nestedType);
            if (actualFilePath) {
                content.push(`import 'package:${packageName}/${actualFilePath}';`);
            } else {
                // Fallback to snake_case conversion if file not found
                const snakeTypeName = this.toSnakeCase(nestedType);
                content.push(`import 'package:${packageName}/modal/response/${snakeTypeName}.dart';`);
            }
        }

        content.push('');

        // Generate helper functions for each class (like original plugin)
        for (const dartClass of entityFile.classes) {
            const jsonClass = this.dartClassParser.convertToJsonClass(dartClass);
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
        functions.push(this.generateFromJsonFunction(className, jsonClass.properties));
        functions.push('');

        // Generate toJson function
        functions.push(this.generateToJsonFunction(className, jsonClass.properties));
        functions.push('');

        // Generate copyWith extension
        functions.push(this.generateCopyWithExtension(className, jsonClass.properties));

        return functions.join('\n');
    }

    /**
     * Generate json_convert_content.dart from entity files (like original plugin)
     */
    private async generateJsonConvertContentFromEntityFiles(generatedDir: string, allEntityFiles: EntityFileInfo[]): Promise<void> {
        const baseDir = path.join(generatedDir, 'base');
        const packageName = await this.getPackageName(this.projectDetector.getFlutterProjectRoot()!);

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
     * Get package name synchronously (for helper generation)
     */
    private getPackageNameSync(): string {
        try {
            const projectRoot = this.projectDetector.getFlutterProjectRoot();
            if (projectRoot) {
                const pubspecPath = path.join(projectRoot, 'pubspec.yaml');
                if (fs.existsSync(pubspecPath)) {
                    const content = fs.readFileSync(pubspecPath, 'utf8');
                    const nameMatch = content.match(/^name:\s*(.+)$/m);
                    if (nameMatch) {
                        return nameMatch[1].trim();
                    }
                }
            }
        } catch (error) {
            console.error('Error reading pubspec.yaml:', error);
        }
        return 'app'; // fallback
    }

    /**
     * Generate fromJson function for a class
     */
    private generateFromJsonFunction(className: string, properties: any[]): string {
        return this.codeGenerator.generateFromJsonFunction(className, properties);
    }

    /**
     * Generate toJson function for a class
     */
    private generateToJsonFunction(className: string, properties: any[]): string {
        return this.codeGenerator.generateToJsonFunction(className, properties);
    }

    /**
     * Generate copyWith extension for a class
     */
    private generateCopyWithExtension(className: string, properties: any[]): string {
        return this.codeGenerator.generateCopyWithExtension(className, properties);
    }

    /**
     * 将已存在的models转换为JsonClass格式（用于重新生成所有beans）
     */
    private convertModelsToJsonClasses(existingModels: Array<{className: string, filePath: string}>): JsonClass[] {
        const config = this.getConfig();
        const allClasses: JsonClass[] = [];

        for (const model of existingModels) {
            // 创建一个简单的JsonClass对象，包含类名和文件路径信息
            let baseName = model.className;
            // 移除前缀和后缀得到原始名称
            if (config.classNamePrefix && baseName.startsWith(config.classNamePrefix)) {
                baseName = baseName.substring(config.classNamePrefix.length);
            }
            if (config.classNameSuffix && baseName.endsWith(config.classNameSuffix)) {
                baseName = baseName.substring(0, baseName.length - config.classNameSuffix.length);
            }

            const existingClass: JsonClass & {filePath?: string} = {
                name: baseName,
                properties: [],
                nestedClasses: [],
                filePath: model.filePath  // 保存实际文件路径
            };
            allClasses.push(existingClass);
        }

        return allClasses;
    }

    /**
     * Find the actual file path for a given type by scanning all entity files
     */
    private findActualFilePathForType(typeName: string): string | null {
        try {
            const projectRoot = this.projectDetector.getFlutterProjectRoot();
            if (!projectRoot) {
                return null;
            }

            const libDir = path.join(projectRoot, 'lib');
            if (!fs.existsSync(libDir)) {
                return null;
            }

            // Recursively search for the type in all .dart files
            return this.searchTypeInDirectory(libDir, typeName, projectRoot);
        } catch (error) {
            console.error(`Error finding file path for type ${typeName}:`, error);
            return null;
        }
    }

    /**
     * Recursively search for a type in a directory
     */
    private searchTypeInDirectory(dirPath: string, typeName: string, projectRoot: string): string | null {
        try {
            const files = fs.readdirSync(dirPath);

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stat = fs.statSync(filePath);

                if (stat.isDirectory()) {
                    // Skip generated directory and other non-entity directories
                    if (!file.includes('generated') && !file.includes('.dart_tool')) {
                        const result = this.searchTypeInDirectory(filePath, typeName, projectRoot);
                        if (result) {
                            return result;
                        }
                    }
                } else if (file.endsWith('.dart') && !file.endsWith('.g.dart')) {
                    // Check if this dart file contains the type
                    const content = fs.readFileSync(filePath, 'utf8');

                    if (this.dartClassParser.hasJsonSerializableClasses(content)) {
                        const dartClasses = this.dartClassParser.parseDartFile(content);

                        for (const dartClass of dartClasses) {
                            if (dartClass.className === typeName) {
                                // Found the type, return the relative path from lib directory
                                const relativePath = path.relative(path.join(projectRoot, 'lib'), filePath);
                                return relativePath.replace(/\\/g, '/');
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error searching in directory ${dirPath}:`, error);
        }

        return null;
    }

    private toSnakeCase(str: string): string {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
    }
}
