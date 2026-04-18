export type SystemRole = "owner" | "colleague" | "client";
export interface User { id: string; email: string; name: string; system_role: SystemRole; }
export interface AuthToken { access_token: string; token_type: string; user_id: string; name: string; system_role: SystemRole; }
export type ProjectStatus = "active" | "archived";
export interface Project { id: string; name: string; description?: string; status: ProjectStatus; created_at: string; member_count: number; module_count: number; progress: number; share_token?: string; git_link?: string; }
export type ProjectRoleInProject = "colleague" | "client";
export interface Member { id: string; name: string; email: string; role_in_project: ProjectRoleInProject; status: "pending" | "active"; }
export type ModuleStatus = "not_started" | "in_progress" | "review" | "done";
export interface Module { id: string; project_id: string; title: string; description?: string; status: ModuleStatus; doc_link?: string; order_index: number; due_date?: string | null; created_at: string; created_by_name?: string; creation_source?: string; checklist_total: number; checklist_done: number; progress: number; }
export interface ChecklistItem { id: string; module_id: string; text: string; is_done: boolean; done_by?: string; done_by_name?: string; done_at?: string; order_index: number; }
export interface ActivityLog { id: string; project_id: string; user_id?: string; user_name: string; action: string; source: string; description: string; created_at: string; }
export interface Contribution { user_id?: string; user_name: string; modules_created: number; tasks_completed: number; tasks_created: number; last_active?: string; }
export interface DailySummary { project_id: string; enabled: boolean; last_generated_at?: string; last_summary_text?: string; }
export interface PortalChecklistItem { text: string; is_done: boolean; }
export interface PortalModule { id: string; title: string; description?: string; status: ModuleStatus; doc_link?: string; progress: number; checklist_total: number; checklist_done: number; checklist_items: PortalChecklistItem[]; }
export interface PortalProject { id: string; name: string; description?: string; git_link?: string; modules: PortalModule[]; overall_progress: number; }
export interface ChecklistItemImport { text: string; order_index: number; }
export interface ModuleImport { title: string; description?: string; status: ModuleStatus; doc_link?: string; order_index: number; checklist: ChecklistItemImport[]; }
export interface ScaffoldPreview { project: { name: string; description?: string }; modules: ModuleImport[]; }
export interface KeyStatus { has_anthropic: boolean; has_openai: boolean; anthropic_masked?: string; openai_masked?: string; }
