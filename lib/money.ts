/** Money helpers. Internally we work in integer cents to avoid float drift. */

export function toCents(dollars: number | string | null | undefined): number {
  if (dollars == null || dollars === "") return 0;
  const n = typeof dollars === "string" ? Number(dollars) : dollars;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** Format integer cents as "$1,234.56". */
export function formatCents(cents: number): string {
  return USD.format(fromCents(cents));
}

/** Format a dollar number as currency. */
export function formatUsd(dollars: number): string {
  return USD.format(dollars);
}
