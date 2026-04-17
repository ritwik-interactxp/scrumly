import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { projectsApi, modulesApi, checklistApi } from "../../lib/api";
import { getUser } from "../../lib/auth";
import type { Project, Module, ChecklistItem } from "../../lib/types";

const STATUS_CONFIG = {
  not_started: { label: "Not Started", color: "#5a5a66", bg: "#1a1a20", border: "#2e2e38" },
  in_progress:  { label: "In Progress", color: "#f59e0b", bg: "#f59e0b15", border: "#f59e0b33" },
  review:       { label: "Review",      color: "#3b82f6", bg: "#3b82f615", border: "#3b82f633" },
  done:         { label: "Done",        color: "#22c55e", bg: "#22c55e15", border: "#22c55e33" },
};

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 bg-[#1e1e24] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${value}%`, background: value === 100 ? "#22c55e" : "#7c6aff" }} />
    </div>
  );
}

// ── Map View (read-only for colleagues) ────────────────────────────────────────
function MapView({ modules }: { modules: Module[] }) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  if (modules.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#5a5a66] text-sm">
        No modules yet
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

  const sc = (status: string) =>
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.not_started;

  return (
    <div className="overflow-auto">
      <svg width={svgW} height={svgH} style={{ minWidth: svgW }}>
        {/* Arrows */}
        {modules.slice(0, -1).map((_, i) => {
          const from = nodePos(i);
          const to = nodePos(i + 1);
          const fromRow = Math.floor(i / COLS);
          const toRow = Math.floor((i + 1) / COLS);
          if (fromRow === toRow) {
            const x1 = from.x + NODE_W;
            const y1 = from.y + NODE_H / 2;
            const x2 = to.x;
            const y2 = to.y + NODE_H / 2;
            const mx = (x1 + x2) / 2;
            return (
              <g key={i}>
                <path d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                  fill="none" stroke="#2e2e38" strokeWidth="1.5" strokeDasharray="4 3" />
                <polygon points={`${x2},${y2} ${x2 - 6},${y2 - 4} ${x2 - 6},${y2 + 4}`} fill="#2e2e38" />
              </g>
            );
          } else {
            const x1 = from.x + NODE_W / 2;
            const y1 = from.y + NODE_H;
            const x2 = to.x + NODE_W / 2;
            const y2 = to.y;
            const my = (y1 + y2) / 2;
            return (
              <g key={i}>
                <path d={`M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`}
                  fill="none" stroke="#2e2e38" strokeWidth="1.5" strokeDasharray="4 3" />
                <polygon points={`${x2},${y2} ${x2 - 4},${y2 - 6} ${x2 + 4},${y2 - 6}`} fill="#2e2e38" />
              </g>
            );
          }
        })}

        {/* Nodes */}
        {modules.map((mod, i) => {
          const { x, y } = nodePos(i);
          const cfg = sc(mod.status);
          const isSelected = selectedNode === mod.id;
          return (
            <g key={mod.id} onClick={() => setSelectedNode(isSelected ? null : mod.id)}
              style={{ cursor: "pointer" }}>
              <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={10}
                fill={isSelected ? cfg.bg : "#111114"}
                stroke={isSelected ? cfg.color : "#2e2e38"}
                strokeWidth={isSelected ? 1.5 : 1} />
              {/* Status dot */}
              <circle cx={x + 14} cy={y + 16} r={4} fill={cfg.color} />
              {/* Title */}
              <text x={x + 26} y={y + 20} fill="white" fontSize={11} fontWeight={600}
                style={{ fontFamily: "inherit" }}>
                {mod.title.length > 22 ? mod.title.slice(0, 22) + "…" : mod.title}
              </text>
              {/* Status label */}
              <text x={x + 14} y={y + 36} fill={cfg.color} fontSize={9}
                style={{ fontFamily: "inherit" }}>
                {cfg.label}
              </text>
              {/* Progress bar bg */}
              <rect x={x + 10} y={y + NODE_H - 14} width={NODE_W - 20} height={4} rx={2} fill="#1e1e24" />
              {/* Progress bar fill */}
              <rect x={x + 10} y={y + NODE_H - 14}
                width={Math.max(0, (NODE_W - 20) * mod.progress / 100)} height={4} rx={2}
                fill={mod.progress === 100 ? "#22c55e" : "#7c6aff"} />
              {/* Progress % */}
              <text x={x + NODE_W - 10} y={y + NODE_H - 18} fill="#5a5a66" fontSize={9}
                textAnchor="end" style={{ fontFamily: "inherit" }}>
                {Math.round(mod.progress)}%
              </text>
              {/* Checklist count */}
              <text x={x + 14} y={y + NODE_H - 18} fill="#3a3a44" fontSize={9}
                style={{ fontFamily: "inherit" }}>
                {mod.checklist_done}/{mod.checklist_total} tasks
              </text>
            </g>
          );
        })}
      </svg>

      {/* Selected node detail */}
      {selectedNode && (() => {
        const mod = modules.find((m) => m.id === selectedNode);
        if (!mod) return null;
        const cfg = sc(mod.status);
        return (
          <div className="mt-4 bg-[#111114] border rounded-xl p-4"
            style={{ borderColor: cfg.border }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
              <span className="font-semibold text-sm">{mod.title}</span>
              <span className="text-xs px-2 py-0.5 rounded-full ml-auto"
                style={{ color: cfg.color, background: cfg.bg }}>
                {cfg.label}
              </span>
            </div>
            {mod.description && <p className="text-xs text-[#5a5a66] mb-2">{mod.description}</p>}
            <div className="flex items-center gap-3 text-xs text-[#5a5a66]">
              <span>{mod.checklist_done}/{mod.checklist_total} tasks done</span>
              <span>·</span>
              <span>{Math.round(mod.progress)}% complete</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function WorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [activeTab, setActiveTab] = useState<"modules" | "map">("modules");
  const user = getUser();

  useEffect(() => {
    if (!projectId) return;
    Promise.all([projectsApi.get(projectId), modulesApi.list(projectId)]).then(([p, m]) => {
      setProject(p); setModules(m);
      if (m.length > 0) setSelectedModule(m[0]);
    });
  }, [projectId]);

  useEffect(() => {
    if (selectedModule && projectId)
      checklistApi.list(projectId, selectedModule.id).then(setChecklist);
  }, [selectedModule, projectId]);

  async function toggleItem(itemId: string) {
    if (!projectId) return;
    const updated = await checklistApi.toggle(projectId, itemId);
    setChecklist((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
    modulesApi.list(projectId).then(setModules);
  }

  if (!project)
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center">
        <p className="text-[#5a5a66]">Loading...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1e1e24] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-semibold">{project.name}</h1>
          <p className="text-xs text-[#5a5a66] mt-0.5">
            {project.progress}% complete · {modules.length} modules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#7c6aff] flex items-center justify-center text-xs font-semibold">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <span className="text-sm text-[#8a8a99]">{user?.name}</span>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-[#1e1e24] px-6 flex gap-1 pt-2">
        {(["modules", "map"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
              activeTab === tab
                ? "text-white border-[#7c6aff]"
                : "text-[#5a5a66] border-transparent hover:text-[#8a8a99]"
            }`}>
            {tab === "map" ? "🗺 Map" : "Modules"}
            {tab === "modules" && (
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab ? "bg-[#7c6aff]/20 text-[#7c6aff]" : "bg-[#1e1e24] text-[#5a5a66]"
              }`}>
                {modules.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Map tab */}
      {activeTab === "map" && (
        <div className="flex-1 overflow-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[#5a5a66] uppercase tracking-widest">
              Project Map
            </h2>
            <span className="text-xs text-[#3a3a44]">Click a node to expand</span>
          </div>
          <MapView modules={modules} />
        </div>
      )}

      {/* Modules tab */}
      {activeTab === "modules" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-64 border-r border-[#1e1e24] overflow-y-auto">
            <div className="p-4">
              <p className="text-xs text-[#5a5a66] uppercase tracking-wider mb-3">Modules</p>
              <div className="space-y-1">
                {modules.map((mod) => {
                  const cfg = STATUS_CONFIG[mod.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.not_started;
                  return (
                    <button key={mod.id} onClick={() => setSelectedModule(mod)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                        selectedModule?.id === mod.id
                          ? "bg-[#7c6aff]/10 text-white"
                          : "text-[#8a8a99] hover:text-white hover:bg-[#1a1a20]"
                      }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                        <span className="text-sm font-medium truncate">{mod.title}</span>
                      </div>
                      <div className="pl-3.5">
                        <ProgressBar value={mod.progress} />
                        <p className="text-xs text-[#3a3a44] mt-1">{mod.checklist_done}/{mod.checklist_total}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto p-6">
            {selectedModule ? (
              <>
                <div className="mb-6">
                  <div className="flex items-start justify-between mb-1">
                    <h2 className="text-lg font-semibold">{selectedModule.title}</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        color: STATUS_CONFIG[selectedModule.status as keyof typeof STATUS_CONFIG]?.color,
                        background: `${STATUS_CONFIG[selectedModule.status as keyof typeof STATUS_CONFIG]?.color}1a`,
                      }}>
                      {STATUS_CONFIG[selectedModule.status as keyof typeof STATUS_CONFIG]?.label}
                    </span>
                  </div>
                  {selectedModule.description && (
                    <p className="text-sm text-[#5a5a66]">{selectedModule.description}</p>
                  )}
                  {selectedModule.doc_link && (
                    <a href={selectedModule.doc_link} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-[#7c6aff] hover:underline mt-2">
                      📄 View Documentation ↗
                    </a>
                  )}
                </div>
                <div className="bg-[#111114] border border-[#1e1e24] rounded-xl p-4 mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[#8a8a99]">Progress</span>
                    <span className="font-mono">{checklist.filter(i => i.is_done).length}/{checklist.length} items</span>
                  </div>
                  <ProgressBar value={selectedModule.progress} />
                </div>
                <div className="space-y-2">
                  {checklist.length === 0 && (
                    <p className="text-sm text-[#5a5a66] text-center py-8">No checklist items yet.</p>
                  )}
                  {checklist.map((item) => (
                    <div key={item.id} onClick={() => toggleItem(item.id)}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#111114] cursor-pointer group transition-colors">
                      <div className={`mt-0.5 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                        item.is_done ? "bg-[#7c6aff] border-[#7c6aff]" : "border-[#2e2e38] group-hover:border-[#7c6aff]"
                      }`}>
                        {item.is_done && (
                          <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${item.is_done ? "text-[#5a5a66] line-through" : "text-white"}`}>
                          {item.text}
                        </p>
                        {item.is_done && item.done_by_name && (
                          <p className="text-xs text-[#3a3a44] mt-0.5">Done by {item.done_by_name}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-[#5a5a66]">Select a module to view its checklist</p>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
