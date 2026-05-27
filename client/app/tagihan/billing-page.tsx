"use client";

import { CalendarClock, CheckCircle2, CreditCard, ReceiptText } from "lucide-react";
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
        <h1 className="mobile-page-title mt-2 font-heading text-3xl font-bold text-ink">Tagihan</h1>
      </div>

      {error ? (
        <ErrorState title="Tagihan belum dapat dimuat" message={error} />
      ) : !billings ? (
        <SkeletonBlock className="h-96" />
      ) : !current ? (
        <section className="mobile-card rounded-xl border border-success/15 bg-white p-6 text-center shadow-soft">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-success-soft text-success">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.12em] text-success">Lunas</p>
          <h2 className="mt-2 font-heading text-2xl font-bold text-ink">Tidak ada tagihan aktif</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-ink-soft">
            Tagihan yang sudah dibayar atau sedang diverifikasi admin tidak ditampilkan lagi di halaman ini.
          </p>
        </section>
      ) : (
        <div className="mobile-container mobile-stack xl:grid xl:grid-cols-[0.8fr_1.2fr] xl:gap-5">
          <section className="mobile-card rounded-xl bg-white p-6 shadow-soft">
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
            <LinkButton href="/pembayaran" className="mobile-button mobile-tap mobile-sticky-action mt-6 w-full xl:static">
              <CreditCard className="h-4 w-4" />
              Bayar tagihan
            </LinkButton>
          </section>

          <section className="glass-panel mobile-card rounded-xl p-5">
            <div className="hidden grid-cols-[1fr_auto_auto] gap-3 border-b border-line pb-3 text-xs font-bold uppercase tracking-[0.12em] text-ink-soft sm:grid">
              <span>Invoice</span>
              <span>Status</span>
              <span className="text-right">Nominal</span>
            </div>
            <div className="mobile-list sm:divide-y sm:divide-line/80">
              {billings.map((billing) => (
                <div
                  key={billing.id}
                  className="mobile-list-row grid gap-3 rounded-xl border border-line/70 bg-white p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:border-0 sm:bg-transparent sm:p-0 sm:py-4"
                >
                  <div>
                    <p className="mono text-sm font-bold text-ink">{billing.invoiceNo}</p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {shortMonth(billing.period)} - tempo {formatDate(billing.dueDate)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:contents">
                    <StatusBadge status={billing.status} />
                    <p className="mono text-right text-lg font-bold text-ink sm:text-base">{formatCurrency(billing.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
