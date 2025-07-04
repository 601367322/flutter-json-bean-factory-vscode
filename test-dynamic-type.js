const { DartClassParser } = require('./out/parsers/DartClassParser');
const { DartCodeGenerator } = require('./out/generators/DartCodeGenerator');

// 测试dynamic类型的处理
const testDartContent = `@JsonSerializable()
class AppConfigEntity {
    String? configKey;
    String? configName;
    dynamic configVal;
    String? id;
    String? remark;

    AppConfigEntity();
}`;

function testDynamicType() {
    console.log('Testing dynamic type handling...');
    
    const parser = new DartClassParser();
    const dartClasses = parser.parseDartFile(testDartContent);
    
    const appConfigEntity = dartClasses.find(c => c.className === 'AppConfigEntity');
    if (!appConfigEntity) {
        console.log('❌ AppConfigEntity not found');
        return;
    }
    
    console.log(`Found ${appConfigEntity.properties.length} properties:`);
    appConfigEntity.properties.forEach((prop, index) => {
        console.log(`${index + 1}. ${prop.name}: ${prop.type}${prop.isNullable ? '?' : ''}`);
    });
    
    // 转换为JsonClass
    const jsonClass = parser.convertToJsonClass(appConfigEntity);
    
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
    
    const generator = new DartCodeGenerator(config, 'qsb');
    
    // 生成fromJson函数
    console.log('\n=== Generated fromJson function ===');
    const fromJsonFunction = generator.generateFromJsonFunction('AppConfigEntity', jsonClass.properties);
    console.log(fromJsonFunction);
    
    // 验证dynamic类型处理
    console.log('\n=== Dynamic Type Validation ===');
    const lines = fromJsonFunction.split('\n');
    
    // 查找configVal的处理行
    const configValLine = lines.find(line => line.includes('configVal') && line.includes('final'));
    console.log('configVal declaration line:', configValLine?.trim() || 'NOT FOUND');
    
    // 检查是否正确处理dynamic类型
    if (configValLine?.includes("json['configVal']") && !configValLine?.includes('jsonConvert.convert')) {
        console.log('✅ CORRECT: dynamic type uses direct JSON access');
    } else if (configValLine?.includes('jsonConvert.convert<dynamic>')) {
        console.log('❌ INCORRECT: dynamic type should not use jsonConvert.convert');
    } else {
        console.log('❓ UNKNOWN: Cannot determine dynamic type handling');
    }
    
    // 检查null检查逻辑
    const configValAssignmentIndex = lines.findIndex(line => line.includes('appConfigEntity.configVal ='));
    if (configValAssignmentIndex > 0) {
        const prevLine = lines[configValAssignmentIndex - 1]?.trim();
        const nextLine = lines[configValAssignmentIndex + 1]?.trim();
        
        console.log('\nNull check validation:');
        console.log('Previous line:', prevLine || 'N/A');
        console.log('Assignment line:', lines[configValAssignmentIndex]?.trim() || 'N/A');
        console.log('Next line:', nextLine || 'N/A');
        
        // dynamic类型不应该有null检查
        if (!prevLine?.includes('if (') && !nextLine?.includes('}')) {
            console.log('✅ CORRECT: dynamic type has no null check');
        } else {
            console.log('❌ INCORRECT: dynamic type should not have null check');
        }
    }
    
    // 检查其他类型是否仍然使用jsonConvert.convert
    const configKeyLine = lines.find(line => line.includes('configKey') && line.includes('final'));
    console.log('\nconfigKey declaration line:', configKeyLine?.trim() || 'NOT FOUND');
    
    if (configKeyLine?.includes('jsonConvert.convert<String>')) {
        console.log('✅ CORRECT: String type still uses jsonConvert.convert');
    } else {
        console.log('❌ INCORRECT: String type should use jsonConvert.convert');
    }
}

// 运行测试
testDynamicType();
console.log('\nTest completed.');
