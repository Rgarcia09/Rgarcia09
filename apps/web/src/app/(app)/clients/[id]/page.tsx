"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ClientForm } from "@/components/DirectoryForms";
import { ErrorNotice, Loading, PageHead, StatusPill } from "@/components/ui";
import { formatDate, label } from "@/lib/format";
import type { Client, ProjectSummary } from "@/lib/types";
import { useApi } from "@/lib/useApi";

export default function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, setData } = useApi<Client>(`/api/clients/${id}`);
  const projects = useApi<ProjectSummary[]>(`/api/clients/${id}/projects`);
  const [editing, setEditing] = useState(false);

  if (error) return <div className="content"><ErrorNotice error={error} /></div>;
  if (!data) return <div className="content"><Loading /></div>;
  return (
    <div className="content">
      <PageHead eyebrow="CLIENT" title={data.name} subtitle={data.billing_name ?? undefined}
        actions={<button className="btn" onClick={() => setEditing((e) => !e)}>{editing ? "Close editor" : "Edit"}</button>} />
      {editing ? (
        <ClientForm client={data} onSaved={(c) => { setData(c); setEditing(false); }} />
      ) : (
        <div className="stack">
          <div className="grid-2">
            <section className="card">
              <h2>Details</h2>
              <dl className="dl">
                <dt>Email</dt><dd>{data.email ?? "—"}</dd>
                <dt>Phone</dt><dd>{data.phone ?? "—"}</dd>
                <dt>Billing address</dt><dd style={{ whiteSpace: "pre-wrap" }}>{data.billing_address ?? "—"}</dd>
                <dt>Notes</dt><dd style={{ whiteSpace: "pre-wrap" }}>{data.notes ?? "—"}</dd>
              </dl>
            </section>
            <section className="card">
              <h2>Contacts</h2>
              {data.contacts.length === 0 ? <p className="muted" style={{ margin: 0 }}>No contacts recorded.</p> : (
                <ul className="list">
                  {data.contacts.map((c) => (
                    <li key={c.id}><span>{c.full_name}{c.title && <span className="muted"> · {c.title}</span>}{c.is_primary && <> <span className="pill accent">Primary</span></>}</span>
                      <span className="muted">{[c.email, c.phone].filter(Boolean).join(" · ")}</span></li>
                  ))}
                </ul>
              )}
            </section>
          </div>
          <section className="card">
            <h2>Projects</h2>
            {projects.data?.length === 0 && <p className="muted" style={{ margin: 0 }}>No projects linked to this client.</p>}
            <ul className="list">
              {projects.data?.map((p) => (
                <li key={p.id}>
                  <Link className="link" href={`/projects/${p.id}`}><span className="mono">{p.project_number}</span> — {p.name}</Link>
                  <span className="row"><span className="muted small">{label(p.phase)} · {formatDate(p.deadline)}</span><StatusPill status={p.status} /></span>
                </li>
              ))}
            </ul>
            <p className="muted small">Invoice and payment history will appear here with the billing module (Phase 4).</p>
          </section>
        </div>
      )}
    </div>
  );
}
