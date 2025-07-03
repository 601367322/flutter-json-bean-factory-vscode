const { JsonParser } = require('./out/parsers/JsonParser');
const { DartCodeGenerator } = require('./out/generators/DartCodeGenerator');

console.log('🔧 Testing Dynamic Type Fix - No Unnecessary ? on Dynamic\n');

// 测试包含dynamic字段的JSON
const testJson = `{
  "user_media_stream_list": null,
  "background_image_url": "http://example.com/bg.jpg",
  "mixed_data": {
    "some_field": "value"
  },
  "dynamic_array": [1, "string", true],
  "normal_string": "test"
}`;

console.log('🎯 Expected Dynamic Type Handling:');
console.log('• dynamic fields without ? mark: dynamic userMediaStreamList;');
console.log('• dynamic fields without null checks');
console.log('• Other types with proper ? marks and null checks');
console.log('• No "unnecessary_question_mark" warnings\n');

// 初始化解析器和生成器
const parser = new JsonParser();
const generator = new DartCodeGenerator({
    nullSafety: true,
    useJsonAnnotation: true,
    classNameSuffix: 'Entity',
    generatedPath: 'lib/generated/json',
    entityPath: 'lib/models',
    scanPath: 'lib'
}, 'XLive');

try {
    // 1. 解析JSON
    console.log('1. 🔍 Parsing JSON with dynamic fields...');
    const rootClass = parser.parseJson(testJson, 'Test');
    
    // 检查解析的字段类型
    console.log('Parsed fields:');
    rootClass.properties.forEach(prop => {
        console.log(`   ${prop.name}: ${prop.dartType} (isArray: ${prop.isArray}, isNestedObject: ${prop.isNestedObject})`);
    });
    console.log('');

    // 2. 生成Helper文件
    console.log('2. 🔧 Generating Helper File...');
    const helperCode = generator.generateHelperFile(rootClass);
    
    console.log('Helper File Code:');
    console.log('='.repeat(100));
    console.log(helperCode);
    console.log('='.repeat(100));

    // 3. 分析dynamic类型处理
    console.log('\n3. 📊 Dynamic Type Analysis:');
    const helperLines = helperCode.split('\n');
    
    // 检查dynamic字段声明（不应该有?）
    const dynamicDeclarations = helperLines.filter(line => 
        line.includes('final dynamic ') && line.trim().endsWith(';')
    );
    console.log(`✅ Dynamic field declarations: ${dynamicDeclarations.length}`);
    dynamicDeclarations.forEach(line => console.log(`   ${line.trim()}`));
    
    // 检查错误的dynamic?声明
    const wrongDynamicDeclarations = helperLines.filter(line => 
        line.includes('final dynamic?') || line.includes('dynamic? ')
    );
    console.log(`\n🚫 Wrong dynamic? declarations: ${wrongDynamicDeclarations.length} (should be 0)`);
    if (wrongDynamicDeclarations.length > 0) {
        wrongDynamicDeclarations.forEach(line => console.log(`   ❌ ${line.trim()}`));
    }
    
    // 检查dynamic字段的赋值（不应该有null检查）
    const dynamicAssignments = helperLines.filter(line => 
        line.includes('userMediaStreamList = ') && !line.includes('if (')
    );
    console.log(`\n✅ Direct dynamic assignments: ${dynamicAssignments.length}`);
    dynamicAssignments.forEach(line => console.log(`   ${line.trim()}`));
    
    // 检查其他类型的null检查
    const nullChecks = helperLines.filter(line => 
        line.includes('if (') && line.includes('!= null)')
    );
    console.log(`\n✅ Null checks for other types: ${nullChecks.length}`);
    nullChecks.slice(0, 3).forEach(line => console.log(`   ${line.trim()}`));
    if (nullChecks.length > 3) {
        console.log(`   ... and ${nullChecks.length - 3} more`);
    }

    // 4. 验证修复结果
    console.log('\n4. ✅ Fix Verification:');
    
    const checks = [
        { 
            name: 'Dynamic fields without ?', 
            passed: dynamicDeclarations.length > 0 && wrongDynamicDeclarations.length === 0,
            details: `${dynamicDeclarations.length} correct, ${wrongDynamicDeclarations.length} wrong`
        },
        { 
            name: 'Direct dynamic assignments', 
            passed: dynamicAssignments.length > 0,
            details: `Found ${dynamicAssignments.length} direct assignments`
        },
        { 
            name: 'Null checks for other types', 
            passed: nullChecks.length > 0,
            details: `Found ${nullChecks.length} null checks for non-dynamic types`
        }
    ];
    
    const passedChecks = checks.filter(check => check.passed).length;
    const totalChecks = checks.length;
    
    console.log(`Score: ${passedChecks}/${totalChecks} (${((passedChecks/totalChecks)*100).toFixed(1)}%)`);
    
    checks.forEach(check => {
        console.log(`   ${check.passed ? '✅' : '❌'} ${check.name}: ${check.details}`);
    });
    
    if (passedChecks === totalChecks) {
        console.log('\n🎉 PERFECT: Dynamic type handling is fixed!');
        console.log('   • No unnecessary ? on dynamic types');
        console.log('   • Direct assignment for dynamic fields');
        console.log('   • Proper null checks for other types');
        console.log('   • Should eliminate "unnecessary_question_mark" warnings');
    } else {
        console.log('\n⚠️  DYNAMIC TYPE ISSUES DETECTED:');
        const failedChecks = checks.filter(check => !check.passed);
        failedChecks.forEach(check => {
            console.log(`   • ${check.name}: ${check.details}`);
        });
    }

    console.log('\n📊 Summary:');
    console.log(`   • ${dynamicDeclarations.length} correct dynamic declarations`);
    console.log(`   • ${wrongDynamicDeclarations.length} wrong dynamic? declarations (should be 0)`);
    console.log(`   • ${dynamicAssignments.length} direct dynamic assignments`);
    console.log(`   • ${nullChecks.length} null checks for other types`);
    console.log(`   • ${passedChecks}/${totalChecks} checks passed`);

} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
}
