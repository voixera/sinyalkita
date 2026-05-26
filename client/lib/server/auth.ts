import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export function signToken(user: { id: string; role: string; name: string }) {
  return jwt.sign({ sub: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
}

export async function requireAuth(req: NextRequest, role?: "CUSTOMER" | "ADMIN") {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return { error: NextResponse.json({ message: "Token akses diperlukan." }, { status: 401 }) };
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, loginId: true, customerId: true, role: true, profileImage: true }
    });

    if (!user) {
      return { error: NextResponse.json({ message: "Sesi tidak valid." }, { status: 401 }) };
    }

    if (role && user.role !== role) {
      return { error: NextResponse.json({ message: "Akses tidak tersedia untuk akun ini." }, { status: 403 }) };
    }

    return { user };
  } catch {
    return { error: NextResponse.json({ message: "Sesi sudah berakhir. Silakan login kembali." }, { status: 401 }) };
  }
}

export function apiError(error: unknown) {
  if (typeof error === "object" && error && "name" in error && error.name === "ZodError") {
    return NextResponse.json({ message: "Data yang dikirim belum lengkap." }, { status: 422 });
  }

  console.error(error);
  return NextResponse.json({ message: "Terjadi gangguan pada layanan. Coba lagi beberapa saat." }, { status: 500 });
}
