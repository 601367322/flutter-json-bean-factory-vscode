const { DartClassParser } = require('./out/parsers/DartClassParser');
const { DartCodeGenerator } = require('./out/generators/DartCodeGenerator');

// 测试类名简化问题
const testDartContent = `@JsonSerializable()
class HomePageConfig {
    List<PageConfigItem>? topBanner;
    List<PageConfigItem>? gridIcons;

    HomePageConfig();
}

@JsonSerializable()
class PageConfigItem {
    String? icon;
    String? title;
    TargetConfigEntity? targetConfig;

    PageConfigItem();
}

@JsonSerializable()
class TargetConfigEntity {
    String? urlType;
    String? url;

    TargetConfigEntity();
}`;

function testClassNameFix() {
    console.log('Testing class name simplification fix...');
    
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
    
    // 测试HomePageConfig类
    const homePageConfigClass = dartClasses.find(c => c.className === 'HomePageConfig');
    if (homePageConfigClass) {
        const jsonClass = parser.convertToJsonClass(homePageConfigClass);
        console.log('\n=== HomePageConfig class ===');
        
        // 检查属性类型
        jsonClass.properties.forEach(prop => {
            console.log(`Property: ${prop.name}`);
            console.log(`  Original Type: ${prop.dartType}`);
            console.log(`  Array Element Type: ${prop.arrayElementType || 'N/A'}`);
            console.log(`  Is Array: ${prop.isArray}`);
            console.log(`  Is Nested Object: ${prop.isNestedObject}`);
        });
        
        // 生成fromJson函数
        const fromJsonFunction = generator.generateFromJsonFunction('HomePageConfig', jsonClass.properties);
        console.log('\n=== Generated fromJson function ===');
        console.log(fromJsonFunction);
        
        // 验证类型名
        const lines = fromJsonFunction.split('\n');
        const topBannerLine = lines.find(line => line.includes('List<') && line.includes('topBanner'));
        
        console.log('\n=== Type Name Validation ===');
        console.log('topBanner line:', topBannerLine?.trim() || 'NOT FOUND');
        
        if (topBannerLine?.includes('List<PageConfigItem>')) {
            console.log('✅ CORRECT: Uses PageConfigItem (not simplified)');
        } else if (topBannerLine?.includes('List<PageConfig>')) {
            console.log('❌ INCORRECT: Uses PageConfig (incorrectly simplified)');
        } else {
            console.log('❓ UNKNOWN: Cannot determine type name');
        }
        
        // 检查是否有PageConfig类型的错误引用
        const hasPageConfigError = fromJsonFunction.includes('<PageConfig>') || 
                                  fromJsonFunction.includes('as PageConfig');
        
        console.log('Has PageConfig error:', hasPageConfigError ? '❌ YES (ERROR)' : '✅ NO (CORRECT)');
        
        // 测试getNestedClassName方法
        console.log('\n=== getNestedClassName Test ===');
        const testNames = [
            'PageConfigItem',
            'TargetConfigEntity', 
            'UserListItem',
            'GroupListGroupListItem'
        ];
        
        testNames.forEach(name => {
            const simplified = generator.getNestedClassName(name);
            console.log(`${name} -> ${simplified}`);
        });
    }
}

// 运行测试
testClassNameFix();
console.log('\nTest completed.');
