#!/usr/bin/env bash
# Quirkly Chrome extension — single build script for development or production.
# Usage:
#   ./build-extension.sh development   # or: dev --dev -d
#   ./build-extension.sh production    # or: prod --prod -p  (default if omitted)

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT_DIR="$REPO_ROOT/extension"

usage() {
  echo "Usage: ./build-extension.sh <mode>"
  echo ""
  echo "Modes:"
  echo "  development | dev | --dev | -d   Localhost dashboard (dev build name in manifest)"
  echo "  production  | prod | --prod | -p   Store-ready zip (default)"
  echo ""
  echo "Optional env (see extension/extension.env):"
  echo "  DEV_BASE_URL, DEV_DASHBOARD_URL, PROD_BASE_URL, PROD_DASHBOARD_URL"
}

raw="${1:-production}"
case "$raw" in
  development|dev|--dev|-d)
    MODE=development
    ;;
  production|prod|--prod|-p)
    MODE=production
    ;;
  help|-h|--help)
    usage
    exit 0
    ;;
  *)
    echo -e "${RED}Unknown mode: $raw${NC}" >&2
    usage >&2
    exit 1
    ;;
esac

if ! command -v jq &>/dev/null; then
  echo -e "${RED}jq is required (brew install jq).${NC}" >&2
  exit 1
fi

if [ ! -d "$EXT_DIR" ]; then
  echo -e "${RED}Missing extension sources: $EXT_DIR${NC}" >&2
  exit 1
fi

ENV_FILE="$EXT_DIR/extension.env"
if [ -f "$ENV_FILE" ]; then
  echo -e "${YELLOW}Loading $ENV_FILE${NC}"
  while IFS= read -r line || [ -n "$line" ]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// }" ]] && continue
    [[ "$line" == *"="* ]] || continue
    export "$line"
  done < "$ENV_FILE"
else
  echo -e "${YELLOW}No extension.env (using defaults).${NC}"
fi

DEV_BASE_URL="${DEV_BASE_URL:-http://localhost:3000}"
DEV_DASHBOARD_URL="${DEV_DASHBOARD_URL:-http://localhost:3000}"
PROD_BASE_URL="${PROD_BASE_URL:-https://quirkly.technioz.com}"
PROD_DASHBOARD_URL="${PROD_DASHBOARD_URL:-https://quirkly.technioz.com}"

VERSION="$(node -p "require('$EXT_DIR/manifest.json').version")"

if [ "$MODE" = "development" ]; then
  IS_DEV_BOOL=true
  ZIP_NAME="quirkly-extension-development-$(date +%Y%m%d-%H%M%S).zip"
  echo -e "${BLUE}Building DEVELOPMENT extension (API: $DEV_BASE_URL)${NC}"
else
  IS_DEV_BOOL=false
  ZIP_NAME="quirkly-extension-v${VERSION}-production.zip"
  echo -e "${BLUE}Building PRODUCTION extension v${VERSION} (API: $PROD_BASE_URL)${NC}"
fi

BUILD_DIR="$REPO_ROOT/build-extension-${MODE}"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

echo -e "${BLUE}Copying extension sources from extension/${NC}"
cp "$EXT_DIR/manifest.json" "$BUILD_DIR/"
cp "$EXT_DIR/background.js" "$BUILD_DIR/"
cp "$EXT_DIR/content.js" "$BUILD_DIR/"
cp "$EXT_DIR/popup.html" "$BUILD_DIR/"
cp "$EXT_DIR/popup.js" "$BUILD_DIR/"
cp "$EXT_DIR/styles.css" "$BUILD_DIR/"
cp "$EXT_DIR/profileExtractor.js" "$BUILD_DIR/"
cp -r "$EXT_DIR/icons" "$BUILD_DIR/"

if [ "$MODE" = "production" ] && [ -d "$REPO_ROOT/public" ]; then
  echo -e "${BLUE}Copying repo public/ into build${NC}"
  cp -r "$REPO_ROOT/public" "$BUILD_DIR/"
fi

echo -e "${BLUE}Writing config.js${NC}"
cat > "$BUILD_DIR/config.js" << EOF
// Quirkly Extension Configuration — ${MODE} build
// Generated $(date -u +%Y-%m-%dT%H:%M:%SZ)

const QuirklyConfig = {
  buildEnvironment: '${MODE}',

  isDevelopment: () => {
    return ${IS_DEV_BOOL};
  },

  environments: {
    development: {
      baseUrl: '${DEV_BASE_URL}',
      authEndpoint: '/api/auth/validate',
      replyEndpoint: '/api/reply/generate',
      profileEndpoint: '/api/profile/extract',
      dashboardUrl: '${DEV_DASHBOARD_URL}'
    },
    production: {
      baseUrl: '${PROD_BASE_URL}',
      authEndpoint: '/api/auth/validate',
      replyEndpoint: '/api/reply/generate',
      profileEndpoint: '/api/profile/extract',
      dashboardUrl: '${PROD_DASHBOARD_URL}'
    }
  },

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

  getEnvironmentInfo: function() {
    const config = this.getConfig();
    console.log('Quirkly Environment Info:', {
      environment: config.environment,
      authUrl: config.authUrl,
      replyUrl: config.replyUrl,
      dashboardUrl: config.dashboardUrl,
      buildEnvironment: this.buildEnvironment
    });
    return config;
  }
};

if (typeof window !== 'undefined') {
  window.QuirklyConfig = QuirklyConfig;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QuirklyConfig;
}
EOF

echo -e "${BLUE}Patching manifest.json${NC}"
if [ "$MODE" = "development" ]; then
  jq '. + {
    "name": "Quirkly (Dev)",
    "description": "AI-powered X replies — development build",
    "version_name": (.version + "-dev")
  } | del(.env)' "$BUILD_DIR/manifest.json" > "$BUILD_DIR/manifest.json.tmp"
else
  jq '. + {"description": "Premium AI-powered reply generator for X (Twitter) with multiple tones and styles"} | del(.env)' \
    "$BUILD_DIR/manifest.json" > "$BUILD_DIR/manifest.json.tmp"
fi
mv "$BUILD_DIR/manifest.json.tmp" "$BUILD_DIR/manifest.json"

if [ "$MODE" = "production" ]; then
  echo -e "${YELLOW}Verifying production config marker…${NC}"
  if ! grep -q "buildEnvironment: 'production'" "$BUILD_DIR/config.js"; then
    echo -e "${RED}Production config marker missing.${NC}" >&2
    exit 1
  fi
  REQUIRED=(
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
  for f in "${REQUIRED[@]}"; do
    if [ ! -f "$BUILD_DIR/$f" ]; then
      echo -e "${RED}Missing required file: $f${NC}" >&2
      exit 1
    fi
  done
  echo -e "${GREEN}All required files present.${NC}"
fi

echo -e "${BLUE}Creating ${ZIP_NAME}${NC}"
(
  cd "$BUILD_DIR"
  zip -r "../${ZIP_NAME}" . -x "*.DS_Store" "*.git*" "node_modules/*" "*.md" "*.log" >/dev/null
)

rm -rf "$BUILD_DIR"

echo -e "${GREEN}Done.${NC}  Output: $REPO_ROOT/$ZIP_NAME"
echo -e "${YELLOW}Mode:${NC} $MODE"
if [ "$MODE" = "development" ]; then
  echo -e "${YELLOW}Load unpacked:${NC} unzip then chrome://extensions → Load unpacked"
else
  echo -e "${YELLOW}Upload ${ZIP_NAME} to Chrome Web Store.${NC}"
fi
