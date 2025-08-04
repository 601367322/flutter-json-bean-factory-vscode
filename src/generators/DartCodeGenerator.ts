import { JsonClass, JsonProperty } from '../parsers/JsonParser';
import * as vscode from 'vscode';

export interface GeneratorConfig {
    nullSafety: boolean;
    useJsonAnnotation: boolean;
    classNamePrefix: string;
    classNameSuffix: string;
    generatedPath: string;
    entityPath: string;
    forceNonNullable: boolean;  // 强制所有字段非空
    addNullChecks: boolean;     // 在fromJson中添加null检查
    useAsserts: boolean;        // 使用assert进行验证
    generateToString: boolean;  // 生成toString方法
    generateEquality: boolean;  // 生成==和hashCode方法
    scanPath: string;           // 扫描现有models的路径
}

export class DartCodeGenerator {
    private config: GeneratorConfig;
    private packageName: string;

    constructor(config?: Partial<GeneratorConfig>, packageName: string = 'your_app') {
        const defaultConfig: GeneratorConfig = {
            nullSafety: true,
            useJsonAnnotation: true,
            classNamePrefix: '',
            classNameSuffix: '',
            generatedPath: 'lib/generated/json',
            entityPath: 'lib/models',
            forceNonNullable: false,
            addNullChecks: true,
            useAsserts: false,
            generateToString: true,
            generateEquality: false,
            scanPath: 'lib'
        };

        this.config = { ...defaultConfig, ...config };
        this.packageName = packageName;
    }

    /**
     * Generate Dart class code (entity file)
     */
    generateDartClass(jsonClass: JsonClass): string {
        const className = this.getClassName(jsonClass.name);
        const allClasses = this.collectAllClasses(jsonClass);
        const imports = this.generateSingleFileImports(className);

        // 生成主类和所有嵌套类在同一个文件中
        const classDeclarations = [];

        // 主类
        const mainClassDeclaration = this.generateEntityClassDeclaration(className, jsonClass.properties);
        classDeclarations.push(mainClassDeclaration);

        // 嵌套类（去除Entity后缀，使用原始类名）
        const processedClassNames = new Set<string>();
        processedClassNames.add(className); // 添加主类名，避免重复

        for (const nestedClass of allClasses.slice(1)) { // 跳过主类
            const nestedClassName = this.getNestedClassName(nestedClass.name);

            // 避免重复的类名
            if (!processedClassNames.has(nestedClassName)) {
                processedClassNames.add(nestedClassName);
                const nestedClassDeclaration = this.generateEntityClassDeclaration(nestedClassName, nestedClass.properties);
                classDeclarations.push(nestedClassDeclaration);
            }
        }

        return [
            imports,
            '',
            classDeclarations.join('\n\n')
        ].join('\n');
    }

    /**
     * Generate helper file for JSON conversion (original style)
     */
    generateHelperFile(jsonClass: JsonClass, entityImportPath?: string): string {
        const className = this.getClassName(jsonClass.name);
        const allClasses = this.collectAllClasses(jsonClass);
        const imports = this.generateHelperImports(className, allClasses, entityImportPath);

        // 使用统一的内容生成逻辑
        const content = this.generateHelperFileContent(className, allClasses);

        return [
            imports,
            '',
            content
        ].join('\n');
    }

    /**
     * Generate helper file content without imports (for unified logic)
     */
    generateHelperFileContent(className: string, allClasses: JsonClass[]): string {
        // 生成所有类的函数（原版风格）
        const allFunctions: string[] = [];
        const processedClasses = new Set<string>();

        // 先收集所有需要处理的类
        const classesToProcess = [];
        for (const cls of allClasses) {
            const clsName = cls.name === className ? className : this.getNestedClassName(cls.name);
            if (!processedClasses.has(clsName)) {
                processedClasses.add(clsName);
                classesToProcess.push({ cls, clsName });
            }
        }

        for (let i = 0; i < classesToProcess.length; i++) {
            const { cls, clsName } = classesToProcess[i];

            const fromJsonFunction = this.generateFromJsonFunction(clsName, cls.properties);
            const toJsonFunction = this.generateToJsonFunction(clsName, cls.properties);
            const copyWithExtension = this.generateCopyWithExtension(clsName, cls.properties);

            allFunctions.push(fromJsonFunction);
            allFunctions.push('');
            allFunctions.push(toJsonFunction);
            allFunctions.push('');
            allFunctions.push(copyWithExtension);

            // 只在不是最后一个类时添加空行
            if (i < classesToProcess.length - 1) {
                allFunctions.push('');
            }
        }

        return allFunctions.join('\n');
    }

    /**
     * Generate base JSON convert file (original style with dynamic updates)
     */
    generateBaseJsonConvert(allClasses: JsonClass[] = []): string {
        const imports = this.generateJsonConvertImports(allClasses);
        const getListChildType = this.generateGetListChildType(allClasses);
        const convertFuncMap = this.generateConvertFuncMap(allClasses);

        return `// ignore_for_file: non_constant_identifier_names
// ignore_for_file: camel_case_types
// ignore_for_file: prefer_single_quotes

// This file is automatically generated. DO NOT EDIT, all your changes would be lost.
import 'package:flutter/material.dart' show debugPrint;
${imports}

JsonConvert jsonConvert = JsonConvert();

typedef JsonConvertFunction<T> = T Function(Map<String, dynamic> json);
typedef EnumConvertFunction<T> = T Function(String value);
typedef ConvertExceptionHandler = void Function(Object error, StackTrace stackTrace);
extension MapSafeExt<K, V> on Map<K, V> {
  T? getOrNull<T>(K? key) {
    if (!containsKey(key) || key == null) {
      return null;
    } else {
      return this[key] as T?;
    }
  }
}

class JsonConvert {
  static ConvertExceptionHandler? onError;
  JsonConvertClassCollection convertFuncMap = JsonConvertClassCollection();

  /// When you are in the development, to generate a new model class, hot-reload doesn't find new generation model class, you can build on MaterialApp method called jsonConvert. ReassembleConvertFuncMap (); This method only works in a development environment
  /// https://flutter.cn/docs/development/tools/hot-reload
  /// class MyApp extends StatelessWidget {
  ///    const MyApp({Key? key})
  ///        : super(key: key);
  ///
  ///    @override
  ///    Widget build(BuildContext context) {
  ///      jsonConvert.reassembleConvertFuncMap();
  ///      return MaterialApp();
  ///    }
  /// }
  void reassembleConvertFuncMap() {
    bool isReleaseMode = const bool.fromEnvironment('dart.vm.product');
    if (!isReleaseMode) {
      convertFuncMap = JsonConvertClassCollection();
    }
  }

  T? convert<T>(dynamic value, {EnumConvertFunction? enumConvert}) {
    if (value == null) {
      return null;
    }
    if (value is T) {
      return value;
    }
    try {
      return _asT<T>(value, enumConvert: enumConvert);
    } catch (e, stackTrace) {
      debugPrint('asT<\$T> \$e \$stackTrace');
      if (onError != null) {
        onError!(e, stackTrace);
      }
      return null;
    }
  }

  List<T?>? convertList<T>(List<dynamic>? value,
      {EnumConvertFunction? enumConvert}) {
    if (value == null) {
      return null;
    }
    try {
      return value.map((dynamic e) => _asT<T>(e, enumConvert: enumConvert))
          .toList();
    } catch (e, stackTrace) {
      debugPrint('asT<\$T> \$e \$stackTrace');
      if (onError != null) {
        onError!(e, stackTrace);
      }
      return <T>[];
    }
  }

  List<T>? convertListNotNull<T>(dynamic value,
      {EnumConvertFunction? enumConvert}) {
    if (value == null) {
      return null;
    }
    try {
      return (value as List<dynamic>).map((dynamic e) =>
      _asT<T>(e, enumConvert: enumConvert)!).toList();
    } catch (e, stackTrace) {
      debugPrint('asT<\$T> \$e \$stackTrace');
      if (onError != null) {
        onError!(e, stackTrace);
      }
      return <T>[];
    }
  }

  T? _asT<T extends Object?>(dynamic value,
      {EnumConvertFunction? enumConvert}) {
    final String type = T.toString();
    final String valueS = value.toString();
    if (enumConvert != null) {
      return enumConvert(valueS) as T;
    } else if (type == "String") {
      return valueS as T;
    } else if (type == "int") {
      final int? intValue = int.tryParse(valueS);
      if (intValue == null) {
        return double.tryParse(valueS)?.toInt() as T?;
      } else {
        return intValue as T;
      }
    } else if (type == "double") {
      return double.parse(valueS) as T;
    } else if (type == "DateTime") {
      return DateTime.parse(valueS) as T;
    } else if (type == "bool") {
      if (valueS == '0' || valueS == '1') {
        return (valueS == '1') as T;
      }
      return (valueS == 'true') as T;
    } else if (type == "Map" || type.startsWith("Map<")) {
      return value as T;
    } else {
      if (convertFuncMap.containsKey(type)) {
        if (value == null) {
          return null;
        }
        var covertFunc = convertFuncMap[type]!;
        if (covertFunc is Map<String, dynamic>) {
          return covertFunc(value as Map<String, dynamic>) as T;
        } else {
          return covertFunc(Map<String, dynamic>.from(value)) as T;
        }
      } else {
        throw UnimplementedError(
            '\$type unimplemented,you can try running the app again');
      }
    }
  }

  //list is returned by type
${getListChildType}

  static M? fromJsonAsT<M>(dynamic json) {
    if (json is M) {
      return json;
    }
    if (json is List) {
      return _getListChildType<M>(
          json.map((dynamic e) => e as Map<String, dynamic>).toList());
    } else {
      return jsonConvert.convert<M>(json);
    }
  }
}

${convertFuncMap}`;
    }

    /**
     * Generate json_field.dart file (fixed content)
     */
    generateJsonField(): string {
        return `// ignore_for_file: non_constant_identifier_names
// ignore_for_file: camel_case_types
// ignore_for_file: prefer_single_quotes

// This file is automatically generated. DO NOT EDIT, all your changes would be lost.

import 'package:meta/meta_meta.dart';

@Target({TargetKind.classType})
class JsonSerializable {
  const JsonSerializable();
}

@Target({TargetKind.field})
class JSONField {
  //Specify the parse field name
  final String? name;

  //Whether to participate in toJson
  final bool? serialize;

  //Whether to participate in fromMap
  final bool? deserialize;

  //Whether to participate in copyWith
  final bool? copyWith;

  //Enumeration or not
  final bool? isEnum;

  const JSONField({this.name, this.serialize, this.deserialize, this.isEnum, this.copyWith});
}`;
    }

    private generateSingleFileImports(className: string): string {
        const snakeClassName = this.toSnakeCase(className);
        return `import 'package:${this.packageName}/generated/json/base/json_field.dart';
import 'package:${this.packageName}/generated/json/${snakeClassName}.g.dart';
import 'dart:convert';
export 'package:${this.packageName}/generated/json/${snakeClassName}.g.dart';`;
    }

    private getNestedClassName(originalName: string): string {
        // 对于独立的类名（如PageConfigItem），不应该被简化
        // 只有当类名明显是重复生成的嵌套类名时才进行简化

        let className = originalName;

        // 查找重复的模式并移除（只处理明显的重复前缀）
        const parts = className.split(/(?=[A-Z])/);
        if (parts.length > 4) { // 只有当类名很长时才考虑简化
            // 寻找重复的前缀模式
            const firstHalf = parts.slice(0, Math.floor(parts.length / 2)).join('');
            const secondHalf = parts.slice(Math.floor(parts.length / 2)).join('');

            if (className.startsWith(firstHalf + firstHalf)) {
                // 如果有重复前缀，移除一个
                className = className.substring(firstHalf.length);
            }
        }

        // 不再自动移除Item后缀，保持原始类名
        // 这样可以避免PageConfigItem被错误地简化为PageConfig
        return className;
    }

    private collectAllClasses(jsonClass: JsonClass): JsonClass[] {
        const allClasses: JsonClass[] = [jsonClass];
        const visited = new Set<string>();

        const collectNested = (cls: JsonClass) => {
            if (visited.has(cls.name)) return;
            visited.add(cls.name);

            for (const prop of cls.properties) {
                if (prop.nestedClass) {
                    allClasses.push(prop.nestedClass);
                    collectNested(prop.nestedClass);
                }
            }

            for (const nestedClass of cls.nestedClasses) {
                allClasses.push(nestedClass);
                collectNested(nestedClass);
            }
        };

        collectNested(jsonClass);
        return allClasses;
    }

    private generateHelperImports(className: string, allClasses: JsonClass[], entityImportPath?: string): string {
        const imports = [`import 'package:${this.packageName}/generated/json/base/json_convert_content.dart';`];

        // 只导入主文件，嵌套类都在主文件中（原版风格）
        if (entityImportPath) {
            // 使用实际的文件路径
            imports.push(`import 'package:${this.packageName}/${entityImportPath}.dart';`);
        } else {
            // 使用默认的models路径
            const mainClass = allClasses[0]; // 主类
            const entityClassName = this.getClassName(mainClass.name);
            const snakeClassName = this.toSnakeCase(entityClassName);
            imports.push(`import 'package:${this.packageName}/models/${snakeClassName}.dart';`);
        }

        return imports.join('\n');
    }

    private generateEntityClassDeclaration(className: string, properties: JsonProperty[]): string {
        const parts = [];

        // Add @JsonSerializable() annotation
        parts.push('@JsonSerializable()');
        parts.push(`class ${className} {`);

        // Add properties with default values (original style)
        for (const prop of properties) {
            const defaultValue = this.getDefaultValue(prop);

            // 检查是否需要@JSONField注解（原始JSON key与驼峰字段名不同）
            const camelCaseName = this.toCamelCase(prop.originalJsonKey);
            const needsJsonField = camelCaseName !== prop.originalJsonKey;

            // 添加@JSONField注解（如果需要），使用单引号（原版风格）
            if (needsJsonField) {
                parts.push(`  @JSONField(name: '${prop.originalJsonKey}')`);
            }

            // 使用驼峰命名的字段名
            const fieldName = needsJsonField ? camelCaseName : prop.originalJsonKey;

            // 修正字段类型，在单文件模式下使用简洁的类名
            let fieldType = prop.dartType;
            if (prop.isArray && prop.arrayElementType && prop.isNestedObject) {
                const simpleElementType = this.getNestedClassName(prop.arrayElementType);
                fieldType = `List<${simpleElementType}>`;
            } else if (prop.isNestedObject) {
                const simpleType = this.getNestedClassName(prop.dartType);
                fieldType = simpleType;
            }

            // 检查是否需要添加nullable标记（问号）
            const isOpenNullable = (this.config as any).isOpenNullable;
            if (isOpenNullable && prop.dartType !== 'dynamic') {
                // 如果开启了nullable选项且不是dynamic类型，添加问号
                if (!fieldType.endsWith('?')) {
                    fieldType = fieldType + '?';
                }
            }

            // 生成字段声明（原版风格）
            const setDefault = (this.config as any).setDefault;

            if (prop.isNestedObject && !prop.isArray) {
                // 对象字段的处理：如果是nullable则不使用late，否则使用late关键字
                if (isOpenNullable && prop.dartType !== 'dynamic') {
                    // 如果开启了nullable选项，嵌套对象字段不使用late关键字
                    parts.push(`  ${fieldType} ${fieldName};`);
                } else {
                    // 否则使用late关键字（原版风格）
                    parts.push(`  ${fieldType.includes('late ') ? '' : 'late '}${fieldType} ${fieldName};`);
                }
            } else if (prop.dartType === 'dynamic') {
                // dynamic字段不设置默认值（原版风格）
                parts.push(`  ${fieldType} ${fieldName};`);
            } else {
                // 其他字段的处理逻辑
                const correctedDefaultValue = prop.isArray ? '[]' : defaultValue;

                if (isOpenNullable && prop.dartType !== 'dynamic') {
                  // 如果开启了nullable选项
                  if (setDefault) {
                      // 如果同时选择了默认值，生成 int? abc = 0;
                      parts.push(`  ${fieldType} ${fieldName} = ${correctedDefaultValue};`);
                  } else {
                      // 如果没有选择默认值，生成 int? abc;
                      parts.push(`  ${fieldType} ${fieldName};`);
                  }
              } else if (setDefault) {
                  // 如果选择了默认值，设置默认值
                  parts.push(`  ${fieldType} ${fieldName} = ${correctedDefaultValue};`);
              } else {
                  // 如果既不选择默认值，也不选择nullable，使用late关键字
                  parts.push(`  late ${fieldType} ${fieldName};`);
              }
            }
        }

        parts.push('');
        parts.push(`  ${className}();`);
        parts.push('');

        // Add factory fromJson method that calls global function
        const functionName = `$${className}FromJson`;
        parts.push(`  factory ${className}.fromJson(Map<String, dynamic> json) => ${functionName}(json);`);
        parts.push('');

        // Add toJson method that calls global function
        const toJsonFunctionName = `$${className}ToJson`;
        parts.push(`  Map<String, dynamic> toJson() => ${toJsonFunctionName}(this);`);
        parts.push('');

        // Add toString method using jsonEncode
        parts.push('  @override');
        parts.push('  String toString() {');
        parts.push('    return jsonEncode(this);');
        parts.push('  }');

        parts.push('}');

        return parts.join('\n');
    }

    private getClassName(name: string): string {
        return this.config.classNamePrefix + name + this.config.classNameSuffix;
    }

    private getDefaultValue(prop: JsonProperty): string {
        // Check for custom default values from settings
        const customConfig = this.config as any;

        if (prop.isArray) {
            return customConfig.listDefaultValue || '[]';
        }

        switch (prop.dartType) {
            case 'int':
                return customConfig.intDefaultValue || '0';
            case 'double':
                return customConfig.intDefaultValue || '0.0';
            case 'String':
                return customConfig.stringDefaultValue || "''";
            case 'bool':
                return customConfig.boolDefaultValue || 'false';
            default:
                if (prop.isNestedObject) {
                    // 为嵌套对象添加Entity后缀
                    const entityClassName = prop.dartType + this.config.classNameSuffix;
                    return `${entityClassName}()`;
                }
                return 'null';
        }
    }

    generateFromJsonFunction(className: string, properties: JsonProperty[]): string {
        const functionName = `$${className}FromJson`;
        const parts = [];

        parts.push(`${className} ${functionName}(Map<String, dynamic> json) {`);
        const instanceName = className.charAt(0).toLowerCase() + className.slice(1);
        parts.push(`  final ${className} ${instanceName} = ${className}();`);

        for (const prop of properties) {
            // Skip getters and fields marked with deserialize: false
            if (prop.isGetter || prop.deserialize === false) {
                continue;
            }

            const jsonKey = prop.originalJsonKey; // 原始JSON key
            const fieldName = prop.name; // 实际的字段名（如 groupId, userId）
            const varName = this.toCamelCase(prop.originalJsonKey); // 临时变量名

            // 对于dynamic类型，不添加?标记（原版风格）
            const typeNullString = prop.dartType === 'dynamic' ? '' : '?';

            if (prop.isArray) {
                if (prop.isNestedObject && prop.arrayElementType) {
                    // 对于嵌套对象数组，使用简洁的类名（单文件模式）
                    const simpleElementType = this.getNestedClassName(prop.arrayElementType);
                    parts.push(`  final List<${simpleElementType}>${typeNullString} ${varName} = (json['${jsonKey}'] as List<dynamic>?)?.map(
                      (e) => jsonConvert.convert<${simpleElementType}>(e) as ${simpleElementType}).toList();`);
                } else {
                    // 对于基础类型数组
                    if (prop.arrayElementType === 'dynamic') {
                        // 对于List<dynamic>，使用原插件的特殊处理方式
                        parts.push(`  final List<${prop.arrayElementType}>${typeNullString} ${varName} = (json['${jsonKey}'] as List<dynamic>?)?.map(
                          (e) => e).toList();`);
                    } else {
                        parts.push(`  final List<${prop.arrayElementType}>${typeNullString} ${varName} = jsonConvert.convert<List<${prop.arrayElementType}>>(json['${jsonKey}']);`);
                    }
                }
            } else if (prop.isNestedObject && prop.nestedClass) {
                const simpleType = this.getNestedClassName(prop.dartType);
                parts.push(`  final ${simpleType}${typeNullString} ${varName} = jsonConvert.convert<${simpleType}>(json['${jsonKey}']);`);
            } else if (prop.isEnum) {
                // Handle enum types with enumConvert parameter
                parts.push(`  final ${prop.dartType}${typeNullString} ${varName} = jsonConvert.convert<${prop.dartType}>(
      json['${jsonKey}'], enumConvert: (v) => ${prop.dartType}.values.byName(v));`);
            } else {
                // 对于dynamic类型，直接从JSON获取值，不使用jsonConvert.convert
                if (prop.dartType === 'dynamic') {
                    parts.push(`  final ${prop.dartType} ${varName} = json['${jsonKey}'];`);
                } else {
                    parts.push(`  final ${prop.dartType}${typeNullString} ${varName} = jsonConvert.convert<${prop.dartType}>(json['${jsonKey}']);`);
                }
            }

            // 所有类型都需要null检查（包括dynamic类型，原版风格）
            const isOpenNullable = (this.config as any).isOpenNullable;
            if (isOpenNullable) {
                // 当开启nullable选项时，仍然需要null检查，但字段本身是nullable的
                parts.push(`  if (${varName} != null) {`);
                parts.push(`    ${instanceName}.${fieldName} = ${varName};`);
                parts.push(`  }`);
            } else {
                // 原来的逻辑：所有类型都需要null检查（包括dynamic）
                parts.push(`  if (${varName} != null) {`);
                parts.push(`    ${instanceName}.${fieldName} = ${varName};`);
                parts.push(`  }`);
            }
        }

        parts.push(`  return ${instanceName};`);
        parts.push('}');

        return parts.join('\n');
    }

    generateToJsonFunction(className: string, properties: JsonProperty[]): string {
        const functionName = `$${className}ToJson`;
        const parts = [];

        parts.push(`Map<String, dynamic> ${functionName}(${className} entity) {`);
        parts.push('  final Map<String, dynamic> data = <String, dynamic>{};');

        for (const prop of properties) {
            // Skip getters and fields marked with serialize: false
            // Note: deserialize: false fields SHOULD appear in toJson
            if (prop.isGetter || prop.serialize === false) {
                continue;
            }

            const jsonKey = prop.originalJsonKey; // 原始JSON key
            const fieldName = prop.name; // 实际的字段名（如 groupId, userId）

            if (prop.isArray && prop.isNestedObject) {
                // 对于数组字段，根据toJson可空性决定使用 .map() 还是 ?.map()
                const isOpenNullable = (this.config as any).isOpenNullable;
                const isNullableForToJson = (prop as any).isNullableForToJson ?? (isOpenNullable ? true : prop.isNullable);
                if (isNullableForToJson) {
                    parts.push(`  data['${jsonKey}'] = entity.${fieldName}?.map((v) => v.toJson()).toList();`);
                } else {
                    parts.push(`  data['${jsonKey}'] = entity.${fieldName}.map((v) => v.toJson()).toList();`);
                }
            } else if (prop.isArray && prop.isEnum) {
                // Handle enum arrays - use .name for each element
                const isOpenNullable = (this.config as any).isOpenNullable;
                const isNullableForToJson = (prop as any).isNullableForToJson ?? (isOpenNullable ? true : prop.isNullable);
                if (isNullableForToJson) {
                    parts.push(`  data['${jsonKey}'] = entity.${fieldName}?.map((v) => v.name).toList();`);
                } else {
                    parts.push(`  data['${jsonKey}'] = entity.${fieldName}.map((v) => v.name).toList();`);
                }
            } else if (prop.isNestedObject) {
                // 对于嵌套对象，根据toJson可空性决定使用 .toJson() 还是 ?.toJson()
                const isOpenNullable = (this.config as any).isOpenNullable;
                const isNullableForToJson = (prop as any).isNullableForToJson ?? (isOpenNullable ? true : prop.isNullable);
                const toJsonOperator = isNullableForToJson ? '?.toJson()' : '.toJson()';
                parts.push(`  data['${jsonKey}'] = entity.${fieldName}${toJsonOperator};`);
            } else if (prop.isEnum) {
                // Handle enum types - use .name for serialization
                const isOpenNullable = (this.config as any).isOpenNullable;
                const isNullableForToJson = (prop as any).isNullableForToJson ?? (isOpenNullable ? true : prop.isNullable);
                const nameOperator = isNullableForToJson ? '?.name' : '.name';
                parts.push(`  data['${jsonKey}'] = entity.${fieldName}${nameOperator};`);
            } else {
                // For basic types (String, int, double, num, bool, dynamic), assign directly
                parts.push(`  data['${jsonKey}'] = entity.${fieldName};`);
            }
        }

        parts.push('  return data;');
        parts.push('}');

        return parts.join('\n');
    }

    generateCopyWithExtension(className: string, properties: JsonProperty[]): string {
        const parts = [];

        parts.push(`extension ${className}Extension on ${className} {`);

        // Filter out getters and fields marked with copyWith: false
        const copyableProps = properties.filter(prop => !prop.isGetter && prop.copyWith !== false);

        // If no copyable properties, generate empty extension (like original plugin)
        if (copyableProps.length === 0) {
            parts.push('}');
            return parts.join('\n');
        }

        // Generate copyWith method - all parameters are nullable in copyWith
        const params = copyableProps.map(prop => {
            const fieldName = prop.name; // 实际的字段名

            // 确保嵌套类型使用简洁的类名（单文件模式）
            let paramType = prop.dartType;
            if (prop.isArray && prop.arrayElementType && prop.isNestedObject) {
                const simpleElementType = this.getNestedClassName(prop.arrayElementType);
                paramType = `List<${simpleElementType}>`;
            } else if (prop.isNestedObject) {
                paramType = this.getNestedClassName(prop.dartType);
            }

            // 对于dynamic类型，不添加?标记（原版风格）
            const typeNullString = prop.dartType === 'dynamic' ? '' : '?';
            return `    ${paramType}${typeNullString} ${fieldName}`;
        }).join(',\n');

        parts.push(`  ${className} copyWith({`);
        parts.push(params + ',');
        parts.push('  }) {');
        parts.push(`    return ${className}()`);

        for (const prop of copyableProps) {
            const fieldName = prop.name; // 实际的字段名
            parts.push(`      ..${fieldName} = ${fieldName} ?? this.${fieldName}`);
        }

        // 最后一个属性后面直接加分号，不单独一行
        if (copyableProps.length > 0) {
            const lastIndex = parts.length - 1;
            parts[lastIndex] = parts[lastIndex] + ';';
        }

        parts.push('  }');
        parts.push('}');

        return parts.join('\n');
    }

    private toCamelCase(str: string): string {
        // 将snake_case转换为camelCase
        return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }

    private generateJsonConvertImports(allClasses: JsonClass[]): string {
        const imports = [];
        const importedFiles = new Set<string>();

        for (const cls of allClasses) {
            // 导入所有主文件（包括历史类），嵌套类都在主文件中（原版风格）
            const clsWithPath = cls as any;
            const isHistoricalClass = !!clsWithPath.filePath;
            const isNewMainClass = !isHistoricalClass && cls === allClasses.find(c => !(c as any).filePath);

            if (isHistoricalClass || isNewMainClass) {
                let importPath: string;

                if (isHistoricalClass) {
                    // 使用历史类的实际文件路径
                    importPath = `import 'package:${this.packageName}/${clsWithPath.filePath}.dart';`;
                } else {
                    // 使用默认的models路径（新生成的文件）
                    const className = this.getClassName(cls.name);
                    const snakeClassName = this.toSnakeCase(className);
                    importPath = `import 'package:${this.packageName}/models/${snakeClassName}.dart';`;
                }

                if (!importedFiles.has(importPath)) {
                    imports.push(importPath);
                    importedFiles.add(importPath);
                }
            }
        }
        return imports.join('\n');
    }

    private generateGetListChildType(allClasses: JsonClass[]): string {
        const parts = [];
        parts.push('  static M? _getListChildType<M>(List<Map<String, dynamic>> data) {');

        // 为所有主类生成转换（包括历史类），不包含嵌套类（原版风格）
        const processedMainClasses = new Set<string>();
        for (const cls of allClasses) {
            // 判断是否为主类：有filePath属性（历史类）或者是新生成的第一个类（主类）
            const clsWithPath = cls as any;
            const isHistoricalClass = !!clsWithPath.filePath;
            const isNewMainClass = !isHistoricalClass && cls === allClasses.find(c => !(c as any).filePath);

            if (isHistoricalClass || isNewMainClass) {
                // 对于历史类，直接使用类名；对于新类，添加Entity后缀
                const className = isHistoricalClass ? cls.name : this.getClassName(cls.name);

                if (!processedMainClasses.has(className)) {
                    processedMainClasses.add(className);
                    parts.push(`    if (<${className}>[] is M) {`);
                    parts.push(`      return data.map<${className}>((Map<String, dynamic> e) =>`);
                    parts.push(`          ${className}.fromJson(e)).toList() as M;`);
                    parts.push(`    }`);
                }
            }
        }

        parts.push('');
        parts.push('    debugPrint("$M not found");');
        parts.push('');
        parts.push('    return null;');
        parts.push('  }');

        return parts.join('\n');
    }

    private generateConvertFuncMap(allClasses: JsonClass[]): string {
        const parts = [];
        parts.push('class JsonConvertClassCollection {');
        parts.push('  Map<String, JsonConvertFunction> convertFuncMap = {');

        const entries = [];
        // 为所有主类生成映射（包括历史类），不包含嵌套类（原版风格）
        const processedMainClasses = new Set<string>();
        for (const cls of allClasses) {
            // 判断是否为主类：有filePath属性（历史类）或者是新生成的第一个类（主类）
            const clsWithPath = cls as any;
            const isHistoricalClass = !!clsWithPath.filePath;
            const isNewMainClass = !isHistoricalClass && cls === allClasses.find(c => !(c as any).filePath);

            if (isHistoricalClass || isNewMainClass) {
                // 对于历史类，直接使用类名；对于新类，添加Entity后缀
                const className = isHistoricalClass ? cls.name : this.getClassName(cls.name);

                if (!processedMainClasses.has(className)) {
                    processedMainClasses.add(className);
                    entries.push(`    (${className}).toString(): ${className}.fromJson`);
                }
            }
        }

        parts.push(entries.join(',\n') + ',');
        parts.push('  };');
        parts.push('');
        parts.push('  bool containsKey(String type) {');
        parts.push('    return convertFuncMap.containsKey(type);');
        parts.push('  }');
        parts.push('');
        parts.push('  JsonConvertFunction? operator [](String key) {');
        parts.push('    return convertFuncMap[key];');
        parts.push('  }');
        parts.push('}');

        return parts.join('\n');
    }

    /**
     * Generate base JSON convert file from entity files (original plugin style)
     */
    generateBaseJsonConvertFromEntityFiles(allEntityFiles: any[], packageName: string): string {
        const imports = [];
        const classEntries = [];

        // Add imports for all entity files
        for (const entityFile of allEntityFiles) {
            imports.push(entityFile.importStatement);

            // Add entries for all classes in this file
            for (const dartClass of entityFile.classes) {
                classEntries.push(`    (${dartClass.className}).toString(): ${dartClass.className}.fromJson,`);
            }
        }

        // Generate _getListChildType entries
        const listChildTypeEntries = [];
        for (const entityFile of allEntityFiles) {
            for (const dartClass of entityFile.classes) {
                listChildTypeEntries.push(`    if(<${dartClass.className}>[] is M){`);
                listChildTypeEntries.push(`      return data.map<${dartClass.className}>((Map<String, dynamic> e) => ${dartClass.className}.fromJson(e)).toList() as M;`);
                listChildTypeEntries.push(`    }`);
            }
        }

        return `// ignore_for_file: non_constant_identifier_names
// ignore_for_file: camel_case_types
// ignore_for_file: prefer_single_quotes

// This file is automatically generated. DO NOT EDIT, all your changes would be lost.
import 'package:flutter/material.dart' show debugPrint;
${imports.join('\n')}

JsonConvert jsonConvert = JsonConvert();
typedef JsonConvertFunction<T> = T Function(Map<String, dynamic> json);
typedef EnumConvertFunction<T> = T Function(String value);
typedef ConvertExceptionHandler = void Function(Object error, StackTrace stackTrace);

extension MapSafeExt<K, V> on Map<K, V> {
  T? getOrNull<T>(K? key) {
    if (!containsKey(key) || key == null) {
      return null;
    } else {
      return this[key] as T?;
    }
  }
}

class JsonConvert {
  static ConvertExceptionHandler? onError;
  JsonConvertClassCollection convertFuncMap = JsonConvertClassCollection();

  /// When you are in the development, to generate a new model class, hot-reload doesn't find new generation model class, you can build on MaterialApp method called jsonConvert. ReassembleConvertFuncMap (); This method only works in a development environment
  /// https://flutter.cn/docs/development/tools/hot-reload
  /// class MyApp extends StatelessWidget {
  ///    const MyApp({Key? key})
  ///        : super(key: key);
  ///
  ///    @override
  ///    Widget build(BuildContext context) {
  ///      jsonConvert.reassembleConvertFuncMap();
  ///      return MaterialApp();
  ///    }
  /// }
  void reassembleConvertFuncMap() {
    bool isReleaseMode = const bool.fromEnvironment('dart.vm.product');
    if (!isReleaseMode) {
      convertFuncMap = JsonConvertClassCollection();
    }
  }

  T? convert<T>(dynamic value, {EnumConvertFunction? enumConvert}) {
    if (value == null) {
      return null;
    }
    if (value is T) {
      return value;
    }
    try {
      return _asT<T>(value, enumConvert: enumConvert);
    } catch (e, stackTrace) {
      debugPrint('asT<\$T> \$e \$stackTrace');
      if (onError != null) {
         onError!(e, stackTrace);
      }
      return null;
    }
  }

  List<T?>? convertList<T>(List<dynamic>? value, {EnumConvertFunction? enumConvert}) {
    if (value == null) {
      return null;
    }
    try {
      return value.map((dynamic e) => _asT<T>(e,enumConvert: enumConvert)).toList();
    } catch (e, stackTrace) {
      debugPrint('asT<\$T> \$e \$stackTrace');
      if (onError != null) {
         onError!(e, stackTrace);
      }
      return <T>[];
    }
  }

  List<T>? convertListNotNull<T>(dynamic value, {EnumConvertFunction? enumConvert}) {
    if (value == null) {
      return null;
    }
    try {
      return (value as List<dynamic>).map((dynamic e) => _asT<T>(e,enumConvert: enumConvert)!).toList();
    } catch (e, stackTrace) {
      debugPrint('asT<\$T> \$e \$stackTrace');
      if (onError != null) {
         onError!(e, stackTrace);
      }
      return <T>[];
    }
  }

  T? _asT<T extends Object?>(dynamic value, {EnumConvertFunction? enumConvert}) {
    final String type = T.toString();
    final String valueS = value.toString();
    if (enumConvert != null) {
      return enumConvert(valueS) as T;
    } else if (type == "String") {
      return valueS as T;
    } else if (type == "int") {
      final int? intValue = int.tryParse(valueS);
      if (intValue == null) {
        return double.tryParse(valueS)?.toInt() as T?;
      } else {
        return intValue as T;
      }
    } else if (type == "double") {
      return double.parse(valueS) as T;
    } else if (type == "DateTime") {
      return DateTime.parse(valueS) as T;
    } else if (type == "bool") {
      if (valueS == '0' || valueS == '1') {
        return (valueS == '1') as T;
      }
      return (valueS == 'true') as T;
    } else if (type == "Map" || type.startsWith("Map<")) {
      return value as T;
    } else {
      if (convertFuncMap.containsKey(type)) {
        if (value == null) {
          return null;
        }
        var covertFunc = convertFuncMap[type]!;
        if(covertFunc is Map<String, dynamic>) {
          return covertFunc(value as Map<String, dynamic>) as T;
        }else{
          return covertFunc(Map<String, dynamic>.from(value)) as T;
        }
      } else {
        throw UnimplementedError('\$type unimplemented,you can try running the app again');
      }
    }
  }

  //list is returned by type
  static M? _getListChildType<M>(List<Map<String, dynamic>> data) {
${listChildTypeEntries.join('\n')}
    debugPrint("\$M not found");
    return null;
  }

  static M? fromJsonAsT<M>(dynamic json) {
    if (json is M) {
      return json;
    }
    if (json is List) {
      return _getListChildType<M>(json.map((dynamic e) => e as Map<String, dynamic>).toList());
    } else {
      return jsonConvert.convert<M>(json);
    }
  }
}

class JsonConvertClassCollection {
  Map<String, JsonConvertFunction> convertFuncMap = {
${classEntries.join('\n')}
  };

  bool containsKey(String type) {
    return convertFuncMap.containsKey(type);
  }

  JsonConvertFunction? operator [](String key) {
    return convertFuncMap[key];
  }
}`;
    }

    private toSnakeCase(str: string): string {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
    }
}
