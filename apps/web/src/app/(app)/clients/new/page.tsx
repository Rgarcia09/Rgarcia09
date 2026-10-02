"use client";

import { ClientForm } from "@/components/DirectoryForms";
import { PageHead } from "@/components/ui";

export default function NewClientPage() {
  return (
    <div className="content">
      <PageHead title="New client" eyebrow="Client Registry" />
      <ClientForm />
    </div>
  );
}
