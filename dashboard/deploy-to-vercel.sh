#!/bin/bash

# Deploy Quirkly Dashboard to Vercel
# This script helps automate the deployment process

echo "🚀 Deploying Quirkly Dashboard to Vercel"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not found!${NC}"
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

echo -e "${GREEN}✅ Vercel CLI installed${NC}"
echo ""

# Check if we're in the dashboard directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found!${NC}"
    echo "Please run this script from the dashboard directory"
    exit 1
fi

echo -e "${GREEN}✅ In dashboard directory${NC}"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found, installing dependencies...${NC}"
    npm install
fi

# Run build to check for errors
echo -e "${BLUE}🔨 Testing build...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ Build failed! Please fix errors before deploying.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Ask user which deployment type
echo "Select deployment type:"
echo "1) Preview deployment (test)"
echo "2) Production deployment (live)"
echo ""
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        echo ""
        echo -e "${BLUE}🚀 Deploying to preview...${NC}"
        vercel
        ;;
    2)
        echo ""
        echo -e "${YELLOW}⚠️  This will deploy to PRODUCTION!${NC}"
        read -p "Are you sure? (yes/no): " confirm
        
        if [ "$confirm" == "yes" ]; then
            echo ""
            echo -e "${BLUE}🚀 Deploying to production...${NC}"
            vercel --prod
        else
            echo ""
            echo -e "${RED}❌ Production deployment cancelled${NC}"
            exit 0
        fi
        ;;
    *)
        echo ""
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Deployment initiated!${NC}"
echo "=========================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Wait for deployment to complete"
echo "2. Note your deployment URL"
echo "3. Update NEXT_PUBLIC_APP_URL environment variable"
echo "4. Update Chrome extension config.js with new URL"
echo "5. Test all endpoints"
echo ""
echo "📚 Full guide: ../VERCEL_DEPLOYMENT.md"
echo ""

