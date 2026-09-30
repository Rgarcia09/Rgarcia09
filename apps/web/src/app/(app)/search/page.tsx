"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { ErrorNotice, Loading, PageHead } from "@/components/ui";
import { label } from "@/lib/format";
import type { SearchHit } from "@/lib/types";
import { useApi } from "@/lib/useApi";

function SearchResults() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q") ?? "";
  const [draft, setDraft] = useState(q);
  const { data, error, loading } = useApi<{ hits: SearchHit[]; not_searched: string[] }>(
    q ? `/api/search?q=${encodeURIComponent(q)}` : null,
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (draft.trim()) router.push(`/search?q=${encodeURIComponent(draft.trim())}`);
  }

  return (
    <div className="content">
      <PageHead title="Search" subtitle="Projects, clients, consultants and contacts. Approximate spelling and accents are tolerated." />
      <form onSubmit={onSubmit} className="row" style={{ marginBottom: 18 }}>
        <input className="input" style={{ maxWidth: 480 }} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder='e.g. "25006", "Juan Ramón", "structural"' aria-label="Search" />
        <button className="btn primary" type="submit">Search</button>
      </form>
      <ErrorNotice error={error} />
      {loading && <Loading />}
      {data && (
        <div className="stack">
          {data.hits.length === 0 ? (
            <div className="empty">No records match “{q}”.</div>
          ) : (
            <ul className="list card" style={{ padding: "4px 18px" }}>
              {data.hits.map((h) => (
                <li key={`${h.kind}-${h.id}`}>
                  <Link className="link" href={h.url}>{h.title}</Link>
                  <span className="muted small">{h.subtitle ?? label(h.kind)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="muted small">Not yet searchable: {data.not_searched.join(", ")}.</p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  );
}
