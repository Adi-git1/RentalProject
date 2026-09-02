import { Badge } from "@/components/ui/primitives";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_STYLES,
  DEPOSIT_STATUS_LABELS,
} from "@/lib/constants";

export function BookingStatusBadge({ status }: { status: string }) {
  return (
    <Badge className={BOOKING_STATUS_STYLES[status] ?? "bg-slate-200 text-slate-700"}>
      {BOOKING_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export function DepositStatusBadge({ status }: { status: string }) {
  if (status === "none") return null;
  const styles: Record<string, string> = {
    held: "bg-blue-100 text-blue-800",
    released: "bg-brand-100 text-brand-800",
    captured: "bg-amber-100 text-amber-900",
  };
  return (
    <Badge className={styles[status] ?? "bg-slate-200 text-slate-700"}>
      Deposit: {DEPOSIT_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
