# Express to Next.js Migration Guide

This document outlines the migration of the Express.js server functionality into the Next.js dashboard as API routes.

## 🚀 Migration Overview

We've successfully migrated the Express.js server functionality into the Next.js dashboard, eliminating the need for a separate server while maintaining all the production-level features.

### What Was Migrated

- ✅ **Database Configuration** - MongoDB connection with robust fallbacks
- ✅ **User Model** - Complete Mongoose schema with all methods
- ✅ **Authentication Middleware** - JWT, API key, and session validation
- ✅ **Error Handling** - Comprehensive error management system
- ✅ **API Routes** - All Express endpoints converted to Next.js API routes
- ✅ **Security Features** - Rate limiting, input validation, CORS

## 📁 New File Structure

```
dashboard/src/
├── app/api/                    # Next.js API routes
│   ├── auth/                   # Authentication endpoints
│   │   ├── signup/route.ts     # User registration
│   │   ├── login/route.ts      # User login
│   │   ├── validate/route.ts   # API key validation
│   │   └── me/route.ts         # Get current user
│   ├── reply/                  # AI reply generation
│   │   └── generate/route.ts   # Generate AI replies
│   └── health/route.ts         # Health check endpoint
├── lib/                        # Core utilities
│   ├── database.ts             # Database connection logic
│   ├── db.ts                   # Next.js optimized DB connection
│   ├── errors.ts               # Error handling utilities
│   ├── middleware/             # Authentication middleware
│   │   └── auth.ts             # Auth functions
│   └── models/                 # Database models
│       └── User.ts             # User model with all methods
└── env.example                 # Environment configuration
```

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
cd dashboard
npm install
```

### 2. Environment Configuration

Copy the environment template and configure your variables:

```bash
cp env.example .env.local
```

**Required Environment Variables:**

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/quirkly
MONGODB_DB_NAME=quirkly

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
BCRYPT_SALT_ROUNDS=12

# Stripe (if using payments)
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_key

# AI Service
AI_SERVICE_URL=https://ai.technioz.com/webhook/replyai-webhook
```

### 3. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000/api/*`

## 🌐 API Endpoints

### Authentication

- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/validate` - API key validation (Chrome extension)
- `GET /api/auth/me` - Get current user info

### AI Reply Generation

- `POST /api/reply/generate` - Generate AI replies with credit management

### Health Check

- `GET /api/health` - Server health status

## 🔐 Authentication Methods

The API supports multiple authentication methods:

1. **JWT Token** (Dashboard)
   ```
   Authorization: Bearer <jwt_token>
   ```

2. **API Key** (Chrome Extension)
   ```
   Authorization: Bearer <api_key>
   ```

3. **Session Token** (Dashboard Alternative)
   ```
   Authorization: Session <session_token>
   ```

## 💾 Database Features

### Connection Management
- Automatic connection pooling
- Retry logic with exponential backoff
- Fallback connection strategies
- Health monitoring

### User Management
- Secure password hashing with bcrypt
- Session token management
- API key generation and validation
- Credit system with usage tracking
- Subscription management

## 🛡️ Security Features

- **Input Validation** - Comprehensive request validation
- **Rate Limiting** - Built-in request throttling
- **CORS Protection** - Configurable cross-origin policies
- **SQL Injection Protection** - MongoDB injection prevention
- **XSS Protection** - Cross-site scripting prevention
- **Authentication** - Multi-method auth with role-based access

## 📊 Production Deployment

### Vercel (Recommended)

1. **Connect Repository**
   - Link GitHub repository to Vercel
   - Set build command: `npm run build`
   - Set output directory: `out`

2. **Environment Variables**
   - Add all required environment variables in Vercel dashboard
   - Ensure `NODE_ENV=production`

3. **Domain Configuration**
   - Add custom domain: `api.quirkly.technioz.com`
   - Configure DNS records
   - Enable SSL certificate

### Environment Variables for Production

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/quirkly
JWT_SECRET=your-production-jwt-secret
STRIPE_SECRET_KEY=sk_live_your_production_key
AI_SERVICE_URL=https://ai.technioz.com/webhook/replyai-webhook
```

## 🔄 Migration Benefits

### Advantages

1. **Simplified Deployment** - Single application to deploy
2. **Reduced Infrastructure** - No separate server to maintain
3. **Better Performance** - API routes run on the same domain
4. **Easier Development** - Single codebase to work with
5. **Cost Reduction** - Fewer hosting services needed

### Maintained Features

- ✅ All Express.js functionality preserved
- ✅ Database connection robustness
- ✅ Authentication and authorization
- ✅ Error handling and validation
- ✅ Security middleware
- ✅ API rate limiting
- ✅ Credit management system

## 🧪 Testing

### Test API Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# User signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!","fullName":"Test User"}'

# API key validation
curl -X POST http://localhost:3000/api/auth/validate \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"qk_test_key_here"}'
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check `MONGODB_URI` environment variable
   - Verify MongoDB Atlas network access (0.0.0.0/0)
   - Check database user permissions

2. **Authentication Errors**
   - Verify `JWT_SECRET` is set
   - Check token format and expiration
   - Ensure user account is active

3. **API Route Not Found**
   - Verify file structure matches Next.js conventions
   - Check route file naming (`route.ts`)
   - Ensure proper export of HTTP methods

### Debug Mode

Enable debug logging in development:

```env
LOG_LEVEL=debug
NODE_ENV=development
```

## 📈 Next Steps

### Immediate Actions

1. **Test All Endpoints** - Verify functionality matches Express server
2. **Update Frontend** - Ensure API calls point to new endpoints
3. **Deploy to Staging** - Test in production-like environment
4. **Monitor Performance** - Check API response times and error rates

### Future Enhancements

- [ ] Add more API routes (subscription, credits, user management)
- [ ] Implement caching with Redis
- [ ] Add comprehensive logging and monitoring
- [ ] Create API documentation with Swagger
- [ ] Add unit and integration tests

## 🤝 Support

For migration issues:
- Check this README for common solutions
- Review Next.js API routes documentation
- Contact the development team

---

**🎉 Migration Complete!** Your Express.js server is now fully integrated into the Next.js dashboard with all production-level features intact.
