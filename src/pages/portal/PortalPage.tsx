import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { portalApi } from "../../lib/api";
import type { PortalProject, PortalModule } from "../../lib/types";

const STATUS_CONFIG = {
  not_started: { label: "Not Started", color: "#5a5a66", bg: "#1a1a20", border: "#2e2e38" },
  in_progress:  { label: "In Progress", color: "#f59e0b", bg: "#f59e0b15", border: "#f59e0b33" },
  review:       { label: "Review",      color: "#3b82f6", bg: "#3b82f615", border: "#3b82f633" },
  done:         { label: "Complete",    color: "#22c55e", bg: "#22c55e15", border: "#22c55e33" },
};

function CircleProgress({ value, size = 64 }: { value: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e1e24" strokeWidth="4" />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={value === 100 ? "#22c55e" : "#7c6aff"}
        strokeWidth="4" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.8s ease" }} />
    </svg>
  );
}

function ModuleCard({ mod }: { mod: PortalModule }) {
  const sc = STATUS_CONFIG[mod.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.not_started;
  return (
    <div className="bg-[#111114] border border-[#1e1e24] rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-white mb-1">{mod.title}</h3>
          {mod.description && <p className="text-sm text-[#5a5a66] line-clamp-2">{mod.description}</p>}
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0"
          style={{ color: sc.color, background: sc.bg }}>{sc.label}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <CircleProgress value={mod.progress} size={56} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-mono font-semibold"
              style={{ color: mod.progress === 100 ? "#22c55e" : "#7c6aff" }}>
              {Math.round(mod.progress)}%
            </span>
          </div>
        </div>
        <div className="flex-1">
          <div className="h-1.5 bg-[#1e1e24] rounded-full overflow-hidden mb-2">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${mod.progress}%`, background: mod.progress === 100 ? "#22c55e" : "#7c6aff" }} />
          </div>
          <p className="text-xs text-[#5a5a66]">{mod.checklist_done} of {mod.checklist_total} tasks completed</p>
        </div>
      </div>
      {mod.doc_link && (
        <div className="mt-4 pt-4 border-t border-[#1e1e24]">
          <a href={mod.doc_link} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-[#7c6aff] hover:text-white transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2h6l2 2v8H2V2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M8 2v2h2" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4 6h5M4 8h5M4 10h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            View Documentation
          </a>
        </div>
      )}
    </div>
  );
}

// ── Map View (read-only for clients) ──────────────────────────────────────────
function MapView({ modules }: { modules: PortalModule[] }) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  if (modules.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[#5a5a66] text-sm">
        No modules yet
      </div>
    );
  }

  const COLS = Math.min(modules.length, 3);
  const NODE_W = 210;
  const NODE_H = 96;
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
            const x1 = from.x + NODE_W, y1 = from.y + NODE_H / 2;
            const x2 = to.x,           y2 = to.y   + NODE_H / 2;
            const mx = (x1 + x2) / 2;
            return (
              <g key={i}>
                <path d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                  fill="none" stroke="#2e2e38" strokeWidth="1.5" strokeDasharray="4 3" />
                <polygon points={`${x2},${y2} ${x2-6},${y2-4} ${x2-6},${y2+4}`} fill="#2e2e38" />
              </g>
            );
          } else {
            const x1 = from.x + NODE_W / 2, y1 = from.y + NODE_H;
            const x2 = to.x   + NODE_W / 2, y2 = to.y;
            const my = (y1 + y2) / 2;
            return (
              <g key={i}>
                <path d={`M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`}
                  fill="none" stroke="#2e2e38" strokeWidth="1.5" strokeDasharray="4 3" />
                <polygon points={`${x2},${y2} ${x2-4},${y2-6} ${x2+4},${y2-6}`} fill="#2e2e38" />
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
              <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={12}
                fill={isSelected ? cfg.bg : "#111114"}
                stroke={isSelected ? cfg.color : "#2e2e38"}
                strokeWidth={isSelected ? 1.5 : 1} />
              <circle cx={x + 16} cy={y + 18} r={4} fill={cfg.color} />
              <text x={x + 30} y={y + 22} fill="white" fontSize={11} fontWeight={600}
                style={{ fontFamily: "inherit" }}>
                {mod.title.length > 24 ? mod.title.slice(0, 24) + "…" : mod.title}
              </text>
              <text x={x + 16} y={y + 38} fill={cfg.color} fontSize={9}
                style={{ fontFamily: "inherit" }}>{cfg.label}</text>
              <text x={x + 16} y={y + 52} fill="#3a3a44" fontSize={9}
                style={{ fontFamily: "inherit" }}>
                {mod.checklist_done}/{mod.checklist_total} tasks
              </text>
              {/* Progress bar */}
              <rect x={x + 12} y={y + NODE_H - 16} width={NODE_W - 24} height={4} rx={2} fill="#1e1e24" />
              <rect x={x + 12} y={y + NODE_H - 16}
                width={Math.max(0, (NODE_W - 24) * mod.progress / 100)} height={4} rx={2}
                fill={mod.progress === 100 ? "#22c55e" : "#7c6aff"} />
              <text x={x + NODE_W - 12} y={y + NODE_H - 20} fill="#5a5a66" fontSize={9}
                textAnchor="end" style={{ fontFamily: "inherit" }}>
                {Math.round(mod.progress)}%
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
          <div className="mt-4 bg-[#111114] border rounded-2xl p-5"
            style={{ borderColor: cfg.border }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
              <span className="font-semibold">{mod.title}</span>
              <span className="text-xs px-2 py-0.5 rounded-full ml-auto"
                style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
            </div>
            {mod.description && <p className="text-sm text-[#5a5a66] mb-3">{mod.description}</p>}
            <div className="flex items-center gap-4">
              <div className="relative">
                <CircleProgress value={mod.progress} size={48} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-mono font-semibold"
                    style={{ color: mod.progress === 100 ? "#22c55e" : "#7c6aff" }}>
                    {Math.round(mod.progress)}%
                  </span>
                </div>
              </div>
              <div className="text-xs text-[#5a5a66]">
                <p>{mod.checklist_done} of {mod.checklist_total} tasks completed</p>
              </div>
            </div>
            {mod.doc_link && (
              <a href={mod.doc_link} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-[#7c6aff] hover:underline mt-3">
                📄 View Documentation ↗
              </a>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PortalPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [data, setData] = useState<PortalProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "map">("overview");

  useEffect(() => {
    if (!projectId) return;
    portalApi.get(projectId)
      .then(setData)
      .catch(() => setError("Unable to load project. Please check your access."))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading)
    return <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center"><p className="text-[#5a5a66]">Loading...</p></div>;
  if (error || !data)
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 mb-2">{error}</p>
          <a href="/auth/login" className="text-sm text-[#7c6aff] hover:underline">Sign in</a>
        </div>
      </div>
    );

  const doneModules = data.modules.filter((m) => m.status === "done").length;

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white">
      {/* Header */}
      <header className="border-b border-[#1e1e24] px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#7c6aff] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" rx="1" fill="white" />
                <rect x="9" y="2" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" />
                <rect x="2" y="9" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" />
                <rect x="9" y="9" width="5" height="5" rx="1" fill="white" />
              </svg>
            </div>
            <span className="text-sm text-[#5a5a66]">Project Portal</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Project title + overall progress */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{data.name}</h1>
          {data.description && <p className="text-[#8a8a99] text-lg">{data.description}</p>}
          <div className="mt-6 bg-[#111114] border border-[#1e1e24] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[#8a8a99]">Overall Progress</span>
              <span className="font-mono font-semibold text-lg">{data.overall_progress}%</span>
            </div>
            <div className="h-2 bg-[#1e1e24] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${data.overall_progress}%`, background: data.overall_progress === 100 ? "#22c55e" : "#7c6aff" }} />
            </div>
            <div className="flex gap-6 mt-4 text-sm text-[#5a5a66]">
              <span>{data.modules.length} modules total</span>
              <span>{doneModules} completed</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#1e1e24] mb-6">
          {(["overview", "map"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
                activeTab === tab
                  ? "text-white border-[#7c6aff]"
                  : "text-[#5a5a66] border-transparent hover:text-[#8a8a99]"
              }`}>
              {tab === "map" ? "🗺 Map View" : "Modules"}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.modules.map((mod) => <ModuleCard key={mod.id} mod={mod} />)}
          </div>
        )}

        {/* Map tab */}
        {activeTab === "map" && (
          <div>
            <p className="text-xs text-[#3a3a44] mb-4">Click any module to see details</p>
            <MapView modules={data.modules} />
          </div>
        )}
      </main>
    </div>
  );
}
