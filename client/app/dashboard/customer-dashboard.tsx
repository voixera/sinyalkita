"use client";

import { motion } from "framer-motion";
import { CalendarDays, Gauge, Router, Signal } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ErrorState, SkeletonBlock, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { MeResponse } from "@/lib/types";

export default function DashboardPage() {
  const [data, setData] = useState<MeResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .me()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Data dashboard belum dapat dimuat."));
  }, []);

  return (
    <AppShell>
      {error ? (
        <ErrorState title="Dashboard belum dapat dimuat" message={error} />
      ) : !data ? (
        <div className="mobile-stack lg:grid lg:grid-cols-3 lg:gap-5">
          <SkeletonBlock className="h-48 lg:col-span-2" />
          <SkeletonBlock className="h-48" />
          <SkeletonBlock className="h-40 lg:col-span-3" />
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mobile-container mobile-stack lg:space-y-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-bold text-ink-soft">ID user {data.user.customerId}</p>
              <h1 className="mobile-page-title mt-2 font-heading text-3xl font-bold text-ink lg:text-4xl">
                Selamat datang kembali, {data.user.name.split(" ")[0]}
              </h1>
            </div>
            <StatusBadge status={data.subscription.status} />
          </div>

          <div className="grid gap-5">
            <section className="mobile-card rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-ink-soft">Paket aktif</p>
                  <h2 className="mt-2 font-heading text-2xl font-bold text-ink">{data.subscription.package.name}</h2>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-success-soft text-success">
                  <Router className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <Info icon={Gauge} label="Kecepatan" value={`${data.subscription.package.speedMbps} Mbps`} />
                <Info icon={CalendarDays} label="Aktif sejak" value={formatDate(data.subscription.startedAt)} />
                <Info icon={Signal} label="Status" value="Normal" />
              </div>
            </section>
          </div>

          <section className="mobile-stack lg:grid lg:grid-cols-3 lg:gap-5">
            <MiniCard title="Server layanan" value={data.user.serverName} />
            <MiniCard title="Alamat layanan" value={data.user.address} />
            <MiniCard title="Kontak terdaftar" value={`${data.user.phone}${data.user.email ? ` - ${data.user.email}` : ""}`} />
          </section>
        </motion.div>
      )}
    </AppShell>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) {
  return (
    <div className="mobile-card rounded-xl border border-line/80 bg-white p-4">
      <Icon className="h-5 w-5 text-ocean" />
      <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">{label}</p>
      <p className="mt-1 font-bold text-ink">{value}</p>
    </div>
  );
}

function MiniCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="mobile-card rounded-xl border border-line/80 bg-white p-5 shadow-soft">
      <p className="text-sm font-bold text-ink-soft">{title}</p>
      <p className="mt-2 font-semibold leading-7 text-ink">{value}</p>
    </div>
  );
}
