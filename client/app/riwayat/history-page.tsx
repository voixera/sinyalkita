"use client";

import { FileCheck2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ErrorState, SkeletonBlock, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, shortMonth } from "@/lib/format";
import type { Payment } from "@/lib/types";

export default function HistoryPage() {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .payments()
      .then((data) => setPayments(data.payments))
      .catch((err) => setError(err instanceof Error ? err.message : "Riwayat pembayaran belum dapat dimuat."));
  }, []);

  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-sm font-bold text-ink-soft">Transaksi terdahulu</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-ink">Riwayat</h1>
      </div>

      {error ? (
        <ErrorState title="Riwayat belum dapat dimuat" message={error} />
      ) : !payments ? (
        <SkeletonBlock className="h-80" />
      ) : (
        <section className="glass-panel rounded-xl p-5">
          <div className="divide-y divide-line/80">
            {payments.map((payment) => (
              <div key={payment.id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-success-soft text-success">
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-ink">{shortMonth(payment.billing.period)}</p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {payment.method} - {formatDate(payment.paidAt)}
                    </p>
                    <p className="mono mt-1 text-xs font-bold text-ink-soft">{payment.reference}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  <StatusBadge status={payment.status} />
                  <p className="mono text-lg font-bold text-ink">{formatCurrency(payment.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
