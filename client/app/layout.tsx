import type { Metadata } from "next";
import { JetBrains_Mono, Manrope, Sora } from "next/font/google";
import "@/styles/globals.css";
import "@/styles/mobilestyles.css";
import { AuthProvider } from "@/components/auth-provider";
import { ToastProvider } from "@/components/toast";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700"]
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"]
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["500", "600", "700"]
});

export const metadata: Metadata = {
  title: "SinyalKita | Web Resmi User",
  description: "Web resmi user SinyalKita untuk informasi layanan, tagihan, dan pembayaran.",
  icons: {
    icon: "/images/logoSinyalKita.png",
    shortcut: "/images/logoSinyalKita.png",
    apple: "/images/logoSinyalKita.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${sora.variable} ${manrope.variable} ${mono.variable}`}>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
