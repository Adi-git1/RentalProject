"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteItem } from "@/app/admin/inventory/actions";

export function DeleteItemButton({ itemId }: { itemId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm font-medium text-rose-600 hover:underline"
      >
        Delete this item
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
      <p className="text-sm text-rose-900">
        Permanently delete this item? Items with bookings can&apos;t be deleted — hide them
        instead.
      </p>
      {error && <p className="mt-1 text-xs text-rose-700">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await deleteItem(itemId);
              if (res?.error) setError(res.error);
            })
          }
        >
          {pending ? "Deleting…" : "Delete"}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
