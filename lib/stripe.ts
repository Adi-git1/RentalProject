import "server-only";
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  // Not throwing at import time so `next build` works without secrets;
  // routes that use Stripe guard on this.
  console.warn("STRIPE_SECRET_KEY is not set — checkout and webhooks are disabled.");
}

export const stripe = key
  ? new Stripe(key, { apiVersion: "2026-08-26.dahlia", typescript: true })
  : null;

export function requireStripe(): Stripe {
  if (!stripe) throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing).");
  return stripe;
}
