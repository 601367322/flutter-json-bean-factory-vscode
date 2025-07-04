const { DartClassParser } = require('./out/parsers/DartClassParser');
const { DartCodeGenerator } = require('./out/generators/DartCodeGenerator');

// 测试格式对齐
const testDartContent = `@JsonSerializable()
class VisitorEntity {
    int? accessCount;
    String? header;
    String? id;
    bool? isCustomer;
    String? lastAccessRecord;
    String? lastVisitTime;
    String? nickname;
    int? orderNum;
    String? diffTimeStr;
    bool? isRead;

    VisitorEntity();
}`;

function testFormatAlignment() {
    console.log('Testing format alignment...');
    
    const parser = new DartClassParser();
    const dartClasses = parser.parseDartFile(testDartContent);
    
    const visitorEntity = dartClasses.find(c => c.className === 'VisitorEntity');
    if (!visitorEntity) {
        console.log('❌ VisitorEntity not found');
        return;
    }
    
    console.log(`Found ${visitorEntity.properties.length} properties`);
    
    // 转换为JsonClass
    const jsonClass = parser.convertToJsonClass(visitorEntity);
    
    const config = {
        classNamePrefix: '',
        classNameSuffix: '',
        nullSafety: true,
        forceNonNullable: false,
        generateCopyWith: true,
        generateToString: true,
        generateFromJson: true,
        generateToJson: true,
        useJsonAnnotation: true,
        entityPath: 'lib/models',
        generatedPath: 'lib/generated/json'
    };
    
    const generator = new DartCodeGenerator(config, 'test');
    
    // 生成copyWith扩展
    console.log('\n=== Generated copyWith extension ===');
    const copyWithExtension = generator.generateCopyWithExtension('VisitorEntity', jsonClass.properties);
    console.log(copyWithExtension);
    
    // 验证格式
    console.log('\n=== Format Validation ===');
    const lines = copyWithExtension.split('\n');
    
    // 检查缩进
    const methodLine = lines.find(line => line.includes('copyWith({'));
    const paramLine = lines.find(line => line.includes('int? accessCount'));
    const returnLine = lines.find(line => line.includes('return VisitorEntity()'));
    const assignmentLine = lines.find(line => line.includes('..accessCount ='));
    const closingBraceLine = lines.find(line => line.trim() === '}' && !line.includes('copyWith'));
    
    console.log('Method declaration:', methodLine?.replace(/\t/g, '[TAB]') || 'NOT FOUND');
    console.log('Parameter line:', paramLine?.replace(/\t/g, '[TAB]') || 'NOT FOUND');
    console.log('Return line:', returnLine?.replace(/\t/g, '[TAB]') || 'NOT FOUND');
    console.log('Assignment line:', assignmentLine?.replace(/\t/g, '[TAB]') || 'NOT FOUND');
    console.log('Closing brace:', closingBraceLine?.replace(/\t/g, '[TAB]') || 'NOT FOUND');
    
    // 检查是否使用空格而不是制表符
    const usesSpaces = methodLine?.startsWith('  ') && !methodLine?.includes('\t');
    const paramUsesSpaces = paramLine?.startsWith('    ') && !paramLine?.includes('\t');
    const returnUsesSpaces = returnLine?.startsWith('    ') && !returnLine?.includes('\t');
    const assignmentUsesSpaces = assignmentLine?.startsWith('      ') && !assignmentLine?.includes('\t');
    
    console.log('\nIndentation validation:');
    console.log('Method uses spaces (2):', usesSpaces ? '✅ CORRECT' : '❌ INCORRECT');
    console.log('Parameters use spaces (4):', paramUsesSpaces ? '✅ CORRECT' : '❌ INCORRECT');
    console.log('Return uses spaces (4):', returnUsesSpaces ? '✅ CORRECT' : '❌ INCORRECT');
    console.log('Assignments use spaces (6):', assignmentUsesSpaces ? '✅ CORRECT' : '❌ INCORRECT');
    
    // 检查分号位置
    const lastAssignmentLine = lines[lines.length - 3]; // 倒数第三行应该是最后一个赋值
    const hasSemicolonAtEnd = lastAssignmentLine?.endsWith(';');
    const hasStandaloneSemicolon = lines.some(line => line.trim() === ';');
    
    console.log('\nSemicolon validation:');
    console.log('Last assignment ends with semicolon:', hasSemicolonAtEnd ? '✅ CORRECT' : '❌ INCORRECT');
    console.log('No standalone semicolon line:', !hasStandaloneSemicolon ? '✅ CORRECT' : '❌ INCORRECT');
    
    // 整体格式检查
    const overallFormatCorrect = usesSpaces && paramUsesSpaces && returnUsesSpaces && 
                                assignmentUsesSpaces && hasSemicolonAtEnd && !hasStandaloneSemicolon;
    
    console.log('\n=== Overall Format Check ===');
    if (overallFormatCorrect) {
        console.log('✅ FORMAT IS CORRECT - Matches original plugin style');
    } else {
        console.log('❌ FORMAT NEEDS ADJUSTMENT');
    }
}

// 运行测试
testFormatAlignment();
console.log('\nTest completed.');
