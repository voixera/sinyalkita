"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Button, ErrorState, SkeletonBlock, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { TroubleReport } from "@/lib/types";

type AdminReport = TroubleReport & {
  user: {
    customerId: string;
    name: string;
    loginId: string;
    phone: string;
  };
};

export default function ReportInboxPage() {
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [error, setError] = useState("");
  const [resolvingId, setResolvingId] = useState("");
  const { ready, user } = useAuth();
  const { showToast } = useToast();

  async function loadReports() {
    try {
      const data = await api.adminReports();
      setReports(data.reports);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data report belum dapat dimuat.");
    }
  }

  useEffect(() => {
    if (!ready || user?.role !== "ADMIN") return;
    loadReports();
  }, [ready, user?.role]);

  async function resolveReport(reportId: string) {
    setResolvingId(reportId);
    try {
      await api.resolveReport(reportId);
      showToast({ title: "Laporan ditandai selesai.", tone: "success" });
      await loadReports();
    } catch (err) {
      showToast({ title: err instanceof Error ? err.message : "Laporan belum dapat diperbarui.", tone: "info" });
    } finally {
      setResolvingId("");
    }
  }

  const openReports = (reports || []).filter((report) => report.status === "OPEN");
  const resolvedReports = (reports || []).filter((report) => report.status === "RESOLVED");

  return (
    <AppShell admin>
      <div className="mb-6">
        <p className="text-sm font-bold text-ink-soft">Inbox gangguan</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-ink">Report Problem</h1>
      </div>

      {error ? (
        <ErrorState title="Report belum dapat dimuat" message={error} />
      ) : !reports ? (
        <SkeletonBlock className="h-96" />
      ) : (
        <div className="grid gap-5">
          <section className="rounded-xl border border-line bg-white shadow-soft">
            <div className="flex flex-col gap-1 border-b border-line bg-mist/70 px-5 py-4">
              <p className="font-heading text-xl font-bold text-ink">Report problem user</p>
              <p className="text-sm font-semibold text-ink-soft">Laporan WiFi error atau trouble dari dashboard user.</p>
            </div>
            {openReports.length === 0 ? (
              <p className="px-5 py-6 text-sm font-semibold text-ink-soft">Tidak ada laporan gangguan terbuka.</p>
            ) : (
              <div className="divide-y divide-line/80">
                {openReports.map((report) => (
                  <div key={report.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_1.2fr_auto] lg:items-center">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-warning-soft text-warning">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-ink">{report.user.name}</p>
                        <p className="mono mt-1 text-xs font-bold text-ink-soft">
                          {report.user.customerId} - {report.user.loginId}
                        </p>
                        <p className="mt-1 text-xs font-bold text-ink-soft">{report.user.phone}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-6 text-ink">{report.message}</p>
                      <p className="mt-1 text-xs font-bold text-ink-soft">{formatDate(report.createdAt)}</p>
                    </div>
                    <Button type="button" variant="ghost" disabled={resolvingId === report.id} onClick={() => resolveReport(report.id)}>
                      <CheckCircle2 className="h-4 w-4" />
                      Tandai selesai
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-line bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="font-heading text-xl font-bold text-ink">Riwayat selesai</p>
              <StatusBadge status="SUCCESS" />
            </div>
            {resolvedReports.length === 0 ? (
              <p className="text-sm font-semibold text-ink-soft">Belum ada laporan yang diselesaikan.</p>
            ) : (
              <div className="divide-y divide-line/80">
                {resolvedReports.slice(0, 8).map((report) => (
                  <div key={report.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold text-ink">{report.user.name}</p>
                      <p className="text-sm font-semibold text-ink-soft">{report.message}</p>
                    </div>
                    <p className="text-xs font-bold text-ink-soft">{report.resolvedAt ? formatDate(report.resolvedAt) : "-"}</p>
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
