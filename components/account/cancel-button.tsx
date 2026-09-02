"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cancelBooking } from "@/app/account/bookings/[id]/actions";

export function CancelButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-rose-600 hover:underline"
      >
        Cancel this booking
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
      <p className="text-sm font-medium text-rose-900">Cancel this booking?</p>
      <p className="mt-1 text-xs text-rose-800">
        Per the rental terms, <strong>payment is non-refundable</strong>. Your security
        deposit hold will be released. This can&apos;t be undone.
      </p>
      {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await cancelBooking(bookingId);
              if (res.error) setError(res.error);
              else router.refresh();
            })
          }
        >
          {pending ? "Cancelling…" : "Yes, cancel (no refund)"}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
          Keep booking
        </Button>
      </div>
    </div>
  );
}
