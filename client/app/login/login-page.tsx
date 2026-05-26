"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, KeyRound, LockKeyhole, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui";
import { api } from "@/lib/api";

type AuthMode = "login" | "forgot" | "reset";

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const HeaderIcon = mode === "forgot" ? Mail : mode === "reset" ? KeyRound : LockKeyhole;
  const title = mode === "forgot" ? "Lupa Kata Sandi" : mode === "reset" ? "Reset Kata Sandi" : "Masuk User";
  const description =
    mode === "forgot"
      ? "Masukkan ID login atau email terdaftar. Kode reset akan dikirim melalui email akun user."
      : mode === "reset"
        ? resetEmail
          ? `Kode reset sudah dikirim ke ${resetEmail}.`
          : "Masukkan kode reset dari email terdaftar dan buat kata sandi baru."
        : "Web resmi user SinyalKita. Akun hanya dapat dibuat oleh admin.";

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

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendResetCode(resetIdentifier);
  }

  async function resendResetCode() {
    await sendResetCode(resetIdentifier);
  }

  async function sendResetCode(identifier: string) {
    const normalizedIdentifier = identifier.trim();
    setError("");

    if (!normalizedIdentifier) {
      setError("Masukkan ID login atau email terdaftar.");
      return;
    }

    setLoading(true);
    try {
      const result = await api.requestPasswordReset(normalizedIdentifier);
      setResetIdentifier(normalizedIdentifier);
      setResetEmail(result.email || "");
      setMode("reset");
      showToast({ title: result.message, tone: "success" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kode reset belum dapat dikirim.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Kata sandi baru minimal 6 karakter.");
      return;
    }

    setLoading(true);
    try {
      const result = await api.confirmPasswordReset({
        identifier: resetIdentifier,
        code: resetCode,
        password: newPassword
      });
      if (!resetIdentifier.includes("@")) setLoginId(resetIdentifier);
      setPassword("");
      setResetCode("");
      setNewPassword("");
      setResetEmail("");
      setMode("login");
      showToast({ title: result.message, tone: "success" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kata sandi belum dapat direset.");
    } finally {
      setLoading(false);
    }
  }

  function openForgotPassword() {
    setError("");
    setResetIdentifier(loginId);
    setResetCode("");
    setNewPassword("");
    setResetEmail("");
    setMode("forgot");
  }

  function backToLogin() {
    setError("");
    setMode("login");
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

        <form onSubmit={mode === "login" ? onSubmit : mode === "forgot" ? requestReset : confirmReset} className="glass-panel rounded-xl p-6 shadow-lift sm:p-8">
          <div className="mb-7">
            {mode !== "login" ? (
              <button
                type="button"
                onClick={backToLogin}
                className="mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-bold text-ink-soft hover:bg-white hover:text-ink"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali login
              </button>
            ) : null}
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-success-soft text-success">
              <HeaderIcon className="h-5 w-5" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-ink">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-ink-soft">{description}</p>
          </div>

          {mode === "login" ? (
            <>
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

              <div className="mt-5 flex items-center justify-between gap-3">
                <label className="block text-sm font-bold text-ink" htmlFor="password">
                  Kata sandi
                </label>
                <button
                  type="button"
                  onClick={openForgotPassword}
                  className="text-xs font-bold text-ocean hover:text-ink"
                >
                  Lupa kata sandi?
                </button>
              </div>
              <div className="relative mt-2">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border-line bg-white px-4 py-3 pr-12 text-sm font-semibold text-ink placeholder:text-ink-soft/50"
                  placeholder="Masukkan kata sandi"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-ink-soft hover:bg-mist hover:text-ink"
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </>
          ) : null}

          {mode === "forgot" ? (
            <>
              <label className="block text-sm font-bold text-ink" htmlFor="resetIdentifier">
                ID login atau email
              </label>
              <input
                id="resetIdentifier"
                type="text"
                value={resetIdentifier}
                onChange={(event) => setResetIdentifier(event.target.value)}
                className="mt-2 w-full rounded-xl border-line bg-white px-4 py-3 text-sm font-semibold text-ink placeholder:text-ink-soft/50"
                placeholder="contoh: faisalriza00123"
                autoComplete="username"
                required
              />
            </>
          ) : null}

          {mode === "reset" ? (
            <>
              <label className="block text-sm font-bold text-ink" htmlFor="resetCode">
                Kode reset
              </label>
              <input
                id="resetCode"
                type="text"
                value={resetCode}
                onChange={(event) => setResetCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="mt-2 w-full rounded-xl border-line bg-white px-4 py-3 text-sm font-semibold text-ink placeholder:text-ink-soft/50"
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />

              <label className="mt-5 block text-sm font-bold text-ink" htmlFor="newPassword">
                Kata sandi baru
              </label>
              <div className="relative mt-2">
                <input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-xl border-line bg-white px-4 py-3 pr-12 text-sm font-semibold text-ink placeholder:text-ink-soft/50"
                  placeholder="Minimal 6 karakter"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((current) => !current)}
                  className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-ink-soft hover:bg-mist hover:text-ink"
                  aria-label={showNewPassword ? "Sembunyikan kata sandi baru" : "Tampilkan kata sandi baru"}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <button
                type="button"
                onClick={resendResetCode}
                disabled={loading}
                className="mt-4 text-xs font-bold text-ocean hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                Kirim ulang kode
              </button>
            </>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-xl border border-danger/15 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
              {error}
            </div>
          ) : null}

          <Button className="mt-6 w-full" disabled={loading}>
            {loading
              ? mode === "forgot"
                ? "Mengirim kode..."
                : mode === "reset"
                  ? "Mereset password..."
                  : "Memeriksa akses..."
              : mode === "forgot"
                ? "Kirim Kode Reset"
                : mode === "reset"
                  ? "Reset Password"
                  : "Masuk ke Web"}
          </Button>

          <p className="mt-5 rounded-xl border border-line/80 bg-mist/70 p-4 text-xs font-semibold leading-5 text-ink-soft">
            {mode === "login"
              ? "Gunakan ID login dan kata sandi yang diberikan oleh admin SinyalKita."
              : "Kode reset hanya berlaku sementara dan dikirim ke email yang tercantum saat akun dibuat."}
          </p>
        </form>
      </motion.div>
    </main>
  );
}
