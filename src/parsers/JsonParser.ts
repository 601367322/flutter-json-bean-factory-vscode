export interface JsonProperty {
    name: string;
    type: string;
    dartType: string;
    isNullable: boolean;
    isArray: boolean;
    isNestedObject: boolean;
    nestedClass?: JsonClass;
    arrayElementType?: string;
    originalValue?: any;
}

export interface JsonClass {
    name: string;
    properties: JsonProperty[];
    nestedClasses: JsonClass[];
}

export class JsonParser {
    private classCounter = 0;
    private processedClasses = new Map<string, JsonClass>();

    /**
     * Parse JSON string and generate class structure
     */
    parseJson(jsonString: string, className: string): JsonClass {
        this.classCounter = 0;
        this.processedClasses.clear();

        try {
            const jsonObject = JSON.parse(jsonString);
            return this.parseObject(jsonObject, className);
        } catch (error) {
            throw new Error(`Invalid JSON: ${error}`);
        }
    }

    /**
     * Validate JSON string
     */
    validateJson(jsonString: string): { isValid: boolean; error?: string } {
        try {
            JSON.parse(jsonString);
            return { isValid: true };
        } catch (error) {
            return { 
                isValid: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }

    private parseObject(obj: any, className: string): JsonClass {
        const properties: JsonProperty[] = [];
        const nestedClasses: JsonClass[] = [];

        for (const [key, value] of Object.entries(obj)) {
            const property = this.parseProperty(key, value, className);
            properties.push(property);

            if (property.nestedClass) {
                nestedClasses.push(property.nestedClass);
            }
        }

        return {
            name: this.toPascalCase(className),
            properties,
            nestedClasses
        };
    }

    private parseProperty(key: string, value: any, parentClassName: string): JsonProperty {
        const propertyName = this.toCamelCase(key);
        const type = this.getValueType(value);
        
        let dartType = this.mapToDartType(type, value);
        let isNullable = value === null;
        let isArray = Array.isArray(value);
        let isNestedObject = false;
        let nestedClass: JsonClass | undefined;
        let arrayElementType: string | undefined;

        if (isArray && value.length > 0) {
            const firstElement = value[0];
            const elementType = this.getValueType(firstElement);
            
            if (elementType === 'object') {
                const nestedClassName = `${parentClassName}${this.toPascalCase(key)}Item`;
                nestedClass = this.parseObject(firstElement, nestedClassName);
                dartType = `List<${nestedClass.name}>`;
                arrayElementType = nestedClass.name;
                isNestedObject = true;
            } else {
                arrayElementType = this.mapToDartType(elementType, firstElement);
                dartType = `List<${arrayElementType}>`;
            }
        } else if (type === 'object' && value !== null) {
            const nestedClassName = `${parentClassName}${this.toPascalCase(key)}`;
            nestedClass = this.parseObject(value, nestedClassName);
            dartType = nestedClass.name;
            isNestedObject = true;
        }

        return {
            name: propertyName,
            type,
            dartType,
            isNullable,
            isArray,
            isNestedObject,
            nestedClass,
            arrayElementType,
            originalValue: value
        };
    }

    private getValueType(value: any): string {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
    }

    private mapToDartType(type: string, value?: any): string {
        switch (type) {
            case 'string':
                return 'String';
            case 'number':
                return Number.isInteger(value) ? 'int' : 'double';
            case 'boolean':
                return 'bool';
            case 'null':
                return 'dynamic';
            case 'object':
                return 'Map<String, dynamic>';
            case 'array':
                return 'List<dynamic>';
            default:
                return 'dynamic';
        }
    }

    private toCamelCase(str: string): string {
        return str.replace(/[-_](.)/g, (_, char) => char.toUpperCase())
                  .replace(/^[A-Z]/, char => char.toLowerCase());
    }

    private toPascalCase(str: string): string {
        return str.replace(/[-_](.)/g, (_, char) => char.toUpperCase())
                  .replace(/^[a-z]/, char => char.toUpperCase());
    }

    /**
     * Get all classes including nested ones in a flat array
     */
    getAllClasses(rootClass: JsonClass): JsonClass[] {
        const classes: JsonClass[] = [rootClass];
        
        const collectNestedClasses = (cls: JsonClass) => {
            for (const nestedClass of cls.nestedClasses) {
                classes.push(nestedClass);
                collectNestedClasses(nestedClass);
            }
        };

        collectNestedClasses(rootClass);
        return classes;
    }
}
