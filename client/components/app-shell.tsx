"use client";

import {
  AlertTriangle,
  BarChart3,
  CreditCard,
  FileClock,
  History,
  KeyRound,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Server
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";

const customerNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/report-problem", label: "Report", icon: AlertTriangle },
  { href: "/tagihan", label: "Tagihan", icon: ReceiptText },
  { href: "/pembayaran", label: "Pembayaran", icon: CreditCard },
  { href: "/riwayat", label: "Riwayat", icon: FileClock }
];

const adminNav = [
  { href: "/admin", label: "Operasional", icon: BarChart3 },
  { href: "/admin/servers", label: "Server", icon: Server },
  { href: "/admin/payments", label: "Verifikasi", icon: CreditCard, badge: "pendingPayments" },
  { href: "/admin/reports", label: "Report", icon: AlertTriangle, badge: "openReports" },
  { href: "/admin/generate", label: "Generate Akun", icon: KeyRound },
  { href: "/admin/history", label: "History", icon: History }
];

export function AppShell({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, ready, token, user } = useAuth();
  const [adminBadges, setAdminBadges] = useState({ pendingPayments: 0, openReports: 0 });
  const nav = admin ? adminNav : customerNav;
  const blocked =
    !ready || !token || !user || (admin && user.role !== "ADMIN") || (!admin && user.role === "ADMIN");

  useEffect(() => {
    if (!ready) return;

    if (!token || !user) {
      router.replace("/login");
      return;
    }

    if (admin && user.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }

    if (!admin && user.role === "ADMIN") {
      router.replace("/admin");
    }
  }, [admin, ready, router, token, user]);

  useEffect(() => {
    if (!ready || !admin || user?.role !== "ADMIN") return;

    api
      .adminOverview()
      .then((data) =>
        setAdminBadges({
          pendingPayments: data.summary.pendingPayments,
          openReports: data.summary.openReports
        })
      )
      .catch(() => {
        setAdminBadges({ pendingPayments: 0, openReports: 0 });
      });
  }, [admin, ready, user?.role, pathname]);

  if (blocked) {
    return (
      <div className="min-h-screen bg-mist px-4 py-6 lg:px-10 lg:py-9">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="h-10 w-48 animate-pulse rounded-xl bg-line/70" />
          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="h-72 animate-pulse rounded-xl border border-line bg-white shadow-soft" />
            <div className="h-72 animate-pulse rounded-xl border border-line bg-white shadow-soft" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mist">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-line/70 bg-white/88 px-5 py-6 backdrop-blur-xl lg:block">
        <Link href="/" className="flex items-center gap-3 rounded-xl px-2 py-1 hover:bg-mist">
          <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-white shadow-soft">
            <Image src="/images/logoSinyalKita.png" alt="Logo SinyalKita" width={40} height={40} className="h-10 w-10 object-contain" />
          </span>
          <span>
            <span className="block font-heading text-lg font-bold text-ink">SinyalKita</span>
            <span className="block text-xs font-semibold text-ink-soft">Web resmi user</span>
          </span>
        </Link>

        <nav className="mt-10 space-y-2">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            const badgeValue = admin && "badge" in item ? adminBadges[item.badge as keyof typeof adminBadges] : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold",
                  active
                    ? "bg-ink text-white shadow-soft"
                    : "text-ink-soft hover:translate-x-1 hover:bg-mist hover:text-ink"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {badgeValue > 0 ? (
                  <span className="grid min-w-5 place-items-center rounded-full bg-danger px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
                    {badgeValue > 99 ? "99+" : badgeValue}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={logout}
          className="absolute bottom-6 left-5 right-5 flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm font-bold text-ink-soft hover:border-danger/30 hover:text-danger"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </aside>

      <header className="sticky top-0 z-10 border-b border-line/70 bg-white/86 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-heading text-lg font-bold text-ink">
            <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-lg bg-white shadow-soft">
              <Image src="/images/logoSinyalKita.png" alt="Logo SinyalKita" width={32} height={32} className="h-8 w-8 object-contain" />
            </span>
            SinyalKita
          </Link>
          <button onClick={logout} className="rounded-lg p-2 text-ink-soft hover:bg-mist hover:text-ink" aria-label="Keluar">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <nav className="mobile-bottom-nav lg:hidden">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          const badgeValue = admin && "badge" in item ? adminBadges[item.badge as keyof typeof adminBadges] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "mobile-bottom-nav-item mobile-tap flex flex-col items-center justify-center gap-1 font-bold",
                active ? "bg-ink text-white shadow-soft" : "text-ink-soft"
              )}
            >
              <span className="relative">
                <Icon className="h-4 w-4" />
                {badgeValue > 0 ? (
                  <span className="absolute -right-2 -top-2 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white">
                    {badgeValue > 9 ? "9+" : badgeValue}
                  </span>
                ) : null}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <main className="mobile-bottom-safe px-4 py-6 lg:ml-72 lg:px-10 lg:py-9">{children}</main>
    </div>
  );
}
