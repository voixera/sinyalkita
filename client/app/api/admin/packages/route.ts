import { NextRequest, NextResponse } from "next/server";
import { apiError, requireAuth } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, "ADMIN");
    if (auth.error) return auth.error;

    const packages = await prisma.package.findMany({
      orderBy: { monthlyPrice: "asc" }
    });

    return NextResponse.json({ packages });
  } catch (error) {
    return apiError(error);
  }
}
