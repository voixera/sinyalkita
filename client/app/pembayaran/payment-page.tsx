"use client";

import { motion } from "framer-motion";
import { Building2, CheckCircle2, Landmark, QrCode, Upload, WalletCards } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, ErrorState, SkeletonBlock } from "@/components/ui";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, shortMonth } from "@/lib/format";
import type { Billing, MeResponse } from "@/lib/types";

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
  const [billings, setBillings] = useState<Billing[] | null>(null);
  const [selectedBillingIds, setSelectedBillingIds] = useState<string[]>([]);
  const [method, setMethod] = useState(methods[0].id);
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [proof, setProof] = useState<{ image: string; name: string } | null>(null);
  const { showToast } = useToast();
  const selectedMethod = methods.find((item) => item.id === method) || methods[0];
  const payableBillings = (billings || []).filter((billing) => billing.status !== "PAID");
  const selectedBillings = payableBillings.filter((billing) => selectedBillingIds.includes(billing.id));
  const totalAmount = selectedBillings.reduce((total, billing) => total + billing.amount, 0);

  useEffect(() => {
    Promise.all([api.me(), api.billings()])
      .then(([me, billingData]) => {
        const payable = billingData.billings.filter((billing) => billing.status !== "PAID");
        setData(me);
        setBillings(billingData.billings);
        setSelectedBillingIds(payable[0] ? [payable[0].id] : []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Data pembayaran belum dapat dimuat."));
  }, []);

  async function pay() {
    if (!data || !proof || selectedBillingIds.length === 0) return;
    setLoading(true);
    try {
      await api.pay(selectedBillingIds, method, proof);
      setPaid(true);
      showToast({ title: "Pembayaran dikirim dan menunggu verifikasi admin.", tone: "success" });
    } catch (err) {
      showToast({ title: err instanceof Error ? err.message : "Pembayaran belum dapat diproses.", tone: "info" });
    } finally {
      setLoading(false);
    }
  }

  function uploadProof(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast({ title: "Bukti transfer harus berupa gambar.", tone: "info" });
      return;
    }
    if (file.size > 2_000_000) {
      showToast({ title: "Ukuran bukti maksimal 2 MB.", tone: "info" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProof({ image: String(reader.result), name: file.name });
      showToast({ title: "Bukti transfer siap dikirim.", tone: "success" });
    };
    reader.readAsDataURL(file);
  }

  function toggleBilling(billingId: string) {
    setPaid(false);
    setSelectedBillingIds((current) =>
      current.includes(billingId) ? current.filter((id) => id !== billingId) : [...current, billingId]
    );
  }

  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-sm font-bold text-ink-soft">Pembayaran tagihan</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-ink">Pembayaran</h1>
      </div>

      {error ? (
        <ErrorState title="Pembayaran belum dapat dimuat" message={error} />
      ) : !data || !billings ? (
        <SkeletonBlock className="h-96" />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="glass-panel rounded-xl p-5">
            <div className="mb-5 rounded-xl border border-line bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-heading text-xl font-bold text-ink">Pilih tagihan</p>
                  <p className="mt-1 text-sm text-ink-soft">User dapat membayar satu atau beberapa tagihan sekaligus.</p>
                </div>
                {payableBillings.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setSelectedBillingIds(payableBillings.map((billing) => billing.id))}
                    className="rounded-lg px-3 py-2 text-xs font-bold text-ocean hover:bg-mist"
                  >
                    Pilih semua
                  </button>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3">
                {payableBillings.length === 0 ? (
                  <p className="rounded-xl bg-mist/70 p-4 text-sm font-semibold text-ink-soft">Tidak ada tagihan yang perlu dibayar.</p>
                ) : (
                  payableBillings.map((billing) => {
                    const active = selectedBillingIds.includes(billing.id);
                    return (
                      <button
                        key={billing.id}
                        type="button"
                        onClick={() => toggleBilling(billing.id)}
                        className={`flex items-center justify-between gap-4 rounded-xl border p-4 text-left ${
                          active ? "border-ocean/30 bg-mist shadow-soft" : "border-line bg-white hover:border-ocean/25"
                        }`}
                      >
                        <span>
                          <span className="block font-bold text-ink">{shortMonth(billing.period)}</span>
                          <span className="mt-1 block text-sm text-ink-soft">Jatuh tempo {formatDate(billing.dueDate)}</span>
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="mono font-bold text-ink">{formatCurrency(billing.amount)}</span>
                          {active ? <CheckCircle2 className="h-5 w-5 text-success" /> : null}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-success-soft text-success">
                <WalletCards className="h-5 w-5" />
              </div>
              <div>
                <p className="font-heading text-xl font-bold text-ink">Pilih metode</p>
                <p className="text-sm text-ink-soft">Pilih metode pembayaran yang tersedia untuk user aktif.</p>
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
            <div className="mt-4 rounded-xl border border-line bg-white p-4">
              <p className="text-sm font-bold text-ink">Upload bukti transfer</p>
              <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-ocean/30 bg-mist/60 px-4 py-6 text-center hover:bg-white">
                <Upload className="h-5 w-5 text-ocean" />
                <span className="mt-2 text-sm font-bold text-ink">{proof ? proof.name : "Pilih gambar bukti pembayaran"}</span>
                <span className="mt-1 text-xs font-semibold text-ink-soft">JPG, PNG, atau WEBP maksimal 2 MB</span>
                <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadProof(event.target.files?.[0] || null)} />
              </label>
            </div>
          </section>

          <section className="rounded-xl bg-ink p-6 text-white shadow-lift">
            <p className="text-sm font-bold text-white/60">Total pembayaran</p>
            <p className="mono mt-2 text-4xl font-bold">{formatCurrency(totalAmount)}</p>
            <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm">
              <Line label="Tagihan dipilih" value={`${selectedBillings.length} tagihan`} />
              <Line
                label="Invoice"
                value={selectedBillings.map((billing) => billing.invoiceNo).join(", ") || "-"}
                mono
              />
              <Line label="Metode" value={selectedMethod.title} />
            </div>
            <Button
              onClick={pay}
              disabled={loading || paid || !proof || selectedBillingIds.length === 0}
              className="mt-6 w-full bg-success text-white hover:bg-success/90"
            >
              {loading
                ? "Mencatat pembayaran..."
                : paid
                  ? "Menunggu verifikasi"
                  : !proof
                    ? "Upload bukti dulu"
                    : selectedBillingIds.length === 0
                      ? "Pilih tagihan dulu"
                      : "Kirim pembayaran"}
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
              src="/payments/qris/qris.jpg"
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
              Letakkan gambar QRIS di public/payments/qris/qris.jpg
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
