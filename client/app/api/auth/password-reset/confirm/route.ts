import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

const confirmResetSchema = z.object({
  identifier: z.string().trim().min(3).max(120),
  code: z.string().trim().regex(/^\d{6}$/),
  password: z.string().min(6).max(72)
});

export async function POST(req: Request) {
  try {
    const payload = confirmResetSchema.parse(await req.json());
    const identifier = payload.identifier.toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ loginId: identifier }, { email: { equals: identifier, mode: "insensitive" } }]
      },
      select: { id: true }
    });

    if (!user) {
      return invalidResetResponse();
    }

    const resetCode = await prisma.passwordResetCode.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!resetCode) {
      return invalidResetResponse();
    }

    const valid = await bcrypt.compare(payload.code, resetCode.codeHash);
    if (!valid) {
      return invalidResetResponse();
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const now = new Date();

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash }
      }),
      prisma.passwordResetCode.update({
        where: { id: resetCode.id },
        data: { usedAt: now }
      }),
      prisma.passwordResetCode.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
          id: { not: resetCode.id }
        },
        data: { usedAt: now }
      })
    ]);

    return NextResponse.json({ message: "Kata sandi berhasil direset. Silakan login kembali." });
  } catch (error) {
    return apiError(error);
  }
}

function invalidResetResponse() {
  return NextResponse.json({ message: "Kode reset belum sesuai atau sudah kedaluwarsa." }, { status: 400 });
}
