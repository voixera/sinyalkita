import bcrypt from "bcryptjs";
import { z } from "zod";
import { signToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";

const loginSchema = z.object({
  loginId: z.string().trim().toLowerCase().min(3),
  password: z.string().min(6)
});

export async function login(req, res, next) {
  try {
    const payload = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { loginId: payload.loginId } });
    if (!user) {
      return res.status(401).json({ message: "ID login atau kata sandi belum sesuai." });
    }

    const valid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "ID login atau kata sandi belum sesuai." });
    }

    return res.json({
      token: signToken(user),
      user: {
        name: user.name,
        loginId: user.loginId,
        role: user.role
      }
    });
  } catch (error) {
    return next(error);
  }
}
