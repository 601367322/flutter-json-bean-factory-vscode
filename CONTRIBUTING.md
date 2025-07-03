# Contributing to Flutter JSON Bean Factory

Thank you for your interest in contributing to Flutter JSON Bean Factory! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn
- VSCode
- Git

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/FlutterJsonBeanFactoryVSCode.git
   cd FlutterJsonBeanFactoryVSCode
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Extension**
   ```bash
   npm run compile
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

5. **Start Development**
   - Open the project in VSCode
   - Press `F5` to launch a new Extension Development Host window
   - Test your changes in the new window

## Project Structure

```
src/
├── extension.ts              # Main extension entry point
├── generators/
│   ├── JsonBeanGenerator.ts  # Main generator class
│   └── DartCodeGenerator.ts  # Dart code generation logic
├── parsers/
│   └── JsonParser.ts         # JSON parsing and validation
├── utils/
│   └── FlutterProjectDetector.ts  # Flutter project detection
└── test/
    └── suite/
        └── *.test.ts         # Test files
```

## Development Guidelines

### Code Style

- Use TypeScript for all source code
- Follow the existing code style and formatting
- Use meaningful variable and function names
- Add JSDoc comments for public methods
- Keep functions small and focused

### Naming Conventions

- Use PascalCase for classes and interfaces
- Use camelCase for variables and functions
- Use UPPER_CASE for constants
- Use descriptive names that explain the purpose

### Error Handling

- Always handle errors gracefully
- Provide meaningful error messages to users
- Log errors for debugging purposes
- Use try-catch blocks appropriately

## Making Changes

### Before You Start

1. Check existing issues to avoid duplicate work
2. Create an issue to discuss major changes
3. Fork the repository and create a feature branch

### Development Process

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Write clean, well-documented code
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   npm run compile
   npm test
   ```

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

### Commit Message Format

Use conventional commit format:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `test:` for test additions/changes
- `refactor:` for code refactoring
- `style:` for formatting changes
- `chore:` for maintenance tasks

Examples:
- `feat: add support for custom type mappings`
- `fix: resolve null safety issues in generated code`
- `docs: update usage guide with new examples`

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- --grep "JsonParser"
```

### Writing Tests

- Write unit tests for new functionality
- Use descriptive test names
- Test both success and error cases
- Mock external dependencies when needed

Example test structure:
```typescript
suite('Feature Name', () => {
    let instance: YourClass;

    setup(() => {
        instance = new YourClass();
    });

    test('should do something specific', () => {
        // Arrange
        const input = 'test input';
        
        // Act
        const result = instance.method(input);
        
        // Assert
        assert.strictEqual(result, expectedValue);
    });
});
```

## Submitting Changes

### Pull Request Process

1. **Update Documentation**
   - Update README.md if needed
   - Update CHANGELOG.md
   - Add/update JSDoc comments

2. **Create Pull Request**
   - Use a descriptive title
   - Provide detailed description of changes
   - Reference related issues
   - Include screenshots for UI changes

3. **Pull Request Template**
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Tests pass locally
   - [ ] Added tests for new functionality
   - [ ] Manual testing completed

   ## Checklist
   - [ ] Code follows project style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] No breaking changes (or clearly documented)
   ```

### Review Process

1. Automated checks must pass
2. Code review by maintainers
3. Address feedback and make changes
4. Final approval and merge

## Feature Requests

### Suggesting New Features

1. Check existing issues and discussions
2. Create a detailed feature request issue
3. Explain the use case and benefits
4. Provide examples or mockups if applicable

### Feature Development

1. Discuss the feature in an issue first
2. Get approval from maintainers
3. Follow the development process
4. Submit a pull request

## Bug Reports

### Reporting Bugs

1. Check if the bug is already reported
2. Use the bug report template
3. Provide detailed reproduction steps
4. Include environment information
5. Add screenshots or logs if helpful

### Bug Report Template

```markdown
**Bug Description**
Clear description of the bug

**Steps to Reproduce**
1. Step one
2. Step two
3. Step three

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- VSCode version:
- Extension version:
- Operating System:
- Flutter version:

**Additional Context**
Any other relevant information
```

## Documentation

### Updating Documentation

- Keep README.md up to date
- Update usage examples
- Document new configuration options
- Update API documentation

### Documentation Style

- Use clear, concise language
- Provide practical examples
- Include code snippets
- Use proper markdown formatting

## Community

### Code of Conduct

- Be respectful and inclusive
- Help others learn and grow
- Provide constructive feedback
- Follow GitHub community guidelines

### Getting Help

- Check existing documentation
- Search through issues
- Ask questions in discussions
- Contact maintainers if needed

## Release Process

### Versioning

We follow Semantic Versioning (SemVer):
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes (backward compatible)

### Release Checklist

1. Update version in package.json
2. Update CHANGELOG.md
3. Create release notes
4. Tag the release
5. Publish to VSCode Marketplace

Thank you for contributing to Flutter JSON Bean Factory! 🚀
