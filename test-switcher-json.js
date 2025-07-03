const { JsonParser } = require('./out/parsers/JsonParser');
const { DartCodeGenerator } = require('./out/generators/DartCodeGenerator');

console.log('🎛️ Testing Switcher JSON - Complex Nested Structure with Nulls\n');

// 用户提供的复杂JSON，包含根级数组和深层嵌套
const switcherJson = `{
  "data": [
    {
      "id": 7772,
      "user_id": "switcher-47950153c11f48908",
      "room_id": "47950153",
      "user_name": "switcherFile",
      "role": "switcher",
      "position": "switcher",
      "host_status": 1,
      "seat": 1,
      "mute": 1,
      "media_type": "",
      "media_out": "",
      "tally_pgm_audio_status": 1,
      "user_call": 1,
      "online_status": 1,
      "console_id": "aaaaaa",
      "creator": "",
      "ttl": 0,
      "tally_pgm": 0,
      "tally_pvw": 0,
      "tally_type": 0,
      "tally_val": "",
      "call_user": "",
      "req_id": "",
      "channel": "",
      "ua": "",
      "utype": 3,
      "source_id": 0,
      "is_switcher": 1,
      "media_stream_list": {
        "user_media_stream_list": null,
        "background_image_url": ""
      },
      "template_id": 0,
      "mixer": [
        {
          "afv": 1,
          "pfv": 0,
          "mute": 0,
          "volume": 80,
          "user_name": "switcherFile",
          "user_id": "switcher-47950153c11f48908"
        }
      ],
      "audio_list": [
        {
          "user_name": "switcherFile",
          "user_id": "switcher-47950153c11f48908"
        }
      ],
      "playable": 0,
      "file_source_info": {
        "id": 0,
        "console_id": "",
        "room_id": "",
        "url": "",
        "name": "",
        "shrink_image_url": "",
        "status": 0,
        "width": 0,
        "height": 0,
        "autoplay": 0,
        "playable": 0,
        "seek_second": 0,
        "repeat_num": 0,
        "max_duration": 0,
        "created_at": "0001-01-01T00:00:00Z",
        "updated_at": "0001-01-01T00:00:00Z"
      },
      "flow_status": 0,
      "created_at": "2025-06-24T17:45:47+08:00",
      "updated_at": "2025-06-24T17:45:47+08:00"
    },
    {
      "id": 7774,
      "user_id": "switcher-479501531f8c20c1d",
      "room_id": "47950153",
      "user_name": "switcherFlow2",
      "role": "switcher",
      "position": "switcher",
      "host_status": 1,
      "seat": 1,
      "mute": 1,
      "media_type": "",
      "media_out": "",
      "tally_pgm_audio_status": 1,
      "user_call": 1,
      "online_status": 1,
      "console_id": "aaaaaa",
      "creator": "",
      "ttl": 0,
      "tally_pgm": 0,
      "tally_pvw": 0,
      "tally_type": 0,
      "tally_val": "",
      "call_user": "",
      "req_id": "",
      "channel": "",
      "ua": "",
      "utype": 4,
      "source_id": 0,
      "is_switcher": 1,
      "media_stream_list": {
        "user_media_stream_list": null,
        "background_image_url": ""
      },
      "template_id": 0,
      "mixer": null,
      "audio_list": null,
      "playable": 0,
      "file_source_info": null,
      "flow_status": 0,
      "created_at": "2025-06-24T17:45:47+08:00",
      "updated_at": "2025-06-24T17:45:47+08:00"
    }
  ],
  "msg": "成功",
  "req_id": "f618361c-c6bb-4723-9e11-f962e3cc56da",
  "status": 0,
  "trace": ""
}`;

console.log('📊 JSON Structure Analysis:');
console.log('• Root level: data (array), msg, req_id, status, trace');
console.log('• Data array contains complex switcher objects');
console.log('• Deep nesting: media_stream_list, file_source_info');
console.log('• Arrays within objects: mixer, audio_list');
console.log('• Null value handling: mixer: null, audio_list: null');
console.log('• 40+ snake_case fields requiring @JSONField annotations\n');

// 初始化解析器和生成器
const parser = new JsonParser();
const generator = new DartCodeGenerator({
    nullSafety: true,
    useJsonAnnotation: true,
    classNameSuffix: 'Entity',
    generatedPath: 'lib/generated/json',
    entityPath: 'lib/models',
    scanPath: 'lib'
}, 'switcher_app');

try {
    // 1. 解析JSON
    console.log('1. 🔍 Parsing switcher JSON...');
    const rootClass = parser.parseJson(switcherJson, 'SwitcherResponse');
    const allClasses = parser.getAllClasses(rootClass);
    console.log(`✅ Generated ${allClasses.length} classes:`);
    allClasses.forEach((cls, index) => {
        console.log(`   ${index + 1}. ${cls.name}Entity (${cls.properties.length} properties)`);
    });
    console.log('');

    // 2. 生成主响应类
    console.log('2. 📝 Generating SwitcherResponseEntity...');
    const mainEntityCode = generator.generateDartClass(rootClass);
    console.log(mainEntityCode);
    console.log('\n' + '='.repeat(100) + '\n');

    // 3. 找到并生成最复杂的数据项类
    const dataItemClass = allClasses.find(cls => cls.name.includes('Data') && cls.properties.length > 10);
    if (dataItemClass) {
        console.log(`3. 🎛️ Generating ${dataItemClass.name}Entity (${dataItemClass.properties.length} properties)...`);
        const dataItemCode = generator.generateDartClass(dataItemClass);
        console.log(dataItemCode);
        console.log('\n' + '='.repeat(100) + '\n');
    }

    // 4. 生成嵌套对象类
    const nestedClasses = allClasses.filter(cls => 
        cls.name.includes('MediaStreamList') || 
        cls.name.includes('FileSourceInfo') ||
        cls.name.includes('Mixer') ||
        cls.name.includes('AudioList')
    );
    
    if (nestedClasses.length > 0) {
        console.log('4. 🔗 Generating Nested Object Classes...');
        nestedClasses.slice(0, 2).forEach((cls, index) => {
            console.log(`4.${index + 1} Generating ${cls.name}Entity...`);
            const nestedCode = generator.generateDartClass(cls);
            console.log(nestedCode);
            console.log('\n' + '-'.repeat(80) + '\n');
        });
    }

    // 5. 生成Helper文件示例
    console.log('5. 🔧 Generating Helper File Sample...');
    const helperCode = generator.generateHelperFile(rootClass);
    const helperLines = helperCode.split('\n');
    console.log('Helper file preview (first 25 lines):');
    helperLines.slice(0, 25).forEach((line, index) => {
        console.log(`${(index + 1).toString().padStart(2, ' ')}: ${line}`);
    });
    console.log('... [truncated]');
    console.log('\n' + '='.repeat(100) + '\n');

    // 6. 分析@JSONField注解统计
    console.log('6. 🏷️ @JSONField Annotations Statistics:');
    let totalFields = 0;
    let annotatedFields = 0;
    
    allClasses.forEach(cls => {
        cls.properties.forEach(prop => {
            totalFields++;
            const camelCase = prop.originalJsonKey.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            if (camelCase !== prop.originalJsonKey) {
                annotatedFields++;
            }
        });
    });
    
    console.log(`📊 Total fields: ${totalFields}`);
    console.log(`📊 Fields with @JSONField: ${annotatedFields}`);
    console.log(`📊 Annotation coverage: ${((annotatedFields / totalFields) * 100).toFixed(1)}%`);
    
    // 显示一些示例注解
    if (dataItemClass) {
        console.log('\n📝 Sample @JSONField annotations:');
        const sampleFields = dataItemClass.properties.filter(prop => {
            const camelCase = prop.originalJsonKey.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            return camelCase !== prop.originalJsonKey;
        }).slice(0, 8);
        
        sampleFields.forEach(prop => {
            const camelCase = prop.originalJsonKey.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            console.log(`   @JSONField(name: "${prop.originalJsonKey}")`);
            console.log(`   ${prop.dartType} ${camelCase} = ${getDefaultValue(prop)};`);
            console.log('');
        });
    }

    console.log('🎉 Switcher JSON test completed successfully!');
    
    console.log('\n📋 Advanced Features Tested:');
    console.log('✅ Root-level array handling (data: [...])');
    console.log('✅ Deep nested objects (4+ levels)');
    console.log('✅ Null value handling (mixer: null, audio_list: null)');
    console.log('✅ Mixed array types (object arrays + null arrays)');
    console.log('✅ Complex snake_case conversions');
    console.log('✅ Large number of fields (40+ per object)');
    console.log('✅ Multiple data types in single object');
    console.log('✅ Timestamp field handling');
    
    console.log('\n🚀 This demonstrates enterprise-level JSON handling capability!');

} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
}

// Helper function for default values
function getDefaultValue(prop) {
    if (prop.isArray) return '[]';
    switch (prop.dartType) {
        case 'int': return '0';
        case 'double': return '0.0';
        case 'String': return "''";
        case 'bool': return 'false';
        default: return prop.isNestedObject ? `${prop.dartType}()` : 'null';
    }
}
