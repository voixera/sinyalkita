"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, CalendarDays, CreditCard, Gauge, MapPin, Phone, ReceiptText, Router, Server, Signal, Wifi } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ErrorState, SkeletonBlock, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, shortMonth } from "@/lib/format";
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
  const connectionSummaryText =
    serverStatus === "ACTIVE" ? "Stabil" : serverStatus === "TROUBLE" ? "Perlu dicek" : "Butuh bantuan admin";
  const serverStatusDescription =
    serverStatus === "ACTIVE"
      ? "Server layanan kamu berjalan normal."
      : serverStatus === "TROUBLE"
        ? "Server layanan kamu sedang mengalami gangguan. Tim admin sedang melakukan pengecekan."
        : "Server layanan kamu sedang error. Silakan pantau informasi dari admin atau kirim report jika dibutuhkan.";

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
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mobile-container grid gap-4 lg:gap-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-bold text-ink-soft">ID user {data.user.customerId}</p>
              <h1 className="mobile-page-title mt-2 font-heading text-3xl font-bold text-ink lg:text-4xl">
                Selamat datang kembali, {data.user.name.split(" ")[0]}
              </h1>
            </div>
            <QuickAction href="/report-problem" icon={AlertTriangle} label="Report gangguan" />
          </div>

          <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="overflow-hidden rounded-xl border border-line bg-white shadow-soft">
              <div className="border-b border-line/70 bg-[radial-gradient(circle_at_top_right,rgba(47,154,109,0.15),transparent_16rem),linear-gradient(135deg,#ffffff,#f8fbfd)] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-ink-soft">Paket layanan</p>
                    <h2 className="mt-2 font-heading text-2xl font-bold text-ink sm:text-3xl">{data.subscription.package.name}</h2>
                    <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-ink-soft">
                      Layanan terhubung ke {data.user.serverName} dengan koneksi {connectionSummaryText.toLowerCase()}.
                    </p>
                  </div>
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-success-soft text-success sm:h-14 sm:w-14">
                    <Router className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <Info icon={Gauge} label="Kecepatan" value={`${data.subscription.package.speedMbps} Mbps`} />
                  <Info icon={CalendarDays} label="Mulai layanan" value={formatDate(data.subscription.startedAt)} />
                  <Info icon={Wifi} label="Koneksi" value={connectionSummaryText} />
                </div>
              </div>

              <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
                <DetailTile icon={Server} title="Server" value={data.user.serverName} />
                <DetailTile icon={MapPin} title="Alamat" value={data.user.address} />
                <DetailTile icon={Phone} title="Kontak" value={`${data.user.phone}${data.user.email ? ` - ${data.user.email}` : ""}`} />
              </div>
            </div>

            <div className="grid gap-4">
              <StatusPanel status={serverStatus} title={serverStatusText} description={serverStatusDescription} />

              <section className="rounded-xl border border-line bg-white p-5 shadow-soft">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning">
                      <ReceiptText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-heading text-xl font-bold text-ink">
                        {data.currentBilling ? `Tagihan ${shortMonth(data.currentBilling.period)}` : "Tagihan terbaru"}
                      </p>
                      <p className="mono mt-1 text-2xl font-bold text-ink">
                        {data.currentBilling ? formatCurrency(data.currentBilling.amount) : "Belum tersedia"}
                      </p>
                    </div>
                  </div>
                  {data.currentBilling ? <StatusBadge status={data.currentBilling.status} /> : null}
                </div>

                <div className="mt-5 rounded-xl border border-line/80 bg-mist/70 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">Jatuh tempo</p>
                  <p className="mt-1 font-bold text-ink">{data.currentBilling ? formatDate(data.currentBilling.dueDate) : "Menunggu dibuat admin"}</p>
                </div>

                {data.currentBilling ? <QuickAction href="/pembayaran" icon={CreditCard} label="Bayar tagihan" className="mt-5 w-full" /> : null}
              </section>
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
    <section className={`rounded-xl border p-5 shadow-soft ${tone}`}>
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white">
          <Signal className="h-5 w-5" />
        </div>
        <div>
          <p className="font-heading text-xl font-bold text-ink">{title}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-ink-soft">{description}</p>
        </div>
      </div>
    </section>
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

function QuickAction({ href, icon: Icon, label, className = "" }: { href: string; icon: LucideIcon; label: string; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-bold text-white shadow-soft hover:-translate-y-0.5 hover:bg-ocean hover:shadow-lift ${className}`}
    >
      <Icon className="h-4 w-4" />
      {label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}
