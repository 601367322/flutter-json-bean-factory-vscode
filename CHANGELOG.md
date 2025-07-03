# Change Log

All notable changes to the "Flutter JSON Bean Factory" extension will be documented in this file.

## [1.0.0] - 2025-01-03

### Added
- Initial release of Flutter JSON Bean Factory for VSCode
- Generate Dart model classes from JSON data
- Support for fromJson/toJson methods generation
- Null-safety support for Flutter 2.0+
- Nested object and array handling
- Customizable configuration options
- Keyboard shortcut (Alt+J) for quick generation
- Context menu integration
- Flutter project detection
- Automatic file organization in lib/models and lib/generated/json
- Support for complex JSON structures with multiple nesting levels
- Type-safe code generation with proper Dart type mapping
- Integration with json_annotation package (optional)
- Regeneration support for existing model classes

### Features
- **JSON Parsing**: Robust JSON validation and parsing
- **Code Generation**: Clean, readable Dart code generation
- **Project Integration**: Seamless Flutter project integration
- **Configuration**: Extensive customization options
- **User Experience**: Intuitive UI with input validation

### Supported Types
- String, int, double, bool
- DateTime (with automatic parsing)
- List<T> for arrays
- Nested objects with proper class generation
- Nullable types with null-safety support
- Dynamic types for flexible JSON handling

### Configuration Options
- Custom generation paths
- Class name prefixes and suffixes
- Null-safety toggle
- json_annotation integration
- Output directory customization

## [Unreleased]

### Planned Features
- JSON schema validation
- Custom type mappings
- Batch processing for multiple JSON files
- Integration with popular state management solutions
- Code formatting options
- Import statement optimization
- Support for JSON arrays as root elements
- Custom serialization annotations
- Integration with build_runner for code generation
- Support for inheritance and mixins

### Known Issues
- None currently reported

## Contributing

We welcome contributions! Please see our contributing guidelines for more information.

## Support

If you encounter any issues or have feature requests, please file them in our GitHub repository.
