#!/bin/bash

# Quirkly Extension Production Build Script
# Creates a production-ready zip file for Chrome Web Store

set -e

echo "🚀 Building Quirkly Extension for Production"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EXTENSION_NAME="quirkly-extension"
VERSION=$(node -p "require('./manifest.json').version")
BUILD_DIR="build"
ZIP_NAME="${EXTENSION_NAME}-v${VERSION}-production.zip"

echo -e "${BLUE}📋 Build Information:${NC}"
echo "   Extension: Quirkly"
echo "   Version: ${VERSION}"
echo "   Environment: Production"
echo "   Build Directory: ${BUILD_DIR}"
echo "   Output: ${ZIP_NAME}"
echo ""

# Clean previous builds
echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
rm -rf ${BUILD_DIR}
rm -f ${ZIP_NAME}

# Create build directory
echo -e "${YELLOW}📁 Creating build directory...${NC}"
mkdir -p ${BUILD_DIR}

# Copy essential files
echo -e "${YELLOW}📋 Copying extension files...${NC}"
cp manifest.json ${BUILD_DIR}/
cp config.js ${BUILD_DIR}/
cp background.js ${BUILD_DIR}/
cp content.js ${BUILD_DIR}/
cp popup.html ${BUILD_DIR}/
cp popup.js ${BUILD_DIR}/
cp profileExtractor.js ${BUILD_DIR}/
cp styles.css ${BUILD_DIR}/

# Copy icons directory
echo -e "${YELLOW}🎨 Copying icons...${NC}"
cp -r icons ${BUILD_DIR}/

# Copy public assets
echo -e "${YELLOW}📄 Copying public assets...${NC}"
if [ -d "public" ]; then
    cp -r public ${BUILD_DIR}/
fi

# Verify production configuration
echo -e "${YELLOW}🔍 Verifying production configuration...${NC}"
if grep -q "EXT_ENV.*production" ${BUILD_DIR}/config.js; then
    echo -e "${GREEN}✅ Production configuration verified${NC}"
else
    echo -e "${RED}❌ ERROR: Configuration not set to production!${NC}"
    exit 1
fi

# Verify all required files exist
echo -e "${YELLOW}🔍 Verifying required files...${NC}"
REQUIRED_FILES=(
    "manifest.json"
    "config.js"
    "background.js"
    "content.js"
    "popup.html"
    "popup.js"
    "profileExtractor.js"
    "styles.css"
    "icons/icon16.png"
    "icons/icon48.png"
    "icons/icon128.png"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "${BUILD_DIR}/${file}" ]; then
        echo -e "${GREEN}✅ ${file}${NC}"
    else
        echo -e "${RED}❌ Missing: ${file}${NC}"
        exit 1
    fi
done

# Create zip file
echo -e "${YELLOW}📦 Creating production zip file...${NC}"
cd ${BUILD_DIR}
zip -r ../${ZIP_NAME} . -x "*.DS_Store" "*.git*" "node_modules/*" "*.md" "*.log"
cd ..

# Verify zip file
if [ -f "${ZIP_NAME}" ]; then
    ZIP_SIZE=$(du -h ${ZIP_NAME} | cut -f1)
    echo -e "${GREEN}✅ Production zip created successfully!${NC}"
    echo ""
    echo -e "${BLUE}📊 Build Summary:${NC}"
    echo "   File: ${ZIP_NAME}"
    echo "   Size: ${ZIP_SIZE}"
    echo "   Version: ${VERSION}"
    echo "   Environment: Production"
    echo ""
    echo -e "${GREEN}🎉 Build completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}📝 Next Steps:${NC}"
    echo "   1. Upload ${ZIP_NAME} to Chrome Web Store"
    echo "   2. Test the extension in Chrome"
    echo "   3. Verify all URLs point to production"
    echo ""
    echo -e "${YELLOW}⚠️  Important:${NC}"
    echo "   - This zip is configured for production"
    echo "   - All API calls will go to https://quirkly.technioz.com"
    echo "   - Test thoroughly before publishing"
else
    echo -e "${RED}❌ ERROR: Failed to create zip file${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🚀 Quirkly Extension Production Build Complete!${NC}"
