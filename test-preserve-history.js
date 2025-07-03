const { JsonParser } = require('./out/parsers/JsonParser');
const { DartCodeGenerator } = require('./out/generators/DartCodeGenerator');

console.log('📚 Testing History Preservation - Keep Existing Classes\n');

// 模拟已存在的历史类
const existingClasses = [
    {
        name: 'UserEntity',
        properties: [
            { name: 'id', dartType: 'int', originalJsonKey: 'id', isNullable: false, isArray: false, isNestedObject: false },
            { name: 'name', dartType: 'String', originalJsonKey: 'name', isNullable: false, isArray: false, isNestedObject: false }
        ],
        filePath: 'models/user_entity' // 历史类有filePath
    },
    {
        name: 'ProductEntity',
        properties: [
            { name: 'id', dartType: 'int', originalJsonKey: 'id', isNullable: false, isArray: false, isNestedObject: false },
            { name: 'title', dartType: 'String', originalJsonKey: 'title', isNullable: false, isArray: false, isNestedObject: false },
            { name: 'price', dartType: 'double', originalJsonKey: 'price', isNullable: false, isArray: false, isNestedObject: false }
        ],
        filePath: 'modal/response/product_entity' // 历史类有filePath
    }
];

// 新生成的类
const testJson = `{
  "group_list": [
    {
      "id": "group1",
      "name": "Administrators",
      "call_users": "user1,user2",
      "user_list": [
        {
          "id": 123,
          "user_id": "user-123",
          "user_name": "John Doe",
          "role": "admin"
        }
      ],
      "group_type": 1,
      "created_at": "2023-01-01T00:00:00Z"
    }
  ]
}`;

console.log('🎯 Expected Behavior:');
console.log('• Preserve existing classes: UserEntity, ProductEntity');
console.log('• Add new class: GroupListEntity');
console.log('• Total imports: 3 (user_entity.dart, product_entity.dart, group_list_entity.dart)');
console.log('• Total function mappings: 3');
console.log('• Total _getListChildType entries: 3\n');

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
    // 1. 解析新的JSON
    console.log('1. 🔍 Parsing new JSON structure...');
    const rootClass = parser.parseJson(testJson, 'GroupList');
    const newClasses = parser.getAllClasses(rootClass);
    console.log(`✅ Generated ${newClasses.length} new classes:`);
    newClasses.forEach((cls, index) => {
        console.log(`   ${index + 1}. ${cls.name} (${cls.properties.length} properties)`);
    });
    console.log('');

    // 2. 合并历史类和新类
    console.log('2. 🔄 Merging with existing classes...');
    const allClasses = [...existingClasses, ...newClasses];
    console.log(`✅ Total classes after merge: ${allClasses.length}`);
    console.log('Existing classes:');
    existingClasses.forEach((cls, index) => {
        console.log(`   ${index + 1}. ${cls.name} (from ${cls.filePath}.dart)`);
    });
    console.log('New classes:');
    newClasses.forEach((cls, index) => {
        console.log(`   ${index + 1}. ${cls.name} (new)`);
    });
    console.log('');

    // 3. 生成json_convert_content.dart
    console.log('3. 🗂️ Generating JSON Convert Content with all classes...');
    const jsonConvertContent = generator.generateBaseJsonConvert(allClasses);
    
    console.log('JSON Convert Content:');
    console.log('='.repeat(120));
    console.log(jsonConvertContent);
    console.log('='.repeat(120));

    // 4. 分析内容
    console.log('\n4. 📊 Content Analysis:');
    const lines = jsonConvertContent.split('\n');
    
    // 检查导入
    const imports = lines.filter(line => 
        line.startsWith('import \'package:') && line.includes('/models/') || line.includes('/modal/')
    );
    console.log(`📦 Model Imports: ${imports.length}`);
    imports.forEach(imp => console.log(`   ${imp}`));
    
    // 检查函数映射
    const functionMappings = lines.filter(line => 
        line.includes('.toString(): ') && line.includes('.fromJson')
    );
    console.log(`\n🔗 Function Mappings: ${functionMappings.length}`);
    functionMappings.forEach(mapping => console.log(`   ${mapping.trim()}`));
    
    // 检查_getListChildType条目
    const listChildTypeEntries = lines.filter(line => 
        line.includes('if (<') && line.includes('>[] is M)')
    );
    console.log(`\n📋 _getListChildType Entries: ${listChildTypeEntries.length}`);
    listChildTypeEntries.forEach(entry => console.log(`   ${entry.trim()}`));

    // 5. 验证历史保留
    console.log('\n5. ✅ History Preservation Verification:');
    
    const expectedClasses = ['UserEntity', 'ProductEntity', 'GroupListEntity'];
    const foundClasses = [];
    
    expectedClasses.forEach(expectedClass => {
        const foundInImports = imports.some(imp => imp.includes(expectedClass.toLowerCase().replace('entity', '_entity')));
        const foundInMappings = functionMappings.some(mapping => mapping.includes(expectedClass));
        const foundInListType = listChildTypeEntries.some(entry => entry.includes(expectedClass));
        
        const found = foundInImports && foundInMappings && foundInListType;
        foundClasses.push({ name: expectedClass, found, foundInImports, foundInMappings, foundInListType });
        
        console.log(`   ${found ? '✅' : '❌'} ${expectedClass}:`);
        console.log(`      Import: ${foundInImports ? '✅' : '❌'}`);
        console.log(`      Mapping: ${foundInMappings ? '✅' : '❌'}`);
        console.log(`      ListType: ${foundInListType ? '✅' : '❌'}`);
    });

    // 6. 最终评估
    console.log('\n6. 🏆 Final Evaluation:');
    
    const allFound = foundClasses.every(cls => cls.found);
    const correctImportCount = imports.length === expectedClasses.length;
    const correctMappingCount = functionMappings.length === expectedClasses.length;
    const correctListTypeCount = listChildTypeEntries.length === expectedClasses.length;
    
    const checks = [
        { name: 'All classes preserved/added', passed: allFound },
        { name: 'Correct import count', passed: correctImportCount },
        { name: 'Correct mapping count', passed: correctMappingCount },
        { name: 'Correct ListType count', passed: correctListTypeCount }
    ];
    
    const passedChecks = checks.filter(check => check.passed).length;
    const totalChecks = checks.length;
    
    console.log(`Score: ${passedChecks}/${totalChecks} (${((passedChecks/totalChecks)*100).toFixed(1)}%)`);
    
    checks.forEach(check => {
        console.log(`   ${check.passed ? '✅' : '❌'} ${check.name}`);
    });
    
    if (passedChecks === totalChecks) {
        console.log('\n🎉 PERFECT: History preservation works correctly!');
        console.log('   • All existing classes are preserved');
        console.log('   • New classes are properly added');
        console.log('   • No historical content is lost');
        console.log('   • Matches original plugin behavior exactly');
    } else {
        console.log('\n⚠️  ISSUES DETECTED:');
        const failedChecks = checks.filter(check => !check.passed);
        failedChecks.forEach(check => {
            console.log(`   • ${check.name}: FAILED`);
        });
    }

    console.log('\n📊 Summary:');
    console.log(`   • ${existingClasses.length} existing classes`);
    console.log(`   • ${newClasses.length} new classes`);
    console.log(`   • ${allClasses.length} total classes`);
    console.log(`   • ${imports.length} imports generated`);
    console.log(`   • ${functionMappings.length} function mappings created`);
    console.log(`   • ${listChildTypeEntries.length} _getListChildType entries`);
    console.log(`   • ${passedChecks}/${totalChecks} validation checks passed`);

} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
}
