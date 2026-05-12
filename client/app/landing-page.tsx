import { ArrowRight, BadgeCheck, CalendarClock, LockKeyhole, Wifi } from "lucide-react";
import Image from "next/image";
import { LinkButton } from "@/components/ui";

const notes = ["Akun dibuat oleh admin", "Pembayaran pelanggan aktif", "Tidak menerima pemasangan baru"];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-mist">
      <section className="relative min-h-[92vh] px-4 py-5 sm:px-6 lg:px-10">
        <div className="absolute inset-0">
          <Image
            src="/images/fiber-portal.png"
            alt=""
            fill
            priority
            className="object-cover opacity-[0.16]"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-mist/82 via-mist/94 to-mist" />
        </div>

        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between rounded-xl border border-line/70 bg-white/78 px-4 py-3 shadow-soft backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-white">
              <Wifi className="h-5 w-5" />
            </span>
            <div>
              <p className="font-heading text-lg font-bold text-ink">SinyalKita</p>
              <p className="text-xs font-semibold text-ink-soft">Portal resmi pelanggan</p>
            </div>
          </div>
          <LinkButton href="/login" className="min-h-10 px-4">
            Login
            <ArrowRight className="h-4 w-4" />
          </LinkButton>
        </nav>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 pb-10 pt-20 lg:grid-cols-[1.03fr_0.97fr] lg:items-center lg:pt-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white/76 px-3 py-1.5 text-xs font-bold text-ink-soft shadow-soft backdrop-blur">
              <BadgeCheck className="h-4 w-4 text-success" />
              Dipercaya sejak 2015
            </div>
            <h1 className="mt-7 max-w-4xl font-heading text-5xl font-bold leading-[1.04] text-ink sm:text-6xl lg:text-7xl">
              Portal Resmi Pelanggan SinyalKita
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-soft">
              Kelola tagihan WiFi, pembayaran, dan status layanan dari satu tempat yang aman. Layanan ini hanya untuk
              pelanggan aktif SinyalKita.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/login">
                Masuk ke Portal
                <LockKeyhole className="h-4 w-4" />
              </LinkButton>
              <span className="inline-flex min-h-11 items-center rounded-xl border border-line bg-white/72 px-4 text-sm font-bold text-ink-soft">
                Tidak menerima pemasangan baru
              </span>
            </div>
          </div>

          <div className="glass-panel rounded-xl p-4 lg:p-5">
            <div className="rounded-xl bg-ink p-5 text-white">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/55">Tagihan bulan ini</p>
                  <p className="mt-2 font-heading text-2xl font-bold">Mei 2026</p>
                </div>
                <span className="rounded-full border border-warning/20 bg-warning-soft px-3 py-1 text-xs font-bold text-warning">
                  Menunggu
                </span>
              </div>
              <div className="grid gap-4 py-5 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-white/55">ID Pelanggan</p>
                  <p className="mono mt-1 text-lg font-bold">SKT-2024-00123</p>
                </div>
                <div>
                  <p className="text-sm text-white/55">Paket aktif</p>
                  <p className="mt-1 text-lg font-bold">Rumah Stabil 50</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                <p className="text-sm text-white/60">Total pembayaran</p>
                <p className="mono mt-2 text-3xl font-bold">Rp325.000</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {notes.map((note) => (
                <div key={note} className="rounded-xl border border-line bg-white/80 p-4 text-sm font-bold text-ink-soft">
                  {note}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-3 border-t border-line/70 pt-5 sm:grid-cols-3">
          {[
            ["Status layanan", "Realtime dari sistem operasional"],
            ["Tagihan jelas", "Nominal dan jatuh tempo terlihat rapi"],
            ["Pembayaran aman", "Metode pembayaran pelanggan lama"]
          ].map(([title, desc]) => (
            <div key={title} className="flex items-start gap-3 py-2">
              <CalendarClock className="mt-1 h-5 w-5 text-ocean" />
              <div>
                <p className="font-bold text-ink">{title}</p>
                <p className="text-sm text-ink-soft">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
