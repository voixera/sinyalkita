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
    super("Email belum dapat dikirim.");
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

type EmailVerificationEmail = {
  to: string;
  name: string;
  code: string;
  expiresInMinutes: number;
  title: string;
  intro: string;
  note: string;
};

type PaymentReceiptEmail = {
  to: string;
  name: string;
  invoices: string[];
  amount: number;
  method: string;
  reference: string;
  paidAt: Date;
};

type AdminNoticeEmail = {
  count: number;
  userName: string;
  detail: string;
  createdAt: Date;
};

type ServerStatusNoticeEmail = {
  to: string;
  name: string;
  serverName: string;
  status: "TROUBLE" | "DOWN";
  note?: string | null;
};

type ServerRestoredNoticeEmail = {
  to: string;
  name: string;
  serverName: string;
};

type ReportCheckingEmail = {
  to: string;
  name: string;
  message: string;
};

const DEFAULT_EMAIL_LOGO_URL =
  "https://raw.githubusercontent.com/voixera/sinyalkita/main/client/public/images/logoSinyalKita.png";
const DEFAULT_ADMIN_EMAIL = "rizafaisal130@gmail.com";

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
    await sendPasswordResetViaBrevoApi({
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

export async function sendEmailVerificationEmail({
  to,
  name,
  code,
  expiresInMinutes,
  title,
  intro,
  note
}: EmailVerificationEmail) {
  const brevoApiKey = readEnv("BREVO_API_KEY");
  const host = readEnv("SMTP_HOST");
  const port = Number(readEnv("SMTP_PORT") || 587);
  const user = readEnv("SMTP_USER");
  const pass = readEnv("SMTP_PASS");
  const from = readEnv("SMTP_FROM") || user;
  const sender = parseSender(from);
  const email = createVerificationCodeEmail({ name, code, expiresInMinutes, title, intro, note });

  if (brevoApiKey) {
    await sendHtmlViaBrevoApi({
      apiKey: brevoApiKey,
      sender,
      to,
      name,
      subject: email.subject,
      text: email.text,
      html: email.html
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

export async function sendPaymentProcessingEmail(payment: PaymentReceiptEmail) {
  const email = createPaymentReceiptEmail({
    ...payment,
    title: "Bukti pembayaran diterima",
    eyebrow: "Pembayaran diproses",
    intro:
      "Terima kasih, bukti pembayaran kamu sudah masuk ke sistem SinyalKita. Admin sedang mengecek transaksi ini sebelum tagihan ditandai lunas.",
    highlight: "Masih diproses",
    note: "Kamu tidak perlu membayar tagihan ini lagi selama statusnya sedang diverifikasi. Kami akan mengirim email baru setelah admin menyetujui pembayaran."
  });

  await sendTransactionalEmail({
    to: payment.to,
    name: payment.name,
    subject: email.subject,
    text: email.text,
    html: email.html
  });
}

export async function sendPaymentApprovedEmail(payment: PaymentReceiptEmail) {
  const email = createPaymentReceiptEmail({
    ...payment,
    title: "Yeayy, tagihan kamu berhasil dibayarkan",
    eyebrow: "Pembayaran berhasil",
    intro:
      "Pembayaran kamu sudah diverifikasi admin. Tagihan terkait sudah kami tandai lunas dan layanan kamu tetap berjalan normal.",
    highlight: "Lunas",
    note: "Simpan email ini sebagai bukti pembayaran resmi dari SinyalKita. Terima kasih sudah membayar tepat waktu."
  });

  await sendTransactionalEmail({
    to: payment.to,
    name: payment.name,
    subject: email.subject,
    text: email.text,
    html: email.html
  });
}

export async function sendAdminReportNotificationEmail(notice: AdminNoticeEmail) {
  const email = createAdminNoticeEmail({
    ...notice,
    title: `Wah Gawat Ada ${notice.count} pemberitahuan dari user nih`,
    eyebrow: "Report gangguan",
    intro: "Ada laporan gangguan baru yang masuk dan perlu dicek dari panel admin.",
    actionText: "Buka menu Report untuk melihat detail laporan dan menandainya selesai jika sudah ditangani."
  });

  await sendTransactionalEmail({
    to: getAdminEmail(),
    name: "Admin SinyalKita",
    subject: email.subject,
    text: email.text,
    html: email.html
  });
}

export async function sendAdminPaymentVerificationNotificationEmail(notice: AdminNoticeEmail) {
  const email = createAdminNoticeEmail({
    ...notice,
    title: `Hai Admin ada ${notice.count} pembayaran yang ingin di verifikasi nih`,
    eyebrow: "Verifikasi pembayaran",
    intro: "Ada bukti pembayaran baru yang dikirim user dan menunggu keputusan admin.",
    actionText: "Buka menu Verifikasi untuk melihat bukti transfer, lalu setujui atau tolak pembayaran."
  });

  await sendTransactionalEmail({
    to: getAdminEmail(),
    name: "Admin SinyalKita",
    subject: email.subject,
    text: email.text,
    html: email.html
  });
}

export async function sendServerStatusNotificationEmail(notice: ServerStatusNoticeEmail) {
  const issueText = notice.status === "DOWN" ? "error" : "gangguan";
  const email = createServerStatusEmail({ ...notice, issueText });

  await sendTransactionalEmail({
    to: notice.to,
    name: notice.name,
    subject: email.subject,
    text: email.text,
    html: email.html
  });
}

export async function sendServerRestoredNotificationEmail(notice: ServerRestoredNoticeEmail) {
  const email = createServerRestoredEmail(notice);

  await sendTransactionalEmail({
    to: notice.to,
    name: notice.name,
    subject: email.subject,
    text: email.text,
    html: email.html
  });
}

export async function sendReportCheckingEmail(report: ReportCheckingEmail) {
  const email = createReportCheckingEmail(report);

  await sendTransactionalEmail({
    to: report.to,
    name: report.name,
    subject: email.subject,
    text: email.text,
    html: email.html
  });
}

async function sendPasswordResetViaBrevoApi({
  apiKey,
  sender,
  to,
  name,
  code,
  expiresInMinutes
}: PasswordResetEmail & { apiKey: string; sender: { name: string; email: string } }) {
  const email = createPasswordResetEmail({ name, code, expiresInMinutes });

  await sendHtmlViaBrevoApi({
    apiKey,
    sender,
    to,
    name,
    subject: email.subject,
    text: email.text,
    html: email.html
  });
}

async function sendTransactionalEmail({
  to,
  name,
  subject,
  text,
  html
}: {
  to: string;
  name: string;
  subject: string;
  text: string;
  html: string;
}) {
  const brevoApiKey = readEnv("BREVO_API_KEY");
  const host = readEnv("SMTP_HOST");
  const port = Number(readEnv("SMTP_PORT") || 587);
  const user = readEnv("SMTP_USER");
  const pass = readEnv("SMTP_PASS");
  const from = readEnv("SMTP_FROM") || user;
  const sender = parseSender(from);

  if (brevoApiKey) {
    await sendHtmlViaBrevoApi({
      apiKey: brevoApiKey,
      sender,
      to,
      name,
      subject,
      text,
      html
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
      subject,
      text,
      html
    });
  } catch (error) {
    throw new MailDeliveryError(error);
  }
}

async function sendHtmlViaBrevoApi({
  apiKey,
  sender,
  to,
  name,
  subject,
  text,
  html
}: {
  apiKey: string;
  sender: { name: string; email: string };
  to: string;
  name: string;
  subject: string;
  text: string;
  html: string;
}) {
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
      subject,
      textContent: text,
      htmlContent: html
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

function createVerificationCodeEmail({
  name,
  code,
  expiresInMinutes,
  title,
  intro,
  note
}: Omit<EmailVerificationEmail, "to">) {
  const logoUrl = getEmailLogoUrl();
  const logoMarkup = `<img src="${escapeHtml(logoUrl)}" width="56" height="56" alt="SinyalKita" style="display:block;width:56px;height:56px;border:0" />`;
  const safeName = escapeHtml(name);
  const safeCode = escapeHtml(code);
  const safeMinutes = escapeHtml(String(expiresInMinutes));
  const safeTitle = escapeHtml(title);
  const safeIntro = escapeHtml(intro);
  const safeNote = escapeHtml(note);

  return {
    subject: `${title} SinyalKita`,
    text: [
      `Halo ${name},`,
      "",
      intro,
      `Kode verifikasi Anda: ${code}`,
      `Kode ini berlaku selama ${expiresInMinutes} menit.`,
      "",
      note
    ].join("\n"),
    html: `
      <div style="margin:0;padding:0;background:#f4f7fa;font-family:Arial,Helvetica,sans-serif;color:#0b1628">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
          Kode verifikasi SinyalKita Anda adalah ${safeCode}. Berlaku ${safeMinutes} menit.
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
                            <p style="margin:4px 0 0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#63758c">Verifikasi email</p>
                          </td>
                        </tr>
                      </table>

                      <h1 style="margin:28px 0 0;font-size:28px;line-height:1.18;color:#0b1628">${safeTitle}</h1>
                      <p style="margin:14px 0 0;font-size:15px;line-height:1.7;color:#42526a">Halo ${safeName}, ${safeIntro}</p>

                      <div style="margin:24px 0 0;border:1px solid #bfe8d7;border-radius:18px;background:#edf9f3;padding:22px;text-align:center">
                        <p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#2f9a6d">Kode verifikasi</p>
                        <div style="font-family:Consolas,'Courier New',monospace;font-size:40px;line-height:1;font-weight:800;letter-spacing:0.2em;color:#0f3a63">${safeCode}</div>
                        <p style="margin:14px 0 0;font-size:13px;font-weight:700;color:#42526a">Berlaku selama ${safeMinutes} menit</p>
                      </div>

                      <div style="margin:22px 0 0;border-radius:14px;background:#f4f7fa;padding:14px 16px">
                        <p style="margin:0;font-size:13px;line-height:1.6;color:#63758c">${safeNote}</p>
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

function createPaymentReceiptEmail({
  name,
  invoices,
  amount,
  method,
  reference,
  paidAt,
  title,
  eyebrow,
  intro,
  highlight,
  note
}: PaymentReceiptEmail & {
  title: string;
  eyebrow: string;
  intro: string;
  highlight: string;
  note: string;
}) {
  const logoUrl = getEmailLogoUrl();
  const logoMarkup = `<img src="${escapeHtml(logoUrl)}" width="56" height="56" alt="SinyalKita" style="display:block;width:56px;height:56px;border:0" />`;
  const safeName = escapeHtml(name);
  const safeTitle = escapeHtml(title);
  const safeEyebrow = escapeHtml(eyebrow);
  const safeIntro = escapeHtml(intro);
  const safeHighlight = escapeHtml(highlight);
  const safeNote = escapeHtml(note);
  const safeInvoices = escapeHtml(invoices.join(", ") || "-");
  const safeAmount = escapeHtml(formatEmailCurrency(amount));
  const safeMethod = escapeHtml(method);
  const safeReference = escapeHtml(reference);
  const safePaidAt = escapeHtml(formatEmailDate(paidAt));

  return {
    subject: `${title} - SinyalKita`,
    text: [
      `Halo ${name},`,
      "",
      intro,
      "",
      `Status: ${highlight}`,
      `Invoice: ${invoices.join(", ") || "-"}`,
      `Nominal: ${formatEmailCurrency(amount)}`,
      `Metode: ${method}`,
      `Referensi: ${reference}`,
      `Tanggal: ${formatEmailDate(paidAt)}`,
      "",
      note
    ].join("\n"),
    html: `
      <div style="margin:0;padding:0;background:#f4f7fa;font-family:Arial,Helvetica,sans-serif;color:#0b1628">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
          ${safeTitle}. Invoice ${safeInvoices}, nominal ${safeAmount}.
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f4f7fa">
          <tr>
            <td align="center" style="padding:32px 12px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;border-collapse:collapse">
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
                            <p style="margin:4px 0 0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#63758c">${safeEyebrow}</p>
                          </td>
                        </tr>
                      </table>

                      <h1 style="margin:28px 0 0;font-size:28px;line-height:1.18;color:#0b1628">${safeTitle}</h1>
                      <p style="margin:14px 0 0;font-size:15px;line-height:1.7;color:#42526a">Halo ${safeName}, ${safeIntro}</p>

                      <div style="margin:24px 0 0;border:1px solid #bfe8d7;border-radius:18px;background:#edf9f3;padding:22px">
                        <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#2f9a6d">Status tagihan</p>
                        <p style="margin:0;font-size:30px;line-height:1.15;font-weight:800;color:#0f3a63">${safeHighlight}</p>
                      </div>

                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0;border-collapse:separate;border-spacing:0;border:1px solid #d8e0e8;border-radius:16px;overflow:hidden">
                        ${receiptRow("Invoice", safeInvoices)}
                        ${receiptRow("Nominal", safeAmount)}
                        ${receiptRow("Metode", safeMethod)}
                        ${receiptRow("Referensi", safeReference)}
                        ${receiptRow("Tanggal", safePaidAt)}
                      </table>

                      <div style="margin:22px 0 0;border-radius:14px;background:#f4f7fa;padding:14px 16px">
                        <p style="margin:0;font-size:13px;line-height:1.6;color:#63758c">${safeNote}</p>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:18px 12px 0">
                    <p style="margin:0;font-size:12px;line-height:1.6;color:#8a9bb0">Email receipt otomatis dari SinyalKita.</p>
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

function createAdminNoticeEmail({
  count,
  userName,
  detail,
  createdAt,
  title,
  eyebrow,
  intro,
  actionText
}: AdminNoticeEmail & {
  title: string;
  eyebrow: string;
  intro: string;
  actionText: string;
}) {
  const logoUrl = getEmailLogoUrl();
  const logoMarkup = `<img src="${escapeHtml(logoUrl)}" width="56" height="56" alt="SinyalKita" style="display:block;width:56px;height:56px;border:0" />`;
  const safeTitle = escapeHtml(title);
  const safeEyebrow = escapeHtml(eyebrow);
  const safeIntro = escapeHtml(intro);
  const safeActionText = escapeHtml(actionText);
  const safeCount = escapeHtml(String(count));
  const safeUserName = escapeHtml(userName);
  const safeDetail = escapeHtml(detail);
  const safeCreatedAt = escapeHtml(formatEmailDate(createdAt));

  return {
    subject: `${title} - SinyalKita`,
    text: [
      title,
      "",
      intro,
      `Jumlah saat ini: ${count}`,
      `User terbaru: ${userName}`,
      `Detail: ${detail}`,
      `Waktu: ${formatEmailDate(createdAt)}`,
      "",
      actionText
    ].join("\n"),
    html: `
      <div style="margin:0;padding:0;background:#f4f7fa;font-family:Arial,Helvetica,sans-serif;color:#0b1628">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
          ${safeTitle}. Jumlah saat ini ${safeCount}.
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f4f7fa">
          <tr>
            <td align="center" style="padding:32px 12px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;border-collapse:collapse">
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
                            <p style="margin:4px 0 0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#63758c">${safeEyebrow}</p>
                          </td>
                        </tr>
                      </table>

                      <h1 style="margin:28px 0 0;font-size:27px;line-height:1.18;color:#0b1628">${safeTitle}</h1>
                      <p style="margin:14px 0 0;font-size:15px;line-height:1.7;color:#42526a">${safeIntro}</p>

                      <div style="margin:24px 0 0;border:1px solid #f2d7a7;border-radius:18px;background:#fff8ea;padding:22px">
                        <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#b9822e">Jumlah saat ini</p>
                        <p style="margin:0;font-size:42px;line-height:1;font-weight:800;color:#0f3a63">${safeCount}</p>
                      </div>

                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0;border-collapse:separate;border-spacing:0;border:1px solid #d8e0e8;border-radius:16px;overflow:hidden">
                        ${receiptRow("User terbaru", safeUserName)}
                        ${receiptRow("Detail", safeDetail)}
                        ${receiptRow("Waktu", safeCreatedAt)}
                      </table>

                      <div style="margin:22px 0 0;border-radius:14px;background:#f4f7fa;padding:14px 16px">
                        <p style="margin:0;font-size:13px;line-height:1.6;color:#63758c">${safeActionText}</p>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:18px 12px 0">
                    <p style="margin:0;font-size:12px;line-height:1.6;color:#8a9bb0">Email otomatis untuk admin SinyalKita.</p>
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

function createServerStatusEmail({
  name,
  serverName,
  issueText,
  note
}: ServerStatusNoticeEmail & { issueText: string }) {
  const logoUrl = getEmailLogoUrl();
  const logoMarkup = `<img src="${escapeHtml(logoUrl)}" width="56" height="56" alt="SinyalKita" style="display:block;width:56px;height:56px;border:0" />`;
  const safeName = escapeHtml(name);
  const safeServerName = escapeHtml(serverName);
  const safeIssueText = escapeHtml(issueText);
  const safeNote = escapeHtml(note?.trim() || "Tim admin sedang melakukan pengecekan agar layanan bisa kembali normal.");

  return {
    subject: `Info WiFi ${serverName} sedang ${issueText} - SinyalKita`,
    text: [
      `Mohon maaf ya ${name}, wifi pada server ${serverName} lagi ${issueText}.`,
      "",
      note?.trim() || "Tim admin sedang melakukan pengecekan agar layanan bisa kembali normal.",
      "",
      "Kami akan berusaha membuat koneksi kembali normal secepatnya."
    ].join("\n"),
    html: `
      <div style="margin:0;padding:0;background:#f4f7fa;font-family:Arial,Helvetica,sans-serif;color:#0b1628">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
          Mohon maaf ya ${safeName}, wifi pada server ${safeServerName} lagi ${safeIssueText}.
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f4f7fa">
          <tr>
            <td align="center" style="padding:32px 12px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;border-collapse:collapse">
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
                            <p style="margin:4px 0 0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#b85c66">Info layanan WiFi</p>
                          </td>
                        </tr>
                      </table>

                      <h1 style="margin:28px 0 0;font-size:27px;line-height:1.18;color:#0b1628">Mohon maaf ya ${safeName}</h1>
                      <p style="margin:14px 0 0;font-size:16px;line-height:1.7;color:#42526a">
                        WiFi pada server <strong style="color:#0b1628">${safeServerName}</strong> lagi <strong style="color:#b85c66">${safeIssueText}</strong>.
                      </p>

                      <div style="margin:24px 0 0;border:1px solid #f2c8cd;border-radius:18px;background:#fff1f3;padding:18px 20px">
                        <p style="margin:0;font-size:13px;line-height:1.7;color:#8b3f48">${safeNote}</p>
                      </div>

                      <p style="margin:22px 0 0;font-size:14px;line-height:1.7;color:#63758c">
                        Kami akan berusaha membuat koneksi kembali normal secepatnya. Terima kasih sudah sabar menunggu.
                      </p>
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

function createServerRestoredEmail({ name, serverName }: ServerRestoredNoticeEmail) {
  const logoUrl = getEmailLogoUrl();
  const logoMarkup = `<img src="${escapeHtml(logoUrl)}" width="56" height="56" alt="SinyalKita" style="display:block;width:56px;height:56px;border:0" />`;
  const safeName = escapeHtml(name);
  const safeServerName = escapeHtml(serverName);

  return {
    subject: `Yeayy WiFi Server ${serverName} sudah aktif kembali - SinyalKita`,
    text: [
      `Yeayy, WiFi Server ${serverName} sudah aktif kembali.`,
      "",
      `Halo ${name}, koneksi WiFi di server ${serverName} sudah kembali normal. Terima kasih sudah sabar menunggu.`,
      "",
      "Silakan coba gunakan internet seperti biasa."
    ].join("\n"),
    html: `
      <div style="margin:0;padding:0;background:#f4f7fa;font-family:Arial,Helvetica,sans-serif;color:#0b1628">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
          Yeayy, WiFi Server ${safeServerName} sudah aktif kembali.
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f4f7fa">
          <tr>
            <td align="center" style="padding:32px 12px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;border-collapse:collapse">
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
                            <p style="margin:4px 0 0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#2f9a6d">WiFi aktif kembali</p>
                          </td>
                        </tr>
                      </table>

                      <h1 style="margin:28px 0 0;font-size:27px;line-height:1.18;color:#0b1628">Yeayy, WiFi Server ${safeServerName} sudah aktif kembali</h1>
                      <p style="margin:14px 0 0;font-size:16px;line-height:1.7;color:#42526a">
                        Halo ${safeName}, koneksi WiFi di server <strong style="color:#0b1628">${safeServerName}</strong> sudah kembali normal.
                      </p>

                      <div style="margin:24px 0 0;border:1px solid #bfe8d7;border-radius:18px;background:#edf9f3;padding:18px 20px">
                        <p style="margin:0;font-size:13px;line-height:1.7;color:#2f6f52">Silakan coba gunakan internet seperti biasa. Terima kasih sudah sabar menunggu selama perbaikan.</p>
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

function createReportCheckingEmail({ name, message }: ReportCheckingEmail) {
  const logoUrl = getEmailLogoUrl();
  const logoMarkup = `<img src="${escapeHtml(logoUrl)}" width="56" height="56" alt="SinyalKita" style="display:block;width:56px;height:56px;border:0" />`;
  const safeName = escapeHtml(name);
  const safeMessage = escapeHtml(message);

  return {
    subject: "Report gangguan diterima - SinyalKita",
    text: [
      `Halo ${name},`,
      "",
      "Baik, mohon tunggu sebentar kami akan melakukan pengecekan.",
      "",
      `Report kamu: ${message}`,
      "",
      "Tim SinyalKita akan menindaklanjuti laporan ini secepatnya."
    ].join("\n"),
    html: `
      <div style="margin:0;padding:0;background:#f4f7fa;font-family:Arial,Helvetica,sans-serif;color:#0b1628">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
          Baik, mohon tunggu sebentar kami akan melakukan pengecekan.
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f4f7fa">
          <tr>
            <td align="center" style="padding:32px 12px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;border-collapse:collapse">
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
                            <p style="margin:4px 0 0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#b9822e">Report diproses</p>
                          </td>
                        </tr>
                      </table>

                      <h1 style="margin:28px 0 0;font-size:27px;line-height:1.18;color:#0b1628">Baik, mohon tunggu sebentar</h1>
                      <p style="margin:14px 0 0;font-size:16px;line-height:1.7;color:#42526a">
                        Halo ${safeName}, kami akan melakukan pengecekan untuk report gangguan yang kamu kirim.
                      </p>

                      <div style="margin:24px 0 0;border:1px solid #f2d7a7;border-radius:18px;background:#fff8ea;padding:18px 20px">
                        <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#b9822e">Report kamu</p>
                        <p style="margin:0;font-size:14px;line-height:1.7;color:#42526a">${safeMessage}</p>
                      </div>

                      <p style="margin:22px 0 0;font-size:14px;line-height:1.7;color:#63758c">
                        Tim SinyalKita akan menindaklanjuti laporan ini secepatnya. Terima kasih sudah memberi tahu kami.
                      </p>
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

function receiptRow(label: string, value: string) {
  return `
    <tr>
      <td style="width:34%;border-bottom:1px solid #d8e0e8;background:#f8fbfd;padding:12px 14px;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#63758c">${escapeHtml(label)}</td>
      <td style="border-bottom:1px solid #d8e0e8;padding:12px 14px;font-size:14px;font-weight:800;color:#0b1628">${value}</td>
    </tr>
  `;
}

function getEmailLogoUrl() {
  return normalizeUrl(readEnv("EMAIL_LOGO_URL")) || DEFAULT_EMAIL_LOGO_URL;
}

function getAdminEmail() {
  return readEnv("ADMIN_EMAIL") || readEnv("SINYALKITA_ADMIN_EMAIL") || DEFAULT_ADMIN_EMAIL;
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

function formatEmailCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

function formatEmailDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta"
  }).format(value);
}
