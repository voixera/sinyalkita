import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireAuth } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

const profileSchema = z.object({
  profileImage: z.string().max(2_500_000).nullable().optional()
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.error) return auth.error;

    const profile = await prisma.user.findUnique({
      where: { id: auth.user.id },
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

    if (!profile) {
      return NextResponse.json({ message: "Profil tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.error) return auth.error;

    const payload = profileSchema.parse(await req.json());

    if (!("profileImage" in payload)) {
      return NextResponse.json({ message: "Tidak ada data profil yang diubah." }, { status: 400 });
    }

    const profile = await prisma.user.update({
      where: { id: auth.user.id },
      data: { profileImage: payload.profileImage || null },
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

    return NextResponse.json({ profile });
  } catch (error) {
    return apiError(error);
  }
}
