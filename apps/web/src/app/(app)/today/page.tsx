"use client";

import Link from "next/link";
import { ErrorNotice, Loading, PageHead, StatusPill } from "@/components/ui";
import { formatDate, relativeDays } from "@/lib/format";
import type { DeadlineItem, TodayResponse } from "@/lib/types";
import { useApi } from "@/lib/useApi";

function DeadlineList({ items, empty }: { items: DeadlineItem[]; empty: string }) {
  if (!items.length) return <p className="muted" style={{ margin: 0 }}>{empty}</p>;
  return (
    <ul className="list">
      {items.map((i) => (
        <li key={i.project.id}>
          <Link href={`/projects/${i.project.id}`}>
            <span className="mono">{i.project.project_number}</span> — {i.project.name}
          </Link>
          <span className={i.days_remaining < 0 ? "pill danger" : i.days_remaining <= 2 ? "pill warn" : "pill"}>
            {formatDate(i.deadline)} · {relativeDays(i.days_remaining)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function TodayPage() {
  const { data, error, loading } = useApi<TodayResponse>("/api/agenda/today?days=14");
  return (
    <div className="content">
      <PageHead title="Today" subtitle={data ? formatDate(data.today) : undefined} />
      <ErrorNotice error={error} />
      {loading && <Loading />}
      {data && (
        <div className="stack">
          <div className="grid-2">
            <section className="card">
              <h2>Overdue <span className="muted small">Project Registry</span></h2>
              <DeadlineList items={data.overdue} empty="No overdue registry deadlines." />
            </section>
            <section className="card">
              <h2>Upcoming deadlines <span className="muted small">Next 14 days</span></h2>
              <DeadlineList items={data.upcoming} empty="No registry deadlines in the next 14 days." />
            </section>
          </div>
          <section className="card">
            <h2>Connected sources</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Meetings, emails, invoices and documents appear here once their integrations are connected. Nothing is shown until it can be verified.
            </p>
            <ul className="list">
              {data.integrations.map((i) => (
                <li key={i.kind}>
                  <span>{i.message}</span>
                  <StatusPill status={i.status} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
