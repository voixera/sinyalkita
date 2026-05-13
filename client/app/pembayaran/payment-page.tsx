"use client";

import { motion } from "framer-motion";
import { Building2, CheckCircle2, Landmark, QrCode, WalletCards } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, ErrorState, SkeletonBlock } from "@/components/ui";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import type { MeResponse } from "@/lib/types";

const methods = [
  { id: "Transfer BNI", title: "BNI", desc: "Transfer bank ke rekening SinyalKita", icon: Landmark },
  { id: "Transfer BCA", title: "BCA", desc: "Transfer bank ke rekening SinyalKita", icon: Landmark },
  { id: "QRIS", title: "QRIS", desc: "Dompet digital dan mobile banking", icon: QrCode },
  { id: "Transfer Manual", title: "Transfer Manual", desc: "Konfirmasi manual ke admin", icon: Building2 }
];

const paymentDetails: Record<string, { label: string; value: string; note: string }> = {
  "Transfer BNI": {
    label: "No. Rekening BNI",
    value: "1234567890",
    note: "a.n. SinyalKita. Transfer sesuai nominal tagihan lalu kirim pembayaran untuk dicek admin."
  },
  "Transfer BCA": {
    label: "No. Rekening BCA",
    value: "0987654321",
    note: "a.n. SinyalKita. Transfer sesuai nominal tagihan lalu kirim pembayaran untuk dicek admin."
  },
  "Transfer Manual": {
    label: "Konfirmasi admin",
    value: "0812-0000-2015",
    note: "Hubungi admin setelah transfer. Admin akan mengecek pembayaran sebelum tagihan menjadi lunas."
  }
};

export default function PaymentPage() {
  const [data, setData] = useState<MeResponse | null>(null);
  const [method, setMethod] = useState(methods[0].id);
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { showToast } = useToast();
  const selectedMethod = methods.find((item) => item.id === method) || methods[0];

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
      showToast({ title: "Pembayaran dikirim dan menunggu verifikasi admin.", tone: "success" });
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
            <PaymentInstruction method={method} />
          </section>

          <section className="rounded-xl bg-ink p-6 text-white shadow-lift">
            <p className="text-sm font-bold text-white/60">Total pembayaran</p>
            <p className="mono mt-2 text-4xl font-bold">{formatCurrency(data.currentBilling.amount)}</p>
            <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm">
              <Line label="Invoice" value={data.currentBilling.invoiceNo} mono />
              <Line label="Jatuh tempo" value={formatDate(data.currentBilling.dueDate)} />
              <Line label="Metode" value={selectedMethod.title} />
            </div>
            <Button onClick={pay} disabled={loading || paid} className="mt-6 w-full bg-success text-white hover:bg-success/90">
              {loading ? "Mencatat pembayaran..." : paid ? "Menunggu verifikasi" : "Kirim pembayaran"}
            </Button>
            {paid ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 rounded-xl border border-success/20 bg-success/15 p-4 text-sm font-semibold text-white"
              >
                Pembayaran berhasil dikirim. Admin akan mengecek dan menyetujui pembayaran sebelum tagihan menjadi lunas.
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

function PaymentInstruction({ method }: { method: string }) {
  if (method === "QRIS") {
    return (
      <div className="mt-4 rounded-xl border border-line bg-white p-4">
        <p className="text-sm font-bold text-ink">QRIS SinyalKita</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
          <div className="relative grid aspect-square place-items-center rounded-xl border border-dashed border-line bg-mist p-3">
            <Image
              src="/payments/qris/qris.png"
              alt="QRIS SinyalKita"
              width={160}
              height={160}
              className="relative z-10 h-40 w-40 object-contain"
              unoptimized
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
            <span className="absolute inset-4 grid place-items-center text-center text-xs font-bold text-ink-soft">
              Letakkan gambar QRIS di public/payments/qris/qris.png
            </span>
          </div>
          <p className="text-sm font-semibold leading-6 text-ink-soft">
            Scan QRIS, bayar sesuai nominal tagihan, lalu klik Kirim pembayaran agar admin mengecek transaksi.
          </p>
        </div>
      </div>
    );
  }

  const detail = paymentDetails[method];
  return (
    <div className="mt-4 rounded-xl border border-line bg-white p-4">
      <p className="text-sm font-bold text-ink">{detail.label}</p>
      <p className="mono mt-2 text-2xl font-bold text-ink">{detail.value}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-ink-soft">{detail.note}</p>
    </div>
  );
}
