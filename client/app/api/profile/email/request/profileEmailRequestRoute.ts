import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  issueEmailVerificationCode,
  normalizeEmail
} from "@/lib/server/email-verification";
import { apiError, requireAuth } from "@/lib/server/auth";
import { MailConfigurationError, MailDeliveryError } from "@/lib/server/mail";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

const requestEmailChangeSchema = z.object({
  newEmail: z.string().trim().toLowerCase().email()
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.error) return auth.error;

    const payload = requestEmailChangeSchema.parse(await req.json());
    const newEmail = normalizeEmail(payload.newEmail);
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { id: true, name: true, email: true }
    });

    if (!user) {
      return NextResponse.json({ message: "Profil tidak ditemukan." }, { status: 404 });
    }

    if (!user.email) {
      return NextResponse.json(
        { message: "Akun ini belum memiliki email terhubung. Hubungi admin SinyalKita." },
        { status: 400 }
      );
    }

    if (normalizeEmail(user.email) === newEmail) {
      return NextResponse.json({ message: "Email baru masih sama dengan email saat ini." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } });
    if (existing && existing.id !== user.id) {
      return NextResponse.json({ message: "Email tersebut sudah digunakan akun lain." }, { status: 409 });
    }

    const result = await issueEmailVerificationCode({
      userId: user.id,
      targetEmail: newEmail,
      currentEmail: user.email,
      sendTo: user.email,
      name: user.name,
      purpose: "PROFILE_EMAIL_CHANGE",
      title: "Konfirmasi perubahan email",
      intro: `kami menerima permintaan untuk mengganti email akun Anda menjadi ${newEmail}.`,
      note: "Masukkan kode ini di halaman pengaturan profil untuk menyelesaikan perubahan email."
    });

    return NextResponse.json({
      message: "Kode verifikasi dikirim ke email yang sedang terhubung.",
      email: result.email,
      expiresInMinutes: result.expiresInMinutes
    });
  } catch (error) {
    if (error instanceof MailConfigurationError) {
      return NextResponse.json(
        { message: "Layanan email belum dikonfigurasi. Hubungi admin SinyalKita." },
        { status: 503 }
      );
    }

    if (error instanceof MailDeliveryError) {
      return NextResponse.json({ message: "Kode verifikasi belum dapat dikirim." }, { status: 503 });
    }

    return apiError(error);
  }
}
