import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/server/auth";
import { MailConfigurationError, MailDeliveryError, sendPasswordResetEmail } from "@/lib/server/mail";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RESET_CODE_EXPIRES_IN_MINUTES = 15;

const requestResetSchema = z.object({
  identifier: z.string().trim().min(3).max(120)
});

export async function POST(req: Request) {
  try {
    const payload = requestResetSchema.parse(await req.json());
    const identifier = payload.identifier.toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ loginId: identifier }, { email: { equals: identifier, mode: "insensitive" } }]
      },
      select: { id: true, name: true, email: true }
    });

    if (!user) {
      return NextResponse.json({
        message: "Jika akun ditemukan, kode reset akan dikirim ke email terdaftar.",
        expiresInMinutes: RESET_CODE_EXPIRES_IN_MINUTES
      });
    }

    if (!user.email) {
      return NextResponse.json(
        { message: "Akun ini belum memiliki email terdaftar. Hubungi admin SinyalKita." },
        { status: 400 }
      );
    }

    const code = createResetCode();
    const codeHash = await bcrypt.hash(code, 10);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + RESET_CODE_EXPIRES_IN_MINUTES * 60 * 1000);

    const [, createdResetCode] = await prisma.$transaction([
      prisma.passwordResetCode.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: now }
      }),
      prisma.passwordResetCode.create({
        data: {
          userId: user.id,
          codeHash,
          expiresAt
        }
      })
    ]);

    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        code,
        expiresInMinutes: RESET_CODE_EXPIRES_IN_MINUTES
      });
    } catch (error) {
      await prisma.passwordResetCode
        .update({ where: { id: createdResetCode.id }, data: { usedAt: new Date() } })
        .catch(() => undefined);
      throw error;
    }

    return NextResponse.json({
      message: "Kode reset dikirim ke email terdaftar.",
      email: maskEmail(user.email),
      expiresInMinutes: RESET_CODE_EXPIRES_IN_MINUTES
    });
  } catch (error) {
    if (error instanceof MailConfigurationError) {
      return NextResponse.json(
        { message: "Layanan email belum dikonfigurasi. Hubungi admin SinyalKita." },
        { status: 503 }
      );
    }

    if (error instanceof MailDeliveryError) {
      console.error("Password reset email delivery failed", {
        code: error.code,
        command: error.command,
        responseCode: error.responseCode,
        providerMessage: error.providerMessage
      });

      const message = getMailErrorMessage(error);

      return NextResponse.json({ message }, { status: 503 });
    }

    return apiError(error);
  }
}

function createResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getMailErrorMessage(error: MailDeliveryError) {
  const code = error.code?.toLowerCase() || "";
  const providerMessage = error.providerMessage?.toLowerCase() || "";

  if (error.code === "EAUTH" || error.responseCode === 535) {
    return "SMTP Brevo belum valid. Periksa SMTP_USER, SMTP_PASS, lalu redeploy Vercel.";
  }

  if (error.responseCode === 401 || error.responseCode === 403 || code.includes("unauthorized") || code.includes("permission")) {
    return "BREVO_API_KEY belum valid atau belum punya akses transactional email. Periksa API key v3 Brevo lalu redeploy Vercel.";
  }

  if (providerMessage.includes("sender") || providerMessage.includes("from") || providerMessage.includes("domain")) {
    return "Email pengirim belum valid di Brevo. Periksa SMTP_FROM dan pastikan sender/domain sudah verified.";
  }

  if (error.responseCode === 400 || code.includes("invalid")) {
    return "Data email belum valid. Periksa SMTP_FROM dan email akun user.";
  }

  return "Brevo belum dapat mengirim kode reset. Periksa API key, sender/domain, dan log Vercel.";
}

function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return email;
  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}${"*".repeat(Math.max(localPart.length - visible.length, 3))}@${domain}`;
}
