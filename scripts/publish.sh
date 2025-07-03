#!/bin/bash

# Flutter JSON Bean Factory VSCode Extension - Publish Script

set -e

echo "🚀 Flutter JSON Bean Factory - Publishing Script"
echo "================================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if vsce is installed
if ! command -v vsce &> /dev/null; then
    echo "📦 Installing vsce (Visual Studio Code Extension Manager)..."
    npm install -g @vscode/vsce
fi

# Clean and install dependencies
echo "🧹 Cleaning and installing dependencies..."
rm -rf node_modules
rm -rf out
npm install

# Run linting
echo "🔍 Running linter..."
npm run lint

# Compile TypeScript
echo "🔨 Compiling TypeScript..."
npm run compile

# Run tests
echo "🧪 Running tests..."
npm test

# Check if icon exists
if [ ! -f "images/icon.png" ]; then
    echo "⚠️  Warning: Icon file (images/icon.png) not found."
    echo "   The extension will be published without an icon."
    echo "   Consider creating an icon before publishing."
    read -p "   Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Publishing cancelled."
        exit 1
    fi
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📋 Current version: $CURRENT_VERSION"

# Ask for version bump
echo "🔢 Version bump options:"
echo "   1) patch (1.0.0 -> 1.0.1)"
echo "   2) minor (1.0.0 -> 1.1.0)"
echo "   3) major (1.0.0 -> 2.0.0)"
echo "   4) keep current version"

read -p "Select option (1-4): " -n 1 -r
echo

case $REPLY in
    1)
        echo "📈 Bumping patch version..."
        npm version patch --no-git-tag-version
        ;;
    2)
        echo "📈 Bumping minor version..."
        npm version minor --no-git-tag-version
        ;;
    3)
        echo "📈 Bumping major version..."
        npm version major --no-git-tag-version
        ;;
    4)
        echo "📋 Keeping current version..."
        ;;
    *)
        echo "❌ Invalid option. Keeping current version."
        ;;
esac

NEW_VERSION=$(node -p "require('./package.json').version")
echo "📋 Publishing version: $NEW_VERSION"

# Package the extension
echo "📦 Packaging extension..."
vsce package

# Ask for publishing confirmation
echo "🚀 Ready to publish to VSCode Marketplace!"
echo "   Extension: flutter-json-bean-factory-$NEW_VERSION.vsix"
read -p "   Proceed with publishing? (y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Publishing cancelled."
    echo "📦 Extension package created: flutter-json-bean-factory-$NEW_VERSION.vsix"
    echo "   You can manually publish it later using: vsce publish"
    exit 0
fi

# Publish to marketplace
echo "🚀 Publishing to VSCode Marketplace..."
vsce publish

echo "✅ Successfully published Flutter JSON Bean Factory v$NEW_VERSION!"
echo "🎉 The extension should be available on the marketplace shortly."

# Clean up
echo "🧹 Cleaning up..."
rm -f *.vsix

echo "✨ All done! Thank you for using Flutter JSON Bean Factory!"
