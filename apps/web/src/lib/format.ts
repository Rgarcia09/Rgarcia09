export const PROJECT_STATUSES = ["prospect", "active", "on_hold", "completed", "cancelled"] as const;
export const PROJECT_PHASES = [
  "pre_design",
  "schematic_design",
  "design_development",
  "construction_documents",
  "permitting",
  "bidding",
  "construction_administration",
  "closeout",
] as const;
export const DISCIPLINES = [
  "civil",
  "structural",
  "mechanical",
  "electrical",
  "plumbing",
  "landscape",
  "geotechnical",
  "surveying",
  "contractor",
  "owner_representative",
  "permitting",
  "environmental",
  "other",
] as const;

export function label(value: string | null | undefined): string {
  if (!value) return "—";
  const s = value.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Formats an ISO date (YYYY-MM-DD) without timezone shifts: "Oct 3, 2026". */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "—";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[m - 1]} ${d}, ${y}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const dt = new Date(iso);
  return dt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function relativeDays(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "1 day overdue";
  if (days < 0) return `${-days} days overdue`;
  return `In ${days} days`;
}

export function formatMoney(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
