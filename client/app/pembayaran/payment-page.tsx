"use client";

import { motion } from "framer-motion";
import { Building2, CheckCircle2, Landmark, QrCode, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, ErrorState, SkeletonBlock } from "@/components/ui";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import type { MeResponse } from "@/lib/types";

const methods = [
  { id: "Virtual Account BCA", title: "Virtual Account", desc: "BCA, Mandiri, BNI", icon: Landmark },
  { id: "QRIS", title: "QRIS", desc: "Dompet digital dan mobile banking", icon: QrCode },
  { id: "Transfer Manual", title: "Transfer Manual", desc: "Verifikasi operasional", icon: Building2 }
];

export default function PaymentPage() {
  const [data, setData] = useState<MeResponse | null>(null);
  const [method, setMethod] = useState(methods[0].id);
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    api
      .me()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Data pembayaran belum dapat dimuat."));
  }, []);

  async function pay() {
    if (!data) return;
    setLoading(true);
    try {
      await api.pay(data.currentBilling.id, method);
      setPaid(true);
      showToast({ title: "Pembayaran berhasil dicatat.", tone: "success" });
    } catch (err) {
      showToast({ title: err instanceof Error ? err.message : "Pembayaran belum dapat diproses.", tone: "info" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-sm font-bold text-ink-soft">Pembayaran tagihan</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-ink">Pembayaran</h1>
      </div>

      {error ? (
        <ErrorState title="Pembayaran belum dapat dimuat" message={error} />
      ) : !data ? (
        <SkeletonBlock className="h-96" />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="glass-panel rounded-xl p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-success-soft text-success">
                <WalletCards className="h-5 w-5" />
              </div>
              <div>
                <p className="font-heading text-xl font-bold text-ink">Pilih metode</p>
                <p className="text-sm text-ink-soft">Pilih salah satu metode yang tersedia untuk pelanggan aktif.</p>
              </div>
            </div>
            <div className="grid gap-3">
              {methods.map((item) => {
                const Icon = item.icon;
                const active = item.id === method;
                return (
                  <button
                    key={item.id}
                    onClick={() => setMethod(item.id)}
                    className={`flex items-center gap-4 rounded-xl border p-4 text-left ${
                      active
                        ? "border-ocean/30 bg-white shadow-soft"
                        : "border-line bg-white/65 hover:-translate-y-0.5 hover:border-ocean/25 hover:bg-white"
                    }`}
                  >
                    <span className={`grid h-11 w-11 place-items-center rounded-xl ${active ? "bg-ink text-white" : "bg-mist text-ocean"}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="flex-1">
                      <span className="block font-bold text-ink">{item.title}</span>
                      <span className="text-sm text-ink-soft">{item.desc}</span>
                    </span>
                    {active ? <CheckCircle2 className="h-5 w-5 text-success" /> : null}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl bg-ink p-6 text-white shadow-lift">
            <p className="text-sm font-bold text-white/60">Total pembayaran</p>
            <p className="mono mt-2 text-4xl font-bold">{formatCurrency(data.currentBilling.amount)}</p>
            <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm">
              <Line label="Invoice" value={data.currentBilling.invoiceNo} mono />
              <Line label="Jatuh tempo" value={formatDate(data.currentBilling.dueDate)} />
              <Line label="Metode" value={method} />
            </div>
            <Button onClick={pay} disabled={loading || paid} className="mt-6 w-full bg-white text-ink hover:bg-success-soft">
              {loading ? "Mencatat pembayaran..." : paid ? "Pembayaran tercatat" : "Bayar sekarang"}
            </Button>
            {paid ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 rounded-xl border border-success/20 bg-success/15 p-4 text-sm font-semibold text-white"
              >
                Pembayaran berhasil. Riwayat akan diperbarui setelah sistem memproses settlement.
              </motion.div>
            ) : null}
          </section>
        </div>
      )}
    </AppShell>
  );
}

function Line({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-white/55">{label}</span>
      <span className={`${mono ? "mono" : ""} text-right font-bold`}>{value}</span>
    </div>
  );
}
