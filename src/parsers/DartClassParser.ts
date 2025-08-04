import { JsonClass, JsonProperty } from './JsonParser';

export interface DartProperty {
    name: string;
    type: string;
    isNullable: boolean;
    isLate: boolean;
    originalJsonKey?: string;
    isGetter?: boolean;
    serialize?: boolean;
    deserialize?: boolean;
    isEnum?: boolean;
    copyWith?: boolean;
}

export interface DartClassInfo {
    className: string;
    properties: DartProperty[];
    hasJsonSerializable: boolean;
    imports?: string[]; // Add imports information
}

export class DartClassParser {
    /**
     * Parse Dart file content and extract class information
     */
    parseDartFile(content: string): DartClassInfo[] {
        const classes: DartClassInfo[] = [];
        const imports = this.extractImports(content);
        
        // Find all classes with @JsonSerializable annotation
        // Support inheritance syntax: class ClassName extends SuperClass {
        const classPattern = /@JsonSerializable\(\)\s*class\s+(\w+)(?:\s+extends\s+\w+)?\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/gs;
        let match;
        
        while ((match = classPattern.exec(content)) !== null) {
            const className = match[1];
            const classBody = match[2];
            
            const properties = this.extractProperties(classBody);
            
            classes.push({
                className,
                properties,
                hasJsonSerializable: true,
                imports // Add imports to each class
            });
        }
        
        return classes;
    }
    
    /**
     * Extract import statements from Dart file content
     */
    private extractImports(content: string): string[] {
        const imports: string[] = [];
        const importPattern = /import\s+['"]([^'"]+)['"]\s*(?:show\s+[^;]+|hide\s+[^;]+|as\s+\w+)?;/g;
        let match;
        
        while ((match = importPattern.exec(content)) !== null) {
            const importPath = match[1];
            // Skip Dart SDK imports and generated files
            if (!importPath.startsWith('dart:') && !importPath.includes('.g.dart')) {
                imports.push(match[0]); // Store the full import statement
            }
        }
        
        return imports;
    }
    
    /**
     * Extract properties from class body
     */
    private extractProperties(classBody: string): DartProperty[] {
        const properties: DartProperty[] = [];

        // Split class body into lines and process each line
        const lines = classBody.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Skip empty lines, comments, constructors, methods (but not getters)
            if (!line || line.startsWith('//') || line.includes('{') || line.includes('}')) {
                continue;
            }
            
            // Skip regular methods (but not getters)
            if (line.includes('(') && !line.includes(' get ')) {
                continue;
            }

            // Check for @JSONField annotation on current or previous line
            let jsonFieldInfo: { name?: string; serialize?: boolean; deserialize?: boolean; isEnum?: boolean; copyWith?: boolean } = {};
            const jsonFieldMatch = line.match(/@JSONField\(([^)]*)\)/);
            if (jsonFieldMatch) {
                const params = jsonFieldMatch[1];
                
                // Extract name parameter
                const nameMatch = params.match(/name:\s*['"']([^'"]*)['"']/);
                if (nameMatch) {
                    jsonFieldInfo.name = nameMatch[1];
                }
                
                // Extract serialize parameter
                const serializeMatch = params.match(/\bserialize:\s*(true|false)/);
                if (serializeMatch) {
                    jsonFieldInfo.serialize = serializeMatch[1] === 'true';
                }
                
                // Extract deserialize parameter
                const deserializeMatch = params.match(/\bdeserialize:\s*(true|false)/);
                if (deserializeMatch) {
                    jsonFieldInfo.deserialize = deserializeMatch[1] === 'true';
                }
                
                // Extract isEnum parameter
                const isEnumMatch = params.match(/\bisEnum:\s*(true|false)/);
                if (isEnumMatch) {
                    jsonFieldInfo.isEnum = isEnumMatch[1] === 'true';
                }
                
                // Extract copyWith parameter
                const copyWithMatch = params.match(/\bcopyWith:\s*(true|false)/);
                if (copyWithMatch) {
                    jsonFieldInfo.copyWith = copyWithMatch[1] === 'true';
                }
                
                // If annotation is on same line, extract the property from the rest
                const restOfLine = line.replace(/@JSONField\([^)]*\)\s*/, '');
                if (restOfLine.trim()) {
                    const property = this.parsePropertyLine(restOfLine, jsonFieldInfo);
                    if (property) {
                        properties.push(property);
                    }
                }
                continue;
            }

            // Check if previous line had @JSONField annotation
            if (i > 0) {
                const prevLine = lines[i - 1].trim();
                const prevJsonFieldMatch = prevLine.match(/@JSONField\(([^)]*)\)/);
                if (prevJsonFieldMatch) {
                    const params = prevJsonFieldMatch[1];
                    
                    // Extract name parameter
                    const nameMatch = params.match(/name:\s*['"']([^'"]*)['"']/);
                    if (nameMatch) {
                        jsonFieldInfo.name = nameMatch[1];
                    }
                    
                    // Extract serialize parameter
                    const serializeMatch = params.match(/\bserialize:\s*(true|false)/);
                    if (serializeMatch) {
                        jsonFieldInfo.serialize = serializeMatch[1] === 'true';
                    }
                    
                    // Extract deserialize parameter
                    const deserializeMatch = params.match(/\bdeserialize:\s*(true|false)/);
                    if (deserializeMatch) {
                        jsonFieldInfo.deserialize = deserializeMatch[1] === 'true';
                    }
                    
                    // Extract isEnum parameter
                    const isEnumMatch = params.match(/\bisEnum:\s*(true|false)/);
                    if (isEnumMatch) {
                        jsonFieldInfo.isEnum = isEnumMatch[1] === 'true';
                    }
                    
                    // Extract copyWith parameter
                    const copyWithMatch = params.match(/\bcopyWith:\s*(true|false)/);
                    if (copyWithMatch) {
                        jsonFieldInfo.copyWith = copyWithMatch[1] === 'true';
                    }
                }
            }

            // Parse property line
            const property = this.parsePropertyLine(line, jsonFieldInfo);
            if (property) {
                properties.push(property);
            }
        }

        return properties;
    }

    /**
     * Parse a single property line
     */
    private parsePropertyLine(line: string, jsonFieldInfo?: { name?: string; serialize?: boolean; deserialize?: boolean; isEnum?: boolean; copyWith?: boolean }): DartProperty | null {
        // Remove late keyword and capture if it exists
        const lateMatch = line.match(/^late\s+(.+)$/);
        const cleanLine = lateMatch ? lateMatch[1] : line;
        const isLate = !!lateMatch;

        // Check if this is a getter
        const getterMatch = cleanLine.match(/^([\w<>,\s]+\??\s*)\s+get\s+(\w+)\s*=>/);
        if (getterMatch) {
            const type = getterMatch[1].trim();
            const name = getterMatch[2];
            
            return {
                name,
                type: type.replace('?', '').trim(),
                isNullable: type.endsWith('?'),
                isLate: false,
                isGetter: true,
                originalJsonKey: jsonFieldInfo?.name || name,
                serialize: jsonFieldInfo?.serialize,
                deserialize: jsonFieldInfo?.deserialize,
                isEnum: jsonFieldInfo?.isEnum,
                copyWith: jsonFieldInfo?.copyWith
            };
        }
        
        // Match property pattern: Type name [= defaultValue];
        const propertyMatch = cleanLine.match(/^([\w<>,\s]+\??)\s+(\w+)(?:\s*=\s*[^;]+)?;?$/);

        if (!propertyMatch) {
            return null;
        }

        const type = propertyMatch[1].trim();
        const name = propertyMatch[2];

        // Skip if this looks like a method or constructor
        if (name.includes('(') || type.includes('(')) {
            return null;
        }

        // Determine if nullable
        const isNullable = type.endsWith('?');
        const cleanType = type.replace('?', '').trim();

        return {
            name,
            type: cleanType,
            isNullable,
            isLate,
            isGetter: false,
            originalJsonKey: jsonFieldInfo?.name || name,
            serialize: jsonFieldInfo?.serialize,
            deserialize: jsonFieldInfo?.deserialize,
            isEnum: jsonFieldInfo?.isEnum,
            copyWith: jsonFieldInfo?.copyWith
        };
    }
    
    /**
     * Convert DartClassInfo to JsonClass for code generation
     */
    convertToJsonClass(dartClass: DartClassInfo): JsonClass {
        const properties: JsonProperty[] = dartClass.properties.map(prop => {
            const mappedType = this.mapDartTypeToJsonType(prop.type);
            const isArray = prop.type.startsWith('List');
            const arrayElementType = isArray ? this.extractArrayElementType(prop.type) : undefined;

            // Determine if this is a nested object
            let isNestedObject = false;
            if (prop.isEnum) {
                // Enum types are not nested objects, even though they're not primitive
                isNestedObject = false;
            } else if (isArray) {
                // For arrays, check if the element type is a nested object
                // Only exclude if explicitly marked as enum, not based on heuristics
                isNestedObject = arrayElementType ? !this.isPrimitiveType(arrayElementType) : false;
            } else {
                // For non-arrays, check if the type itself is a nested object
                isNestedObject = !this.isPrimitiveType(prop.type);
            }

            // For toJson generation, fields should be treated as nullable if they are explicitly nullable
            // Even late fields can be nullable (late Type?) and should use safe call operator in toJson
            const isNullableForToJson = prop.isNullable;

            return {
                name: prop.name,
                originalJsonKey: prop.originalJsonKey || prop.name,
                type: mappedType,
                dartType: prop.type,
                isNullable: prop.isNullable, // Keep original nullability for fromJson
                isArray: isArray,
                isNestedObject: isNestedObject,
                arrayElementType: arrayElementType,
                isLate: prop.isLate, // Add late information
                isNullableForToJson: isNullableForToJson, // Add separate nullability for toJson
                isGetter: prop.isGetter, // Add getter information
                serialize: prop.serialize, // Add serialize information
                deserialize: prop.deserialize, // Add deserialize information
                isEnum: prop.isEnum, // Add enum information
                copyWith: prop.copyWith // Add copyWith information
            };
        });

        return {
            name: dartClass.className,
            properties,
            nestedClasses: [] // For now, we'll handle nested classes separately
        };
    }
    
    /**
     * Map Dart types to JSON types for code generation
     */
    private mapDartTypeToJsonType(dartType: string): string {
        const typeMap: { [key: string]: string } = {
            'String': 'String',
            'int': 'int',
            'double': 'double',
            'bool': 'bool',
            'DateTime': 'String', // Usually serialized as string
            'List': 'List',
            'Map': 'Map',
            'dynamic': 'dynamic'
        };
        
        // Handle generic types like List<String>, Map<String, dynamic>
        if (dartType.includes('<')) {
            const baseType = dartType.split('<')[0];
            return typeMap[baseType] || dartType;
        }
        
        return typeMap[dartType] || dartType;
    }
    
    /**
     * Extract all class names from a Dart file
     */
    extractClassNames(content: string): string[] {
        const classNames: string[] = [];
        const classPattern = /@JsonSerializable\(\)\s*class\s+(\w+)(?:\s+extends\s+\w+)?/g;
        let match;
        
        while ((match = classPattern.exec(content)) !== null) {
            classNames.push(match[1]);
        }
        
        return classNames;
    }
    
    /**
     * Check if a Dart file contains @JsonSerializable classes
     */
    hasJsonSerializableClasses(content: string): boolean {
        return /@JsonSerializable\(\)/.test(content);
    }

    /**
     * Check if a type is a primitive type
     */
    private isPrimitiveType(type: string): boolean {
        const primitiveTypes = ['String', 'int', 'double', 'bool', 'dynamic'];
        return primitiveTypes.includes(type);
    }

    /**
     * Check if a type is an enum type
     * This is a simple heuristic - enum types typically start with uppercase and are not primitive
     */
    private isEnumType(type: string): boolean {
        // Simple heuristic: if it's not a primitive type and starts with uppercase, it might be an enum
        // This is not perfect but works for most cases
        return !this.isPrimitiveType(type) && /^[A-Z]/.test(type) && !type.includes('<');
    }

    /**
     * Extract element type from List<T> or similar generic types
     */
    private extractArrayElementType(type: string): string {
        const match = type.match(/List<(.+)>/);
        return match ? match[1] : 'dynamic';
    }
}
