/** Date helpers. All "ISO" values are calendar dates: YYYY-MM-DD, no timezone. */

export function todayISO(): string {
  return toISODateLocal(new Date());
}

/** Format a Date's local calendar day as YYYY-MM-DD (no timezone shift). */
export function toISODateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD into a local Date at midnight. */
export function fromISODateLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isISODate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDateLong(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateShort(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatRange(startISO: string, endISO: string): string {
  return `${formatDateShort(startISO)} – ${formatDateShort(endISO)}`;
}

/** Validate a rental range; returns an error string or null. */
export function validateRange(
  startISO: string,
  endISO: string,
  minDays = 1,
): string | null {
  if (!isISODate(startISO) || !isISODate(endISO)) return "Choose both dates.";
  if (startISO < todayISO()) return "Start date can't be in the past.";
  if (endISO < startISO) return "End date must be after the start date.";
  const days =
    Math.round(
      (Date.parse(`${endISO}T00:00:00Z`) - Date.parse(`${startISO}T00:00:00Z`)) /
        86_400_000,
    ) + 1;
  if (days < minDays) return `Minimum rental is ${minDays} day${minDays === 1 ? "" : "s"}.`;
  return null;
}
