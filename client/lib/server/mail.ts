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
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !from) {
    throw new MailConfigurationError();
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
