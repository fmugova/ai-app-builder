<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into BuildFlow, a Next.js 15 App Router application. Here is a summary of all changes made:

## Summary of changes

- **`instrumentation-client.ts`** — Added `posthog.init()` using the recommended Next.js 15.3+ `instrumentation-client.ts` approach (below the existing Sentry init). Configured with the EU host reverse proxy (`/ingest`), exception capture, and debug mode in development.
- **`lib/posthog-server.ts`** *(new file)* — Server-side PostHog client singleton using `posthog-node`, configured with `flushAt: 1` and `flushInterval: 0` for reliable serverless event delivery.
- **`next.config.ts`** — Added PostHog reverse proxy rewrites (`/ingest/static/:path*` → `eu-assets.i.posthog.com`, `/ingest/:path*` → `eu.i.posthog.com`) and `skipTrailingSlashRedirect: true`. Added `eu-assets.i.posthog.com` to the CSP `script-src` directive.
- **`components/providers/PostHogProvider.tsx`** — Removed the now-redundant `posthog.init()` call in a `useEffect` (which conflicted with the `instrumentation-client.ts` approach). Retained the `PHProvider` React context wrapper, `PageviewTracker` (SPA pageview tracking), and `IdentitySync` (links NextAuth session to PostHog distinct ID on login/logout).
- **`.env.local`** — Set `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` environment variables.

## Events instrumented

| Event name | Description | File |
|---|---|---|
| `user_signed_in` | User successfully signs in via email/password, Google OAuth, or GitHub OAuth | `app/auth/signin/signin-client.tsx` |
| `sign_in_failed` | Login attempt fails — includes a `reason` property (`invalid_credentials`, `account_locked`, `invalid_2fa`, `email_not_verified`, etc.) | `app/auth/signin/signin-client.tsx` |
| `user_signed_up` | New user completes registration via the signup API (server-side) | `app/api/auth/signup/route.ts` |
| `github_connected` | User successfully connects their GitHub account via OAuth callback (server-side) | `app/api/auth/github/callback/route.ts` |
| `onboarding_completed` | New user dismisses the welcome onboarding modal | `app/dashboard/DashboardClient.tsx` |
| `project_deleted` | User deletes a project from the dashboard | `app/dashboard/DashboardClient.tsx` |
| `upgrade_clicked` | User clicks an upgrade/plan button on the billing page | `app/billing/BillingClient.tsx` |
| `credits_purchase_started` | User initiates a credit pack purchase via Stripe | `app/billing/BillingClient.tsx` |
| `ai_generation_completed` | AI chat endpoint completes a code generation for the user (server-side) | `app/api/chat/route.ts` |
| `campaign_sent` | Admin successfully dispatches an email marketing campaign (server-side) | `app/api/admin/campaigns/[id]/send/route.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- 📊 **Analytics basics dashboard** — [https://eu.posthog.com/project/129232/dashboard/533078](https://eu.posthog.com/project/129232/dashboard/533078)
- 📈 **Sign Ups & Sign Ins (Daily)** — [https://eu.posthog.com/project/129232/insights/ngItTYXm](https://eu.posthog.com/project/129232/insights/ngItTYXm)
- 🔽 **Sign-Up to First AI Generation Funnel** — [https://eu.posthog.com/project/129232/insights/eEyGHQ84](https://eu.posthog.com/project/129232/insights/eEyGHQ84)
- 💳 **Upgrade Conversion Funnel** — [https://eu.posthog.com/project/129232/insights/WWFlB6WY](https://eu.posthog.com/project/129232/insights/WWFlB6WY)
- 🔐 **Sign-In Failures by Reason** — [https://eu.posthog.com/project/129232/insights/6cRBpBdm](https://eu.posthog.com/project/129232/insights/6cRBpBdm)
- 🤖 **AI Generations & Projects Deleted (Daily)** — [https://eu.posthog.com/project/129232/insights/sjFApNJr](https://eu.posthog.com/project/129232/insights/sjFApNJr)

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/posthog-integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
