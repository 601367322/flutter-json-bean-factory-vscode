const { JsonParser } = require('./out/parsers/JsonParser');
const { DartCodeGenerator } = require('./out/generators/DartCodeGenerator');

console.log('📄 Testing Single File Generation - Original Plugin Style\n');

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

console.log('🎯 Testing Single File Features:');
console.log('• All classes in one file');
console.log('• Nested classes use simple names (Group, UserInfo)');
console.log('• No Entity suffixes in field types');
console.log('• Original plugin style structure\n');

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
    console.log('2. 📝 Generating Single File Entity...');
    const singleFileCode = generator.generateDartClass(rootClass);
    
    console.log('Generated Single File:');
    console.log('='.repeat(80));
    console.log(singleFileCode);
    console.log('='.repeat(80));

    // 3. 分析生成的代码
    console.log('\n3. 🔍 Analyzing Generated Code...');
    const lines = singleFileCode.split('\n');
    
    // 检查导入
    const imports = lines.filter(line => line.startsWith('import '));
    console.log(`📦 Imports: ${imports.length} found`);
    imports.forEach(imp => console.log(`   ${imp}`));
    
    // 检查类声明
    const classDeclarations = lines.filter(line => line.includes('class ') && line.includes('{'));
    console.log(`\n📋 Classes: ${classDeclarations.length} found`);
    classDeclarations.forEach(cls => console.log(`   ${cls.trim()}`));
    
    // 检查字段类型
    const fieldTypes = lines.filter(line => 
        line.includes('List<') || (line.includes(' = ') && line.includes('()')
    ));
    console.log(`\n🔧 Field Types: ${fieldTypes.length} found`);
    fieldTypes.forEach(field => console.log(`   ${field.trim()}`));

    console.log('\n🎉 Single file generation test completed!');

} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
}
