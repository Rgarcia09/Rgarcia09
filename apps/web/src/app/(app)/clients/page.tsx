"use client";

import Link from "next/link";
import { useState } from "react";
import { ErrorNotice, Loading, PageHead } from "@/components/ui";
import type { Client } from "@/lib/types";
import { useApi } from "@/lib/useApi";

export default function ClientsPage() {
  const [q, setQ] = useState("");
  const { data, error, loading } = useApi<Client[]>(`/api/clients?include_inactive=true${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`);
  return (
    <div className="content">
      <PageHead title="Clients" actions={<Link className="btn primary" href="/clients/new">New client</Link>} />
      <input className="input" style={{ maxWidth: 320, marginBottom: 16 }} placeholder="Filter clients" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter clients" />
      <ErrorNotice error={error} />
      {loading && !data && <Loading />}
      {data?.length === 0 && <div className="empty">No clients recorded.</div>}
      {data && data.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Client</th><th>Primary contact</th><th>Email</th><th>Phone</th></tr></thead>
            <tbody>
              {data.map((c) => {
                const primary = c.contacts.find((x) => x.is_primary) ?? c.contacts[0];
                return (
                  <tr key={c.id}>
                    <td><Link className="link" href={`/clients/${c.id}`}>{c.name}</Link>{!c.is_active && <> <span className="pill">Inactive</span></>}</td>
                    <td>{primary?.full_name ?? "—"}</td>
                    <td>{c.email ?? primary?.email ?? "—"}</td>
                    <td>{c.phone ?? primary?.phone ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
