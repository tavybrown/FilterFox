#!/bin/bash
# Build script for FilterFox extension

echo "🦊 Building FilterFox Extension..."

# Create build directory
mkdir -p build

# Copy essential files for extension
cp manifest.json build/
cp -r src/ build/
cp -r popup/ build/
cp -r styles/ build/
cp -r icons/ build/
cp -r rules/ build/
cp -r config/ build/

# Create Chrome extension package
cd build
zip -r ../FilterFox-Chrome-v1.0.0.zip . -x "*.DS_Store" "*Thumbs.db"
cd ..

# Create source code package
zip -r FilterFox-Source-v1.0.0.zip . -x "node_modules/*" "dist/*" "build/*" "*.git/*" "*.DS_Store" "*Thumbs.db"

echo "✅ Build complete!"
echo "📦 Chrome Extension: FilterFox-Chrome-v1.0.0.zip"
echo "📦 Source Code: FilterFox-Source-v1.0.0.zip"