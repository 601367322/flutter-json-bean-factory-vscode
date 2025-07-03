const { JsonParser } = require('./out/parsers/JsonParser');
const { DartCodeGenerator } = require('./out/generators/DartCodeGenerator');

// Demo JSON data
const sampleJson = `{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "age": 30,
  "isActive": true,
  "profile": {
    "bio": "Software developer",
    "avatar": "https://example.com/avatar.jpg"
  },
  "skills": ["Flutter", "Dart", "JavaScript"],
  "projects": [
    {
      "id": 101,
      "name": "E-commerce App",
      "technologies": ["Flutter", "Firebase"]
    }
  ]
}`;

console.log('🚀 Flutter JSON Bean Factory Demo\n');

// Initialize parser and generator
const parser = new JsonParser();
const generator = new DartCodeGenerator();

try {
    // Validate JSON
    console.log('1. Validating JSON...');
    const validation = parser.validateJson(sampleJson);
    if (!validation.isValid) {
        throw new Error(`Invalid JSON: ${validation.error}`);
    }
    console.log('✅ JSON is valid\n');

    // Parse JSON
    console.log('2. Parsing JSON structure...');
    const rootClass = parser.parseJson(sampleJson, 'User');
    const allClasses = parser.getAllClasses(rootClass);
    console.log(`✅ Generated ${allClasses.length} classes: ${allClasses.map(c => c.name).join(', ')}\n`);

    // Generate Dart code
    console.log('3. Generating Dart code...\n');
    
    allClasses.forEach((cls, index) => {
        console.log(`--- Class ${index + 1}: ${cls.name} ---`);
        const dartCode = generator.generateDartClass(cls);
        console.log(dartCode);
        console.log('\n');
    });

    console.log('🎉 Demo completed successfully!');

} catch (error) {
    console.error('❌ Error:', error.message);
}
