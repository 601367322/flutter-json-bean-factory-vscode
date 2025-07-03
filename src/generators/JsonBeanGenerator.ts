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

        // 扫描已存在的entity文件，获取所有已生成的models
        const existingModels = await this.scanExistingModels();

        // 合并新生成的classes和已存在的models
        const allClasses = this.mergeWithExistingModels(classes, existingModels);

        // Generate base JSON convert file with ALL classes (new + existing)
        await this.generateBaseJsonConvert(generatedDir, allClasses);

        // Generate classes (only new ones)
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

    private toSnakeCase(str: string): string {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
    }
}
