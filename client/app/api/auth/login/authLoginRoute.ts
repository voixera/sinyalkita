import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, signToken } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  loginId: z.string().trim().toLowerCase().min(3),
  password: z.string().min(6)
});

export async function POST(req: Request) {
  try {
    const payload = loginSchema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { loginId: payload.loginId },
      select: {
        id: true,
        name: true,
        loginId: true,
        passwordHash: true,
        role: true
      }
    });

    if (!user) {
      return NextResponse.json({ message: "ID login atau kata sandi belum sesuai." }, { status: 401 });
    }

    const valid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ message: "ID login atau kata sandi belum sesuai." }, { status: 401 });
    }

    return NextResponse.json({
      token: signToken(user),
      user: {
        name: user.name,
        loginId: user.loginId,
        role: user.role
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
