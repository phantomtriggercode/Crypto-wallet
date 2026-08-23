import { clsx } from "clsx";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted border-border",
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  danger: "bg-danger/10 text-danger border-danger/30",
  info: "bg-primary/10 text-primary border-primary/30",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", toneClasses[tone])}>
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  PENDING_REVIEW: "warning",
  UNDER_REVIEW: "warning",
  PENDING_APPROVAL: "warning",
  ON_HOLD: "warning",
  MORE_INFO_REQUIRED: "warning",
  PENDING: "warning",
  APPROVED: "info",
  CREDITED: "success",
  COMPLETED: "success",
  RELEASED: "success",
  REFUNDED: "info",
  REJECTED: "danger",
  CANCELLED: "danger",
  DISPUTED: "danger",
  CREATED: "neutral",
  FUNDED: "info",
  SELLER_COMPLETED: "info",
  AWAITING_ADMIN_RELEASE: "warning",
  ACTIVE: "success",
  SUSPENDED: "danger",
  NOT_STARTED: "neutral",
  OPEN: "warning",
  RESOLVED: "success",
  CLOSED: "neutral",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{status.replaceAll("_", " ")}</Badge>;
}
