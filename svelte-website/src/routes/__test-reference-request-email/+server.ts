import { error, json } from "@sveltejs/kit";
import nodemailer from "nodemailer";
import {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
  MAIL_REPLY_TO,
} from "$app/env/private";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async () => {
  if (!import.meta.env.DEV) error(404, "Not found");

  const to = MAIL_REPLY_TO; // || MAIL_FROM;


//   use nodemailer to create a virtual email sender
  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      logger: true, // remove once it works
      debug: true,
    });
    // attempt to send email form svelte
    await transporter.sendMail({
      from: MAIL_FROM,
      to,
      subject: "Test email from SvelteKit",
      text: "If you can read this, SMTP is working.",
    });

    return json({ to });
  } catch (err) {
    console.error(err);
    return json(
      { error: err instanceof Error ? err.message : "Failed to send" },
      { status: 500 },
    );
  }
};