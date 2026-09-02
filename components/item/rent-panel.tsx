"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DayPicker, type DateRange } from "react-day-picker";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { PriceBreakdown } from "@/components/price-breakdown";
import { computeQuote, type QuoteSettings } from "@/lib/pricing";
import { formatUsd } from "@/lib/money";
import {
  fromISODateLocal,
  toISODateLocal,
  validateRange,
  formatRange,
} from "@/lib/date";

export interface RentPanelItem {
  id: string;
  slug: string;
  name: string;
  photo: string | null;
  priceDay: number;
  priceWeekend: number | null;
  priceWeek: number | null;
  deposit: number;
  quantity: number;
}

export function RentPanel({
  item,
  settings,
  fullyBookedDates,
  cancellationPolicy,
}: {
  item: RentPanelItem;
  settings: QuoteSettings & { minRentalDays: number };
  fullyBookedDates: string[];
  cancellationPolicy: string;
}) {
  const router = useRouter();
  const cart = useCart();
  const [range, setRange] = useState<DateRange | undefined>();
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const disabledDays = useMemo(
    () => [{ before: today }, ...fullyBookedDates.map(fromISODateLocal)],
    [today, fullyBookedDates],
  );

  const startISO = range?.from ? toISODateLocal(range.from) : null;
  const endISO = range?.to ? toISODateLocal(range.to) : null;

  const quote = useMemo(() => {
    if (!startISO || !endISO) return null;
    if (validateRange(startISO, endISO, settings.minRentalDays)) return null;
    return computeQuote(
      [
        {
          itemId: item.id,
          name: item.name,
          qty,
          priceDay: item.priceDay,
          priceWeekend: item.priceWeekend,
          priceWeek: item.priceWeek,
          deposit: item.deposit,
        },
      ],
      startISO,
      endISO,
      "pickup",
      settings,
    );
  }, [startISO, endISO, qty, item, settings]);

  function rangeCoversBlockedDay(): boolean {
    if (!startISO || !endISO) return false;
    const set = new Set(fullyBookedDates);
    for (let d = fromISODateLocal(startISO); toISODateLocal(d) <= endISO; d.setDate(d.getDate() + 1)) {
      if (set.has(toISODateLocal(d))) return true;
    }
    return false;
  }

  function handleAdd() {
    setError(null);
    if (!startISO || !endISO) {
      setError("Pick your rental start and end dates.");
      return;
    }
    const rangeError = validateRange(startISO, endISO, settings.minRentalDays);
    if (rangeError) {
      setError(rangeError);
      return;
    }
    if (rangeCoversBlockedDay()) {
      setError("Some of those days are already booked. Choose a different range.");
      return;
    }
    if (qty < 1 || qty > item.quantity) {
      setError(`Choose between 1 and ${item.quantity}.`);
      return;
    }

    const datesDiffer =
      (cart.startISO && cart.startISO !== startISO) ||
      (cart.endISO && cart.endISO !== endISO);

    cart.addLine({
      itemId: item.id,
      slug: item.slug,
      name: item.name,
      photo: item.photo,
      qty,
      priceDay: item.priceDay,
      priceWeekend: item.priceWeekend,
      priceWeek: item.priceWeek,
      deposit: item.deposit,
    });
    cart.setDates(startISO, endISO);
    setAdded(true);

    if (datesDiffer) {
      setError(null);
    }
    setTimeout(() => router.push("/cart"), 400);
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-white p-5">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-2xl font-semibold text-ink">
            {formatUsd(item.priceDay)}
          </span>
          <span className="text-sm text-muted"> / day</span>
        </div>
        <div className="text-right text-xs text-muted">
          {item.priceWeekend != null && <div>{formatUsd(item.priceWeekend)} weekend</div>}
          {item.priceWeek != null && <div>{formatUsd(item.priceWeek)} / week</div>}
        </div>
      </div>

      <p className="mt-1 text-xs text-muted">
        {formatUsd(item.deposit)} refundable deposit · {item.quantity} in inventory
      </p>

      <div className="mt-4 rounded-xl border border-line p-2">
        <DayPicker
          mode="range"
          selected={range}
          onSelect={(r) => {
            setRange(r);
            setError(null);
            setAdded(false);
          }}
          disabled={disabledDays}
          excludeDisabled
          numberOfMonths={1}
          weekStartsOn={0}
        />
      </div>

      {startISO && endISO && (
        <p className="mt-2 text-sm text-ink">
          {formatRange(startISO, endISO)}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <label htmlFor="qty" className="text-sm font-medium text-ink">
          Quantity
        </label>
        <div className="flex items-center rounded-lg border border-line">
          <button
            type="button"
            className="h-9 w-9 text-lg text-muted hover:text-ink"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <input
            id="qty"
            type="number"
            min={1}
            max={item.quantity}
            value={qty}
            onChange={(e) =>
              setQty(Math.min(item.quantity, Math.max(1, Number(e.target.value) || 1)))
            }
            className="w-12 border-x border-line text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            className="h-9 w-9 text-lg text-muted hover:text-ink"
            onClick={() => setQty((q) => Math.min(item.quantity, q + 1))}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      {quote && (
        <div className="mt-4 rounded-xl bg-surface p-4">
          <PriceBreakdown quote={quote} />
        </div>
      )}

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <Button className="mt-4 w-full" onClick={handleAdd} disabled={added}>
        {added ? "Added — opening cart…" : "Add to cart"}
      </Button>

      <p className="mt-3 text-xs text-muted">
        <span className="font-medium text-ink">Cancellation:</span> {cancellationPolicy}
      </p>
    </div>
  );
}
