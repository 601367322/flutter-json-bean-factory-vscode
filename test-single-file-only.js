const { JsonParser } = require('./out/parsers/JsonParser');
const { DartCodeGenerator } = require('./out/generators/DartCodeGenerator');

console.log('📄 Testing Single File Only Generation - No Duplicate Files\n');

// 使用嵌套结构的JSON来测试单文件生成
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

console.log('🎯 Testing Requirements:');
console.log('• Only one main file should be generated');
console.log('• No separate files for nested classes');
console.log('• Helper file uses correct class names');
console.log('• No class name conflicts\n');

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

    // 2. 生成主Entity文件（包含所有类）
    console.log('2. 📝 Generating Main Entity File (Single File)...');
    const mainEntityCode = generator.generateDartClass(rootClass);
    
    console.log('Main Entity File Content:');
    console.log('='.repeat(100));
    console.log(mainEntityCode);
    console.log('='.repeat(100));

    // 3. 生成Helper文件
    console.log('\n3. 🔧 Generating Helper File...');
    const helperCode = generator.generateHelperFile(rootClass);
    
    console.log('Helper File Content (first 50 lines):');
    console.log('='.repeat(100));
    const helperLines = helperCode.split('\n');
    helperLines.slice(0, 50).forEach((line, index) => {
        console.log(`${(index + 1).toString().padStart(2, ' ')}: ${line}`);
    });
    if (helperLines.length > 50) {
        console.log(`... and ${helperLines.length - 50} more lines`);
    }
    console.log('='.repeat(100));

    // 4. 验证单文件特性
    console.log('\n4. ✅ Single File Verification:');
    
    const mainLines = mainEntityCode.split('\n');
    
    // 检查类声明数量
    const classDeclarations = mainLines.filter(line => line.includes('class ') && line.includes('{'));
    console.log(`📋 Classes in main file: ${classDeclarations.length}`);
    classDeclarations.forEach(cls => console.log(`   ${cls.trim()}`));
    
    // 检查导入数量（应该很少，因为都在一个文件中）
    const imports = mainLines.filter(line => line.startsWith('import '));
    console.log(`\n📦 Imports in main file: ${imports.length}`);
    imports.forEach(imp => console.log(`   ${imp}`));
    
    // 检查是否有外部Entity类导入（不应该有）
    const entityImports = imports.filter(line => line.includes('/models/') && line.includes('_entity.dart'));
    console.log(`\n🚫 External entity imports: ${entityImports.length} (should be 0)`);
    if (entityImports.length > 0) {
        entityImports.forEach(imp => console.log(`   ❌ ${imp}`));
    }

    // 5. 验证Helper文件类型引用
    console.log('\n5. 🔧 Helper File Type Verification:');
    
    // 检查Helper文件中的类型引用
    const typeReferences = helperLines.filter(line => 
        line.includes('Group') || line.includes('UserInfo')
    );
    console.log(`📋 Type references in helper: ${typeReferences.length}`);
    typeReferences.slice(0, 10).forEach(ref => {
        const trimmed = ref.trim();
        if (trimmed) {
            console.log(`   ${trimmed}`);
        }
    });
    if (typeReferences.length > 10) {
        console.log(`   ... and ${typeReferences.length - 10} more references`);
    }
    
    // 检查是否使用了错误的Entity后缀类型
    const badEntityReferences = helperLines.filter(line => 
        line.includes('GroupEntity') || line.includes('UserInfoEntity')
    );
    console.log(`\n🚫 Bad Entity references: ${badEntityReferences.length} (should be 0)`);
    if (badEntityReferences.length > 0) {
        badEntityReferences.forEach(ref => console.log(`   ❌ ${ref.trim()}`));
    }

    // 6. 最终评估
    console.log('\n6. 🏆 Final Evaluation:');
    
    const checks = [
        { name: 'All classes in one file', passed: classDeclarations.length === allClasses.length },
        { name: 'Minimal imports', passed: imports.length <= 4 },
        { name: 'No external entity imports', passed: entityImports.length === 0 },
        { name: 'Correct type references', passed: typeReferences.length > 0 },
        { name: 'No bad Entity references', passed: badEntityReferences.length === 0 }
    ];
    
    const passedChecks = checks.filter(check => check.passed).length;
    const totalChecks = checks.length;
    
    console.log(`Score: ${passedChecks}/${totalChecks} (${((passedChecks/totalChecks)*100).toFixed(1)}%)`);
    
    checks.forEach(check => {
        console.log(`   ${check.passed ? '✅' : '❌'} ${check.name}`);
    });
    
    if (passedChecks === totalChecks) {
        console.log('\n🎉 PERFECT: Single file generation works correctly!');
        console.log('   • No duplicate class files will be generated');
        console.log('   • No class name conflicts');
        console.log('   • Helper file uses correct type references');
        console.log('   • Matches original plugin behavior');
    } else {
        console.log('\n⚠️  ISSUES DETECTED:');
        const failedChecks = checks.filter(check => !check.passed);
        failedChecks.forEach(check => {
            console.log(`   • ${check.name}: FAILED`);
        });
    }

    console.log('\n📊 Summary:');
    console.log(`   • ${allClasses.length} classes parsed`);
    console.log(`   • ${classDeclarations.length} classes in main file`);
    console.log(`   • ${imports.length} imports in main file`);
    console.log(`   • ${typeReferences.length} type references in helper`);
    console.log(`   • ${passedChecks}/${totalChecks} validation checks passed`);

} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
}
