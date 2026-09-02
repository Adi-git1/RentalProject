import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPickupReminder, sendReturnReminder } from "@/lib/email/notifications";
import { addDaysISO, todayISO } from "@/lib/date";

/**
 * Daily job: emails 24h-before-pickup and 24h-before-return reminders.
 * Protected by CRON_SECRET (Vercel Cron sends it as a Bearer token).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const qsSecret = new URL(request.url).searchParams.get("secret");
  if (secret && auth !== `Bearer ${secret}` && qsSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const tomorrow = addDaysISO(todayISO(), 1);
  const results = { pickup: 0, return: 0 };

  const { data: pickups } = await admin
    .from("bookings")
    .select("id")
    .eq("status", "confirmed")
    .eq("start_date", tomorrow)
    .is("reminder_pickup_sent_at", null);

  for (const b of pickups ?? []) {
    await sendPickupReminder(b.id);
    await admin
      .from("bookings")
      .update({ reminder_pickup_sent_at: new Date().toISOString() })
      .eq("id", b.id);
    results.pickup++;
  }

  const { data: returns } = await admin
    .from("bookings")
    .select("id")
    .in("status", ["confirmed", "picked_up"])
    .eq("end_date", tomorrow)
    .is("reminder_return_sent_at", null);

  for (const b of returns ?? []) {
    await sendReturnReminder(b.id);
    await admin
      .from("bookings")
      .update({ reminder_return_sent_at: new Date().toISOString() })
      .eq("id", b.id);
    results.return++;
  }

  return NextResponse.json({ ok: true, ...results });
}
