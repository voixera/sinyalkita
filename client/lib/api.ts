import type { Billing, MeResponse, Payment, Role } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("sinyalkita_token") : null;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.message || "Permintaan belum dapat diproses.", response.status);
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: { name: string; role: Role } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),
  me: () => request<MeResponse>("/customers/me"),
  billings: () => request<{ billings: Billing[] }>("/billings"),
  payments: () => request<{ payments: Payment[] }>("/payments"),
  pay: (billingId: string, method: string) =>
    request<{ payment: Payment; billing: Billing }>("/payments", {
      method: "POST",
      body: JSON.stringify({ billingId, method })
    }),
  adminOverview: () =>
    request<{
      customers: Array<{
        customerId: string;
        name: string;
        packageName: string;
        serviceStatus: string;
        billingStatus: string;
        amount: number;
      }>;
    }>("/admin/overview")
};
