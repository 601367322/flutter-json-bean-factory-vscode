const { DartClassParser } = require('./out/parsers/DartClassParser');
const { DartCodeGenerator } = require('./out/generators/DartCodeGenerator');

// 测试空类的处理
const testDartContent = `@JsonSerializable()
class Style {
    Style();
}

@JsonSerializable()
class BadgeEntity {
    String? code;
    String? name;
    Style? style;

    BadgeEntity();
}`;

function testEmptyClass() {
    console.log('Testing empty class copyWith generation...');
    
    const parser = new DartClassParser();
    const dartClasses = parser.parseDartFile(testDartContent);
    
    console.log(`Found ${dartClasses.length} classes:`);
    dartClasses.forEach(cls => {
        console.log(`  - ${cls.className} (${cls.properties.length} properties)`);
    });
    
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
    
    // 测试Style类（空类）
    const styleClass = dartClasses.find(c => c.className === 'Style');
    if (styleClass) {
        const styleJsonClass = parser.convertToJsonClass(styleClass);
        console.log('\n=== Style class (empty) ===');
        console.log(`Properties: ${styleJsonClass.properties.length}`);
        
        const copyWithExtension = generator.generateCopyWithExtension('Style', styleJsonClass.properties);
        console.log('Generated copyWith extension:');
        console.log(copyWithExtension);
        
        // 验证是否为空扩展
        const lines = copyWithExtension.split('\n');
        const hasEmptyExtension = lines.length === 2 && 
                                 lines[0].includes('extension StyleExtension on Style {') &&
                                 lines[1] === '}';
        
        console.log('Is empty extension:', hasEmptyExtension ? '✅ CORRECT' : '❌ INCORRECT');
    }
    
    // 测试BadgeEntity类（有属性）
    const badgeClass = dartClasses.find(c => c.className === 'BadgeEntity');
    if (badgeClass) {
        const badgeJsonClass = parser.convertToJsonClass(badgeClass);
        console.log('\n=== BadgeEntity class (with properties) ===');
        console.log(`Properties: ${badgeJsonClass.properties.length}`);
        
        const copyWithExtension = generator.generateCopyWithExtension('BadgeEntity', badgeJsonClass.properties);
        console.log('Generated copyWith extension:');
        console.log(copyWithExtension);
        
        // 验证是否有正确的copyWith方法
        const hasCopyWithMethod = copyWithExtension.includes('copyWith({');
        const hasParameters = copyWithExtension.includes('String? code');
        const hasNoSyntaxError = !copyWithExtension.includes(',\n\t}) {'); // 检查是否有多余逗号
        
        console.log('Has copyWith method:', hasCopyWithMethod ? '✅ CORRECT' : '❌ INCORRECT');
        console.log('Has parameters:', hasParameters ? '✅ CORRECT' : '❌ INCORRECT');
        console.log('No syntax errors:', hasNoSyntaxError ? '✅ CORRECT' : '❌ INCORRECT');
    }
}

// 运行测试
testEmptyClass();
console.log('\nTest completed.');
