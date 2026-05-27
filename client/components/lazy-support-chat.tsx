"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

const SupportChat = dynamic(() => import("@/components/support-chat").then((mod) => mod.SupportChat), {
  ssr: false,
  loading: () => null
});

export function LazySupportChat() {
  const { ready, token, user } = useAuth();
  const pathname = usePathname();

  if (!ready || !token || user?.role !== "CUSTOMER" || pathname !== "/dashboard") {
    return null;
  }

  return <SupportChat />;
}
