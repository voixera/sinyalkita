import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  normalizeEmail,
  validateEmailVerificationCode
} from "@/lib/server/email-verification";
import { apiError, requireAuth } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

const confirmEmailChangeSchema = z.object({
  newEmail: z.string().trim().toLowerCase().email(),
  code: z.string().trim().regex(/^\d{6}$/)
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.error) return auth.error;

    const payload = confirmEmailChangeSchema.parse(await req.json());
    const newEmail = normalizeEmail(payload.newEmail);
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { id: true, email: true }
    });

    if (!user) {
      return NextResponse.json({ message: "Profil tidak ditemukan." }, { status: 404 });
    }

    if (!user.email) {
      return NextResponse.json({ message: "Email lama belum tersedia untuk diverifikasi." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } });
    if (existing && existing.id !== user.id) {
      return NextResponse.json({ message: "Email tersebut sudah digunakan akun lain." }, { status: 409 });
    }

    const verification = await validateEmailVerificationCode({
      userId: user.id,
      targetEmail: newEmail,
      currentEmail: user.email,
      purpose: "PROFILE_EMAIL_CHANGE",
      code: payload.code
    });

    if (!verification) {
      return NextResponse.json({ message: "Kode verifikasi belum sesuai atau sudah kedaluwarsa." }, { status: 400 });
    }

    const profile = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: user.id },
        data: { email: newEmail },
        select: {
          id: true,
          customerId: true,
          loginId: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          serverName: true,
          role: true,
          profileImage: true
        }
      });

      await tx.emailVerificationCode.update({
        where: { id: verification.id },
        data: { usedAt: new Date() }
      });

      await tx.emailVerificationCode.updateMany({
        where: {
          userId: user.id,
          purpose: "PROFILE_EMAIL_CHANGE",
          usedAt: null,
          id: { not: verification.id }
        },
        data: { usedAt: new Date() }
      });

      return updated;
    });

    return NextResponse.json({ message: "Email profil berhasil diperbarui.", profile });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ message: "Email tersebut sudah digunakan akun lain." }, { status: 409 });
    }

    return apiError(error);
  }
}
