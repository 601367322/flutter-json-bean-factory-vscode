// 测试toCamelCase函数
function toCamelCase(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

const testCases = [
    'user_id',
    'user_name', 
    'email_address',
    'group_list',
    'created_at',
    'profile_id',
    'display_name',
    'avatar_url',
    'bio_text'
];

console.log('🧪 Testing toCamelCase function:\n');

testCases.forEach(testCase => {
    const camelCase = toCamelCase(testCase);
    const needsJsonField = camelCase !== testCase;
    
    console.log(`${testCase} → ${camelCase} (needsJsonField: ${needsJsonField})`);
});

console.log('\n✅ All test cases show needsJsonField: true, so @JSONField should be added!');
