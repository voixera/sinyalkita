import bcrypt from "bcryptjs";
import { z } from "zod";
import { signToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export async function login(req, res, next) {
  try {
    const payload = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: payload.email } });
    if (!user) {
      return res.status(401).json({ message: "Email atau kata sandi belum sesuai." });
    }

    const valid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Email atau kata sandi belum sesuai." });
    }

    return res.json({
      token: signToken(user),
      user: {
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    return next(error);
  }
}
