# AnyTimeRental — Progress

Party-equipment rental site. Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase · Stripe · Resend · Vercel.

## Status: DEPLOYED — https://rental-project-solary.vercel.app (Vercel, project `solary/rental-project`)

Live in production against the same Supabase DB. All pages 200; `/admin` gates to login; inventory renders. `vercel.json` forces `framework: nextjs` (the project was created with preset "Other", which served `public/` statically → 404 until fixed). Deployment Protection is off.

Remaining before real customers:
- **Supabase → Auth → URL Configuration:** Site URL + `https://rental-project-solary.vercel.app/auth/callback` in Redirect URLs (sign-in is broken on the deployed domain until this is set).
- **Stripe webhook endpoint** pointing at `https://rental-project-solary.vercel.app/api/stripe/webhook` (secret is already in Vercel).
- **`RESEND_API_KEY`** in Vercel is still the invalid key — replace it.

Deploy again with: `npx vercel --prod` (or connect the GitHub repo in Vercel → Settings → Git for auto-deploy on push).

---

## Pre-deploy status: build green + database live + end-to-end verified.

`npm run build` ✅ · `npm run lint` ✅ · `npm run db:migrate` ✅ · `npm run seed` ✅ (admin + 16 items).

**End-to-end test run against the live Supabase DB + Stripe test mode (2026-09-02):**
- Browse & item pages render seeded inventory ✅
- Delivery address outside 30 mi rejected at checkout (Baltimore, ~53 mi) ✅
- Checkout → pending booking with correct pricing: 4 tables + 1 bounce house, 3 days = $579 + 6% VA tax $34.74 = **$613.74**, deposit **$230** ✅
- Payment (test card) → webhook → booking **confirmed** ✅
- Security deposit placed as a real **$230 manual-capture authorization hold** (`requires_capture`) ✅
- Availability decremented 4 → 3 for the booked dates; other dates unaffected ✅
- Deposit hold **released** on return (PI canceled, never captured) ✅
- Admin dashboard + inventory load; non-admin gets 307-redirected away from `/admin` ✅
- `/api/cron/reminders` responds and is `CRON_SECRET`-gated ✅
- ⚠️ Confirmation email send returns **401 "API key is invalid"** — the provided `RESEND_API_KEY` is rejected by Resend. Booking still confirms (email failure is caught, non-fatal). Needs a valid key.

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
1. ✅ ~~Supabase DB password~~ — fixed; migrations + seed have run against the live DB.
2. **`RESEND_API_KEY`** — the current key returns `401 API key is invalid`. Create a fresh key at resend.com/api-keys, put it in `.env.local` / Vercel, and set `EMAIL_FROM` to a verified sender. Until then no emails send (bookings still work).
3. **`STRIPE_WEBHOOK_SECRET`** — for local dev run `stripe listen --forward-to localhost:3000/api/stripe/webhook` and paste the `whsec_`; in production add a webhook endpoint. Without it, paid bookings stay "pending".
4. **Supabase Auth redirect URLs** — add `http://localhost:3000/auth/callback` and the prod `/auth/callback`.
5. **Change the seeded admin password** (`AnyTimeRental!2026`) after first login to `mohinisomesh2@gmail.com`.
6. **Deploy to Vercel** — add all env vars; point `SUPABASE_DB_URL` at prod and run `npm run db:migrate` + `npm run seed`.
7. Swap Stripe test keys for live keys when going live.
8. Replace placeholder item photos (picsum.photos) with real photos in `/admin/inventory`.

## Not done / deliberately out of scope
- Google login (email + magic link + password only; Google can be added in Supabase with no code change).
- SMS reminders (email only).
- `git push` to GitHub is currently blocked in this environment — commits are local; push `main` manually or authorize pushes.

## Not yet exercised in the E2E run (lower risk, code paths are simple)
- Stripe's own hosted Checkout page (Stripe's UI, not our code) — the test simulated the resulting paid PaymentIntent + webhook event directly.
- `stripe listen` locally (no Stripe CLI in the build environment) — the webhook handler itself is verified with a signed event.
- Reminder emails actually arriving (blocked by the invalid Resend key); the cron endpoint + query logic run fine.
- PDF receipt/agreement rendering was built with pdf-lib but not opened in this run.
