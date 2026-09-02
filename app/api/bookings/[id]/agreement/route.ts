import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getBookingDetail } from "@/lib/bookings";
import { getSettings } from "@/lib/data";
import { buildAgreementPdf } from "@/lib/pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const booking = await getBookingDetail(id);
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.user_id !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await getSettings();
  const pdf = await buildAgreementPdf(booking, settings);

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="rental-agreement-${id.slice(0, 8)}.pdf"`,
    },
  });
}
