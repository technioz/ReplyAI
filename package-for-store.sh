#!/bin/bash

# Package Quirkly Extension for Chrome Web Store
# This script creates a clean ZIP file ready for submission

echo "📦 Packaging Quirkly Extension for Chrome Web Store"
echo "===================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get version from manifest.json
VERSION=$(grep '"version"' manifest.json | head -1 | awk -F'"' '{print $4}')
PACKAGE_NAME="quirkly-extension-v${VERSION}.zip"

echo -e "${GREEN}📌 Current Version: ${VERSION}${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo -e "${RED}❌ Error: manifest.json not found!${NC}"
    echo "Please run this script from the XBot directory"
    exit 1
fi

# Remove old package if exists
if [ -f "$PACKAGE_NAME" ]; then
    echo -e "${YELLOW}🗑️  Removing old package...${NC}"
    rm "$PACKAGE_NAME"
fi

echo -e "${GREEN}📦 Creating package...${NC}"
echo ""

# Create ZIP with only necessary files
zip -r "$PACKAGE_NAME" \
  manifest.json \
  background.js \
  content.js \
  popup.js \
  popup.html \
  config.js \
  profileExtractor.js \
  styles.css \
  icons/ \
  LICENSE \
  -x "*.DS_Store" \
  -x ".git*" \
  -x "dashboard/*" \
  -x "docs/*" \
  -x "*.md" \
  -x "node_modules/*" \
  -x "*.log" \
  -x "*.bak" \
  -x "*.tmp"

if [ $? -eq 0 ]; then
    echo ""
    echo "===================================================="
    echo -e "${GREEN}✅ Package created successfully!${NC}"
    echo "===================================================="
    echo ""
    echo "📦 Package: ${PACKAGE_NAME}"
    echo "📏 Size: $(du -h "$PACKAGE_NAME" | cut -f1)"
    echo ""
    echo "📋 Contents:"
    unzip -l "$PACKAGE_NAME" | tail -n +4 | head -n -2
    echo ""
    echo "===================================================="
    echo -e "${GREEN}✅ READY FOR CHROME WEB STORE!${NC}"
    echo "===================================================="
    echo ""
    echo "🚀 Next Steps:"
    echo ""
    echo "1. Go to: https://chrome.google.com/webstore/devconsole/"
    echo "2. Click 'New Item'"
    echo "3. Upload: ${PACKAGE_NAME}"
    echo "4. Fill out store listing (see CHROME_STORE_PUBLISH.md)"
    echo "5. Submit for review"
    echo ""
    echo "📚 Complete guide: CHROME_STORE_PUBLISH.md"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Error creating package!${NC}"
    exit 1
fi

