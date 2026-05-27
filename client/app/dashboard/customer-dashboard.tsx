"use client";

import { motion } from "framer-motion";
import { CalendarDays, Gauge, MapPin, Phone, Router, Server, Signal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ErrorState, SkeletonBlock } from "@/components/ui";
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

  const serverStatus = data?.server?.status || "ACTIVE";
  const serverStatusText =
    serverStatus === "ACTIVE"
      ? "WiFi normal"
      : serverStatus === "TROUBLE"
        ? "WiFi sedang gangguan"
        : "WiFi sedang error";
  const serverStatusDescription =
    serverStatus === "ACTIVE"
      ? "Koneksi internet sedang berjalan normal."
      : serverStatus === "TROUBLE"
        ? "Koneksi sedang mengalami gangguan. Tim admin sedang melakukan pengecekan."
        : "Koneksi sedang error. Silakan pantau informasi dari admin.";

  return (
    <AppShell>
      {error ? (
        <ErrorState title="Dashboard belum dapat dimuat" message={error} />
      ) : !data ? (
        <div className="mobile-container grid gap-4">
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-96" />
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mobile-container grid gap-4 lg:gap-5">
          <div>
            <p className="text-sm font-bold text-ink-soft">ID user {data.user.customerId}</p>
            <h1 className="mobile-page-title mt-2 font-heading text-3xl font-bold text-ink lg:text-4xl">
              Selamat datang kembali, {data.user.name.split(" ")[0]}
            </h1>
          </div>

          <section className="overflow-hidden rounded-xl border border-line bg-white shadow-soft">
            <div className="bg-[radial-gradient(circle_at_top_right,rgba(47,154,109,0.15),transparent_18rem),linear-gradient(135deg,#ffffff,#f8fbfd)] p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-ink-soft">Paket layanan</p>
                  <h2 className="mt-2 font-heading text-2xl font-bold text-ink sm:text-3xl">{data.subscription.package.name}</h2>
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-ink-soft">Ringkasan layanan internet yang sedang terhubung ke akun kamu.</p>
                </div>
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-success-soft text-success sm:h-14 sm:w-14">
                  <Router className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <Info icon={Gauge} label="Kecepatan" value={`${data.subscription.package.speedMbps} Mbps`} />
                <Info icon={CalendarDays} label="Mulai layanan" value={formatDate(data.subscription.startedAt)} />
                <StatusPanel status={serverStatus} title={serverStatusText} description={serverStatusDescription} />
              </div>
            </div>

            <div className="border-t border-line/70 p-5 sm:p-6">
              <div>
                <p className="text-sm font-bold text-ink-soft">Data layanan</p>
                <h2 className="mt-1 font-heading text-xl font-bold text-ink sm:text-2xl">Informasi terdaftar</h2>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                <DetailTile icon={Server} title="Server" value={data.user.serverName} />
                <DetailTile icon={MapPin} title="Alamat" value={data.user.address} />
                <DetailTile icon={Phone} title="Kontak" value={`${data.user.phone}${data.user.email ? ` - ${data.user.email}` : ""}`} />
              </div>
            </div>
          </section>
        </motion.div>
      )}
    </AppShell>
  );
}

function Info({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line/80 bg-white/88 p-4 shadow-[0_12px_30px_rgba(11,22,40,0.06)]">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-mist text-ocean">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">{label}</p>
          <p className="mt-1 truncate font-bold text-ink">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusPanel({ status, title, description }: { status: string; title: string; description: string }) {
  const tone =
    status === "ACTIVE"
      ? "border-success/15 bg-success-soft text-success"
      : status === "TROUBLE"
        ? "border-warning/15 bg-warning-soft text-warning"
        : "border-danger/15 bg-danger-soft text-danger";

  return (
    <div className={`rounded-xl border p-4 shadow-[0_12px_30px_rgba(11,22,40,0.06)] ${tone}`}>
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white">
          <Signal className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-80">Status koneksi</p>
          <p className="mt-1 font-bold text-ink">{title}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-ink-soft">{description}</p>
        </div>
      </div>
    </div>
  );
}

function DetailTile({ icon: Icon, title, value }: { icon: LucideIcon; title: string; value: string }) {
  return (
    <div className="rounded-xl border border-line/80 bg-mist/60 p-4">
      <Icon className="h-5 w-5 text-ocean" />
      <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">{title}</p>
      <p className="mt-1 break-words font-semibold leading-6 text-ink">{value}</p>
    </div>
  );
}
