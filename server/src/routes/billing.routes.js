import { Router } from "express";
import { listBillings } from "../controllers/billing.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const billingRoutes = Router();

billingRoutes.get("/", requireAuth, requireRole("CUSTOMER"), listBillings);
