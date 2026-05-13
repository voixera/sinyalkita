"use client";

import { Activity, Copy, KeyRound, Plus, RefreshCw, UsersRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, ErrorState, SkeletonBlock, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

type Row = {
  customerId: string;
  loginId: string;
  name: string;
  packageName: string;
  serviceStatus: string;
  billingStatus: string;
  amount: number;
};

type PackageOption = {
  id: string;
  name: string;
  speedMbps: number;
  monthlyPrice: number;
  description: string;
};

type GeneratedCredentials = {
  loginId: string;
  password: string;
};

type Summary = {
  totalCustomers: number;
  activeCustomers: number;
  unpaidBillings: number;
};

export default function AdminPage() {
  const [customers, setCustomers] = useState<Row[] | null>(null);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalCustomers: 0, activeCustomers: 0, unpaidBillings: 0 });
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState<GeneratedCredentials | null>(null);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    api
      .adminOverview()
      .then((data) => {
        setCustomers(data.customers);
        setSummary(data.summary);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Data admin belum dapat dimuat."));
    api.adminPackages().then((data) => setPackages(data.packages)).catch(() => setPackages([]));
  }, []);

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setGenerated(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") || ""),
      password: String(form.get("password") || ""),
      phone: String(form.get("phone") || ""),
      address: String(form.get("address") || ""),
      packageId: String(form.get("packageId") || ""),
      email: String(form.get("email") || ""),
      monthlyAmount: Number(form.get("monthlyAmount") || 0) || undefined
    };

    try {
      const result = await api.createCustomer(payload);
      setCustomers((current) => [result.customer, ...(current || [])]);
      setSummary((current) => ({
        totalCustomers: current.totalCustomers + 1,
        activeCustomers: current.activeCustomers + 1,
        unpaidBillings: current.unpaidBillings + (result.customer.billingStatus === "UNPAID" ? 1 : 0)
      }));
      setGenerated(result.credentials);
      event.currentTarget.reset();
      setPassword("");
      showToast({ title: "Akun pelanggan berhasil dibuat.", tone: "success" });
    } catch (err) {
      showToast({ title: err instanceof Error ? err.message : "Akun pelanggan belum dapat dibuat.", tone: "info" });
    } finally {
      setSubmitting(false);
    }
  }

  function generatePassword() {
    const nextPassword = createReadablePassword();
    setPassword(nextPassword);
    showToast({ title: "Kata sandi awal dibuat otomatis.", tone: "success" });
  }

  async function copyCredentials() {
    if (!generated) return;
    const text = `ID login: ${generated.loginId}\nKata sandi: ${generated.password}`;
    await navigator.clipboard.writeText(text);
    showToast({ title: "Credential pelanggan disalin.", tone: "success" });
  }

  return (
    <AppShell admin>
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold text-ink-soft">Panel internal</p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-ink">Admin Dashboard</h1>
        </div>
        <div className="flex gap-3">
          <Metric icon={UsersRound} label="Pelanggan aktif" value={String(summary.activeCustomers)} />
          <Metric icon={Activity} label="Tagihan menunggu" value={String(summary.unpaidBillings)} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="glass-panel rounded-xl p-5">
          <div className="mb-5 flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-success-soft text-success">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-ink">Generate akun pelanggan</h2>
              <p className="mt-1 text-sm font-semibold text-ink-soft">
                ID login dibuat otomatis dari nama pelanggan dan nomor unik. Setiap akun punya paket, tagihan, dan
                riwayat sendiri.
              </p>
            </div>
          </div>

          <form onSubmit={createCustomer} className="grid gap-4">
            <Field name="name" label="Nama pelanggan" placeholder="Contoh: Faisal Riza" />
            <label className="block text-sm font-bold text-ink">
              Kata sandi awal
              <div className="mt-2 flex gap-2">
                <input
                  name="password"
                  type="text"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  className="min-w-0 flex-1 rounded-xl border-line bg-white px-4 py-3 text-sm font-semibold text-ink placeholder:text-ink-soft/50"
                  placeholder="Klik generate atau isi manual"
                />
                <Button type="button" variant="ghost" className="shrink-0 bg-white" onClick={generatePassword}>
                  <RefreshCw className="h-4 w-4" />
                  Generate
                </Button>
              </div>
            </label>
            <Field name="phone" label="Nomor WhatsApp" placeholder="0812..." />
            <Field name="email" label="Email opsional" placeholder="nama@email.com" type="email" required={false} />
            <label className="block text-sm font-bold text-ink">
              Paket layanan
              <select
                name="packageId"
                required
                className="mt-2 w-full rounded-xl border-line bg-white px-4 py-3 text-sm font-semibold text-ink"
                defaultValue=""
              >
                <option value="" disabled>
                  Pilih paket
                </option>
                {packages.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} - {item.speedMbps} Mbps - {formatCurrency(item.monthlyPrice)}
                  </option>
                ))}
              </select>
            </label>
            <Field name="monthlyAmount" label="Nominal tagihan opsional" placeholder="325000" type="number" required={false} />
            <label className="block text-sm font-bold text-ink">
              Alamat layanan
              <textarea
                name="address"
                required
                minLength={8}
                rows={3}
                className="mt-2 w-full resize-none rounded-xl border-line bg-white px-4 py-3 text-sm font-semibold text-ink placeholder:text-ink-soft/50"
                placeholder="Alamat lengkap pemasangan"
              />
            </label>
            <Button disabled={submitting || packages.length === 0}>
              <Plus className="h-4 w-4" />
              {submitting ? "Membuat akun..." : "Buat akun pelanggan"}
            </Button>
          </form>

          {generated ? (
            <div className="mt-5 rounded-xl border border-success/20 bg-success-soft p-4">
              <p className="text-sm font-bold text-success">Credential siap dibagikan</p>
              <p className="mono mt-2 text-sm font-bold text-ink">ID login: {generated.loginId}</p>
              <p className="mono mt-1 text-sm font-bold text-ink">Kata sandi: {generated.password}</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-ink-soft">
                Data tagihan dan riwayat pelanggan ini tersimpan terpisah dari pelanggan lain.
              </p>
              <Button type="button" variant="ghost" className="mt-4 bg-white" onClick={copyCredentials}>
                <Copy className="h-4 w-4" />
                Salin credential
              </Button>
            </div>
          ) : null}
        </section>

        {error ? (
          <ErrorState title="Panel admin belum dapat dimuat" message={error} />
        ) : !customers ? (
          <SkeletonBlock className="h-96" />
        ) : (
          <section className="overflow-hidden rounded-xl border border-line bg-white shadow-soft">
            <div className="grid grid-cols-[1.1fr_0.9fr_1fr_auto_auto] gap-4 border-b border-line bg-mist/70 px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">
              <span>Pelanggan</span>
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
        )}
      </div>
    </AppShell>
  );
}

function Field({
  name,
  label,
  placeholder,
  type = "text",
  required = true
}: {
  name: string;
  label: string;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-bold text-ink">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        className="mt-2 w-full rounded-xl border-line bg-white px-4 py-3 text-sm font-semibold text-ink placeholder:text-ink-soft/50"
        placeholder={placeholder}
      />
    </label>
  );
}

function createReadablePassword() {
  const syllables = ["sinyal", "kita", "fiber", "net", "rumah", "akses", "wifi", "portal"];
  const first = syllables[Math.floor(Math.random() * syllables.length)];
  const second = syllables[Math.floor(Math.random() * syllables.length)];
  const number = Math.floor(1000 + Math.random() * 9000);
  return `${first}-${second}-${number}`;
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
