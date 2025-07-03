const { JsonParser } = require('./out/parsers/JsonParser');
const { DartCodeGenerator } = require('./out/generators/DartCodeGenerator');

console.log('🔧 Testing Code Quality Fixes - Null-aware Operators & Dynamic Types\n');

// 测试包含dynamic字段和各种类型的JSON
const testJson = `{
  "data": [
    {
      "id": 123,
      "user_id": "user-123",
      "user_name": "John Doe",
      "media_stream_list": {
        "user_media_stream_list": null,
        "background_image_url": "http://example.com/bg.jpg"
      },
      "mixer": [
        {
          "afv": 1,
          "pfv": 0,
          "user_name": "John",
          "user_id": "123"
        }
      ],
      "file_source_info": {
        "id": 456,
        "console_id": "console1",
        "url": "http://example.com/file.mp4"
      }
    }
  ],
  "msg": "success",
  "req_id": "req-789",
  "status": 200,
  "trace": "trace-123"
}`;

console.log('🎯 Expected Code Quality Fixes:');
console.log('• No unnecessary null-aware operators (?.) on non-null fields');
console.log('• No unnecessary ? on dynamic types');
console.log('• Proper null-aware operators only where needed');
console.log('• Clean Helper file without warnings\n');

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
    console.log('1. 🔍 Parsing JSON structure...');
    const rootClass = parser.parseJson(testJson, 'Test');
    const allClasses = parser.getAllClasses(rootClass);
    console.log(`✅ Generated ${allClasses.length} classes:`);
    allClasses.forEach((cls, index) => {
        console.log(`   ${index + 1}. ${cls.name} (${cls.properties.length} properties)`);
    });
    console.log('');

    // 2. 生成Helper文件
    console.log('2. 🔧 Generating Helper File...');
    const helperCode = generator.generateHelperFile(rootClass);
    
    console.log('Helper File Code (first 50 lines):');
    console.log('='.repeat(120));
    const helperLines = helperCode.split('\n');
    helperLines.slice(0, 50).forEach((line, index) => {
        console.log(`${(index + 1).toString().padStart(2, ' ')}: ${line}`);
    });
    if (helperLines.length > 50) {
        console.log(`... and ${helperLines.length - 50} more lines`);
    }
    console.log('='.repeat(120));

    // 3. 分析代码质量问题
    console.log('\n3. 📊 Code Quality Analysis:');
    
    // 检查不必要的null-aware操作符
    const unnecessaryNullAware = helperLines.filter(line => {
        // 检查在非空字段上使用?.的情况
        return (
            line.includes('?.map(') && 
            (line.includes('.map((v) => v.toJson())') || line.includes('.map((e) => e.toJson())'))
        ) || (
            line.includes('?.toJson()') && 
            !line.includes('as List<dynamic>?')
        );
    });
    console.log(`🚫 Unnecessary null-aware operators: ${unnecessaryNullAware.length} (should be 0)`);
    if (unnecessaryNullAware.length > 0) {
        unnecessaryNullAware.forEach(line => console.log(`   ❌ ${line.trim()}`));
    }
    
    // 检查dynamic类型上的不必要?
    const unnecessaryDynamicQuestion = helperLines.filter(line => 
        line.includes('dynamic?') && !line.includes('List<dynamic>?')
    );
    console.log(`\n🚫 Unnecessary ? on dynamic: ${unnecessaryDynamicQuestion.length} (should be 0)`);
    if (unnecessaryDynamicQuestion.length > 0) {
        unnecessaryDynamicQuestion.forEach(line => console.log(`   ❌ ${line.trim()}`));
    }
    
    // 检查正确的null-aware操作符使用
    const correctNullAware = helperLines.filter(line => 
        line.includes('(json[') && line.includes('as List<dynamic>?)?.map(')
    );
    console.log(`\n✅ Correct null-aware operators: ${correctNullAware.length}`);
    correctNullAware.slice(0, 3).forEach(line => console.log(`   ✅ ${line.trim()}`));
    if (correctNullAware.length > 3) {
        console.log(`   ... and ${correctNullAware.length - 3} more`);
    }
    
    // 检查dynamic字段声明
    const dynamicFields = helperLines.filter(line => 
        line.includes('final dynamic ') && !line.includes('dynamic?')
    );
    console.log(`\n✅ Correct dynamic fields: ${dynamicFields.length}`);
    dynamicFields.forEach(line => console.log(`   ✅ ${line.trim()}`));
    
    // 检查toJson方法中的正确访问
    const toJsonCorrectAccess = helperLines.filter(line => 
        line.includes('.map((v) => v.toJson()).toList()') && !line.includes('?.')
    );
    console.log(`\n✅ Correct toJson access: ${toJsonCorrectAccess.length}`);
    toJsonCorrectAccess.forEach(line => console.log(`   ✅ ${line.trim()}`));

    // 4. 验证与原版对比
    console.log('\n4. ✅ Comparison with Original Plugin:');
    
    const checks = [
        { 
            name: 'No unnecessary null-aware operators', 
            passed: unnecessaryNullAware.length === 0,
            details: `Found ${unnecessaryNullAware.length} unnecessary ?. operators`
        },
        { 
            name: 'No unnecessary ? on dynamic', 
            passed: unnecessaryDynamicQuestion.length === 0,
            details: `Found ${unnecessaryDynamicQuestion.length} unnecessary dynamic? types`
        },
        { 
            name: 'Correct null-aware usage', 
            passed: correctNullAware.length > 0,
            details: `Found ${correctNullAware.length} correct ?. operators`
        },
        { 
            name: 'Correct dynamic fields', 
            passed: dynamicFields.length > 0,
            details: `Found ${dynamicFields.length} correct dynamic fields`
        },
        { 
            name: 'Clean toJson access', 
            passed: toJsonCorrectAccess.length > 0,
            details: `Found ${toJsonCorrectAccess.length} clean toJson accesses`
        }
    ];
    
    const passedChecks = checks.filter(check => check.passed).length;
    const totalChecks = checks.length;
    
    console.log(`Score: ${passedChecks}/${totalChecks} (${((passedChecks/totalChecks)*100).toFixed(1)}%)`);
    
    checks.forEach(check => {
        console.log(`   ${check.passed ? '✅' : '❌'} ${check.name}: ${check.details}`);
    });
    
    if (passedChecks === totalChecks) {
        console.log('\n🎉 PERFECT: Code quality issues are fixed!');
        console.log('   • No unnecessary null-aware operators');
        console.log('   • No unnecessary ? on dynamic types');
        console.log('   • Proper null-aware usage where needed');
        console.log('   • Clean Helper file without warnings');
        console.log('   • Matches original plugin code quality');
    } else {
        console.log('\n⚠️  CODE QUALITY ISSUES DETECTED:');
        const failedChecks = checks.filter(check => !check.passed);
        failedChecks.forEach(check => {
            console.log(`   • ${check.name}: ${check.details}`);
        });
    }

    // 5. 生成Entity文件检查
    console.log('\n5. 📝 Entity File Quality Check:');
    const entityCode = generator.generateDartClass(rootClass);
    const entityLines = entityCode.split('\n');
    
    // 检查late字段
    const lateFields = entityLines.filter(line => 
        line.includes('late ') && line.trim().endsWith(';')
    );
    console.log(`✅ Late fields: ${lateFields.length}`);
    lateFields.forEach(field => console.log(`   ${field.trim()}`));
    
    // 检查dynamic字段（无默认值）
    const dynamicEntityFields = entityLines.filter(line => 
        line.includes('dynamic ') && !line.includes('=') && line.trim().endsWith(';')
    );
    console.log(`\n✅ Dynamic fields (no default): ${dynamicEntityFields.length}`);
    dynamicEntityFields.forEach(field => console.log(`   ${field.trim()}`));

    console.log('\n📊 Summary:');
    console.log(`   • ${allClasses.length} classes generated`);
    console.log(`   • ${unnecessaryNullAware.length} unnecessary null-aware operators (should be 0)`);
    console.log(`   • ${unnecessaryDynamicQuestion.length} unnecessary dynamic? types (should be 0)`);
    console.log(`   • ${correctNullAware.length} correct null-aware operators`);
    console.log(`   • ${dynamicFields.length} correct dynamic fields`);
    console.log(`   • ${lateFields.length} late fields in entity`);
    console.log(`   • ${passedChecks}/${totalChecks} quality checks passed`);

} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
}
