import type { Metadata } from "next";
import Link from "next/link";
import { getDashboard, type BookingSummary } from "@/lib/admin";
import { formatCents } from "@/lib/money";
import { formatDateLong } from "@/lib/date";

export const metadata: Metadata = { title: "Admin dashboard" };

export default async function AdminDashboard() {
  const d = await getDashboard();

  const stats = [
    { label: "Revenue this month", value: formatCents(d.revenueThisMonthCents) },
    { label: "Refunds this month", value: formatCents(d.refundsThisMonthCents) },
    { label: "Deposit holds active", value: formatCents(d.heldDepositsCents) },
    { label: "Pending payment", value: String(d.pendingCount) },
    { label: "Confirmed (upcoming)", value: String(d.confirmedCount) },
    { label: "Currently out", value: String(d.outCount) },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Dashboard</h1>
      <p className="text-sm text-muted">{formatDateLong(d.today)}</p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-white p-4">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="mt-1 text-lg font-semibold text-ink">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <TaskList title="Pickups today" rows={d.pickupsToday} empty="No pickups scheduled today." />
        <TaskList title="Returns due today" rows={d.returnsToday} empty="No returns due today." />
        <TaskList title="Pickups this week" rows={d.pickupsThisWeek} empty="Nothing in the next 7 days." />
        <TaskList title="Returns this week" rows={d.returnsThisWeek} empty="Nothing in the next 7 days." />
      </div>
    </div>
  );
}

function TaskList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: BookingSummary[];
  empty: string;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-white p-4">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {rows.map((r) => (
            <li key={r.id} className="py-2 text-sm">
              <Link
                href={`/admin/bookings/${r.id}`}
                className="font-medium text-ink hover:underline"
              >
                {r.contact_name ?? "Customer"}
              </Link>
              <span className="ml-2 text-xs capitalize text-muted">{r.fulfillment}</span>
              <p className="text-xs text-muted">{r.itemsLabel}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
