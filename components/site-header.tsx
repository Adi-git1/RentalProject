import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { HeaderNav } from "@/components/header-nav";

export async function SiteHeader() {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-ink">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
            A
          </span>
          <span className="hidden sm:inline">{settings.business_name}</span>
        </Link>
        <HeaderNav
          isAuthed={!!user}
          isAdmin={user?.role === "admin"}
        />
      </div>
    </header>
  );
}
