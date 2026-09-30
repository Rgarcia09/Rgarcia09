"use client";

import Link from "next/link";
import { useState } from "react";
import { ErrorNotice, Loading, PageHead } from "@/components/ui";
import { DISCIPLINES, label } from "@/lib/format";
import type { Consultant } from "@/lib/types";
import { useApi } from "@/lib/useApi";

export default function ConsultantsPage() {
  const [q, setQ] = useState("");
  const [discipline, setDiscipline] = useState("");
  const params = new URLSearchParams({ include_inactive: "true" });
  if (q.trim()) params.set("q", q.trim());
  if (discipline) params.set("discipline", discipline);
  const { data, error, loading } = useApi<Consultant[]>(`/api/consultants?${params}`);
  return (
    <div className="content">
      <PageHead title="Consultants" actions={<Link className="btn primary" href="/consultants/new">New consultant</Link>} />
      <div className="row" style={{ marginBottom: 16 }}>
        <input className="input" style={{ maxWidth: 320 }} placeholder="Filter by firm or person" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter consultants" />
        <select className="input" style={{ maxWidth: 220 }} value={discipline} onChange={(e) => setDiscipline(e.target.value)} aria-label="Discipline">
          <option value="">All disciplines</option>
          {DISCIPLINES.map((d) => <option key={d} value={d}>{label(d)}</option>)}
        </select>
      </div>
      <ErrorNotice error={error} />
      {loading && !data && <Loading />}
      {data?.length === 0 && <div className="empty">No consultants recorded.</div>}
      {data && data.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Firm</th><th>Discipline</th><th>Contacts</th><th>Email</th></tr></thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id}>
                  <td><Link className="link" href={`/consultants/${c.id}`}>{c.company_name}</Link>{!c.is_active && <> <span className="pill">Inactive</span></>}</td>
                  <td>{label(c.discipline)}</td>
                  <td>{c.contacts.map((x) => x.full_name).join(", ") || "—"}</td>
                  <td>{c.email ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
