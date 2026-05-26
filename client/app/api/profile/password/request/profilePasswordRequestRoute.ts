import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { apiError, requireAuth } from "@/lib/server/auth";
import { MailConfigurationError, MailDeliveryError, sendPasswordResetEmail } from "@/lib/server/mail";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PASSWORD_CODE_EXPIRES_IN_MINUTES = 15;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.error) return auth.error;

    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { id: true, name: true, email: true }
    });

    if (!user) {
      return NextResponse.json({ message: "Profil tidak ditemukan." }, { status: 404 });
    }

    if (!user.email) {
      return NextResponse.json(
        { message: "Akun ini belum memiliki email terhubung. Hubungkan email dulu sebelum mengganti password." },
        { status: 400 }
      );
    }

    const code = createVerificationCode();
    const codeHash = await bcrypt.hash(code, 10);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + PASSWORD_CODE_EXPIRES_IN_MINUTES * 60 * 1000);

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
        expiresInMinutes: PASSWORD_CODE_EXPIRES_IN_MINUTES
      });
    } catch (error) {
      await prisma.passwordResetCode
        .update({ where: { id: createdResetCode.id }, data: { usedAt: new Date() } })
        .catch(() => undefined);
      throw error;
    }

    return NextResponse.json({
      message: "Kode verifikasi password dikirim ke email terhubung.",
      email: maskEmail(user.email),
      expiresInMinutes: PASSWORD_CODE_EXPIRES_IN_MINUTES
    });
  } catch (error) {
    if (error instanceof MailConfigurationError) {
      return NextResponse.json(
        { message: "Layanan email belum dikonfigurasi. Hubungi admin SinyalKita." },
        { status: 503 }
      );
    }

    if (error instanceof MailDeliveryError) {
      return NextResponse.json({ message: "Kode verifikasi password belum dapat dikirim." }, { status: 503 });
    }

    return apiError(error);
  }
}

function createVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return email;
  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}${"*".repeat(Math.max(localPart.length - visible.length, 3))}@${domain}`;
}
