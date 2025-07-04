const { DartClassParser } = require('./out/parsers/DartClassParser');
const { DartCodeGenerator } = require('./out/generators/DartCodeGenerator');

// 测试继承语法的支持
const testDartContent = `@JsonSerializable()
class ItemEntity extends Object {
    String? id;
    String? name;
    int? count;

    ItemEntity();
}

@JsonSerializable()
class UserEntity extends BaseEntity {
    String? username;
    String? email;

    UserEntity();
}

@JsonSerializable()
class ProductEntity {
    String? title;
    double? price;

    ProductEntity();
}`;

function testInheritanceSupport() {
    console.log('Testing inheritance syntax support...');
    
    const parser = new DartClassParser();
    const dartClasses = parser.parseDartFile(testDartContent);
    
    console.log(`Found ${dartClasses.length} classes:`);
    dartClasses.forEach(cls => {
        console.log(`  - ${cls.className} (${cls.properties.length} properties)`);
        cls.properties.forEach(prop => {
            console.log(`    * ${prop.name}: ${prop.type}${prop.isNullable ? '?' : ''}`);
        });
    });
    
    // 验证是否正确解析了继承的类
    const expectedClasses = ['ItemEntity', 'UserEntity', 'ProductEntity'];
    const foundClasses = dartClasses.map(cls => cls.className);
    
    console.log('\n=== Class Detection Validation ===');
    expectedClasses.forEach(expectedClass => {
        const found = foundClasses.includes(expectedClass);
        console.log(`${expectedClass}: ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
    });
    
    // 测试代码生成
    if (dartClasses.length > 0) {
        const config = {
            classNamePrefix: '',
            classNameSuffix: '',
            nullSafety: true,
            forceNonNullable: false,
            generateCopyWith: true,
            generateToString: true,
            generateFromJson: true,
            generateToJson: true,
            useJsonAnnotation: true,
            entityPath: 'lib/models',
            generatedPath: 'lib/generated/json'
        };
        
        const generator = new DartCodeGenerator(config, 'test');
        
        // 测试ItemEntity（继承自Object）
        const itemEntity = dartClasses.find(c => c.className === 'ItemEntity');
        if (itemEntity) {
            const jsonClass = parser.convertToJsonClass(itemEntity);
            console.log('\n=== ItemEntity Code Generation ===');
            
            const fromJsonFunction = generator.generateFromJsonFunction('ItemEntity', jsonClass.properties);
            console.log('Generated fromJson function:');
            console.log(fromJsonFunction);
            
            const toJsonFunction = generator.generateToJsonFunction('ItemEntity', jsonClass.properties);
            console.log('\nGenerated toJson function:');
            console.log(toJsonFunction);
            
            // 验证生成的代码是否正确
            const hasCorrectFromJson = fromJsonFunction.includes('ItemEntity itemEntity = ItemEntity()');
            const hasCorrectToJson = toJsonFunction.includes("data['id'] = entity.id");
            
            console.log('\n=== Code Generation Validation ===');
            console.log('Correct fromJson structure:', hasCorrectFromJson ? '✅ YES' : '❌ NO');
            console.log('Correct toJson structure:', hasCorrectToJson ? '✅ YES' : '❌ NO');
        }
    }
    
    // 测试extractClassNames方法
    console.log('\n=== extractClassNames Test ===');
    const classNames = parser.extractClassNames(testDartContent);
    console.log('Extracted class names:', classNames);
    
    const hasAllClasses = expectedClasses.every(name => classNames.includes(name));
    console.log('All classes extracted:', hasAllClasses ? '✅ YES' : '❌ NO');
    
    // 测试hasJsonSerializableClasses方法
    console.log('\n=== hasJsonSerializableClasses Test ===');
    const hasJsonClasses = parser.hasJsonSerializableClasses(testDartContent);
    console.log('Has JsonSerializable classes:', hasJsonClasses ? '✅ YES' : '❌ NO');
}

// 运行测试
testInheritanceSupport();
console.log('\nTest completed.');
