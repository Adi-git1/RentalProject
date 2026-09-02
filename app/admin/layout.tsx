import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-6 sm:px-6">
      <aside className="hidden w-48 shrink-0 lg:block">
        <div className="sticky top-20">
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted">
            Admin
          </p>
          <AdminNav />
          <Link
            href="/"
            className="mt-4 block px-3 py-2 text-sm text-muted hover:text-ink"
          >
            ← Back to store
          </Link>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="mb-4 lg:hidden">
          <AdminNav horizontal />
        </div>
        {children}
      </div>
    </div>
  );
}
