"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, Field, inputClass } from "@/components/ui/primitives";
import { PriceBreakdown } from "@/components/price-breakdown";
import { computeQuote } from "@/lib/pricing";
import { formatUsd } from "@/lib/money";
import { todayISO, validateRange, formatRange } from "@/lib/date";

interface CartSettings {
  deliveryFee: number;
  freeDeliveryThreshold: number;
  taxRate: number;
  minRentalDays: number;
  cancellationPolicy: string;
  termsText: string;
  pickupAddress: string;
  deliveryRadiusMiles: number;
}

const emptyAddress = { line1: "", line2: "", city: "", state: "VA", postal_code: "" };

export function CartView({
  settings,
  isAuthed,
}: {
  settings: CartSettings;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const cart = useCart();
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [address, setAddress] = useState(emptyAddress);
  const [terms, setTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = cart.startISO;
  const end = cart.endISO;
  const rangeError = start && end ? validateRange(start, end, settings.minRentalDays) : null;

  const quote = useMemo(() => {
    if (!start || !end || rangeError || cart.lines.length === 0) return null;
    return computeQuote(
      cart.lines.map((l) => ({
        itemId: l.itemId,
        name: l.name,
        qty: l.qty,
        priceDay: l.priceDay,
        priceWeekend: l.priceWeekend,
        priceWeek: l.priceWeek,
        deposit: l.deposit,
      })),
      start,
      end,
      fulfillment,
      settings,
    );
  }, [cart.lines, start, end, fulfillment, settings, rangeError]);

  if (!cart.hydrated) {
    return <div className="skeleton h-64 rounded-[var(--radius-card)]" />;
  }

  if (cart.lines.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        message="Add some party gear and pick your dates."
        action={<ButtonLink href="/browse">Browse rentals</ButtonLink>}
      />
    );
  }

  async function handleCheckout() {
    setError(null);
    if (!start || !end) return setError("Choose your rental dates.");
    if (rangeError) return setError(rangeError);
    if (!terms) return setError("Please accept the rental terms.");
    if (fulfillment === "delivery" && (!address.line1 || !address.city || !address.postal_code)) {
      return setError("Enter your full delivery address.");
    }
    if (!isAuthed) {
      router.push(`/login?next=${encodeURIComponent("/cart")}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: cart.lines.map((l) => ({ itemId: l.itemId, qty: l.qty })),
          startISO: start,
          endISO: end,
          fulfillment,
          deliveryAddress: fulfillment === "delivery" ? address : undefined,
          termsAccepted: terms,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needsAuth) {
          router.push(`/login?next=${encodeURIComponent("/cart")}`);
          return;
        }
        setError(data.error ?? "Checkout failed. Please try again.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        {/* Dates */}
        <section className="rounded-[var(--radius-card)] border border-line bg-white p-4">
          <h2 className="text-sm font-semibold text-ink">Rental dates</h2>
          <p className="mt-1 text-xs text-muted">
            One date range applies to every item in the cart.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <Field label="Start">
              <input
                type="date"
                min={todayISO()}
                value={start ?? ""}
                onChange={(e) => cart.setDates(e.target.value || null, end)}
                className={inputClass}
              />
            </Field>
            <Field label="End">
              <input
                type="date"
                min={start ?? todayISO()}
                value={end ?? ""}
                onChange={(e) => cart.setDates(start, e.target.value || null)}
                className={inputClass}
              />
            </Field>
          </div>
          {start && end && !rangeError && (
            <p className="mt-2 text-sm text-brand-700">{formatRange(start, end)} · {quote?.days} day{quote?.days === 1 ? "" : "s"}</p>
          )}
          {rangeError && <p className="mt-2 text-sm text-rose-600">{rangeError}</p>}
        </section>

        {/* Items */}
        <section className="rounded-[var(--radius-card)] border border-line bg-white">
          {cart.lines.map((l) => {
            const line = quote?.lines.find((q) => q.itemId === l.itemId);
            return (
              <div key={l.itemId} className="flex gap-3 border-b border-line p-4 last:border-0">
                <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-surface">
                  {l.photo && (
                    <Image src={l.photo} alt={l.name} fill sizes="96px" className="object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <Link href={`/items/${l.slug}`} className="text-sm font-semibold text-ink hover:underline">
                    {l.name}
                  </Link>
                  <p className="text-xs text-muted">
                    {formatUsd(l.priceDay)}/day · {formatUsd(l.deposit)} deposit
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex items-center rounded-lg border border-line">
                      <button
                        type="button"
                        className="h-8 w-8 text-muted hover:text-ink"
                        onClick={() => cart.updateQty(l.itemId, l.qty - 1)}
                        aria-label="Decrease"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm">{l.qty}</span>
                      <button
                        type="button"
                        className="h-8 w-8 text-muted hover:text-ink"
                        onClick={() => cart.updateQty(l.itemId, l.qty + 1)}
                        aria-label="Increase"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-rose-600 hover:underline"
                      onClick={() => cart.removeLine(l.itemId)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="text-right text-sm font-medium text-ink">
                  {line ? formatUsd(line.lineCents / 100) : "—"}
                </div>
              </div>
            );
          })}
        </section>

        {/* Fulfillment */}
        <section className="rounded-[var(--radius-card)] border border-line bg-white p-4">
          <h2 className="text-sm font-semibold text-ink">Pickup or delivery</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(["pickup", "delivery"] as const).map((f) => (
              <label
                key={f}
                className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm ${
                  fulfillment === f ? "border-brand-600 bg-brand-50" : "border-line"
                }`}
              >
                <input
                  type="radio"
                  name="fulfillment"
                  checked={fulfillment === f}
                  onChange={() => setFulfillment(f)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium capitalize text-ink">{f}</span>
                  <span className="block text-xs text-muted">
                    {f === "pickup"
                      ? `Free · ${settings.pickupAddress}`
                      : `$${settings.deliveryFee} flat (free over $${settings.freeDeliveryThreshold}) · within ${settings.deliveryRadiusMiles} mi`}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {fulfillment === "delivery" && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Street address">
                  <input
                    className={inputClass}
                    value={address.line1}
                    onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Apt / unit (optional)">
                <input
                  className={inputClass}
                  value={address.line2}
                  onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                />
              </Field>
              <Field label="City">
                <input
                  className={inputClass}
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                />
              </Field>
              <Field label="State">
                <input
                  className={inputClass}
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                />
              </Field>
              <Field label="ZIP code">
                <input
                  className={inputClass}
                  value={address.postal_code}
                  onChange={(e) => setAddress({ ...address, postal_code: e.target.value })}
                />
              </Field>
              <p className="text-xs text-muted sm:col-span-2">
                We&apos;ll confirm the address is within {settings.deliveryRadiusMiles} miles at
                checkout. Outside that range is pickup only.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-[var(--radius-card)] border border-line bg-white p-5">
          <h2 className="text-sm font-semibold text-ink">Order summary</h2>
          <div className="mt-3">
            {quote ? (
              <PriceBreakdown quote={quote} />
            ) : (
              <p className="text-sm text-muted">Pick valid dates to see your total.</p>
            )}
          </div>

          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <strong>All bookings are final.</strong> {settings.cancellationPolicy}
          </div>

          <label className="mt-4 flex items-start gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" target="_blank" className="text-brand-700 underline">
                rental terms
              </Link>
              , including the no-refund policy and late fees, and authorize the security
              deposit hold.
            </span>
          </label>

          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

          <Button
            className="mt-4 w-full"
            onClick={handleCheckout}
            disabled={submitting || !quote}
          >
            {submitting
              ? "Starting checkout…"
              : isAuthed
                ? "Proceed to checkout"
                : "Sign in to check out"}
          </Button>
          <p className="mt-2 text-center text-xs text-muted">
            Secure payment by Stripe. Card charged now; deposit is a hold.
          </p>
        </div>
      </aside>
    </div>
  );
}
