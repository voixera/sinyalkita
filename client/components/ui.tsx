import { clsx } from "clsx";
import Link from "next/link";

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "quiet" }) {
  return (
    <button
      className={clsx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ocean/15 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-ink text-white shadow-soft hover:-translate-y-0.5 hover:bg-ocean hover:shadow-lift",
        variant === "ghost" && "border border-line/90 bg-white text-ink hover:-translate-y-0.5 hover:border-ocean/30 hover:shadow-soft",
        variant === "quiet" && "text-ink-soft hover:bg-white hover:text-ink",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  className
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-bold text-white shadow-soft hover:-translate-y-0.5 hover:bg-ocean hover:shadow-lift focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ocean/15",
        className
      )}
    >
      {children}
    </Link>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const label: Record<string, string> = {
    ACTIVE: "Aktif",
    MAINTENANCE: "Pemeliharaan",
    SUSPENDED: "Ditahan",
    PAID: "Lunas",
    UNPAID: "Menunggu",
    OVERDUE: "Lewat tempo",
    SUCCESS: "Disetujui",
    PENDING: "Perlu dicek",
    ACCEPTED: "Diterima",
    RESOLVED: "FIX",
    FAILED: "Ditolak",
    TROUBLE: "Gangguan",
    DOWN: "Error"
  };

  const tone =
    status === "ACTIVE" || status === "PAID" || status === "SUCCESS" || status === "RESOLVED"
      ? "bg-success-soft text-success border-success/15"
      : status === "MAINTENANCE" || status === "UNPAID" || status === "PENDING" || status === "TROUBLE" || status === "ACCEPTED"
        ? "bg-warning-soft text-warning border-warning/15"
        : "bg-danger-soft text-danger border-danger/15";

  return (
    <span className={clsx("inline-flex w-fit shrink-0 items-center self-start whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold", tone)}>
      {label[status] || status}
    </span>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={clsx("skeleton rounded-xl", className)} />;
}

export function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-xl border border-danger/15 bg-danger-soft px-5 py-4 text-danger">
      <p className="font-heading text-lg font-bold">{title}</p>
      <p className="mt-1 text-sm font-semibold leading-6">{message}</p>
    </div>
  );
}
