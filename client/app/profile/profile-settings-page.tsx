"use client";

import { Camera, Eye, EyeOff, LockKeyhole, MailCheck, Save, Trash2, UserRound } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useToast } from "@/components/toast";
import { Button, ErrorState, SkeletonBlock } from "@/components/ui";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

export default function ProfileSettingsPage({ admin = false }: { admin?: boolean }) {
  const [profile, setProfile] = useState<User | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [photoPanelOpen, setPhotoPanelOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSentTo, setEmailCodeSentTo] = useState("");
  const [emailPanelOpen, setEmailPanelOpen] = useState(false);
  const [passwordCode, setPasswordCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordCodeSentTo, setPasswordCodeSentTo] = useState("");
  const [passwordPanelOpen, setPasswordPanelOpen] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState("");
  const [photoSaving, setPhotoSaving] = useState(false);
  const [emailRequesting, setEmailRequesting] = useState(false);
  const [emailConfirming, setEmailConfirming] = useState(false);
  const [passwordRequesting, setPasswordRequesting] = useState(false);
  const [passwordConfirming, setPasswordConfirming] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    api
      .profile()
      .then((data) => {
        setProfile(data.profile);
        const localImage = localStorage.getItem(getProfilePhotoKey(data.profile.loginId));
        setProfileImage(data.profile.profileImage || localImage);
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
      localStorage.removeItem(getProfilePhotoKey(result.profile.loginId));
      setPhotoPanelOpen(false);
      showToast({ title: "Foto profil berhasil diperbarui.", tone: "success" });
    } catch (err) {
      if (profile) {
        if (profileImage) {
          localStorage.setItem(getProfilePhotoKey(profile.loginId), profileImage);
        } else {
          localStorage.removeItem(getProfilePhotoKey(profile.loginId));
        }
        setProfile((current) => (current ? { ...current, profileImage } : current));
        setPhotoPanelOpen(false);
        showToast({ title: "Foto profil disimpan di perangkat ini.", tone: "success" });
      } else {
        showToast({ title: err instanceof Error ? err.message : "Foto profil belum dapat disimpan.", tone: "info" });
      }
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
      setEmailPanelOpen(false);
      showToast({ title: result.message, tone: "success" });
    } catch (err) {
      showToast({ title: err instanceof Error ? err.message : "Email belum dapat diperbarui.", tone: "info" });
    } finally {
      setEmailConfirming(false);
    }
  }

  async function requestPasswordCode() {
    setPasswordRequesting(true);
    setPasswordCode("");
    try {
      const result = await api.requestProfilePasswordCode();
      setPasswordCodeSentTo(result.email);
      showToast({ title: result.message, tone: "success" });
    } catch (err) {
      showToast({ title: err instanceof Error ? err.message : "Kode verifikasi password belum dapat dikirim.", tone: "info" });
    } finally {
      setPasswordRequesting(false);
    }
  }

  async function confirmPasswordChange() {
    if (newPassword.length < 6) {
      showToast({ title: "Password baru minimal 6 karakter.", tone: "info" });
      return;
    }

    setPasswordConfirming(true);
    try {
      const result = await api.confirmProfilePasswordChange({ code: passwordCode, password: newPassword });
      setPasswordCode("");
      setNewPassword("");
      setPasswordCodeSentTo("");
      setPasswordPanelOpen(false);
      showToast({ title: result.message, tone: "success" });
    } catch (err) {
      showToast({ title: err instanceof Error ? err.message : "Password belum dapat diperbarui.", tone: "info" });
    } finally {
      setPasswordConfirming(false);
    }
  }

  function closePasswordPanel() {
    setPasswordPanelOpen(false);
    setPasswordCode("");
    setNewPassword("");
    setPasswordCodeSentTo("");
    setShowNewPassword(false);
  }

  function closeEmailPanel() {
    setEmailPanelOpen(false);
    setNewEmail("");
    setEmailCode("");
    setEmailCodeSentTo("");
  }

  return (
    <AppShell admin={admin}>
      <div className="mb-4 sm:mb-5">
        <p className="text-sm font-bold text-ink-soft">{admin ? "Akun admin" : "Akun user"}</p>
        <h1 className="mt-1 font-heading text-2xl font-bold text-ink sm:text-3xl">Pengaturan Profil</h1>
      </div>

      {error ? (
        <ErrorState title="Profil belum dapat dibuka" message={error} />
      ) : !profile ? (
        <SkeletonBlock className="h-72 sm:h-96" />
      ) : (
        <div className="grid items-start gap-3 sm:gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-xl border border-line bg-white p-4 shadow-soft sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-center gap-3 sm:items-start sm:gap-5">
                <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-mist text-2xl font-bold text-ink shadow-soft sm:h-28 sm:w-28 sm:text-3xl">
                  {profileImage ? (
                    <img src={profileImage} alt={profile.name} className="h-full w-full object-cover" />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-xl font-bold text-ink sm:text-2xl">{profile.name}</p>
                  <p className="mono mt-1 truncate text-xs font-bold text-ink-soft sm:text-sm">{profile.loginId}</p>
                  <p className="mt-2 truncate text-xs font-semibold text-ink-soft sm:mt-3 sm:text-sm">{profile.email || "Email belum terhubung"}</p>
                </div>
              </div>

              {photoPanelOpen ? (
                <Button type="button" variant="ghost" className="min-h-10 w-full bg-mist text-xs sm:w-fit sm:text-sm" onClick={() => setPhotoPanelOpen(false)}>
                  Tutup
                </Button>
              ) : (
                <Button type="button" className="min-h-10 w-full text-xs sm:w-fit sm:text-sm" onClick={() => setPhotoPanelOpen(true)}>
                  <Camera className="h-4 w-4" />
                  Atur foto
                </Button>
              )}
            </div>

            {photoPanelOpen ? (
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line/80 pt-4">
                <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line/90 bg-white px-3 text-xs font-bold text-ink hover:border-ocean/30 hover:shadow-soft sm:min-h-11 sm:px-4 sm:text-sm">
                  <Camera className="h-4 w-4" />
                  <span className="hidden sm:inline">Pilih foto</span>
                  <span className="sm:hidden">Foto</span>
                  <input type="file" accept="image/*" className="hidden" onChange={choosePhoto} />
                </label>
                <Button type="button" variant="ghost" className="min-h-10 bg-white px-3 text-xs sm:min-h-11 sm:px-4 sm:text-sm" onClick={() => setProfileImage(null)}>
                  <Trash2 className="h-4 w-4" />
                  Hapus
                </Button>
                <Button type="button" className="min-h-10 px-3 text-xs sm:min-h-11 sm:px-4 sm:text-sm" onClick={savePhoto} disabled={photoSaving || profileImage === profile.profileImage}>
                  <Save className="h-4 w-4" />
                  {photoSaving ? "Simpan..." : "Simpan"}
                </Button>
              </div>
            ) : null}
          </section>

          <div className="grid gap-3 sm:gap-4">
            <section className="rounded-xl border border-line bg-white p-4 shadow-soft sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success-soft text-success sm:h-11 sm:w-11">
                    <MailCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-heading text-lg font-bold text-ink sm:text-xl">Email terhubung</h2>
                    <p className="mt-1 text-xs font-semibold leading-5 text-ink-soft sm:text-sm">
                      {profile.email ? "Ubah email dengan kode verifikasi." : "Hubungkan email dengan kode verifikasi."}
                    </p>
                  </div>
                </div>

                {emailPanelOpen ? (
                  <Button type="button" variant="ghost" className="min-h-10 w-full bg-mist text-xs sm:w-fit sm:text-sm" onClick={closeEmailPanel}>
                    Tutup
                  </Button>
                ) : (
                  <Button type="button" className="min-h-10 w-full text-xs sm:w-fit sm:text-sm" onClick={() => setEmailPanelOpen(true)}>
                    <MailCheck className="h-4 w-4" />
                    {profile.email ? "Ubah email" : "Hubungkan email"}
                  </Button>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-line bg-mist/70 p-3 sm:p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">Email saat ini</p>
                <p className="mt-2 break-all text-sm font-bold text-ink sm:text-base">{profile.email || "Belum ada email"}</p>
              </div>

              {emailPanelOpen ? (
                <div className="mt-4 grid gap-3 border-t border-line/80 pt-4 sm:gap-4">
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
                      className="mt-2 w-full rounded-xl border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink placeholder:text-ink-soft/50 sm:py-3"
                      placeholder="email-baru@example.com"
                    />
                  </label>

                  <Button type="button" variant="ghost" className="min-h-10 w-full bg-mist text-xs sm:min-h-11 sm:w-fit sm:text-sm" onClick={requestEmailCode} disabled={emailRequesting || !newEmail}>
                    <MailCheck className="h-4 w-4" />
                    {emailRequesting ? "Mengirim kode..." : "Kirim kode"}
                  </Button>

                  {emailCodeSentTo ? (
                    <p className="rounded-xl border border-success/15 bg-success-soft px-4 py-3 text-xs font-semibold text-success sm:text-sm">
                      Kode dikirim ke {emailCodeSentTo}.
                    </p>
                  ) : null}

                  <label className="block text-sm font-bold text-ink">
                    Kode verifikasi
                    <input
                      type="text"
                      value={emailCode}
                      onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="mt-2 w-full rounded-xl border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink placeholder:text-ink-soft/50 sm:py-3"
                      placeholder="000000"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                    />
                  </label>

                  <Button type="button" className="min-h-10 w-full text-xs sm:min-h-11 sm:w-fit sm:text-sm" onClick={confirmEmailChange} disabled={emailConfirming || emailCode.length !== 6 || !newEmail}>
                    <UserRound className="h-4 w-4" />
                    {emailConfirming ? "Memverifikasi..." : "Simpan email"}
                  </Button>
                </div>
              ) : null}
            </section>

            <section className="rounded-xl border border-line bg-white p-4 shadow-soft sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success-soft text-success sm:h-11 sm:w-11">
                    <LockKeyhole className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-heading text-lg font-bold text-ink sm:text-xl">Password akun</h2>
                    <p className="mt-1 text-xs font-semibold leading-5 text-ink-soft sm:text-sm">Ubah password dengan kode verifikasi email.</p>
                  </div>
                </div>

                {passwordPanelOpen ? (
                  <Button type="button" variant="ghost" className="min-h-10 w-full bg-mist text-xs sm:w-fit sm:text-sm" onClick={closePasswordPanel}>
                    Tutup
                  </Button>
                ) : (
                  <Button type="button" className="min-h-10 w-full text-xs sm:w-fit sm:text-sm" onClick={() => setPasswordPanelOpen(true)} disabled={!profile.email}>
                    <LockKeyhole className="h-4 w-4" />
                    Ubah password
                  </Button>
                )}
              </div>

              {!profile.email ? (
                <p className="mt-4 rounded-xl border border-warning/15 bg-warning-soft px-4 py-3 text-xs font-semibold text-warning sm:text-sm">
                  Hubungkan email terlebih dahulu sebelum mengganti password.
                </p>
              ) : null}

              {passwordPanelOpen ? (
                <div className="mt-4 grid gap-3 border-t border-line/80 pt-4 sm:gap-4">
                  <Button type="button" variant="ghost" className="min-h-10 w-full bg-mist text-xs sm:min-h-11 sm:w-fit sm:text-sm" onClick={requestPasswordCode} disabled={passwordRequesting || !profile.email}>
                    <MailCheck className="h-4 w-4" />
                    {passwordRequesting ? "Mengirim kode..." : "Kirim kode password"}
                  </Button>

                  {passwordCodeSentTo ? (
                    <p className="rounded-xl border border-success/15 bg-success-soft px-4 py-3 text-xs font-semibold text-success sm:text-sm">
                      Kode password dikirim ke {passwordCodeSentTo}.
                    </p>
                  ) : null}

                  <label className="block text-sm font-bold text-ink">
                    Kode verifikasi
                    <input
                      type="text"
                      value={passwordCode}
                      onChange={(event) => setPasswordCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="mt-2 w-full rounded-xl border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink placeholder:text-ink-soft/50 sm:py-3"
                      placeholder="000000"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                    />
                  </label>

                  <label className="block text-sm font-bold text-ink">
                    Password baru
                    <div className="relative mt-2">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        className="w-full rounded-xl border-line bg-white px-4 py-2.5 pr-12 text-sm font-semibold text-ink placeholder:text-ink-soft/50 sm:py-3"
                        placeholder="Minimal 6 karakter"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((current) => !current)}
                        className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-ink-soft hover:bg-mist hover:text-ink"
                        aria-label={showNewPassword ? "Sembunyikan password baru" : "Tampilkan password baru"}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </label>

                  <Button
                    type="button"
                    className="min-h-10 w-full text-xs sm:min-h-11 sm:w-fit sm:text-sm"
                    onClick={confirmPasswordChange}
                    disabled={passwordConfirming || passwordCode.length !== 6 || newPassword.length < 6}
                  >
                    <LockKeyhole className="h-4 w-4" />
                    {passwordConfirming ? "Menyimpan..." : "Simpan password"}
                  </Button>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function getProfilePhotoKey(loginId: string) {
  return `sinyalkita_profile_photo_${loginId}`;
}
