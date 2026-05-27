export type Role = "CUSTOMER" | "ADMIN";
export type ServiceStatus = "ACTIVE" | "MAINTENANCE" | "SUSPENDED";
export type BillingStatus = "UNPAID" | "PAID" | "OVERDUE";
export type PaymentStatus = "SUCCESS" | "PENDING" | "FAILED";
export type ReportStatus = "OPEN" | "ACCEPTED" | "RESOLVED";
export type ServerStatus = "ACTIVE" | "TROUBLE" | "DOWN";

export type User = {
  id: string;
  customerId: string;
  loginId: string;
  name: string;
  email: string | null;
  profileImage: string | null;
  phone: string;
  address: string;
  serverName: string;
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
  status: PaymentStatus;
  paidAt: string;
  reference: string;
  proofImage: string | null;
  proofName: string | null;
  billing: Pick<Billing, "invoiceNo" | "period">;
};

export type TroubleReport = {
  id: string;
  message: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
};

export type ServiceServer = {
  id: string;
  name: string;
  status: ServerStatus;
  note: string | null;
  updatedAt: string;
};

export type MeResponse = {
  user: User;
  server: ServiceServer | null;
  subscription: Subscription;
  currentBilling: Billing;
  payments: Payment[];
  reports: TroubleReport[];
};
