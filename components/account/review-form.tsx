"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitReview } from "@/app/account/bookings/[id]/actions";
import { cn } from "@/lib/cn";

export function ReviewForm({
  bookingId,
  itemId,
  itemName,
  existing,
}: {
  bookingId: string;
  itemId: string;
  itemName: string;
  existing?: { rating: number; text: string } | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [text, setText] = useState(existing?.text ?? "");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-brand-700 hover:underline"
      >
        {existing ? "Edit your review" : "Leave a review"}
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-line p-3">
      <p className="text-xs font-medium text-ink">Review {itemName}</p>
      <div className="mt-1 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            onClick={() => setRating(n)}
            className={cn("text-xl", n <= rating ? "text-amber-400" : "text-line")}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="How did it work out? (optional)"
        className="mt-2 w-full rounded-lg border border-line p-2 text-sm focus:border-brand-500 focus:outline-none"
      />
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      {done && <p className="mt-1 text-xs text-brand-700">Thanks for the review!</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={pending || rating < 1}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await submitReview({ bookingId, itemId, rating, text });
              if (res.error) setError(res.error);
              else {
                setDone(true);
                router.refresh();
              }
            })
          }
          className="rounded-full bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Submit"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink"
        >
          Close
        </button>
      </div>
    </div>
  );
}
