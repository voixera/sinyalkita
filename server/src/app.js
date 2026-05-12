import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import { adminRoutes } from "./routes/admin.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
import { billingRoutes } from "./routes/billing.routes.js";
import { customerRoutes } from "./routes/customer.routes.js";
import { paymentRoutes } from "./routes/payment.routes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "sinyalkita-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/billings", billingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);

app.use((error, _req, res, _next) => {
  if (error?.name === "ZodError") {
    return res.status(422).json({ message: "Data yang dikirim belum lengkap.", issues: error.errors });
  }

  console.error(error);
  return res.status(500).json({ message: "Terjadi gangguan pada layanan. Coba lagi beberapa saat." });
});

app.listen(port, () => {
  console.log(`SinyalKita API running on http://localhost:${port}`);
});
