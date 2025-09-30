# Quirkly Dashboard & API

This folder hosts the Quirkly marketing site, user dashboard, and the API consumed by the Chrome extension.

## What It Includes

- **Next.js 14 app** with the App Router (`src/app`)
- **API routes** for authentication, reply generation, credits, subscriptions, admin tooling, and health checks
- **Reusable UI components** for marketing pages, dashboard widgets, subscription flows, and admin screens
- **Utility scripts** like `create-admin.js` to bootstrap an admin account

## Getting Started

```bash
npm install
cp .env.example .env.local
# edit .env.local with MongoDB, JWT, AI provider, and Stripe values
npm run dev
```

The site and API will run on `http://localhost:3000`.

## Key Environment Variables

- `MONGODB_URI` – MongoDB connection string
- `JWT_SECRET` – signing key for JWT-based auth
- `AI_PROVIDER` – `groq` or `xai`
- `GROQ_API_KEY` / `XAI_API_KEY` – provider credentials
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` – Stripe integration (optional for local testing)

See `../ENVIRONMENT_SETUP.md` and `../docs/AI_SETUP.md` for details.

## Helpful Commands

- `npm run dev` – start Next.js in development
- `npm run build` – production build
- `npm run start` – run built app
- `npm run lint` – lint the project
- `npm run type-check` – TypeScript check

## Project Structure Highlights

```
src/
  app/                # App Router pages and API routes
  components/         # Shared UI blocks
  lib/                # Database, AI services, auth helpers, utilities
  middleware.ts       # Next.js middleware for auth/gating
```

## Related Docs

- `../PROJECT_SUMMARY.md`
- `../ENVIRONMENT_SETUP.md`
- `../docs/AI_SETUP.md`
