"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AvaChat } from "@/components/AvaChat";
import { useSession } from "@/components/session";
import { ErrorNotice, Loading, PageHead, StatusPill } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, formatDateTime, formatMoney, label } from "@/lib/format";
import type { Project } from "@/lib/types";
import { useApi } from "@/lib/useApi";

const MODULES = [
  ["Recent files", "Dropbox integration", 2],
  ["Recent emails", "Email integration", 3],
  ["Upcoming meetings", "Calendar integration", 3],
  ["Invoices", "The billing module", 4],
  ["Reports", "The report module", 5],
  ["RFIs and submittals", "The RFI and submittal logs", 6],
] as const;

export default function ProjectDashboard() {
  const { id } = useParams<{ id: string }>();
  const { meta } = useSession();
  const { data: p, error, setData } = useApi<Project>(`/api/projects/${id}`);
  const [actionError, setActionError] = useState<string | null>(null);

  async function toggleArchive() {
    if (!p) return;
    const verb = p.is_archived ? "restore" : "archive";
    if (!window.confirm(`${label(verb)} project ${p.project_number}? It will ${p.is_archived ? "reappear in" : "be hidden from"} the active list. No data is deleted.`)) return;
    try {
      setData(await api<Project>(`/api/projects/${p.id}/${p.is_archived ? "unarchive" : "archive"}`, { method: "POST" }));
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  if (error) return <div className="content"><ErrorNotice error={error} /></div>;
  if (!p) return <div className="content"><Loading /></div>;

  return (
    <div className="content">
      <PageHead
        eyebrow={`PROJECT ${p.project_number}`}
        title={p.name}
        subtitle={[p.client?.name, p.location].filter(Boolean).join(" · ") || undefined}
        actions={
          <>
            <StatusPill status={p.status} />
            {p.is_archived && <span className="pill">Archived</span>}
            <Link className="btn" href={`/projects/${p.id}/edit`}>Edit</Link>
            <button className="btn ghost" onClick={toggleArchive}>{p.is_archived ? "Restore" : "Archive"}</button>
          </>
        }
      />
      <ErrorNotice error={actionError} />
      <div className="stack">
        <section className="card">
          <h2>Ask {meta.ava_name} about this project</h2>
          <AvaChat
            embedded
            avaName={meta.ava_name}
            projectId={p.id}
            placeholder={`Ask ${meta.ava_name} about this project…`}
            suggestions={["What are we waiting for on this project?", "Who are the consultants?", "When is the next deadline?"]}
          />
        </section>

        <div className="grid-2">
          <section className="card">
            <h2>Overview</h2>
            <dl className="dl">
              <dt>Client</dt><dd>{p.client ? <Link className="link" href={`/clients/${p.client.id}`}>{p.client.name}</Link> : "—"}</dd>
              <dt>Phase</dt><dd>{label(p.phase)}</dd>
              <dt>Project type</dt><dd>{p.project_type ?? "—"}</dd>
              <dt>Project manager</dt><dd>{p.project_manager?.full_name ?? "—"}</dd>
              <dt>Staff</dt><dd>{p.staff.length ? p.staff.map((s) => s.user.full_name).join(", ") : "—"}</dd>
              <dt>Tags</dt><dd>{p.tags.length ? p.tags.map((t) => <span key={t} className="pill" style={{ marginRight: 4 }}>{t}</span>) : "—"}</dd>
            </dl>
          </section>
          <section className="card">
            <h2>Contract and schedule</h2>
            <dl className="dl">
              <dt>Next deadline</dt><dd>{formatDate(p.deadline)}</dd>
              <dt>Contract number</dt><dd>{p.contract_number ?? "—"}</dd>
              <dt>Contract value</dt><dd>{formatMoney(p.contract_value)}</dd>
              <dt>Start date</dt><dd>{formatDate(p.start_date)}</dd>
              <dt>Construction</dt><dd>{p.construction_start || p.construction_end ? `${formatDate(p.construction_start)} – ${formatDate(p.construction_end)}` : "—"}</dd>
              <dt>Billing notes</dt><dd style={{ whiteSpace: "pre-wrap" }}>{p.billing_notes ?? "—"}</dd>
            </dl>
          </section>
        </div>

        <section className="card">
          <h2>Consultants</h2>
          {p.consultants.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>No consultants assigned. <Link className="link" href={`/projects/${p.id}/edit`}>Assign consultants.</Link></p>
          ) : (
            <ul className="list">
              {p.consultants.map((c) => (
                <li key={c.id}>
                  <span><b>{label(c.discipline)}</b> — <Link className="link" href={`/consultants/${c.consultant_id}`}>{c.consultant_name}</Link></span>
                  <span className="muted">{c.contact ? `${c.contact.full_name}${c.contact.email ? ` · ${c.contact.email}` : ""}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid-3">
          {MODULES.map(([title, source, phase]) => (
            <section className="card" key={title}>
              <h2>{title}</h2>
              <p className="muted small" style={{ margin: 0 }}>{source} arrives in Phase {phase}. Nothing is shown until it can be verified.</p>
            </section>
          ))}
        </div>

        <section className="card">
          <h2>Files and notes</h2>
          <dl className="dl">
            <dt>Dropbox folder</dt><dd className="mono">{p.dropbox_path ?? "—"}</dd>
            <dt>Notes</dt><dd style={{ whiteSpace: "pre-wrap" }}>{p.notes ?? "—"}</dd>
            <dt>Record updated</dt><dd>{formatDateTime(p.updated_at)}</dd>
          </dl>
        </section>
      </div>
    </div>
  );
}
