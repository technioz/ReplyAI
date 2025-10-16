#!/bin/bash

# Quirkly Extension - Development Build Script
# Uses the new environment management system

echo "🔧 Building Quirkly Extension - DEVELOPMENT BUILD"
echo "=================================================="
echo ""

# Set environment to development
echo "🌐 Setting environment to development..."
node env-manager.js dev

# Create build directory
BUILD_DIR="build-dev"
ZIP_NAME="quirkly-extension-dev-localhost.zip"

echo "📁 Creating build directory..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Copy extension files
echo "📋 Copying extension files..."
cp manifest.json "$BUILD_DIR/"
cp background.js "$BUILD_DIR/"
cp content.js "$BUILD_DIR/"
cp popup.html "$BUILD_DIR/"
cp popup.js "$BUILD_DIR/"
cp styles.css "$BUILD_DIR/"
cp config.js "$BUILD_DIR/"

echo "⚙️  Using development config from env-manager..."
# Copy icons
echo "🎨 Copying icons..."
mkdir -p "$BUILD_DIR/icons"
cp icons/*.png "$BUILD_DIR/icons/" 2>/dev/null || echo "⚠️  No icons found, skipping..."

# Update manifest for development
echo "📝 Updating manifest for development..."
cat > "$BUILD_DIR/manifest.json" << 'MANIFESTEOF'
{
  "manifest_version": 3,
  "name": "Quirkly - DEV (localhost)",
  "version": "2.1.0",
  "description": "AI-powered X reply generator for personal branding - DEVELOPMENT BUILD",
  "permissions": [
    "activeTab",
    "storage",
    "tabs"
  ],
  "host_permissions": [
    "https://twitter.com/*",
    "https://x.com/*",
    "http://localhost:3000/*",
    "http://localhost:3001/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": [
        "https://twitter.com/*",
        "https://x.com/*"
      ],
      "js": ["config.js", "content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
MANIFESTEOF

# Create README for development build
echo "📄 Creating README..."
cat > "$BUILD_DIR/README-DEV.md" << 'READMEEOF'
# Quirkly Extension - Development Build

This is a DEVELOPMENT build of the Quirkly extension configured to connect to **localhost:3000**.

## Configuration

- **API Base URL**: http://localhost:3000
- **Dashboard URL**: http://localhost:3000
- **Environment**: Development

## Installation

1. Open Chrome/Edge and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this directory

## Requirements

Make sure your local development server is running:
```bash
cd dashboard
npm run dev  # Should run on port 3000
```

## Testing

1. Go to https://twitter.com or https://x.com
2. Click the Quirkly extension icon
3. Log in with your development credentials
4. Try generating replies on any tweet

## Debugging

- Open extension popup → Right-click → Inspect
- Check browser console for logs
- All API calls will go to localhost:3000

## Notes

- This build is for DEVELOPMENT only
- Do not use in production
- Make sure CORS is enabled on your local server
READMEEOF

# Create zip file
echo "📦 Creating ZIP file..."
cd "$BUILD_DIR"
zip -r "../$ZIP_NAME" . -x "*.DS_Store" "*.git*" > /dev/null
cd ..

# Summary
echo ""
echo "✅ Development build complete!"
echo "=================================================="
echo ""
echo "📦 Build Details:"
echo "   Directory: $BUILD_DIR/"
echo "   ZIP file: $ZIP_NAME"
echo "   Size: $(du -h "$ZIP_NAME" | cut -f1)"
echo ""
echo "🔗 Configuration:"
echo "   API URL: http://localhost:3000"
echo "   Dashboard: http://localhost:3000"
echo "   Environment: DEVELOPMENT"
echo ""
echo "📥 Installation:"
echo "   1. Go to chrome://extensions/"
echo "   2. Enable 'Developer mode'"
echo "   3. Click 'Load unpacked'"
echo "   4. Select the '$BUILD_DIR' directory"
echo ""
echo "   OR use the ZIP file: $ZIP_NAME"
echo ""
echo "⚠️  Make sure your local server is running on port 3000!"
echo ""
