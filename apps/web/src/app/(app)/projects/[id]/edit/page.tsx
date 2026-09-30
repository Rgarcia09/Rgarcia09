"use client";

import { useParams } from "next/navigation";
import { ProjectForm } from "@/components/ProjectForm";
import { ErrorNotice, Loading, PageHead } from "@/components/ui";
import type { Project } from "@/lib/types";
import { useApi } from "@/lib/useApi";

export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error } = useApi<Project>(`/api/projects/${id}`);
  return (
    <div className="content">
      <PageHead title={data ? `Edit ${data.project_number}` : "Edit project"} eyebrow="Project Registry" />
      <ErrorNotice error={error} />
      {data ? <ProjectForm project={data} /> : !error && <Loading />}
    </div>
  );
}
