import { formatCents } from "@/lib/money";
import type { Quote } from "@/lib/pricing";

export function PriceBreakdown({
  quote,
  showDeposit = true,
}: {
  quote: Quote;
  showDeposit?: boolean;
}) {
  const row = "flex items-center justify-between text-sm";
  return (
    <div className="space-y-2">
      {quote.lines.map((l) => (
        <div key={l.itemId} className={row}>
          <span className="text-muted">
            {l.name}
            {l.qty > 1 ? ` × ${l.qty}` : ""}{" "}
            <span className="text-xs">({l.methodLabel})</span>
          </span>
          <span className="tabular-nums text-ink">{formatCents(l.lineCents)}</span>
        </div>
      ))}

      <div className="my-2 border-t border-line" />

      <div className={row}>
        <span className="text-muted">Subtotal</span>
        <span className="tabular-nums text-ink">{formatCents(quote.subtotalCents)}</span>
      </div>

      {quote.fulfillment === "delivery" && (
        <div className={row}>
          <span className="text-muted">Delivery</span>
          <span className="tabular-nums text-ink">
            {quote.deliveryFeeCents === 0 ? "Free" : formatCents(quote.deliveryFeeCents)}
          </span>
        </div>
      )}

      <div className={row}>
        <span className="text-muted">
          Sales tax ({(quote.taxRate * 100).toFixed(2).replace(/\.?0+$/, "")}%)
        </span>
        <span className="tabular-nums text-ink">{formatCents(quote.taxCents)}</span>
      </div>

      <div className="my-2 border-t border-line" />

      <div className="flex items-center justify-between font-semibold">
        <span>Total due now</span>
        <span className="tabular-nums">{formatCents(quote.totalCents)}</span>
      </div>

      {showDeposit && quote.depositTotalCents > 0 && (
        <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-xs text-muted">
          + {formatCents(quote.depositTotalCents)} refundable security deposit — placed
          as a temporary hold on your card, not a charge. Released after items are
          returned undamaged.
        </p>
      )}
    </div>
  );
}
