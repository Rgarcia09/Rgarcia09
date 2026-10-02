export interface NavItem {
  href: string;
  label: string;
  /** Development phase in which the module ships; shown instead of a fake page. */
  plannedPhase?: number;
}

export const NAV: { heading?: string; items: NavItem[] }[] = [
  {
    items: [
      { href: "/", label: "AVA" },
      { href: "/today", label: "Today" },
      { href: "/search", label: "Search" },
    ],
  },
  {
    heading: "Office",
    items: [
      { href: "/projects", label: "Projects" },
      { href: "/clients", label: "Clients" },
      { href: "/consultants", label: "Consultants" },
    ],
  },
  {
    heading: "Planned modules",
    items: [
      { href: "/agenda", label: "Agenda", plannedPhase: 3 },
      { href: "/documents", label: "Documents", plannedPhase: 2 },
      { href: "/email", label: "Email", plannedPhase: 3 },
      { href: "/invoices", label: "Invoices", plannedPhase: 4 },
      { href: "/reports", label: "Reports", plannedPhase: 5 },
      { href: "/rfis", label: "RFIs", plannedPhase: 6 },
      { href: "/submittals", label: "Submittals", plannedPhase: 6 },
    ],
  },
];

export const PLANNED: Record<string, { label: string; phase: number; description: string }> = {
  agenda: { label: "Agenda", phase: 3, description: "Shared agenda combining Google Calendar events with project deadlines." },
  documents: { label: "Documents", phase: 2, description: "Dropbox project folders, document indexing, and cited search across office files." },
  email: { label: "Email", phase: 3, description: "Gmail search, project classification of threads, and reviewed drafts (never sent automatically)." },
  invoices: { label: "Invoices", phase: 4, description: "Invoice register, aging (30+ days), periodic review, and billing arithmetic checks." },
  reports: { label: "Reports", phase: 5, description: "Monthly reports from office templates with numbering, sources, and human review." },
  rfis: { label: "RFIs", phase: 6, description: "Structured RFI log linked to drawings, specifications and responses." },
  submittals: { label: "Submittals", phase: 6, description: "Submittal log with status tracking and specification links." },
};
