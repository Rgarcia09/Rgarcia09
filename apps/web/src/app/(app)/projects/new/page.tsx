"use client";

import { ProjectForm } from "@/components/ProjectForm";
import { PageHead } from "@/components/ui";

export default function NewProjectPage() {
  return (
    <div className="content">
      <PageHead title="New project" eyebrow="Project Registry" />
      <ProjectForm />
    </div>
  );
}
