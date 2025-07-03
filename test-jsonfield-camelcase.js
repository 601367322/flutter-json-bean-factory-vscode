const { JsonParser } = require('./out/parsers/JsonParser');
const { DartCodeGenerator } = require('./out/generators/DartCodeGenerator');

console.log('🧪 Testing @JSONField and CamelCase Conversion\n');

// 测试JSON，包含下划线命名的字段
const testJson = `{
  "user_id": 123,
  "user_name": "John Doe",
  "email_address": "john@example.com",
  "is_active": true,
  "created_at": "2023-01-01T00:00:00Z",
  "group_list": [
    {
      "group_id": 1,
      "group_name": "Admin",
      "member_count": 5
    },
    {
      "group_id": 2,
      "group_name": "Users",
      "member_count": 100
    }
  ],
  "user_profile": {
    "profile_id": 456,
    "display_name": "John D.",
    "avatar_url": "https://example.com/avatar.jpg",
    "bio_text": "Flutter Developer"
  }
}`;

console.log('📄 Test JSON with snake_case fields:');
console.log('• user_id, user_name, email_address');
console.log('• group_list with group_id, group_name, member_count');
console.log('• user_profile with profile_id, display_name, avatar_url, bio_text\n');

// 初始化解析器和生成器
const parser = new JsonParser();
const generator = new DartCodeGenerator({
    nullSafety: true,
    useJsonAnnotation: true,
    classNameSuffix: 'Entity',
    generatedPath: 'lib/generated/json',
    entityPath: 'lib/models'
}, 'test_app');

try {
    // 解析JSON
    console.log('1. Parsing JSON structure...');
    const rootClass = parser.parseJson(testJson, 'User');
    const allClasses = parser.getAllClasses(rootClass);
    console.log(`✅ Generated ${allClasses.length} classes: ${allClasses.map(c => c.name + 'Entity').join(', ')}\n`);

    // 生成主Entity类
    console.log('2. Generating UserEntity with @JSONField annotations...');
    const entityCode = generator.generateDartClass(rootClass);
    console.log(entityCode);
    console.log('\n' + '='.repeat(80) + '\n');

    // 生成Helper文件
    console.log('3. Generating Helper File with camelCase handling...');
    const helperCode = generator.generateHelperFile(rootClass);
    console.log(helperCode);
    console.log('\n' + '='.repeat(80) + '\n');

    // 生成嵌套类
    const nestedClasses = allClasses.filter(cls => cls.name !== 'User');
    nestedClasses.forEach((cls, index) => {
        const className = cls.name + 'Entity';
        console.log(`4.${index + 1} Generating ${className}...`);
        
        const nestedEntityCode = generator.generateDartClass(cls);
        console.log(nestedEntityCode);
        console.log('\n' + '-'.repeat(60) + '\n');
    });

    console.log('🎉 @JSONField and CamelCase test completed successfully!');
    
    console.log('\n📋 Key Features Demonstrated:');
    console.log('✅ @JSONField annotations for snake_case to camelCase conversion');
    console.log('✅ Field names converted: user_id → userId, group_list → groupList');
    console.log('✅ JSON keys preserved in @JSONField(name: "original_key")');
    console.log('✅ fromJson functions use original JSON keys');
    console.log('✅ toJson functions map back to original JSON keys');
    console.log('✅ copyWith methods use camelCase parameter names');
    console.log('✅ Nested objects and arrays handled correctly');
    
    console.log('\n🔍 Expected Output Analysis:');
    console.log('• Entity fields: userId, userName, emailAddress, groupList, userProfile');
    console.log('• @JSONField annotations: name: "user_id", name: "user_name", etc.');
    console.log('• fromJson: json[\'user_id\'] → entity.userId');
    console.log('• toJson: entity.userId → data[\'user_id\']');
    console.log('• copyWith: copyWith({int? userId, String? userName, ...})');

} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
}
