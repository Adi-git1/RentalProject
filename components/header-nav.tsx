"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/cn";

export function HeaderNav({
  isAuthed,
  isAdmin,
}: {
  isAuthed: boolean;
  isAdmin: boolean;
}) {
  const { count, hydrated } = useCart();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/browse", label: "Browse" },
    { href: "/how-it-works", label: "How it works" },
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <>
      <nav className="ml-auto hidden items-center gap-1 sm:flex">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-full px-3 py-2 text-sm font-medium text-muted hover:bg-surface hover:text-ink"
          >
            {l.label}
          </Link>
        ))}
        <Link
          href={isAuthed ? "/account" : "/login"}
          className="rounded-full px-3 py-2 text-sm font-medium text-muted hover:bg-surface hover:text-ink"
        >
          {isAuthed ? "My account" : "Sign in"}
        </Link>
        <CartLink count={hydrated ? count : 0} />
      </nav>

      <div className="ml-auto flex items-center gap-1 sm:hidden">
        <CartLink count={hydrated ? count : 0} />
        <button
          type="button"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-16 border-b border-line bg-canvas p-4 shadow-sm sm:hidden">
          <div className="flex flex-col">
            {[...links, { href: isAuthed ? "/account" : "/login", label: isAuthed ? "My account" : "Sign in" }].map(
              (l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-ink hover:bg-surface"
                >
                  {l.label}
                </Link>
              ),
            )}
          </div>
        </div>
      )}
    </>
  );
}

function CartLink({ count }: { count: number }) {
  return (
    <Link
      href="/cart"
      className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-surface"
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 6h15l-1.5 9h-12z" strokeLinejoin="round" />
        <circle cx="9" cy="20" r="1.5" />
        <circle cx="18" cy="20" r="1.5" />
        <path d="M6 6L5 3H2" strokeLinecap="round" />
      </svg>
      {count > 0 && (
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-semibold text-white",
          )}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
