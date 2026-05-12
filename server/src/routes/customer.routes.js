import { Router } from "express";
import { me } from "../controllers/customer.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const customerRoutes = Router();

customerRoutes.get("/me", requireAuth, requireRole("CUSTOMER"), me);
