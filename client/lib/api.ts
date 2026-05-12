import type { Billing, MeResponse, Package, Payment, Role } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

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
  login: (loginId: string, password: string) =>
    request<{ token: string; user: { name: string; loginId: string; role: Role } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ loginId, password })
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
        loginId: string;
        name: string;
        packageName: string;
        serviceStatus: string;
        billingStatus: string;
        amount: number;
      }>;
    }>("/admin/overview"),
  adminPackages: () => request<{ packages: Array<Package & { id: string; description: string }> }>("/admin/packages"),
  createCustomer: (payload: {
    name: string;
    password: string;
    phone: string;
    address: string;
    packageId: string;
    email?: string;
    monthlyAmount?: number;
  }) =>
    request<{
      customer: {
        customerId: string;
        loginId: string;
        name: string;
        packageName: string;
        serviceStatus: string;
        billingStatus: string;
        amount: number;
      };
      credentials: { loginId: string; password: string };
    }>("/admin/customers", {
      method: "POST",
      body: JSON.stringify(payload)
    })
};
