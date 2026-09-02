# AnyTimeRental

A production-quality party & event rental website for a single owner-operator in
Northern Virginia. Customers browse gear, pick dates, pay online (Stripe), and pick
up or get delivery. The owner runs everything from `/admin`.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres,
Auth, Storage) · Stripe Checkout + manual-capture deposit holds · Resend email ·
deploys to Vercel.

---

## 1. Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Stripe](https://stripe.com) account (test mode is fine for development)
- A [Resend](https://resend.com) account (optional — email is stubbed to the console without it)
- [Stripe CLI](https://stripe.com/docs/stripe-cli) for local webhook testing

## 2. Environment

Copy `.env.example` to `.env.local` and fill it in:

| Variable | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page (the "anon"/publishable key) |
| `SUPABASE_SERVICE_ROLE_KEY` | same page (the "service_role" key — **server only**) |
| `SUPABASE_DB_URL` | Project Settings → Database → Connection string → **Session pooler** (port 5432). URL-encode special characters in the password (`@` → `%40`). Only used by `npm run db:migrate` / `npm run seed`. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API keys |
| `STRIPE_SECRET_KEY` | same page |
| `STRIPE_WEBHOOK_SECRET` | printed by `stripe listen` (below), or Stripe → Webhooks |
| `RESEND_API_KEY` | Resend → API Keys (optional) |
| `EMAIL_FROM` | a verified Resend sender, e.g. `AnyTimeRental <hello@yourdomain.com>`. Use `onboarding@resend.dev` for testing. |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally; your real URL in production |
| `ADMIN_EMAIL` | the owner's email — this account is granted the `admin` role automatically |
| `CRON_SECRET` | any long random string; set the same value in Vercel |

## 3. Database setup

```bash
npm install
npm run db:migrate     # applies supabase/migrations/*.sql (schema, RLS, storage buckets)
npm run seed           # creates the admin user + sample inventory
```

`npm run seed`:
- adds `ADMIN_EMAIL` to the admin allowlist and creates a confirmed auth user for it
  (default password `AnyTimeRental!2026`, or set `SEED_ADMIN_PASSWORD`);
- seeds inventory from **`inventory.csv`** in the project root if present, otherwise
  ~16 realistic sample party items with placeholder photos.

`inventory.csv` columns (header row required): `name, category, description, specs
(JSON), dimensions, weight, price_day, price_weekend, price_week, deposit, quantity`.

> No shell access to Postgres? Open `supabase/migrations/0001_init.sql` in the
> Supabase SQL Editor and run it, then run `npm run seed` (which only needs the
> service-role key).

## 4. Run locally

```bash
npm run dev
```

In a second terminal, forward Stripe webhooks and paste the `whsec_...` it prints
into `STRIPE_WEBHOOK_SECRET`:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

- Store: <http://localhost:3000>
- Admin: <http://localhost:3000/admin> (sign in as `ADMIN_EMAIL`)

## 5. Supabase Auth configuration

In Supabase → Authentication → URL Configuration:
- **Site URL:** your `NEXT_PUBLIC_SITE_URL`
- **Redirect URLs:** add `http://localhost:3000/auth/callback` and
  `https://YOUR-DOMAIN/auth/callback`

Email + magic link work out of the box. Google login is optional — add a provider in
Supabase → Authentication → Providers and the "Sign in" screen picks it up.

## 6. Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add every variable from `.env.local` to the Vercel project (Production +
   Preview). Set `NEXT_PUBLIC_SITE_URL` to the deployed URL.
3. In Stripe → Developers → Webhooks, add an endpoint:
   `https://YOUR-DOMAIN/api/stripe/webhook`, events `checkout.session.completed`
   and `checkout.session.expired`. Copy its signing secret into
   `STRIPE_WEBHOOK_SECRET` on Vercel.
4. `vercel.json` already registers a daily cron (`/api/cron/reminders`) that sends
   24-hour pickup/return reminders. Vercel automatically authenticates it with
   `CRON_SECRET`.
5. Redeploy. Run `npm run db:migrate` and `npm run seed` against the production
   database (they read `.env.local`; point `SUPABASE_DB_URL` at prod first, or run
   the SQL in the dashboard).

## 7. How the owner adds / manages items

- **`/admin/inventory` → New item** — name, category, description, day/weekend/week
  price, deposit, quantity, dimensions, specs, active toggle. Save, then upload
  photos (drag to reorder; first is the cover) and add blocked-out dates.
- **`/admin/bookings`** — list + month calendar. Open a booking to change status,
  mark picked up / returned (marking returned releases the deposit hold and emails
  the customer), capture the deposit for damage, charge the card on file for late
  fees, or issue a refund.
- **`/admin/settings`** — business info, delivery radius/fee/free-delivery
  threshold, minimum rental days, **sales-tax rate**, and the cancellation / late-fee
  / full-terms text shown to customers.

## 8. Key business rules (from the project blueprint)

- **Pricing:** best of daily × N, weekend rate (Fri–Sun ≤ 3 days), or weekly rate ×
  ⌈N/7⌉. Delivery fee added if delivery; VA sales tax on (rental + delivery).
- **Deposit:** a separate Stripe authorization hold (manual capture), never part of
  the charge; released when the item is returned.
- **Delivery:** flat $50 within 30 miles of the pickup address, free over $300;
  addresses outside the radius are rejected at checkout with a friendly message.
- **Cancellation:** no refunds — all bookings final once paid. Shown on the item
  page, in the cart, and in the terms checkbox. Admin can still issue a manual
  refund.
- **Late fee:** one full day's rate per item per day late, charged to the card on
  file by the admin.
- **Availability:** `quantity − overlapping confirmed/picked-up bookings − blocked
  dates`, rechecked server-side at checkout and again in the payment webhook
  (auto-refunds if it lost the race).

## 9. Project layout

```
app/                 routes (store, /account, /admin, /api/*)
components/           UI + feature components
lib/                  pricing, availability, checkout, stripe, email, pdf, supabase clients
supabase/migrations/  SQL schema + RLS + storage
scripts/              migrate.mjs, seed.mjs
```

See `PROGRESS.md` for build status and `MANUAL_SETUP.md` for the owner's to-do list.
