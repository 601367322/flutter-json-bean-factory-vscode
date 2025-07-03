# Flutter JSON Bean Factory for VSCode

A VSCode extension that generates Dart beans from JSON with fromJson/toJson methods for Flutter development. This is a port of the popular IntelliJ IDEA plugin [FlutterJsonBeanFactory](https://github.com/fluttercandies/FlutterJsonBeanFactory).

## Features

- 🚀 Generate Dart model classes from JSON
- 📝 Automatic fromJson/toJson methods generation
- 🔄 Support for nested objects and arrays
- 🎯 Null-safety support
- ⚙️ Customizable generation paths and naming conventions
- 🔧 Integration with json_annotation package
- ⌨️ Keyboard shortcuts (Alt+J)
- 📁 Right-click context menu integration

## Usage

### Generate from JSON

1. Right-click on a folder in the Explorer
2. Select "Generate Dart Bean from JSON"
3. Enter your JSON data
4. Specify the class name
5. The extension will generate the Dart model class with fromJson/toJson methods

### Regenerate existing beans

1. Open a Dart file containing a model class
2. Press `Alt+J` or right-click and select "Regenerate Dart Bean"
3. The extension will update the fromJson/toJson methods

## Configuration

You can customize the extension behavior in VSCode settings:

### Basic Settings
- `flutter-json-bean-factory.generatedPath`: Path for generated JSON helper files
- `flutter-json-bean-factory.entityPath`: Path for entity/model files
- `flutter-json-bean-factory.nullSafety`: Enable null-safety (default: true)
- `flutter-json-bean-factory.useJsonAnnotation`: Use json_annotation package
- `flutter-json-bean-factory.classNamePrefix`: Prefix for class names
- `flutter-json-bean-factory.classNameSuffix`: Suffix for class names

### Advanced Null Handling
- `flutter-json-bean-factory.forceNonNullable`: Force all fields to be non-nullable (removes ? from all types)
- `flutter-json-bean-factory.addNullChecks`: Add null checks in fromJson method for non-nullable fields
- `flutter-json-bean-factory.useAsserts`: Use assert statements for validation in fromJson method

### Code Generation Options
- `flutter-json-bean-factory.generateToString`: Generate toString() method for classes
- `flutter-json-bean-factory.generateEquality`: Generate == operator and hashCode methods

### Scanning Configuration
- `flutter-json-bean-factory.scanPath`: Path(s) to scan for existing entity files (supports multiple paths separated by comma)

## Requirements

- VSCode 1.74.0 or higher
- Flutter/Dart project

## Installation

1. Open VSCode
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Flutter JSON Bean Factory"
4. Click Install

## Development

### Quick Setup

```bash
# Clone and setup
git clone <repository-url>
cd FlutterJsonBeanFactoryVSCode
./scripts/dev.sh
```

### Testing

- **Unit Tests**: `npm run test:unit` (fast, no VSCode download required)
- **Integration Tests**: `npm run test:integration` (requires VSCode download)
- **All Tests**: `npm test` (runs unit tests by default)

### Development Workflow

1. Run `npm run watch` for automatic compilation
2. Press `F5` in VSCode to launch Extension Development Host
3. Test your changes in the new window
4. Press `Ctrl+R` to reload the extension after changes

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Original IntelliJ IDEA plugin: [FlutterJsonBeanFactory](https://github.com/fluttercandies/FlutterJsonBeanFactory)
- Flutter Candies team for the inspiration
