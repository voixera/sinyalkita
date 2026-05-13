"use client";

import { Activity, AlertTriangle, BarChart3, CreditCard, UsersRound, WalletCards } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { ErrorState, SkeletonBlock, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

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

export default function AdminPage() {
  const [customers, setCustomers] = useState<Row[] | null>(null);
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
      const overview = await api.adminOverview();
      setCustomers(overview.customers);
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

  const activeRate = summary.totalCustomers ? Math.round((summary.activeCustomers / summary.totalCustomers) * 100) : 0;
  const unpaidRate = summary.totalCustomers ? Math.round((summary.unpaidBillings / summary.totalCustomers) * 100) : 0;
  const totalMonthly = (customers || []).reduce((total, customer) => total + customer.amount, 0);

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
          <Metric icon={Activity} label="Tagihan menunggu" value={String(summary.unpaidBillings)} />
        </div>
      </div>

      {error ? (
        <ErrorState title="Panel admin belum dapat dimuat" message={error} />
      ) : !customers ? (
        <SkeletonBlock className="h-96" />
      ) : (
        <div className="grid gap-5">
          <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-xl border border-line bg-white p-5 shadow-soft">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-heading text-xl font-bold text-ink">Diagram operasional</p>
                  <p className="mt-1 text-sm font-semibold text-ink-soft">Ringkasan kesehatan layanan dan tagihan user.</p>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-success-soft text-success">
                  <BarChart3 className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                <ProgressRow label="User aktif" value={activeRate} detail={`${summary.activeCustomers}/${summary.totalCustomers} user`} />
                <ProgressRow label="Tagihan menunggu" value={unpaidRate} detail={`${summary.unpaidBillings} tagihan`} tone="warning" />
                <ProgressRow
                  label="Tindak lanjut admin"
                  value={Math.min(100, (summary.pendingPayments + summary.openReports) * 18)}
                  detail={`${summary.pendingPayments + summary.openReports} item`}
                  tone="danger"
                />
              </div>
            </div>

            <div className="rounded-xl bg-ink p-5 text-white shadow-lift">
              <p className="text-sm font-bold text-white/60">Estimasi tagihan aktif</p>
              <p className="mono mt-3 text-4xl font-bold">{formatCurrency(totalMonthly)}</p>
              <div className="mt-6 grid gap-3 border-t border-white/10 pt-5">
                <ActionLink href="/admin/payments" icon={CreditCard} label="Verifikasi pembayaran" count={summary.pendingPayments} />
                <ActionLink href="/admin/reports" icon={AlertTriangle} label="Report problem user" count={summary.openReports} />
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-line bg-white shadow-soft">
            <div className="grid grid-cols-[1.1fr_0.9fr_1fr_auto_auto] gap-4 border-b border-line bg-mist/70 px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">
              <span>User</span>
              <span>Login</span>
              <span>Paket</span>
              <span>Status</span>
              <span className="text-right">Nominal</span>
            </div>
            <div className="divide-y divide-line/80">
              {customers.map((row) => (
                <div
                  key={row.customerId}
                  className="grid grid-cols-1 gap-3 px-5 py-4 hover:bg-mist/55 md:grid-cols-[1.1fr_0.9fr_1fr_auto_auto] md:items-center md:gap-4"
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

function ProgressRow({
  label,
  value,
  detail,
  tone = "success"
}: {
  label: string;
  value: number;
  detail: string;
  tone?: "success" | "warning" | "danger";
}) {
  const color = tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-danger";
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-ink">{label}</p>
        <p className="mono text-xs font-bold text-ink-soft">{detail}</p>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-mist">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(6, Math.min(value, 100))}%` }} />
      </div>
    </div>
  );
}

function ActionLink({ href, icon: Icon, label, count }: { href: string; icon: typeof CreditCard; label: string; count: number }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-4 hover:bg-white/[0.1]">
      <span className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-white/70" />
        <span className="font-bold">{label}</span>
      </span>
      <span className="mono rounded-full bg-white px-2 py-1 text-xs font-bold text-ink">{count}</span>
    </Link>
  );
}
