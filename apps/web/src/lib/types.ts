// Mirrors the FastAPI schemas (see /api/docs for the authoritative OpenAPI definition).

export type Role = "admin" | "staff";

export interface User {
  id: string;
  email: string;
  full_name: string;
  initials: string | null;
  role: Role;
  is_active: boolean;
  last_login_at: string | null;
}

export interface UserBrief {
  id: string;
  full_name: string;
  initials: string | null;
}

export interface Meta {
  ava_name: string;
  office_name: string;
  strict_local_mode: boolean;
  environment: string;
  demo_mode: boolean;
}

export interface ClientContact {
  id?: string;
  full_name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  notes: string | null;
}

export interface Client {
  id: string;
  name: string;
  billing_name: string | null;
  billing_address: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  contacts: ClientContact[];
}

export interface ConsultantContact {
  id?: string;
  full_name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
}

export interface Consultant {
  id: string;
  company_name: string;
  discipline: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  contacts: ConsultantContact[];
}

export interface ProjectSummary {
  id: string;
  project_number: string;
  name: string;
  short_name: string | null;
  client: { id: string; name: string } | null;
  location: string | null;
  status: string;
  phase: string | null;
  deadline: string | null;
  project_manager: UserBrief | null;
  is_archived: boolean;
  updated_at: string;
}

export interface ProjectConsultant {
  id: string;
  discipline: string;
  scope_notes: string | null;
  consultant_id: string;
  consultant_name: string;
  contact: ConsultantContact | null;
}

export interface Project extends ProjectSummary {
  client_id: string | null;
  project_type: string | null;
  project_manager_id: string | null;
  contract_number: string | null;
  contract_value: string | null;
  start_date: string | null;
  construction_start: string | null;
  construction_end: string | null;
  billing_notes: string | null;
  dropbox_path: string | null;
  notes: string | null;
  tags: string[];
  staff: { user: UserBrief; role_on_project: string | null }[];
  consultants: ProjectConsultant[];
  created_at: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface Source {
  kind: string;
  label: string;
  url: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: Source[];
  produced_by: string | null;
  created_at: string;
}

export interface ChatResponse {
  conversation_id: string;
  intent: string;
  project_id: string | null;
  message: ChatMessage;
}

export interface Conversation {
  id: string;
  title: string;
  project_id: string | null;
  updated_at: string;
}

export interface SearchHit {
  kind: string;
  id: string;
  title: string;
  subtitle: string | null;
  url: string;
  score: number;
}

export interface DeadlineItem {
  project: ProjectSummary;
  deadline: string;
  days_remaining: number;
  source: string;
}

export interface IntegrationNotice {
  kind: string;
  status: string;
  message: string;
}

export interface TodayResponse {
  today: string;
  overdue: DeadlineItem[];
  upcoming: DeadlineItem[];
  integrations: IntegrationNotice[];
}

export interface EditableSettings {
  ava_name: string;
  office_name: string;
  internal_url: string;
  invoice_alert_threshold_days: number;
  invoice_review_frequency_days: number;
  ai_model: string;
  embedding_model: string;
}

export interface ComponentStatus {
  name: string;
  status: string;
  detail: string;
  last_sync_at: string | null;
}

export interface SystemStatus {
  components: ComponentStatus[];
  strict_local_mode: boolean;
  ai_provider: string;
  ai_model: string;
  ai_is_local: boolean;
  last_backup_at: string | null;
  queued_jobs: number;
}

export interface AuditEntry {
  id: number;
  occurred_at: string;
  user_email: string | null;
  action: string;
  action_type: string;
  resource_type: string | null;
  resource_id: string | null;
  result: string;
  ip_address: string | null;
  detail: Record<string, unknown>;
}
