# Quirkly Project Overview

## Current Scope

The repository contains two deliverables that ship together:

- **Chrome extension (`manifest.json`, `background.js`, `content.js`, `popup.*`)** – injects Quirkly controls on X (Twitter), authenticates with an API key, calls a backend to generate tone-aware replies, and pushes the output back into the reply composer.
- **Next.js dashboard & API (`dashboard/`)** – hosts the marketing site, user dashboard, and all API routes the extension consumes (authentication, reply generation, subscription handling, credits, admin tooling, etc.).

There is no standalone Express server in this codebase; all server-side logic now lives inside the Next.js `app/api` routes.

## Major Capabilities

- **API key authentication** – `background.js` validates keys via `config.js` endpoints and stores authenticated state in Chrome sync storage.
- **Reply generation** – Extension requests are proxied through the background service worker to `/api/reply/generate`, which fans out to Groq or XAI depending on configuration.
- **Dashboard experience** – Next.js pages under `src/app` cover marketing, user onboarding, dashboard analytics, subscription management, and admin views.
- **Billing & credits** – Stripe-integrated routes in `src/app/api/subscription/*` plus credit tracking under `src/app/api/credits/*` manage usage limits.
- **Admin utilities** – Admin endpoints (`src/app/api/admin/*`) and the `create-admin.js` script help bootstrap and maintain privileged accounts.

## Key Files

- Extension runtime: `manifest.json`, `config.js`, `background.js`, `content.js`, `popup.html`, `popup.js`, `styles.css`
- Dashboard entry points: `dashboard/src/app/page.tsx`, `dashboard/src/app/dashboard/page.tsx`
- Reply API: `dashboard/src/app/api/reply/generate/route.ts`
- AI provider adapters: `dashboard/src/lib/ai/AIServiceFactory.ts`, `dashboard/src/lib/ai/GroqService.ts`, `dashboard/src/lib/ai/XAIService.ts`
- User model: `dashboard/src/lib/models/User.ts`
- Admin bootstrap: `dashboard/create-admin.js`

## What Is Not Included

- No legacy n8n workflows
- No separate Express server deployment
- No serverless configuration outside what Next.js already provides

Refer to the updated `ENVIRONMENT_SETUP.md` and `docs/AI_SETUP.md` for local setup details.
