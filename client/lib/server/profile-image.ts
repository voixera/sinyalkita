import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/prisma";

type ProfileImageRow = {
  id?: string;
  profileImage: string | null;
};

export async function readProfileImage(userId: string) {
  try {
    const rows = await prisma.$queryRaw<ProfileImageRow[]>`
      SELECT "profileImage"
      FROM "User"
      WHERE "id" = ${userId}
      LIMIT 1
    `;

    return rows[0]?.profileImage || null;
  } catch (error) {
    if (!isMissingProfileImageStorage(error)) throw error;
    const ensured = await tryEnsureProfileImageColumn();
    if (!ensured) return null;
    return readProfileImage(userId);
  }
}

export async function readProfileImages(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string | null>();

  try {
    const rows = await prisma.$queryRaw<Array<Required<ProfileImageRow>>>`
      SELECT "id", "profileImage"
      FROM "User"
      WHERE "id" IN (${Prisma.join(userIds)})
    `;

    return new Map(rows.map((row) => [row.id, row.profileImage || null]));
  } catch (error) {
    if (!isMissingProfileImageStorage(error)) throw error;
    const ensured = await tryEnsureProfileImageColumn();
    if (!ensured) return new Map<string, string | null>();
    return readProfileImages(userIds);
  }
}

export async function updateProfileImage(userId: string, profileImage: string | null) {
  try {
    const rows = await prisma.$queryRaw<ProfileImageRow[]>`
      UPDATE "User"
      SET "profileImage" = ${profileImage}
      WHERE "id" = ${userId}
      RETURNING "profileImage"
    `;

    return rows[0]?.profileImage || null;
  } catch (error) {
    if (!isMissingProfileImageStorage(error)) throw error;
    await ensureProfileImageColumn();
    return updateProfileImage(userId, profileImage);
  }
}

async function ensureProfileImageColumn() {
  await prisma.$executeRaw`
    ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "profileImage" TEXT
  `;
}

async function tryEnsureProfileImageColumn() {
  try {
    await ensureProfileImageColumn();
    return true;
  } catch (error) {
    console.error("Profile image storage is not available", error);
    return false;
  }
}

function isMissingProfileImageStorage(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  return code === "P2010" || code === "P2022" || (message.includes("profileImage") && message.includes("column"));
}
