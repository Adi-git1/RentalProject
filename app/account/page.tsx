import type { Metadata } from "next";
import Link from "next/link";
import { Container, EmptyState } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { BookingCard } from "@/components/account/booking-card";
import { requireUser } from "@/lib/auth";
import { listUserBookings } from "@/lib/bookings";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await requireUser("/account");
  const bookings = await listUserBookings(user.id);

  const upcoming = bookings.filter((b) =>
    ["pending", "confirmed", "picked_up"].includes(b.status),
  );
  const past = bookings.filter((b) => ["returned", "cancelled"].includes(b.status));

  return (
    <Container className="max-w-3xl py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            Hi{user.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/account/profile" variant="secondary" size="sm">
            Edit profile
          </ButtonLink>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="h-9 rounded-full border border-line px-3.5 text-sm font-medium text-ink hover:bg-surface"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-ink">Upcoming &amp; active</h2>
        {upcoming.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="No active rentals"
              message="When you book something it shows up here."
              action={<ButtonLink href="/browse">Browse rentals</ButtonLink>}
            />
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {upcoming.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-ink">Past</h2>
          <div className="mt-3 space-y-3">
            {past.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        </section>
      )}

      <p className="mt-8 text-xs text-muted">
        Need help with a booking?{" "}
        <Link href="/terms" className="underline">
          Review the rental terms
        </Link>{" "}
        or contact us.
      </p>
    </Container>
  );
}
