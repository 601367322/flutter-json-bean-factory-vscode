# Flutter JSON Bean Factory - Usage Guide

This guide will help you get started with the Flutter JSON Bean Factory VSCode extension.

## Quick Start

### 1. Installation

1. Open VSCode
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Flutter JSON Bean Factory"
4. Click Install

### 2. Basic Usage

#### Method 1: Command Palette
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Generate Dart Bean from JSON"
3. Enter your JSON data
4. Provide a class name
5. The extension will generate the Dart model class

#### Method 2: Keyboard Shortcut
1. Open a Dart file in your Flutter project
2. Press `Alt+J`
3. Follow the prompts

#### Method 3: Context Menu
1. Right-click on a folder in the Explorer
2. Select "Generate Dart Bean from JSON"
3. Follow the prompts

## Examples

### Simple JSON Object

**Input JSON:**
```json
{
  "name": "John Doe",
  "age": 30,
  "email": "john@example.com"
}
```

**Generated Dart Class:**
```dart
import 'generated/json/base/json_convert_content.dart';

class User {
  String? name;
  int? age;
  String? email;

  User({
    this.name,
    this.age,
    this.email,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      name: JsonConvert.fromJsonAsT<String>(json['name']),
      age: JsonConvert.fromJsonAsT<int>(json['age']),
      email: JsonConvert.fromJsonAsT<String>(json['email']),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'name': name,
      'age': age,
      'email': email,
    };
  }
}
```

### Nested Objects

**Input JSON:**
```json
{
  "user": {
    "name": "John",
    "profile": {
      "bio": "Developer",
      "avatar": "avatar.jpg"
    }
  },
  "timestamp": "2023-01-01T00:00:00Z"
}
```

**Generated Classes:**
- `Response` (main class)
- `ResponseUser` (nested user object)
- `ResponseUserProfile` (nested profile object)

### Arrays

**Input JSON:**
```json
{
  "users": [
    {
      "name": "John",
      "age": 30
    }
  ],
  "tags": ["flutter", "dart"]
}
```

**Generated Classes:**
- `Data` (main class)
- `DataUsersItem` (array item class)

## Configuration

### Settings

You can customize the extension behavior in VSCode settings:

```json
{
  "flutter-json-bean-factory.generatedPath": "lib/generated/json",
  "flutter-json-bean-factory.entityPath": "lib/models",
  "flutter-json-bean-factory.nullSafety": true,
  "flutter-json-bean-factory.useJsonAnnotation": true,
  "flutter-json-bean-factory.classNamePrefix": "",
  "flutter-json-bean-factory.classNameSuffix": ""
}
```

### Setting Descriptions

| Setting | Description | Default |
|---------|-------------|---------|
| `generatedPath` | Path where generated helper files will be saved | `lib/generated/json` |
| `entityPath` | Path where model/entity files will be saved | `lib/models` |
| `nullSafety` | Generate null-safe Dart code | `true` |
| `useJsonAnnotation` | Use json_annotation package for serialization | `true` |
| `classNamePrefix` | Prefix for generated class names | `""` |
| `classNameSuffix` | Suffix for generated class names | `""` |

## Advanced Features

### Regenerating Existing Classes

1. Open an existing Dart model file
2. Right-click in the editor
3. Select "Regenerate Dart Bean"
4. Provide updated JSON data
5. The extension will update the fromJson/toJson methods

### Custom Type Mapping

The extension automatically maps JSON types to Dart types:

| JSON Type | Dart Type |
|-----------|-----------|
| string | String |
| number (integer) | int |
| number (decimal) | double |
| boolean | bool |
| null | dynamic |
| object | Custom class |
| array | List<T> |

### Null Safety

When null safety is enabled (default), the extension generates:
- Nullable types with `?` suffix
- `required` parameters for non-nullable fields
- Proper null checks in fromJson methods

## File Structure

The extension creates files in the following structure:

```
lib/
├── models/
│   ├── user.dart
│   ├── user_profile.dart
│   └── ...
└── generated/
    └── json/
        ├── base/
        │   └── json_convert_content.dart
        ├── user.g.dart
        ├── user_profile.g.dart
        └── ...
```

## Best Practices

1. **Use meaningful class names**: Choose descriptive names for your classes
2. **Organize your JSON**: Well-structured JSON leads to better generated code
3. **Review generated code**: Always review the generated code before using it
4. **Keep JSON samples**: Save sample JSON files for future reference
5. **Use consistent naming**: Follow Dart naming conventions

## Troubleshooting

### Common Issues

1. **"Not a Flutter project" error**
   - Ensure you have a `pubspec.yaml` file in your project root
   - Make sure the pubspec.yaml contains Flutter dependencies

2. **Generated files not found**
   - Check the configured paths in settings
   - Ensure the directories exist and are writable

3. **Compilation errors**
   - Verify the generated code syntax
   - Check for missing imports
   - Ensure all dependencies are installed

### Getting Help

If you encounter issues:
1. Check the VSCode Output panel for error messages
2. Review the extension settings
3. Try regenerating the classes
4. Report issues on the GitHub repository

## Tips and Tricks

1. **Use the keyboard shortcut `Alt+J`** for quick access
2. **Test with sample data first** before using real API responses
3. **Keep your JSON formatted** for better readability
4. **Use nested objects** to organize complex data structures
5. **Consider using json_annotation** for more advanced serialization needs
