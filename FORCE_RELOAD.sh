#!/bin/bash

# Force Chrome to reload the extension with correct files
# This script creates a clean copy to bypass cache issues

echo "🔧 Force Reload Script for Quirkly Extension"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Verify we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo -e "${RED}❌ Error: manifest.json not found!${NC}"
    echo "Please run this script from the XBot directory"
    exit 1
fi

echo -e "${GREEN}✅ Found manifest.json${NC}"

# Step 2: Check current version
CURRENT_VERSION=$(grep '"version"' manifest.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
echo -e "${GREEN}✅ Current version: ${CURRENT_VERSION}${NC}"

# Step 3: Verify content.js doesn't have the problematic function call
if grep -q "addProfileExtractionTestButton" content.js; then
    echo -e "${RED}❌ ERROR: content.js still contains addProfileExtractionTestButton call!${NC}"
    echo "Running git pull to get latest version..."
    git pull origin main
else
    echo -e "${GREEN}✅ content.js is correct (no problematic function call)${NC}"
fi

# Step 4: Show current line 109 of content.js
echo ""
echo "📝 Current line 109 of content.js:"
echo -e "${YELLOW}$(sed -n '109p' content.js)${NC}"
echo ""

# Step 5: Bump version to force reload
echo "🔄 Incrementing version to force Chrome reload..."
NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{$NF = $NF + 1;} 1' | sed 's/ /./g')
sed -i.bak "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" manifest.json
echo -e "${GREEN}✅ Version bumped: ${CURRENT_VERSION} → ${NEW_VERSION}${NC}"

# Step 6: Update version in content.js
sed -i.bak "s/Version: $CURRENT_VERSION/Version: $NEW_VERSION/" content.js
echo -e "${GREEN}✅ Updated version in content.js${NC}"

# Step 7: Clean up backup files
rm -f manifest.json.bak content.js.bak

# Step 8: Commit changes
git add manifest.json content.js
git commit -m "Bump version to $NEW_VERSION - force extension reload"
git push origin main

echo ""
echo "=============================================="
echo -e "${GREEN}✅ SCRIPT COMPLETE!${NC}"
echo "=============================================="
echo ""
echo "📋 Next Steps:"
echo "   1. Go to: chrome://extensions/"
echo "   2. Find 'Quirkly' extension"
echo "   3. Click 'Remove' (trash icon)"
echo "   4. Click 'Load unpacked'"
echo "   5. Select this folder: $(pwd)"
echo "   6. Close ALL X/Twitter tabs"
echo "   7. Open new tab: https://x.com/heygauravbhatia"
echo "   8. Hard reload: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"
echo ""
echo "🔍 In the console, you should see:"
echo "   🚀 Quirkly Content Script v${NEW_VERSION}: Script loaded..."
echo "   ✅ Profile extractor initialized"
echo ""
echo "❌ You should NOT see:"
echo "   TypeError: this.addProfileExtractionTestButton is not a function"
echo ""

