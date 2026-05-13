"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CalendarDays, Gauge, ReceiptText, Router, Send, Signal } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, ErrorState, LinkButton, SkeletonBlock, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import type { MeResponse } from "@/lib/types";

export default function DashboardPage() {
  const [data, setData] = useState<MeResponse | null>(null);
  const [error, setError] = useState("");
  const [reportMessage, setReportMessage] = useState("WiFi sedang error atau tidak bisa digunakan.");
  const [reporting, setReporting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    api
      .me()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Data dashboard belum dapat dimuat."));
  }, []);

  async function reportProblem() {
    if (!data) return;
    setReporting(true);
    try {
      const result = await api.createReport(reportMessage);
      setData({ ...data, reports: [result.report, ...data.reports] });
      showToast({ title: "Laporan gangguan dikirim ke admin.", tone: "success" });
    } catch (err) {
      showToast({ title: err instanceof Error ? err.message : "Laporan belum dapat dikirim.", tone: "info" });
    } finally {
      setReporting(false);
    }
  }

  const openReport = data?.reports.find((report) => report.status === "OPEN");

  return (
    <AppShell>
      {error ? (
        <ErrorState title="Dashboard belum dapat dimuat" message={error} />
      ) : !data ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <SkeletonBlock className="h-48 lg:col-span-2" />
          <SkeletonBlock className="h-48" />
          <SkeletonBlock className="h-40 lg:col-span-3" />
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-bold text-ink-soft">ID pelanggan {data.user.customerId}</p>
              <h1 className="mt-2 font-heading text-3xl font-bold text-ink lg:text-4xl">
                Selamat datang kembali, {data.user.name.split(" ")[0]}
              </h1>
            </div>
            <StatusBadge status={data.subscription.status} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <section className="glass-panel rounded-xl p-5">
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

            <section className="rounded-xl bg-ink p-5 text-white shadow-lift">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-white/60">Tagihan bulan ini</p>
                <ReceiptText className="h-5 w-5 text-white/60" />
              </div>
              <p className="mono mt-5 text-4xl font-bold">{formatCurrency(data.currentBilling.amount)}</p>
              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-sm text-white/60">Jatuh tempo</span>
                <span className="font-bold">{formatDate(data.currentBilling.dueDate)}</span>
              </div>
              <LinkButton href="/pembayaran" className="mt-6 w-full bg-white text-ink hover:bg-success-soft">
                Bayar sekarang
              </LinkButton>
            </section>
          </div>

          <section className="grid gap-5 lg:grid-cols-3">
            <MiniCard title="Alamat layanan" value={data.user.address} />
            <MiniCard title="Kontak terdaftar" value={`${data.user.phone}${data.user.email ? ` - ${data.user.email}` : ""}`} />
            <MiniCard title="Catatan" value="Layanan ini hanya untuk pelanggan aktif. Pendaftaran publik tidak tersedia." />
          </section>

          <section className="rounded-xl border border-line bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3">
                <div className={`grid h-11 w-11 place-items-center rounded-xl ${openReport ? "bg-warning-soft text-warning" : "bg-success-soft text-success"}`}>
                  {openReport ? <AlertTriangle className="h-5 w-5" /> : <Signal className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-heading text-xl font-bold text-ink">
                    {openReport ? "Laporan gangguan sedang ditangani" : "Koneksi WiFi aman"}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-ink-soft">
                    {openReport
                      ? "Admin sudah menerima laporan kamu dan akan melakukan pengecekan."
                      : "Jika WiFi error atau trouble, kirim report agar admin langsung melihatnya."}
                  </p>
                </div>
              </div>
              <StatusBadge status={openReport ? "PENDING" : "ACTIVE"} />
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
              <label className="block text-sm font-bold text-ink">
                Detail gangguan
                <textarea
                  value={reportMessage}
                  onChange={(event) => setReportMessage(event.target.value)}
                  disabled={Boolean(openReport)}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-xl border-line bg-mist/60 px-4 py-3 text-sm font-semibold text-ink placeholder:text-ink-soft/50"
                />
              </label>
              <Button type="button" disabled={Boolean(openReport) || reporting} onClick={reportProblem}>
                <Send className="h-4 w-4" />
                {openReport ? "Sudah dilaporkan" : reporting ? "Mengirim..." : "Report problem"}
              </Button>
            </div>
          </section>
        </motion.div>
      )}
    </AppShell>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line/80 bg-white p-4">
      <Icon className="h-5 w-5 text-ocean" />
      <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">{label}</p>
      <p className="mt-1 font-bold text-ink">{value}</p>
    </div>
  );
}

function MiniCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-line/80 bg-white p-5 shadow-soft">
      <p className="text-sm font-bold text-ink-soft">{title}</p>
      <p className="mt-2 font-semibold leading-7 text-ink">{value}</p>
    </div>
  );
}
