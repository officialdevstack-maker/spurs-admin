/**
 * Email templates for the whole platform.
 *
 * They live here, not in each app, so every Spurs email looks like it came from
 * the same company — and so a change to the footer or the button style is one
 * edit rather than six. Apps send `{ template, context }`; admin renders it.
 *
 * Every template produces both HTML and plain text. Text isn't optional:
 * some clients refuse to render HTML, and a text part measurably helps a
 * message reach the inbox rather than the spam folder.
 *
 * No imports — pure functions over a context object.
 */

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

export interface Brand {
  fromName: string;
  appUrl: string;
}

/* ------------------------------------------------------------------ shell */

const escape = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * The house style. Table-based and inline-styled on purpose — email clients
 * are twenty years behind browsers, and this is what survives Outlook.
 */
function shell(brand: Brand, body: string, preheader = ""): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(brand.fromName)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escape(preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #eaecf4;border-radius:18px;overflow:hidden;">
      <tr><td style="padding:28px 32px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="background:#6d4aff;border-radius:10px;width:32px;height:32px;text-align:center;vertical-align:middle;color:#ffffff;font-weight:700;font-size:15px;">S</td>
          <td style="padding-left:10px;font-weight:600;font-size:15px;color:#12131f;">${escape(brand.fromName)}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:22px 32px 30px;color:#12131f;font-size:15px;line-height:1.6;">
${body}
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
      <tr><td style="padding:18px 32px;color:#9aa0b4;font-size:12px;line-height:1.6;text-align:center;">
        Sent by ${escape(brand.fromName)}. If this wasn't you, you can ignore it safely.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;"><tr>
    <td style="background:#6d4aff;border-radius:999px;">
      <a href="${escape(href)}" style="display:inline-block;padding:12px 26px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;">${escape(label)}</a>
    </td>
  </tr></table>`;

const p = (text: string) => `<p style="margin:0 0 14px;">${text}</p>`;

const muted = (text: string) =>
  `<p style="margin:14px 0 0;color:#676b80;font-size:13px;line-height:1.6;">${text}</p>`;

const codeBlock = (value: string) =>
  `<div style="margin:20px 0;padding:16px;background:#f6f7fb;border-radius:12px;text-align:center;
    font-family:ui-monospace,Menlo,Consolas,monospace;font-size:20px;font-weight:600;letter-spacing:.12em;color:#12131f;">
    ${escape(value)}</div>`;

/* -------------------------------------------------------------- templates */

type Ctx = Record<string, unknown>;
export interface Template {
  key: string;
  label: string;
  description: string;
  /** Context keys it needs, for the admin preview and for validation. */
  variables: string[];
  render(ctx: Ctx, brand: Brand): RenderedMail;
}

export const TEMPLATES: Template[] = [
  {
    key: "admin.invite",
    label: "Admin invitation",
    description: "Invites someone to the Spurs admin console.",
    variables: ["name", "inviter", "role", "acceptUrl", "expiresHours"],
    render(ctx, brand) {
      const name = ctx.name ? escape(ctx.name) : "there";
      const subject = `${escape(ctx.inviter)} invited you to the Spurs admin console`;
      const body =
        p(`Hi ${name},`) +
        p(`<strong>${escape(ctx.inviter)}</strong> has invited you to join the Spurs admin console as <strong>${escape(ctx.role)}</strong>.`) +
        button(String(ctx.acceptUrl), "Accept the invitation") +
        muted(`This link works once and expires in ${escape(ctx.expiresHours)} hours. If you weren't expecting it, ignore this email — nothing will happen.`);
      return {
        subject,
        html: shell(brand, body, "Set up your admin account"),
        text: `Hi ${ctx.name ?? "there"},\n\n${ctx.inviter} invited you to the Spurs admin console as ${ctx.role}.\n\nAccept: ${ctx.acceptUrl}\n\nThe link works once and expires in ${ctx.expiresHours} hours. If you weren't expecting it, ignore this email.`,
      };
    },
  },
  {
    key: "auth.verify_email",
    label: "Verify email address",
    description: "Confirms a new Spurs account's email address.",
    variables: ["name", "verifyUrl"],
    render(ctx, brand) {
      const body =
        p(`Hi ${ctx.name ? escape(ctx.name) : "there"},`) +
        p("Confirm your email address to finish setting up your Spurs account.") +
        button(String(ctx.verifyUrl), "Confirm my email") +
        muted("If you didn't create a Spurs account, you can ignore this email.");
      return {
        subject: "Confirm your email address",
        html: shell(brand, body, "One tap to confirm your email"),
        text: `Hi ${ctx.name ?? "there"},\n\nConfirm your email address to finish setting up your Spurs account:\n${ctx.verifyUrl}\n\nIf you didn't create a Spurs account, ignore this email.`,
      };
    },
  },
  {
    key: "auth.reset_password",
    label: "Reset password",
    description: "Password reset link.",
    variables: ["name", "resetUrl", "expiresMinutes"],
    render(ctx, brand) {
      const body =
        p(`Hi ${ctx.name ? escape(ctx.name) : "there"},`) +
        p("We got a request to reset your Spurs password. Use the button below to choose a new one.") +
        button(String(ctx.resetUrl), "Choose a new password") +
        muted(`This link expires in ${escape(ctx.expiresMinutes)} minutes. If you didn't ask for it, ignore this email — your password won't change.`);
      return {
        subject: "Reset your Spurs password",
        html: shell(brand, body, "Choose a new password"),
        text: `Hi ${ctx.name ?? "there"},\n\nReset your Spurs password:\n${ctx.resetUrl}\n\nThe link expires in ${ctx.expiresMinutes} minutes. If you didn't ask for it, ignore this email.`,
      };
    },
  },
  {
    key: "auth.otp",
    label: "One-time code",
    description: "A short-lived sign-in or confirmation code.",
    variables: ["name", "code", "expiresMinutes"],
    render(ctx, brand) {
      const body =
        p(`Hi ${ctx.name ? escape(ctx.name) : "there"},`) +
        p("Here's your one-time code:") +
        codeBlock(String(ctx.code)) +
        muted(`It expires in ${escape(ctx.expiresMinutes)} minutes. Nobody from Spurs will ever ask you for this code.`);
      return {
        subject: `${ctx.code} is your Spurs code`,
        html: shell(brand, body, "Your one-time code"),
        text: `Hi ${ctx.name ?? "there"},\n\nYour one-time code is ${ctx.code}.\n\nIt expires in ${ctx.expiresMinutes} minutes. Nobody from Spurs will ever ask you for this code.`,
      };
    },
  },
  {
    key: "giftcard.delivered",
    label: "Gift card delivered",
    description: "Sends a purchased gift card to its recipient.",
    variables: ["recipientName", "senderName", "amount", "code", "message"],
    render(ctx, brand) {
      const note = ctx.message
        ? `<div style="margin:16px 0;padding:14px 16px;background:#f0ecff;border-radius:12px;color:#12131f;font-style:italic;">${escape(ctx.message)}</div>`
        : "";
      const body =
        p(`Hi ${ctx.recipientName ? escape(ctx.recipientName) : "there"},`) +
        p(`<strong>${escape(ctx.senderName)}</strong> sent you a Spurs gift card worth <strong>${escape(ctx.amount)}</strong>.`) +
        note +
        codeBlock(String(ctx.code)) +
        p("Add it to your Spurs account to spend it anywhere across the platform.") +
        button(`${brand.appUrl}/dashboard/credit`, "Redeem my gift card") +
        muted("Keep this code private — anyone who has it can spend it.");
      return {
        subject: `${ctx.senderName} sent you a ${ctx.amount} Spurs gift card`,
        html: shell(brand, body, `A ${ctx.amount} gift card is waiting for you`),
        text: `Hi ${ctx.recipientName ?? "there"},\n\n${ctx.senderName} sent you a Spurs gift card worth ${ctx.amount}.\n${ctx.message ? `\n"${ctx.message}"\n` : ""}\nYour code: ${ctx.code}\n\nRedeem it at ${brand.appUrl}/dashboard/credit\n\nKeep this code private — anyone who has it can spend it.`,
      };
    },
  },
  {
    key: "payout.sent",
    label: "Payout sent",
    description: "Confirms money has reached someone's wallet.",
    variables: ["name", "amount", "reference"],
    render(ctx, brand) {
      const body =
        p(`Hi ${ctx.name ? escape(ctx.name) : "there"},`) +
        p(`<strong>${escape(ctx.amount)}</strong> has landed in your Spurs Wallet.`) +
        button(`${brand.appUrl}/dashboard`, "View my wallet") +
        muted(`Reference: ${escape(ctx.reference)}`);
      return {
        subject: `${ctx.amount} has arrived in your wallet`,
        html: shell(brand, body, "Your payout has landed"),
        text: `Hi ${ctx.name ?? "there"},\n\n${ctx.amount} has landed in your Spurs Wallet.\n\nReference: ${ctx.reference}\n${brand.appUrl}/dashboard`,
      };
    },
  },
  {
    key: "generic.notice",
    label: "Generic notice",
    description: "A plain message. Use a purpose-built template where one exists.",
    variables: ["heading", "body", "actionUrl", "actionLabel"],
    render(ctx, brand) {
      const action = ctx.actionUrl ? button(String(ctx.actionUrl), String(ctx.actionLabel ?? "Open Spurs")) : "";
      const paragraphs = String(ctx.body ?? "")
        .split(/\n{2,}/)
        .map((para) => p(escape(para)))
        .join("");
      const body = (ctx.heading ? p(`<strong>${escape(ctx.heading)}</strong>`) : "") + paragraphs + action;
      return {
        subject: String(ctx.heading ?? "A message from Spurs"),
        html: shell(brand, body, String(ctx.heading ?? "")),
        text: `${ctx.heading ?? ""}\n\n${ctx.body ?? ""}${ctx.actionUrl ? `\n\n${ctx.actionUrl}` : ""}`,
      };
    },
  },
];

const BY_KEY = new Map(TEMPLATES.map((t) => [t.key, t]));
export const getTemplate = (key: string): Template | null => BY_KEY.get(key) ?? null;

export function render(key: string, ctx: Ctx, brand: Brand): RenderedMail {
  const template = getTemplate(key);
  if (!template) throw new Error(`Unknown email template "${key}"`);
  return template.render(ctx, brand);
}
