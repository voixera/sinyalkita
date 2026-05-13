import { ArrowRight, BadgeCheck, LockKeyhole, Wifi } from "lucide-react";
import Image from "next/image";
import { LinkButton } from "@/components/ui";

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-mist">
      <section className="relative flex min-h-screen flex-col px-4 py-5 sm:px-6 lg:px-10">
        <div className="absolute inset-0">
          <Image
            src="/images/fiber-portal.png"
            alt=""
            fill
            priority
            className="object-cover opacity-[0.16]"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-mist/78 via-mist/88 to-mist/78" />
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

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center py-16 lg:py-20">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white/76 px-3 py-1.5 text-xs font-bold text-ink-soft shadow-soft backdrop-blur">
              <BadgeCheck className="h-4 w-4 text-success" />
              Dipercaya sejak 2015
            </div>
            <h1 className="mt-7 max-w-4xl font-heading text-5xl font-bold leading-[1.04] text-ink sm:text-6xl lg:text-7xl">
              ISP Wi-fi SinyalKita
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-soft">
              Web login resmi untuk pelanggan SinyalKita. Masuk untuk melihat informasi layanan
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/login">
                Masuk ke
                <LockKeyhole className="h-4 w-4" />
              </LinkButton>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
