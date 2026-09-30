"use client";

import { useState, type FormEvent } from "react";
import { useSession } from "@/components/session";
import { ErrorNotice, Field, Loading, PageHead, StatusPill } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDateTime, label } from "@/lib/format";
import type { AuditEntry, EditableSettings, Page, SystemStatus, User } from "@/lib/types";
import { useApi } from "@/lib/useApi";

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    try {
      await api("/api/auth/change-password", { json: { current_password: current, new_password: next } });
      setMsg("Password changed. Other devices were signed out.");
      setCurrent("");
      setNext("");
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <form className="card" onSubmit={onSubmit}>
      <h2>Change password</h2>
      <div className="stack" style={{ gap: 12 }}>
        <ErrorNotice error={error} />
        {msg && <div className="notice">{msg}</div>}
        <Field label="Current password"><input className="input" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} /></Field>
        <Field label="New password" hint="12+ characters, mixed case, a digit"><input className="input" type="password" autoComplete="new-password" required value={next} onChange={(e) => setNext(e.target.value)} /></Field>
        <div><button className="btn primary" type="submit">Update password</button></div>
      </div>
    </form>
  );
}

function OfficeSettingsCard({ isAdmin }: { isAdmin: boolean }) {
  const { data, error } = useApi<EditableSettings>("/api/admin/settings");
  if (error) return <ErrorNotice error={error} />;
  if (!data) return <Loading />;
  return <OfficeSettingsForm initial={data} isAdmin={isAdmin} />;
}

function OfficeSettingsForm({ initial, isAdmin }: { initial: EditableSettings; isAdmin: boolean }) {
  const [form, setForm] = useState<EditableSettings>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const set = (k: keyof EditableSettings, numeric = false) => (e: { target: { value: string } }) =>
    setForm({ ...form, [k]: numeric ? Number(e.target.value) : e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    try {
      await api("/api/admin/settings", { method: "PUT", json: form });
      setMsg("Settings saved. Reload the page to see a new assistant name everywhere.");
    } catch (err) {
      setSaveError((err as Error).message);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <h2>Office settings {!isAdmin && <span className="muted small">Read only</span>}</h2>
      <ErrorNotice error={saveError} />
      {msg && <div className="notice" style={{ marginBottom: 12 }}>{msg}</div>}
      <fieldset disabled={!isAdmin} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="form-grid">
          <Field label="Assistant name"><input className="input" value={form.ava_name} onChange={set("ava_name")} /></Field>
          <Field label="Office name"><input className="input" value={form.office_name} onChange={set("office_name")} /></Field>
          <Field label="Internal URL"><input className="input mono" value={form.internal_url} onChange={set("internal_url")} /></Field>
          <Field label="Local AI model"><input className="input mono" value={form.ai_model} onChange={set("ai_model")} /></Field>
          <Field label="Embedding model" hint="Phase 2"><input className="input mono" value={form.embedding_model} onChange={set("embedding_model")} /></Field>
          <Field label="Invoice alert threshold (days)" hint="Phase 4"><input className="input" type="number" min={1} value={form.invoice_alert_threshold_days} onChange={set("invoice_alert_threshold_days", true)} /></Field>
          <Field label="Invoice review frequency (days)" hint="Phase 4"><input className="input" type="number" min={1} value={form.invoice_review_frequency_days} onChange={set("invoice_review_frequency_days", true)} /></Field>
        </div>
        <p className="muted small">
          The AI model setting is recorded here; the engine in use is configured by environment (AI_PROVIDER, AI_MODEL). Strict local mode and integration credentials are set in the server environment, never in the browser.
        </p>
        {isAdmin && <div className="form-actions"><button className="btn primary" type="submit">Save settings</button></div>}
      </fieldset>
    </form>
  );
}

function StatusCard() {
  const { data, error, reload, loading } = useApi<SystemStatus>("/api/admin/status");
  return (
    <section className="card">
      <h2>System status <button className="btn small" onClick={reload} disabled={loading}>Refresh</button></h2>
      <ErrorNotice error={error} />
      {data && (
        <>
          <ul className="list">
            {data.components.map((c) => (
              <li key={c.name}>
                <span><b>{c.name}</b> <span className="muted">— {c.detail}</span>{c.last_sync_at && <span className="muted small"> · last sync {formatDateTime(c.last_sync_at)}</span>}</span>
                <StatusPill status={c.status} />
              </li>
            ))}
          </ul>
          <dl className="dl" style={{ marginTop: 14 }}>
            <dt>Strict local mode</dt><dd>{data.strict_local_mode ? "Enabled — office data never leaves local infrastructure" : "Disabled"}</dd>
            <dt>AI engine</dt><dd className="mono">{data.ai_provider} · {data.ai_model} {data.ai_is_local ? "(local)" : "(external)"}</dd>
            <dt>Last backup</dt><dd>{data.last_backup_at ? formatDateTime(data.last_backup_at) : "No backup recorded by AVA — see BACKUP_RESTORE.md"}</dd>
            <dt>Queued jobs</dt><dd>{data.queued_jobs}</dd>
          </dl>
        </>
      )}
    </section>
  );
}

function UsersCard() {
  const { data, error, reload } = useApi<User[]>("/api/users/admin");
  const [form, setForm] = useState({ email: "", full_name: "", password: "", role: "staff" });
  const [msg, setMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    setActionError(null);
    try {
      await api("/api/users", { json: form });
      setMsg(`Account created for ${form.email}. Share the temporary password privately and ask them to change it.`);
      setForm({ email: "", full_name: "", password: "", role: "staff" });
      reload();
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  async function toggle(u: User) {
    if (!window.confirm(`${u.is_active ? "Deactivate" : "Reactivate"} ${u.full_name}? ${u.is_active ? "Their sessions end immediately. History is kept." : ""}`)) return;
    try {
      await api(`/api/users/${u.id}`, { method: "PATCH", json: { is_active: !u.is_active } });
      reload();
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  return (
    <section className="card">
      <h2>Users</h2>
      <ErrorNotice error={error ?? actionError} />
      {msg && <div className="notice" style={{ marginBottom: 12 }}>{msg}</div>}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Last sign-in</th><th /></tr></thead>
          <tbody>
            {data?.map((u) => (
              <tr key={u.id}>
                <td>{u.full_name}</td><td>{u.email}</td><td>{label(u.role)}</td>
                <td>{formatDateTime(u.last_login_at)}</td>
                <td><button className="btn small" onClick={() => toggle(u)}>{u.is_active ? "Deactivate" : "Reactivate"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form onSubmit={create} className="form-grid" style={{ marginTop: 16, alignItems: "end" }}>
        <Field label="Full name"><input className="input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
        <Field label="Email"><input className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Temporary password"><input className="input" type="password" autoComplete="new-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <Field label="Role">
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="staff">Staff</option><option value="admin">Admin</option>
          </select>
        </Field>
        <div><button className="btn primary" type="submit">Create account</button></div>
      </form>
    </section>
  );
}

function AuditCard() {
  const { data, error } = useApi<Page<AuditEntry>>("/api/admin/audit?limit=100");
  return (
    <section className="card">
      <h2>Audit log <span className="muted small">{data ? `${data.total} entries` : ""}</span></h2>
      <ErrorNotice error={error} />
      {data && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>When</th><th>User</th><th>Action</th><th>Type</th><th>Result</th><th>Detail</th></tr></thead>
            <tbody>
              {data.items.map((a) => (
                <tr key={a.id}>
                  <td className="small">{formatDateTime(a.occurred_at)}</td>
                  <td className="small">{a.user_email ?? "—"}</td>
                  <td className="mono small">{a.action}</td>
                  <td className="small">{a.action_type}</td>
                  <td><StatusPill status={a.result} /></td>
                  <td className="mono small">{Object.keys(a.detail).length ? JSON.stringify(a.detail) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function SettingsPage() {
  const { user } = useSession();
  const isAdmin = user.role === "admin";
  return (
    <div className="content">
      <PageHead title="Settings" subtitle={`${user.full_name} · ${label(user.role)}`} />
      <div className="stack">
        <div className="grid-2">
          <PasswordCard />
          {isAdmin ? <StatusCard /> : <section className="card"><h2>Account</h2><dl className="dl"><dt>Email</dt><dd>{user.email}</dd><dt>Role</dt><dd>{label(user.role)}</dd></dl></section>}
        </div>
        <OfficeSettingsCard isAdmin={isAdmin} />
        {isAdmin && <UsersCard />}
        {isAdmin && <AuditCard />}
      </div>
    </div>
  );
}
