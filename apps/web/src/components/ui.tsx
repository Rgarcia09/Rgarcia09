"use client";

import type { ReactNode } from "react";
import { label } from "@/lib/format";

export function Field({ label: text, hint, children, wide }: {
  label: string;
  hint?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`field${wide ? " wide" : ""}`}>
      <span>
        {text} {hint && <span className="hint">— {hint}</span>}
      </span>
      {children}
    </label>
  );
}

const STATUS_TONE: Record<string, string> = {
  active: "ok",
  online: "ok",
  connected: "ok",
  success: "ok",
  prospect: "accent",
  on_hold: "warn",
  not_configured: "",
  error: "danger",
  offline: "danger",
  denied: "danger",
  cancelled: "",
  completed: "",
};

export function StatusPill({ status }: { status: string }) {
  return <span className={`pill ${STATUS_TONE[status] ?? ""}`}>{label(status)}</span>;
}

export function ErrorNotice({ error }: { error: string | null | undefined }) {
  if (!error) return null;
  return <div className="notice error" role="alert">{error}</div>;
}

export function Loading() {
  return <div className="muted">Loading…</div>;
}

export function PageHead({ title, eyebrow, subtitle, actions }: {
  title: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}
