import { prisma } from "../lib/prisma.js";
import { verifyToken } from "../lib/jwt.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: "Token akses diperlukan." });
    }

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, loginId: true, customerId: true, role: true }
    });

    if (!user) {
      return res.status(401).json({ message: "Sesi tidak valid." });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: "Sesi sudah berakhir. Silakan login kembali." });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ message: "Akses tidak tersedia untuk akun ini." });
    }
    return next();
  };
}
