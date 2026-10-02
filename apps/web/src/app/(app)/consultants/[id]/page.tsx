"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { ConsultantForm } from "@/components/DirectoryForms";
import { ErrorNotice, Loading, PageHead } from "@/components/ui";
import { label } from "@/lib/format";
import type { Consultant } from "@/lib/types";
import { useApi } from "@/lib/useApi";

export default function ConsultantPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, setData } = useApi<Consultant>(`/api/consultants/${id}`);
  const [editing, setEditing] = useState(false);

  if (error) return <div className="content"><ErrorNotice error={error} /></div>;
  if (!data) return <div className="content"><Loading /></div>;
  return (
    <div className="content">
      <PageHead eyebrow={`CONSULTANT · ${label(data.discipline).toUpperCase()}`} title={data.company_name}
        actions={<button className="btn" onClick={() => setEditing((e) => !e)}>{editing ? "Close editor" : "Edit"}</button>} />
      {editing ? (
        <ConsultantForm consultant={data} onSaved={(c) => { setData(c); setEditing(false); }} />
      ) : (
        <div className="grid-2">
          <section className="card">
            <h2>Details</h2>
            <dl className="dl">
              <dt>Email</dt><dd>{data.email ?? "—"}</dd>
              <dt>Phone</dt><dd>{data.phone ?? "—"}</dd>
              <dt>Website</dt><dd>{data.website ?? "—"}</dd>
              <dt>Address</dt><dd style={{ whiteSpace: "pre-wrap" }}>{data.address ?? "—"}</dd>
              <dt>Notes</dt><dd style={{ whiteSpace: "pre-wrap" }}>{data.notes ?? "—"}</dd>
            </dl>
          </section>
          <section className="card">
            <h2>Contacts</h2>
            {data.contacts.length === 0 ? <p className="muted" style={{ margin: 0 }}>No contacts recorded.</p> : (
              <ul className="list">
                {data.contacts.map((c) => (
                  <li key={c.id}><span>{c.full_name}{c.title && <span className="muted"> · {c.title}</span>}</span>
                    <span className="muted">{[c.email, c.phone].filter(Boolean).join(" · ")}</span></li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
