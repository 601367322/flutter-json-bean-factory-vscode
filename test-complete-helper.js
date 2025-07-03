const { JsonParser } = require('./out/parsers/JsonParser');
const { DartCodeGenerator } = require('./out/generators/DartCodeGenerator');

console.log('🔧 Testing Complete Helper File Generation - All Functions\n');

// 使用嵌套结构的JSON来测试完整Helper文件生成
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

console.log('🎯 Expected Helper Functions:');
console.log('• $GroupListEntityFromJson');
console.log('• $GroupListEntityToJson');
console.log('• GroupListEntityExtension');
console.log('• $GroupFromJson');
console.log('• $GroupToJson');
console.log('• GroupExtension');
console.log('• $UserInfoFromJson');
console.log('• $UserInfoToJson');
console.log('• UserInfoExtension\n');

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

    // 2. 生成完整Helper文件
    console.log('2. 🔧 Generating Complete Helper File...');
    const helperCode = generator.generateHelperFile(rootClass);
    
    console.log('Complete Helper File:');
    console.log('='.repeat(120));
    console.log(helperCode);
    console.log('='.repeat(120));

    // 3. 分析Helper文件内容
    console.log('\n3. 📊 Helper File Analysis:');
    const helperLines = helperCode.split('\n');
    
    // 检查导入
    const imports = helperLines.filter(line => line.startsWith('import '));
    console.log(`📦 Imports: ${imports.length}`);
    imports.forEach(imp => console.log(`   ${imp}`));
    
    // 检查函数定义
    const fromJsonFunctions = helperLines.filter(line => line.includes('FromJson(Map<String, dynamic> json)'));
    const toJsonFunctions = helperLines.filter(line => line.includes('ToJson(') && line.includes('entity)'));
    const extensions = helperLines.filter(line => line.includes('extension ') && line.includes('Extension on '));
    
    console.log(`\n🔧 Functions Found:`);
    console.log(`   FromJson functions: ${fromJsonFunctions.length}`);
    fromJsonFunctions.forEach(func => console.log(`     ${func.trim()}`));
    
    console.log(`   ToJson functions: ${toJsonFunctions.length}`);
    toJsonFunctions.forEach(func => console.log(`     ${func.trim()}`));
    
    console.log(`   Extension methods: ${extensions.length}`);
    extensions.forEach(ext => console.log(`     ${ext.trim()}`));

    // 4. 验证与原版对比
    console.log('\n4. ✅ Comparison with Original Plugin:');
    
    const expectedFunctions = [
        '$GroupListEntityFromJson',
        '$GroupListEntityToJson', 
        'GroupListEntityExtension',
        '$GroupFromJson',
        '$GroupToJson',
        'GroupExtension',
        '$UserInfoFromJson',
        '$UserInfoToJson',
        'UserInfoExtension'
    ];
    
    const foundFunctions = [];
    expectedFunctions.forEach(expectedFunc => {
        const found = helperLines.some(line => line.includes(expectedFunc));
        foundFunctions.push({ name: expectedFunc, found });
        console.log(`   ${found ? '✅' : '❌'} ${expectedFunc}: ${found ? 'FOUND' : 'MISSING'}`);
    });
    
    // 5. 生成json_convert_content.dart
    console.log('\n5. 🗂️ Generating JSON Convert Content...');
    const jsonConvertContent = generator.generateBaseJsonConvert(allClasses);
    const jsonConvertLines = jsonConvertContent.split('\n');
    
    // 检查导入
    const jsonConvertImports = jsonConvertLines.filter(line => 
        line.startsWith('import \'package:') && line.includes('/models/')
    );
    console.log(`📦 JSON Convert Imports: ${jsonConvertImports.length}`);
    jsonConvertImports.forEach(imp => console.log(`   ${imp}`));
    
    // 检查函数映射
    const functionMappings = jsonConvertLines.filter(line => 
        line.includes('.toString(): ') && line.includes('.fromJson')
    );
    console.log(`\n🔗 Function Mappings: ${functionMappings.length}`);
    functionMappings.forEach(mapping => console.log(`   ${mapping.trim()}`));

    // 6. 最终评估
    console.log('\n6. 🏆 Final Evaluation:');
    
    const passedFunctions = foundFunctions.filter(f => f.found).length;
    const totalFunctions = foundFunctions.length;
    const hasCorrectImports = imports.length === 1 && imports[0].includes('/models/group_list_entity.dart');
    const hasCorrectMappings = functionMappings.length === allClasses.length;
    
    console.log(`Function completeness: ${passedFunctions}/${totalFunctions} (${((passedFunctions/totalFunctions)*100).toFixed(1)}%)`);
    console.log(`Import correctness: ${hasCorrectImports ? 'YES ✅' : 'NO ❌'}`);
    console.log(`Mapping completeness: ${hasCorrectMappings ? 'YES ✅' : 'NO ❌'} (${functionMappings.length}/${allClasses.length})`);
    
    const allChecks = [
        passedFunctions === totalFunctions,
        hasCorrectImports,
        hasCorrectMappings
    ];
    
    const passedChecks = allChecks.filter(check => check).length;
    
    if (passedChecks === allChecks.length) {
        console.log('\n🎉 PERFECT: Complete helper file generation works correctly!');
        console.log('   • All expected functions are generated');
        console.log('   • Only main file is imported (no nested class files)');
        console.log('   • All classes have function mappings');
        console.log('   • Matches original plugin behavior exactly');
    } else {
        console.log('\n⚠️  ISSUES DETECTED:');
        if (passedFunctions < totalFunctions) {
            const missingFunctions = foundFunctions.filter(f => !f.found);
            console.log(`   • Missing functions: ${missingFunctions.map(f => f.name).join(', ')}`);
        }
        if (!hasCorrectImports) {
            console.log('   • Incorrect imports in helper file');
        }
        if (!hasCorrectMappings) {
            console.log('   • Incomplete function mappings in json_convert_content.dart');
        }
    }

    console.log('\n📊 Summary:');
    console.log(`   • ${allClasses.length} classes parsed`);
    console.log(`   • ${fromJsonFunctions.length} fromJson functions generated`);
    console.log(`   • ${toJsonFunctions.length} toJson functions generated`);
    console.log(`   • ${extensions.length} extension methods generated`);
    console.log(`   • ${jsonConvertImports.length} imports in json_convert_content.dart`);
    console.log(`   • ${functionMappings.length} function mappings created`);

} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
}
