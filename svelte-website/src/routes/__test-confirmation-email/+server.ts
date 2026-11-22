import { error, json } from "@sveltejs/kit";
import {
  SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM,
} from "$app/env/private";
import { DOMAIN_ROOT } from "$app/env/public";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  if (!import.meta.env.DEV) error(404, "Not found");

  const { to } = await request.json().catch(() => ({}));
  if (typeof to !== "string" || !/^\S+@\S+\.\S+$/.test(to)) {
    return json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    // mail-theme.mjs reads process.env when it loads, so fill it in first
    Object.assign(process.env, {
      DOMAIN_ROOT, SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_FROM,
      SMTP_PORT: String(SMTP_PORT),
      SMTP_SECURE: String(SMTP_SECURE),
    });

    // @ts-ignore: plain .mjs shared with the GitHub Actions scripts
    const mail = await import("../../../scripts/lib/mail-theme.mjs");
    const t = mail.EMAIL_THEME;

    // @ts-expect-error mail-theme.mjs params aren't typed as optional
    const html = mail.renderEmailCard({
      eyebrow: "03 / writing · confirm subscription",
      title: "Confirm your subscription",
      bodyHtml: `<p style="margin:0;font-family:${t.fontBody};font-size:15px;line-height:1.6;color:${t.textDim};">Click below to start getting new posts from ${mail.escapeHtml(mail.SITE_DOMAIN)} by email. If you didn't sign up, ignore this message.</p>`,
      // placeholder link: confirms nothing
      cta: { href: `https://${mail.SITE_DOMAIN}/`, label: "Confirm subscription →" },
      footerHtml: `sent because this address was entered on ${mail.escapeHtml(mail.SITE_DOMAIN)}`,
    });

    await mail.createTransporter().sendMail({
      from: MAIL_FROM,
      to,
      subject: "[TEST] Confirm your subscription",
      text: `Confirm your subscription to ${mail.SITE_DOMAIN}. (Test email; the link is a placeholder.)`,
      html,
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