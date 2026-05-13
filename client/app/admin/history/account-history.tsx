"use client";

import { Copy, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Button, ErrorState, SkeletonBlock } from "@/components/ui";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";

type AccountHistory = {
  id: string;
  customerId: string;
  customerName: string;
  loginId: string;
  passwordPlain: string;
  createdAt: string;
};

export default function AccountHistoryPage() {
  const [accounts, setAccounts] = useState<AccountHistory[] | null>(null);
  const [error, setError] = useState("");
  const { ready, user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (!ready || user?.role !== "ADMIN") return;

    api
      .adminGeneratedAccounts()
      .then((data) => setAccounts(data.accounts))
      .catch((err) => setError(err instanceof Error ? err.message : "History akun belum dapat dimuat."));
  }, [ready, user?.role]);

  async function copyCredential(account: AccountHistory) {
    await navigator.clipboard.writeText(`ID login: ${account.loginId}\nKata sandi: ${account.passwordPlain}`);
    showToast({ title: "Credential disalin.", tone: "success" });
  }

  return (
    <AppShell admin>
      <div className="mb-6">
        <p className="text-sm font-bold text-ink-soft">Riwayat generate</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-ink">History Akun</h1>
      </div>

      {error ? (
        <ErrorState title="History belum dapat dimuat" message={error} />
      ) : !accounts ? (
        <SkeletonBlock className="h-96" />
      ) : (
        <section className="overflow-hidden rounded-xl border border-line bg-white shadow-soft">
          <div className="grid grid-cols-[1fr_0.9fr_0.9fr_auto] gap-4 border-b border-line bg-mist/70 px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">
            <span>Pelanggan</span>
            <span>ID login</span>
            <span>Kata sandi</span>
            <span />
          </div>
          <div className="divide-y divide-line/80">
            {accounts.map((account) => (
              <div key={account.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_0.9fr_0.9fr_auto] md:items-center">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-success-soft text-success">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-ink">{account.customerName}</p>
                    <p className="mono mt-1 text-xs font-bold text-ink-soft">
                      {account.customerId} - {formatDate(account.createdAt)}
                    </p>
                  </div>
                </div>
                <p className="mono text-sm font-bold text-ink">{account.loginId}</p>
                <p className="mono text-sm font-bold text-ink">{account.passwordPlain}</p>
                <Button type="button" variant="ghost" onClick={() => copyCredential(account)}>
                  <Copy className="h-4 w-4" />
                  Salin
                </Button>
              </div>
            ))}
            {accounts.length === 0 ? (
              <p className="px-5 py-6 text-sm font-semibold text-ink-soft">Belum ada akun yang digenerate.</p>
            ) : null}
          </div>
        </section>
      )}
    </AppShell>
  );
}
