import { NextRequest, NextResponse } from "next/server";
import { apiError, requireAuth } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { readProfileImages } from "@/lib/server/profile-image";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, "ADMIN");
    if (auth.error) return auth.error;

    const users = await prisma.user.findMany({
      where: { role: "CUSTOMER" },
      select: { id: true, customerId: true }
    });
    const imagesByUserId = await readProfileImages(users.map((user) => user.id));
    const profileImages = Object.fromEntries(
      users.map((user) => [user.customerId, imagesByUserId.get(user.id) || null])
    );

    return NextResponse.json({ profileImages });
  } catch (error) {
    return apiError(error);
  }
}
