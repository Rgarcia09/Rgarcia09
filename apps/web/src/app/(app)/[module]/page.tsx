"use client";

import { notFound, useParams } from "next/navigation";
import { PLANNED } from "@/components/nav";
import { PageHead } from "@/components/ui";

export default function PlannedModule() {
  const { module } = useParams<{ module: string }>();
  const info = PLANNED[module];
  if (!info) notFound();
  return (
    <div className="content">
      <PageHead title={info.label} eyebrow={`Planned · Phase ${info.phase}`} />
      <div className="empty">
        <p style={{ marginTop: 0 }}>{info.description}</p>
        <p style={{ marginBottom: 0 }}>This module is not available yet. No placeholder data is shown.</p>
      </div>
    </div>
  );
}
