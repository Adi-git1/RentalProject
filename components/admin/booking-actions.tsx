"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/primitives";
import {
  setBookingStatus,
  releaseDepositAction,
  captureDepositAction,
  chargeLateFeeAction,
  refundAction,
  saveNotesAction,
} from "@/app/admin/bookings/actions";
import type { BookingStatus } from "@/lib/database.types";

interface Props {
  bookingId: string;
  status: string;
  depositStatus: string;
  depositTotal: number;
  total: number;
  amountRefunded: number;
  notes: string;
  hasPaymentIntent: boolean;
}

export function BookingAdminActions({
  bookingId,
  status,
  depositStatus,
  depositTotal,
  total,
  amountRefunded,
  notes,
  hasPaymentIntent,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState(notes);
  const [feeAmount, setFeeAmount] = useState("");
  const [feeDesc, setFeeDesc] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [captureAmount, setCaptureAmount] = useState("");

  function run(fn: () => Promise<{ ok?: boolean; error?: string }>, okMsg: string) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      setMsg(res.error ? `⚠ ${res.error}` : `✓ ${okMsg}`);
      if (!res.error) router.refresh();
    });
  }

  const nextStatus: { label: string; value: BookingStatus }[] = [];
  if (status === "confirmed") nextStatus.push({ label: "Mark picked up", value: "picked_up" });
  if (status === "picked_up") nextStatus.push({ label: "Mark returned", value: "returned" });
  if (status === "pending") nextStatus.push({ label: "Force confirm", value: "confirmed" });
  if (["confirmed", "picked_up"].includes(status))
    nextStatus.push({ label: "Cancel booking", value: "cancelled" });
  if (status === "returned") nextStatus.push({ label: "Reopen (picked up)", value: "picked_up" });

  const maxRefund = total - amountRefunded;

  return (
    <div className="space-y-5">
      {msg && (
        <p className={`text-sm ${msg.startsWith("⚠") ? "text-rose-600" : "text-brand-700"}`}>
          {msg}
        </p>
      )}

      <section>
        <h3 className="text-sm font-semibold text-ink">Status</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {nextStatus.map((s) => (
            <Button
              key={s.value}
              size="sm"
              variant={s.value === "cancelled" ? "danger" : "primary"}
              disabled={pending}
              onClick={() =>
                run(() => setBookingStatus(bookingId, s.value), `Status → ${s.value}`)
              }
            >
              {s.label}
            </Button>
          ))}
          {nextStatus.length === 0 && (
            <p className="text-sm text-muted">No status transitions available.</p>
          )}
        </div>
        {status === "picked_up" && depositStatus === "held" && (
          <p className="mt-1 text-xs text-muted">
            Marking returned will release the ${depositTotal.toFixed(2)} deposit hold and email the customer.
          </p>
        )}
      </section>

      {depositTotal > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-ink">
            Security deposit — {depositStatus}
          </h3>
          {depositStatus === "held" ? (
            <div className="mt-2 space-y-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() => run(() => releaseDepositAction(bookingId), "Deposit released")}
              >
                Release hold
              </Button>
              <div className="flex items-center gap-2">
                <input
                  className={`${inputClass} h-9 w-28`}
                  placeholder={`Max ${depositTotal}`}
                  value={captureAmount}
                  onChange={(e) => setCaptureAmount(e.target.value)}
                  inputMode="decimal"
                />
                <Button
                  size="sm"
                  variant="danger"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () =>
                        captureDepositAction(
                          bookingId,
                          captureAmount ? Number(captureAmount) : undefined,
                        ),
                      "Deposit captured",
                    )
                  }
                >
                  Capture (damage)
                </Button>
              </div>
              <p className="text-xs text-muted">Leave amount blank to capture the full hold.</p>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted">
              {depositStatus === "released"
                ? "Hold released."
                : depositStatus === "captured"
                  ? "Deposit was captured."
                  : "No active hold."}
            </p>
          )}
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold text-ink">Charge card on file</h3>
        <p className="text-xs text-muted">Late fees or damage beyond the deposit.</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            className={`${inputClass} h-9 w-24`}
            placeholder="$ amount"
            value={feeAmount}
            onChange={(e) => setFeeAmount(e.target.value)}
            inputMode="decimal"
          />
          <input
            className={`${inputClass} h-9 flex-1`}
            placeholder="Reason (shown to customer on statement)"
            value={feeDesc}
            onChange={(e) => setFeeDesc(e.target.value)}
          />
          <Button
            size="sm"
            disabled={pending || !feeAmount}
            onClick={() =>
              run(
                () => chargeLateFeeAction(bookingId, Number(feeAmount), feeDesc),
                "Card charged",
              )
            }
          >
            Charge
          </Button>
        </div>
      </section>

      {hasPaymentIntent && maxRefund > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-ink">Refund</h3>
          <p className="text-xs text-muted">
            Policy is no-refund; use for exceptional cases. Up to ${maxRefund.toFixed(2)}.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input
              className={`${inputClass} h-9 w-28`}
              placeholder={`Max ${maxRefund.toFixed(2)}`}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              inputMode="decimal"
            />
            <Button
              size="sm"
              variant="danger"
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    refundAction(bookingId, refundAmount ? Number(refundAmount) : undefined),
                  "Refund issued",
                )
              }
            >
              Issue refund
            </Button>
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold text-ink">Internal notes</h3>
        <textarea
          className={`${inputClass} mt-2 h-24 py-2`}
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
        />
        <Button
          size="sm"
          variant="secondary"
          className="mt-2"
          disabled={pending}
          onClick={() => run(() => saveNotesAction(bookingId, notesDraft), "Notes saved")}
        >
          Save notes
        </Button>
      </section>
    </div>
  );
}
