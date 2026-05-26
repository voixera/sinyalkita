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

    if (user.email && normalizeEmail(user.email) === newEmail) {
      return NextResponse.json({ message: "Email baru masih sama dengan email saat ini." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } });
    if (existing && existing.id !== user.id) {
      return NextResponse.json({ message: "Email tersebut sudah digunakan akun lain." }, { status: 409 });
    }

    const result = await issueEmailVerificationCode({
      userId: user.id,
      targetEmail: newEmail,
      currentEmail: user.email || undefined,
      sendTo: user.email || newEmail,
      name: user.name,
      purpose: "PROFILE_EMAIL_CHANGE",
      title: user.email ? "Konfirmasi perubahan email" : "Hubungkan email akun",
      intro: user.email
        ? `kami menerima permintaan untuk mengganti email akun Anda menjadi ${newEmail}.`
        : `kami menerima permintaan untuk menghubungkan email ini ke akun SinyalKita Anda.`,
      note: user.email
        ? "Masukkan kode ini di halaman pengaturan profil untuk menyelesaikan perubahan email."
        : "Masukkan kode ini di halaman pengaturan profil untuk menghubungkan email baru."
    });

    return NextResponse.json({
      message: user.email ? "Kode verifikasi dikirim ke email yang sedang terhubung." : "Kode verifikasi dikirim ke email baru.",
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
