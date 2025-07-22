import { JsonClass, JsonProperty } from './JsonParser';

export interface DartProperty {
    name: string;
    type: string;
    isNullable: boolean;
    isLate: boolean;
    originalJsonKey?: string;
}

export interface DartClassInfo {
    className: string;
    properties: DartProperty[];
    hasJsonSerializable: boolean;
}

export class DartClassParser {
    /**
     * Parse Dart file content and extract class information
     */
    parseDartFile(content: string): DartClassInfo[] {
        const classes: DartClassInfo[] = [];
        
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
                hasJsonSerializable: true
            });
        }
        
        return classes;
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

            // Skip empty lines, comments, constructors, methods
            if (!line || line.startsWith('//') || line.includes('(') || line.includes('{') || line.includes('}')) {
                continue;
            }

            // Check for @JSONField annotation on current or previous line
            let jsonFieldName: string | undefined;
            const jsonFieldMatch = line.match(/@JSONField\([^)]*name:\s*['"](.*?)['"][^)]*\)/);
            if (jsonFieldMatch) {
                jsonFieldName = jsonFieldMatch[1];
                // If annotation is on same line, extract the property from the rest
                const restOfLine = line.replace(/@JSONField\([^)]*\)\s*/, '');
                if (restOfLine.trim()) {
                    const property = this.parsePropertyLine(restOfLine, jsonFieldName);
                    if (property) {
                        properties.push(property);
                    }
                }
                continue;
            }

            // Check if previous line had @JSONField annotation
            if (i > 0) {
                const prevLine = lines[i - 1].trim();
                const prevJsonFieldMatch = prevLine.match(/@JSONField\([^)]*name:\s*['"](.*?)['"][^)]*\)/);
                if (prevJsonFieldMatch) {
                    jsonFieldName = prevJsonFieldMatch[1];
                }
            }

            // Parse property line
            const property = this.parsePropertyLine(line, jsonFieldName);
            if (property) {
                properties.push(property);
            }
        }

        return properties;
    }

    /**
     * Parse a single property line
     */
    private parsePropertyLine(line: string, jsonFieldName?: string): DartProperty | null {
        // Remove late keyword and capture if it exists
        const lateMatch = line.match(/^late\s+(.+)$/);
        const cleanLine = lateMatch ? lateMatch[1] : line;
        const isLate = !!lateMatch;

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
            originalJsonKey: jsonFieldName || name
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
            if (isArray) {
                // For arrays, check if the element type is a nested object
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
                isNullableForToJson: isNullableForToJson // Add separate nullability for toJson
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
     * Extract element type from List<T> or similar generic types
     */
    private extractArrayElementType(type: string): string {
        const match = type.match(/List<(.+)>/);
        return match ? match[1] : 'dynamic';
    }
}
