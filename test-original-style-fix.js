const { JsonParser } = require('./out/parsers/JsonParser');
const { DartCodeGenerator } = require('./out/generators/DartCodeGenerator');

console.log('🎨 Testing Original Style Fix - Late Keywords & Single Quotes\n');

// 使用包含对象字段和dynamic字段的JSON来测试原版风格
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

console.log('🎯 Expected Original Style Features:');
console.log('• Object fields use late keyword: late MediaStreamList mediaStreamList;');
console.log('• Dynamic fields have no default value: dynamic userMediaStreamList;');
console.log('• @JSONField uses single quotes: @JSONField(name: \'user_id\')');
console.log('• Array fields have default values: List<Mixer> mixer = [];');
console.log('• Primitive fields have default values: String msg = \'\';');
console.log('• No object instantiation: no = MediaStreamList()\n');

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

    // 2. 生成Entity文件
    console.log('2. 📝 Generating Entity File with Original Style...');
    const entityCode = generator.generateDartClass(rootClass);
    
    console.log('Generated Entity Code:');
    console.log('='.repeat(120));
    console.log(entityCode);
    console.log('='.repeat(120));

    // 3. 分析生成的代码
    console.log('\n3. 📊 Original Style Analysis:');
    const lines = entityCode.split('\n');
    
    // 检查late关键字
    const lateFields = lines.filter(line => 
        line.includes('late ') && !line.includes('//') && line.trim().endsWith(';')
    );
    console.log(`🔑 Late fields: ${lateFields.length}`);
    lateFields.forEach(field => console.log(`   ${field.trim()}`));
    
    // 检查dynamic字段（无默认值）
    const dynamicFields = lines.filter(line => 
        line.includes('dynamic ') && !line.includes('=') && line.trim().endsWith(';')
    );
    console.log(`\n🌟 Dynamic fields (no default): ${dynamicFields.length}`);
    dynamicFields.forEach(field => console.log(`   ${field.trim()}`));
    
    // 检查单引号@JSONField
    const singleQuoteFields = lines.filter(line => 
        line.includes('@JSONField(name: \'') && line.includes('\')') 
    );
    console.log(`\n📝 Single quote @JSONField: ${singleQuoteFields.length}`);
    singleQuoteFields.slice(0, 5).forEach(field => console.log(`   ${field.trim()}`));
    if (singleQuoteFields.length > 5) {
        console.log(`   ... and ${singleQuoteFields.length - 5} more`);
    }
    
    // 检查双引号@JSONField（应该为0）
    const doubleQuoteFields = lines.filter(line => 
        line.includes('@JSONField(name: "') && line.includes('")') 
    );
    console.log(`\n🚫 Double quote @JSONField: ${doubleQuoteFields.length} (should be 0)`);
    if (doubleQuoteFields.length > 0) {
        doubleQuoteFields.forEach(field => console.log(`   ❌ ${field.trim()}`));
    }
    
    // 检查对象实例化（应该为0）
    const objectInstantiations = lines.filter(line => 
        line.includes(' = ') && line.includes('()') && !line.includes('[]') && 
        !line.includes('\'\'') && !line.includes('""') && line.trim().endsWith(';')
    );
    console.log(`\n🚫 Object instantiations: ${objectInstantiations.length} (should be 0)`);
    if (objectInstantiations.length > 0) {
        objectInstantiations.forEach(inst => console.log(`   ❌ ${inst.trim()}`));
    }
    
    // 检查数组字段默认值
    const arrayFields = lines.filter(line => 
        line.includes('List<') && line.includes(' = []') && line.trim().endsWith(';')
    );
    console.log(`\n📋 Array fields with default []: ${arrayFields.length}`);
    arrayFields.forEach(field => console.log(`   ${field.trim()}`));

    // 4. 验证与原版对比
    console.log('\n4. ✅ Comparison with Original Plugin:');
    
    const checks = [
        { 
            name: 'Object fields use late keyword', 
            passed: lateFields.length > 0,
            details: `Found ${lateFields.length} late fields`
        },
        { 
            name: 'Dynamic fields have no default', 
            passed: dynamicFields.length > 0,
            details: `Found ${dynamicFields.length} dynamic fields without default`
        },
        { 
            name: '@JSONField uses single quotes', 
            passed: singleQuoteFields.length > 0 && doubleQuoteFields.length === 0,
            details: `${singleQuoteFields.length} single quote, ${doubleQuoteFields.length} double quote`
        },
        { 
            name: 'No object instantiation', 
            passed: objectInstantiations.length === 0,
            details: `Found ${objectInstantiations.length} object instantiations (should be 0)`
        },
        { 
            name: 'Array fields have default []', 
            passed: arrayFields.length > 0,
            details: `Found ${arrayFields.length} array fields with default []`
        }
    ];
    
    const passedChecks = checks.filter(check => check.passed).length;
    const totalChecks = checks.length;
    
    console.log(`Score: ${passedChecks}/${totalChecks} (${((passedChecks/totalChecks)*100).toFixed(1)}%)`);
    
    checks.forEach(check => {
        console.log(`   ${check.passed ? '✅' : '❌'} ${check.name}: ${check.details}`);
    });
    
    if (passedChecks === totalChecks) {
        console.log('\n🎉 PERFECT: Original style is correctly implemented!');
        console.log('   • Object fields use late keyword');
        console.log('   • Dynamic fields have no default value');
        console.log('   • @JSONField uses single quotes');
        console.log('   • No unnecessary object instantiation');
        console.log('   • Array fields have proper default values');
        console.log('   • Matches original plugin style exactly');
    } else {
        console.log('\n⚠️  STYLE ISSUES DETECTED:');
        const failedChecks = checks.filter(check => !check.passed);
        failedChecks.forEach(check => {
            console.log(`   • ${check.name}: ${check.details}`);
        });
    }

    console.log('\n📊 Summary:');
    console.log(`   • ${allClasses.length} classes generated`);
    console.log(`   • ${lateFields.length} late fields`);
    console.log(`   • ${dynamicFields.length} dynamic fields without default`);
    console.log(`   • ${singleQuoteFields.length} single quote @JSONField annotations`);
    console.log(`   • ${doubleQuoteFields.length} double quote @JSONField annotations (should be 0)`);
    console.log(`   • ${objectInstantiations.length} object instantiations (should be 0)`);
    console.log(`   • ${arrayFields.length} array fields with default []`);
    console.log(`   • ${passedChecks}/${totalChecks} style checks passed`);

} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
}
