import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireAuth } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

const updateServerSchema = z.object({
  name: z.enum(["Server Jombok", "Server Kepung", "Server Pare"]),
  status: z.enum(["ACTIVE", "TROUBLE", "DOWN"]),
  note: z.string().max(180).optional().or(z.literal(""))
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, "ADMIN");
    if (auth.error) return auth.error;

    await ensureServers();
    const servers = await prisma.serviceServer.findMany({
      orderBy: { name: "asc" }
    });

    return NextResponse.json({ servers: sortServers(servers) });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req, "ADMIN");
    if (auth.error) return auth.error;

    const payload = updateServerSchema.parse(await req.json());
    const server = await prisma.serviceServer.upsert({
      where: { name: payload.name },
      update: {
        status: payload.status,
        note: payload.note || null
      },
      create: {
        name: payload.name,
        status: payload.status,
        note: payload.note || null
      }
    });

    return NextResponse.json({ server });
  } catch (error) {
    return apiError(error);
  }
}

async function ensureServers() {
  await Promise.all(
    ["Server Jombok", "Server Kepung", "Server Pare"].map((name) =>
      prisma.serviceServer.upsert({
        where: { name },
        update: {},
        create: { name, status: "ACTIVE" }
      })
    )
  );
}

function sortServers<T extends { name: string }>(servers: T[]) {
  const order = ["Server Jombok", "Server Kepung", "Server Pare"];
  return [...servers].sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
}
