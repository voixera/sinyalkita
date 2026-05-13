"use client";

import { CheckCircle2, ExternalLink, ImageIcon, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Button, ErrorState, SkeletonBlock } from "@/components/ui";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Payment } from "@/lib/types";

type PendingPayment = Payment & {
  user: {
    customerId: string;
    name: string;
    loginId: string;
  };
};

export default function PaymentVerificationPage() {
  const [payments, setPayments] = useState<PendingPayment[] | null>(null);
  const [error, setError] = useState("");
  const [verifyingId, setVerifyingId] = useState("");
  const [proofPreview, setProofPreview] = useState<PendingPayment | null>(null);
  const { ready, user } = useAuth();
  const { showToast } = useToast();

  async function loadPayments() {
    try {
      const data = await api.adminPendingPayments();
      setPayments(data.payments);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data pembayaran belum dapat dimuat.");
    }
  }

  useEffect(() => {
    if (!ready || user?.role !== "ADMIN") return;
    loadPayments();
  }, [ready, user?.role]);

  async function verifyPayment(paymentId: string, action: "approve" | "reject") {
    setVerifyingId(paymentId);
    try {
      await api.verifyPayment(paymentId, action);
      setPayments((current) => (current || []).filter((payment) => payment.id !== paymentId));
      showToast({
        title: action === "approve" ? "Pembayaran disetujui." : "Pembayaran ditolak.",
        tone: "success"
      });
    } catch (err) {
      showToast({ title: err instanceof Error ? err.message : "Verifikasi belum dapat diproses.", tone: "info" });
    } finally {
      setVerifyingId("");
    }
  }

  return (
    <AppShell admin>
      <div className="mb-6">
        <p className="text-sm font-bold text-ink-soft">Antrian pembayaran</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-ink">Verifikasi Pembayaran</h1>
      </div>

      {error ? (
        <ErrorState title="Pembayaran belum dapat dimuat" message={error} />
      ) : !payments ? (
        <SkeletonBlock className="h-96" />
      ) : (
        <section className="rounded-xl border border-line bg-white shadow-soft">
          <div className="flex flex-col gap-1 border-b border-line bg-mist/70 px-5 py-4">
            <p className="font-heading text-xl font-bold text-ink">Pembayaran menunggu verifikasi</p>
            <p className="text-sm font-semibold text-ink-soft">Buka bukti transfer, lalu setujui atau tolak transaksi.</p>
          </div>
          {payments.length === 0 ? (
            <p className="px-5 py-6 text-sm font-semibold text-ink-soft">Tidak ada pembayaran yang perlu dicek.</p>
          ) : (
            <div className="divide-y divide-line/80">
              {payments.map((payment) => (
                <div key={payment.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_1.1fr_auto] lg:items-center">
                  <div>
                    <p className="font-bold text-ink">{payment.user.name}</p>
                    <p className="mono mt-1 text-xs font-bold text-ink-soft">
                      {payment.user.customerId} - {payment.user.loginId}
                    </p>
                    <p className="mono mt-2 text-lg font-bold text-ink">{formatCurrency(payment.amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink-soft">
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
      className="mt-3 flex w-full max-w-sm items-center gap-3 rounded-xl border border-line bg-white p-2 text-left shadow-soft hover:border-ocean/30 hover:bg-mist sm:w-fit"
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
