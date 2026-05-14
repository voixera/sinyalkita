"use client";

import { Copy, KeyRound, Plus, RefreshCw } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Button, ErrorState, SkeletonBlock } from "@/components/ui";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

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

const serverPrices: Record<string, number> = {
  "Server Jombok": 65000,
  "Server Kepung": 100000,
  "Server Pare": 65000
};

export default function GenerateAccountPage() {
  const [packages, setPackages] = useState<PackageOption[] | null>(null);
  const [serverName, setServerName] = useState("Server Jombok");
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState<GeneratedCredentials | null>(null);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { ready, user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (!ready || user?.role !== "ADMIN") return;

    api
      .adminPackages()
      .then((data) => setPackages(data.packages))
      .catch((err) => setError(err instanceof Error ? err.message : "Paket layanan belum dapat dimuat."));
  }, [ready, user?.role]);

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
      serverName: String(form.get("serverName") || "Server Jombok"),
      packageId: String(form.get("packageId") || ""),
      email: String(form.get("email") || "")
    };

    try {
      const result = await api.createCustomer(payload);
      if (!result.credentials?.loginId || !result.credentials?.password) {
        throw new Error("Akun dibuat, tetapi credential belum diterima. Cek riwayat akun.");
      }
      setGenerated(result.credentials);
      event.currentTarget.reset();
      setPassword("");
      setServerName("Server Jombok");
      showToast({ title: `Akun ${result.credentials.loginId} berhasil dibuat.`, tone: "success" });
    } catch (err) {
      showToast({ title: err instanceof Error ? err.message : "Akun user belum dapat dibuat.", tone: "info" });
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
    showToast({ title: "Credential user disalin.", tone: "success" });
  }

  return (
    <AppShell admin>
      <div className="mb-6">
        <p className="text-sm font-bold text-ink-soft">Pembuatan akun</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-ink">Generate Akun User</h1>
      </div>

      {error ? (
        <ErrorState title="Generate akun belum dapat dibuka" message={error} />
      ) : !packages ? (
        <SkeletonBlock className="h-96" />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="glass-panel rounded-xl p-5">
            <div className="mb-5 flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-success-soft text-success">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold text-ink">Data akun user</h2>
                <p className="mt-1 text-sm font-semibold text-ink-soft">
                  ID login dibuat otomatis dari nama user dan nomor unik. User baru diberi masa aktif 1 bulan
                  sebelum tagihan pertama jatuh tempo.
                </p>
              </div>
            </div>

            <form onSubmit={createCustomer} className="grid gap-4">
              <Field name="name" label="Nama user" placeholder="Contoh: Faisal Riza" />
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
                Server
                <select
                  name="serverName"
                  required
                  className="mt-2 w-full rounded-xl border-line bg-white px-4 py-3 text-sm font-semibold text-ink"
                  value={serverName}
                  onChange={(event) => setServerName(event.target.value)}
                >
                  <option value="Server Jombok">Server Jombok</option>
                  <option value="Server Kepung">Server Kepung</option>
                  <option value="Server Pare">Server Pare</option>
                </select>
              </label>
              <div className="rounded-xl border border-line bg-mist/70 p-4">
                <p className="text-sm font-bold text-ink">Paket layanan</p>
                <p className="mt-1 font-semibold text-ink-soft">
                  {packages[0]?.name || "WiFi Bulanan"} {packages[0]?.speedMbps || 10} Mbps - {formatCurrency(serverPrices[serverName] || 65000)}
                </p>
                <p className="mt-1 text-xs font-bold text-ink-soft">Kepung 100rb/bulan, Pare dan Jombok 65rb/bulan.</p>
                <p className="mt-2 text-xs font-semibold leading-5 text-ink-soft">
                  Tagihan pertama dibuat untuk periode bulan depan dan tidak langsung ditagihkan saat akun dibuat.
                </p>
                <input type="hidden" name="packageId" value={packages[0]?.id || "pkg_wifi_bulanan_65"} />
              </div>
              <label className="block text-sm font-bold text-ink">
                Alamat layanan
                <textarea
                  name="address"
                  required
                  minLength={8}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-xl border-line bg-white px-4 py-3 text-sm font-semibold text-ink placeholder:text-ink-soft/50"
                  placeholder="Alamat lengkap layanan"
                />
              </label>
              <Button disabled={submitting || packages.length === 0}>
                <Plus className="h-4 w-4" />
                {submitting ? "Membuat akun..." : "Buat akun user"}
              </Button>
            </form>
          </section>

          <section className="rounded-xl border border-line bg-white p-5 shadow-soft">
            <p className="font-heading text-xl font-bold text-ink">Credential terakhir</p>
            {generated ? (
              <div className="mt-5 rounded-xl border border-success/20 bg-success-soft p-4">
                <p className="text-sm font-bold text-success">Siap dibagikan ke user</p>
                <p className="mono mt-2 text-sm font-bold text-ink">ID login: {generated.loginId}</p>
                <p className="mono mt-1 text-sm font-bold text-ink">Kata sandi: {generated.password}</p>
                <p className="mt-2 text-xs font-semibold leading-5 text-ink-soft">
                  Simpan credential ini sebelum membuat akun berikutnya.
                </p>
                <Button type="button" variant="ghost" className="mt-4 bg-white" onClick={copyCredentials}>
                  <Copy className="h-4 w-4" />
                  Salin credential
                </Button>
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-line bg-mist/70 p-4 text-sm font-semibold text-ink-soft">
                Credential akan muncul setelah akun user dibuat.
              </p>
            )}
          </section>
        </div>
      )}
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
  const syllables = ["sinyal", "kita", "fiber", "net", "rumah", "akses", "wifi", "web"];
  const first = syllables[Math.floor(Math.random() * syllables.length)];
  const second = syllables[Math.floor(Math.random() * syllables.length)];
  const number = Math.floor(1000 + Math.random() * 9000);
  return `${first}-${second}-${number}`;
}
