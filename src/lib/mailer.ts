import "server-only";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";

export type TemplateVars = Record<string, string | number>;

function renderTemplate(template: string, vars: TemplateVars) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => String(vars[key] ?? ""));
}

async function getTransport() {
  const config = await db.smtpSetting.findUnique({ where: { id: 1 } });
  if (!config?.host || !config.port || !config.username || !config.passwordEncrypted) {
    return null;
  }
  const password = decryptSecret(config.passwordEncrypted);
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.encryption === "SSL",
    auth: { user: config.username, pass: password },
  });
  return { transport, fromName: config.fromName ?? "Your Wallet", fromEmail: config.fromEmail ?? config.username };
}

/**
 * Sends an email using the admin-configured SMTP settings and email template.
 * Falls back to logging (never throwing) when SMTP isn't configured yet, so
 * the rest of the app keeps working before an operator finishes install setup.
 */
export async function sendTemplatedEmail(params: { to: string; templateKey: string; vars: TemplateVars }) {
  const template = await db.emailTemplate.findUnique({ where: { key: params.templateKey } });
  if (!template) {
    console.warn(`[mailer] Missing email template "${params.templateKey}"`);
    return { sent: false, reason: "missing_template" as const };
  }

  const subject = renderTemplate(template.subject, params.vars);
  const html = renderTemplate(template.bodyHtml, params.vars);

  const smtp = await getTransport();
  if (!smtp) {
    const plainText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    console.info(`[mailer] SMTP not configured — would send "${subject}" to ${params.to}\n  ${plainText}`);
    return { sent: false, reason: "smtp_not_configured" as const };
  }

  await smtp.transport.sendMail({
    to: params.to,
    from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
    subject,
    html,
  });
  return { sent: true as const };
}

export async function sendTestEmail(to: string) {
  const smtp = await getTransport();
  if (!smtp) throw new Error("SMTP is not configured yet");
  await smtp.transport.sendMail({
    to,
    from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
    subject: "Test email from your wallet platform",
    html: "<p>This is a test email confirming your SMTP configuration works.</p>",
  });
}
