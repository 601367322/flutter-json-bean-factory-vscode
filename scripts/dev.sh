#!/bin/bash

# Flutter JSON Bean Factory VSCode Extension - Development Script

set -e

echo "🛠️  Flutter JSON Bean Factory - Development Setup"
echo "================================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# Compile TypeScript
echo "🔨 Compiling TypeScript..."
npm run compile

# Run tests
echo "🧪 Running unit tests..."
npm run test:unit

echo "✅ Development setup complete!"
echo ""
echo "🚀 Next steps:"
echo "   1. Open this project in VSCode"
echo "   2. Press F5 to launch Extension Development Host"
echo "   3. Test your extension in the new window"
echo ""
echo "📝 Available commands:"
echo "   npm run compile  - Compile TypeScript"
echo "   npm run watch    - Watch for changes and compile"
echo "   npm test         - Run tests"
echo "   npm run lint     - Run linter"
echo ""
echo "🔧 Development tips:"
echo "   - Use 'npm run watch' for automatic compilation"
echo "   - Press Ctrl+R in Extension Development Host to reload"
echo "   - Check the Debug Console for extension logs"
echo ""
echo "Happy coding! 🎉"
