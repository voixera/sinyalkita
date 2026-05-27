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

type PasswordCodeRecord = {
  id: string;
  codeHash: string;
};

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.error) return auth.error;

    const payload = confirmPasswordSchema.parse(await req.json());
    const resetCodes = await findActivePasswordCodes(auth.user.id);

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

    await updatePassword(auth.user.id, passwordHash);

    await cleanupPasswordCodes(auth.user.id);

    return NextResponse.json({ message: "Password berhasil diperbarui." });
  } catch (error) {
    return apiError(error);
  }
}

function invalidCodeResponse() {
  return NextResponse.json({ message: "Kode verifikasi belum sesuai atau sudah kedaluwarsa." }, { status: 400 });
}

async function findActivePasswordCodes(userId: string): Promise<PasswordCodeRecord[]> {
  try {
    return await prisma.$queryRaw<PasswordCodeRecord[]>`
      SELECT "id", "codeHash"
      FROM "PasswordResetCode"
      WHERE "userId" = ${userId}
        AND "usedAt" IS NULL
        AND "expiresAt" > NOW()
      ORDER BY "createdAt" DESC
      LIMIT 10
    `;
  } catch (error) {
    if (!isPasswordCodeSchemaMismatch(error)) throw error;
  }

  try {
    return await prisma.$queryRaw<PasswordCodeRecord[]>`
      SELECT "id", "codeHash"
      FROM "PasswordResetCode"
      WHERE "userId" = ${userId}
        AND "expiresAt" > NOW()
      ORDER BY "expiresAt" DESC
      LIMIT 10
    `;
  } catch (error) {
    if (!isPasswordCodeSchemaMismatch(error)) throw error;
  }

  return prisma.$queryRaw<PasswordCodeRecord[]>`
    SELECT "id", "codeHash"
    FROM "PasswordResetCode"
    WHERE "userId" = ${userId}
    LIMIT 10
  `;
}

async function updatePassword(userId: string, passwordHash: string) {
  try {
    const changed = await prisma.$executeRaw`
      UPDATE "User"
      SET "passwordHash" = ${passwordHash}
      WHERE "id" = ${userId}
    `;

    if (changed === 0) {
      throw new Error("Profile password user row was not updated.");
    }
  } catch (error) {
    if (!isPasswordUpdateSchemaMismatch(error)) {
      console.error("Profile password update failed", error);
      throw error;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });
  }
}

async function cleanupPasswordCodes(userId: string) {
  try {
    await prisma.$executeRaw`
      DELETE FROM "PasswordResetCode"
      WHERE "userId" = ${userId}
    `;
  } catch (error) {
    console.error("Profile password code cleanup failed", error);
  }
}

function isPasswordCodeSchemaMismatch(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  return (
    code === "P2010" ||
    code === "P2022" ||
    (message.includes("PasswordResetCode") &&
      (message.includes("usedAt") || message.includes("createdAt") || message.includes("expiresAt")))
  );
}

function isPasswordUpdateSchemaMismatch(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  return code === "P2010" || code === "P2022" || (message.includes("User") && message.includes("passwordHash"));
}
