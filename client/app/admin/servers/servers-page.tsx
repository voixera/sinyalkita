"use client";

import { Server } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Button, ErrorState, SkeletonBlock, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import type { ServerStatus, ServiceServer } from "@/lib/types";

export default function AdminServersPage() {
  const [servers, setServers] = useState<ServiceServer[] | null>(null);
  const [error, setError] = useState("");
  const [updatingServer, setUpdatingServer] = useState("");
  const { ready, user } = useAuth();

  async function loadServers() {
    try {
      const data = await api.adminServers();
      setServers(data.servers);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status server belum dapat dimuat.");
    }
  }

  useEffect(() => {
    if (!ready || user?.role !== "ADMIN") return;
    loadServers();
  }, [ready, user?.role]);

  async function updateServerStatus(name: string, status: ServerStatus) {
    setUpdatingServer(name);
    try {
      const result = await api.updateServer({ name, status });
      setServers((current) =>
        (current || []).map((server) => (server.name === result.server.name ? result.server : server))
      );
    } finally {
      setUpdatingServer("");
    }
  }

  return (
    <AppShell admin>
      <div className="mb-6">
        <p className="text-sm font-bold text-ink-soft">Kontrol layanan</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-ink">Status Server</h1>
      </div>

      {error ? (
        <ErrorState title="Status server belum dapat dimuat" message={error} />
      ) : !servers ? (
        <SkeletonBlock className="h-96" />
      ) : (
        <section className="rounded-xl border border-line bg-white p-5 shadow-soft">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-heading text-xl font-bold text-ink">Status server layanan</p>
              <p className="mt-1 text-sm font-semibold text-ink-soft">
                Setiap perubahan otomatis tersinkron ke dashboard user sesuai server layanan.
              </p>
            </div>
            <div className="hidden h-11 w-11 place-items-center rounded-xl bg-success-soft text-success sm:grid">
              <Server className="h-5 w-5" />
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {servers.map((server) => (
              <div key={server.id} className="rounded-xl border border-line bg-mist/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-ink">{server.name}</p>
                    <p className="mt-1 text-xs font-bold text-ink-soft">Status saat ini</p>
                  </div>
                  <StatusBadge status={server.status} />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {(["ACTIVE", "TROUBLE", "DOWN"] as ServerStatus[]).map((status) => (
                    <Button
                      key={status}
                      type="button"
                      variant={server.status === status ? "primary" : "ghost"}
                      className="min-h-11 px-2 text-xs"
                      disabled={updatingServer === server.name}
                      onClick={() => updateServerStatus(server.name, status)}
                    >
                      {status === "ACTIVE" ? "Aktif" : status === "TROUBLE" ? "Gangguan" : "Error"}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
