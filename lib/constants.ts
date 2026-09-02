export const SITE_NAME = "AnyTimeRental";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const CATEGORIES = [
  "Tables & Seating",
  "Tents & Canopies",
  "Bounce Houses",
  "Audio & Lighting",
  "Concessions",
  "Decor",
  "Coolers & Catering",
  "Games & Fun",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: "Pending payment",
  confirmed: "Confirmed",
  picked_up: "Picked up",
  returned: "Returned",
  cancelled: "Cancelled",
};

export const BOOKING_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-brand-100 text-brand-800",
  picked_up: "bg-blue-100 text-blue-800",
  returned: "bg-slate-200 text-slate-700",
  cancelled: "bg-rose-100 text-rose-700",
};

export const DEPOSIT_STATUS_LABELS: Record<string, string> = {
  none: "—",
  held: "Hold placed",
  released: "Released",
  captured: "Captured",
};
