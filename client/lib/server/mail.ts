import nodemailer from "nodemailer";

export class MailConfigurationError extends Error {
  constructor() {
    super("SMTP email belum dikonfigurasi.");
    this.name = "MailConfigurationError";
  }
}

export class MailDeliveryError extends Error {
  code?: string;
  command?: string;
  responseCode?: number;

  constructor(error: unknown) {
    super("Email reset password belum dapat dikirim.");
    this.name = "MailDeliveryError";

    if (typeof error === "object" && error) {
      if ("code" in error && typeof error.code === "string") this.code = error.code;
      if ("command" in error && typeof error.command === "string") this.command = error.command;
      if ("responseCode" in error && typeof error.responseCode === "number") this.responseCode = error.responseCode;
    }
  }
}

type PasswordResetEmail = {
  to: string;
  name: string;
  code: string;
  expiresInMinutes: number;
};

export async function sendPasswordResetEmail({ to, name, code, expiresInMinutes }: PasswordResetEmail) {
  const brevoApiKey = readEnv("BREVO_API_KEY");
  const host = readEnv("SMTP_HOST");
  const port = Number(readEnv("SMTP_PORT") || 587);
  const user = readEnv("SMTP_USER");
  const pass = readEnv("SMTP_PASS");
  const from = readEnv("SMTP_FROM") || user;
  const sender = parseSender(from);

  if (brevoApiKey) {
    await sendViaBrevoApi({
      apiKey: brevoApiKey,
      sender,
      to,
      name,
      code,
      expiresInMinutes
    });
    return;
  }

  if (!host || !user || !pass || !from) {
    throw new MailConfigurationError();
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: readEnv("SMTP_SECURE") === "true" || port === 465,
    auth: {
      user,
      pass
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
  });

  try {
    await transporter.sendMail({
      from,
      to,
      subject: "Kode reset password SinyalKita",
      text: [
        `Halo ${name},`,
        "",
        `Kode reset password SinyalKita Anda adalah ${code}.`,
        `Kode ini berlaku selama ${expiresInMinutes} menit.`,
        "",
        "Jika Anda tidak meminta reset password, abaikan email ini."
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
          <p>Halo ${escapeHtml(name)},</p>
          <p>Kode reset password SinyalKita Anda adalah:</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p>
          <p>Kode ini berlaku selama ${expiresInMinutes} menit.</p>
          <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
        </div>
      `
    });
  } catch (error) {
    throw new MailDeliveryError(error);
  }
}

async function sendViaBrevoApi({
  apiKey,
  sender,
  to,
  name,
  code,
  expiresInMinutes
}: PasswordResetEmail & { apiKey: string; sender: { name: string; email: string } }) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to, name }],
      subject: "Kode reset password SinyalKita",
      textContent: [
        `Halo ${name},`,
        "",
        `Kode reset password SinyalKita Anda adalah ${code}.`,
        `Kode ini berlaku selama ${expiresInMinutes} menit.`,
        "",
        "Jika Anda tidak meminta reset password, abaikan email ini."
      ].join("\n"),
      htmlContent: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
          <p>Halo ${escapeHtml(name)},</p>
          <p>Kode reset password SinyalKita Anda adalah:</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p>
          <p>Kode ini berlaku selama ${expiresInMinutes} menit.</p>
          <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
        </div>
      `
    })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new MailDeliveryError({
      code: typeof data.code === "string" ? data.code : `BREVO_API_${response.status}`,
      responseCode: response.status
    });
  }
}

function parseSender(value: string) {
  const match = value.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
  if (match) {
    return {
      name: match[1].trim() || "SinyalKita",
      email: match[2].trim()
    };
  }

  return {
    name: "SinyalKita",
    email: value.trim()
  };
}

function readEnv(key: string) {
  const value = process.env[key]?.trim();
  if (!value) return "";

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1).trim();
  }

  return value;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
