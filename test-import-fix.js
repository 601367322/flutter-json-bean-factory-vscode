const { JsonParser } = require('./out/parsers/JsonParser');
const { DartCodeGenerator } = require('./out/generators/DartCodeGenerator');

console.log('📦 Testing Import Fix - All Entity Classes Should Be Imported\n');

// 使用嵌套结构的JSON来测试导入
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
      ],
      "file_source_info": {
        "id": 0,
        "console_id": "",
        "url": "",
        "name": ""
      }
    }
  ],
  "msg": "成功",
  "status": 0
}`;

console.log('🎯 Testing Import Generation:');
console.log('• All nested Entity classes should be imported');
console.log('• Helper file should have all required imports');
console.log('• No missing type references\n');

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
    console.log('1. 🔍 Parsing JSON with nested structures...');
    const rootClass = parser.parseJson(testJson, 'Test');
    const allClasses = parser.getAllClasses(rootClass);
    console.log(`✅ Generated ${allClasses.length} classes:`);
    allClasses.forEach((cls, index) => {
        console.log(`   ${index + 1}. ${cls.name}Entity`);
    });
    console.log('');

    // 2. 生成Helper文件并检查导入
    console.log('2. 📦 Generating Helper File with All Imports...');
    const helperCode = generator.generateHelperFile(rootClass);
    const helperLines = helperCode.split('\n');
    
    // 提取导入行
    const importLines = helperLines.filter(line => line.startsWith('import \'package:'));
    console.log('📋 Generated Imports:');
    importLines.forEach(line => {
        console.log(`   ${line}`);
    });
    
    // 验证所有Entity类都被导入
    const expectedEntities = allClasses.map(cls => cls.name.toLowerCase() + '_entity');
    const importedEntities = importLines.filter(line => 
        line.includes('/models/') && line.includes('_entity.dart')
    ).map(line => {
        const match = line.match(/\/models\/(.+)\.dart/);
        return match ? match[1] : '';
    });
    
    console.log('\n✅ Import Verification:');
    expectedEntities.forEach(expected => {
        const isImported = importedEntities.includes(expected);
        console.log(`   ${expected}: ${isImported ? 'IMPORTED ✅' : 'MISSING ❌'}`);
    });

    // 3. 检查Helper文件中的类型引用
    console.log('\n3. 🔧 Checking Type References in Helper File...');
    const typeReferences = helperLines.filter(line => 
        line.includes('Entity>') || line.includes('Entity(') || line.includes('Entity?')
    );
    
    console.log('📋 Type References Found:');
    typeReferences.slice(0, 8).forEach(line => {
        const trimmed = line.trim();
        if (trimmed) {
            console.log(`   ${trimmed}`);
        }
    });
    if (typeReferences.length > 8) {
        console.log(`   ... and ${typeReferences.length - 8} more references`);
    }

    // 4. 生成主Entity类并检查导入
    console.log('\n4. 📝 Checking Main Entity Class Imports...');
    const mainEntityCode = generator.generateDartClass(rootClass);
    const mainEntityLines = mainEntityCode.split('\n');
    const mainImports = mainEntityLines.filter(line => line.startsWith('import \'package:'));
    
    console.log('📋 Main Entity Imports:');
    mainImports.forEach(line => {
        console.log(`   ${line}`);
    });

    // 5. 验证所有类型都正确引用
    console.log('\n5. ✅ Final Validation:');
    
    // 检查是否有未定义的类型引用
    const undefinedTypes = [];
    helperLines.forEach((line, index) => {
        // 查找可能的未定义类型（不带Entity后缀的类名）
        const matches = line.match(/\b([A-Z][a-zA-Z]*(?:Item|List|Info|Data))\b/g);
        if (matches) {
            matches.forEach(match => {
                if (!match.endsWith('Entity') && !match.includes('List<') && !match.includes('Map<')) {
                    undefinedTypes.push(`Line ${index + 1}: ${match} in "${line.trim()}"`);
                }
            });
        }
    });
    
    if (undefinedTypes.length === 0) {
        console.log('   ✅ No undefined type references found');
    } else {
        console.log('   ❌ Potential undefined types:');
        undefinedTypes.slice(0, 5).forEach(type => {
            console.log(`      ${type}`);
        });
    }
    
    // 检查导入覆盖率
    const importCoverage = (importedEntities.length / expectedEntities.length) * 100;
    console.log(`   ✅ Import coverage: ${importCoverage.toFixed(1)}% (${importedEntities.length}/${expectedEntities.length})`);
    
    // 检查类型引用数量
    console.log(`   ✅ Type references: ${typeReferences.length} found`);

    console.log('\n🎉 Import fix test completed!');
    
    if (importCoverage === 100 && undefinedTypes.length === 0) {
        console.log('\n🚀 SUCCESS: All imports are correctly generated!');
        console.log('   • All Entity classes are imported');
        console.log('   • No undefined type references');
        console.log('   • Helper file should compile without errors');
    } else {
        console.log('\n⚠️  ISSUES DETECTED:');
        if (importCoverage < 100) {
            console.log(`   • Missing imports: ${expectedEntities.length - importedEntities.length} classes`);
        }
        if (undefinedTypes.length > 0) {
            console.log(`   • Undefined types: ${undefinedTypes.length} references`);
        }
    }

} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
}
