"use client";

import { Activity, AlertTriangle, BarChart3, ChevronDown, Server, UsersRound, WalletCards } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { ErrorState, SkeletonBlock, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { ServiceServer } from "@/lib/types";

type Row = {
  customerId: string;
  loginId: string;
  name: string;
  packageName: string;
  serviceStatus: string;
  billingStatus: string;
  amount: number;
};

type Summary = {
  totalCustomers: number;
  activeCustomers: number;
  unpaidBillings: number;
  pendingPayments: number;
  openReports: number;
};

type OperationalPoint = {
  date: string;
  label: string;
  revenue: number;
  pending: number;
  reports: number;
  paymentsByMethod: Record<string, number>;
};

type Operational = {
  rangeLabel: string;
  methods: string[];
  points: OperationalPoint[];
};

export default function AdminPage() {
  const [customers, setCustomers] = useState<Row[] | null>(null);
  const [servers, setServers] = useState<ServiceServer[] | null>(null);
  const [operational, setOperational] = useState<Operational | null>(null);
  const [walletFilter, setWalletFilter] = useState("ALL");
  const [summary, setSummary] = useState<Summary>({
    totalCustomers: 0,
    activeCustomers: 0,
    unpaidBillings: 0,
    pendingPayments: 0,
    openReports: 0
  });
  const [error, setError] = useState("");
  const { ready, user } = useAuth();

  const loadOperationalData = useCallback(async () => {
    try {
      const [overview, serverData] = await Promise.all([api.adminOverview(), api.adminServers()]);
      setCustomers(overview.customers);
      setOperational(overview.operational);
      setServers(serverData.servers);
      setSummary(overview.summary);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data admin belum dapat dimuat.");
    }
  }, []);

  useEffect(() => {
    if (!ready || user?.role !== "ADMIN") return;
    loadOperationalData();
  }, [loadOperationalData, ready, user?.role]);

  const serverIssues = (servers || []).filter((server) => server.status !== "ACTIVE").length;
  const chartPoints = useMemo(() => {
    return (operational?.points || []).map((point) => ({
      ...point,
      visibleRevenue: walletFilter === "ALL" ? point.revenue : point.paymentsByMethod[walletFilter] || 0
    }));
  }, [operational?.points, walletFilter]);

  return (
    <AppShell admin>
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold text-ink-soft">Panel internal</p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-ink">Operasional</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Metric icon={UsersRound} label="User aktif" value={String(summary.activeCustomers)} />
          <Metric icon={WalletCards} label="Perlu dicek" value={String(summary.pendingPayments)} />
          <Metric icon={AlertTriangle} label="Report gangguan" value={String(summary.openReports)} />
          <Metric icon={Server} label="Server bermasalah" value={String(serverIssues)} />
          <Metric icon={Activity} label="Tagihan menunggu" value={String(summary.unpaidBillings)} />
        </div>
      </div>

      {error ? (
        <ErrorState title="Panel admin belum dapat dimuat" message={error} />
      ) : !customers || !servers || !operational ? (
        <SkeletonBlock className="h-96" />
      ) : (
        <div className="grid gap-5">
          <section>
            <OperationalChart
              methods={operational.methods}
              points={chartPoints}
              rangeLabel={operational.rangeLabel}
              walletFilter={walletFilter}
              onWalletFilterChange={setWalletFilter}
            />
          </section>

          <section className="overflow-hidden rounded-xl border border-line bg-white shadow-soft">
            <div className="hidden grid-cols-[1.1fr_0.9fr_1fr_auto_auto] gap-4 border-b border-line bg-mist/70 px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-ink-soft md:grid">
              <span>User</span>
              <span>Login</span>
              <span>Paket</span>
              <span>Status</span>
              <span className="text-right">Nominal</span>
            </div>
            <div className="grid gap-3 p-3 md:block md:divide-y md:divide-line/80 md:p-0">
              {customers.map((row) => (
                <div
                  key={row.customerId}
                  className="rounded-xl border border-line bg-white p-4 shadow-soft md:grid md:grid-cols-[1.1fr_0.9fr_1fr_auto_auto] md:items-center md:gap-4 md:rounded-none md:border-0 md:px-5 md:py-4 md:shadow-none md:hover:bg-mist/55"
                >
                  <div>
                    <p className="font-bold text-ink">{row.name}</p>
                    <p className="mono mt-1 text-xs font-bold text-ink-soft">{row.customerId}</p>
                  </div>
                  <p className="mono text-xs font-bold text-ink-soft">{row.loginId}</p>
                  <p className="font-semibold text-ink-soft">{row.packageName}</p>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={row.serviceStatus} />
                    <StatusBadge status={row.billingStatus} />
                  </div>
                  <p className="mono text-right font-bold text-ink">{formatCurrency(row.amount)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof UsersRound; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3 shadow-soft">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-ocean" />
        <div>
          <p className="text-xs font-bold text-ink-soft">{label}</p>
          <p className="mono font-bold text-ink">{value}</p>
        </div>
      </div>
    </div>
  );
}

function OperationalChart({
  points,
  methods,
  rangeLabel,
  walletFilter,
  onWalletFilterChange
}: {
  points: Array<OperationalPoint & { visibleRevenue: number }>;
  methods: string[];
  rangeLabel: string;
  walletFilter: string;
  onWalletFilterChange: (value: string) => void;
}) {
  const width = 760;
  const height = 300;
  const padding = { top: 24, right: 22, bottom: 46, left: 70 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(100000, ...points.flatMap((point) => [point.visibleRevenue, point.pending]));
  const ySteps = [1, 0.75, 0.5, 0.25, 0];
  const xFor = (index: number) => padding.left + (points.length === 1 ? chartWidth / 2 : (chartWidth / (points.length - 1)) * index);
  const yFor = (value: number) => padding.top + chartHeight - (value / maxValue) * chartHeight;
  const linePath = (key: "visibleRevenue" | "pending") =>
    points.map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(index)} ${yFor(point[key])}`).join(" ");
  const currentRevenue = points.reduce((total, point) => total + point.visibleRevenue, 0);
  const currentPending = points.reduce((total, point) => total + point.pending, 0);

  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-soft sm:p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="font-heading text-xl font-bold text-ink">Diagram operasional</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-ink-soft">
            <span className="inline-flex min-h-9 items-center rounded-lg border border-line bg-mist/70 px-3">Mingguan</span>
            <span className="inline-flex min-h-9 items-center rounded-lg border border-line bg-white px-3">{rangeLabel}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              className="min-h-9 appearance-none rounded-lg border border-line bg-white pl-3 pr-9 text-xs font-bold text-ink-soft"
              value={walletFilter}
              onChange={(event) => onWalletFilterChange(event.target.value)}
            >
              <option value="ALL">Semua Dompet</option>
              {methods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          </div>
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-success-soft text-success">
            <BarChart3 className="h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <ChartStat label="Pemasukan" value={formatCurrency(currentRevenue)} tone="success" />
        <ChartStat label="Tagihan jatuh tempo" value={formatCurrency(currentPending)} tone="danger" />
        <ChartStat label="Report masuk" value={`${points.reduce((total, point) => total + point.reports, 0)} laporan`} tone="warning" />
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-line bg-white">
        <svg viewBox={`0 0 ${width} ${height}`} className="block h-[300px] w-full" role="img" aria-label="Grafik operasional mingguan admin">
          <rect width={width} height={height} fill="#ffffff" />
          {ySteps.map((step) => {
            const y = padding.top + chartHeight * (1 - step);
            return (
              <g key={step}>
                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                <text x={padding.left - 14} y={y + 4} textAnchor="end" className="fill-slate-400 text-[12px] font-bold">
                  {formatCompact(maxValue * step)}
                </text>
              </g>
            );
          })}
          {points.map((point, index) => (
            <text key={point.date} x={xFor(index)} y={height - 16} textAnchor="middle" className="fill-slate-400 text-[12px] font-bold">
              {point.label}
            </text>
          ))}
          <path d={linePath("visibleRevenue")} fill="none" stroke="#2f9a6d" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          <path d={linePath("pending")} fill="none" stroke="#dc4f5b" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
          {points.map((point, index) => (
            <g key={`${point.date}-dots`}>
              <circle cx={xFor(index)} cy={yFor(point.visibleRevenue)} r="4.5" fill="#2f9a6d" stroke="#ffffff" strokeWidth="2" />
              <circle cx={xFor(index)} cy={yFor(point.pending)} r="3.8" fill="#dc4f5b" stroke="#ffffff" strokeWidth="2" />
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold text-ink-soft">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-success" />
          Pemasukan
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-danger" />
          Tagihan
        </span>
      </div>
    </div>
  );
}

function ChartStat({ label, value, tone }: { label: string; value: string; tone: "success" | "danger" | "warning" }) {
  const toneClass =
    tone === "success"
      ? "border-success/15 bg-success-soft text-success"
      : tone === "danger"
        ? "border-danger/15 bg-danger-soft text-danger"
        : "border-warning/15 bg-warning-soft text-warning";

  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClass}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] opacity-80">{label}</p>
      <p className="mono mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}

function formatCompact(value: number) {
  if (value >= 1000000) return `${Math.round(value / 1000000)}jt`;
  if (value >= 1000) return `${Math.round(value / 1000)}rb`;
  return String(Math.round(value));
}
