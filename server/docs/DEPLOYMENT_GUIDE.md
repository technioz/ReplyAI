# Quirkly API Server - Deployment Guide

Complete guide for deploying the Quirkly Express API server to production.

## 🚀 Deployment Overview

The Quirkly API server is designed for serverless deployment on **Vercel** with **MongoDB Atlas** as the database and **Stripe** for payment processing.

### Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Chrome Ext    │────│   Vercel API    │────│  MongoDB Atlas  │
│   (Frontend)    │    │   (Express.js)  │    │   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       
         │                       │                       
┌─────────────────┐    ┌─────────────────┐              
│   Dashboard     │────│     Stripe      │              
│   (Next.js)     │    │   (Payments)    │              
└─────────────────┘    └─────────────────┘              
```

## 📋 Prerequisites

### Required Accounts
- ✅ **Vercel Account** - For serverless deployment
- ✅ **MongoDB Atlas Account** - For database hosting
- ✅ **Stripe Account** - For payment processing
- ✅ **GitHub Account** - For repository hosting
- ✅ **Domain Provider** - For custom domain (optional)

### Required Tools
- Node.js 18+
- Git
- Vercel CLI (optional)

## 🗄️ Database Setup (MongoDB Atlas)

### 1. Create MongoDB Cluster

1. **Login to MongoDB Atlas**
   - Go to [cloud.mongodb.com](https://cloud.mongodb.com)
   - Create account or sign in

2. **Create New Project**
   - Click "New Project"
   - Name: "Quirkly Production"
   - Add team members if needed

3. **Create Cluster**
   - Click "Build a Cluster"
   - Choose **M10** or higher for production
   - Select region closest to your users
   - Cluster Name: "quirkly-prod"

### 2. Configure Database Access

1. **Network Access**
   ```
   IP Address: 0.0.0.0/0
   Comment: Allow all (required for Vercel)
   ```

2. **Database User**
   ```
   Username: quirkly-api
   Password: <generate-secure-password>
   Role: Atlas admin
   ```

### 3. Get Connection String

1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Select "Node.js" driver
4. Copy the connection string:
   ```
   mongodb+srv://quirkly-api:<password>@quirkly-prod.abc123.mongodb.net/?retryWrites=true&w=majority
   ```

### 4. Create Database and Collections

The application will automatically create collections, but you can pre-create them:

```javascript
// Database: quirkly
// Collections:
- users
- sessions (TTL index on expiresAt)
```

### 5. Create Indexes

```javascript
// Users collection indexes
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "apiKey": 1 }, { sparse: true, unique: true })
db.users.createIndex({ "stripeCustomerId": 1 }, { sparse: true })
db.users.createIndex({ "sessions.token": 1 })
db.users.createIndex({ "createdAt": -1 })
db.users.createIndex({ "status": 1 })
```

## 💳 Stripe Setup

### 1. Create Stripe Account

1. Go to [stripe.com](https://stripe.com)
2. Create account and complete verification
3. Switch to "Live mode" for production

### 2. Create Products and Prices

#### Basic Plan
```
Product Name: Quirkly Basic
Description: 1,000 AI replies per month
Price: $9.99 USD / month
Billing: Recurring
```

#### Pro Plan
```
Product Name: Quirkly Pro  
Description: 5,000 AI replies per month
Price: $24.99 USD / month
Billing: Recurring
```

#### Enterprise Plan
```
Product Name: Quirkly Enterprise
Description: 20,000 AI replies per month
Price: $99.99 USD / month
Billing: Recurring
```

### 3. Configure Webhooks

1. Go to Developers → Webhooks
2. Add endpoint:
   ```
   URL: https://api.quirkly.technioz.com/api/subscription/webhook
   Events: Select all subscription and invoice events
   ```
3. Copy webhook signing secret

### 4. Get API Keys

1. **Publishable Key**: `pk_live_...`
2. **Secret Key**: `sk_live_...`
3. **Webhook Secret**: `whsec_...`

## 🌐 Vercel Deployment

### 1. Prepare Repository

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Production ready"
   git push origin main
   ```

2. **Verify Structure**
   ```
   server/
   ├── api/
   │   └── index.js
   ├── vercel.json
   └── package.json
   ```

### 2. Deploy to Vercel

#### Option A: Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import from GitHub
4. Select your repository
5. Configure:
   ```
   Framework: Other
   Root Directory: server
   Build Command: npm run build
   Output Directory: api
   Install Command: npm install
   ```

#### Option B: Vercel CLI

1. **Install CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   cd server
   vercel --prod
   ```

### 3. Configure Environment Variables

In Vercel dashboard, go to Settings → Environment Variables:

#### Database Configuration
```env
MONGODB_URI=mongodb+srv://quirkly-api:<password>@quirkly-prod.abc123.mongodb.net/quirkly?retryWrites=true&w=majority
MONGODB_DB_NAME=quirkly
```

#### Authentication & Security
```env
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
API_KEY_SECRET=your-api-key-encryption-secret-minimum-32-characters
BCRYPT_SALT_ROUNDS=12
SESSION_SECRET=your-session-secret-key-minimum-32-characters
```

#### Stripe Configuration
```env
STRIPE_SECRET_KEY=sk_live_your_actual_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_actual_stripe_webhook_secret
STRIPE_BASIC_PRICE_ID=price_actual_basic_plan_price_id
STRIPE_PRO_PRICE_ID=price_actual_pro_plan_price_id
STRIPE_ENTERPRISE_PRICE_ID=price_actual_enterprise_plan_price_id
```

#### Domain & URLs
```env
NODE_ENV=production
DOMAIN_URL=https://api.quirkly.technioz.com
FRONTEND_URL=https://quirkly.technioz.com
EXTENSION_ID=your-actual-chrome-extension-id
```

#### Rate Limiting & Security
```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
FREE_CREDITS_LIMIT=50
CREDITS_RESET_INTERVAL=monthly
```

#### CORS Configuration
```env
CORS_ORIGINS=https://quirkly.technioz.com,https://dashboard.quirkly.com,chrome-extension://your-extension-id
```

#### Optional Configuration
```env
LOG_LEVEL=info
AI_SERVICE_URL=https://ai.technioz.com/webhook/replyai-webhook
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 4. Custom Domain Setup

1. **Add Domain in Vercel**
   - Go to Settings → Domains
   - Add `api.quirkly.technioz.com`

2. **Configure DNS**
   ```
   Type: CNAME
   Name: api
   Value: cname.vercel-dns.com
   TTL: 300
   ```

3. **SSL Certificate**
   - Vercel automatically provisions SSL
   - Wait for verification (usually 1-5 minutes)

## 🔍 Verification & Testing

### 1. Health Check

```bash
curl https://api.quirkly.technioz.com/health
```

Expected response:
```json
{
  "success": true,
  "message": "Quirkly API Server is healthy",
  "timestamp": "2024-01-27T10:30:00.000Z",
  "environment": "production",
  "version": "1.0.0"
}
```

### 2. Database Connection

```bash
curl https://api.quirkly.technioz.com/api/health
```

Should show database connection status.

### 3. Authentication Test

```bash
curl -X POST https://api.quirkly.technioz.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### 4. Stripe Integration Test

```bash
curl https://api.quirkly.technioz.com/api/subscription/plans
```

Should return available subscription plans.

## 📊 Monitoring & Logging

### 1. Vercel Analytics

1. Enable in Vercel dashboard
2. Monitor:
   - Response times
   - Error rates
   - Geographic distribution
   - Function invocations

### 2. MongoDB Monitoring

1. Enable in MongoDB Atlas
2. Monitor:
   - Connection count
   - Query performance
   - Storage usage
   - Index usage

### 3. Stripe Dashboard

Monitor:
- Subscription metrics
- Payment success rates
- Webhook delivery status
- Revenue analytics

### 4. Custom Logging

The application logs to Vercel's console:
- User signups/logins
- API key validations
- Subscription changes
- Error occurrences

Access logs via:
```bash
vercel logs https://api.quirkly.technioz.com
```

## 🚨 Troubleshooting

### Common Deployment Issues

#### 1. Build Failures

**Error**: `Module not found`
```bash
# Solution: Ensure all dependencies are in package.json
npm install --save missing-package
```

**Error**: `Cannot find module './config'`
```bash
# Solution: Check file paths and case sensitivity
# Vercel is case-sensitive
```

#### 2. Database Connection Issues

**Error**: `MongoServerSelectionTimeoutError`
```bash
# Solutions:
# 1. Check MongoDB Atlas network access (0.0.0.0/0)
# 2. Verify connection string format
# 3. Ensure database user has correct permissions
```

**Error**: `Authentication failed`
```bash
# Solutions:
# 1. Check username/password in connection string
# 2. Verify user exists in MongoDB Atlas
# 3. Check database user permissions
```

#### 3. Stripe Integration Issues

**Error**: `No such price`
```bash
# Solutions:
# 1. Verify price IDs in environment variables
# 2. Check if using live vs test keys consistently
# 3. Ensure prices exist in Stripe dashboard
```

**Error**: `Webhook signature verification failed`
```bash
# Solutions:
# 1. Check webhook secret in environment variables
# 2. Verify webhook endpoint URL in Stripe
# 3. Ensure raw body parsing for webhook endpoint
```

#### 4. CORS Issues

**Error**: `Access to fetch blocked by CORS policy`
```bash
# Solutions:
# 1. Update CORS_ORIGINS environment variable
# 2. Check domain spelling and protocol (https/http)
# 3. Verify chrome extension ID if applicable
```

### Environment-Specific Issues

#### Development vs Production

1. **API URLs**: Ensure configs point to production endpoints
2. **Database**: Use separate dev/prod databases
3. **Stripe Keys**: Use live keys for production
4. **CORS**: Include production domains

#### SSL/HTTPS Issues

1. **Mixed Content**: Ensure all requests use HTTPS
2. **Certificate**: Wait for Vercel SSL provisioning
3. **Redirects**: Configure proper HTTP→HTTPS redirects

## 🔐 Security Checklist

### Pre-Deployment Security

- [ ] All secrets in environment variables (not code)
- [ ] Strong JWT secrets (32+ characters)
- [ ] Database user has minimal required permissions
- [ ] CORS configured for specific domains only
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak sensitive info

### Post-Deployment Security

- [ ] SSL certificate active
- [ ] Webhook signatures verified
- [ ] Database network access restricted
- [ ] Monitor for suspicious activity
- [ ] Regular security updates
- [ ] Backup strategy in place

## 🔄 Maintenance & Updates

### Regular Tasks

#### Weekly
- [ ] Check error logs in Vercel
- [ ] Monitor database performance
- [ ] Review Stripe webhook delivery status
- [ ] Check API response times

#### Monthly
- [ ] Update dependencies
- [ ] Review user growth metrics
- [ ] Analyze credit usage patterns
- [ ] Check subscription conversion rates

#### Quarterly
- [ ] Security audit
- [ ] Performance optimization
- [ ] Database cleanup (expired sessions)
- [ ] Cost optimization review

### Update Process

1. **Test Changes Locally**
   ```bash
   npm run dev
   # Test all endpoints
   ```

2. **Deploy to Staging** (optional)
   ```bash
   vercel --target staging
   ```

3. **Deploy to Production**
   ```bash
   vercel --prod
   ```

4. **Verify Deployment**
   ```bash
   curl https://api.quirkly.technioz.com/health
   ```

## 📈 Scaling Considerations

### Database Scaling

- **Vertical**: Upgrade to M20/M30 for more CPU/RAM
- **Horizontal**: Enable sharding for large datasets
- **Read Replicas**: For read-heavy workloads
- **Indexes**: Optimize based on query patterns

### API Scaling

- **Vercel Pro**: Higher limits and better performance
- **Caching**: Implement Redis for session storage
- **CDN**: Use for static assets
- **Load Balancing**: Vercel handles automatically

### Cost Optimization

- **Database**: Right-size cluster based on usage
- **Vercel**: Monitor function execution time
- **Stripe**: Optimize webhook handling
- **Monitoring**: Use appropriate log levels

## 🆘 Emergency Procedures

### Service Outage

1. **Check Status Pages**
   - Vercel Status: status.vercel.com
   - MongoDB Atlas Status: status.cloud.mongodb.com
   - Stripe Status: status.stripe.com

2. **Quick Diagnostics**
   ```bash
   # Check API health
   curl https://api.quirkly.technioz.com/health
   
   # Check recent deployments
   vercel ls
   
   # Check logs
   vercel logs https://api.quirkly.technioz.com
   ```

3. **Rollback if Needed**
   ```bash
   # Rollback to previous deployment
   vercel rollback
   ```

### Database Issues

1. **Connection Problems**
   - Check MongoDB Atlas console
   - Verify network access settings
   - Test connection string locally

2. **Performance Issues**
   - Check MongoDB metrics
   - Review slow query logs
   - Analyze index usage

### Security Incidents

1. **Suspected Breach**
   - Rotate all API keys immediately
   - Check access logs
   - Notify users if needed

2. **API Abuse**
   - Review rate limiting logs
   - Block suspicious IPs
   - Adjust rate limits if needed

---

## 📞 Support

For deployment issues:
- **Vercel**: [vercel.com/support](https://vercel.com/support)
- **MongoDB Atlas**: [support.mongodb.com](https://support.mongodb.com)
- **Stripe**: [support.stripe.com](https://support.stripe.com)

For application-specific issues:
- Email: support@quirkly.technioz.com
- Documentation: [API Reference](API_REFERENCE.md)

---

**🎉 Congratulations! Your Quirkly API server is now live in production!**
