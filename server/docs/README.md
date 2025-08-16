# Quirkly API Server

A comprehensive Express.js API server for the Quirkly AI-powered reply generator, built for production deployment on Vercel with MongoDB Atlas integration.

## 🚀 Features

### Core Features
- ✅ **Express.js Server** - Fast, scalable REST API
- ✅ **MongoDB Integration** - Cloud-ready with MongoDB Atlas
- ✅ **Stripe Payment Processing** - Complete subscription management
- ✅ **JWT Authentication** - Secure token-based authentication
- ✅ **API Key Management** - Chrome extension authentication
- ✅ **Free Credits System** - 50 free credits for unauthenticated users
- ✅ **Rate Limiting** - Protection against abuse
- ✅ **Comprehensive Error Handling** - Production-ready error management
- ✅ **CORS Support** - Cross-origin resource sharing
- ✅ **Security Middleware** - Helmet, XSS protection, input sanitization
- ✅ **Vercel Deployment** - Serverless-ready architecture

### Security Features
- 🔒 **Password Hashing** - bcryptjs with configurable salt rounds
- 🔒 **Input Validation** - express-validator for all endpoints
- 🔒 **MongoDB Injection Protection** - express-mongo-sanitize
- 🔒 **XSS Protection** - xss-clean middleware
- 🔒 **Rate Limiting** - IP-based request throttling
- 🔒 **HTTPS Enforcement** - Secure headers with Helmet
- 🔒 **Session Management** - Secure token handling

## 📁 Project Structure

```
server/
├── api/
│   ├── index.js              # Main Express application
│   ├── config/
│   │   └── database.js       # MongoDB connection configuration
│   ├── middleware/
│   │   ├── auth.js          # Authentication middleware
│   │   └── errorHandler.js  # Global error handling
│   ├── models/
│   │   └── User.js          # MongoDB User model
│   ├── routes/
│   │   ├── auth.js          # Authentication routes
│   │   ├── user.js          # User management routes
│   │   ├── subscription.js  # Stripe subscription routes
│   │   ├── credits.js       # Credits management routes
│   │   └── reply.js         # AI reply generation routes
│   └── utils/
│       └── AppError.js      # Custom error class
├── docs/                    # Documentation
├── package.json            # Dependencies and scripts
├── vercel.json            # Vercel deployment configuration
└── env.example           # Environment variables template
```

## 🛠 Installation & Setup

### Prerequisites
- Node.js 18+ 
- MongoDB Atlas account
- Stripe account (for payments)

### Local Development

1. **Clone and Install**
   ```bash
   cd server
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp env.example .env
   # Edit .env with your configurations
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

   Server will be available at `http://localhost:3001`

### Production Deployment (Vercel)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Configure Environment Variables**
   Set all environment variables in Vercel dashboard.

## 🔧 Environment Variables

### Required Variables

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/quirkly
MONGODB_DB_NAME=quirkly

# Authentication
JWT_SECRET=your-super-secure-jwt-secret
JWT_EXPIRES_IN=7d
API_KEY_SECRET=your-api-key-encryption-secret

# Stripe
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

# Subscription Plans
STRIPE_BASIC_PRICE_ID=price_basic_plan_id
STRIPE_PRO_PRICE_ID=price_pro_plan_id
STRIPE_ENTERPRISE_PRICE_ID=price_enterprise_plan_id

# Security
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Free Credits
FREE_CREDITS_LIMIT=50
```

### Optional Variables

```env
# Domain Configuration
DOMAIN_URL=https://api.quirkly.technioz.com
FRONTEND_URL=https://quirkly.technioz.com

# CORS
CORS_ORIGINS=https://quirkly.technioz.com,chrome-extension://your-extension-id

# Logging
LOG_LEVEL=info

# AI Service
AI_SERVICE_URL=https://ai.technioz.com/webhook/replyai-webhook
```

## 📚 API Documentation

### Base URLs
- **Development**: `http://localhost:3001/api`
- **Production**: `https://api.quirkly.technioz.com/api`

### Authentication

All authenticated endpoints require either:
- **JWT Token**: `Authorization: Bearer <jwt_token>`
- **API Key**: `Authorization: Bearer <api_key>`
- **Session Token**: `Authorization: Session <session_token>`

### Endpoints Overview

#### Authentication (`/api/auth`)
- `POST /signup` - Create new user account
- `POST /login` - User login
- `POST /validate` - Validate API key (Chrome extension)
- `POST /validate-session` - Validate session token (Dashboard)
- `POST /logout` - User logout
- `POST /generate-api-key` - Generate new API key
- `POST /refresh` - Refresh session token
- `GET /me` - Get current user info

#### User Management (`/api/user`)
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `PUT /preferences` - Update user preferences
- `PUT /password` - Change password
- `POST /api-key` - Generate new API key
- `GET /stats` - Get user statistics
- `DELETE /account` - Delete user account

#### Subscription Management (`/api/subscription`)
- `GET /plans` - Get available subscription plans
- `POST /setup` - Setup Stripe customer
- `POST /create` - Create new subscription
- `GET /current` - Get current subscription
- `POST /cancel` - Cancel subscription
- `POST /reactivate` - Reactivate canceled subscription
- `GET /billing` - Get billing history
- `POST /webhook` - Stripe webhook handler

#### Credits Management (`/api/credits`)
- `GET /` - Get user credits info
- `GET /stats` - Get detailed usage statistics
- `POST /use` - Use credits (internal)
- `POST /reset` - Reset credits (admin)
- `GET /free` - Get free credits info (public)

#### Reply Generation (`/api/reply`)
- `POST /generate` - Generate AI reply
- `GET /history` - Get reply history
- `GET /tones` - Get available tones
- `GET /health` - Service health check

### Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "statusCode": 400,
  "timestamp": "2024-01-27T10:30:00.000Z"
}
```

### Rate Limiting

- **Default**: 100 requests per 15 minutes per IP
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Override**: Health check endpoints are excluded

## 💳 Stripe Integration

### Subscription Plans

| Plan | Credits | Price | Features |
|------|---------|-------|----------|
| **Basic** | 1,000 | $9.99/mo | All tones, Email support |
| **Pro** | 5,000 | $24.99/mo | All features, Priority support, Analytics |
| **Enterprise** | 20,000 | $99.99/mo | All features, 24/7 support, Custom integrations |

### Webhook Events Handled

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## 🔐 Security Best Practices

### Implemented Security Measures

1. **Authentication & Authorization**
   - JWT tokens with expiration
   - API key validation
   - Session management
   - Role-based access control

2. **Input Validation & Sanitization**
   - express-validator for all inputs
   - MongoDB injection protection
   - XSS attack prevention
   - File upload restrictions

3. **Rate Limiting & DDoS Protection**
   - IP-based rate limiting
   - Request size limits
   - Timeout configurations
   - Connection pooling

4. **Data Protection**
   - Password hashing with bcrypt
   - Sensitive data encryption
   - Secure cookie settings
   - HTTPS enforcement

5. **Error Handling**
   - No sensitive data in error responses
   - Comprehensive logging
   - Graceful failure handling
   - Stack trace protection in production

## 📊 Monitoring & Logging

### Health Checks
- `GET /health` - Basic server health
- `GET /api/health` - API service health
- `GET /api/reply/health` - Reply service health

### Logging Levels
- **Error**: System errors, authentication failures
- **Warn**: Rate limit exceeded, deprecated API usage
- **Info**: User actions, subscription changes
- **Debug**: Request/response details (development only)

## 🚀 Deployment Guide

### Vercel Deployment

1. **Connect Repository**
   - Link GitHub repository to Vercel
   - Set build command: `npm run build`
   - Set output directory: `api`

2. **Environment Variables**
   - Add all required environment variables in Vercel dashboard
   - Ensure `NODE_ENV=production`

3. **Domain Configuration**
   - Add custom domain: `api.quirkly.technioz.com`
   - Configure DNS records
   - Enable SSL certificate

### MongoDB Atlas Setup

1. **Create Cluster**
   - Choose appropriate tier (M10+ for production)
   - Configure network access (0.0.0.0/0 for Vercel)
   - Create database user

2. **Connection String**
   - Use SRV connection string
   - Include retry writes and read preference
   - Set appropriate timeout values

### Stripe Configuration

1. **Webhook Endpoint**
   - URL: `https://api.quirkly.technioz.com/api/subscription/webhook`
   - Events: All subscription and invoice events
   - API Version: Latest

2. **Product Setup**
   - Create products for each plan
   - Set up recurring prices
   - Configure trial periods if needed

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```
   Solution: Check MONGODB_URI and network access settings
   ```

2. **Stripe Webhook Failures**
   ```
   Solution: Verify webhook secret and endpoint URL
   ```

3. **CORS Issues**
   ```
   Solution: Update CORS_ORIGINS environment variable
   ```

4. **Rate Limit Exceeded**
   ```
   Solution: Adjust RATE_LIMIT_MAX_REQUESTS or implement user-based limiting
   ```

### Debug Mode

Enable debug logging in development:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

## 📈 Performance Optimization

### Database Optimization
- Indexed fields: email, apiKey, stripeCustomerId
- Connection pooling with maxPoolSize: 10
- Query optimization with projections
- Aggregation pipelines for statistics

### Caching Strategy
- In-memory caching for free credits
- Redis integration ready for session storage
- CDN integration for static assets

### Monitoring
- Response time tracking
- Error rate monitoring
- Database performance metrics
- Stripe webhook success rates

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Follow coding standards
4. Add comprehensive tests
5. Update documentation
6. Submit pull request

## 📄 License

This project is proprietary software. All rights reserved.

---

**Built with ❤️ by the Quirkly Team**

For support, contact: support@quirkly.technioz.com
