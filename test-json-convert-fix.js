const { JsonParser } = require('./out/parsers/JsonParser');
const { DartCodeGenerator } = require('./out/generators/DartCodeGenerator');

console.log('🗂️ Testing JSON Convert Content Fix - Only Main Classes\n');

// 使用嵌套结构的JSON来测试json_convert_content.dart修复
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
          "room_id": "room-456",
          "user_name": "John Doe",
          "role": "admin",
          "position": "manager",
          "host_status": 1,
          "seat": 1,
          "mute": 0,
          "media_type": "video",
          "media_out": "stream1",
          "tally_pgm_audio_status": 1,
          "user_call": 1,
          "online_status": 1,
          "console_id": "console1",
          "creator": "system",
          "ttl": 3600,
          "tally_pgm": 1,
          "tally_pvw": 0,
          "tally_type": 1,
          "tally_val": "active",
          "call_user": "caller1",
          "req_id": "req-789",
          "channel": "ch1",
          "ua": "browser",
          "utype": 1,
          "created_at": "2023-01-01T00:00:00Z",
          "updated_at": "2023-01-01T01:00:00Z",
          "group_id": 1
        }
      ],
      "group_type": 1,
      "created_at": "2023-01-01T00:00:00Z"
    }
  ]
}`;

console.log('🎯 Expected JSON Convert Content:');
console.log('• Only import main file: group_list_entity.dart');
console.log('• Only one function mapping: GroupListEntity');
console.log('• Only one _getListChildType entry: GroupListEntity');
console.log('• No nested class mappings (Group, UserInfo)\n');

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
    const rootClass = parser.parseJson(testJson, 'GroupList');
    const allClasses = parser.getAllClasses(rootClass);
    console.log(`✅ Generated ${allClasses.length} classes:`);
    allClasses.forEach((cls, index) => {
        console.log(`   ${index + 1}. ${cls.name} (${cls.properties.length} properties)`);
    });
    console.log('');

    // 2. 生成json_convert_content.dart
    console.log('2. 🗂️ Generating JSON Convert Content...');
    const jsonConvertContent = generator.generateBaseJsonConvert(allClasses);
    
    console.log('JSON Convert Content:');
    console.log('='.repeat(120));
    console.log(jsonConvertContent);
    console.log('='.repeat(120));

    // 3. 分析json_convert_content.dart内容
    console.log('\n3. 📊 JSON Convert Content Analysis:');
    const lines = jsonConvertContent.split('\n');
    
    // 检查导入
    const imports = lines.filter(line => 
        line.startsWith('import \'package:') && line.includes('/models/')
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
    
    // 检查是否包含嵌套类引用
    const nestedClassReferences = lines.filter(line => 
        (line.includes('Group') || line.includes('UserInfo')) && 
        !line.includes('GroupList') && 
        (line.includes('.toString()') || line.includes('if (<'))
    );
    console.log(`\n🚫 Nested Class References: ${nestedClassReferences.length} (should be 0)`);
    if (nestedClassReferences.length > 0) {
        nestedClassReferences.forEach(ref => console.log(`   ❌ ${ref.trim()}`));
    }

    // 4. 验证与原版对比
    console.log('\n4. ✅ Comparison with Original Plugin:');
    
    const checks = [
        { 
            name: 'Only main file imported', 
            passed: imports.length === 1 && imports[0].includes('group_list_entity.dart'),
            details: `Expected 1 import, got ${imports.length}`
        },
        { 
            name: 'Only main class mapping', 
            passed: functionMappings.length === 1 && functionMappings[0].includes('GroupListEntity'),
            details: `Expected 1 mapping, got ${functionMappings.length}`
        },
        { 
            name: 'Only main class in _getListChildType', 
            passed: listChildTypeEntries.length === 1 && listChildTypeEntries[0].includes('GroupListEntity'),
            details: `Expected 1 entry, got ${listChildTypeEntries.length}`
        },
        { 
            name: 'No nested class references', 
            passed: nestedClassReferences.length === 0,
            details: `Expected 0 references, got ${nestedClassReferences.length}`
        }
    ];
    
    checks.forEach(check => {
        console.log(`   ${check.passed ? '✅' : '❌'} ${check.name}: ${check.details}`);
    });

    // 5. 最终评估
    console.log('\n5. 🏆 Final Evaluation:');
    
    const passedChecks = checks.filter(check => check.passed).length;
    const totalChecks = checks.length;
    
    console.log(`Score: ${passedChecks}/${totalChecks} (${((passedChecks/totalChecks)*100).toFixed(1)}%)`);
    
    if (passedChecks === totalChecks) {
        console.log('\n🎉 PERFECT: JSON Convert Content is correctly fixed!');
        console.log('   • Only main file is imported');
        console.log('   • Only main class has function mapping');
        console.log('   • Only main class in _getListChildType');
        console.log('   • No nested class references');
        console.log('   • Matches original plugin behavior exactly');
    } else {
        console.log('\n⚠️  ISSUES DETECTED:');
        const failedChecks = checks.filter(check => !check.passed);
        failedChecks.forEach(check => {
            console.log(`   • ${check.name}: ${check.details}`);
        });
    }

    console.log('\n📊 Summary:');
    console.log(`   • ${allClasses.length} classes parsed`);
    console.log(`   • ${imports.length} model imports in json_convert_content.dart`);
    console.log(`   • ${functionMappings.length} function mappings created`);
    console.log(`   • ${listChildTypeEntries.length} _getListChildType entries`);
    console.log(`   • ${nestedClassReferences.length} nested class references (should be 0)`);
    console.log(`   • ${passedChecks}/${totalChecks} validation checks passed`);

} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
}
