const { JsonParser } = require('./out/parsers/JsonParser');
const { DartCodeGenerator } = require('./out/generators/DartCodeGenerator');

console.log('📦 Testing Entity Class Imports - Models Directory Fix\n');

// 使用嵌套结构的JSON来测试Entity类导入
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

console.log('🎯 Testing Entity Import Generation:');
console.log('• Main Entity classes should import referenced Entity classes');
console.log('• No missing imports in models directory');
console.log('• All nested types properly imported\n');

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

    // 2. 生成并检查主Entity类的导入
    console.log('2. 📝 Generating Main Entity Class (TestEntity)...');
    const mainEntityCode = generator.generateDartClass(rootClass);
    const mainLines = mainEntityCode.split('\n');
    
    // 提取导入行
    const mainImports = mainLines.filter(line => line.startsWith('import \'package:'));
    console.log('📋 Main Entity Imports:');
    mainImports.forEach(line => {
        console.log(`   ${line}`);
    });
    
    // 检查是否导入了引用的Entity类
    const referencedInMain = mainLines.filter(line => 
        line.includes('Entity') && (line.includes('List<') || line.includes(' = '))
    );
    console.log('\n📋 Referenced Entity Types in Main Class:');
    referencedInMain.forEach(line => {
        console.log(`   ${line.trim()}`);
    });

    // 3. 生成并检查复杂Entity类的导入
    const complexClass = allClasses.find(cls => cls.properties.length > 5);
    if (complexClass) {
        console.log(`\n3. 🎛️ Generating Complex Entity Class (${complexClass.name}Entity)...`);
        const complexEntityCode = generator.generateDartClass(complexClass);
        const complexLines = complexEntityCode.split('\n');
        
        // 提取导入行
        const complexImports = complexLines.filter(line => line.startsWith('import \'package:'));
        console.log('📋 Complex Entity Imports:');
        complexImports.forEach(line => {
            console.log(`   ${line}`);
        });
        
        // 检查引用的Entity类型
        const referencedInComplex = complexLines.filter(line => 
            line.includes('Entity') && (line.includes('List<') || line.includes(' = '))
        );
        console.log('\n📋 Referenced Entity Types in Complex Class:');
        referencedInComplex.forEach(line => {
            console.log(`   ${line.trim()}`);
        });
    }

    // 4. 生成所有嵌套Entity类并检查导入
    console.log('\n4. 📦 Checking All Entity Classes for Import Completeness...');
    const importAnalysis = [];
    
    for (const cls of allClasses) {
        const entityCode = generator.generateDartClass(cls);
        const lines = entityCode.split('\n');
        const imports = lines.filter(line => line.startsWith('import \'package:'));
        const entityImports = imports.filter(line => line.includes('/models/') && line.includes('_entity.dart'));
        
        // 检查类中引用的Entity类型
        const entityReferences = lines.filter(line => 
            line.includes('Entity') && (line.includes('List<') || line.includes(' = '))
        );
        
        importAnalysis.push({
            className: cls.name + 'Entity',
            totalImports: imports.length,
            entityImports: entityImports.length,
            entityReferences: entityReferences.length,
            hasEntityReferences: entityReferences.length > 0,
            hasEntityImports: entityImports.length > 0
        });
    }
    
    console.log('📊 Import Analysis Summary:');
    importAnalysis.forEach(analysis => {
        const status = analysis.hasEntityReferences ? 
            (analysis.hasEntityImports ? '✅ COMPLETE' : '❌ MISSING') : 
            '➖ NO REFS';
        console.log(`   ${analysis.className}: ${status} (${analysis.entityImports} imports, ${analysis.entityReferences} refs)`);
    });

    // 5. 验证导入完整性
    console.log('\n5. ✅ Import Completeness Validation:');
    
    const classesWithMissingImports = importAnalysis.filter(analysis => 
        analysis.hasEntityReferences && !analysis.hasEntityImports
    );
    
    const classesWithImports = importAnalysis.filter(analysis => 
        analysis.hasEntityImports
    );
    
    const totalEntityReferences = importAnalysis.reduce((sum, analysis) => 
        sum + analysis.entityReferences, 0
    );
    
    const totalEntityImports = importAnalysis.reduce((sum, analysis) => 
        sum + analysis.entityImports, 0
    );
    
    console.log(`   📊 Classes with Entity references: ${importAnalysis.filter(a => a.hasEntityReferences).length}`);
    console.log(`   📊 Classes with Entity imports: ${classesWithImports.length}`);
    console.log(`   📊 Total Entity references: ${totalEntityReferences}`);
    console.log(`   📊 Total Entity imports: ${totalEntityImports}`);
    console.log(`   📊 Missing imports: ${classesWithMissingImports.length} classes`);

    // 6. 最终结果
    console.log('\n6. 🎉 Final Results:');
    
    if (classesWithMissingImports.length === 0) {
        console.log('   🚀 SUCCESS: All Entity classes have complete imports!');
        console.log('   ✅ No missing imports in models directory');
        console.log('   ✅ All referenced Entity types are properly imported');
        console.log('   ✅ Models should compile without errors');
        
        console.log('\n📋 Import Summary:');
        console.log(`   • ${classesWithImports.length} classes have Entity imports`);
        console.log(`   • ${totalEntityImports} total Entity imports generated`);
        console.log(`   • ${totalEntityReferences} total Entity references found`);
        
    } else {
        console.log('   ❌ ISSUES FOUND:');
        console.log(`   • ${classesWithMissingImports.length} classes missing imports:`);
        classesWithMissingImports.forEach(analysis => {
            console.log(`     - ${analysis.className} (${analysis.entityReferences} references, 0 imports)`);
        });
    }

    // 7. 显示示例代码
    console.log('\n7. 📋 Generated Code Examples:');
    if (complexClass) {
        const complexEntityCode = generator.generateDartClass(complexClass);
        const complexLines = complexEntityCode.split('\n');
        console.log(`${complexClass.name}Entity (first 15 lines):`);
        complexLines.slice(0, 15).forEach((line, index) => {
            console.log(`   ${(index + 1).toString().padStart(2, ' ')}: ${line}`);
        });
    }

} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
}
