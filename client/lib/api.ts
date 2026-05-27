import type { Billing, MeResponse, Package, Payment, Role, ServerStatus, ServiceServer, TroubleReport, User } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
const API_CACHE_PREFIX = "sinyalkita_api_cache:v2:";
const DEFAULT_GET_CACHE_TTL_MS = 45_000;

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inflightRequests = new Map<string, Promise<unknown>>();

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("sinyalkita_token") : null;
  const method = String(options.method || "GET").toUpperCase();
  const cacheable = method === "GET";
  const cacheKey = cacheable ? createCacheKey(path, token) : "";

  if (cacheable) {
    const cached = readApiCache<T>(cacheKey);
    if (cached) return cached;

    const inflight = inflightRequests.get(cacheKey) as Promise<T> | undefined;
    if (inflight) return inflight;
  }

  const requestPromise = fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  })
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = typeof data.message === "string" && data.message.trim() ? data.message : "Permintaan belum dapat diproses.";
        throw new ApiError(message, response.status);
      }

      if (cacheable) {
        writeApiCache(cacheKey, data);
      } else {
        clearApiCache();
      }

      return data as T;
    })
    .finally(() => {
      if (cacheable) inflightRequests.delete(cacheKey);
    });

  if (cacheable) inflightRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

export function clearApiCache() {
  memoryCache.clear();
  inflightRequests.clear();

  if (typeof window === "undefined") return;

  try {
    for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(API_CACHE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Cache is only a speed-up; private browsing/storage errors should not block the app.
  }
}

function createCacheKey(path: string, token: string | null) {
  const tokenPart = token ? `${token.slice(0, 16)}:${token.slice(-10)}` : "guest";
  return `${API_CACHE_PREFIX}${tokenPart}:GET:${path}`;
}

function readApiCache<T>(cacheKey: string) {
  const now = Date.now();
  const memoryEntry = memoryCache.get(cacheKey) as CacheEntry<T> | undefined;
  if (memoryEntry && memoryEntry.expiresAt > now) return memoryEntry.data;

  if (typeof window === "undefined") return null;

  try {
    const stored = sessionStorage.getItem(cacheKey);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as CacheEntry<T>;
    if (!parsed || parsed.expiresAt <= now) {
      sessionStorage.removeItem(cacheKey);
      memoryCache.delete(cacheKey);
      return null;
    }
    memoryCache.set(cacheKey, parsed);
    return parsed.data;
  } catch {
    try {
      sessionStorage.removeItem(cacheKey);
    } catch {
      // Ignore storage cleanup failures.
    }
    memoryCache.delete(cacheKey);
    return null;
  }
}

function writeApiCache<T>(cacheKey: string, data: T) {
  const entry: CacheEntry<T> = {
    data,
    expiresAt: Date.now() + DEFAULT_GET_CACHE_TTL_MS
  };
  memoryCache.set(cacheKey, entry);

  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch {
    // Large responses, like uploaded proof images, can exceed sessionStorage. Memory cache is enough then.
  }
}

export const api = {
  clearCache: clearApiCache,
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
  profile: () => request<{ profile: User }>("/profile"),
  updateProfile: (payload: { profileImage: string | null }) =>
    request<{ profile: User }>("/profile", {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  requestProfileEmailChange: (newEmail: string) =>
    request<{ message: string; email: string; expiresInMinutes: number }>("/profile/email/request", {
      method: "POST",
      body: JSON.stringify({ newEmail })
    }),
  confirmProfileEmailChange: (payload: { newEmail: string; code: string }) =>
    request<{ message: string; profile: User }>("/profile/email/confirm", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  requestProfilePasswordCode: () =>
    request<{ message: string; email: string; expiresInMinutes: number }>("/profile/password/request", {
      method: "POST"
    }),
  confirmProfilePasswordChange: (payload: { code: string; password: string }) =>
    request<{ message: string }>("/profile/password/confirm", {
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
        profileImage: string | null;
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
  adminSummary: () =>
    request<{
      summary: {
        pendingPayments: number;
        openReports: number;
      };
    }>("/admin/summary"),
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
    emailVerificationCode: string;
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
    }),
  requestCustomerEmailCode: (payload: { email: string; name?: string }) =>
    request<{ message: string; email: string; expiresInMinutes: number }>("/admin/customers/email-code", {
      method: "POST",
      body: JSON.stringify(payload)
    })
};
