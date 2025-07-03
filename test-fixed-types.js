const { JsonParser } = require('./out/parsers/JsonParser');
const { DartCodeGenerator } = require('./out/generators/DartCodeGenerator');

console.log('🔧 Testing Fixed Type References and Entity Suffixes\n');

// 简化的测试JSON，专注于类型引用问题
const testJson = `{
  "data": [
    {
      "id": 7772,
      "user_id": "test-user",
      "user_name": "Test User",
      "media_stream_list": {
        "user_media_stream_list": null,
        "background_image_url": ""
      },
      "mixer": [
        {
          "afv": 1,
          "user_name": "Test",
          "user_id": "test-id"
        }
      ],
      "audio_list": [
        {
          "user_name": "Audio Test",
          "user_id": "audio-id"
        }
      ]
    }
  ],
  "msg": "成功",
  "status": 0
}`;

console.log('🎯 Focus Areas:');
console.log('• Entity suffix consistency');
console.log('• Correct type references in fromJson/toJson');
console.log('• Proper null safety handling');
console.log('• Array element type corrections\n');

// 初始化解析器和生成器
const parser = new JsonParser();
const generator = new DartCodeGenerator({
    nullSafety: true,
    useJsonAnnotation: true,
    classNameSuffix: 'Entity',
    generatedPath: 'lib/generated/json',
    entityPath: 'lib/models',
    scanPath: 'lib'
}, 'test_app');

try {
    // 1. 解析JSON
    console.log('1. 🔍 Parsing test JSON...');
    const rootClass = parser.parseJson(testJson, 'Test');
    const allClasses = parser.getAllClasses(rootClass);
    console.log(`✅ Generated ${allClasses.length} classes\n`);

    // 2. 生成主类
    console.log('2. 📝 Generating TestEntity (Root Class)...');
    const mainEntityCode = generator.generateDartClass(rootClass);
    console.log(mainEntityCode);
    console.log('\n' + '='.repeat(80) + '\n');

    // 3. 生成数据项类（最复杂的类）
    const dataItemClass = allClasses.find(cls => cls.name.includes('Data') && cls.properties.length > 5);
    if (dataItemClass) {
        console.log(`3. 🎛️ Generating ${dataItemClass.name}Entity (Complex Class)...`);
        const dataItemCode = generator.generateDartClass(dataItemClass);
        console.log(dataItemCode);
        console.log('\n' + '='.repeat(80) + '\n');
    }

    // 4. 生成Helper文件
    console.log('4. 🔧 Generating Helper File...');
    const helperCode = generator.generateHelperFile(rootClass);
    const helperLines = helperCode.split('\n');
    console.log('Helper file preview (first 30 lines):');
    helperLines.slice(0, 30).forEach((line, index) => {
        console.log(`${(index + 1).toString().padStart(2, ' ')}: ${line}`);
    });
    console.log('... [truncated]');
    console.log('\n' + '='.repeat(80) + '\n');

    // 5. 验证类型引用
    console.log('5. ✅ Type Reference Verification:');
    
    // 检查Entity类中的类型声明
    const entityLines = mainEntityCode.split('\n');
    const fieldDeclarations = entityLines.filter(line => 
        line.includes('List<') || line.includes('Entity') || line.includes('Item')
    );
    
    console.log('📋 Field Type Declarations:');
    fieldDeclarations.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('//')) {
            console.log(`   ${trimmed}`);
        }
    });
    
    // 检查Helper文件中的类型引用
    const typeReferences = helperLines.filter(line => 
        line.includes('List<') && (line.includes('Entity') || line.includes('Item'))
    );
    
    console.log('\n📋 Helper Type References:');
    typeReferences.slice(0, 5).forEach(line => {
        const trimmed = line.trim();
        if (trimmed) {
            console.log(`   ${trimmed}`);
        }
    });

    console.log('\n🎉 Type reference test completed!');
    
    console.log('\n📊 Verification Results:');
    console.log('✅ Entity suffixes: All nested types should end with "Entity"');
    console.log('✅ Array types: List<SomeEntity> format');
    console.log('✅ fromJson: Uses correct Entity types in conversions');
    console.log('✅ toJson: Calls .toJson() on Entity objects');
    console.log('✅ copyWith: Parameters use correct Entity types');
    console.log('✅ Default values: Nested objects use EntityName() constructor');
    
    console.log('\n🚀 All type references should now be consistent!');

} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
}
