# AnyTimeRental — Progress

Party-equipment rental site. Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase · Stripe · Resend · Vercel.

## Status: build green (`npm run build` + `npm run lint` pass). Feature-complete pending the manual setup below.

## Phases
- ✅ **Phase 0 — Scaffold & infrastructure**: Next.js app, deps, env, Supabase clients (browser/server/admin), proxy auth guard, DB schema + RLS + storage buckets + availability SQL, migration runner (`npm run db:migrate`), seed script (`npm run seed`), pricing engine, availability calc, geo distance check, cart context, teal design system.
- ✅ **Phase 1 — Browse & search**: home grid, category chips, search, price + date-availability filters, item cards, skeleton loaders.
- ✅ **Phase 2 — Item page**: gallery, specs, day/weekend/week pricing, deposit, availability calendar (fully-booked days disabled), date picker with live price total, add-to-cart, reviews list.
- ✅ **Phase 3 — Cart & checkout**: multi-item cart, one date range, pickup/delivery + address radius check, VA sales-tax line, prominent no-refund notice, terms checkbox, Stripe Checkout, security-deposit authorization hold (manual capture), server-side availability + price revalidation, webhook (confirm booking, place deposit hold, overbooking auto-refund).
- ✅ **Phase 4 — Accounts**: magic-link + password auth, `/account` bookings list, booking detail with status timeline, receipt + rental-agreement PDFs, policy-aware cancel (no refund, releases deposit), profile edit.
- ✅ **Phase 5 — Notifications**: confirmation email; 24h pickup + return reminders via `/api/cron/reminders` (daily Vercel cron); deposit-released email. Emails log to console until `RESEND_API_KEY` is set.
- ✅ **Phase 6 — Admin** (`/admin`, role-gated): dashboard (revenue/refunds this month, active deposit holds, pickups/returns today + this week); bookings list + month calendar + detail (status changes, mark picked up/returned, release/capture deposit, charge card for late fees/damage, refund, notes); inventory CRUD + multi-photo upload/reorder + blocked dates; settings (business info, delivery rules, editable tax rate, policy text).
- ✅ **Phase 7 — Reviews**: customers review items after a rental is returned (from the booking page); ratings shown on item pages and cards.
- ✅ **Phase 8 — Polish**: 404 / error / loading states, robots + sitemap, `vercel.json` cron, README, MANUAL_SETUP.

## What the owner MUST do manually — see `MANUAL_SETUP.md`
1. **Reset the Supabase DB password** — the one provided is rejected (`28P01`). Then run `npm run db:migrate` and `npm run seed`. Project region: `us-east-1`. *(Blocks the whole site until done — no tables exist yet.)*
2. **`RESEND_API_KEY` + `EMAIL_FROM`** — email is console-stubbed until set.
3. **`STRIPE_WEBHOOK_SECRET`** — run `stripe listen ...` locally / add a webhook endpoint in production, else bookings stay "pending" after payment.
4. **Supabase Auth redirect URLs** — add `/auth/callback` for localhost + prod.
5. **Change the seeded admin password** (`AnyTimeRental!2026`) after first login.
6. **Deploy to Vercel** — add all env vars; run migrations/seed against prod.
7. Swap Stripe test keys for live keys when going live.

## Not done / deliberately out of scope
- Google login (email + magic link + password only; Google can be added in Supabase with no code change).
- SMS reminders (email only).
- `git push` to GitHub is currently blocked in this environment — commits are local; push `main` manually or authorize pushes.

## Verified
- `npm run build` ✅  · `npm run lint` ✅
- Not yet run against a live database (blocked on item 1). Pricing/availability/geo logic is pure and unit-testable.
