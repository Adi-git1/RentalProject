"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { releaseDeposit } from "@/lib/deposit";
import { sendBookingCancelled } from "@/lib/email/notifications";
import { reviewSchema } from "@/lib/validation";

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

export async function submitReview(input: {
  bookingId: string;
  itemId: string;
  rating: number;
  text: string;
}): Promise<{ error?: string; ok?: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };

  const parsed = reviewSchema.safeParse({
    itemId: input.itemId,
    rating: input.rating,
    text: input.text,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }

  const admin = createAdminClient();

  // Verify the user had this item on a returned booking.
  const { data: eligible } = await admin
    .from("booking_items")
    .select("id, bookings!inner(user_id, status)")
    .eq("item_id", input.itemId)
    .eq("bookings.user_id", user.id)
    .eq("bookings.status", "returned")
    .limit(1);

  if (!eligible || eligible.length === 0) {
    return { error: "You can only review items from a completed rental." };
  }

  const { data: itemRow } = await admin
    .from("items")
    .select("slug")
    .eq("id", input.itemId)
    .single();

  const { error } = await admin.from("reviews").upsert(
    {
      item_id: input.itemId,
      user_id: user.id,
      booking_id: input.bookingId,
      rating: parsed.data.rating,
      text: parsed.data.text || "",
    },
    { onConflict: "item_id,user_id" },
  );
  if (error) return { error: error.message };

  revalidatePath(`/account/bookings/${input.bookingId}`);
  if (itemRow?.slug) revalidatePath(`/items/${itemRow.slug}`);
  return { ok: true };
}
