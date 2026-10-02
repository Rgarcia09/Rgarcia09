"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorNotice, Loading, PageHead, StatusPill } from "@/components/ui";
import { formatDate, label, PROJECT_STATUSES } from "@/lib/format";
import type { Page, ProjectSummary } from "@/lib/types";
import { useApi } from "@/lib/useApi";

export default function ProjectsPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [archived, setArchived] = useState(false);
  const params = new URLSearchParams({ limit: "200" });
  if (q.trim()) params.set("q", q.trim());
  if (status) params.set("status", status);
  if (archived) params.set("include_archived", "true");
  const { data, error, loading } = useApi<Page<ProjectSummary>>(`/api/projects?${params}`);

  return (
    <div className="content">
      <PageHead
        title="Projects"
        subtitle={data ? `${data.total} project${data.total === 1 ? "" : "s"}` : undefined}
        actions={<Link className="btn primary" href="/projects/new">New project</Link>}
      />
      <div className="row" style={{ marginBottom: 16 }}>
        <input className="input" style={{ maxWidth: 320 }} placeholder="Filter by number, name, client, location" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter projects" />
        <select className="input" style={{ maxWidth: 180 }} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
        <label className="row small muted"><input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} /> Include archived</label>
      </div>
      <ErrorNotice error={error} />
      {loading && !data && <Loading />}
      {data && data.items.length === 0 && (
        <div className="empty">No projects match. {!q && !status && <Link className="link" href="/projects/new">Add the first project.</Link>}</div>
      )}
      {data && data.items.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Number</th><th>Project</th><th>Client</th><th>Phase</th><th>Status</th><th>Deadline</th></tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id} className="clickable" onClick={() => router.push(`/projects/${p.id}`)}>
                  <td className="mono"><Link href={`/projects/${p.id}`}>{p.project_number}</Link></td>
                  <td>{p.name}{p.location && <div className="muted small">{p.location}</div>}</td>
                  <td>{p.client?.name ?? "—"}</td>
                  <td>{label(p.phase)}</td>
                  <td><StatusPill status={p.status} />{p.is_archived && <> <span className="pill">Archived</span></>}</td>
                  <td>{formatDate(p.deadline)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
