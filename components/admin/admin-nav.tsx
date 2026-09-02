"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav({ horizontal = false }: { horizontal?: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      className={cn(
        horizontal ? "flex gap-1 overflow-x-auto" : "mt-2 flex flex-col gap-0.5",
      )}
    >
      {LINKS.map((l) => {
        const active =
          l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap",
              active ? "bg-brand-50 text-brand-800" : "text-ink hover:bg-surface",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
