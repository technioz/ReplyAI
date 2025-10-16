#!/bin/bash

# Quirkly Extension Build Script
# This script builds the extension with environment-specific configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default environment
ENVIRONMENT=${1:-production}

echo -e "${BLUE}🚀 Building Quirkly Extension for ${ENVIRONMENT} environment${NC}"

# Validate environment
if [[ "$ENVIRONMENT" != "development" && "$ENVIRONMENT" != "production" ]]; then
    echo -e "${RED}❌ Invalid environment. Use 'development' or 'production'${NC}"
    exit 1
fi

# Load environment variables from extension.env
if [ -f "extension.env" ]; then
    echo -e "${YELLOW}📄 Loading environment variables from extension.env${NC}"
    export $(grep -v '^#' extension.env | xargs)
else
    echo -e "${YELLOW}⚠️  No extension.env file found, using defaults${NC}"
fi

# Set environment-specific variables
if [ "$ENVIRONMENT" = "development" ]; then
    export EXT_ENV=development
    export DEV_BASE_URL=${DEV_BASE_URL:-http://localhost:3000}
    export DEV_DASHBOARD_URL=${DEV_DASHBOARD_URL:-http://localhost:3000}
    echo -e "${GREEN}🔧 Development mode: Using localhost URLs${NC}"
else
    export EXT_ENV=production
    export PROD_BASE_URL=${PROD_BASE_URL:-https://quirkly.technioz.com}
    export PROD_DASHBOARD_URL=${PROD_DASHBOARD_URL:-https://quirkly.technioz.com}
    echo -e "${GREEN}🔧 Production mode: Using live URLs${NC}"
fi

# Create build directory
BUILD_DIR="build-${ENVIRONMENT}"
echo -e "${BLUE}📁 Creating build directory: ${BUILD_DIR}${NC}"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Copy extension files
echo -e "${BLUE}📋 Copying extension files${NC}"
cp manifest.json "$BUILD_DIR/"
cp background.js "$BUILD_DIR/"
cp content.js "$BUILD_DIR/"
cp popup.html "$BUILD_DIR/"
cp popup.js "$BUILD_DIR/"
cp styles.css "$BUILD_DIR/"
cp -r icons "$BUILD_DIR/"

# Create environment-specific config
echo -e "${BLUE}⚙️  Creating environment-specific config${NC}"
cat > "$BUILD_DIR/config.js" << EOF
// Quirkly Extension Configuration - ${ENVIRONMENT.toUpperCase()} BUILD
// Generated on $(date)

const QuirklyConfig = {
  // Environment detection
  isDevelopment: () => {
    return ${ENVIRONMENT === "development" ? "true" : "false"};
  },

  // Base URLs for different environments
  environments: {
    development: {
      baseUrl: '${DEV_BASE_URL:-http://localhost:3000}',
      authEndpoint: '/api/auth/validate',
      replyEndpoint: '/api/reply/generate',
      profileEndpoint: '/api/profile/extract',
      dashboardUrl: '${DEV_DASHBOARD_URL:-http://localhost:3000}'
    },
    production: {
      baseUrl: '${PROD_BASE_URL:-https://quirkly.technioz.com}',
      authEndpoint: '/api/auth/validate',
      replyEndpoint: '/api/reply/generate',
      profileEndpoint: '/api/profile/extract',
      dashboardUrl: '${PROD_DASHBOARD_URL:-https://quirkly.technioz.com}'
    }
  },

  // Get current environment configuration
  getConfig: function() {
    const env = this.isDevelopment() ? 'development' : 'production';
    const config = this.environments[env];
    
    return {
      environment: env,
      baseUrl: config.baseUrl,
      authUrl: config.baseUrl + config.authEndpoint,
      replyUrl: config.baseUrl + config.replyEndpoint,
      profileUrl: config.baseUrl + config.profileEndpoint,
      dashboardUrl: config.dashboardUrl,
      isDev: env === 'development'
    };
  },

  // Get specific URLs
  getAuthUrl: function() {
    return this.getConfig().authUrl;
  },

  getReplyUrl: function() {
    return this.getConfig().replyUrl;
  },

  getDashboardUrl: function() {
    return this.getConfig().dashboardUrl;
  },

  getProfileUrl: function() {
    return this.getConfig().profileUrl;
  },

  // Debug info
  getEnvironmentInfo: function() {
    const config = this.getConfig();
    console.log('Quirkly Environment Info:', {
      environment: config.environment,
      authUrl: config.authUrl,
      replyUrl: config.replyUrl,
      dashboardUrl: config.dashboardUrl,
      buildTime: '$(date)',
      buildEnv: '${ENVIRONMENT}'
    });
    return config;
  }
};

// Make it available globally
if (typeof window !== 'undefined') {
  window.QuirklyConfig = QuirklyConfig;
}

// Export for modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QuirklyConfig;
}
EOF

# Update manifest.json with environment-specific details
echo -e "${BLUE}📝 Updating manifest.json${NC}"
if [ "$ENVIRONMENT" = "development" ]; then
    # Add development-specific permissions or settings
    jq '. + {
        "name": "Quirkly (Dev)",
        "description": "AI-powered X replies - Development Build",
        "version_name": (.version + "-dev"),
        "env": "development"
    }' "$BUILD_DIR/manifest.json" > "$BUILD_DIR/manifest.json.tmp" && mv "$BUILD_DIR/manifest.json.tmp" "$BUILD_DIR/manifest.json"
else
    # Production build
    jq '. + {
        "env": "production"
    }' "$BUILD_DIR/manifest.json" > "$BUILD_DIR/manifest.json.tmp" && mv "$BUILD_DIR/manifest.json.tmp" "$BUILD_DIR/manifest.json"
fi

# Create zip file
ZIP_NAME="quirkly-extension-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).zip"
echo -e "${BLUE}📦 Creating zip file: ${ZIP_NAME}${NC}"
cd "$BUILD_DIR"
zip -r "../${ZIP_NAME}" . > /dev/null
cd ..

# Clean up build directory
echo -e "${BLUE}🧹 Cleaning up build directory${NC}"
rm -rf "$BUILD_DIR"

# Display build info
echo -e "${GREEN}✅ Build completed successfully!${NC}"
echo -e "${BLUE}📦 Extension package: ${ZIP_NAME}${NC}"
echo -e "${YELLOW}🌐 Environment: ${ENVIRONMENT}${NC}"
echo -e "${YELLOW}🔗 Base URL: $([ "$ENVIRONMENT" = "development" ] && echo "${DEV_BASE_URL:-http://localhost:3000}" || echo "${PROD_BASE_URL:-https://quirkly.technioz.com}")${NC}"

# Usage instructions
echo -e "\n${BLUE}📋 Usage Instructions:${NC}"
echo -e "${YELLOW}1. Load the extension in Chrome:${NC}"
echo -e "   - Open chrome://extensions/"
echo -e "   - Enable 'Developer mode'"
echo -e "   - Click 'Load unpacked' and select the build directory"
echo -e "\n${YELLOW}2. Or install from zip:${NC}"
echo -e "   - Download ${ZIP_NAME}"
echo -e "   - Extract and load as unpacked extension"
echo -e "\n${YELLOW}3. To switch environments:${NC}"
echo -e "   - Development: ./build-extension.sh development"
echo -e "   - Production: ./build-extension.sh production"
