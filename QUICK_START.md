# 🚀 Quick Start Guide

Get up and running with Flutter JSON Bean Factory in 5 minutes!

## 📦 Installation & Setup

### Option 1: Development Mode (Recommended for testing)

1. **Clone and Setup**
   ```bash
   git clone <your-repo-url>
   cd FlutterJsonBeanFactoryVSCode
   chmod +x scripts/dev.sh
   ./scripts/dev.sh
   ```

2. **Test the Extension**
   - Open the project in VSCode
   - Press `F5` to launch Extension Development Host
   - Open a Flutter project in the new window
   - Test the extension features

### Option 2: Package Installation

1. **Build Package**
   ```bash
   npm install
   npm run compile
   npx vsce package
   ```

2. **Install Package**
   - In VSCode: `Ctrl+Shift+P` → "Extensions: Install from VSIX"
   - Select the generated `.vsix` file

## 🎯 First Use

### 1. Open a Flutter Project
Make sure you have a Flutter project with `pubspec.yaml` open in VSCode.

### 2. Generate Your First Bean

**Method A: Keyboard Shortcut**
- Press `Alt+J` in any Dart file
- Paste this sample JSON:
  ```json
  {
    "name": "John Doe",
    "age": 30,
    "email": "john@example.com"
  }
  ```
- Enter class name: `User`
- ✨ Magic happens!

**Method B: Command Palette**
- Press `Ctrl+Shift+P`
- Type "Generate Dart Bean from JSON"
- Follow the prompts

**Method C: Context Menu**
- Right-click on a folder in Explorer
- Select "Generate Dart Bean from JSON"

### 3. Check Generated Files

The extension creates:
```
lib/
├── models/
│   └── user.dart              # Your model class
└── generated/
    └── json/
        ├── base/
        │   └── json_convert_content.dart  # Base utilities
        └── user.g.dart        # Helper methods
```

## 🧪 Test with Complex JSON

Try this more complex example:

```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "profile": {
      "bio": "Flutter developer",
      "avatar": "https://example.com/avatar.jpg"
    }
  },
  "posts": [
    {
      "id": 101,
      "title": "My First Post",
      "tags": ["flutter", "dart"]
    }
  ],
  "metadata": {
    "createdAt": "2023-01-01T00:00:00Z",
    "version": "1.0.0"
  }
}
```

Class name: `BlogData`

This will generate multiple classes with proper nesting and type safety!

## ⚙️ Quick Configuration

Add to your VSCode settings:

```json
{
  "flutter-json-bean-factory.entityPath": "lib/models",
  "flutter-json-bean-factory.generatedPath": "lib/generated/json",
  "flutter-json-bean-factory.nullSafety": true
}
```

## 🔧 Common Issues & Solutions

### "Not a Flutter project"
- Ensure `pubspec.yaml` exists in your project root
- Make sure it contains Flutter dependencies

### Generated files not found
- Check the configured paths in settings
- Ensure directories are writable

### Compilation errors
- Verify JSON syntax is valid
- Check generated code for any issues
- Ensure all dependencies are installed

## 📚 Next Steps

1. **Read the full documentation**: [USAGE.md](docs/USAGE.md)
2. **Explore examples**: Check the `examples/` folder
3. **Customize settings**: Configure paths and naming conventions
4. **Contribute**: See [CONTRIBUTING.md](CONTRIBUTING.md)

## 🎉 You're Ready!

You now have a powerful tool to generate Dart model classes from JSON. Happy coding! 

For more advanced features and detailed documentation, check out the complete [README.md](README.md) and [usage guide](docs/USAGE.md).

---

**Need help?** 
- 📖 Check the [documentation](docs/USAGE.md)
- 🐛 Report issues on GitHub
- 💡 Suggest features in discussions
