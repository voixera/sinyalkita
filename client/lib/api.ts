import type { Billing, MeResponse, Package, Payment, Role, ServerStatus, ServiceServer, TroubleReport } from "@/lib/types";

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
    const message = typeof data.message === "string" && data.message.trim() ? data.message : "Permintaan belum dapat diproses.";
    throw new ApiError(message, response.status);
  }
  return data as T;
}

export const api = {
  login: (loginId: string, password: string) =>
    request<{ token: string; user: { name: string; loginId: string; role: Role } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ loginId, password })
    }),
  requestPasswordReset: (identifier: string) =>
    request<{ message: string; email?: string; expiresInMinutes: number }>("/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ identifier })
    }),
  confirmPasswordReset: (payload: { identifier: string; code: string; password: string }) =>
    request<{ message: string }>("/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  me: () => request<MeResponse>("/customers/me"),
  billings: () => request<{ billings: Billing[] }>("/billings"),
  payments: () => request<{ payments: Payment[] }>("/payments"),
  pay: (billingIds: string[], method: string, proof: { image: string; name: string }) =>
    request<{ payments: Payment[]; billings: Billing[] }>("/payments", {
      method: "POST",
      body: JSON.stringify({ billingIds, method, proofImage: proof.image, proofName: proof.name })
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
      summary: {
        totalCustomers: number;
        activeCustomers: number;
        unpaidBillings: number;
        pendingPayments: number;
        openReports: number;
      };
      operational: {
        rangeLabel: string;
        methods: string[];
        points: Array<{
          date: string;
          label: string;
          revenue: number;
          pending: number;
          reports: number;
          paymentsByMethod: Record<string, number>;
        }>;
      };
    }>("/admin/overview"),
  adminPendingPayments: () =>
    request<{
      payments: Array<Payment & { user: { customerId: string; name: string; loginId: string } }>;
    }>("/admin/payments"),
  adminGeneratedAccounts: () =>
    request<{
      accounts: Array<{
        id: string;
        customerId: string;
        customerName: string;
        loginId: string;
        passwordPlain: string;
        createdAt: string;
      }>;
    }>("/admin/history"),
  adminReports: () =>
    request<{
      reports: Array<TroubleReport & { user: { customerId: string; name: string; loginId: string; phone: string } }>;
    }>("/admin/reports"),
  resolveReport: (reportId: string) =>
    request<{ report: TroubleReport }>(`/admin/reports/${reportId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "RESOLVED" })
    }),
  createReport: (message: string) =>
    request<{ report: TroubleReport }>("/reports", {
      method: "POST",
      body: JSON.stringify({ message })
    }),
  verifyPayment: (paymentId: string, action: "approve" | "reject") =>
    request<{ payment: Payment }>(`/admin/payments/${paymentId}`, {
      method: "PATCH",
      body: JSON.stringify({ action })
    }),
  adminPackages: () => request<{ packages: Array<Package & { id: string; description: string }> }>("/admin/packages"),
  adminServers: () => request<{ servers: ServiceServer[] }>("/admin/servers"),
  updateServer: (payload: { name: string; status: ServerStatus; note?: string }) =>
    request<{ server: ServiceServer }>("/admin/servers", {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  createCustomer: (payload: {
    name: string;
    password: string;
    phone: string;
    address: string;
    serverName: string;
    packageId: string;
    email: string;
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
