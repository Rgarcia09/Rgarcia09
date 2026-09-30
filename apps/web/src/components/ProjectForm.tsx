"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { DISCIPLINES, label, PROJECT_PHASES, PROJECT_STATUSES } from "@/lib/format";
import type { Client, Consultant, Project, UserBrief } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { ErrorNotice, Field } from "./ui";

interface ConsultantRow {
  consultant_id: string;
  discipline: string;
  contact_id: string;
  scope_notes: string;
}

type FormState = Record<string, string>;

const TEXT_FIELDS = [
  "project_number", "name", "short_name", "client_id", "location", "project_type", "status", "phase",
  "project_manager_id", "contract_number", "contract_value", "start_date", "deadline",
  "construction_start", "construction_end", "billing_notes", "dropbox_path", "notes",
] as const;

function initial(project?: Project): FormState {
  const s: FormState = {};
  for (const f of TEXT_FIELDS) {
    const v = project?.[f as keyof Project];
    s[f] = v === null || v === undefined ? "" : String(v);
  }
  if (!project) s.status = "active";
  s.tags = project?.tags.join(", ") ?? "";
  return s;
}

export function ProjectForm({ project }: { project?: Project }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initial(project));
  const [staff, setStaff] = useState<string[]>(project?.staff.map((s) => s.user.id) ?? []);
  const [consultants, setConsultants] = useState<ConsultantRow[]>(
    project?.consultants.map((c) => ({
      consultant_id: c.consultant_id,
      discipline: c.discipline,
      contact_id: c.contact?.id ?? "",
      scope_notes: c.scope_notes ?? "",
    })) ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const clients = useApi<Client[]>("/api/clients");
  const users = useApi<UserBrief[]>("/api/users");
  const firms = useApi<Consultant[]>("/api/consultants");

  const set = (k: string) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function updateConsultant(i: number, patch: Partial<ConsultantRow>) {
    setConsultants((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body: Record<string, unknown> = {};
    for (const f of TEXT_FIELDS) body[f] = form[f]?.trim() ? form[f]!.trim() : null;
    body.tags = (form.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean);
    body.staff = staff.map((user_id) => ({ user_id }));
    body.consultants = consultants
      .filter((c) => c.consultant_id)
      .map((c) => ({ ...c, contact_id: c.contact_id || null, scope_notes: c.scope_notes || null }));
    try {
      const saved = await api<Project>(project ? `/api/projects/${project.id}` : "/api/projects", {
        method: project ? "PUT" : "POST",
        json: body,
      });
      router.push(`/projects/${saved.id}`);
    } catch (err) {
      const e2 = err as ApiError;
      const detail = e2.fields?.length ? ` ${e2.fields.map((f) => `${label(f.field)}: ${f.message}`).join("; ")}` : "";
      setError(e2.message + detail);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card">
      <ErrorNotice error={error} />
      <section className="form-section">
        <h2>Identification</h2>
        <div className="form-grid">
          <Field label="Project number" hint="as used by the office">
            <input className="input mono" required value={form.project_number} onChange={set("project_number")} maxLength={32} />
          </Field>
          <Field label="Project name">
            <input className="input" required value={form.name} onChange={set("name")} maxLength={300} />
          </Field>
          <Field label="Short name">
            <input className="input" value={form.short_name} onChange={set("short_name")} />
          </Field>
          <Field label="Client">
            <select className="input" value={form.client_id} onChange={set("client_id")}>
              <option value="">—</option>
              {clients.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Location">
            <input className="input" value={form.location} onChange={set("location")} />
          </Field>
          <Field label="Project type">
            <input className="input" value={form.project_type} onChange={set("project_type")} placeholder="e.g. School renovation" />
          </Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={set("status")}>
              {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
          </Field>
          <Field label="Phase">
            <select className="input" value={form.phase} onChange={set("phase")}>
              <option value="">—</option>
              {PROJECT_PHASES.map((p) => <option key={p} value={p}>{label(p)}</option>)}
            </select>
          </Field>
          <Field label="Tags" hint="comma separated">
            <input className="input" value={form.tags} onChange={set("tags")} />
          </Field>
        </div>
      </section>

      <section className="form-section">
        <h2>Team</h2>
        <div className="form-grid">
          <Field label="Project manager">
            <select className="input" value={form.project_manager_id} onChange={set("project_manager_id")}>
              <option value="">—</option>
              {users.data?.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </Field>
          <Field label="Staff" hint="Ctrl/⌘-click to select several" wide>
            <select className="input" multiple size={Math.min(6, Math.max(3, users.data?.length ?? 3))} value={staff}
              onChange={(e) => setStaff(Array.from(e.target.selectedOptions).map((o) => o.value))}>
              {users.data?.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <section className="form-section">
        <h2>Consultants</h2>
        <div className="stack" style={{ gap: 10 }}>
          {consultants.map((c, i) => {
            const firm = firms.data?.find((f) => f.id === c.consultant_id);
            return (
              <div key={i} className="form-grid" style={{ alignItems: "end" }}>
                <Field label="Discipline">
                  <select className="input" value={c.discipline} onChange={(e) => updateConsultant(i, { discipline: e.target.value })}>
                    {DISCIPLINES.map((d) => <option key={d} value={d}>{label(d)}</option>)}
                  </select>
                </Field>
                <Field label="Firm">
                  <select className="input" required value={c.consultant_id}
                    onChange={(e) => {
                      const f = firms.data?.find((x) => x.id === e.target.value);
                      updateConsultant(i, { consultant_id: e.target.value, contact_id: "", discipline: f?.discipline ?? c.discipline });
                    }}>
                    <option value="">Select…</option>
                    {firms.data?.map((f) => <option key={f.id} value={f.id}>{f.company_name} ({label(f.discipline)})</option>)}
                  </select>
                </Field>
                <Field label="Contact person">
                  <select className="input" value={c.contact_id} onChange={(e) => updateConsultant(i, { contact_id: e.target.value })}>
                    <option value="">—</option>
                    {firm?.contacts.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </Field>
                <div className="row">
                  <button type="button" className="btn small" onClick={() => setConsultants((r) => r.filter((_, j) => j !== i))}>Remove</button>
                </div>
              </div>
            );
          })}
          <div>
            <button type="button" className="btn small"
              onClick={() => setConsultants((r) => [...r, { consultant_id: "", discipline: "structural", contact_id: "", scope_notes: "" }])}>
              Add consultant
            </button>
            {firms.data?.length === 0 && <span className="muted small"> No consultants in the directory yet.</span>}
          </div>
        </div>
      </section>

      <section className="form-section">
        <h2>Contract and schedule</h2>
        <div className="form-grid">
          <Field label="Contract number"><input className="input" value={form.contract_number} onChange={set("contract_number")} /></Field>
          <Field label="Contract value (USD)"><input className="input" inputMode="decimal" value={form.contract_value} onChange={set("contract_value")} /></Field>
          <Field label="Start date"><input className="input" type="date" value={form.start_date} onChange={set("start_date")} /></Field>
          <Field label="Next deadline"><input className="input" type="date" value={form.deadline} onChange={set("deadline")} /></Field>
          <Field label="Construction start"><input className="input" type="date" value={form.construction_start} onChange={set("construction_start")} /></Field>
          <Field label="Construction end"><input className="input" type="date" value={form.construction_end} onChange={set("construction_end")} /></Field>
          <Field label="Billing notes" wide><textarea className="input" value={form.billing_notes} onChange={set("billing_notes")} /></Field>
        </div>
      </section>

      <section className="form-section">
        <h2>Files and notes</h2>
        <div className="form-grid">
          <Field label="Dropbox folder" hint="path; used once Dropbox is connected" wide>
            <input className="input mono" value={form.dropbox_path} onChange={set("dropbox_path")} placeholder="/Projects/25006 Las Piedras" />
          </Field>
          <Field label="Notes" wide><textarea className="input" value={form.notes} onChange={set("notes")} /></Field>
        </div>
      </section>

      <div className="form-actions">
        <button type="button" className="btn" onClick={() => router.back()}>Cancel</button>
        <button type="submit" className="btn primary" disabled={busy}>{busy ? "Saving…" : project ? "Save changes" : "Create project"}</button>
      </div>
    </form>
  );
}
