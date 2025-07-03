# Extension Icon

This directory should contain the extension icon.

## Icon Requirements

- **Format**: PNG
- **Size**: 128x128 pixels
- **Name**: icon.png

## Design Guidelines

The icon should represent:
- Flutter development (blue colors, Flutter logo elements)
- JSON processing (brackets, data structures)
- Code generation (gear/factory elements)

## Current Icon

You can convert the provided `icon.svg` to PNG format using any image editor or online converter.

### Suggested Design Elements

1. **Background**: Circular gradient from Flutter blue (#02569B) to lighter blue (#0175C2)
2. **Flutter Elements**: Stylized Flutter logo or wing shapes in white
3. **JSON Elements**: Curly braces `{}` in orange/yellow (#FF6B35 to #F7931E)
4. **Factory Elements**: Small gear or cog to represent code generation

### Tools for Conversion

- Online converters: convertio.co, cloudconvert.com
- Image editors: GIMP, Photoshop, Figma
- Command line: ImageMagick, Inkscape

### Command Line Conversion (if you have Inkscape installed)

```bash
inkscape icon.svg --export-type=png --export-filename=icon.png --export-width=128 --export-height=128
```

## Alternative

If you don't have the tools to convert SVG to PNG, you can temporarily remove the icon line from package.json until a proper PNG icon is created.
