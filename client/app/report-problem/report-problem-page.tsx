"use client";

import { AlertTriangle, Send, Signal } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, ErrorState, SkeletonBlock, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { MeResponse } from "@/lib/types";

export default function ReportProblemPage() {
  const [data, setData] = useState<MeResponse | null>(null);
  const [error, setError] = useState("");
  const [reportMessage, setReportMessage] = useState("WiFi sedang error atau tidak bisa digunakan.");
  const [reporting, setReporting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    api
      .me()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Data report belum dapat dimuat."));
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
  const recentReports = data?.reports || [];

  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-sm font-bold text-ink-soft">Bantuan layanan</p>
        <h1 className="mobile-page-title mt-2 font-heading text-3xl font-bold text-ink">Report Problem</h1>
      </div>

      {error ? (
        <ErrorState title="Report belum dapat dimuat" message={error} />
      ) : !data ? (
        <SkeletonBlock className="h-96" />
      ) : (
        <div className="mobile-container mobile-stack lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:gap-5">
          <section className="mobile-card rounded-xl border border-line bg-white p-5 shadow-soft">
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

            <div className="mt-5 grid gap-3">
              <label className="block text-sm font-bold text-ink">
                Detail gangguan
                <textarea
                  value={reportMessage}
                  onChange={(event) => setReportMessage(event.target.value)}
                  disabled={Boolean(openReport)}
                  rows={5}
                  className="mt-2 w-full resize-none rounded-xl border-line bg-mist/60 px-4 py-3 text-sm font-semibold text-ink placeholder:text-ink-soft/50"
                />
              </label>
              <Button type="button" className="mobile-button mobile-tap w-full" disabled={Boolean(openReport) || reporting} onClick={reportProblem}>
                <Send className="h-4 w-4" />
                {openReport ? "Sudah dilaporkan" : reporting ? "Mengirim..." : "Kirim report"}
              </Button>
            </div>
          </section>

          <section className="mobile-card rounded-xl border border-line bg-white p-5 shadow-soft">
            <p className="font-heading text-xl font-bold text-ink">Riwayat report</p>
            {recentReports.length === 0 ? (
              <p className="mt-4 rounded-xl bg-mist/70 p-4 text-sm font-semibold text-ink-soft">Belum ada report yang dikirim.</p>
            ) : (
              <div className="mt-4 divide-y divide-line/80">
                {recentReports.map((report) => (
                  <div key={report.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold leading-6 text-ink">{report.message}</p>
                      <p className="mt-1 text-xs font-bold text-ink-soft">{formatDate(report.createdAt)}</p>
                    </div>
                    <StatusBadge status={report.status === "OPEN" ? "PENDING" : "SUCCESS"} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}
