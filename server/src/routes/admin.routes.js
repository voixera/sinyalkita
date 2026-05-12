import { Router } from "express";
import { createCustomer, listPackages, overview } from "../controllers/admin.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const adminRoutes = Router();

adminRoutes.get("/overview", requireAuth, requireRole("ADMIN"), overview);
adminRoutes.get("/packages", requireAuth, requireRole("ADMIN"), listPackages);
adminRoutes.post("/customers", requireAuth, requireRole("ADMIN"), createCustomer);
