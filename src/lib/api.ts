import axios from "axios";
import { getToken, clearAuth } from "./auth";
import type {
  AuthToken, Project, Member, Module, ChecklistItem,
  PortalProject, ScaffoldPreview, KeyStatus
} from "./types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8001",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      clearAuth();
      window.location.href = "/auth/login";
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthToken>("/auth/login", { email, password }).then((r) => r.data),
  acceptInvite: (token: string, name: string, password: string) =>
    api.post<AuthToken>("/auth/accept-invite", { token, name, password }).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
};

// ── API key management (owner only) ──────────────────────────────────────────
export const keysApi = {
  getStatus: () => api.get<KeyStatus>("/auth/keys").then((r) => r.data),
  save: (body: { anthropic_api_key?: string; openai_api_key?: string }) =>
    api.patch("/auth/keys", body).then((r) => r.data),
};

export const projectsApi = {
  list: () => api.get<Project[]>("/projects").then((r) => r.data),
  get: (id: string) => api.get<Project>(`/projects/${id}`).then((r) => r.data),
  create: (name: string, description?: string) =>
    api.post<Project>("/projects", { name, description }).then((r) => r.data),
  update: (id: string, data: Partial<{ name: string; description: string; status: string }>) =>
    api.patch<Project>(`/projects/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  regenerateShareToken: (id: string) =>
    api.post<Project>(`/projects/${id}/regenerate-share-token`).then((r) => r.data),
};

export const membersApi = {
  list: (projectId: string) =>
    api.get<Member[]>(`/projects/${projectId}/members`).then((r) => r.data),
  invite: (projectId: string, email: string, name: string, role: string) =>
    api.post(`/projects/${projectId}/invite`, { email, name, role_in_project: role }).then((r) => r.data),
  remove: (projectId: string, userId: string) =>
    api.delete(`/projects/${projectId}/members/${userId}`),
  revokeInvite: (projectId: string, userId: string) =>
    api.post(`/projects/${projectId}/members/${userId}/revoke-invite`),
};

export const modulesApi = {
  list: (projectId: string) =>
    api.get<Module[]>(`/projects/${projectId}/modules`).then((r) => r.data),
  create: (projectId: string, data: { title: string; description?: string; doc_link?: string; due_date?: string | null }) =>
    api.post<Module>(`/projects/${projectId}/modules`, data).then((r) => r.data),
  update: (projectId: string, moduleId: string, data: Partial<{ title: string; description: string; status: string; doc_link: string; due_date: string | null }>) =>
    api.patch<Module>(`/projects/${projectId}/modules/${moduleId}`, data).then((r) => r.data),
  delete: (projectId: string, moduleId: string) =>
    api.delete(`/projects/${projectId}/modules/${moduleId}`),
};

export const checklistApi = {
  list: (projectId: string, moduleId: string) =>
    api.get<ChecklistItem[]>(`/projects/${projectId}/modules/${moduleId}/checklist`).then((r) => r.data),
  add: (projectId: string, moduleId: string, text: string) =>
    api.post<ChecklistItem>(`/projects/${projectId}/modules/${moduleId}/checklist`, { text }).then((r) => r.data),
  toggle: (projectId: string, itemId: string) =>
    api.patch<ChecklistItem>(`/projects/${projectId}/checklist/${itemId}/toggle`).then((r) => r.data),
  update: (projectId: string, itemId: string, text: string) =>
    api.patch<ChecklistItem>(`/projects/${projectId}/checklist/${itemId}`, { text }).then((r) => r.data),
  delete: (projectId: string, itemId: string) =>
    api.delete(`/projects/${projectId}/checklist/${itemId}`),
};

// ── Authenticated portal (owner preview / legacy client login) ────────────────
export const portalApi = {
  get: (projectId: string) =>
    api.get<PortalProject>(`/portal/${projectId}`).then((r) => r.data),
};

// ── Public portal (no auth — share token) ─────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8001";

export const publicPortalApi = {
  get: (shareToken: string) =>
    fetch(`${API_BASE}/portal/public/${shareToken}`).then((r) => {
      if (!r.ok) return r.json().then((d) => Promise.reject(new Error(d.detail || "Not found")));
      return r.json() as Promise<PortalProject>;
    }),
  summary: (shareToken: string) =>
    fetch(`${API_BASE}/portal/public/${shareToken}/summary`, { method: "POST" }).then((r) => {
      if (!r.ok) return r.json().then((d) => Promise.reject(new Error(d.detail || "Error")));
      return r.json() as Promise<{ summary: string }>;
    }),
};

export const aiApi = {
  // anthropic_api_key removed — now pulled from DB server-side
  scaffoldPreview: (description: string) =>
    api.post<ScaffoldPreview>("/ai/scaffold/preview", { description }).then((r) => r.data),

  scaffoldCommit: (preview: ScaffoldPreview) =>
    api.post<{ project_id: string; name: string }>("/ai/scaffold/commit", preview).then((r) => r.data),

  importProject: (data: ScaffoldPreview) =>
    api.post<{ project_id: string; name: string }>("/ai/import", data).then((r) => r.data),

  chat: (messages: { role: string; content: string }[]) =>
    api.post<{ reply: string }>("/ai/chat", { messages }).then((r) => r.data),
};

// ── Persistent chat sessions (per-project) ────────────────────────────────────
export interface ChatSession {
  id: string;
  project_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export const chatApi = {
  listSessions: (projectId: string) =>
    api.get<ChatSession[]>(`/projects/${projectId}/chat/sessions`).then((r) => r.data),

  createSession: (projectId: string, title = "New chat") =>
    api.post<ChatSession>(`/projects/${projectId}/chat/sessions`, { title }).then((r) => r.data),

  deleteSession: (projectId: string, sessionId: string) =>
    api.delete(`/projects/${projectId}/chat/sessions/${sessionId}`),

  renameSession: (projectId: string, sessionId: string, title: string) =>
    api.patch<ChatSession>(`/projects/${projectId}/chat/sessions/${sessionId}`, { title }).then((r) => r.data),

  getMessages: (projectId: string, sessionId: string) =>
    api.get<ChatMessage[]>(`/projects/${projectId}/chat/sessions/${sessionId}/messages`).then((r) => r.data),

  // anthropic_api_key removed — pulled from DB server-side
  send: (projectId: string, sessionId: string, content: string) =>
    api.post<{ reply: string; session_id: string; session_title: string; actions_taken: string[] }>(
      `/projects/${projectId}/chat/sessions/${sessionId}/send`,
      { content }
    ).then((r) => r.data),
};
