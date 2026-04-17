import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { projectsApi, aiApi } from "../../lib/api";
import { clearAuth } from "../../lib/auth";
import type { Project, ScaffoldPreview } from "../../lib/types";
import { AiProjectSetup } from "../../components/AiProjectSetup";

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1 bg-[#1a1a22] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${value}%`, background: value === 100 ? "#22c55e" : "linear-gradient(90deg,#7c6aff,#a78bfa)" }}
      />
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full ${status === "active" ? "bg-emerald-400" : "bg-zinc-600"}`} />
  );
}

type CreateMode = "choose" | "manual" | "ai" | "json";

export default function OwnerDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>("choose");
  const navigate = useNavigate();

  // Manual form
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // AI scaffold / Chat with AI (persisted for convenience)
  const [aiKey, setAiKey] = useState(localStorage.getItem("scrumly_api_key") || "");
  const [aiDesc, setAiDesc] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPreview, setAiPreview] = useState<ScaffoldPreview | null>(null);
  const [aiError, setAiError] = useState("");
  const [aiCommitting, setAiCommitting] = useState(false);

  // JSON import
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [jsonImporting, setJsonImporting] = useState(false);

  // Delete project
  const [confirmDeleteProject, setConfirmDeleteProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);

  useEffect(() => {
    projectsApi.list().then(setProjects).finally(() => setLoading(false));
  }, []);

  function resetModal() {
    setShowNew(false);
    setShowAiChat(false);
    setCreateMode("choose");
    setNewName(""); setNewDesc("");
    setAiKey(localStorage.getItem("scrumly_api_key") || ""); setAiDesc(""); setAiPreview(null); setAiError("");
    setJsonText(""); setJsonError("");
  }

  // ── Manual ──────────────────────────────────────────────────────────────
  async function createManual() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const p = await projectsApi.create(newName.trim(), newDesc.trim() || undefined);
      setProjects((prev) => [p, ...prev]);
      resetModal();
    } finally { setCreating(false); }
  }

  // ── AI ──────────────────────────────────────────────────────────────────
  async function runAiPreview() {
    if (!aiDesc.trim() || !aiKey.trim()) return;
    setAiLoading(true); setAiError("");
    try {
      const preview = await aiApi.scaffoldPreview(aiDesc.trim(), aiKey.trim());
      setAiPreview(preview);
    } catch (e: any) {
      setAiError(e?.response?.data?.detail || "Something went wrong. Check your API key.");
    } finally { setAiLoading(false); }
  }

  async function commitAi() {
    if (!aiPreview) return;
    setAiCommitting(true);
    try {
      const res = await aiApi.scaffoldCommit(aiPreview);
      const updated = await projectsApi.list();
      setProjects(updated);
      resetModal();
      navigate(`/owner/dashboard/${res.project_id}`);
    } finally { setAiCommitting(false); }
  }

  // ── JSON ─────────────────────────────────────────────────────────────────
  async function importJson() {
    setJsonError("");
    let parsed: ScaffoldPreview;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setJsonError("Invalid JSON — please check the format.");
      return;
    }
    if (!parsed.project?.name || !Array.isArray(parsed.modules)) {
      setJsonError('JSON must have a "project" object with "name" and a "modules" array.');
      return;
    }
    setJsonImporting(true);
    try {
      const res = await aiApi.importProject(parsed);
      const updated = await projectsApi.list();
      setProjects(updated);
      resetModal();
      navigate(`/owner/dashboard/${res.project_id}`);
    } catch (e: any) {
      setJsonError(e?.response?.data?.detail || "Import failed.");
    } finally { setJsonImporting(false); }
  }

  // ── Delete Project ────────────────────────────────────────────────────────
  async function deleteProject(project: Project) {
    setDeletingProject(true);
    try {
      await projectsApi.delete(project.id);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      setConfirmDeleteProject(null);
    } finally { setDeletingProject(false); }
  }

  const active = projects.filter((p) => p.status === "active");
  const totalModules = projects.reduce((a, p) => a + p.module_count, 0);
  const totalMembers = projects.reduce((a, p) => a + p.member_count, 0);
  const avgProgress = projects.length > 0
    ? Math.round(projects.reduce((a, p) => a + p.progress, 0) / projects.length)
    : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0d] text-white">
      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0a0a0d]/90 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7c6aff] to-[#a78bfa] flex items-center justify-center shadow-lg shadow-violet-500/20">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1.2" fill="white" />
              <rect x="9" y="2" width="5" height="5" rx="1.2" fill="white" fillOpacity="0.6" />
              <rect x="2" y="9" width="5" height="5" rx="1.2" fill="white" fillOpacity="0.6" />
              <rect x="9" y="9" width="5" height="5" rx="1.2" fill="white" />
            </svg>
          </div>
          <span className="font-semibold tracking-tight text-sm">Scrumly</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowNew(true); setCreateMode("choose"); }}
            className="flex items-center gap-2 bg-[#7c6aff] hover:bg-[#6b59ee] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-lg shadow-violet-500/20"
          >
            <span className="text-base leading-none">+</span> New Project
          </button>
          <button onClick={() => { clearAuth(); navigate("/auth/login"); }}
            className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors px-2 py-1">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-10">
          {[
            { label: "Active Projects", value: active.length, accent: "#7c6aff" },
            { label: "Total Modules", value: totalModules, accent: "#3b82f6" },
            { label: "Members", value: totalMembers, accent: "#f59e0b" },
            { label: "Avg Progress", value: `${avgProgress}%`, accent: "#22c55e" },
          ].map((s) => (
            <div key={s.label} className="bg-[#111116] border border-white/5 rounded-xl p-5 relative overflow-hidden group">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `radial-gradient(circle at top left, ${s.accent}08, transparent 60%)` }} />
              <p className="text-zinc-500 text-xs mb-2 uppercase tracking-wider">{s.label}</p>
              <p className="text-3xl font-mono font-bold" style={{ color: s.accent }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Projects */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Projects</h2>
          <span className="text-zinc-600 text-xs">{projects.length} total</span>
        </div>

        {loading ? (
          <div className="text-center py-24 text-zinc-600 text-sm">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-zinc-600 text-sm mb-4">No projects yet. Create your first one.</p>
            <button onClick={() => { setShowNew(true); setCreateMode("choose"); }}
              className="bg-[#7c6aff] hover:bg-[#6b59ee] text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
              + New Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {projects.map((project) => (
              <div key={project.id} className="relative group">
                <Link to={`/owner/dashboard/${project.id}`}
                  className="block bg-[#111116] border border-white/5 hover:border-white/10 rounded-xl p-5 transition-all hover:shadow-xl hover:shadow-black/30 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "radial-gradient(circle at top right, #7c6aff08, transparent 60%)" }} />
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <StatusDot status={project.status} />
                      <span className="font-semibold text-sm">{project.name}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium
                      ${project.status === "active"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        : "border-white/10 bg-white/5 text-zinc-500"}`}>
                      {project.status}
                    </span>
                  </div>
                  {project.description && (
                    <p className="text-xs text-zinc-500 mb-4 line-clamp-1">{project.description}</p>
                  )}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs text-zinc-600">
                      <span>Progress</span>
                      <span className="font-mono text-zinc-400">{project.progress}%</span>
                    </div>
                    <ProgressBar value={project.progress} />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-600">
                    <span>{project.module_count} modules</span>
                    <span>·</span>
                    <span>{project.member_count} members</span>
                  </div>
                </Link>
                {/* Delete button — floats over the card */}
                <button
                  onClick={(e) => { e.preventDefault(); setConfirmDeleteProject(project); }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all w-6 h-6 rounded-md bg-[#1a1a22] border border-white/8 text-zinc-600 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 flex items-center justify-center text-sm leading-none z-10"
                  title="Delete project"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── New Project Modal ── */}
      {showNew && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) resetModal(); }}>
          <div className="bg-[#111116] border border-white/8 rounded-2xl w-full max-w-lg shadow-2xl">

            {/* Choose mode */}
            {createMode === "choose" && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-white">New Project</h3>
                  <button onClick={resetModal} className="text-zinc-600 hover:text-white text-xl leading-none">×</button>
                </div>
                <p className="text-xs text-zinc-500 mb-4">How do you want to create it?</p>
                <div className="space-y-3">
                  <button onClick={() => setCreateMode("manual")}
                    className="w-full flex items-start gap-4 p-4 rounded-xl border border-white/6 hover:border-[#7c6aff]/40 hover:bg-[#7c6aff]/5 transition-all text-left group">
                    <div className="w-9 h-9 rounded-lg bg-[#1a1a22] border border-white/6 flex items-center justify-center text-lg flex-shrink-0 group-hover:border-[#7c6aff]/30">✏️</div>
                    <div>
                      <p className="text-sm font-medium text-white">Manual Entry</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Name your project and add modules yourself</p>
                    </div>
                  </button>
                  <button onClick={() => setCreateMode("ai")}
                    className="w-full flex items-start gap-4 p-4 rounded-xl border border-white/6 hover:border-[#7c6aff]/40 hover:bg-[#7c6aff]/5 transition-all text-left group">
                    <div className="w-9 h-9 rounded-lg bg-[#1a1a22] border border-white/6 flex items-center justify-center text-lg flex-shrink-0 group-hover:border-[#7c6aff]/30">✨</div>
                    <div>
                      <p className="text-sm font-medium text-white">AI Scaffold <span className="text-xs text-[#7c6aff] font-normal ml-1">via Claude API</span></p>
                      <p className="text-xs text-zinc-500 mt-0.5">Describe the project, Claude creates everything</p>
                    </div>
                  </button>
                  <button onClick={() => setCreateMode("json")}
                    className="w-full flex items-start gap-4 p-4 rounded-xl border border-white/6 hover:border-[#7c6aff]/40 hover:bg-[#7c6aff]/5 transition-all text-left group">
                    <div className="w-9 h-9 rounded-lg bg-[#1a1a22] border border-white/6 flex items-center justify-center text-lg flex-shrink-0 group-hover:border-[#7c6aff]/30">📋</div>
                    <div>
                      <p className="text-sm font-medium text-white">JSON Import <span className="text-xs text-zinc-500 font-normal ml-1">no API key needed</span></p>
                      <p className="text-xs text-zinc-500 mt-0.5">Generate JSON with any LLM and paste it here</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNew(false); setShowAiChat(true); }}
                    className="w-full flex items-start gap-4 p-4 rounded-xl border border-white/6 hover:border-[#7c6aff]/40 hover:bg-[#7c6aff]/5 transition-all text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#1a1a22] border border-white/6 flex items-center justify-center text-lg flex-shrink-0 group-hover:border-[#7c6aff]/30">
                      ✦
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        Chat with AI
                        <span className="text-xs text-[#7c6aff] font-normal ml-1">conversational setup</span>
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Have a conversation — I'll ask questions and build the structure for you
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Manual mode */}
            {createMode === "manual" && (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setCreateMode("choose")} className="text-zinc-500 hover:text-white text-sm">←</button>
                  <h3 className="font-semibold text-white">Manual Entry</h3>
                </div>
                <div className="space-y-3">
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                    placeholder="Project name" autoFocus
                    onKeyDown={(e) => e.key === "Enter" && createManual()}
                    className="w-full bg-[#0a0a0d] border border-white/8 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#7c6aff]/50 transition-colors" />
                  <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Description (optional)" rows={3}
                    className="w-full bg-[#0a0a0d] border border-white/8 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#7c6aff]/50 transition-colors resize-none" />
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={resetModal}
                    className="flex-1 border border-white/8 text-zinc-500 hover:text-white text-sm font-medium py-2.5 rounded-lg transition-colors">Cancel</button>
                  <button onClick={createManual} disabled={creating || !newName.trim()}
                    className="flex-1 bg-[#7c6aff] hover:bg-[#6b59ee] disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                    {creating ? "Creating..." : "Create Project"}
                  </button>
                </div>
              </div>
            )}

            {/* AI mode */}
            {createMode === "ai" && (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => { setCreateMode("choose"); setAiPreview(null); setAiError(""); }} className="text-zinc-500 hover:text-white text-sm">←</button>
                  <h3 className="font-semibold text-white">AI Scaffold</h3>
                </div>

                {!aiPreview ? (
                  <>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-zinc-500 mb-1.5 block">Your Anthropic API Key</label>
                        <input type="password" value={aiKey} onChange={(e) => { const v = e.target.value; setAiKey(v); localStorage.setItem("scrumly_api_key", v); }}
                          placeholder="sk-ant-..."
                          className="w-full bg-[#0a0a0d] border border-white/8 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#7c6aff]/50 transition-colors font-mono" />
                        <p className="text-xs text-zinc-600 mt-1">Not stored — used only for this request</p>
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 mb-1.5 block">Describe your project</label>
                        <textarea value={aiDesc} onChange={(e) => setAiDesc(e.target.value)}
                          placeholder="e.g. Redesign the ClaimBridge dashboard. Modules: user research, wireframes, UI build, client review, QA, launch"
                          rows={4}
                          className="w-full bg-[#0a0a0d] border border-white/8 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#7c6aff]/50 transition-colors resize-none" />
                      </div>
                    </div>
                    {aiError && <p className="text-red-400 text-xs mt-3">{aiError}</p>}
                    <div className="flex gap-3 mt-4">
                      <button onClick={resetModal}
                        className="flex-1 border border-white/8 text-zinc-500 hover:text-white text-sm font-medium py-2.5 rounded-lg transition-colors">Cancel</button>
                      <button onClick={runAiPreview} disabled={aiLoading || !aiDesc.trim() || !aiKey.trim()}
                        className="flex-1 bg-[#7c6aff] hover:bg-[#6b59ee] disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                        {aiLoading ? "Thinking..." : "✨ Generate Preview"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-[#0a0a0d] border border-white/6 rounded-xl p-4 max-h-72 overflow-y-auto space-y-3 mb-4">
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-white">{aiPreview.project?.name}</p>
                        {aiPreview.project?.description && (
                          <p className="text-xs text-zinc-500 mt-0.5">{aiPreview.project.description}</p>
                        )}
                      </div>
                      {aiPreview.modules?.map((mod, i) => (
                        <div key={i} className="border border-white/6 rounded-lg p-3">
                          <p className="text-sm font-medium text-white mb-1">{mod.title}</p>
                          {mod.description && <p className="text-xs text-zinc-500 mb-2">{mod.description}</p>}
                          <ul className="space-y-1">
                            {mod.checklist?.map((item, j) => (
                              <li key={j} className="text-xs text-zinc-400 flex items-center gap-2">
                                <span className="w-3 h-3 rounded border border-white/10 flex-shrink-0" />
                                {item.text}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-500 mb-4">Looks good? Confirm to create this project.</p>
                    <div className="flex gap-3">
                      <button onClick={() => setAiPreview(null)}
                        className="flex-1 border border-white/8 text-zinc-500 hover:text-white text-sm font-medium py-2.5 rounded-lg transition-colors">← Regenerate</button>
                      <button onClick={commitAi} disabled={aiCommitting}
                        className="flex-1 bg-[#7c6aff] hover:bg-[#6b59ee] disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                        {aiCommitting ? "Creating..." : "✓ Create Project"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* JSON mode */}
            {createMode === "json" && (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <button onClick={() => setCreateMode("choose")} className="text-zinc-500 hover:text-white text-sm">←</button>
                  <h3 className="font-semibold text-white">JSON Import</h3>
                </div>
                <p className="text-xs text-zinc-500 mb-4 ml-6">
                  Ask Claude.ai or any LLM to generate a project JSON using this schema, then paste it below.
                </p>
                <div className="bg-[#0a0a0d] border border-white/6 rounded-lg p-3 mb-3 font-mono text-xs text-zinc-500 leading-relaxed">
{`{
  "project": { "name": "...", "description": "..." },
  "modules": [{
    "title": "...", "description": "...",
    "status": "not_started", "order_index": 0,
    "checklist": [{ "text": "...", "order_index": 0 }]
  }]
}`}
                </div>
                <textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)}
                  placeholder="Paste your JSON here..."
                  rows={8}
                  className="w-full bg-[#0a0a0d] border border-white/8 rounded-lg px-3 py-2.5 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-[#7c6aff]/50 transition-colors resize-none font-mono" />
                {jsonError && <p className="text-red-400 text-xs mt-2">{jsonError}</p>}
                <div className="flex gap-3 mt-4">
                  <button onClick={resetModal}
                    className="flex-1 border border-white/8 text-zinc-500 hover:text-white text-sm font-medium py-2.5 rounded-lg transition-colors">Cancel</button>
                  <button onClick={importJson} disabled={jsonImporting || !jsonText.trim()}
                    className="flex-1 bg-[#7c6aff] hover:bg-[#6b59ee] disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                    {jsonImporting ? "Importing..." : "Import Project"}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {showAiChat && (
        <AiProjectSetup
          apiKey={aiKey}
          onCommit={(projectId) => {
            setShowAiChat(false);
            projectsApi.list().then(setProjects);
            navigate(`/owner/dashboard/${projectId}`);
          }}
          onClose={() => setShowAiChat(false)}
        />
      )}

      {/* ── Delete Project Confirmation ── */}
      {confirmDeleteProject && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setConfirmDeleteProject(null)}>
          <div className="bg-[#111116] border border-white/8 rounded-2xl w-full max-w-sm shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-white mb-2">Delete Project</h3>
            <p className="text-sm text-zinc-400 mb-1">
              Are you sure you want to delete{" "}
              <span className="text-white font-medium">"{confirmDeleteProject.name}"</span>?
            </p>
            <p className="text-xs text-zinc-600 mb-5">
              This will permanently remove the project, all its modules, tasks, and members. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteProject(null)}
                className="flex-1 border border-white/8 text-zinc-500 hover:text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteProject(confirmDeleteProject)}
                disabled={deletingProject}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {deletingProject ? "Deleting..." : "Delete Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
