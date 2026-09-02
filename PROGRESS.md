# AnyTimeRental — Progress

Party-equipment rental site. Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase · Stripe · Resend · Vercel.

## Status legend
✅ done · 🚧 in progress · ⬜ not started

## Phases
- 🚧 **Phase 0 — Scaffold & infrastructure**: Next.js app, deps, env, Supabase clients, DB schema + RLS + storage, migration runner, seed script, shared libs (pricing, availability, geo), design system.
- ⬜ **Phase 1 — Browse & search**: home grid, category chips, search, price + date-availability filters.
- ⬜ **Phase 2 — Item page**: gallery, specs, pricing tiers, deposit, availability calendar, date picker with live total.
- ⬜ **Phase 3 — Cart & checkout**: multi-item cart, pickup/delivery + address radius check, VA tax, terms, Stripe Checkout, deposit hold, server-side revalidation, webhook.
- ⬜ **Phase 4 — Accounts**: auth (magic link + password), my bookings, statuses, receipt + rental-agreement PDF, cancel per policy.
- ⬜ **Phase 5 — Notifications**: confirmation email, 24h pickup/return reminders (cron), deposit-released email.
- ⬜ **Phase 6 — Admin**: inventory CRUD + photo upload, bookings calendar/list + status + deposit capture/release + refund, settings, dashboard.
- ⬜ **Phase 7 — Reviews** (optional): post-return item reviews.
- ⬜ **Phase 8 — Polish**: `npm run build` clean, README, Vercel config.

## What the owner must do manually
See `MANUAL_SETUP.md` (kept in sync as blockers appear). Current blockers:
1. **Supabase DB password rejected** (`28P01`). Reset it in Project Settings → Database and provide the new password / session-pooler URI so migrations + seed can run. Project region: `us-east-1`.
2. `RESEND_API_KEY` is empty — transactional email is stubbed (logs to console) until provided.
3. `STRIPE_WEBHOOK_SECRET` is empty — run `stripe listen --forward-to localhost:3000/api/stripe/webhook` and paste the `whsec_...`.

## Next
Finish Phase 0.
