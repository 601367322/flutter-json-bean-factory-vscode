# Flutter JSON Bean Factory

[![Version](https://img.shields.io/visual-studio-marketplace/v/bingshushu.flutter-json-bean-factory)](https://marketplace.visualstudio.com/items?itemName=bingshushu.flutter-json-bean-factory)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/bingshushu.flutter-json-bean-factory)](https://marketplace.visualstudio.com/items?itemName=bingshushu.flutter-json-bean-factory)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/bingshushu.flutter-json-bean-factory)](https://marketplace.visualstudio.com/items?itemName=bingshushu.flutter-json-bean-factory)

A powerful VSCode extension that automatically generates Dart model classes from JSON data for Flutter development. This extension is a VSCode port of the popular [FlutterJsonBeanFactory](https://github.com/fluttercandies/FlutterJsonBeanFactory) IntelliJ plugin, bringing the same powerful functionality to VSCode users.

> 🤖 **100% AI Generated**: This entire project was developed using AI assistance, demonstrating the power of AI-driven development tools.

## ✨ Features

- 🚀 **One-click JSON to Dart conversion** - Generate complete Dart model classes from JSON
- 🔄 **Automatic serialization** - Generates `fromJson()` and `toJson()` methods
- 🛡️ **Null safety support** - Full support for Dart null safety
- 🎯 **Smart type inference** - Automatically detects and handles various data types
- 📝 **Customizable generation** - Extensive configuration options
- ⚡ **Batch regeneration** - Regenerate all models with `Alt+J`
- 🔧 **Flexible file organization** - Configurable output paths
- 🎨 **Rich UI dialog** - User-friendly JSON input interface

## 🚀 Quick Start

### Installation

1. Open VSCode
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "Flutter JSON Bean Factory"
4. Click Install

### Basic Usage

1. **Generate from JSON:**
   - Use `Ctrl+Alt+J` (Windows/Linux) or `Cmd+Alt+J` (Mac)
   - Or right-click in Explorer → "Generate Dart Bean from JSON"
   - Paste your JSON and enter a class name
   - Click "Generate"

2. **Regenerate existing models:**
   - Use `Alt+J` to regenerate all models
   - Use `Ctrl+Shift+J` (Windows/Linux) or `Cmd+Shift+J` (Mac) to regenerate current file

## 📋 Example

### Input JSON:
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "is_active": true,
  "profile": {
    "age": 30,
    "avatar_url": "https://example.com/avatar.jpg"
  },
  "tags": ["developer", "flutter"]
}
```

### Generated Dart Code:

**user.dart:**
```dart
import 'dart:convert';
import 'package:json_annotation/json_annotation.dart';
import 'package:your_project/generated/json/base/json_field.dart';
import 'package:your_project/generated/json/user.g.dart';

part 'user.g.dart';

@JsonSerializable()
class User {
  late int id;
  late String name;
  late String email;
  @JSONField(name: 'is_active')
  late bool isActive;
  late UserProfile profile;
  late List<String> tags;

  User();

  factory User.fromJson(Map<String, dynamic> json) => $UserFromJson(json);
  Map<String, dynamic> toJson() => $UserToJson(this);

  @override
  String toString() {
    return jsonEncode(this);
  }
}

@JsonSerializable()
class UserProfile {
  late int age;
  @JSONField(name: 'avatar_url')
  late String avatarUrl;

  UserProfile();

  factory UserProfile.fromJson(Map<String, dynamic> json) => $UserProfileFromJson(json);
  Map<String, dynamic> toJson() => $UserProfileToJson(this);

  @override
  String toString() {
    return jsonEncode(this);
  }
}
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Command | Description |
|----------|---------|-------------|
| `Alt+J` | Regenerate All Beans | Regenerate all existing Dart models |
| `Ctrl+Alt+J` (Win/Linux)<br>`Cmd+Alt+J` (Mac) | Generate from JSON | Open JSON input dialog |
| `Ctrl+Shift+J` (Win/Linux)<br>`Cmd+Shift+J` (Mac) | Regenerate Bean | Regenerate current Dart model |

## ⚙️ Configuration

Access settings via `File > Preferences > Settings` and search for "Flutter JSON Bean Factory":

### File Paths
- **Generated Path**: Where helper files are saved (default: `lib/generated/json`)
- **Entity Path**: Where model files are saved (default: `lib/models`)
- **Scan Path**: Where to scan for existing models (default: `lib`)

### Code Generation
- **Null Safety**: Generate null-safe code (default: `true`)
- **Use JSON Annotation**: Use json_annotation package (default: `true`)
- **Class Name Prefix/Suffix**: Add prefix/suffix to class names
- **Generate toString**: Include toString() method (default: `true`)
- **Generate Equality**: Include == operator and hashCode (default: `false`)

### Nullable Options
- **Open Nullable**: Generate nullable fields with `?` (default: `false`)
- **Force Non-Nullable**: Remove `?` from all types (default: `false`)
- **Add Null Checks**: Add null checks in fromJson (default: `true`)

### Default Values
- **Set Default**: Use default values for fields (default: `true`)
- **String Default**: Default for String fields (default: `''`)
- **Int Default**: Default for int fields (default: `0`)
- **Bool Default**: Default for bool fields (default: `false`)
- **List Default**: Default for List fields (default: `[]`)

## 📁 Project Structure

The extension generates files in the following structure:

```
lib/
├── models/                    # Entity/Model files
│   ├── user.dart
│   └── product.dart
└── generated/
    └── json/                  # Generated helper files
        ├── base/
        │   └── json_field.dart
        ├── json_convert_content.dart
        ├── user.g.dart
        └── product.g.dart
```

## 🔧 Commands

### Available Commands

1. **Generate Dart Bean from JSON**
   - Command ID: `flutter-json-bean-factory.generateFromJson`
   - Opens interactive dialog for JSON input

2. **Regenerate Dart Bean**
   - Command ID: `flutter-json-bean-factory.regenerateBean`
   - Regenerates the currently open Dart model file

3. **Regenerate All Dart Beans**
   - Command ID: `flutter-json-bean-factory.regenerateAllBeans`
   - Scans and regenerates all existing Dart models

### Context Menus

- **Explorer Context Menu**: Right-click on folders to generate models
- **Editor Context Menu**: Right-click in Dart files to regenerate models

## 🛠️ Requirements

- VSCode 1.74.0 or higher
- Flutter project with `pubspec.yaml`
- Dart language support

### Required Dependencies

Add these to your `pubspec.yaml`:

```yaml
dependencies:
  json_annotation: ^4.8.1

dev_dependencies:
  json_serializable: ^6.7.1
  build_runner: ^2.4.7
```

## 🔍 Advanced Usage

### Working with Complex JSON

The extension handles complex nested structures, arrays, and various data types:

```json
{
  "users": [
    {
      "id": 1,
      "profile": {
        "personal_info": {
          "first_name": "John",
          "last_name": "Doe"
        }
      }
    }
  ],
  "metadata": {
    "total_count": 100,
    "has_more": true
  }
}
```

### Custom Field Mapping

Use `@JSONField` annotations for custom field mapping:
- Snake case JSON keys → Camel case Dart properties
- Automatic annotation generation for mismatched names

### Batch Operations

- **Alt+J**: Regenerates ALL models in your project
- Preserves existing customizations in entity files
- Updates only the `.g.dart` files

## 🐛 Troubleshooting

### Common Issues

1. **"This command only works in Flutter projects"**
   - Ensure your project has a `pubspec.yaml` file
   - Open the project root folder in VSCode

2. **Generated files not found**
   - Check your configuration paths
   - Ensure the target directories exist

3. **Build errors after generation**
   - Run `flutter packages pub run build_runner build`
   - Add required dependencies to `pubspec.yaml`

### Build Runner Commands

After generating models, run:

```bash
# Generate .g.dart files
flutter packages pub run build_runner build

# Watch for changes
flutter packages pub run build_runner watch

# Clean and rebuild
flutter packages pub run build_runner build --delete-conflicting-outputs
```

## 🙏 Acknowledgments

This project is based on the excellent [FlutterJsonBeanFactory](https://github.com/fluttercandies/FlutterJsonBeanFactory) IntelliJ plugin by the [FlutterCandies](https://github.com/fluttercandies) team. We are grateful for their innovative work and open-source contribution to the Flutter community.

**Original Project**: [FlutterJsonBeanFactory for IntelliJ IDEA](https://github.com/fluttercandies/FlutterJsonBeanFactory)
**Original Authors**: FlutterCandies Team
**License**: MIT

Special thanks to the FlutterCandies community for creating such a useful tool that inspired this VSCode adaptation.

## 🤖 AI Development

This entire VSCode extension was developed using 100% AI assistance, showcasing the capabilities of modern AI development tools. The project demonstrates how AI can effectively:

- Port functionality between different IDE platforms
- Understand and replicate complex code generation logic
- Maintain feature parity while adapting to different extension APIs
- Create comprehensive documentation and user interfaces

This serves as an example of AI-driven software development and the potential for AI to accelerate cross-platform tool development.

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=bingshushu.flutter-json-bean-factory)
- [Original IntelliJ Plugin](https://github.com/fluttercandies/FlutterJsonBeanFactory)
- [FlutterCandies Organization](https://github.com/fluttercandies)
- [Report Issues](https://github.com/your-username/flutter-json-bean-factory-vscode/issues)