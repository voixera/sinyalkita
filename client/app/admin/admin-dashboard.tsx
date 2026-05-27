"use client";

import { Activity, AlertTriangle, BarChart3, ChevronDown, Search, Server, UsersRound, WalletCards } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { SkeletonBlock, StatusBadge } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { getProfileInitials } from "@/lib/profile-photo";
import type { ServiceServer } from "@/lib/types";

type Row = {
  customerId: string;
  loginId: string;
  name: string;
  profileImage: string | null;
  serverName: string;
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
  const [adminProfile, setAdminProfile] = useState<{ name: string; loginId: string; profileImage: string | null } | null>(null);
  const [walletFilter, setWalletFilter] = useState("ALL");
  const [customerSearch, setCustomerSearch] = useState("");
  const [serverFilter, setServerFilter] = useState("ALL");
  const [summary, setSummary] = useState<Summary>({
    totalCustomers: 0,
    activeCustomers: 0,
    unpaidBillings: 0,
    pendingPayments: 0,
    openReports: 0
  });
  const { logout, ready, user } = useAuth();

  const loadCustomerProfileImages = useCallback(async () => {
    try {
      const data = await api.adminProfileImages();
      setCustomers((current) =>
        current?.map((customer) => ({
          ...customer,
          profileImage: data.profileImages[customer.customerId] ?? customer.profileImage
        })) || current
      );
    } catch (error) {
      console.error("Admin profile images failed", error);
    }
  }, []);

  const loadOperationalData = useCallback(async () => {
    const [overviewResult, serverResult] = await Promise.allSettled([api.adminOverview(), api.adminServers()]);

    if (isAuthError(overviewResult) || isAuthError(serverResult)) {
      logout();
      return;
    }

    if (overviewResult.status === "fulfilled") {
      setCustomers(overviewResult.value.customers);
      setOperational(overviewResult.value.operational);
      setSummary(overviewResult.value.summary);

      if (overviewResult.value.customers.length > 0) {
        void loadCustomerProfileImages();
      }
    } else {
      console.error("Admin overview failed", overviewResult.reason);
      setCustomers([]);
      setOperational(createEmptyOperational());
      setSummary(createEmptySummary());
    }

    if (serverResult.status === "fulfilled") {
      setServers(serverResult.value.servers);
    } else {
      console.error("Admin servers failed", serverResult.reason);
      setServers([]);
    }
  }, [loadCustomerProfileImages, logout]);

  useEffect(() => {
    if (!ready || user?.role !== "ADMIN") return;
    loadOperationalData();
  }, [loadOperationalData, ready, user?.role]);

  useEffect(() => {
    if (!ready || user?.role !== "ADMIN") return;
    if (adminProfile) return;

    api
      .profile()
      .then((profileData) => {
        const profile = profileData.profile;
        setAdminProfile({
          name: profile.name,
          loginId: profile.loginId,
          profileImage: profile.profileImage
        });
      })
      .catch(() => undefined);
  }, [adminProfile, ready, user?.role]);

  const serverIssues = (servers || []).filter((server) => server.status !== "ACTIVE").length;
  const serverOrder = useMemo(() => (servers || []).map((server) => server.name), [servers]);
  const filteredCustomers = useMemo(() => {
    const normalizedSearch = customerSearch.trim().toLowerCase();

    return (customers || [])
      .filter((customer) => serverFilter === "ALL" || customer.serverName === serverFilter)
      .filter((customer) => {
        if (!normalizedSearch) return true;
        return [
          customer.name,
          customer.customerId,
          customer.loginId,
          customer.serverName,
          customer.packageName
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((a, b) => {
        const serverDiff = serverOrder.indexOf(a.serverName) - serverOrder.indexOf(b.serverName);
        if (serverDiff !== 0) return serverDiff;
        return a.name.localeCompare(b.name);
      });
  }, [customerSearch, customers, serverFilter, serverOrder]);
  const chartPoints = useMemo(() => {
    return (operational?.points || []).map((point) => ({
      ...point,
      visibleRevenue: walletFilter === "ALL" ? point.revenue : point.paymentsByMethod[walletFilter] || 0
    }));
  }, [operational?.points, walletFilter]);

  return (
    <AppShell admin>
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="flex items-center gap-4">
          <ProfileAvatar name={adminProfile?.name || user?.name || "Admin SinyalKita"} image={adminProfile?.profileImage || null} size="lg" />
          <div>
            <p className="text-sm font-bold text-ink-soft">Panel internal</p>
            <h1 className="mt-2 font-heading text-3xl font-bold text-ink">Operasional</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Metric icon={UsersRound} label="User aktif" value={String(summary.activeCustomers)} />
          <Metric icon={WalletCards} label="Perlu dicek" value={String(summary.pendingPayments)} />
          <Metric icon={AlertTriangle} label="Report gangguan" value={String(summary.openReports)} />
          <Metric icon={Server} label="Server bermasalah" value={String(serverIssues)} />
          <Metric icon={Activity} label="Tagihan menunggu" value={String(summary.unpaidBillings)} />
        </div>
      </div>

      {!customers || !servers || !operational ? (
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
            <div className="grid gap-3 border-b border-line bg-white px-4 py-4 md:grid-cols-[1fr_220px] md:items-center md:px-5">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <input
                  type="search"
                  value={customerSearch}
                  onChange={(event) => setCustomerSearch(event.target.value)}
                  className="min-h-11 w-full rounded-xl border-line bg-mist/60 pl-10 pr-4 text-sm font-semibold text-ink placeholder:text-ink-soft/55"
                  placeholder="Cari user, ID, login, server..."
                />
              </label>
              <div className="relative">
                <select
                  value={serverFilter}
                  onChange={(event) => setServerFilter(event.target.value)}
                  className="min-h-11 w-full appearance-none rounded-xl border-line bg-mist/60 px-4 pr-10 text-sm font-bold text-ink"
                >
                  <option value="ALL">Semua server</option>
                  {(servers || []).map((server) => (
                    <option key={server.id} value={server.name}>
                      {server.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              </div>
            </div>

            <div className="hidden grid-cols-[1.1fr_0.8fr_0.9fr_0.9fr_auto_auto] gap-4 border-b border-line bg-mist/70 px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-ink-soft md:grid">
              <span>User</span>
              <span>Login</span>
              <span>Server</span>
              <span>Paket</span>
              <span>Status</span>
              <span className="text-right">Nominal</span>
            </div>
            <div className="grid gap-3 p-3 md:block md:divide-y md:divide-line/80 md:p-0">
              {filteredCustomers.map((row) => (
                <div
                  key={row.customerId}
                  className="rounded-xl border border-line bg-white p-4 shadow-soft md:grid md:grid-cols-[1.1fr_0.8fr_0.9fr_0.9fr_auto_auto] md:items-center md:gap-4 md:rounded-none md:border-0 md:px-5 md:py-4 md:shadow-none md:hover:bg-mist/55"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <ProfileAvatar name={row.name} image={row.profileImage} />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink">{row.name}</p>
                      <p className="mono mt-1 truncate text-xs font-bold text-ink-soft">{row.customerId}</p>
                    </div>
                  </div>
                  <p className="mono text-xs font-bold text-ink-soft">{row.loginId}</p>
                  <p className="text-sm font-bold text-ink-soft">{row.serverName}</p>
                  <p className="font-semibold text-ink-soft">{row.packageName}</p>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={row.serviceStatus} />
                    <StatusBadge status={row.billingStatus} />
                  </div>
                  <p className="mono text-right font-bold text-ink">{formatCurrency(row.amount)}</p>
                </div>
              ))}
              {filteredCustomers.length === 0 ? (
                <p className="px-5 py-6 text-sm font-semibold text-ink-soft">Tidak ada user yang cocok dengan pencarian atau filter server.</p>
              ) : null}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}

function isAuthError(result: PromiseSettledResult<unknown>) {
  return result.status === "rejected" && result.reason instanceof ApiError && (result.reason.status === 401 || result.reason.status === 403);
}

function createEmptySummary(): Summary {
  return {
    totalCustomers: 0,
    activeCustomers: 0,
    unpaidBillings: 0,
    pendingPayments: 0,
    openReports: 0
  };
}

function createEmptyOperational(): Operational {
  const start = startOfWeek(new Date());

  return {
    rangeLabel: `${formatShortDate(start)} - ${formatShortDate(addDays(start, 6))}`,
    methods: [],
    points: Array.from({ length: 7 }, (_, index) => {
      const date = addDays(start, index);

      return {
        date: date.toISOString().slice(0, 10),
        label: formatShortDate(date),
        revenue: 0,
        pending: 0,
        reports: 0,
        paymentsByMethod: {}
      };
    })
  };
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

function ProfileAvatar({ name, image, size = "md" }: { name: string; image: string | null; size?: "md" | "lg" }) {
  const sizeClass = size === "lg" ? "h-14 w-14 text-xl sm:h-16 sm:w-16 sm:text-2xl" : "h-11 w-11 text-sm";

  return (
    <div className={`${sizeClass} grid shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-white font-bold text-ink shadow-soft`}>
      {image ? <img src={image} alt={name} className="h-full w-full object-cover" /> : <span>{getProfileInitials(name)}</span>}
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
  const chartFrameRef = useRef<HTMLDivElement>(null);
  const [desktopChartWidth, setDesktopChartWidth] = useState(760);
  const width = desktopChartWidth;
  const height = 320;
  const padding = { top: 30, right: 28, bottom: 54, left: 76 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(100000, ...points.flatMap((point) => [point.visibleRevenue, point.pending]));
  const maxReports = Math.max(1, ...points.map((point) => point.reports));
  const ySteps = [1, 0.75, 0.5, 0.25, 0];
  const xFor = (index: number) => padding.left + (points.length === 1 ? chartWidth / 2 : (chartWidth / (points.length - 1)) * index);
  const yFor = (value: number) => padding.top + chartHeight - (value / maxValue) * chartHeight;
  const reportHeightFor = (value: number) => Math.max(value > 0 ? 8 : 0, (value / maxReports) * 58);
  const linePath = (key: "visibleRevenue" | "pending") => smoothLinePath(points.map((point, index) => [xFor(index), yFor(point[key])]));
  const revenuePath = linePath("visibleRevenue");
  const pendingPath = linePath("pending");
  const revenueAreaPath = areaPath(revenuePath, points.length, xFor(0), xFor(points.length - 1), padding.top + chartHeight);
  const pendingAreaPath = areaPath(pendingPath, points.length, xFor(0), xFor(points.length - 1), padding.top + chartHeight);
  const currentRevenue = points.reduce((total, point) => total + point.visibleRevenue, 0);
  const currentPending = points.reduce((total, point) => total + point.pending, 0);
  const totalReports = points.reduce((total, point) => total + point.reports, 0);

  useEffect(() => {
    const chartFrame = chartFrameRef.current;
    if (!chartFrame) return;

    const updateChartWidth = () => {
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      const measuredWidth = Math.round(chartFrame.getBoundingClientRect().width);
      const nextWidth = isDesktop && measuredWidth > 0 ? measuredWidth : 760;
      setDesktopChartWidth((currentWidth) => (currentWidth === nextWidth ? currentWidth : nextWidth));
    };

    updateChartWidth();

    const resizeObserver = new ResizeObserver(updateChartWidth);
    resizeObserver.observe(chartFrame);
    window.addEventListener("resize", updateChartWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateChartWidth);
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-xl border border-line/80 bg-white shadow-soft">
      <div className="border-b border-line/70 bg-[radial-gradient(circle_at_top_left,rgba(47,154,109,0.14),transparent_32%),linear-gradient(135deg,#ffffff,#f7fbfd)] p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="font-heading text-xl font-bold text-ink">Diagram operasional</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-ink-soft">
              <span className="inline-flex min-h-9 items-center rounded-lg border border-line/80 bg-white/75 px-3 shadow-sm backdrop-blur">Mingguan</span>
              <span className="inline-flex min-h-9 items-center rounded-lg border border-line/80 bg-white/85 px-3 shadow-sm backdrop-blur">{rangeLabel}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                className="min-h-9 appearance-none rounded-lg border border-line/80 bg-white/90 pl-3 pr-9 text-xs font-bold text-ink-soft shadow-sm"
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
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-white shadow-sm">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <ChartStat label="Pemasukan" value={formatCurrency(currentRevenue)} tone="success" />
          <ChartStat label="Tagihan jatuh tempo" value={formatCurrency(currentPending)} tone="danger" />
          <ChartStat label="Report masuk" value={`${totalReports} laporan`} tone="warning" />
        </div>
      </div>

      <div className="p-3 sm:p-5">
        <div ref={chartFrameRef} className="overflow-hidden rounded-lg border border-line/80 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <svg viewBox={`0 0 ${width} ${height}`} className="block h-[320px] w-full" role="img" aria-label="Grafik operasional mingguan admin">
            <defs>
              <linearGradient id="chartRevenueStroke" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#43B37D" />
                <stop offset="100%" stopColor="#0F3A63" />
              </linearGradient>
              <linearGradient id="chartRevenueFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#2F9A6D" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#2F9A6D" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="chartPendingFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#B85C66" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#B85C66" stopOpacity="0.01" />
              </linearGradient>
              <filter id="chartLineGlow" x="-12%" y="-30%" width="124%" height="160%">
                <feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#0F3A63" floodOpacity="0.16" />
              </filter>
            </defs>
            <rect width={width} height={height} fill="#fbfdff" />
            <rect x="1" y="1" width={width - 2} height={height - 2} rx="14" fill="url(#chartRevenueFill)" opacity="0.24" />
            {ySteps.map((step) => {
              const y = padding.top + chartHeight * (1 - step);
              return (
                <g key={step}>
                  <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#dbe5ee" strokeDasharray="6 8" strokeWidth="1" />
                  <text x={padding.left - 14} y={y + 4} textAnchor="end" className="fill-slate-400 text-[12px] font-bold">
                    {formatCompact(maxValue * step)}
                  </text>
                </g>
              );
            })}
            {points.map((point, index) => {
              const x = xFor(index);
              const barHeight = reportHeightFor(point.reports);
              const baseline = padding.top + chartHeight;
              return (
                <rect
                  key={`${point.date}-report`}
                  x={x - 12}
                  y={baseline - barHeight}
                  width="24"
                  height={barHeight}
                  rx="8"
                  fill="#B9822E"
                  opacity={point.reports > 0 ? "0.22" : "0"}
                />
              );
            })}
            {points.map((point, index) => (
              <text key={point.date} x={xFor(index)} y={height - 16} textAnchor="middle" className="fill-slate-400 text-[12px] font-bold">
                {point.label}
              </text>
            ))}
            {revenueAreaPath ? <path d={revenueAreaPath} fill="url(#chartRevenueFill)" /> : null}
            {pendingAreaPath ? <path d={pendingAreaPath} fill="url(#chartPendingFill)" /> : null}
            <path d={revenuePath} fill="none" filter="url(#chartLineGlow)" stroke="url(#chartRevenueStroke)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
            <path d={pendingPath} fill="none" stroke="#B85C66" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" />
            {points.map((point, index) => (
              <g key={`${point.date}-dots`}>
                <circle cx={xFor(index)} cy={yFor(point.visibleRevenue)} r="7" fill="#ffffff" stroke="#2F9A6D" strokeWidth="3" />
                <circle cx={xFor(index)} cy={yFor(point.pending)} r="5.4" fill="#ffffff" stroke="#B85C66" strokeWidth="2.5" />
              </g>
            ))}
          </svg>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 px-4 pb-4 text-xs font-bold text-ink-soft sm:px-5 sm:pb-5">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_0_4px_rgba(47,154,109,0.12)]" />
          Pemasukan
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-danger shadow-[0_0_0_4px_rgba(184,92,102,0.12)]" />
          Tagihan
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-warning shadow-[0_0_0_4px_rgba(185,130,46,0.14)]" />
          Report
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

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + mondayOffset);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

function smoothLinePath(points: Array<[number, number]>) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point[0]} ${point[1]}`;

    const previous = points[index - 1];
    const controlX = previous[0] + (point[0] - previous[0]) / 2;
    return `${path} C ${controlX} ${previous[1]}, ${controlX} ${point[1]}, ${point[0]} ${point[1]}`;
  }, "");
}

function areaPath(linePath: string, pointCount: number, firstX: number, lastX: number, baseline: number) {
  if (!linePath || pointCount === 0) return "";
  return `${linePath} L ${lastX} ${baseline} L ${firstX} ${baseline} Z`;
}
