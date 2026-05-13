"use client";

import { motion } from "framer-motion";
import { LockKeyhole } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui";
import { useToast } from "@/components/toast";

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(loginId, password);
      showToast({ title: "Berhasil masuk ke web SinyalKita.", tone: "success" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "ID login atau kata sandi belum sesuai.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-mist px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Link href="/" className="mx-auto mb-8 flex w-fit items-center gap-3 rounded-xl px-3 py-2 hover:bg-white">
          <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-white shadow-soft">
            <Image src="/images/logoSinyalKita.png" alt="Logo SinyalKita" width={40} height={40} className="h-10 w-10 object-contain" />
          </span>
          <span className="font-heading text-xl font-bold text-ink">SinyalKita</span>
        </Link>

        <form onSubmit={onSubmit} className="glass-panel rounded-xl p-6 shadow-lift sm:p-8">
          <div className="mb-7">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-success-soft text-success">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-ink">Masuk User</h1>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Web resmi user SinyalKita. Akun hanya dapat dibuat oleh admin.
            </p>
          </div>

          <label className="block text-sm font-bold text-ink" htmlFor="loginId">
            ID login
          </label>
          <input
            id="loginId"
            type="text"
            value={loginId}
            onChange={(event) => setLoginId(event.target.value)}
            className="mt-2 w-full rounded-xl border-line bg-white px-4 py-3 text-sm font-semibold text-ink placeholder:text-ink-soft/50"
            placeholder="contoh: faisalriza00123"
            autoComplete="username"
            required
          />

          <label className="mt-5 block text-sm font-bold text-ink" htmlFor="password">
            Kata sandi
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-xl border-line bg-white px-4 py-3 text-sm font-semibold text-ink placeholder:text-ink-soft/50"
            placeholder="Masukkan kata sandi"
            autoComplete="current-password"
            required
          />

          {error ? (
            <div className="mt-4 rounded-xl border border-danger/15 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
              {error}
            </div>
          ) : null}

          <Button className="mt-6 w-full" disabled={loading}>
            {loading ? "Memeriksa akses..." : "Masuk ke Web"}
          </Button>

          <p className="mt-5 rounded-xl border border-line/80 bg-mist/70 p-4 text-xs font-semibold leading-5 text-ink-soft">
            Gunakan ID login dan kata sandi yang diberikan oleh admin SinyalKita.
          </p>
        </form>
      </motion.div>
    </main>
  );
}
