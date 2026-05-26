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
  providerMessage?: string;

  constructor(error: unknown) {
    super("Email reset password belum dapat dikirim.");
    this.name = "MailDeliveryError";

    if (typeof error === "object" && error) {
      if ("code" in error && typeof error.code === "string") this.code = error.code;
      if ("command" in error && typeof error.command === "string") this.command = error.command;
      if ("responseCode" in error && typeof error.responseCode === "number") this.responseCode = error.responseCode;
      if ("message" in error && typeof error.message === "string") this.providerMessage = error.message;
    }
  }
}

type PasswordResetEmail = {
  to: string;
  name: string;
  code: string;
  expiresInMinutes: number;
};

const DEFAULT_EMAIL_LOGO_URL =
  "https://raw.githubusercontent.com/voixera/sinyalkita/main/client/public/images/logoSinyalKita.png";

export async function sendPasswordResetEmail({ to, name, code, expiresInMinutes }: PasswordResetEmail) {
  const brevoApiKey = readEnv("BREVO_API_KEY");
  const host = readEnv("SMTP_HOST");
  const port = Number(readEnv("SMTP_PORT") || 587);
  const user = readEnv("SMTP_USER");
  const pass = readEnv("SMTP_PASS");
  const from = readEnv("SMTP_FROM") || user;
  const sender = parseSender(from);
  const email = createPasswordResetEmail({ name, code, expiresInMinutes });

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
      subject: email.subject,
      text: email.text,
      html: email.html
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
  const email = createPasswordResetEmail({ name, code, expiresInMinutes });

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
      subject: email.subject,
      textContent: email.text,
      htmlContent: email.html
    })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new MailDeliveryError({
      code: typeof data.code === "string" ? data.code : `BREVO_API_${response.status}`,
      responseCode: response.status,
      message: typeof data.message === "string" ? data.message : ""
    });
  }
}

function createPasswordResetEmail({
  name,
  code,
  expiresInMinutes
}: Pick<PasswordResetEmail, "name" | "code" | "expiresInMinutes">) {
  const logoUrl = getEmailLogoUrl();
  const logoMarkup = `<img src="${escapeHtml(logoUrl)}" width="56" height="56" alt="SinyalKita" style="display:block;width:56px;height:56px;border:0" />`;
  const safeName = escapeHtml(name);
  const safeCode = escapeHtml(code);
  const safeMinutes = escapeHtml(String(expiresInMinutes));

  return {
    subject: "Kode reset password SinyalKita",
    text: [
      `Halo ${name},`,
      "",
      "Kami menerima permintaan reset kata sandi akun SinyalKita Anda.",
      `Kode verifikasi Anda: ${code}`,
      `Kode ini berlaku selama ${expiresInMinutes} menit.`,
      "",
      "Masukkan kode ini di halaman reset password SinyalKita. Jangan bagikan kode kepada siapa pun.",
      "Jika Anda tidak meminta reset password, abaikan email ini."
    ].join("\n"),
    html: `
      <div style="margin:0;padding:0;background:#f4f7fa;font-family:Arial,Helvetica,sans-serif;color:#0b1628">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
          Kode reset password SinyalKita Anda adalah ${safeCode}. Berlaku ${safeMinutes} menit.
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f4f7fa">
          <tr>
            <td align="center" style="padding:32px 12px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border-collapse:collapse">
                <tr>
                  <td style="border:1px solid #d8e0e8;border-radius:22px;background:#ffffff;box-shadow:0 18px 44px rgba(11,22,40,0.08);overflow:hidden">
                    <div style="padding:30px 28px 28px">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
                        <tr>
                          <td width="68" style="vertical-align:middle">
                            <div style="width:56px;height:56px;border-radius:16px;background:#ffffff;border:1px solid #d8e0e8;box-shadow:0 8px 24px rgba(11,22,40,0.08);overflow:hidden;line-height:0">
                              ${logoMarkup}
                            </div>
                          </td>
                          <td style="vertical-align:middle">
                            <p style="margin:0;font-size:18px;font-weight:800;line-height:1.2;color:#0b1628">SinyalKita</p>
                            <p style="margin:4px 0 0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#63758c">Reset password</p>
                          </td>
                        </tr>
                      </table>

                      <h1 style="margin:28px 0 0;font-size:28px;line-height:1.18;color:#0b1628">Kode verifikasi akun Anda</h1>
                      <p style="margin:14px 0 0;font-size:15px;line-height:1.7;color:#42526a">Halo ${safeName}, kami menerima permintaan reset kata sandi untuk akun SinyalKita Anda.</p>

                      <div style="margin:24px 0 0;border:1px solid #bfe8d7;border-radius:18px;background:#edf9f3;padding:22px;text-align:center">
                        <p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#2f9a6d">Kode reset</p>
                        <div style="font-family:Consolas,'Courier New',monospace;font-size:40px;line-height:1;font-weight:800;letter-spacing:0.2em;color:#0f3a63">${safeCode}</div>
                        <p style="margin:14px 0 0;font-size:13px;font-weight:700;color:#42526a">Berlaku selama ${safeMinutes} menit</p>
                      </div>

                      <p style="margin:22px 0 0;font-size:14px;line-height:1.7;color:#42526a">Masukkan kode tersebut di halaman reset password SinyalKita. Demi keamanan, jangan bagikan kode ini kepada siapa pun.</p>

                      <div style="margin:22px 0 0;border-radius:14px;background:#f4f7fa;padding:14px 16px">
                        <p style="margin:0;font-size:13px;line-height:1.6;color:#63758c">Jika Anda tidak meminta reset password, abaikan email ini. Kata sandi Anda tidak akan berubah tanpa kode verifikasi ini.</p>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:18px 12px 0">
                    <p style="margin:0;font-size:12px;line-height:1.6;color:#8a9bb0">Email otomatis dari SinyalKita.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `
  };
}

function getEmailLogoUrl() {
  return normalizeUrl(readEnv("EMAIL_LOGO_URL")) || DEFAULT_EMAIL_LOGO_URL;
}

function normalizeUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
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
