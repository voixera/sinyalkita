import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { issueEmailVerificationCode, normalizeEmail } from "@/lib/server/email-verification";
import { apiError, requireAuth } from "@/lib/server/auth";
import { MailConfigurationError, MailDeliveryError } from "@/lib/server/mail";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

const customerEmailCodeSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(3).max(120).optional()
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, "ADMIN");
    if (auth.error) return auth.error;

    const payload = customerEmailCodeSchema.parse(await req.json());
    const email = normalizeEmail(payload.email);
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });

    if (existing) {
      return NextResponse.json({ message: "Email tersebut sudah digunakan akun lain." }, { status: 409 });
    }

    const result = await issueEmailVerificationCode({
      targetEmail: email,
      sendTo: email,
      name: payload.name || "User SinyalKita",
      purpose: "CUSTOMER_EMAIL_LINK",
      title: "Verifikasi email akun user",
      intro: "email ini akan dihubungkan ke akun SinyalKita baru.",
      note: "Berikan kode ini kepada admin yang sedang membuat akun Anda agar email bisa terhubung."
    });

    return NextResponse.json({
      message: "Kode verifikasi dikirim ke email user.",
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
