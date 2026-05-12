import { Router } from "express";
import { overview } from "../controllers/admin.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const adminRoutes = Router();

adminRoutes.get("/overview", requireAuth, requireRole("ADMIN"), overview);
