export type Role = "CUSTOMER" | "ADMIN";
export type ServiceStatus = "ACTIVE" | "MAINTENANCE" | "SUSPENDED";
export type BillingStatus = "UNPAID" | "PAID" | "OVERDUE";

export type User = {
  id: string;
  customerId: string;
  loginId: string;
  name: string;
  email: string | null;
  phone: string;
  address: string;
  role: Role;
};

export type Package = {
  name: string;
  speedMbps: number;
  monthlyPrice: number;
};

export type Subscription = {
  id: string;
  status: ServiceStatus;
  startedAt: string;
  package: Package;
};

export type Billing = {
  id: string;
  invoiceNo: string;
  period: string;
  amount: number;
  dueDate: string;
  status: BillingStatus;
};

export type Payment = {
  id: string;
  method: string;
  amount: number;
  paidAt: string;
  reference: string;
  billing: Pick<Billing, "invoiceNo" | "period">;
};

export type MeResponse = {
  user: User;
  subscription: Subscription;
  currentBilling: Billing;
  payments: Payment[];
};
