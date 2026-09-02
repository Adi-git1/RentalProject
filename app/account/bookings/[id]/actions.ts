"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { releaseDeposit } from "@/lib/deposit";
import { sendBookingCancelled } from "@/lib/email/notifications";

export async function cancelBooking(bookingId: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (!booking || booking.user_id !== user.id) return { error: "Booking not found." };
  if (!["pending", "confirmed"].includes(booking.status)) {
    return { error: "This booking can no longer be cancelled online." };
  }
  if (booking.status === "confirmed" && booking.start_date <= new Date().toISOString().slice(0, 10)) {
    return { error: "The rental has already started — contact us to make changes." };
  }

  await admin
    .from("bookings")
    .update({
      status: "cancelled",
      notes: [booking.notes, `Cancelled by customer on ${new Date().toISOString().slice(0, 10)} (no refund per policy).`]
        .filter(Boolean)
        .join("\n"),
    })
    .eq("id", bookingId);

  await releaseDeposit(booking);
  await sendBookingCancelled(bookingId, {
    reason:
      "Your booking has been cancelled at your request. As noted in the rental terms, payment is non-refundable; the security deposit hold has been released.",
  });

  revalidatePath(`/account/bookings/${bookingId}`);
  revalidatePath("/account");
  return {};
}
