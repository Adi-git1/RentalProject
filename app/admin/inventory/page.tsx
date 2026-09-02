import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { listInventory } from "@/lib/admin-inventory";
import { formatUsd } from "@/lib/money";

export const metadata: Metadata = { title: "Inventory · Admin" };

export default async function AdminInventoryPage() {
  const items = await listInventory();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Inventory</h1>
        <ButtonLink href="/admin/inventory/new" size="sm">
          + New item
        </ButtonLink>
      </div>

      <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-xs text-muted">
            <tr>
              <th className="p-3">Item</th>
              <th className="p-3">Day / Weekend / Week</th>
              <th className="p-3">Deposit</th>
              <th className="p-3">Qty</th>
              <th className="p-3">Upcoming</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted">
                  No items yet. Add one, or run <code>npm run seed</code>.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-surface">
                  <td className="p-3">
                    <Link
                      href={`/admin/inventory/${item.id}`}
                      className="flex items-center gap-3"
                    >
                      <div className="relative h-10 w-12 shrink-0 overflow-hidden rounded bg-surface">
                        {item.coverUrl && (
                          <Image src={item.coverUrl} alt="" fill sizes="48px" className="object-cover" />
                        )}
                      </div>
                      <span>
                        <span className="font-medium text-ink hover:underline">{item.name}</span>
                        <span className="block text-xs text-muted">
                          {item.category} · {item.photoCount} photo{item.photoCount === 1 ? "" : "s"}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="p-3 whitespace-nowrap text-muted">
                    {formatUsd(Number(item.price_day))} /{" "}
                    {item.price_weekend != null ? formatUsd(Number(item.price_weekend)) : "—"} /{" "}
                    {item.price_week != null ? formatUsd(Number(item.price_week)) : "—"}
                  </td>
                  <td className="p-3">{formatUsd(Number(item.deposit))}</td>
                  <td className="p-3">{item.quantity}</td>
                  <td className="p-3">{item.upcomingBookings || "—"}</td>
                  <td className="p-3">
                    {item.active ? (
                      <Badge className="bg-brand-100 text-brand-800">Active</Badge>
                    ) : (
                      <Badge className="bg-slate-200 text-slate-600">Hidden</Badge>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
