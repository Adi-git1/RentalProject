import Link from "next/link";
import { getSettings } from "@/lib/data";

export async function SiteFooter() {
  const settings = await getSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-semibold text-ink">{settings.business_name}</p>
          <p className="mt-2 text-sm text-muted">
            Party &amp; event rentals. Pickup at {settings.pickup_address}. Delivery within{" "}
            {settings.delivery_radius_miles} miles.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-medium text-ink">Explore</p>
          <ul className="mt-2 space-y-1.5 text-muted">
            <li><Link href="/browse" className="hover:text-ink">Browse all</Link></li>
            <li><Link href="/how-it-works" className="hover:text-ink">How it works</Link></li>
            <li><Link href="/terms" className="hover:text-ink">Rental terms</Link></li>
            <li><Link href="/account" className="hover:text-ink">My bookings</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-medium text-ink">Contact</p>
          <ul className="mt-2 space-y-1.5 text-muted">
            {settings.contact_email && <li>{settings.contact_email}</li>}
            {settings.contact_phone && <li>{settings.contact_phone}</li>}
            <li>{settings.pickup_address}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-6 text-center text-xs text-muted">
        © {year} {settings.business_name}. All rentals are final once paid — see{" "}
        <Link href="/terms" className="underline hover:text-ink">terms</Link>.
      </div>
    </footer>
  );
}
