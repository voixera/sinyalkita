import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/server/auth";
import { MailConfigurationError, sendPasswordResetEmail } from "@/lib/server/mail";
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

    await prisma.$transaction([
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

    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      code,
      expiresInMinutes: RESET_CODE_EXPIRES_IN_MINUTES
    });

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

    return apiError(error);
  }
}

function createResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return email;
  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}${"*".repeat(Math.max(localPart.length - visible.length, 3))}@${domain}`;
}
