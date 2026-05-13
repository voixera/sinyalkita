"use client";

import { Activity, AlertTriangle, CheckCircle2, ExternalLink, ImageIcon, X, XCircle, UsersRound, WalletCards } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Button, ErrorState, SkeletonBlock, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Payment, TroubleReport } from "@/lib/types";

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

type PendingPayment = Payment & {
  user: {
    customerId: string;
    name: string;
    loginId: string;
  };
};

type AdminReport = TroubleReport & {
  user: {
    customerId: string;
    name: string;
    loginId: string;
    phone: string;
  };
};

export default function AdminPage() {
  const [customers, setCustomers] = useState<Row[] | null>(null);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[] | null>(null);
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [summary, setSummary] = useState<Summary>({
    totalCustomers: 0,
    activeCustomers: 0,
    unpaidBillings: 0,
    pendingPayments: 0,
    openReports: 0
  });
  const [error, setError] = useState("");
  const [verifyingId, setVerifyingId] = useState("");
  const [proofPreview, setProofPreview] = useState<PendingPayment | null>(null);
  const { ready, user } = useAuth();
  const { showToast } = useToast();

  const loadOperationalData = useCallback(async () => {
    try {
      const [overview, payments, reportData] = await Promise.all([api.adminOverview(), api.adminPendingPayments(), api.adminReports()]);
      setCustomers(overview.customers);
      setSummary(overview.summary);
      setPendingPayments(payments.payments);
      setReports(reportData.reports);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data admin belum dapat dimuat.");
    }
  }, []);

  useEffect(() => {
    if (!ready || user?.role !== "ADMIN") return;
    loadOperationalData();
  }, [loadOperationalData, ready, user?.role]);

  async function verifyPayment(paymentId: string, action: "approve" | "reject") {
    setVerifyingId(paymentId);
    try {
      await api.verifyPayment(paymentId, action);
      setPendingPayments((current) => (current || []).filter((payment) => payment.id !== paymentId));
      setSummary((current) => ({
        ...current,
        pendingPayments: Math.max(0, current.pendingPayments - 1)
      }));
      showToast({
        title: action === "approve" ? "Pembayaran disetujui." : "Pembayaran ditolak.",
        tone: "success"
      });
      await loadOperationalData();
    } catch (err) {
      showToast({ title: err instanceof Error ? err.message : "Verifikasi belum dapat diproses.", tone: "info" });
    } finally {
      setVerifyingId("");
    }
  }

  async function resolveReport(reportId: string) {
    try {
      await api.resolveReport(reportId);
      showToast({ title: "Laporan ditandai selesai.", tone: "success" });
      await loadOperationalData();
    } catch (err) {
      showToast({ title: err instanceof Error ? err.message : "Laporan belum dapat diperbarui.", tone: "info" });
    }
  }

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
      ) : !customers || !pendingPayments || !reports ? (
        <SkeletonBlock className="h-96" />
      ) : (
        <div className="grid gap-5">
          <section className="rounded-xl border border-line bg-white shadow-soft">
            <div className="flex flex-col gap-1 border-b border-line bg-mist/70 px-5 py-4">
              <p className="font-heading text-xl font-bold text-ink">Pembayaran menunggu verifikasi</p>
              <p className="text-sm font-semibold text-ink-soft">
                Tagihan baru menjadi lunas setelah admin menyetujui pembayaran.
              </p>
            </div>
            {pendingPayments.length === 0 ? (
              <p className="px-5 py-6 text-sm font-semibold text-ink-soft">Tidak ada pembayaran yang perlu dicek.</p>
            ) : (
              <div className="divide-y divide-line/80">
                {pendingPayments.map((payment) => (
                  <div key={payment.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_1fr_auto] lg:items-center">
                    <div>
                      <p className="font-bold text-ink">{payment.user.name}</p>
                      <p className="mono mt-1 text-xs font-bold text-ink-soft">
                        {payment.user.customerId} - {payment.user.loginId}
                      </p>
                    </div>
                    <div>
                      <p className="mono font-bold text-ink">{formatCurrency(payment.amount)}</p>
                      <p className="mt-1 text-sm font-semibold text-ink-soft">
                        {payment.method} - {formatDate(payment.paidAt)}
                      </p>
                      <p className="mono mt-1 text-xs font-bold text-ink-soft">{payment.reference}</p>
                      <ProofButton payment={payment} onOpen={() => setProofPreview(payment)} />
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={verifyingId === payment.id}
                        onClick={() => verifyPayment(payment.id, "approve")}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Setujui
                      </Button>
                      <Button
                        type="button"
                        variant="quiet"
                        disabled={verifyingId === payment.id}
                        onClick={() => verifyPayment(payment.id, "reject")}
                      >
                        <XCircle className="h-4 w-4" />
                        Tolak
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-line bg-white shadow-soft">
            <div className="flex flex-col gap-1 border-b border-line bg-mist/70 px-5 py-4">
              <p className="font-heading text-xl font-bold text-ink">Report problem user</p>
              <p className="text-sm font-semibold text-ink-soft">Laporan WiFi error atau trouble dari dashboard user.</p>
            </div>
            {reports.filter((report) => report.status === "OPEN").length === 0 ? (
              <p className="px-5 py-6 text-sm font-semibold text-ink-soft">Tidak ada laporan gangguan terbuka.</p>
            ) : (
              <div className="divide-y divide-line/80">
                {reports
                  .filter((report) => report.status === "OPEN")
                  .map((report) => (
                    <div key={report.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_1.2fr_auto] lg:items-center">
                      <div>
                        <p className="font-bold text-ink">{report.user.name}</p>
                        <p className="mono mt-1 text-xs font-bold text-ink-soft">
                          {report.user.customerId} - {report.user.loginId}
                        </p>
                        <p className="mt-1 text-xs font-bold text-ink-soft">{report.user.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-6 text-ink">{report.message}</p>
                        <p className="mt-1 text-xs font-bold text-ink-soft">{formatDate(report.createdAt)}</p>
                      </div>
                      <Button type="button" variant="ghost" onClick={() => resolveReport(report.id)}>
                        <CheckCircle2 className="h-4 w-4" />
                        Tandai selesai
                      </Button>
                    </div>
                  ))}
              </div>
            )}
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
      {proofPreview ? <ProofPreviewModal payment={proofPreview} onClose={() => setProofPreview(null)} /> : null}
    </AppShell>
  );
}

function ProofButton({ payment, onOpen }: { payment: PendingPayment; onOpen: () => void }) {
  if (!payment.proofImage) {
    return (
      <p className="mt-3 inline-flex items-center gap-2 rounded-xl border border-warning/20 bg-warning-soft px-3 py-2 text-xs font-bold text-warning">
        <ImageIcon className="h-4 w-4" />
        Bukti belum tersedia
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-3 flex w-full max-w-xs items-center gap-3 rounded-xl border border-line bg-white p-2 text-left shadow-soft hover:border-ocean/30 hover:bg-mist sm:w-fit"
    >
      <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-mist">
        <img src={payment.proofImage} alt={`Bukti transfer ${payment.user.name}`} className="h-full w-full object-cover" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-ink">Lihat bukti transfer</span>
        <span className="block truncate text-xs font-semibold text-ink-soft">{payment.proofName || payment.reference}</span>
      </span>
    </button>
  );
}

function ProofPreviewModal({ payment, onClose }: { payment: PendingPayment; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/70 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true">
      <div className="mx-auto flex h-full max-w-4xl flex-col rounded-xl bg-white shadow-lift">
        <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3 sm:px-5">
          <div>
            <p className="font-heading text-lg font-bold text-ink">Bukti transfer</p>
            <p className="mt-1 text-xs font-semibold text-ink-soft">
              {payment.user.name} - {formatCurrency(payment.amount)} - {payment.method}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-ink-soft hover:bg-mist hover:text-ink"
            aria-label="Tutup bukti transfer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-mist p-3 sm:p-5">
          <div className="grid min-h-full place-items-center">
            <img
              src={payment.proofImage || ""}
              alt={`Bukti transfer ${payment.user.name}`}
              className="max-h-[72vh] w-auto max-w-full rounded-xl border border-line bg-white object-contain shadow-soft"
            />
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="mono truncate text-xs font-bold text-ink-soft">{payment.reference}</p>
          {payment.proofImage ? (
            <a
              href={payment.proofImage}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-bold text-white hover:bg-ocean"
            >
              Buka gambar penuh
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>
    </div>
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
