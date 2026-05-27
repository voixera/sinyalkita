import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireAuth } from "@/lib/server/auth";
import { sendServerRestoredNotificationEmail, sendServerStatusNotificationEmail } from "@/lib/server/mail";
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
    const previousServer = await prisma.serviceServer.findUnique({
      where: { name: payload.name },
      select: { status: true }
    });
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

    const notifiedStatus = payload.status === "ACTIVE" ? null : payload.status;
    if (notifiedStatus && previousServer?.status !== payload.status) {
      try {
        const users = await prisma.user.findMany({
          where: {
            role: "CUSTOMER",
            serverName: payload.name,
            email: { not: null }
          },
          select: { name: true, email: true }
        });

        const results = await Promise.allSettled(
          users.map((user) =>
            sendServerStatusNotificationEmail({
              to: user.email || "",
              name: user.name,
              serverName: payload.name,
              status: notifiedStatus,
              note: payload.note || null
            })
          )
        );

        results.forEach((result) => {
          if (result.status === "rejected") {
            console.error("Server status user notification email failed", result.reason);
          }
        });
      } catch (error) {
        console.error("Server status notification batch failed", error);
      }
    }

    if (payload.status === "ACTIVE" && previousServer?.status && previousServer.status !== "ACTIVE") {
      try {
        const users = await prisma.user.findMany({
          where: {
            role: "CUSTOMER",
            serverName: payload.name,
            email: { not: null }
          },
          select: { name: true, email: true }
        });

        const results = await Promise.allSettled(
          users.map((user) =>
            sendServerRestoredNotificationEmail({
              to: user.email || "",
              name: user.name,
              serverName: payload.name
            })
          )
        );

        results.forEach((result) => {
          if (result.status === "rejected") {
            console.error("Server restored user notification email failed", result.reason);
          }
        });
      } catch (error) {
        console.error("Server restored notification batch failed", error);
      }
    }

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
