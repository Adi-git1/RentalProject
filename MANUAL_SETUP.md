# Owner setup checklist

Everything the site needs that can't be done from code. Work top to bottom.

## 1. Supabase database password (BLOCKER)

The `SUPABASE_DB_URL` in `.env.local` is rejected by Postgres (`28P01
invalid_password`). Until this is fixed, `npm run db:migrate` and `npm run seed`
can't run and the site has no tables.

**Fix:** Supabase dashboard → Project Settings → Database → **Reset database
password**. Then update `.env.local`:

```
SUPABASE_DB_URL=postgresql://postgres.ibsvvxezsgwwhynkwcoh:NEW_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

URL-encode special characters in the password (`@` → `%40`, `#` → `%23`, etc.).
Then:

```
npm run db:migrate
npm run seed
```

*Alternative:* paste `supabase/migrations/0001_init.sql` into the Supabase SQL
Editor and run it, then `npm run seed` (needs only the service-role key, which
works).

## 2. Resend API key (email)

`RESEND_API_KEY` is empty, so confirmation / reminder / deposit-released emails are
logged to the server console instead of sent.

**Fix:** create a key at <https://resend.com/api-keys>, put it in `.env.local`, and
set `EMAIL_FROM` to a sender on a domain you've verified in Resend (or use
`onboarding@resend.dev` for testing only).

## 3. Stripe webhook secret

`STRIPE_WEBHOOK_SECRET` is empty. Without it, payments succeed but bookings never
move from "pending" to "confirmed" and no deposit hold is placed.

**Local:** run `stripe listen --forward-to localhost:3000/api/stripe/webhook` and
copy the `whsec_...` it prints into `.env.local`.

**Production:** Stripe → Developers → Webhooks → Add endpoint
`https://YOUR-DOMAIN/api/stripe/webhook`, select `checkout.session.completed` and
`checkout.session.expired`, then copy the signing secret into the Vercel env vars.

## 4. Supabase Auth redirect URLs

Supabase → Authentication → URL Configuration:
- Site URL = your `NEXT_PUBLIC_SITE_URL`
- Redirect URLs: add `http://localhost:3000/auth/callback` and your production
  `.../auth/callback`

Optionally customize the magic-link email template.

## 5. Admin account

The admin is whoever signs in with `ADMIN_EMAIL` (currently
`mohinisomesh2@gmail.com`). `npm run seed` creates that account with password
`AnyTimeRental!2026` — **change it** after first login (or set `SEED_ADMIN_PASSWORD`
before seeding). To add more admins later, insert their email into the
`admin_allowlist` table.

## 6. Stripe live mode (when going live)

Swap the test keys in `.env.local` / Vercel for live keys, and add a live-mode
webhook endpoint (step 3). Confirm your Stripe account can place manual-capture
authorization holds (it can by default).

## 7. Deploy (Vercel)

1. Push to GitHub, import in Vercel.
2. Add every `.env.local` variable to Vercel (Production + Preview); set
   `NEXT_PUBLIC_SITE_URL` to the deployed URL.
3. The daily reminder cron in `vercel.json` runs automatically once `CRON_SECRET`
   is set in Vercel.
4. Run migrations + seed against the production database.

## 8. Optional polish

- Replace placeholder item photos (picsum.photos) with real product photos via
  `/admin/inventory/<item>`.
- Add a real logo URL in `/admin/settings`.
- Verify a sending domain in Resend so emails don't go to spam.
- Point a custom domain at Vercel and update `NEXT_PUBLIC_SITE_URL` + Supabase +
  Stripe redirect/webhook URLs.
