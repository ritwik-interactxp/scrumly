// ─── Auth ───────────────────────────────────────────────────────────────────

export type SystemRole = "owner" | "colleague" | "client";

export interface User {
  id: string;
  email: string;
  name: string;
  system_role: SystemRole;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user_id: string;
  name: string;
  system_role: SystemRole;
}

// ─── Projects ───────────────────────────────────────────────────────────────

export type ProjectStatus = "active" | "archived";

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  created_at: string;
  member_count: number;
  module_count: number;
  progress: number;
  share_token?: string;  // used by owner to generate public portal link
}

export type ProjectRoleInProject = "colleague" | "client";

export interface Member {
  id: string;
  name: string;
  email: string;
  role_in_project: ProjectRoleInProject;
  status: "pending" | "active";
}

// ─── Modules ────────────────────────────────────────────────────────────────

export type ModuleStatus = "not_started" | "in_progress" | "review" | "done";

export interface Module {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: ModuleStatus;
  doc_link?: string;
  order_index: number;
  due_date?: string | null;
  created_at: string;
  checklist_total: number;
  checklist_done: number;
  progress: number;
}

// ─── Checklist ──────────────────────────────────────────────────────────────

export interface ChecklistItem {
  id: string;
  module_id: string;
  text: string;
  is_done: boolean;
  done_by?: string;
  done_by_name?: string;
  done_at?: string;
  order_index: number;
}

// ─── Portal ─────────────────────────────────────────────────────────────────

export interface PortalChecklistItem {
  text: string;
  is_done: boolean;
}

export interface PortalModule {
  id: string;
  title: string;
  description?: string;
  status: ModuleStatus;
  doc_link?: string;
  progress: number;
  checklist_total: number;
  checklist_done: number;
  checklist_items: PortalChecklistItem[];  // actual task names now included
}

export interface PortalProject {
  id: string;
  name: string;
  description?: string;
  modules: PortalModule[];
  overall_progress: number;
}

// ─── AI Scaffold ────────────────────────────────────────────────────────────

export interface ChecklistItemImport {
  text: string;
  order_index: number;
}

export interface ModuleImport {
  title: string;
  description?: string;
  status: ModuleStatus;
  doc_link?: string;
  order_index: number;
  checklist: ChecklistItemImport[];
}

export interface ScaffoldPreview {
  project: {
    name: string;
    description?: string;
  };
  modules: ModuleImport[];
}

// ─── API Keys ────────────────────────────────────────────────────────────────

export interface KeyStatus {
  has_anthropic: boolean;
  has_openai: boolean;
  anthropic_masked?: string;
  openai_masked?: string;
}
