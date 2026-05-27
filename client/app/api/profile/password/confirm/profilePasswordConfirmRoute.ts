import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireAuth } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const confirmPasswordSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/),
  password: z.string().min(6).max(72)
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.error) return auth.error;

    const payload = confirmPasswordSchema.parse(await req.json());
    const resetCodes = await prisma.passwordResetCode.findMany({
      where: {
        userId: auth.user.id,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" },
      take: 10
    });

    if (resetCodes.length === 0) {
      return invalidCodeResponse();
    }

    let matchedCodeId = "";
    for (const resetCode of resetCodes) {
      const valid = await bcrypt.compare(payload.code, resetCode.codeHash);
      if (valid) {
        matchedCodeId = resetCode.id;
        break;
      }
    }

    if (!matchedCodeId) {
      return invalidCodeResponse();
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const now = new Date();

    await prisma.$transaction([
      prisma.user.update({
        where: { id: auth.user.id },
        data: { passwordHash }
      }),
      prisma.passwordResetCode.update({
        where: { id: matchedCodeId },
        data: { usedAt: now }
      }),
      prisma.passwordResetCode.updateMany({
        where: {
          userId: auth.user.id,
          usedAt: null,
          id: { not: matchedCodeId }
        },
        data: { usedAt: now }
      })
    ]);

    return NextResponse.json({ message: "Password berhasil diperbarui." });
  } catch (error) {
    return apiError(error);
  }
}

function invalidCodeResponse() {
  return NextResponse.json({ message: "Kode verifikasi belum sesuai atau sudah kedaluwarsa." }, { status: 400 });
}
