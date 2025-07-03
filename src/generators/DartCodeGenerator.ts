import { JsonClass, JsonProperty } from '../parsers/JsonParser';
import * as vscode from 'vscode';

export interface GeneratorConfig {
    nullSafety: boolean;
    useJsonAnnotation: boolean;
    classNamePrefix: string;
    classNameSuffix: string;
    generatedPath: string;
    entityPath: string;
}

export class DartCodeGenerator {
    private config: GeneratorConfig;

    constructor(config?: Partial<GeneratorConfig>) {
        const defaultConfig: GeneratorConfig = {
            nullSafety: true,
            useJsonAnnotation: true,
            classNamePrefix: '',
            classNameSuffix: '',
            generatedPath: 'lib/generated/json',
            entityPath: 'lib/models'
        };

        this.config = { ...defaultConfig, ...config };
    }

    /**
     * Generate Dart class code
     */
    generateDartClass(jsonClass: JsonClass): string {
        const className = this.getClassName(jsonClass.name);
        const imports = this.generateImports();
        const classDeclaration = this.generateClassDeclaration(className, jsonClass.properties);
        const constructor = this.generateConstructor(className, jsonClass.properties);
        const fromJsonMethod = this.generateFromJsonMethod(className, jsonClass.properties);
        const toJsonMethod = this.generateToJsonMethod(jsonClass.properties);
        
        return [
            imports,
            '',
            classDeclaration,
            constructor,
            '',
            fromJsonMethod,
            '',
            toJsonMethod,
            '}'
        ].join('\n');
    }

    /**
     * Generate helper file for JSON conversion
     */
    generateHelperFile(jsonClass: JsonClass): string {
        const className = this.getClassName(jsonClass.name);
        const imports = this.generateHelperImports(className);
        const helperMethods = this.generateHelperMethods(className, jsonClass.properties);
        
        return [
            imports,
            '',
            helperMethods
        ].join('\n');
    }

    /**
     * Generate base JSON convert file
     */
    generateBaseJsonConvert(): string {
        return `import 'dart:convert';

abstract class JsonConvert {
  static JsonConvert? _instance;
  static JsonConvert get instance => _instance ??= _JsonConvertImpl();
  
  T? asT<T extends Object?>(dynamic value);
  
  static T? fromJsonAsT<T extends Object?>(dynamic json) {
    return instance.asT<T>(json);
  }
}

class _JsonConvertImpl extends JsonConvert {
  @override
  T? asT<T extends Object?>(dynamic value) {
    if (value == null) {
      return null;
    }
    
    final String type = T.toString();
    
    try {
      if (type == 'String') {
        return value.toString() as T;
      } else if (type == 'int') {
        return int.parse(value.toString()) as T;
      } else if (type == 'double') {
        return double.parse(value.toString()) as T;
      } else if (type == 'bool') {
        if (value is bool) return value as T;
        return (value.toString().toLowerCase() == 'true') as T;
      } else if (type == 'DateTime') {
        return DateTime.parse(value.toString()) as T;
      }
      
      return value as T;
    } catch (e) {
      print('JsonConvert.asT<$type> error: $e');
      return null;
    }
  }
}`;
    }

    private generateImports(): string {
        const imports = [];
        
        if (this.config.useJsonAnnotation) {
            imports.push("import 'package:json_annotation/json_annotation.dart';");
        }
        
        imports.push("import 'generated/json/base/json_convert_content.dart';");
        
        return imports.join('\n');
    }

    private generateHelperImports(className: string): string {
        return `import 'dart:convert';
import '../../../models/${this.toSnakeCase(className)}.dart';
import '../base/json_convert_content.dart';`;
    }

    private generateClassDeclaration(className: string, properties: JsonProperty[]): string {
        const annotations = this.config.useJsonAnnotation ? '@JsonSerializable()' : '';
        const nullSuffix = this.config.nullSafety ? '?' : '';
        
        let declaration = '';
        if (annotations) {
            declaration += annotations + '\n';
        }
        
        declaration += `class ${className} {`;
        
        // Add properties
        for (const prop of properties) {
            const type = this.getDartTypeWithNullability(prop);
            declaration += `\n  ${type} ${prop.name};`;
        }
        
        return declaration;
    }

    private generateConstructor(className: string, properties: JsonProperty[]): string {
        const params = properties.map(prop => {
            const required = this.config.nullSafety && !prop.isNullable ? 'required ' : '';
            return `    ${required}this.${prop.name}`;
        }).join(',\n');
        
        return `\n  ${className}({\n${params},\n  });`;
    }

    private generateFromJsonMethod(className: string, properties: JsonProperty[]): string {
        const factoryMethod = `  factory ${className}.fromJson(Map<String, dynamic> json) {`;
        const returnStatement = `    return ${className}(`;
        
        const assignments = properties.map(prop => {
            const jsonKey = prop.name;
            let assignment = `      ${prop.name}: `;
            
            if (prop.isArray) {
                if (prop.isNestedObject && prop.arrayElementType) {
                    assignment += `(json['${jsonKey}'] as List<dynamic>?)?.map((e) => ${prop.arrayElementType}.fromJson(e as Map<String, dynamic>)).toList()`;
                } else {
                    assignment += `(json['${jsonKey}'] as List<dynamic>?)?.cast<${prop.arrayElementType}>()`;
                }
            } else if (prop.isNestedObject && prop.nestedClass) {
                assignment += `json['${jsonKey}'] != null ? ${prop.nestedClass.name}.fromJson(json['${jsonKey}'] as Map<String, dynamic>) : null`;
            } else {
                assignment += `JsonConvert.fromJsonAsT<${prop.dartType}>(json['${jsonKey}'])`;
            }
            
            return assignment;
        }).join(',\n');
        
        return [
            factoryMethod,
            returnStatement,
            assignments,
            '    );',
            '  }'
        ].join('\n');
    }

    private generateToJsonMethod(properties: JsonProperty[]): string {
        const methodDeclaration = '  Map<String, dynamic> toJson() {';
        const mapDeclaration = '    return <String, dynamic>{';
        
        const assignments = properties.map(prop => {
            const jsonKey = prop.name;
            let assignment = `      '${jsonKey}': `;
            
            if (prop.isArray && prop.isNestedObject) {
                assignment += `${prop.name}?.map((e) => e.toJson()).toList()`;
            } else if (prop.isNestedObject) {
                assignment += `${prop.name}?.toJson()`;
            } else {
                assignment += prop.name;
            }
            
            return assignment;
        }).join(',\n');
        
        return [
            methodDeclaration,
            mapDeclaration,
            assignments,
            '    };',
            '  }'
        ].join('\n');
    }

    private generateHelperMethods(className: string, properties: JsonProperty[]): string {
        const helperClassName = `${className}Helper`;
        const fromJsonMethod = this.generateHelperFromJson(className, properties);
        const toJsonMethod = this.generateHelperToJson(className, properties);
        
        return `class ${helperClassName} {
${fromJsonMethod}

${toJsonMethod}
}`;
    }

    private generateHelperFromJson(className: string, properties: JsonProperty[]): string {
        return `  static ${className} fromJson(Map<String, dynamic> json) {
    return ${className}(
${properties.map(prop => `      ${prop.name}: JsonConvert.fromJsonAsT<${this.getDartTypeWithNullability(prop)}>(json['${prop.name}'])`).join(',\n')},
    );
  }`;
    }

    private generateHelperToJson(className: string, properties: JsonProperty[]): string {
        return `  static Map<String, dynamic> toJson(${className} entity) {
    return <String, dynamic>{
${properties.map(prop => `      '${prop.name}': entity.${prop.name}`).join(',\n')},
    };
  }`;
    }

    private getClassName(name: string): string {
        return this.config.classNamePrefix + name + this.config.classNameSuffix;
    }

    private getDartTypeWithNullability(prop: JsonProperty): string {
        const nullSuffix = this.config.nullSafety && prop.isNullable ? '?' : '';
        return prop.dartType + nullSuffix;
    }

    private toSnakeCase(str: string): string {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
    }
}
