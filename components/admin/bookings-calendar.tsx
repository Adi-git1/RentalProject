"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { addDaysISO, toISODateLocal } from "@/lib/date";

export interface CalBooking {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  label: string;
  fulfillment: string;
}

export function BookingsCalendar({ bookings }: { bookings: CalBooking[] }) {
  const [monthOffset, setMonthOffset] = useState(0);

  const { cells, monthLabel } = useMemo(() => {
    const base = new Date();
    base.setDate(1);
    base.setMonth(base.getMonth() + monthOffset);
    const year = base.getFullYear();
    const month = base.getMonth();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: { iso: string | null }[] = [];
    for (let i = 0; i < startPad; i++) cells.push({ iso: null });
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ iso: toISODateLocal(new Date(year, month, d)) });
    }
    return {
      cells,
      monthLabel: base.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    };
  }, [monthOffset]);

  function bookingsOn(iso: string) {
    return bookings.filter((b) => {
      const starts = b.start_date === iso;
      const ends = b.end_date === iso;
      return starts || ends;
    });
  }

  function spans(iso: string) {
    return bookings.some(
      (b) => b.start_date <= iso && b.end_date >= iso && b.start_date !== iso && b.end_date !== iso,
    );
  }

  const todayIso = toISODateLocal(new Date());

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-white p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonthOffset((m) => m - 1)}
          className="rounded-full px-2 py-1 text-sm text-muted hover:bg-surface"
        >
          ← Prev
        </button>
        <p className="text-sm font-semibold text-ink">{monthLabel}</p>
        <button
          type="button"
          onClick={() => setMonthOffset((m) => m + 1)}
          className="rounded-full px-2 py-1 text-sm text-muted hover:bg-surface"
        >
          Next →
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((c, i) => (
          <div
            key={i}
            className={`min-h-16 rounded-lg border p-1 text-left text-[11px] ${
              c.iso === todayIso ? "border-brand-400 bg-brand-50" : "border-line"
            } ${!c.iso ? "opacity-0" : ""}`}
          >
            {c.iso && (
              <>
                <span className="text-muted">{Number(c.iso.slice(-2))}</span>
                {spans(c.iso) && <div className="mt-0.5 h-1 rounded bg-brand-200" />}
                <div className="mt-0.5 space-y-0.5">
                  {bookingsOn(c.iso).map((b) => (
                    <Link
                      key={b.id + c.iso}
                      href={`/admin/bookings/${b.id}`}
                      className={`block truncate rounded px-1 ${
                        b.start_date === c.iso
                          ? "bg-brand-100 text-brand-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                      title={`${b.start_date === c.iso ? "Out" : "Return"}: ${b.label}`}
                    >
                      {b.start_date === c.iso ? "▶" : "◀"} {b.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">
        <span className="text-brand-700">▶</span> pickup/out ·{" "}
        <span className="text-amber-700">◀</span> return due · bar = rental in progress
      </p>
      <div className="mt-1 text-xs text-muted">
        <button
          type="button"
          onClick={() => setMonthOffset(0)}
          className="text-brand-700 hover:underline"
        >
          Jump to this month
        </button>{" "}
        · {addDaysISO(todayIso, 0)}
      </div>
    </div>
  );
}
