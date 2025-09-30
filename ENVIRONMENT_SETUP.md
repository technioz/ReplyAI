# Environment Setup

This project ships two pieces that work together:

1. **Chrome extension** – lives in the repo root
2. **Next.js dashboard & API** – lives in `dashboard/`

Follow the steps below to run everything locally.

## Prerequisites

- Node.js 18.17 or newer and npm 9+
- MongoDB instance (Atlas or local) for user, subscription, and credit data
- Stripe test keys if you want to exercise subscription endpoints
- Groq or XAI API key for reply generation

## 1. Configure the Next.js App

```bash
cd dashboard
cp .env.example .env.local
```

Update `.env.local` with at least the following values:

```
MONGODB_URI=your_connection_string
JWT_SECRET=replace_me
AI_PROVIDER=groq            # or xai
groq/xai specific keys       # e.g. GROQ_API_KEY=...
STRIPE_SECRET_KEY=pk_test... # optional during development
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test...
```

Run the app:

```bash
npm install
npm run dev
```

The dashboard UI will be available on `http://localhost:3000`, and API routes mount under the same origin (e.g. `http://localhost:3000/api/reply/generate`).

## 2. Load the Chrome Extension

1. Open Chrome and visit `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the repository root (`XBot/`)
4. The extension will use `config.js` to detect development mode and target `http://localhost:3000`

## 3. Seed an Admin Account (optional)

```bash
cd dashboard
node create-admin.js
```

This script connects with `MONGODB_URI`, creates or resets an admin user, and prints the API key you can plug into the extension.

## 4. Configure AI Providers

See `docs/AI_SETUP.md` for environment variables and testing tips for Groq and XAI integrations.

## 5. Useful Checks

```bash
# Next.js API health check
curl http://localhost:3000/api/health

# Verify reply endpoint
curl -X POST http://localhost:3000/api/reply/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <api-key>" \
  -d '{"tweetText":"Test reply please","tone":"professional"}'
```

With both the extension and Next.js app running, you can authenticate via the popup, generate replies, and manage users/subscriptions from the dashboard UI.
