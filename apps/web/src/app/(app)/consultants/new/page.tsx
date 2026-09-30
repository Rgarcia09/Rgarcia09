"use client";

import { ConsultantForm } from "@/components/DirectoryForms";
import { PageHead } from "@/components/ui";

export default function NewConsultantPage() {
  return (
    <div className="content">
      <PageHead title="New consultant" eyebrow="Consultant Directory" />
      <ConsultantForm />
    </div>
  );
}
