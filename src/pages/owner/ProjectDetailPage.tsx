import { useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { projectsApi, modulesApi, membersApi, checklistApi } from "../../lib/api";
import type { Project, Module, Member, ChecklistItem } from "../../lib/types";
import { AiProjectSetup } from "../../components/AiProjectSetup";

const STATUS_CONFIG = {
  not_started: { label: "Not Started", color: "#5a5a66", bg: "#1a1a20", border: "#2e2e38" },
  in_progress:  { label: "In Progress", color: "#f59e0b", bg: "#f59e0b1a", border: "#f59e0b33" },
  review:       { label: "Review",      color: "#3b82f6", bg: "#3b82f61a", border: "#3b82f633" },
  done:         { label: "Done",        color: "#22c55e", bg: "#22c55e1a", border: "#22c55e33" },
};

function ProgressBar({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  return (
    <div className={`${size === "sm" ? "h-1" : "h-1.5"} bg-[#1a1a20] rounded-full overflow-hidden`}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${value}%`, background: value === 100 ? "#22c55e" : "linear-gradient(90deg,#7c6aff,#9b8dff)" }}
      />
    </div>
  );
}

function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["#7c6aff", "#f59e0b", "#22c55e", "#3b82f6", "#ec4899", "#14b8a6"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0`}
      style={{ background: color }}
    >
      {initials}
    </div>
  );
}

// ── Due Date helpers ───────────────────────────────────────────────────────────

function dueBadge(due_date: string | null | undefined, status: string) {
  if (!due_date || status === "done") return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(due_date + "T00:00:00");
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0)  return { label: `${Math.abs(diff)}d overdue`, color: "#ef4444", bg: "#ef444415", border: "#ef444430" };
  if (diff === 0) return { label: "Due today",               color: "#f59e0b", bg: "#f59e0b15", border: "#f59e0b30" };
  if (diff <= 3)  return { label: `${diff}d left`,           color: "#f59e0b", bg: "#f59e0b10", border: "#f59e0b25" };
  return           { label: `${diff}d left`,                 color: "#5a5a66", bg: "transparent", border: "#2e2e38" };
}

// ── Map View Component ─────────────────────────────────────────────────────────

function MapView({
  modules,
  onStatusChange,
}: {
  modules: Module[];
  onStatusChange: (moduleId: string, status: string) => void;
}) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  if (modules.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#5a5a66] text-sm">
        No modules yet — add some to see the map
      </div>
    );
  }

  const COLS = Math.min(modules.length, 4);
  const NODE_W = 200;
  const NODE_H = 90;
  const GAP_X = 60;
  const GAP_Y = 60;
  const PADDING = 40;

  const rows = Math.ceil(modules.length / COLS);
  const svgW = COLS * NODE_W + (COLS - 1) * GAP_X + PADDING * 2;
  const svgH = rows * NODE_H + (rows - 1) * GAP_Y + PADDING * 2;

  function nodePos(i: number) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const rowItems = Math.min(COLS, modules.length - row * COLS);
    const rowOffset = ((COLS - rowItems) * (NODE_W + GAP_X)) / 2;
    return {
      x: PADDING + col * (NODE_W + GAP_X) + rowOffset,
      y: PADDING + row * (NODE_H + GAP_Y),
    };
  }

  const sc = (status: string) => STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.not_started;

  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < modules.length - 1; i++) {
    const from = nodePos(i);
    const to = nodePos(i + 1);
    edges.push({
      x1: from.x + NODE_W / 2,
      y1: from.y + NODE_H / 2,
      x2: to.x + NODE_W / 2,
      y2: to.y + NODE_H / 2,
    });
  }

  return (
    <div className="w-full overflow-auto">
      <div className="relative inline-block min-w-full">
        <svg
          width={svgW}
          height={svgH}
          className="absolute inset-0 pointer-events-none"
          style={{ minWidth: svgW }}
        >
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#2e2e38" />
            </marker>
          </defs>
          {edges.map((e, i) => (
            <line
              key={i}
              x1={e.x1} y1={e.y1}
              x2={e.x2} y2={e.y2}
              stroke="#2e2e38"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              markerEnd="url(#arrow)"
            />
          ))}
        </svg>

        <div style={{ width: svgW, height: svgH, position: "relative" }}>
          {modules.map((mod, i) => {
            const { x, y } = nodePos(i);
            const cfg = sc(mod.status);
            const isSelected = selectedNode === mod.id;
            const pct = mod.progress;

            return (
              <div
                key={mod.id}
                onClick={() => setSelectedNode(isSelected ? null : mod.id)}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  width: NODE_W,
                  height: NODE_H,
                  borderColor: isSelected ? "#7c6aff" : cfg.border,
                  background: isSelected ? "#7c6aff10" : cfg.bg,
                }}
                className="rounded-xl border cursor-pointer transition-all hover:shadow-lg hover:shadow-black/30 overflow-hidden select-none"
              >
                <div
                  className="absolute bottom-0 left-0 h-0.5 transition-all duration-700"
                  style={{ width: `${pct}%`, background: pct === 100 ? "#22c55e" : "linear-gradient(90deg,#7c6aff,#9b8dff)" }}
                />

                <div className="p-3 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                      <span className="text-xs font-semibold text-white truncate">{mod.title}</span>
                    </div>
                    {mod.description && (
                      <p className="text-[10px] text-[#5a5a66] line-clamp-2 leading-relaxed">{mod.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-[#5a5a66]">{mod.checklist_done}/{mod.checklist_total} tasks</span>
                    <select
                      value={mod.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => { e.stopPropagation(); onStatusChange(mod.id, e.target.value); }}
                      className="text-[10px] rounded-md border px-1.5 py-0.5 bg-transparent cursor-pointer focus:outline-none"
                      style={{ color: cfg.color, borderColor: cfg.border, background: "#0d0d0f" }}
                    >
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                        <option key={k} value={k} style={{ background: "#111114", color: "#fff" }}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 mt-4 px-2 flex-wrap">
        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: v.color }} />
            <span className="text-xs text-[#5a5a66]">{v.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeTab, setActiveTab] = useState<"modules" | "map" | "members">("modules");

  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

  const [showAiChat, setShowAiChat] = useState(false);
  const [aiKey] = useState(() => localStorage.getItem("scrumly_anthropic_key") || localStorage.getItem("scrumly_api_key") || "");

  const [showModuleForm, setShowModuleForm] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDesc, setModuleDesc] = useState("");
  const [moduleDoc, setModuleDoc] = useState("");
  const [moduleDueDate, setModuleDueDate] = useState("");
  const [creatingModule, setCreatingModule] = useState(false);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"colleague" | "client">("colleague");
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newItem, setNewItem] = useState("");

  const [confirmDeleteModule, setConfirmDeleteModule] = useState<Module | null>(null);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<Member | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([projectsApi.get(projectId), modulesApi.list(projectId), membersApi.list(projectId)])
      .then(([p, m, mem]) => { setProject(p); setModules(m); setMembers(mem); });
  }, [projectId]);

  useEffect(() => {
    if (selectedModule && projectId)
      checklistApi.list(projectId, selectedModule.id).then(setChecklist);
  }, [selectedModule, projectId]);

  async function createModule() {
    if (!moduleTitle.trim() || !projectId) return;
    setCreatingModule(true);
    try {
      const m = await modulesApi.create(projectId, {
        title: moduleTitle,
        description: moduleDesc || undefined,
        doc_link: moduleDoc || undefined,
        due_date: moduleDueDate || undefined,
      });
      setModules((prev) => [...prev, m]);
      setShowModuleForm(false); setModuleTitle(""); setModuleDesc(""); setModuleDoc(""); setModuleDueDate("");
    } finally { setCreatingModule(false); }
  }

  async function updateModuleDueDate(moduleId: string, due_date: string) {
    if (!projectId) return;
    const updated = await modulesApi.update(projectId, moduleId, { due_date: due_date || null });
    setModules((prev) => prev.map((m) => (m.id === moduleId ? updated : m)));
  }

  async function deleteModule(mod: Module) {
    if (!projectId) return;
    setActionLoading(true);
    try {
      await modulesApi.delete(projectId, mod.id);
      setModules((prev) => prev.filter((m) => m.id !== mod.id));
      if (selectedModule?.id === mod.id) setSelectedModule(null);
      setConfirmDeleteModule(null);
    } finally { setActionLoading(false); }
  }

  async function removeMember(member: Member) {
    if (!projectId) return;
    setActionLoading(true);
    try {
      if (member.status === "pending") {
        await membersApi.revokeInvite(projectId, member.id);
      } else {
        await membersApi.remove(projectId, member.id);
      }
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      setConfirmRemoveMember(null);
    } finally { setActionLoading(false); }
  }

  async function inviteMember() {
    if (!inviteEmail || !inviteName || !projectId) return;
    setInviting(true);
    try {
      const res = await membersApi.invite(projectId, inviteEmail, inviteName, inviteRole);
      setInviteLink(res.invite_link);
      membersApi.list(projectId).then(setMembers);
    } finally { setInviting(false); }
  }

  async function copyInviteLink() {
    await navigator.clipboard.writeText(inviteLink);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }

  async function toggleItem(itemId: string) {
    if (!projectId) return;
    const updated = await checklistApi.toggle(projectId, itemId);
    setChecklist((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
    modulesApi.list(projectId).then((mods) => {
      setModules(mods);
      if (selectedModule) {
        const fresh = mods.find((m) => m.id === selectedModule.id);
        if (fresh) setSelectedModule(fresh);
      }
    });
  }

  async function addChecklistItem() {
    if (!newItem.trim() || !selectedModule || !projectId) return;
    const item = await checklistApi.add(projectId, selectedModule.id, newItem.trim());
    setChecklist((prev) => [...prev, item]);
    setNewItem("");
    modulesApi.list(projectId).then(setModules);
  }

  async function updateModuleStatus(moduleId: string, status: string) {
    if (!projectId) return;
    const updated = await modulesApi.update(projectId, moduleId, { status });
    setModules((prev) => prev.map((m) => (m.id === moduleId ? updated : m)));
    projectsApi.get(projectId).then(setProject);
  }

  async function handleDeleteProject() {
    if (!projectId) return;
    setDeletingProject(true);
    try {
      await projectsApi.delete(projectId);
      navigate("/owner/dashboard");
    } finally { setDeletingProject(false); }
  }

  if (!project)
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#7c6aff] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#5a5a66] text-sm">Loading project...</p>
        </div>
      </div>
    );

  const doneModules = modules.filter((m) => m.status === "done").length;

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white flex flex-col">

      {/* ── Header ── */}
      <header className="border-b border-[#1e1e24] px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-[#5a5a66] mb-3">
          <button
            onClick={() => navigate("/owner/dashboard")}
            className="flex items-center gap-1.5 text-[#5a5a66] hover:text-white transition-colors group"
          >
            <span className="text-base leading-none group-hover:-translate-x-0.5 transition-transform inline-block">←</span>
            <span>Dashboard</span>
          </button>
          <span>/</span>
          <span className="text-white">{project.name}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold truncate">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-[#5a5a66] mt-0.5 line-clamp-1">{project.description}</p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            <button
              onClick={() => setShowAiChat(true)}
              className="flex items-center gap-1.5 border border-[#7c6aff]/40 bg-[#7c6aff]/10 hover:bg-[#7c6aff]/20 text-[#7c6aff] text-sm px-3 py-1.5 rounded-lg transition-colors"
            >
              <span className="text-xs">✦</span>
              <span>AI Chat</span>
            </button>
            <Link
              to={`/portal/${projectId}`}
              target="_blank"
              className="border border-[#1e1e24] text-[#8a8a99] hover:text-white hover:border-[#2e2e38] text-sm px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>Preview Portal</span>
              <span className="text-xs opacity-60">↗</span>
            </Link>
            <button
              onClick={() => setShowInvite(true)}
              className="bg-[#7c6aff] hover:bg-[#6b59ee] text-white text-sm px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>+</span> Invite
            </button>
            <button
              onClick={() => setConfirmDeleteProject(true)}
              className="border border-[#1e1e24] text-[#5a5a66] hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 text-sm px-3 py-1.5 rounded-lg transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </header>

      {/* ── Stats bar ── */}
      <div className="border-b border-[#1e1e24] px-6 py-3 flex-shrink-0 flex items-center gap-6">
        <div className="flex items-center gap-5 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7c6aff]" />
            <span className="text-[#8a8a99]">{modules.length} modules</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-[#8a8a99]">{members.length} members</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[#8a8a99]">{doneModules}/{modules.length} done</span>
          </div>
        </div>
        <div className="flex-1 max-w-48 flex items-center gap-2">
          <div className="flex-1"><ProgressBar value={project.progress} /></div>
          <span className="text-xs text-[#5a5a66] w-8 text-right">{project.progress}%</span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="border-b border-[#1e1e24] px-6 flex gap-0 flex-shrink-0">
        {(["modules", "map", "members"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-4 text-sm capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? "border-[#7c6aff] text-white"
                : "border-transparent text-[#5a5a66] hover:text-[#8a8a99]"
            }`}
          >
            {tab === "map" ? "🗺 Map" : tab}
            {tab !== "map" && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab ? "bg-[#7c6aff]/20 text-[#7c6aff]" : "bg-[#1e1e24] text-[#5a5a66]"
              }`}>
                {tab === "modules" ? modules.length : members.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden">

        <div className="flex-1 overflow-y-auto p-6">

          {activeTab === "map" && (
            <>
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xs font-semibold text-[#5a5a66] uppercase tracking-widest">Project Map</h2>
                <span className="text-xs text-[#3a3a44]">Click a node to select · Change status inline</span>
              </div>
              <MapView modules={modules} onStatusChange={updateModuleStatus} />
            </>
          )}

          {activeTab === "modules" && (
            <>
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xs font-semibold text-[#5a5a66] uppercase tracking-widest">Modules</h2>
                <button
                  onClick={() => setShowModuleForm(true)}
                  className="flex items-center gap-1.5 text-sm text-[#7c6aff] hover:text-white transition-colors"
                >
                  + Add Module
                </button>
              </div>

              {modules.length === 0 ? (
                <div className="border border-dashed border-[#1e1e24] rounded-xl p-12 text-center">
                  <p className="text-[#5a5a66] text-sm mb-3">No modules yet</p>
                  <button onClick={() => setShowModuleForm(true)} className="text-[#7c6aff] text-sm hover:underline">
                    Add your first module →
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {modules.map((mod) => {
                    const sc = STATUS_CONFIG[mod.status];
                    const isSelected = selectedModule?.id === mod.id;
                    return (
                      <div
                        key={mod.id}
                        onClick={() => setSelectedModule(isSelected ? null : mod)}
                        className={`bg-[#111114] border rounded-xl p-4 cursor-pointer transition-all group ${
                          isSelected ? "border-[#7c6aff] shadow-[0_0_0_1px_#7c6aff22]" : "border-[#1e1e24] hover:border-[#2e2e38]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <span className="font-medium text-sm leading-snug">{mod.title}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {(() => { const b = dueBadge(mod.due_date, mod.status); return b ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full border whitespace-nowrap" style={{ color: b.color, background: b.bg, borderColor: b.border }}>{b.label}</span>
                            ) : null; })()}
                            <select
                              value={mod.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateModuleStatus(mod.id, e.target.value)}
                              className="text-xs px-2 py-0.5 rounded-full border bg-transparent cursor-pointer focus:outline-none"
                              style={{ color: sc.color, borderColor: sc.border, background: sc.bg }}
                            >
                              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                <option key={k} value={k} style={{ background: "#111114", color: "#fff" }}>{v.label}</option>
                              ))}
                            </select>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteModule(mod); }}
                              className="opacity-0 group-hover:opacity-100 text-[#3a3a44] hover:text-red-400 transition-all text-lg leading-none"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                        {mod.description && (
                          <p className="text-xs text-[#5a5a66] mb-3 line-clamp-2">{mod.description}</p>
                        )}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs text-[#5a5a66]">
                            <span>{mod.checklist_done}/{mod.checklist_total} tasks</span>
                            <span>{mod.progress}%</span>
                          </div>
                          <ProgressBar value={mod.progress} size="sm" />
                        </div>
                        {mod.doc_link && (
                          <a href={mod.doc_link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-[#7c6aff] hover:underline mt-3">
                            📄 Documentation ↗
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === "members" && (
            <>
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xs font-semibold text-[#5a5a66] uppercase tracking-widest">Members</h2>
                <button onClick={() => setShowInvite(true)} className="flex items-center gap-1.5 text-sm text-[#7c6aff] hover:text-white transition-colors">
                  + Invite Member
                </button>
              </div>
              {members.length === 0 ? (
                <div className="border border-dashed border-[#1e1e24] rounded-xl p-12 text-center">
                  <p className="text-[#5a5a66] text-sm mb-3">No members yet</p>
                  <button onClick={() => setShowInvite(true)} className="text-[#7c6aff] text-sm hover:underline">Invite your first member →</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {members.filter((m) => m.role_in_project === "colleague").length > 0 && (
                    <>
                      <p className="text-xs text-[#3a3a44] uppercase tracking-wider mb-2 mt-1">Colleagues</p>
                      {members.filter((m) => m.role_in_project === "colleague").map((m) => (
                        <MemberRow key={m.id} member={m} onRemove={() => setConfirmRemoveMember(m)} />
                      ))}
                    </>
                  )}
                  {members.filter((m) => m.role_in_project === "client").length > 0 && (
                    <>
                      <p className="text-xs text-[#3a3a44] uppercase tracking-wider mb-2 mt-4">Clients</p>
                      {members.filter((m) => m.role_in_project === "client").map((m) => (
                        <MemberRow key={m.id} member={m} onRemove={() => setConfirmRemoveMember(m)} />
                      ))}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {selectedModule && activeTab === "modules" && (
          <div className="w-80 border-l border-[#1e1e24] flex flex-col bg-[#0d0d0f] flex-shrink-0">
            <div className="p-4 border-b border-[#1e1e24] flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{selectedModule.title}</p>
                <p className="text-xs text-[#5a5a66] mt-0.5">{selectedModule.checklist_done}/{selectedModule.checklist_total} tasks · {selectedModule.progress}%</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-[#5a5a66]">Due:</span>
                  <input
                    type="date"
                    value={selectedModule.due_date || ""}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateModuleDueDate(selectedModule.id, e.target.value)}
                    className="text-xs bg-[#0d0d0f] border border-[#2e2e38] rounded px-1.5 py-0.5 text-[#8a8a99] focus:outline-none focus:border-[#7c6aff] cursor-pointer"
                  />
                  {selectedModule.due_date && (() => {
                    const b = dueBadge(selectedModule.due_date, selectedModule.status);
                    return b ? <span className="text-[10px] px-1.5 py-0.5 rounded-full border" style={{ color: b.color, background: b.bg, borderColor: b.border }}>{b.label}</span> : null;
                  })()}
                </div>
              </div>
              <button onClick={() => setSelectedModule(null)} className="text-[#5a5a66] hover:text-white text-xl leading-none flex-shrink-0 mt-0.5">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {checklist.length === 0 && <p className="text-xs text-[#5a5a66] text-center py-8">No tasks yet. Add one below.</p>}
              {checklist.map((item) => (
                <div key={item.id} className="flex items-start gap-2.5 py-1.5 px-2 rounded-lg hover:bg-[#111114] cursor-pointer group transition-colors" onClick={() => toggleItem(item.id)}>
                  <div className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${item.is_done ? "bg-[#7c6aff] border-[#7c6aff]" : "border-[#2e2e38] group-hover:border-[#7c6aff]"}`}>
                    {item.is_done && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${item.is_done ? "text-[#3a3a44] line-through" : "text-white"}`}>{item.text}</p>
                    {item.is_done && item.done_by_name && <p className="text-xs text-[#2e2e38] mt-0.5">by {item.done_by_name}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-[#1e1e24]">
              <div className="flex gap-2">
                <input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addChecklistItem()} placeholder="Add task..."
                  className="flex-1 bg-[#111114] border border-[#1e1e24] rounded-lg px-3 py-2 text-white text-sm placeholder:text-[#3a3a44] focus:outline-none focus:border-[#7c6aff] transition-colors" />
                <button onClick={addChecklistItem} disabled={!newItem.trim()} className="bg-[#7c6aff] hover:bg-[#6b59ee] disabled:opacity-40 text-white text-sm px-3 py-2 rounded-lg transition-colors">+</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAiChat && (
        <AiProjectSetup
          apiKey={aiKey}
          projectId={projectId}
          onCommit={(newProjectId) => {
            if (newProjectId !== projectId) {
              navigate(`/owner/dashboard/${newProjectId}`);
            } else {
              setShowAiChat(false);
              if (projectId) modulesApi.list(projectId).then(setModules);
            }
          }}
          onClose={() => setShowAiChat(false)}
        />
      )}

      {showModuleForm && (
        <Modal onClose={() => setShowModuleForm(false)} title="New Module">
          <div className="space-y-3">
            <input type="text" value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} placeholder="Module title *" autoFocus className={INPUT} />
            <textarea value={moduleDesc} onChange={(e) => setModuleDesc(e.target.value)} placeholder="Description (optional)" rows={3} className={`${INPUT} resize-none`} />
            <input type="url" value={moduleDoc} onChange={(e) => setModuleDoc(e.target.value)} placeholder="Documentation link (optional)" className={INPUT} />
            <div>
              <label className="text-xs text-[#5a5a66] block mb-1">Due date (optional)</label>
              <input type="date" value={moduleDueDate} onChange={(e) => setModuleDueDate(e.target.value)} className={INPUT} />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setShowModuleForm(false)} className={BTN_GHOST}>Cancel</button>
            <button onClick={createModule} disabled={creatingModule || !moduleTitle.trim()} className={BTN_PRIMARY}>{creatingModule ? "Creating..." : "Create Module"}</button>
          </div>
        </Modal>
      )}

      {showInvite && (
        <Modal onClose={() => { setShowInvite(false); setInviteLink(""); setInviteEmail(""); setInviteName(""); }} title="Invite to Project">
          {inviteLink ? (
            <div className="space-y-4">
              <p className="text-sm text-[#8a8a99]">Invite link generated. Share it with your invitee:</p>
              <div className="bg-[#0d0d0f] border border-[#1e1e24] rounded-lg px-3 py-3 text-xs text-[#7c6aff] break-all leading-relaxed">{inviteLink}</div>
              <button onClick={copyInviteLink} className={`w-full ${copySuccess ? "bg-emerald-500 hover:bg-emerald-600" : "bg-[#7c6aff] hover:bg-[#6b59ee]"} text-white text-sm py-2.5 rounded-lg transition-colors`}>
                {copySuccess ? "✓ Copied!" : "Copy Invite Link"}
              </button>
              <button onClick={() => { setShowInvite(false); setInviteLink(""); setInviteEmail(""); setInviteName(""); }} className="w-full text-[#5a5a66] text-sm py-2 hover:text-white transition-colors">Done</button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <input type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Their name" autoFocus className={INPUT} />
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Email address" className={INPUT} />
                <div>
                  <p className="text-xs text-[#5a5a66] mb-2">Role in project</p>
                  <div className="flex gap-2">
                    {(["colleague", "client"] as const).map((r) => (
                      <button key={r} onClick={() => setInviteRole(r)}
                        className={`flex-1 py-2.5 text-sm rounded-lg border transition-colors capitalize ${inviteRole === r ? "border-[#7c6aff] bg-[#7c6aff]/10 text-[#7c6aff]" : "border-[#1e1e24] text-[#5a5a66] hover:text-white hover:border-[#2e2e38]"}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[#3a3a44] mt-2">{inviteRole === "client" ? "Clients see a simplified read-only portal view." : "Colleagues can interact with tasks and modules."}</p>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowInvite(false)} className={BTN_GHOST}>Cancel</button>
                <button onClick={inviteMember} disabled={inviting || !inviteEmail || !inviteName} className={BTN_PRIMARY}>{inviting ? "Generating..." : "Generate Invite Link"}</button>
              </div>
            </>
          )}
        </Modal>
      )}

      {confirmDeleteModule && (
        <Modal onClose={() => setConfirmDeleteModule(null)} title="Delete Module">
          <p className="text-sm text-[#8a8a99] mb-2">Are you sure you want to delete <span className="text-white font-medium">"{confirmDeleteModule.title}"</span>?</p>
          <p className="text-xs text-[#5a5a66] mb-5">This will permanently remove the module and all its tasks. This cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDeleteModule(null)} className={BTN_GHOST}>Cancel</button>
            <button onClick={() => deleteModule(confirmDeleteModule)} disabled={actionLoading}
              className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50">
              {actionLoading ? "Deleting..." : "Delete Module"}
            </button>
          </div>
        </Modal>
      )}

      {confirmRemoveMember && (
        <Modal onClose={() => setConfirmRemoveMember(null)} title={confirmRemoveMember.status === "pending" ? "Revoke Invite" : "Remove Member"}>
          <p className="text-sm text-[#8a8a99] mb-5">
            {confirmRemoveMember.status === "pending"
              ? <>Revoke the pending invite for <span className="text-white font-medium">{confirmRemoveMember.name}</span>? Their invite link will stop working.</>
              : <>Remove <span className="text-white font-medium">{confirmRemoveMember.name}</span> from this project? They will lose all access.</>}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmRemoveMember(null)} className={BTN_GHOST}>Cancel</button>
            <button onClick={() => removeMember(confirmRemoveMember)} disabled={actionLoading}
              className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50">
              {actionLoading ? "Removing..." : confirmRemoveMember.status === "pending" ? "Revoke Invite" : "Remove Member"}
            </button>
          </div>
        </Modal>
      )}

      {confirmDeleteProject && (
        <Modal onClose={() => setConfirmDeleteProject(false)} title="Delete Project">
          <p className="text-sm text-[#8a8a99] mb-1">Are you sure you want to delete <span className="text-white font-medium">"{project.name}"</span>?</p>
          <p className="text-xs text-[#5a5a66] mb-5">This will permanently remove the project, all its modules, tasks, and members. This cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDeleteProject(false)} className={BTN_GHOST}>Cancel</button>
            <button onClick={handleDeleteProject} disabled={deletingProject}
              className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50">
              {deletingProject ? "Deleting..." : "Delete Project"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────

function MemberRow({ member, onRemove }: { member: Member; onRemove: () => void }) {
  return (
    <div className="bg-[#111114] border border-[#1e1e24] rounded-xl px-4 py-3 flex items-center justify-between gap-3 group hover:border-[#2e2e38] transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={member.name} size={8} />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{member.name}</p>
          <p className="text-xs text-[#5a5a66] truncate">{member.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {member.status === "pending" && <span className="text-xs text-[#5a5a66] border border-[#2e2e38] rounded-full px-2 py-0.5">pending</span>}
        <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-[#3a3a44] hover:text-red-400 transition-all text-sm px-2 py-1 rounded"
          title={member.status === "pending" ? "Revoke invite" : "Remove member"}>
          {member.status === "pending" ? "Revoke" : "Remove"}
        </button>
      </div>
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-[#111114] border border-[#1e1e24] rounded-xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-[#5a5a66] hover:text-white text-xl leading-none transition-colors">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const INPUT = "w-full bg-[#0d0d0f] border border-[#1e1e24] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-[#3a3a44] focus:outline-none focus:border-[#7c6aff] transition-colors";
const BTN_PRIMARY = "flex-1 bg-[#7c6aff] hover:bg-[#6b59ee] disabled:opacity-50 text-white text-sm py-2.5 rounded-lg transition-colors";
const BTN_GHOST = "flex-1 border border-[#1e1e24] text-[#8a8a99] hover:text-white text-sm py-2.5 rounded-lg transition-colors";
