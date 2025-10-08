# 🚀 Deploy Quirkly Dashboard to Vercel

Complete guide to deploy your Next.js dashboard to Vercel with all necessary configurations.

---

## 📋 Prerequisites

### 1. Accounts You Need
- ✅ **Vercel Account** (free) - https://vercel.com/signup
- ✅ **GitHub Account** (you have this)
- ✅ **MongoDB Atlas** (for database)
- ✅ **Groq API Key** or **XAI API Key** (for AI)
- ⚪ **Stripe Account** (optional - for payments)

### 2. Required Environment Variables
You'll need these values ready:
- `MONGODB_URI` - Your MongoDB connection string
- `MONGODB_DB_NAME` - Database name (quirkly)
- `JWT_SECRET` - Secret key for JWT tokens
- `AI_PROVIDER` - groq or xai
- `GROQ_API_KEY` or `XAI_API_KEY` - AI service key
- `NEXT_PUBLIC_APP_URL` - Your Vercel URL
- `STRIPE_SECRET_KEY` (optional)

---

## 🎯 Deployment Method 1: Vercel CLI (Recommended)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel

# Verify installation
vercel --version
```

### Step 2: Login to Vercel
```bash
vercel login
```
- Choose your authentication method (GitHub, GitLab, Bitbucket, or Email)
- Complete the authentication

### Step 3: Navigate to Dashboard
```bash
cd /Users/gauravbhatia/Technioz/XBot/dashboard
```

### Step 4: Deploy to Vercel
```bash
# First deployment (with setup)
vercel

# Answer the prompts:
# ? Set up and deploy "dashboard"? [Y/n] Y
# ? Which scope do you want to deploy to? [Your Account]
# ? Link to existing project? [y/N] N
# ? What's your project's name? quirkly-dashboard
# ? In which directory is your code located? ./
# ? Want to override the settings? [y/N] N
```

### Step 5: Configure Environment Variables
```bash
# Add environment variables one by one
vercel env add MONGODB_URI production
# Paste your MongoDB URI when prompted

vercel env add MONGODB_DB_NAME production
# Enter: quirkly

vercel env add JWT_SECRET production
# Paste your JWT secret (generate with: openssl rand -hex 64)

vercel env add AI_PROVIDER production
# Enter: groq (or xai)

vercel env add GROQ_API_KEY production
# Paste your Groq API key

vercel env add NEXT_PUBLIC_APP_URL production
# Enter your Vercel URL (you'll get this after first deploy)

# Add more as needed:
vercel env add XAI_API_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
```

### Step 6: Deploy to Production
```bash
vercel --prod
```

### Step 7: Get Your URL
After deployment, Vercel will provide your URL:
```
✅ Production: https://quirkly-dashboard.vercel.app
```

---

## 🌐 Deployment Method 2: Vercel Dashboard (GUI)

### Step 1: Push Code to GitHub
```bash
# Make sure all changes are committed
cd /Users/gauravbhatia/Technioz/XBot
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Step 2: Import Project to Vercel
1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Import your GitHub repository: `technioz/ReplyAI`
4. Vercel will detect Next.js automatically

### Step 3: Configure Project Settings

**Framework Preset:**
- Automatically detected as Next.js ✅

**Root Directory:**
```
dashboard
```

**Build Command:**
```bash
npm run build
```

**Output Directory:**
```
.next
```

**Install Command:**
```bash
npm install
```

### Step 4: Configure Environment Variables
Add these in the Vercel dashboard:

| Name | Value | Environment |
|------|-------|-------------|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster...` | Production |
| `MONGODB_DB_NAME` | `quirkly` | Production |
| `JWT_SECRET` | `your-64-char-secret` | Production |
| `AI_PROVIDER` | `groq` or `xai` | Production |
| `GROQ_API_KEY` | `gsk_...` | Production |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Production |
| `XAI_API_KEY` | `xai-...` | Production, Preview |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Production |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Production |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Production |

### Step 5: Deploy
1. Click "Deploy"
2. Wait for build to complete (2-3 minutes)
3. Your app will be live!

---

## 🔧 Post-Deployment Configuration

### 1. Update Environment Variables with Actual URL

After first deployment, you'll have your Vercel URL. Update:

```bash
# Update NEXT_PUBLIC_APP_URL with your actual URL
vercel env add NEXT_PUBLIC_APP_URL production
# Enter: https://quirkly-dashboard.vercel.app (or your custom domain)

# Redeploy to apply changes
vercel --prod
```

Or in Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Edit `NEXT_PUBLIC_APP_URL`
3. Set to your actual Vercel URL
4. Redeploy

### 2. Set Up Custom Domain (Optional)

**In Vercel Dashboard:**
1. Go to Project Settings → Domains
2. Add your domain: `quirkly.technioz.com`
3. Follow DNS configuration instructions
4. Add these DNS records:

```
Type: CNAME
Name: quirkly (or @)
Value: cname.vercel-dns.com
```

5. Wait for DNS propagation (can take up to 48 hours)

### 3. Update Extension Config

Update your Chrome extension's `config.js`:

```javascript
const config = {
  production: {
    apiUrl: 'https://quirkly.technioz.com', // Your Vercel URL
    // ... other settings
  }
};
```

### 4. Configure CORS

The API should already have CORS configured, but verify in:
`dashboard/src/app/api/*/route.ts`

Headers should include:
```typescript
'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL
```

---

## 🔐 Security Checklist

### Before Going Live:

- [ ] All environment variables are set in Vercel
- [ ] JWT_SECRET is strong (64+ characters)
- [ ] MongoDB connection uses production cluster
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] API keys are not exposed in client code
- [ ] HTTPS is enabled (Vercel provides this automatically)
- [ ] Environment variables are NOT in git
- [ ] `.env` files are in `.gitignore`

---

## 📊 Vercel Configuration Files

### `vercel.json` (Already Created)
Located at: `dashboard/vercel.json`

Key configurations:
- **Region**: `iad1` (US East)
- **Framework**: Next.js
- **Build Command**: `npm run build`
- **Function Timeout**: 30 seconds for API routes

### `.env.example` (Already Created)
Template for environment variables
Located at: `dashboard/.env.example`

---

## 🧪 Testing Your Deployment

### 1. Health Check
```bash
curl https://your-app.vercel.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

### 2. Test API Endpoints
```bash
# Test signup
curl -X POST https://your-app.vercel.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test12345!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Test login
curl -X POST https://your-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test12345!"
  }'
```

### 3. Test Extension Connection
1. Update extension config with new URL
2. Reload extension
3. Try logging in
4. Generate a reply

---

## 🔄 Continuous Deployment

### Automatic Deployments

Vercel automatically deploys when you push to GitHub:

**Production Deployments:**
- Triggered by: Push to `main` branch
- URL: https://your-app.vercel.app

**Preview Deployments:**
- Triggered by: Push to any other branch or Pull Requests
- URL: https://your-app-git-branch.vercel.app

### Manual Deployments

```bash
# Deploy current code
vercel

# Deploy to production
vercel --prod

# Deploy specific branch
vercel --prod --git-branch=develop
```

---

## 📈 Monitoring & Analytics

### Vercel Dashboard Features:

1. **Deployments**
   - View all deployments
   - See build logs
   - Check deployment status

2. **Analytics**
   - Page views
   - Response times
   - Error rates
   - Geographic distribution

3. **Logs**
   - Real-time function logs
   - Error tracking
   - Request logs

4. **Usage**
   - Bandwidth usage
   - Function execution time
   - Build minutes

### Access Logs:
```bash
# View logs in real-time
vercel logs https://your-app.vercel.app --follow

# View logs for specific function
vercel logs https://your-app.vercel.app/api/auth/login
```

---

## 🚨 Troubleshooting

### Build Fails

**Error: "Module not found"**
```bash
# Solution: Ensure all dependencies are in package.json
npm install
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

**Error: "Environment variable not found"**
```bash
# Solution: Add missing environment variable
vercel env add VARIABLE_NAME production
# Then redeploy
vercel --prod
```

### Runtime Errors

**Error: "Cannot connect to MongoDB"**
- Check `MONGODB_URI` is correct in Vercel environment variables
- Verify MongoDB Atlas allows connections from any IP (0.0.0.0/0)
- Check database name is correct

**Error: "JWT verification failed"**
- Ensure `JWT_SECRET` is the same in Vercel as in your local env
- Check token is being passed correctly in Authorization header

### CORS Errors

**Error: "CORS policy blocked"**
- Verify `NEXT_PUBLIC_APP_URL` matches your actual domain
- Check API routes include proper CORS headers
- Update extension's config.js with correct API URL

---

## 💡 Best Practices

### 1. Environment Management
```bash
# Use different environments
vercel env add VARIABLE_NAME production   # For production
vercel env add VARIABLE_NAME preview      # For preview/staging
vercel env add VARIABLE_NAME development  # For local dev
```

### 2. Database Connection Pooling
Your MongoDB connection already uses connection pooling:
```typescript
maxPoolSize: 10
```
This is optimal for Vercel's serverless functions.

### 3. Function Timeout
API routes have 30-second timeout (configured in vercel.json)
For longer operations:
- Use background jobs
- Implement webhooks
- Use Vercel Edge Functions

### 4. Caching
Add caching headers for static content:
```typescript
export async function GET() {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
    }
  });
}
```

---

## 📦 Deployment Checklist

### Pre-Deployment:
- [ ] All code committed and pushed to GitHub
- [ ] Environment variables documented in `.env.example`
- [ ] Dependencies up to date
- [ ] Build succeeds locally (`npm run build`)
- [ ] Tests passing (if any)
- [ ] MongoDB Atlas cluster created
- [ ] AI API keys obtained

### Deployment:
- [ ] Vercel project created
- [ ] Root directory set to `dashboard`
- [ ] All environment variables added
- [ ] First deployment successful
- [ ] Health check endpoint working
- [ ] API endpoints responding

### Post-Deployment:
- [ ] Custom domain configured (if applicable)
- [ ] NEXT_PUBLIC_APP_URL updated with actual URL
- [ ] Extension config updated
- [ ] Extension tested with production API
- [ ] MongoDB connection verified
- [ ] AI service tested
- [ ] Error monitoring set up
- [ ] Team notified of new URL

---

## 🎉 Success!

Your Quirkly dashboard should now be live at:
```
https://quirkly-dashboard.vercel.app
or
https://quirkly.technioz.com (with custom domain)
```

### Next Steps:
1. Test all functionality
2. Update Chrome extension with production URL
3. Monitor logs and analytics
4. Set up custom domain
5. Configure DNS
6. Share with users!

---

## 📞 Support & Resources

**Vercel Documentation:**
- https://vercel.com/docs
- https://vercel.com/docs/concepts/projects/environment-variables
- https://vercel.com/docs/cli

**Next.js on Vercel:**
- https://nextjs.org/docs/deployment
- https://vercel.com/docs/frameworks/nextjs

**MongoDB Atlas:**
- https://www.mongodb.com/docs/atlas/

**Need Help?**
- Vercel Support: https://vercel.com/support
- Vercel Community: https://github.com/vercel/vercel/discussions
- Next.js Discord: https://nextjs.org/discord

---

## 🔄 Quick Reference Commands

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Add environment variable
vercel env add VARIABLE_NAME production

# Remove environment variable
vercel env rm VARIABLE_NAME production

# View logs
vercel logs https://your-app.vercel.app --follow

# List projects
vercel list

# Link local project to Vercel
vercel link

# Pull environment variables to local
vercel env pull .env.local
```

---

**Happy Deploying! 🚀**

