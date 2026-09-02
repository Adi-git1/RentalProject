import "server-only";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "AnyTimeRental <onboarding@resend.dev>";

const resend = apiKey ? new Resend(apiKey) : null;

export interface SendEmailArgs {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

/** Sends via Resend, or logs to the console when RESEND_API_KEY is not set. */
export async function sendEmail({ to, subject, html, replyTo }: SendEmailArgs) {
  if (!resend) {
    console.info(
      `[email:stub] to=${Array.isArray(to) ? to.join(",") : to} subject="${subject}" (set RESEND_API_KEY to actually send)`,
    );
    return { stubbed: true as const };
  }
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    replyTo,
  });
  if (error) {
    console.error("[email] send failed:", error);
    return { error };
  }
  return { id: data?.id };
}
