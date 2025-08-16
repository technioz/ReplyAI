# Environment Setup Guide

This guide explains how to set up environment variables for different deployment stages.

## 🚀 Quick Setup

### For Development (Local)

1. **Server Environment**:
   ```bash
   cd server/
   cp env.development.example .env.local
   # Edit .env.local with your values
   ```

2. **Dashboard Environment**:
   ```bash
   cd dashboard/
   cp env.development.example .env.local
   # Edit .env.local with your values
   ```

3. **Start Development Servers**:
   ```bash
   # Terminal 1 - Server
   cd server/
   NODE_ENV=development npm run dev

   # Terminal 2 - Dashboard  
   cd dashboard/
   npm run dev
   ```

### For Production

1. **Server Environment**:
   ```bash
   cd server/
   cp env.production.example .env.production
   # Edit .env.production with your production values
   ```

2. **Dashboard Environment**:
   ```bash
   cd dashboard/
   cp env.production.example .env.production
   # Edit .env.production with your production values
   ```

## 📁 Environment Files Structure

```
XBot/
├── server/
│   ├── .env.local                    # Development (git-ignored)
│   ├── .env.production              # Production (git-ignored)
│   ├── env.example                  # General template
│   ├── env.development.example      # Development template
│   └── env.production.example       # Production template
├── dashboard/
│   ├── .env.local                   # Development (git-ignored)
│   ├── .env.production             # Production (git-ignored)
│   ├── env.development.example     # Development template
│   └── env.production.example      # Production template
└── config.js                       # Chrome Extension config
```

## 🔧 Key Configuration Changes

### Fixed Issues

1. **CORS Configuration**:
   - ✅ Development: Allows all origins
   - ✅ Production: Strict whitelist only

2. **AI Service URLs**:
   - ❌ Old: `https://ai.technioz.com/webhook/replyai-webhook` (n8n)
   - ✅ New: `https://api.quirkly.technioz.com/api/ai/generate` (Express)

3. **Environment Detection**:
   - ✅ Server: Uses `NODE_ENV` environment variable
   - ✅ Dashboard: Uses `NEXT_PUBLIC_ENV` and hostname detection
   - ✅ Extension: Uses manifest detection

## 🌍 Environment Variables Reference

### Server (.env files)

| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `NODE_ENV` | `development` | `production` | Environment mode |
| `PORT` | `3001` | `3001` | Server port |
| `DOMAIN_URL` | `http://localhost:3001` | `https://api.quirkly.technioz.com` | API domain |
| `FRONTEND_URL` | `http://localhost:3000` | `https://quirkly.technioz.com` | Dashboard URL |
| `AI_SERVICE_URL` | `http://localhost:3001/api/ai/generate` | `https://api.quirkly.technioz.com/api/ai/generate` | AI service endpoint |
| `CORS_ORIGINS` | `http://localhost:3000,chrome-extension://` | `https://quirkly.technioz.com,chrome-extension://id` | Allowed CORS origins |
| `LOG_LEVEL` | `debug` | `info` | Logging level |
| `RATE_LIMIT_MAX_REQUESTS` | `1000` | `100` | Rate limit per window |

### Dashboard (.env files)

| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `NEXT_PUBLIC_ENV` | `development` | `production` | Environment mode |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3001` | `https://api.quirkly.technioz.com` | API base URL |
| `NEXT_PUBLIC_DASHBOARD_URL` | `http://localhost:3000` | `https://quirkly.technioz.com` | Dashboard URL |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` | Stripe public key |

## 🔐 Security Notes

### Development
- Uses test Stripe keys
- Relaxed rate limiting (1000 req/window)
- Debug logging enabled
- CORS allows all origins
- Weaker password hashing (10 rounds)

### Production
- Uses live Stripe keys
- Strict rate limiting (100 req/window)  
- Info logging only
- CORS whitelist only
- Strong password hashing (12 rounds)
- Strong JWT secrets required

## 🚨 Important Security Requirements

### Before Production Deployment

1. **Change Default Secrets**:
   ```bash
   # Generate strong JWT secret
   JWT_SECRET=$(openssl rand -base64 64)
   
   # Generate API key secret
   API_KEY_SECRET=$(openssl rand -base64 32)
   
   # Generate session secret
   SESSION_SECRET=$(openssl rand -base64 32)
   ```

2. **Update Stripe Keys**:
   - Replace test keys with live keys
   - Configure webhook endpoints
   - Set up product/price IDs

3. **Configure CORS**:
   - Add your production domains to `CORS_ORIGINS`
   - Include your Chrome extension ID

4. **Database Security**:
   - Use production MongoDB cluster
   - Configure IP whitelist
   - Use strong database credentials

## 🔄 Environment Detection Logic

### Server
```javascript
const isDevelopment = process.env.NODE_ENV === 'development';
```

### Dashboard
```typescript
const isDevelopment = 
  process.env.NODE_ENV === 'development' || 
  process.env.NEXT_PUBLIC_ENV === 'development' ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost');
```

### Chrome Extension
```javascript
const isDevelopment = !('update_url' in chrome.runtime.getManifest());
```

## 🧪 Testing Environment Setup

Run these commands to verify your setup:

```bash
# Test server environment
curl http://localhost:3001/health

# Test CORS
curl -X GET http://localhost:3001/api/subscription/plans \
  -H "Origin: http://localhost:3000"

# Test dashboard connection
curl http://localhost:3000
```

## 📝 Deployment Checklist

- [ ] Copy environment templates
- [ ] Update all secret keys
- [ ] Configure Stripe keys
- [ ] Set production domains
- [ ] Test CORS configuration
- [ ] Verify database connection
- [ ] Test authentication flow
- [ ] Check logging levels
- [ ] Validate rate limiting

---

**🎯 Result**: Clean separation between development and production environments with proper security and configuration management.
