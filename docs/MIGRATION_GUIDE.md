# Migration from n8n to Express Server

This guide documents the migration from the n8n workflow-based backend to a dedicated Express.js server.

## 🔄 Migration Overview

### What Changed

- **Backend**: n8n workflow → Express.js server
- **Database**: Same MongoDB Atlas (schema updated)
- **Authentication**: Enhanced with proper session management
- **Payments**: Integrated Stripe SDK directly
- **Free Credits**: Implemented IP-based tracking
- **Error Handling**: Comprehensive error management
- **Security**: Enhanced with multiple middleware layers

### Why We Migrated

1. **Better Control**: Full control over business logic
2. **Performance**: Faster response times and better caching
3. **Error Handling**: Comprehensive error management and logging
4. **Security**: Advanced security features and rate limiting
5. **Scalability**: Better horizontal scaling capabilities
6. **Maintenance**: Easier debugging and feature development
7. **Testing**: Better unit and integration testing support

## 📊 Architecture Comparison

### Before (n8n)
```
Chrome Extension ──→ n8n Workflow ──→ MongoDB
Dashboard ──────────→ n8n Workflow ──→ MongoDB
```

### After (Express)
```
Chrome Extension ──→ Express API ──→ MongoDB
Dashboard ──────────→ Express API ──→ MongoDB
                     │
                     └──→ Stripe API
```

## 🗃️ Database Schema Changes

### User Model Updates

#### Added Fields
```javascript
// New authentication fields
sessions: [sessionSchema],           // Session management
loginAttempts: Number,              // Security tracking
lockedUntil: Date,                  // Account locking
lastLoginAt: Date,                  // Last login tracking
lastLoginIP: String,                // IP tracking

// Enhanced subscription fields
subscription: subscriptionSchema,    // Full subscription data
stripeCustomerId: String,           // Stripe integration

// Usage tracking
usage: [usageSchema],               // Daily usage statistics

// Preferences
preferences: {                      // User preferences
  defaultTone: String,
  notifications: {
    email: Boolean,
    marketing: Boolean
  }
}
```

#### Schema Enhancements
```javascript
// Session Schema
{
  token: String,
  createdAt: Date,
  expiresAt: Date,
  userAgent: String,
  ipAddress: String,
  isActive: Boolean
}

// Subscription Schema
{
  stripeSubscriptionId: String,
  stripePriceId: String,
  status: String,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  cancelAtPeriodEnd: Boolean,
  plan: String,
  creditsIncluded: Number
}

// Usage Schema
{
  date: Date,
  creditsUsed: Number,
  repliesGenerated: Number,
  month: String,
  year: Number
}
```

### Data Migration Script

```javascript
// Migration script to update existing users
db.users.updateMany(
  {},
  {
    $set: {
      sessions: [],
      loginAttempts: 0,
      usage: [],
      preferences: {
        defaultTone: "professional",
        notifications: {
          email: true,
          marketing: false
        }
      }
    }
  }
)
```

## 🔌 API Endpoint Changes

### Authentication Endpoints

#### Before (n8n)
```
POST /webhook/quirkly-auth
Body: { action: "login", email, password }
```

#### After (Express)
```
POST /api/auth/login
Body: { email, password }

# Or use the legacy format:
POST /api/auth
Body: { action: "login", email, password }
```

### New Endpoints Added

```
# User Management
GET    /api/user/profile
PUT    /api/user/profile
PUT    /api/user/preferences
PUT    /api/user/password
GET    /api/user/stats

# Subscription Management
GET    /api/subscription/plans
POST   /api/subscription/setup
POST   /api/subscription/create
GET    /api/subscription/current
POST   /api/subscription/cancel
GET    /api/subscription/billing

# Credits Management
GET    /api/credits
GET    /api/credits/stats
GET    /api/credits/free

# Reply Generation
POST   /api/reply/generate
GET    /api/reply/history
GET    /api/reply/tones
```

## 🔧 Configuration Updates

### Extension Configuration

#### Before
```javascript
// config.js
environments: {
  development: {
    baseUrl: 'https://ai.technioz.com',
    authEndpoint: '/webhook-test/quirkly-auth',
    replyEndpoint: '/webhook-test/replyai-webhook'
  }
}
```

#### After
```javascript
// config.js
environments: {
  development: {
    baseUrl: 'http://localhost:3001',
    authEndpoint: '/api/auth',
    replyEndpoint: '/api/reply/generate'
  },
  production: {
    baseUrl: 'https://api.quirkly.technioz.com',
    authEndpoint: '/api/auth',
    replyEndpoint: '/api/reply/generate'
  }
}
```

### Dashboard Configuration

#### Before
```typescript
// config.ts
const authUrl = 'https://ai.technioz.com/webhook/quirkly-auth';
```

#### After
```typescript
// config.ts
environments: {
  development: {
    baseUrl: 'http://localhost:3001',
    authEndpoint: '/api/auth',
    subscriptionEndpoint: '/api/subscription',
    userEndpoint: '/api/user'
  }
}
```

## 🚀 Deployment Changes

### Before (n8n)
- n8n instance deployment
- Webhook URL configuration
- Manual workflow import

### After (Express)
- Vercel serverless deployment
- Environment variables configuration
- Automatic CI/CD pipeline

### New Deployment Requirements

1. **MongoDB Atlas**
   - Same database, updated schema
   - New indexes for performance

2. **Stripe Integration**
   - Webhook endpoint configuration
   - Product and price setup

3. **Environment Variables**
   ```env
   # New required variables
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   JWT_SECRET=your-jwt-secret
   BCRYPT_SALT_ROUNDS=12
   ```

## 🔐 Security Enhancements

### New Security Features

1. **Rate Limiting**
   ```javascript
   // 100 requests per 15 minutes per IP
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 100
   });
   ```

2. **Input Validation**
   ```javascript
   // express-validator for all inputs
   body('email').isEmail().normalizeEmail()
   body('password').isLength({ min: 8 })
   ```

3. **Security Middleware**
   ```javascript
   app.use(helmet());              // Security headers
   app.use(mongoSanitize());       // NoSQL injection protection
   app.use(xss());                 // XSS protection
   ```

4. **Account Locking**
   ```javascript
   // Lock account after 5 failed attempts
   if (user.loginAttempts >= 5) {
     user.lockedUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
   }
   ```

## 🎯 Feature Enhancements

### Free Credits System

#### Before
- No free credits for unauthenticated users

#### After
- 50 free credits per day per IP
- Automatic reset at midnight
- Encourages signup after exhaustion

### Subscription Management

#### Before
- Basic Stripe integration via n8n

#### After
- Full Stripe SDK integration
- Subscription lifecycle management
- Billing history and invoices
- Automatic credit resets
- Webhook handling for real-time updates

### Error Handling

#### Before
- Basic error responses from n8n

#### After
- Comprehensive error categorization
- User-friendly error messages
- Detailed logging for debugging
- Proper HTTP status codes

## 🔄 Migration Steps

### 1. Database Migration

```bash
# Connect to MongoDB
mongosh "mongodb+srv://your-connection-string"

# Switch to your database
use quirkly

# Run migration script
load('migration-script.js')
```

### 2. Deploy Express Server

```bash
# Deploy to Vercel
cd server
vercel --prod

# Configure environment variables
# Set all required env vars in Vercel dashboard
```

### 3. Update Extension

```bash
# Update config.js with new endpoints
# Test authentication flow
# Deploy updated extension
```

### 4. Update Dashboard

```bash
# Update config.ts with new endpoints
# Test all features
# Deploy updated dashboard
```

### 5. Configure Stripe

```bash
# Set up webhook endpoint
# Configure products and prices
# Test subscription flow
```

### 6. DNS Updates

```bash
# Point api.quirkly.technioz.com to Vercel
# Update CORS origins
# Test from all environments
```

## ✅ Migration Checklist

### Pre-Migration
- [ ] Backup existing database
- [ ] Test Express server locally
- [ ] Configure all environment variables
- [ ] Set up Stripe products and webhooks
- [ ] Update extension and dashboard configs

### Migration Day
- [ ] Deploy Express server to production
- [ ] Update DNS records
- [ ] Configure Stripe webhook
- [ ] Test authentication flow
- [ ] Test subscription flow
- [ ] Test reply generation
- [ ] Monitor error rates

### Post-Migration
- [ ] Monitor server performance
- [ ] Check database metrics
- [ ] Verify Stripe webhook delivery
- [ ] Test all user flows
- [ ] Update documentation
- [ ] Train support team

## 🚨 Rollback Plan

If issues arise during migration:

### Immediate Rollback
1. **Revert DNS**: Point back to n8n endpoints
2. **Extension**: Deploy previous version
3. **Dashboard**: Deploy previous version

### Database Rollback
1. **Schema**: Remove new fields if needed
2. **Data**: Restore from backup if corrupted
3. **Indexes**: Remove new indexes

### Communication
1. **Users**: Notify of temporary issues
2. **Team**: Alert all stakeholders
3. **Monitoring**: Increase alert sensitivity

## 📊 Success Metrics

### Performance Improvements
- **Response Time**: 50% faster API responses
- **Uptime**: 99.9% availability target
- **Error Rate**: <0.1% error rate

### Feature Enhancements
- **Free Credits**: 50 daily credits for unauthenticated users
- **Subscription Management**: Full Stripe integration
- **Security**: Enhanced protection and monitoring

### User Experience
- **Authentication**: Faster login/signup
- **Error Messages**: More helpful error descriptions
- **Dashboard**: New subscription management features

## 🔍 Monitoring & Alerts

### Key Metrics to Monitor

1. **API Performance**
   - Response times
   - Error rates
   - Request volume

2. **Database Health**
   - Connection count
   - Query performance
   - Storage usage

3. **Subscription Metrics**
   - Signup conversion
   - Payment success rate
   - Churn rate

4. **Security Metrics**
   - Failed login attempts
   - Rate limit hits
   - Suspicious activity

### Alert Thresholds

```javascript
// Example alert configuration
{
  responseTime: { warning: 500, critical: 1000 }, // ms
  errorRate: { warning: 0.05, critical: 0.1 },   // percentage
  dbConnections: { warning: 80, critical: 95 },   // percentage of max
  failedLogins: { warning: 100, critical: 500 }   // per hour
}
```

## 📞 Support & Troubleshooting

### Common Migration Issues

1. **Authentication Errors**
   - Check JWT secret configuration
   - Verify database connection
   - Test API key validation

2. **Subscription Issues**
   - Verify Stripe webhook delivery
   - Check environment variables
   - Test payment flow

3. **Performance Issues**
   - Monitor database queries
   - Check Vercel function limits
   - Optimize heavy operations

### Getting Help

- **Documentation**: [API Reference](server/docs/API_REFERENCE.md)
- **Deployment**: [Deployment Guide](server/docs/DEPLOYMENT_GUIDE.md)
- **Support**: support@quirkly.technioz.com

---

## 🎉 Migration Complete!

The migration from n8n to Express provides:
- ✅ Better performance and reliability
- ✅ Enhanced security and error handling
- ✅ Full Stripe integration
- ✅ Comprehensive API documentation
- ✅ Scalable architecture for future growth

**Next Steps**: Monitor metrics, gather user feedback, and iterate on improvements.
