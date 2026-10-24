import "server-only";

/**
 * Mail providers.
 *
 * The platform sends through exactly one provider at a time, chosen in admin
 * settings. Swapping provider is a config change, never a deploy — the same
 * discipline Spurs Pay applies to payment processors, and for the same reason:
 * a provider that starts bouncing mail at 2am must be replaceable immediately.
 *
 * Adding one means implementing this interface and registering it below.
 */

export interface Envelope {
  to: string;
  from: string;
  fromName: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendResult {
  /** The provider's own id, for chasing a message up with them later. */
  ref: string | null;
}

export interface MailProvider {
  id: string;
  name: string;
  /** Which settings keys this provider needs before it can send. */
  requires: string[];
  send(envelope: Envelope, config: Record<string, string>): Promise<SendResult>;
}

/* ------------------------------------------------------------------- smtp */

/**
 * Plain SMTP. Works with anything — Gmail, Zoho, Amazon SES, a self-hosted
 * relay — which makes it the safe default before a dedicated provider is
 * chosen. nodemailer is imported lazily so the other providers don't pay for it.
 */
const smtp: MailProvider = {
  id: "smtp",
  name: "SMTP",
  requires: ["MAIL_HOST", "MAIL_PORT", "MAIL_USERNAME", "MAIL_PASSWORD"],

  async send(envelope, config) {
    const { createTransport } = await import("nodemailer");

    const port = Number(config.MAIL_PORT ?? 587);
    const transport = createTransport({
      host: config.MAIL_HOST,
      port,
      // 465 is implicit TLS; 587 upgrades with STARTTLS.
      secure: port === 465,
      auth: { user: config.MAIL_USERNAME, pass: config.MAIL_PASSWORD },
    });

    const info = await transport.sendMail({
      from: `"${envelope.fromName}" <${envelope.from}>`,
      to: envelope.to,
      replyTo: envelope.replyTo,
      subject: envelope.subject,
      text: envelope.text,
      html: envelope.html,
    });

    return { ref: info.messageId ?? null };
  },
};

/* ----------------------------------------------------------------- resend */

const resend: MailProvider = {
  id: "resend",
  name: "Resend",
  requires: ["MAIL_API_KEY"],

  async send(envelope, config) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.MAIL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${envelope.fromName} <${envelope.from}>`,
        to: [envelope.to],
        reply_to: envelope.replyTo,
        subject: envelope.subject,
        html: envelope.html,
        text: envelope.text,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.message ?? `Resend rejected the message (${res.status})`);
    return { ref: body?.id ?? null };
  },
};

/* --------------------------------------------------------------- postmark */

const postmark: MailProvider = {
  id: "postmark",
  name: "Postmark",
  requires: ["MAIL_API_KEY"],

  async send(envelope, config) {
    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "X-Postmark-Server-Token": config.MAIL_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        From: `${envelope.fromName} <${envelope.from}>`,
        To: envelope.to,
        ReplyTo: envelope.replyTo,
        Subject: envelope.subject,
        HtmlBody: envelope.html,
        TextBody: envelope.text,
        MessageStream: config.MAIL_STREAM || "outbound",
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.Message ?? `Postmark rejected the message (${res.status})`);
    return { ref: body?.MessageID ?? null };
  },
};

/* -------------------------------------------------------------------- log */

/**
 * Development default: writes to the server log and reports success.
 *
 * This exists so nobody has to wire up a real provider to work on a signup
 * flow — and so a misconfigured production deploy fails loudly at the settings
 * screen rather than quietly sending nothing.
 */
const logProvider: MailProvider = {
  id: "log",
  name: "Log only (development)",
  requires: [],

  async send(envelope) {
    console.log(
      `\n──── mail (log provider, nothing sent) ────\n` +
      `to:      ${envelope.to}\n` +
      `from:    ${envelope.fromName} <${envelope.from}>\n` +
      `subject: ${envelope.subject}\n\n` +
      `${envelope.text}\n` +
      `───────────────────────────────────────────\n`,
    );
    return { ref: "log_" + Date.now() };
  },
};

export const PROVIDERS: MailProvider[] = [logProvider, smtp, resend, postmark];

const BY_ID = new Map(PROVIDERS.map((p) => [p.id, p]));
export const getProvider = (id: string): MailProvider => BY_ID.get(id) ?? logProvider;
