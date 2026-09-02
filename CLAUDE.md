# RentAnything — Project Blueprint

You are building a production-quality rental website for a single business owner who rents out
their own items (party equipment first, then anything). Customers browse, pick dates, pay, and
pick up or get delivery. The owner manages everything from an admin dashboard.

Work autonomously. Make sensible decisions without asking. Commit to git after every completed
feature with a clear message. Keep a running `PROGRESS.md` listing what is done, what is next,
and anything the owner must do manually.

## Stack (do not change without strong reason)
- Next.js 14+ (App Router), TypeScript, Tailwind CSS
- Supabase: Postgres, Auth (email + magic link; Google login if easy), Storage for photos
- Prisma or Supabase client for data access (pick one, be consistent)
- Stripe Checkout for payment; deposits as an authorization hold (manual capture), released on return
- Resend for transactional email
- Deploy target: Vercel. Include `vercel.json` if needed and a README with deploy steps.
- Everything must work locally with `npm run dev` using `.env.local` (see Environment).

## Design direction
- Mobile-first. Feels like Facebook Marketplace: photo grid, category chips, search bar, price on card.
- Clean, trustworthy, generous whitespace, one accent color. No template-looking gradients.
- Every page loads fast; use Next/Image, skeleton loaders, optimistic UI where sensible.
- Accessibility: keyboard navigable, proper labels, good contrast.

## Customer features (in priority order — finish each fully before the next)
1. **Browse & search**: home grid, categories, search, filter by price and availability for chosen dates.
2. **Item page**: photo gallery, description, specs, quantity available, pricing tiers
   (per day / weekend / per week), deposit amount, availability calendar, "Rent this" date picker
   that shows a live price total.
3. **Cart & checkout**: multiple items, same date range, pickup vs. delivery (delivery fee applies
   within radius; enter address), agree-to-terms checkbox, Stripe Checkout, deposit hold.
4. **Accounts**: sign in, see my bookings, booking status (pending / confirmed / picked up /
   returned / cancelled), download receipt and rental agreement PDF, cancel per policy.
5. **Notifications**: booking confirmation email, reminder 24h before pickup, reminder 24h before
   return, deposit-released email.
6. **Reviews** on items after return (optional if time permits).

## Owner / admin features (route `/admin`, role-protected)
1. Inventory CRUD: name, category, description, photos (multi-upload), day/weekend/week price,
   deposit, quantity, dimensions/weight, active toggle, blocked dates.
2. Bookings: calendar view + list; change status; mark picked up / returned; release or capture
   deposit; add notes; refund.
3. Settings: business name, logo, contact, pickup address, hours, delivery radius & fee,
   minimum rental days, cancellation policy text, late fee, terms text.
4. Simple dashboard: upcoming pickups/returns today & this week, revenue this month.

## Data model (starting point)
- users (id, email, name, phone, role: customer|admin)
- items (id, name, slug, category, description, specs json, price_day, price_weekend, price_week,
  deposit, quantity, active, created_at)
- item_photos (id, item_id, url, sort)
- blocked_dates (id, item_id, start, end, reason)
- bookings (id, user_id, status, start_date, end_date, fulfillment: pickup|delivery,
  delivery_address, subtotal, delivery_fee, deposit_total, total, stripe_session_id,
  stripe_payment_intent_id, deposit_payment_intent_id, terms_accepted_at, notes, created_at)
- booking_items (id, booking_id, item_id, qty, unit_price_snapshot)
- settings (single row)
- reviews (id, item_id, user_id, rating, text)

Availability rule: for a date range, available qty = item.quantity − sum(qty of overlapping
bookings with status in confirmed/picked_up) − blocked. Never allow overbooking; check again
server-side at checkout.

## Pricing rule
Total for N days = best of: N × day price; weekend price if Fri–Sun; week price × ceil(N/7) if
cheaper. Delivery fee added if delivery chosen. Deposit is a separate hold, not part of charge.
Always show breakdown.

## Environment (`.env.local`, never commit)
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
RESEND_API_KEY, NEXT_PUBLIC_SITE_URL, ADMIN_EMAIL
Create `.env.example` with all keys and a comment on where to get each one.

## Quality bar
- TypeScript strict, no `any` without comment.
- Server-side validation of every form (zod). Never trust client price totals.
- Stripe webhook handles payment success → booking confirmed. Test with `stripe listen`.
- Seed script: `npm run seed` creates an admin user and ~12 sample party items with placeholder
  photos so the site looks real immediately.
- Write a README: setup, env keys, how to run, how to deploy to Vercel, how to add items.
- Run `npm run build` and fix all errors before declaring any phase done.

## Owner inputs (fill in before starting; Claude uses these)
- Business name: AnyTimeRental
- Brand color (hex) or "you choose": you choose — pick one confident accent color that reads trustworthy and friendly
- Pickup address: 22859 Trailing Rose Ct, Brambleton, VA 20148
- Delivery radius (km/miles) and fee: 30 miles from the pickup address. Flat $50 delivery fee; free delivery on orders over $300. Reject delivery addresses outside 30 miles at checkout with a friendly message offering pickup instead.
- Minimum rental days: 1
- Cancellation policy: No refunds. All bookings are final once paid. Show this clearly on the item page, in the cart, and as part of the terms checkbox at checkout — never let a customer discover it after paying. Admin can still issue a manual refund from the dashboard for exceptional cases.
- Late fee per day: one full day's rental rate per item for each day late, charged to the saved card. Disclose in terms.
- Sales tax: apply Virginia sales tax on rentals (6% combined rate for Loudoun County — store as an editable setting, not hard-coded). Show tax as a line item before payment.
- Inventory spreadsheet: `inventory.csv` in project root (if present, seed from it instead of samples). Otherwise seed ~12 realistic party items (folding tables, white chairs, 10x10 canopy tent, bounce house, speaker system, string lights, cooler, popcorn machine, etc.) with sensible NoVa pricing.
