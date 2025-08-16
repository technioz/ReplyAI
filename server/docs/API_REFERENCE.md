# Quirkly API Reference

Complete API documentation for the Quirkly Express server.

## Base URLs

- **Development**: `http://localhost:3001/api`
- **Production**: `https://api.quirkly.technioz.com/api`

## Authentication

### Authentication Methods

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

## Authentication Endpoints

### POST /auth/signup

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "action": "signup",
  "timestamp": "2024-01-27T10:30:00.000Z",
  "source": "dashboard"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "user": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "apiKey": "qk_1640123456_abc123def456...",
    "status": "active",
    "credits": {
      "available": 50,
      "used": 0,
      "total": 50,
      "lastResetAt": "2024-01-27T10:30:00.000Z"
    },
    "hasActiveSubscription": false,
    "preferences": {
      "defaultTone": "professional",
      "notifications": {
        "email": true,
        "marketing": false
      }
    },
    "createdAt": "2024-01-27T10:30:00.000Z"
  },
  "sessionToken": "abc123def456...",
  "timestamp": "2024-01-27T10:30:00.000Z"
}
```

### POST /auth/login

Authenticate user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "action": "login",
  "timestamp": "2024-01-27T10:30:00.000Z",
  "source": "dashboard"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "apiKey": "qk_1640123456_abc123def456...",
    "status": "active",
    "credits": {
      "available": 45,
      "used": 5,
      "total": 50,
      "lastResetAt": "2024-01-27T10:30:00.000Z"
    },
    "hasActiveSubscription": false,
    "subscription": null,
    "preferences": {
      "defaultTone": "professional",
      "notifications": {
        "email": true,
        "marketing": false
      }
    },
    "createdAt": "2024-01-27T10:30:00.000Z",
    "lastLoginAt": "2024-01-27T10:30:00.000Z"
  },
  "sessionToken": "abc123def456...",
  "timestamp": "2024-01-27T10:30:00.000Z"
}
```

### POST /auth/validate

Validate API key (used by Chrome extension).

**Request Body:**
```json
{
  "apiKey": "qk_1640123456_abc123def456...",
  "action": "validate",
  "timestamp": "2024-01-27T10:30:00.000Z",
  "source": "chrome-extension"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "API key is valid",
  "user": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "apiKey": "qk_1640123456_abc123def456...",
    "status": "active",
    "credits": {
      "available": 45,
      "used": 5,
      "total": 50,
      "lastResetAt": "2024-01-27T10:30:00.000Z"
    },
    "hasActiveSubscription": false,
    "subscription": null,
    "preferences": {
      "defaultTone": "professional"
    },
    "createdAt": "2024-01-27T10:30:00.000Z",
    "lastLoginAt": "2024-01-27T10:30:00.000Z"
  },
  "timestamp": "2024-01-27T10:30:00.000Z"
}
```

### POST /auth/logout

Logout user and invalidate session.

**Request Body:**
```json
{
  "token": "abc123def456...",
  "action": "logout",
  "timestamp": "2024-01-27T10:30:00.000Z",
  "source": "dashboard"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully",
  "timestamp": "2024-01-27T10:30:00.000Z"
}
```

## Reply Generation Endpoints

### POST /reply/generate

Generate AI reply for a tweet.

**Authentication:** API Key or Free Credits

**Request Body:**
```json
{
  "tweetText": "Just launched our new product! What do you think?",
  "tone": "professional",
  "userContext": {
    "industry": "tech",
    "role": "founder"
  },
  "timestamp": "2024-01-27T10:30:00.000Z",
  "source": "chrome-extension"
}
```

**Response (200) - Authenticated User:**
```json
{
  "success": true,
  "reply": "Congratulations on the launch! The product looks innovative and well-designed. Wishing you great success with this venture.",
  "tone": "professional",
  "metadata": {
    "originalTweetLength": 45,
    "replyLength": 108,
    "processingTime": "1.2s",
    "source": "chrome-extension",
    "timestamp": "2024-01-27T10:30:00.000Z"
  },
  "user": {
    "creditsRemaining": 44,
    "hasActiveSubscription": false
  }
}
```

**Response (200) - Free User:**
```json
{
  "success": true,
  "reply": "Congratulations on the launch! The product looks innovative and well-designed. Wishing you great success with this venture.",
  "tone": "professional",
  "metadata": {
    "originalTweetLength": 45,
    "replyLength": 108,
    "processingTime": "1.2s",
    "source": "chrome-extension",
    "timestamp": "2024-01-27T10:30:00.000Z"
  },
  "freeUser": {
    "creditsUsed": 1,
    "creditsRemaining": 49,
    "dailyLimit": 50,
    "signupUrl": "https://quirkly.technioz.com/signup"
  }
}
```

### GET /reply/tones

Get available reply tones.

**Authentication:** None

**Response (200):**
```json
{
  "success": true,
  "tones": [
    {
      "id": "professional",
      "name": "Professional",
      "description": "Formal, respectful, and business-appropriate tone",
      "example": "Thank you for sharing this insightful perspective."
    },
    {
      "id": "casual",
      "name": "Casual",
      "description": "Relaxed, friendly, and conversational tone",
      "example": "Great point! I totally agree with this."
    },
    {
      "id": "humorous",
      "name": "Humorous",
      "description": "Light-hearted, witty, and entertaining tone",
      "example": "This is so true it hurts! 😄"
    },
    {
      "id": "empathetic",
      "name": "Empathetic",
      "description": "Understanding, compassionate, and supportive tone",
      "example": "I can really relate to this. Thanks for sharing."
    },
    {
      "id": "analytical",
      "name": "Analytical",
      "description": "Thoughtful, detailed, and data-driven tone",
      "example": "This raises several interesting points worth considering."
    },
    {
      "id": "enthusiastic",
      "name": "Enthusiastic",
      "description": "Energetic, positive, and excited tone",
      "example": "This is absolutely fantastic! Love the energy!"
    }
  ],
  "defaultTone": "professional",
  "timestamp": "2024-01-27T10:30:00.000Z"
}
```

## Credits Management Endpoints

### GET /credits

Get user credits information.

**Authentication:** API Key or JWT

**Response (200):**
```json
{
  "success": true,
  "credits": {
    "available": 45,
    "used": 5,
    "total": 50,
    "lastResetAt": "2024-01-27T10:30:00.000Z"
  },
  "usage": {
    "today": {
      "creditsUsed": 3,
      "repliesGenerated": 3
    },
    "thisMonth": {
      "creditsUsed": 5,
      "repliesGenerated": 5,
      "daysActive": 2
    }
  },
  "subscription": {
    "hasActive": false,
    "plan": "free",
    "creditsIncluded": 50
  },
  "timestamp": "2024-01-27T10:30:00.000Z"
}
```

### GET /credits/free

Get free credits information for unauthenticated users.

**Authentication:** None

**Response (200):**
```json
{
  "success": true,
  "freeCredits": {
    "limit": 50,
    "used": 5,
    "available": 45,
    "resetsAt": "2024-01-28T00:00:00.000Z"
  },
  "message": "You have 45 free credits remaining today.",
  "signupUrl": "https://quirkly.technioz.com/signup",
  "timestamp": "2024-01-27T10:30:00.000Z"
}
```

## Subscription Management Endpoints

### GET /subscription/plans

Get available subscription plans.

**Authentication:** None

**Response (200):**
```json
{
  "success": true,
  "plans": [
    {
      "id": "basic",
      "name": "Basic Plan",
      "credits": 1000,
      "price": 9.99,
      "stripePriceId": "price_basic_plan_id",
      "features": [
        "1,000 AI replies per month",
        "All tone variations",
        "Email support"
      ]
    },
    {
      "id": "pro",
      "name": "Pro Plan",
      "credits": 5000,
      "price": 24.99,
      "stripePriceId": "price_pro_plan_id",
      "features": [
        "5,000 AI replies per month",
        "All tone variations",
        "Priority support",
        "Advanced analytics"
      ]
    },
    {
      "id": "enterprise",
      "name": "Enterprise Plan",
      "credits": 20000,
      "price": 99.99,
      "stripePriceId": "price_enterprise_plan_id",
      "features": [
        "20,000 AI replies per month",
        "All tone variations",
        "24/7 support",
        "Advanced analytics",
        "Custom integrations"
      ]
    }
  ],
  "currency": "USD",
  "billingCycle": "monthly",
  "timestamp": "2024-01-27T10:30:00.000Z"
}
```

### POST /subscription/setup

Setup Stripe customer for payments.

**Authentication:** JWT

**Response (200):**
```json
{
  "success": true,
  "message": "Payment setup initialized",
  "setupIntent": {
    "id": "seti_abc123",
    "clientSecret": "seti_abc123_secret_def456"
  },
  "customer": {
    "id": "cus_abc123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "publishableKey": "pk_test_abc123...",
  "timestamp": "2024-01-27T10:30:00.000Z"
}
```

### POST /subscription/create

Create new subscription.

**Authentication:** JWT

**Request Body:**
```json
{
  "planId": "pro",
  "paymentMethodId": "pm_abc123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Subscription created successfully",
  "subscription": {
    "id": "sub_abc123",
    "status": "active",
    "plan": "pro",
    "planName": "Pro Plan",
    "creditsIncluded": 5000,
    "currentPeriodStart": "2024-01-27T10:30:00.000Z",
    "currentPeriodEnd": "2024-02-27T10:30:00.000Z",
    "cancelAtPeriodEnd": false
  },
  "credits": {
    "available": 5000,
    "used": 0,
    "total": 5000,
    "lastResetAt": "2024-01-27T10:30:00.000Z"
  },
  "timestamp": "2024-01-27T10:30:00.000Z"
}
```

## User Management Endpoints

### GET /user/profile

Get user profile information.

**Authentication:** JWT

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "apiKey": "qk_1640123456_abc123def456...",
    "status": "active",
    "role": "user",
    "credits": {
      "available": 4995,
      "used": 5,
      "total": 5000,
      "lastResetAt": "2024-01-27T10:30:00.000Z"
    },
    "hasActiveSubscription": true,
    "subscription": {
      "plan": "pro",
      "status": "active",
      "currentPeriodEnd": "2024-02-27T10:30:00.000Z"
    },
    "preferences": {
      "defaultTone": "professional",
      "notifications": {
        "email": true,
        "marketing": false
      }
    },
    "createdAt": "2024-01-27T10:30:00.000Z",
    "lastLoginAt": "2024-01-27T10:30:00.000Z",
    "emailVerified": true
  },
  "timestamp": "2024-01-27T10:30:00.000Z"
}
```

### PUT /user/preferences

Update user preferences.

**Authentication:** JWT

**Request Body:**
```json
{
  "defaultTone": "casual",
  "notifications": {
    "email": true,
    "marketing": true
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Preferences updated successfully",
  "preferences": {
    "defaultTone": "casual",
    "notifications": {
      "email": true,
      "marketing": true
    }
  },
  "timestamp": "2024-01-27T10:30:00.000Z"
}
```

## Error Responses

### Standard Error Format

All errors follow this format:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "statusCode": 400,
  "timestamp": "2024-01-27T10:30:00.000Z",
  "requestId": "req_abc123" // Optional
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `UNAUTHORIZED` | 401 | Authentication required |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `INVALID_API_KEY` | 401 | Invalid API key |
| `FORBIDDEN` | 403 | Access denied |
| `ACCOUNT_INACTIVE` | 403 | Account suspended |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `CREDITS_EXHAUSTED` | 402 | No credits remaining |
| `SUBSCRIPTION_REQUIRED` | 402 | Subscription needed |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `AI_SERVICE_ERROR` | 503 | AI service unavailable |

### Validation Errors

Validation errors include details about failed fields:

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "statusCode": 400,
  "details": [
    "Email is required",
    "Password must be at least 8 characters long"
  ],
  "timestamp": "2024-01-27T10:30:00.000Z"
}
```

## Rate Limiting

### Default Limits
- **Rate**: 100 requests per 15 minutes per IP
- **Burst**: 20 requests per minute
- **Exclusions**: Health check endpoints

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640123456
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests from this IP, please try again later.",
  "retryAfter": 900,
  "statusCode": 429,
  "timestamp": "2024-01-27T10:30:00.000Z"
}
```

## Webhooks

### Stripe Webhook

**Endpoint:** `POST /subscription/webhook`

**Authentication:** Stripe signature verification

**Events Handled:**
- `customer.subscription.created`
- `customer.subscription.updated` 
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Response:**
```json
{
  "received": true
}
```

## Health Checks

### GET /health

Basic server health check.

**Response (200):**
```json
{
  "success": true,
  "message": "Quirkly API Server is healthy",
  "timestamp": "2024-01-27T10:30:00.000Z",
  "environment": "production",
  "version": "1.0.0"
}
```

### GET /api/reply/health

Reply service health check with AI service status.

**Response (200):**
```json
{
  "success": true,
  "service": "Reply Generation Service",
  "status": "healthy",
  "aiService": {
    "url": "https://ai.technioz.com/webhook/replyai-webhook",
    "status": "healthy",
    "responseTime": "150ms"
  },
  "features": {
    "freeCredits": true,
    "authenticatedUsers": true,
    "toneVariations": 6,
    "maxTweetLength": 2000
  },
  "timestamp": "2024-01-27T10:30:00.000Z"
}
```

---

For more information, see the [main documentation](README.md).
