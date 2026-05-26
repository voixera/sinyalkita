"use client";

import { Camera, MailCheck, Save, Trash2, UserRound } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useToast } from "@/components/toast";
import { Button, ErrorState, SkeletonBlock } from "@/components/ui";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

export default function ProfileSettingsPage({ admin = false }: { admin?: boolean }) {
  const [profile, setProfile] = useState<User | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSentTo, setEmailCodeSentTo] = useState("");
  const [error, setError] = useState("");
  const [photoSaving, setPhotoSaving] = useState(false);
  const [emailRequesting, setEmailRequesting] = useState(false);
  const [emailConfirming, setEmailConfirming] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    api
      .profile()
      .then((data) => {
        setProfile(data.profile);
        setProfileImage(data.profile.profileImage);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Profil belum dapat dimuat."));
  }, []);

  const initials = useMemo(() => {
    const source = profile?.name || "SK";
    return source
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [profile?.name]);

  async function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast({ title: "File harus berupa gambar.", tone: "info" });
      return;
    }

    if (file.size > 1_500_000) {
      showToast({ title: "Ukuran foto maksimal 1.5 MB.", tone: "info" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) return;
      setProfileImage(result);
    };
    reader.readAsDataURL(file);
  }

  async function savePhoto() {
    setPhotoSaving(true);
    try {
      const result = await api.updateProfile({ profileImage });
      setProfile(result.profile);
      setProfileImage(result.profile.profileImage);
      showToast({ title: "Foto profil berhasil diperbarui.", tone: "success" });
    } catch (err) {
      showToast({ title: err instanceof Error ? err.message : "Foto profil belum dapat disimpan.", tone: "info" });
    } finally {
      setPhotoSaving(false);
    }
  }

  async function requestEmailCode() {
    setEmailRequesting(true);
    setEmailCode("");
    try {
      const result = await api.requestProfileEmailChange(newEmail);
      setEmailCodeSentTo(result.email);
      showToast({ title: result.message, tone: "success" });
    } catch (err) {
      showToast({ title: err instanceof Error ? err.message : "Kode verifikasi belum dapat dikirim.", tone: "info" });
    } finally {
      setEmailRequesting(false);
    }
  }

  async function confirmEmailChange() {
    setEmailConfirming(true);
    try {
      const result = await api.confirmProfileEmailChange({ newEmail, code: emailCode });
      setProfile(result.profile);
      setNewEmail("");
      setEmailCode("");
      setEmailCodeSentTo("");
      showToast({ title: result.message, tone: "success" });
    } catch (err) {
      showToast({ title: err instanceof Error ? err.message : "Email belum dapat diperbarui.", tone: "info" });
    } finally {
      setEmailConfirming(false);
    }
  }

  return (
    <AppShell admin={admin}>
      <div className="mb-6">
        <p className="text-sm font-bold text-ink-soft">{admin ? "Akun admin" : "Akun user"}</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-ink">Pengaturan Profil</h1>
      </div>

      {error ? (
        <ErrorState title="Profil belum dapat dibuka" message={error} />
      ) : !profile ? (
        <SkeletonBlock className="h-96" />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-xl border border-line bg-white p-5 shadow-soft">
            <div className="flex flex-col items-start gap-5 sm:flex-row">
              <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-mist text-3xl font-bold text-ink shadow-soft">
                {profileImage ? (
                  <img src={profileImage} alt={profile.name} className="h-full w-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-heading text-2xl font-bold text-ink">{profile.name}</p>
                <p className="mono mt-1 text-sm font-bold text-ink-soft">{profile.loginId}</p>
                <p className="mt-3 text-sm font-semibold text-ink-soft">{profile.email || "Email belum terhubung"}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line/90 bg-white px-4 text-sm font-bold text-ink hover:border-ocean/30 hover:shadow-soft">
                    <Camera className="h-4 w-4" />
                    Pilih foto
                    <input type="file" accept="image/*" className="hidden" onChange={choosePhoto} />
                  </label>
                  <Button type="button" variant="ghost" className="bg-white" onClick={() => setProfileImage(null)}>
                    <Trash2 className="h-4 w-4" />
                    Hapus
                  </Button>
                  <Button type="button" onClick={savePhoto} disabled={photoSaving || profileImage === profile.profileImage}>
                    <Save className="h-4 w-4" />
                    {photoSaving ? "Menyimpan..." : "Simpan"}
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-line bg-white p-5 shadow-soft">
            <div className="mb-5 flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-success-soft text-success">
                <MailCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold text-ink">Email terhubung</h2>
                <p className="mt-1 text-sm font-semibold text-ink-soft">Kode dikirim ke email lama sebelum perubahan disimpan.</p>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-mist/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">Email saat ini</p>
              <p className="mt-2 font-bold text-ink">{profile.email || "Belum ada email"}</p>
            </div>

            <div className="mt-4 grid gap-4">
              <label className="block text-sm font-bold text-ink">
                Email baru
                <input
                  type="email"
                  value={newEmail}
                  onChange={(event) => {
                    setNewEmail(event.target.value);
                    setEmailCodeSentTo("");
                    setEmailCode("");
                  }}
                  className="mt-2 w-full rounded-xl border-line bg-white px-4 py-3 text-sm font-semibold text-ink placeholder:text-ink-soft/50"
                  placeholder="email-baru@example.com"
                />
              </label>

              <Button type="button" variant="ghost" className="w-fit bg-mist" onClick={requestEmailCode} disabled={emailRequesting || !newEmail}>
                <MailCheck className="h-4 w-4" />
                {emailRequesting ? "Mengirim kode..." : "Kirim kode"}
              </Button>

              {emailCodeSentTo ? (
                <p className="rounded-xl border border-success/15 bg-success-soft px-4 py-3 text-sm font-semibold text-success">
                  Kode dikirim ke {emailCodeSentTo}.
                </p>
              ) : null}

              <label className="block text-sm font-bold text-ink">
                Kode verifikasi
                <input
                  type="text"
                  value={emailCode}
                  onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="mt-2 w-full rounded-xl border-line bg-white px-4 py-3 text-sm font-semibold text-ink placeholder:text-ink-soft/50"
                  placeholder="000000"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </label>

              <Button type="button" className="w-fit" onClick={confirmEmailChange} disabled={emailConfirming || emailCode.length !== 6 || !newEmail}>
                <UserRound className="h-4 w-4" />
                {emailConfirming ? "Memverifikasi..." : "Simpan email"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
