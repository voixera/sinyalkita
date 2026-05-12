"use client";

import { CalendarClock, CreditCard, ReceiptText } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ErrorState, LinkButton, SkeletonBlock, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, shortMonth } from "@/lib/format";
import type { Billing } from "@/lib/types";

export default function BillingsPage() {
  const [billings, setBillings] = useState<Billing[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .billings()
      .then((data) => setBillings(data.billings))
      .catch((err) => setError(err instanceof Error ? err.message : "Data tagihan belum dapat dimuat."));
  }, []);

  const current = billings?.[0];

  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-sm font-bold text-ink-soft">Ringkasan pembayaran</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-ink">Tagihan</h1>
      </div>

      {error ? (
        <ErrorState title="Tagihan belum dapat dimuat" message={error} />
      ) : !billings || !current ? (
        <SkeletonBlock className="h-96" />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-xl bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-warning-soft text-warning">
                <ReceiptText className="h-5 w-5" />
              </div>
              <StatusBadge status={current.status} />
            </div>
            <p className="mt-6 text-sm font-bold text-ink-soft">Tagihan {shortMonth(current.period)}</p>
            <p className="mono mt-2 text-4xl font-bold text-ink">{formatCurrency(current.amount)}</p>
            <div className="mt-6 rounded-xl border border-warning/20 bg-warning-soft p-4">
              <div className="flex items-center gap-3">
                <CalendarClock className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-warning">Jatuh tempo</p>
                  <p className="font-bold text-ink">{formatDate(current.dueDate)}</p>
                </div>
              </div>
            </div>
            <LinkButton href="/pembayaran" className="mt-6 w-full">
              <CreditCard className="h-4 w-4" />
              Bayar tagihan
            </LinkButton>
          </section>

          <section className="glass-panel rounded-xl p-5">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-line pb-3 text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">
              <span>Invoice</span>
              <span>Status</span>
              <span className="text-right">Nominal</span>
            </div>
            <div className="divide-y divide-line/80">
              {billings.map((billing) => (
                <div key={billing.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-4">
                  <div>
                    <p className="mono text-sm font-bold text-ink">{billing.invoiceNo}</p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {shortMonth(billing.period)} - tempo {formatDate(billing.dueDate)}
                    </p>
                  </div>
                  <StatusBadge status={billing.status} />
                  <p className="mono text-right font-bold text-ink">{formatCurrency(billing.amount)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
