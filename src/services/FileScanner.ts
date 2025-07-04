import * as fs from 'fs';
import * as path from 'path';
import { DartClassParser, DartClassInfo } from '../parsers/DartClassParser';
import { JsonClass } from '../parsers/JsonParser';
import { GeneratorConfig } from '../generators/DartCodeGenerator';

// Interface for entity file information (like original plugin's HelperFileGeneratorInfo)
export interface EntityFileInfo {
    filePath: string;           // Relative path from lib/ (e.g., "models/user.dart")
    importStatement: string;    // Import statement for this file
    classes: DartClassInfo[];   // All @JsonSerializable classes in this file
}

// Interface for existing model information
export interface ExistingModelInfo {
    className: string;
    filePath: string;
}

export class FileScanner {
    private dartClassParser: DartClassParser;

    constructor() {
        this.dartClassParser = new DartClassParser();
    }

    /**
     * 扫描已存在的entity文件，提取类名和路径信息
     * 支持多路径扫描，路径用逗号分隔
     */
    async scanExistingModels(projectRoot: string, config: GeneratorConfig): Promise<ExistingModelInfo[]> {
        const existingModels: ExistingModelInfo[] = [];

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
    private async scanDirectoryForModels(
        dirPath: string, 
        existingModels: ExistingModelInfo[], 
        projectRoot: string
    ): Promise<void> {
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
    private async scanDartFileForModels(
        filePath: string, 
        existingModels: ExistingModelInfo[], 
        projectRoot: string
    ): Promise<void> {
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
     * Get all entity files containing @JsonSerializable classes (like original plugin's getAllEntityFiles)
     */
    async getAllEntityFiles(projectRoot: string, packageName: string): Promise<EntityFileInfo[]> {
        if (!projectRoot) {
            return [];
        }

        const entityFiles: EntityFileInfo[] = [];
        const libDir = path.join(projectRoot, 'lib');

        if (!fs.existsSync(libDir)) {
            return [];
        }

        // Recursively scan all .dart files in lib directory
        await this.scanDirectoryForEntityFiles(libDir, entityFiles, projectRoot, packageName);

        return entityFiles;
    }

    /**
     * Recursively scan directory for entity files
     */
    private async scanDirectoryForEntityFiles(
        dirPath: string, 
        entityFiles: EntityFileInfo[], 
        projectRoot: string,
        packageName: string
    ): Promise<void> {
        try {
            const files = fs.readdirSync(dirPath);

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stat = fs.statSync(filePath);

                if (stat.isDirectory()) {
                    // Skip generated directory and other non-entity directories
                    if (!file.includes('generated') && !file.includes('.dart_tool')) {
                        await this.scanDirectoryForEntityFiles(filePath, entityFiles, projectRoot, packageName);
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
     * 合并新生成的classes和已存在的models
     */
    mergeWithExistingModels(
        newClasses: JsonClass[], 
        existingModels: ExistingModelInfo[], 
        config: GeneratorConfig
    ): JsonClass[] {
        const allClasses = [...newClasses];

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
     * Find the actual file path for a given type by scanning all entity files
     */
    findActualFilePathForType(typeName: string, projectRoot: string): string | null {
        try {
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
}
