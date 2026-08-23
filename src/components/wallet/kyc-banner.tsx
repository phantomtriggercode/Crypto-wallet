import Link from "next/link";
import { BadgeAlert } from "lucide-react";

const COPY: Record<string, { title: string; body: string; cta: string }> = {
  NOT_STARTED: {
    title: "Verify your identity",
    body: "Complete KYC to unlock deposits, withdrawals, and escrow.",
    cta: "Start verification",
  },
  PENDING: {
    title: "Identity verification pending",
    body: "Submit your KYC details to begin the review process.",
    cta: "Continue verification",
  },
  UNDER_REVIEW: {
    title: "Verification under review",
    body: "Our team is reviewing your submission. This is a manual, admin-controlled process.",
    cta: "View status",
  },
  REJECTED: {
    title: "Verification was rejected",
    body: "Please review the feedback and resubmit your KYC information.",
    cta: "Resubmit",
  },
  MORE_INFO_REQUIRED: {
    title: "More information required",
    body: "The admin team requested additional details to complete your verification.",
    cta: "Provide details",
  },
};

export function KycBanner({ status }: { status: string }) {
  const copy = COPY[status] ?? COPY.NOT_STARTED;
  return (
    <Link
      href="/wallet/kyc"
      className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm transition hover:bg-warning/15"
    >
      <BadgeAlert className="h-5 w-5 shrink-0 text-warning" />
      <div className="flex-1">
        <p className="font-medium text-warning">{copy.title}</p>
        <p className="text-xs text-muted">{copy.body}</p>
      </div>
      <span className="whitespace-nowrap text-xs font-medium text-warning">{copy.cta} →</span>
    </Link>
  );
}
