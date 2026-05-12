import { Router } from "express";
import { createPayment, listPayments } from "../controllers/payment.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const paymentRoutes = Router();

paymentRoutes.get("/", requireAuth, requireRole("CUSTOMER"), listPayments);
paymentRoutes.post("/", requireAuth, requireRole("CUSTOMER"), createPayment);
