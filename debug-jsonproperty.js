const { JsonParser } = require('./out/parsers/JsonParser');

console.log('🔍 Debugging JsonProperty names\n');

const testJson = `{
  "user_id": 123,
  "user_name": "John Doe",
  "email_address": "john@example.com"
}`;

const parser = new JsonParser();
const rootClass = parser.parseJson(testJson, 'User');

console.log('📊 JsonProperty details:');
rootClass.properties.forEach((prop, index) => {
    console.log(`${index + 1}. Property name: "${prop.name}"`);
    console.log(`   Dart type: ${prop.dartType}`);
    console.log(`   Is array: ${prop.isArray}`);
    console.log(`   Is nested: ${prop.isNestedObject}`);
    console.log('');
});

// 测试toCamelCase转换
function toCamelCase(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

console.log('🔄 CamelCase conversion test:');
rootClass.properties.forEach(prop => {
    const camelCase = toCamelCase(prop.name);
    const needsJsonField = camelCase !== prop.name;
    console.log(`"${prop.name}" → "${camelCase}" (needs @JSONField: ${needsJsonField})`);
});

console.log('\n🎯 This should help identify why @JSONField annotations are not showing up!');
