"use client";

import { motion } from "framer-motion";
import { Building2, CheckCircle2, Copy, Landmark, QrCode, ShieldCheck, Upload, WalletCards, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, ErrorState, SkeletonBlock } from "@/components/ui";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, shortMonth } from "@/lib/format";
import type { Billing, MeResponse } from "@/lib/types";

const methods = [
  { id: "QRIS", title: "QRIS", desc: "Scan cepat dari semua mobile banking dan e-wallet", icon: QrCode },
  { id: "Transfer SEABANK", title: "SEABANK", desc: "Transfer bank ke rekening SEABANK", icon: Landmark },
  { id: "Transfer JAGO", title: "JAGO", desc: "Transfer bank ke rekening JAGO", icon: Landmark },
  { id: "DANA", title: "DANA", desc: "Transfer manual ke nomor DANA", icon: Building2 }
];

const paymentDetails: Record<string, { label: string; value: string; note: string }> = {
  "Transfer SEABANK": {
    label: "No. Rekening SEABANK",
    value: "901212661390",
    note: "a.n Audrey Faisal Riza, Transfer sesuai nominal tagihan lalu kirim pembayaran untuk di cek admin."
  },
  "Transfer JAGO": {
    label: "No. Rekening JAGO",
    value: "109275713735",
    note: "a.n Audrey Faisal Riza, Transfer sesuai nominal tagihan lalu kirim pembayaran untuk di cek admin."
  },
  "DANA": {
    label: "Konfirmasi admin",
    value: "085179657739",
    note: "a.n Audrey Faisal Riza, Transfer sesuai nominal tagihan lalu kirim pembayaran untuk di cek admin."
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
  const [qrisOpen, setQrisOpen] = useState(false);
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

  async function copyPaymentValue(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    showToast({ title: `${label} disalin.`, tone: "success" });
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
        <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
          <section className="glass-panel rounded-xl p-4 sm:p-5">
            <div className="mb-5 rounded-xl border border-line bg-white p-3 sm:p-4">
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
                        ? "border-ocean/40 bg-white shadow-soft ring-4 ring-ocean/5"
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
            <PaymentInstruction method={method} totalAmount={totalAmount} onCopy={copyPaymentValue} onOpenQris={() => setQrisOpen(true)} />
            <div className="mt-4 rounded-xl border border-line bg-white p-3 sm:p-4">
              <p className="text-sm font-bold text-ink">Upload bukti transfer</p>
              <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-ocean/45 bg-ocean/5 px-4 py-7 text-center shadow-inner hover:bg-white sm:border sm:border-ocean/30 sm:bg-mist/60 sm:py-6">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-ocean text-white shadow-soft sm:h-auto sm:w-auto sm:bg-transparent sm:text-ocean sm:shadow-none">
                  <Upload className="h-7 w-7 sm:h-5 sm:w-5" />
                </span>
                <span className="mt-3 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white sm:mt-2 sm:bg-transparent sm:px-0 sm:py-0 sm:text-ink">
                  {proof ? proof.name : "Ketuk untuk pilih bukti"}
                </span>
                <span className="mt-2 text-xs font-bold text-ocean sm:mt-1 sm:font-semibold sm:text-ink-soft">
                  JPG, PNG, atau WEBP maksimal 2 MB
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadProof(event.target.files?.[0] || null)} />
              </label>
            </div>
          </section>

          <section className="rounded-xl bg-ink p-6 text-white shadow-lift">
            <p className="text-sm font-bold text-white/60">Total pembayaran</p>
            <p className="mono mt-2 text-4xl font-bold">{formatCurrency(totalAmount)}</p>
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              <p className="text-sm font-semibold leading-6 text-white/75">
                Pastikan nominal sama dengan total tagihan, lalu upload bukti agar admin bisa verifikasi lebih cepat.
              </p>
            </div>
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

      {qrisOpen ? <QrisModal onClose={() => setQrisOpen(false)} /> : null}
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

function PaymentInstruction({
  method,
  totalAmount,
  onCopy,
  onOpenQris
}: {
  method: string;
  totalAmount: number;
  onCopy: (value: string, label: string) => void;
  onOpenQris: () => void;
}) {
  if (method === "QRIS") {
    return (
      <div className="mt-4 overflow-hidden rounded-xl border border-success/15 bg-white shadow-soft">
        <div className="border-b border-line bg-success-soft px-4 py-3">
          <p className="text-sm font-bold text-success">QRIS SinyalKita</p>
          <p className="mt-1 text-xs font-semibold text-success/80">Scan, bayar, lalu upload bukti transaksi.</p>
        </div>
        <div className="grid gap-4 p-3 sm:grid-cols-[220px_1fr] sm:items-center sm:p-4">
          <div className="relative mx-auto grid aspect-square w-36 place-items-center rounded-xl border border-line bg-white p-2 shadow-soft sm:w-full sm:p-4">
            <Image
              src="/payments/qris/qris.jpg"
              alt="QRIS SinyalKita"
              width={210}
              height={210}
              className="relative z-10 h-auto max-h-full w-auto max-w-full object-contain"
              unoptimized
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
            <span className="absolute inset-4 hidden place-items-center text-center text-xs font-bold text-ink-soft sm:grid">
              Letakkan gambar QRIS di public/payments/qris/qris.jpg
            </span>
          </div>
          <div>
            <p className="text-sm font-bold text-ink">Nominal yang harus dibayar</p>
            <p className="mono mt-2 text-3xl font-bold text-ink">{formatCurrency(totalAmount)}</p>
            <Button type="button" variant="ghost" className="mt-3 bg-mist sm:hidden" onClick={onOpenQris}>
              <QrCode className="h-4 w-4" />
              Perjelas QRIS
            </Button>
            <div className="mt-4 grid gap-2 text-sm font-semibold leading-6 text-ink-soft">
              <p>1. Buka mobile banking atau e-wallet.</p>
              <p>2. Scan QRIS dan masukkan nominal sesuai total pembayaran.</p>
              <p>3. Simpan bukti transaksi, lalu upload di bawah.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const detail = paymentDetails[method] || paymentDetails["Transfer SEABANK"];
  return (
    <div className="mt-4 rounded-xl border border-line bg-white p-4 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-ink">{detail.label}</p>
          <p className="mono mt-2 text-2xl font-bold text-ink">{detail.value}</p>
        </div>
        <Button type="button" variant="ghost" className="bg-mist sm:bg-white" onClick={() => onCopy(detail.value, detail.label)}>
          <Copy className="h-4 w-4" />
          Salin
        </Button>
      </div>
      <div className="mt-4 rounded-xl bg-mist/70 p-4">
        <LineLight label="Nominal" value={formatCurrency(totalAmount)} />
        <LineLight label="Atas nama" value="Audrey Faisal Riza" />
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-ink-soft">{detail.note}</p>
    </div>
  );
}

function LineLight({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1 text-sm">
      <span className="font-semibold text-ink-soft">{label}</span>
      <span className="text-right font-bold text-ink">{value}</span>
    </div>
  );
}

function QrisModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/55 px-4 py-6 backdrop-blur-md sm:hidden">
      <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-lift">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="font-heading text-lg font-bold text-ink">QRIS SinyalKita</p>
            <p className="text-xs font-semibold text-ink-soft">Perbesar layar untuk scan lebih jelas.</p>
          </div>
          <button
            type="button"
            aria-label="Tutup QRIS"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mist text-ink-soft hover:bg-danger-soft hover:text-danger"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative grid aspect-square place-items-center rounded-xl border border-line bg-white p-3">
          <Image
            src="/payments/qris/qris.jpg"
            alt="QRIS SinyalKita diperbesar"
            width={340}
            height={340}
            className="relative z-10 h-auto max-h-full w-auto max-w-full object-contain"
            unoptimized
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <span className="hidden">
            Letakkan gambar QRIS di public/payments/qris/qris.jpg
          </span>
        </div>
      </div>
    </div>
  );
}
