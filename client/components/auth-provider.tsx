"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { Role } from "@/lib/types";

type SessionUser = { name: string; loginId: string; role: Role };
type AuthContextValue = {
  user: SessionUser | null;
  token: string | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setToken(localStorage.getItem("sinyalkita_token"));
      const storedUser = localStorage.getItem("sinyalkita_user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } finally {
      setReady(true);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      ready,
      login: async (email: string, password: string) => {
        const data = await api.login(email, password);
        localStorage.setItem("sinyalkita_token", data.token);
        localStorage.setItem("sinyalkita_user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        router.push(data.user.role === "ADMIN" ? "/admin" : "/dashboard");
      },
      logout: () => {
        localStorage.removeItem("sinyalkita_token");
        localStorage.removeItem("sinyalkita_user");
        setToken(null);
        setUser(null);
        router.push("/login");
      }
    }),
    [ready, router, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
