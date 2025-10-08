#!/bin/bash

# Generate secure secrets for Quirkly deployment

echo "🔐 Generating Secure Secrets for Quirkly"
echo "========================================="
echo ""

# Generate JWT Secret
echo "📝 JWT_SECRET (64 characters):"
echo "================================"
JWT_SECRET=$(openssl rand -hex 64)
echo "$JWT_SECRET"
echo ""
echo "Copy this value for Vercel environment variable: JWT_SECRET"
echo ""

# Generate a backup JWT secret
echo "📝 BACKUP JWT_SECRET (for disaster recovery):"
echo "==============================================="
BACKUP_SECRET=$(openssl rand -hex 64)
echo "$BACKUP_SECRET"
echo ""
echo "Store this securely in case you need to reset the primary secret"
echo ""

# Generate API Key for admin
echo "📝 ADMIN API KEY (for testing):"
echo "================================"
ADMIN_API_KEY=$(openssl rand -hex 32)
echo "quirkly_$ADMIN_API_KEY"
echo ""
echo "Use this for initial API testing"
echo ""

echo "========================================="
echo "✅ Secrets Generated!"
echo "========================================="
echo ""
echo "⚠️  IMPORTANT:"
echo "  • Store these secrets securely"
echo "  • Never commit to git"
echo "  • Use in Vercel environment variables"
echo "  • Keep backup secret offline"
echo ""
echo "📋 Next Steps:"
echo "  1. Copy JWT_SECRET above"
echo "  2. Run: vercel env add JWT_SECRET production"
echo "  3. Paste the secret when prompted"
echo "  4. Continue with deployment"
echo ""

