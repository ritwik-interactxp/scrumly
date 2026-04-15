"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { projectsApi, modulesApi, membersApi, checklistApi } from "@/lib/api";
import type { Project, Module, Member, ChecklistItem } from "@/lib/types";

const STATUS_CONFIG = {
  not_started: { label: "Not Started", color: "#5a5a66", bg: "#1a1a20", border: "#2e2e38" },
  in_progress: { label: "In Progress", color: "#f59e0b", bg: "#f59e0b1a", border: "#f59e0b33" },
  review: { label: "Review", color: "#3b82f6", bg: "#3b82f61a", border: "#3b82f633" },
  done: { label: "Done", color: "#22c55e", bg: "#22c55e1a", border: "#22c55e33" },
};

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1 bg-[#1e1e24] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${value}%`, background: value === 100 ? "#22c55e" : "#7c6aff" }}
      />
    </div>
  );
}

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeTab, setActiveTab] = useState<"modules" | "members">("modules");

  // Module creation
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDesc, setModuleDesc] = useState("");
  const [moduleDoc, setModuleDoc] = useState("");
  const [creatingModule, setCreatingModule] = useState(false);

  // Invite
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"colleague" | "client">("colleague");
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  // Checklist panel
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    Promise.all([
      projectsApi.get(projectId),
      modulesApi.list(projectId),
      membersApi.list(projectId),
    ]).then(([p, m, mem]) => {
      setProject(p);
      setModules(m);
      setMembers(mem);
    });
  }, [projectId]);

  useEffect(() => {
    if (selectedModule) {
      checklistApi.list(projectId, selectedModule.id).then(setChecklist);
    }
  }, [selectedModule, projectId]);

  async function createModule() {
    if (!moduleTitle.trim()) return;
    setCreatingModule(true);
    try {
      const m = await modulesApi.create(projectId, {
        title: moduleTitle,
        description: moduleDesc || undefined,
        doc_link: moduleDoc || undefined,
      });
      setModules((prev) => [...prev, m]);
      setShowModuleForm(false);
      setModuleTitle("");
      setModuleDesc("");
      setModuleDoc("");
    } finally {
      setCreatingModule(false);
    }
  }

  async function inviteMember() {
    if (!inviteEmail || !inviteName) return;
    setInviting(true);
    try {
      const res = await membersApi.invite(projectId, inviteEmail, inviteName, inviteRole);
      setInviteLink(res.invite_link);
      membersApi.list(projectId).then(setMembers);
    } finally {
      setInviting(false);
    }
  }

  async function toggleItem(itemId: string) {
    const updated = await checklistApi.toggle(projectId, itemId);
    setChecklist((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
    // Refresh module progress
    modulesApi.list(projectId).then(setModules);
  }

  async function addChecklistItem() {
    if (!newItem.trim() || !selectedModule) return;
    const item = await checklistApi.add(projectId, selectedModule.id, newItem.trim());
    setChecklist((prev) => [...prev, item]);
    setNewItem("");
    modulesApi.list(projectId).then(setModules);
  }

  async function updateModuleStatus(moduleId: string, status: string) {
    const updated = await modulesApi.update(projectId, moduleId, { status });
    setModules((prev) => prev.map((m) => (m.id === moduleId ? updated : m)));
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center">
        <p className="text-[#5a5a66]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white">
      {/* Header */}
      <header className="border-b border-[#1e1e24] px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-[#5a5a66] mb-1">
          <Link href="/owner/dashboard" className="hover:text-white transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-white">{project.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-[#5a5a66] mt-0.5">{project.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href={`/portal/${projectId}`}
              className="border border-[#1e1e24] text-[#8a8a99] hover:text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
              target="_blank"
            >
              Preview Portal ↗
            </Link>
            <button
              onClick={() => setShowInvite(true)}
              className="bg-[#7c6aff] hover:bg-[#6b59ee] text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
            >
              + Invite
            </button>
          </div>
        </div>
      </header>

      {/* Stats bar */}
      <div className="border-b border-[#1e1e24] px-6 py-3 flex items-center gap-6 text-sm text-[#5a5a66]">
        <span>{modules.length} modules</span>
        <span>{members.length} members</span>
        <span>{project.progress}% overall</span>
        <div className="flex-1 max-w-48">
          <ProgressBar value={project.progress} />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#1e1e24] px-6 flex gap-6">
        {(["modules", "members"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 text-sm capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? "border-[#7c6aff] text-white"
                : "border-transparent text-[#5a5a66] hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex h-[calc(100vh-200px)]">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "modules" && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-medium text-[#8a8a99] uppercase tracking-wider">
                  Modules
                </h2>
                <button
                  onClick={() => setShowModuleForm(true)}
                  className="text-[#7c6aff] hover:text-white text-sm transition-colors"
                >
                  + Add Module
                </button>
              </div>

              <div className="space-y-3">
                {modules.map((mod) => {
                  const sc = STATUS_CONFIG[mod.status];
                  return (
                    <div
                      key={mod.id}
                      onClick={() => setSelectedModule(mod)}
                      className={`bg-[#111114] border rounded-xl p-4 cursor-pointer transition-all ${
                        selectedModule?.id === mod.id
                          ? "border-[#7c6aff]"
                          : "border-[#1e1e24] hover:border-[#2e2e38]"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium">{mod.title}</span>
                        <select
                          value={mod.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateModuleStatus(mod.id, e.target.value)}
                          className="text-xs px-2 py-0.5 rounded-full border bg-transparent cursor-pointer focus:outline-none"
                          style={{
                            color: sc.color,
                            borderColor: sc.border,
                            background: sc.bg,
                          }}
                        >
                          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                            <option key={k} value={k} style={{ background: "#111114", color: "#fff" }}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {mod.description && (
                        <p className="text-xs text-[#5a5a66] mb-2 line-clamp-1">{mod.description}</p>
                      )}

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-[#5a5a66]">
                          <span>
                            {mod.checklist_done}/{mod.checklist_total} items
                          </span>
                          <span>{mod.progress}%</span>
                        </div>
                        <ProgressBar value={mod.progress} />
                      </div>

                      {mod.doc_link && (
                        <a
                          href={mod.doc_link}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-[#7c6aff] hover:underline mt-2"
                        >
                          📄 Documentation ↗
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === "members" && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-medium text-[#8a8a99] uppercase tracking-wider">
                  Members
                </h2>
                <button
                  onClick={() => setShowInvite(true)}
                  className="text-[#7c6aff] hover:text-white text-sm transition-colors"
                >
                  + Invite
                </button>
              </div>
              <div className="space-y-2">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="bg-[#111114] border border-[#1e1e24] rounded-xl px-4 py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-[#5a5a66]">{m.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${
                          m.role_in_project === "colleague"
                            ? "border-[#7c6aff]/30 bg-[#7c6aff]/10 text-[#7c6aff]"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {m.role_in_project}
                      </span>
                      {m.status === "pending" && (
                        <span className="text-xs text-[#5a5a66]">pending</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Checklist panel */}
        {selectedModule && activeTab === "modules" && (
          <div className="w-80 border-l border-[#1e1e24] flex flex-col">
            <div className="p-4 border-b border-[#1e1e24] flex items-center justify-between">
              <span className="font-medium text-sm">{selectedModule.title}</span>
              <button
                onClick={() => setSelectedModule(null)}
                className="text-[#5a5a66] hover:text-white text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {checklist.length === 0 && (
                <p className="text-xs text-[#5a5a66] text-center py-4">No checklist items yet</p>
              )}
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 group"
                  onClick={() => toggleItem(item.id)}
                >
                  <div
                    className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center cursor-pointer transition-colors ${
                      item.is_done
                        ? "bg-[#7c6aff] border-[#7c6aff]"
                        : "border-[#2e2e38] hover:border-[#7c6aff]"
                    }`}
                  >
                    {item.is_done && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer">
                    <p
                      className={`text-sm ${
                        item.is_done ? "text-[#5a5a66] line-through" : "text-white"
                      }`}
                    >
                      {item.text}
                    </p>
                    {item.is_done && item.done_by_name && (
                      <p className="text-xs text-[#3a3a44] mt-0.5">
                        {item.done_by_name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-[#1e1e24]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addChecklistItem()}
                  placeholder="Add item..."
                  className="flex-1 bg-[#0d0d0f] border border-[#1e1e24] rounded-lg px-3 py-2 text-white text-sm placeholder:text-[#3a3a44] focus:outline-none focus:border-[#7c6aff] transition-colors"
                />
                <button
                  onClick={addChecklistItem}
                  disabled={!newItem.trim()}
                  className="bg-[#7c6aff] hover:bg-[#6b59ee] disabled:opacity-40 text-white text-sm px-3 py-2 rounded-lg transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Module create modal */}
      {showModuleForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111114] border border-[#1e1e24] rounded-xl w-full max-w-md p-6">
            <h3 className="font-semibold mb-4">New Module</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={moduleTitle}
                onChange={(e) => setModuleTitle(e.target.value)}
                placeholder="Module title"
                autoFocus
                className="w-full bg-[#0d0d0f] border border-[#1e1e24] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-[#3a3a44] focus:outline-none focus:border-[#7c6aff] transition-colors"
              />
              <textarea
                value={moduleDesc}
                onChange={(e) => setModuleDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full bg-[#0d0d0f] border border-[#1e1e24] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-[#3a3a44] focus:outline-none focus:border-[#7c6aff] transition-colors resize-none"
              />
              <input
                type="url"
                value={moduleDoc}
                onChange={(e) => setModuleDoc(e.target.value)}
                placeholder="Google Docs link (optional)"
                className="w-full bg-[#0d0d0f] border border-[#1e1e24] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-[#3a3a44] focus:outline-none focus:border-[#7c6aff] transition-colors"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowModuleForm(false)}
                className="flex-1 border border-[#1e1e24] text-[#8a8a99] hover:text-white text-sm py-2.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createModule}
                disabled={creatingModule || !moduleTitle.trim()}
                className="flex-1 bg-[#7c6aff] hover:bg-[#6b59ee] disabled:opacity-50 text-white text-sm py-2.5 rounded-lg transition-colors"
              >
                {creatingModule ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111114] border border-[#1e1e24] rounded-xl w-full max-w-md p-6">
            <h3 className="font-semibold mb-4">Invite to Project</h3>

            {inviteLink ? (
              <div>
                <p className="text-sm text-[#8a8a99] mb-2">Share this link:</p>
                <div className="bg-[#0d0d0f] border border-[#1e1e24] rounded-lg px-3 py-2.5 text-xs text-[#7c6aff] break-all mb-4">
                  {inviteLink}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(inviteLink)}
                  className="w-full border border-[#1e1e24] text-[#8a8a99] hover:text-white text-sm py-2 rounded-lg transition-colors mb-2"
                >
                  Copy Link
                </button>
                <button
                  onClick={() => {
                    setShowInvite(false);
                    setInviteLink("");
                    setInviteEmail("");
                    setInviteName("");
                  }}
                  className="w-full text-[#5a5a66] text-sm py-2"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Their name"
                    className="w-full bg-[#0d0d0f] border border-[#1e1e24] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-[#3a3a44] focus:outline-none focus:border-[#7c6aff] transition-colors"
                  />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full bg-[#0d0d0f] border border-[#1e1e24] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-[#3a3a44] focus:outline-none focus:border-[#7c6aff] transition-colors"
                  />
                  <div className="flex gap-2">
                    {(["colleague", "client"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setInviteRole(r)}
                        className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                          inviteRole === r
                            ? "border-[#7c6aff] bg-[#7c6aff]/10 text-[#7c6aff]"
                            : "border-[#1e1e24] text-[#5a5a66] hover:text-white"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setShowInvite(false)}
                    className="flex-1 border border-[#1e1e24] text-[#8a8a99] hover:text-white text-sm py-2.5 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={inviteMember}
                    disabled={inviting || !inviteEmail || !inviteName}
                    className="flex-1 bg-[#7c6aff] hover:bg-[#6b59ee] disabled:opacity-50 text-white text-sm py-2.5 rounded-lg transition-colors"
                  >
                    {inviting ? "Sending..." : "Generate Invite"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export async function generateStaticParams() {
  return [];
}
