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

- `flutter-json-bean-factory.generatedPath`: Path for generated JSON helper files
- `flutter-json-bean-factory.entityPath`: Path for entity/model files
- `flutter-json-bean-factory.nullSafety`: Enable null-safety (default: true)
- `flutter-json-bean-factory.useJsonAnnotation`: Use json_annotation package
- `flutter-json-bean-factory.classNamePrefix`: Prefix for class names
- `flutter-json-bean-factory.classNameSuffix`: Suffix for class names

## Requirements

- VSCode 1.74.0 or higher
- Flutter/Dart project

## Installation

1. Open VSCode
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Flutter JSON Bean Factory"
4. Click Install

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Original IntelliJ IDEA plugin: [FlutterJsonBeanFactory](https://github.com/fluttercandies/FlutterJsonBeanFactory)
- Flutter Candies team for the inspiration
