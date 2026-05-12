"use client";

import { Activity, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ErrorState, SkeletonBlock, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

type Row = {
  customerId: string;
  name: string;
  packageName: string;
  serviceStatus: string;
  billingStatus: string;
  amount: number;
};

export default function AdminPage() {
  const [customers, setCustomers] = useState<Row[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .adminOverview()
      .then((data) => setCustomers(data.customers))
      .catch((err) => setError(err instanceof Error ? err.message : "Data admin belum dapat dimuat."));
  }, []);

  return (
    <AppShell admin>
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold text-ink-soft">Panel internal</p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-ink">Admin Dashboard</h1>
        </div>
        <div className="flex gap-3">
          <Metric icon={UsersRound} label="Pelanggan aktif" value="1.284" />
          <Metric icon={Activity} label="Uptime bulan ini" value="99,92%" />
        </div>
      </div>

      {error ? (
        <ErrorState title="Panel admin belum dapat dimuat" message={error} />
      ) : !customers ? (
        <SkeletonBlock className="h-96" />
      ) : (
        <section className="overflow-hidden rounded-xl border border-line bg-white shadow-soft">
          <div className="grid grid-cols-[1.1fr_1fr_auto_auto_auto] gap-4 border-b border-line bg-mist/70 px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">
            <span>Pelanggan</span>
            <span>Paket</span>
            <span>Layanan</span>
            <span>Tagihan</span>
            <span className="text-right">Nominal</span>
          </div>
          <div className="divide-y divide-line/80">
            {customers.map((row) => (
              <div
                key={row.customerId}
                className="grid grid-cols-1 gap-3 px-5 py-4 hover:bg-mist/55 md:grid-cols-[1.1fr_1fr_auto_auto_auto] md:items-center md:gap-4"
              >
                <div>
                  <p className="font-bold text-ink">{row.name}</p>
                  <p className="mono mt-1 text-xs font-bold text-ink-soft">{row.customerId}</p>
                </div>
                <p className="font-semibold text-ink-soft">{row.packageName}</p>
                <StatusBadge status={row.serviceStatus} />
                <StatusBadge status={row.billingStatus} />
                <p className="mono text-right font-bold text-ink">{formatCurrency(row.amount)}</p>
              </div>
            ))}
          </div>
        </section>
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
