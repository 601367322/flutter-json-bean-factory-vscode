const { JsonParser } = require('./out/parsers/JsonParser');
const { DartCodeGenerator } = require('./out/generators/DartCodeGenerator');

console.log('🎯 Testing Original Plugin Style - Exact Match\n');

// 使用与您提供的原版示例相似的JSON结构
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

console.log('📋 Expected Original Style:');
console.log('• GroupListEntity (main class)');
console.log('• Group (nested class for group_list items)');
console.log('• UserInfo (nested class for user_list items)');
console.log('• List<Group> groupList');
console.log('• List<UserInfo> userList');
console.log('• All classes in single file\n');

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

    // 2. 生成单文件Entity类
    console.log('2. 📝 Generating Original Style Single File...');
    const singleFileCode = generator.generateDartClass(rootClass);
    
    // 显示生成的代码
    console.log('Generated Code:');
    console.log('='.repeat(100));
    console.log(singleFileCode);
    console.log('='.repeat(100));

    // 3. 验证原版风格特性
    console.log('\n3. ✅ Verification Against Original Style:');
    const lines = singleFileCode.split('\n');
    
    // 检查类声明
    const classDeclarations = lines.filter(line => line.includes('class ') && line.includes('{'));
    console.log(`📋 Classes Found: ${classDeclarations.length}`);
    classDeclarations.forEach(cls => console.log(`   ${cls.trim()}`));
    
    // 检查字段类型
    const listFields = lines.filter(line => line.includes('List<') && line.includes(' = []'));
    console.log(`\n🔧 List Fields: ${listFields.length}`);
    listFields.forEach(field => console.log(`   ${field.trim()}`));
    
    // 检查@JSONField注解
    const jsonFieldAnnotations = lines.filter(line => line.includes('@JSONField(name:'));
    console.log(`\n🏷️ @JSONField Annotations: ${jsonFieldAnnotations.length}`);
    jsonFieldAnnotations.slice(0, 8).forEach(annotation => console.log(`   ${annotation.trim()}`));
    if (jsonFieldAnnotations.length > 8) {
        console.log(`   ... and ${jsonFieldAnnotations.length - 8} more`);
    }
    
    // 检查导入
    const imports = lines.filter(line => line.startsWith('import '));
    console.log(`\n📦 Imports: ${imports.length}`);
    imports.forEach(imp => console.log(`   ${imp}`));

    // 4. 与原版对比
    console.log('\n4. 🎯 Comparison with Original Plugin:');
    
    // 检查是否有正确的类名
    const hasGroupListEntity = classDeclarations.some(cls => cls.includes('GroupListEntity'));
    const hasGroup = classDeclarations.some(cls => cls.includes('class Group '));
    const hasUserInfo = classDeclarations.some(cls => cls.includes('class UserInfo '));
    
    console.log(`   GroupListEntity class: ${hasGroupListEntity ? '✅ FOUND' : '❌ MISSING'}`);
    console.log(`   Group class: ${hasGroup ? '✅ FOUND' : '❌ MISSING'}`);
    console.log(`   UserInfo class: ${hasUserInfo ? '✅ FOUND' : '❌ MISSING'}`);
    
    // 检查字段类型
    const hasGroupList = listFields.some(field => field.includes('List<Group>') && field.includes('groupList'));
    const hasUserList = listFields.some(field => field.includes('List<UserInfo>') && field.includes('userList'));
    
    console.log(`   List<Group> groupList: ${hasGroupList ? '✅ FOUND' : '❌ MISSING'}`);
    console.log(`   List<UserInfo> userList: ${hasUserList ? '✅ FOUND' : '❌ MISSING'}`);
    
    // 检查单文件结构
    const allInOneFile = classDeclarations.length >= 2;
    console.log(`   Single file structure: ${allInOneFile ? '✅ YES' : '❌ NO'}`);
    
    // 检查导入数量（应该很少）
    const minimalImports = imports.length <= 4;
    console.log(`   Minimal imports: ${minimalImports ? '✅ YES' : '❌ NO'} (${imports.length} imports)`);

    // 5. 最终评分
    console.log('\n5. 🏆 Final Score:');
    const checks = [hasGroupListEntity, hasGroup, hasUserInfo, hasGroupList, hasUserList, allInOneFile, minimalImports];
    const passed = checks.filter(check => check).length;
    const total = checks.length;
    
    console.log(`   Score: ${passed}/${total} (${((passed/total)*100).toFixed(1)}%)`);
    
    if (passed === total) {
        console.log('   🎉 PERFECT MATCH with original plugin style!');
    } else if (passed >= total * 0.8) {
        console.log('   ✅ GOOD MATCH with original plugin style');
    } else {
        console.log('   ⚠️  NEEDS IMPROVEMENT to match original plugin style');
    }

} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
}
