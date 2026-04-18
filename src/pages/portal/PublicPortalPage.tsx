import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { PortalProject, PortalModule } from "../../lib/types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8001";

const STATUS_CONFIG = {
  not_started: { label: "Not Started", color: "#64748b", glow: "#64748b", dot: "#334155", kanbanBg: "rgba(100,116,139,0.08)" },
  in_progress:  { label: "In Progress", color: "#f59e0b", glow: "#f59e0b", dot: "#f59e0b", kanbanBg: "rgba(245,158,11,0.06)" },
  review:       { label: "In Review",   color: "#38bdf8", glow: "#38bdf8", dot: "#38bdf8", kanbanBg: "rgba(56,189,248,0.06)" },
  done:         { label: "Complete",    color: "#22c55e", glow: "#22c55e", dot: "#22c55e", kanbanBg: "rgba(34,197,94,0.06)" },
};
const KANBAN_COLS = ["not_started","in_progress","review","done"] as const;

function RingProgress({ value, size = 60, color }: { value: number; size?: number; color: string }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 0 6px ${color}88)` }} />
    </svg>
  );
}

function ModuleCard({ mod, index }: { mod: PortalModule; index: number }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[mod.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.not_started;
  const isComplete = mod.status === "done";

  return (
    <div onClick={() => setOpen(!open)} style={{
      animationDelay: `${index * 80}ms`,
      background: open ? "linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))" : "linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
      border: `1px solid ${open ? cfg.color + "55" : "rgba(255,255,255,0.07)"}`,
      boxShadow: open ? `0 0 24px ${cfg.color}18, inset 0 1px 0 rgba(255,255,255,0.06)` : "inset 0 1px 0 rgba(255,255,255,0.04)",
      backdropFilter: "blur(12px)", borderRadius: "20px", cursor: "pointer",
      transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)", overflow: "hidden",
    }} className="module-card">
      <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <RingProgress value={mod.progress} size={60} color={cfg.color} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(90deg)" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: cfg.color, fontFamily: "monospace" }}>{Math.round(mod.progress)}%</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#f1f5f9", letterSpacing: "-0.01em" }}>{mod.title}</h3>
            <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: cfg.color, background: cfg.color + "18", border: `1px solid ${cfg.color}33`, padding: "2px 8px", borderRadius: "20px" }}>{cfg.label}</span>
          </div>
          {mod.description && <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mod.description}</p>}
          <div style={{ marginTop: "8px", height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: "999px", width: `${mod.progress}%`, background: isComplete ? "linear-gradient(90deg,#22c55e,#4ade80)" : `linear-gradient(90deg,${cfg.color}88,${cfg.color})`, boxShadow: `0 0 8px ${cfg.color}66`, transition: "width 1s cubic-bezier(0.4,0,0.2,1)" }} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
          <span style={{ fontSize: "11px", color: "#475569" }}>{mod.checklist_done}/{mod.checklist_total} tasks</span>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s ease", color: open ? cfg.color : "#475569" }}>
            <path d="M5 7l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "16px 24px 20px", animation: "expandDown 0.25s ease" }}>
          {mod.checklist_total === 0 ? (
            <p style={{ margin: 0, fontSize: "13px", color: "#475569", fontStyle: "italic" }}>No tasks added yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <p style={{ margin: "0 0 10px", fontSize: "11px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Tasks — {mod.checklist_done} of {mod.checklist_total} done</p>
              {(mod.checklist_items?.length > 0 ? mod.checklist_items : Array.from({ length: mod.checklist_total }).map((_, i) => ({ text: `Task ${i + 1}`, is_done: i < mod.checklist_done }))).map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderRadius: "10px", background: item.is_done ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${item.is_done ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)"}` }}>
                  <div style={{ width: "16px", height: "16px", borderRadius: "50%", flexShrink: 0, background: item.is_done ? "#22c55e" : "transparent", border: `2px solid ${item.is_done ? "#22c55e" : "#334155"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {item.is_done && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </div>
                  <span style={{ fontSize: "13px", color: item.is_done ? "#64748b" : "#94a3b8", textDecoration: item.is_done ? "line-through" : "none", flex: 1 }}>{item.text}</span>
                  {item.is_done && <span style={{ fontSize: "10px", color: "#22c55e", fontWeight: 600 }}>Done</span>}
                </div>
              ))}
            </div>
          )}
          {mod.doc_link && (
            <a href={mod.doc_link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "14px", fontSize: "12px", color: "#7c6aff", textDecoration: "none", fontWeight: 500 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2h5l2 2v6H2V2z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" /><path d="M7 2v2h2" stroke="currentColor" strokeWidth="1.1" /><path d="M3.5 5.5h4M3.5 7h4M3.5 8.5h2.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" /></svg>
              View Documentation ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function MapView({ modules }: { modules: PortalModule[] }) {
  return (
    <div style={{ padding: "8px 0" }}>
      {modules.map((mod, i) => {
        const cfg = STATUS_CONFIG[mod.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.not_started;
        const isLast = i === modules.length - 1;
        return (
          <div key={mod.id} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "28px", flexShrink: 0 }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: mod.status === "done" ? cfg.color : "rgba(255,255,255,0.04)", border: `2px solid ${cfg.color}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: mod.status === "done" ? `0 0 12px ${cfg.color}66` : "none", flexShrink: 0 }}>
                {mod.status === "done" ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ) : (
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: cfg.color, opacity: 0.8 }} />
                )}
              </div>
              {!isLast && <div style={{ width: "2px", flex: 1, minHeight: "40px", background: `linear-gradient(180deg, ${cfg.color}44, rgba(255,255,255,0.06))`, margin: "4px 0" }} />}
            </div>
            <div style={{ flex: 1, paddingBottom: isLast ? 0 : "28px", paddingTop: "2px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#f1f5f9" }}>{mod.title}</span>
                <span style={{ fontSize: "10px", color: cfg.color, background: cfg.color + "18", border: `1px solid ${cfg.color}30`, padding: "1px 7px", borderRadius: "20px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{cfg.label}</span>
              </div>
              {mod.description && <p style={{ margin: "0 0 6px", fontSize: "12px", color: "#64748b" }}>{mod.description}</p>}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ flex: 1, height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "999px", overflow: "hidden", maxWidth: "160px" }}>
                  <div style={{ height: "100%", width: `${mod.progress}%`, background: `linear-gradient(90deg,${cfg.color}88,${cfg.color})`, borderRadius: "999px", transition: "width 1s ease" }} />
                </div>
                <span style={{ fontSize: "11px", color: "#475569" }}>{mod.checklist_done}/{mod.checklist_total} tasks</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanView({ modules }: { modules: PortalModule[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
      {KANBAN_COLS.map((col) => {
        const cfg = STATUS_CONFIG[col];
        const colMods = modules.filter((m) => m.status === col);
        return (
          <div key={col} style={{ background: cfg.kanbanBg, border: `1px solid ${cfg.color}22`, borderRadius: "16px", padding: "14px", minHeight: "120px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: cfg.color, boxShadow: `0 0 6px ${cfg.color}88` }} />
              <span style={{ fontSize: "11px", fontWeight: 700, color: cfg.color, textTransform: "uppercase", letterSpacing: "0.07em" }}>{cfg.label}</span>
              <span style={{ marginLeft: "auto", fontSize: "11px", color: "#475569", background: "rgba(255,255,255,0.05)", padding: "1px 7px", borderRadius: "20px" }}>{colMods.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {colMods.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#334155", fontSize: "12px" }}>Empty</div>
              ) : colMods.map((mod) => (
                <div key={mod.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "10px 12px" }}>
                  <p style={{ margin: "0 0 5px", fontSize: "13px", fontWeight: 500, color: "#e2e8f0", lineHeight: 1.3 }}>{mod.title}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ flex: 1, height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${mod.progress}%`, background: cfg.color, borderRadius: "999px" }} />
                    </div>
                    <span style={{ fontSize: "10px", color: "#475569" }}>{Math.round(mod.progress)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SummaryModal({ shareToken, onClose }: { shareToken: string; onClose: () => void }) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/portal/public/${shareToken}/summary`, { method: "POST" })
      .then((r) => { if (!r.ok) return r.json().then((d) => { throw new Error(d.detail || "Error"); }); return r.json(); })
      .then((d) => setSummary(d.summary))
      .catch((e) => setError(e.message || "Couldn't generate summary. Please try again."))
      .finally(() => setLoading(false));
  }, [shareToken]);

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
      <div style={{ width: "100%", maxWidth: "520px", background: "linear-gradient(135deg,rgba(20,20,28,0.98),rgba(14,14,20,0.98))", border: "1px solid rgba(124,106,255,0.3)", borderRadius: "24px", padding: "28px", boxShadow: "0 0 60px rgba(124,106,255,0.15), 0 40px 80px rgba(0,0,0,0.6)", animation: "modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", flexShrink: 0, background: "linear-gradient(135deg,rgba(124,106,255,0.2),rgba(124,106,255,0.1))", border: "1px solid rgba(124,106,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2l1.8 4.2L15 8l-4.2 1.8L9 14l-1.8-4.2L3 8l4.2-1.8L9 2z" stroke="#a78bff" strokeWidth="1.3" strokeLinejoin="round" fill="rgba(124,106,255,0.15)" /></svg>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#f1f5f9" }}>AI Project Summary</h2>
              <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>Generated by GPT</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: "30px", height: "30px", borderRadius: "8px", border: "none", background: "rgba(255,255,255,0.05)", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div style={{ height: "1px", background: "linear-gradient(90deg,transparent,rgba(124,106,255,0.2),transparent)", marginBottom: "20px" }} />
        <div style={{ minHeight: "80px" }}>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "20px 0" }}>
              <div style={{ display: "flex", gap: "4px" }}>
                {[0,1,2].map((i) => (<div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#7c6aff", animation: `dotBounce 1.2s ease-in-out ${i*0.2}s infinite`, boxShadow: "0 0 8px #7c6aff88" }} />))}
              </div>
              <span style={{ fontSize: "13px", color: "#64748b" }}>GPT is reviewing your project…</span>
            </div>
          )}
          {error && <p style={{ margin: 0, color: "#f87171", fontSize: "14px" }}>{error}</p>}
          {summary && <p style={{ margin: 0, fontSize: "14px", color: "#cbd5e1", lineHeight: 1.7 }}>{summary}</p>}
        </div>
        {!loading && (
          <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: "10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

type View = "list" | "map" | "kanban";

export default function PublicPortalPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [data, setData] = useState<PortalProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [view, setView] = useState<View>("list");

  useEffect(() => {
    if (!shareToken) return;
    fetch(`${API_URL}/portal/public/${shareToken}`)
      .then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then(setData)
      .catch(() => setError("This portal link is invalid or has been disabled."))
      .finally(() => setLoading(false));
  }, [shareToken]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#080810", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(124,106,255,0.15)", border: "1px solid rgba(124,106,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" fill="#7c6aff" /><rect x="9" y="2" width="5" height="5" rx="1" fill="#7c6aff" fillOpacity="0.5" /><rect x="2" y="9" width="5" height="5" rx="1" fill="#7c6aff" fillOpacity="0.5" /><rect x="9" y="9" width="5" height="5" rx="1" fill="#7c6aff" /></svg>
        </div>
        <p style={{ color: "#475569", fontSize: "14px", margin: 0 }}>Loading your project…</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div style={{ minHeight: "100vh", background: "#080810", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#f87171", marginBottom: "8px" }}>{error}</p>
        <p style={{ color: "#475569", fontSize: "13px", margin: 0 }}>Contact your project manager for a new link.</p>
      </div>
    </div>
  );

  const doneCount = data.modules.filter((m) => m.status === "done").length;
  const inProgressCount = data.modules.filter((m) => m.status === "in_progress").length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; } body { margin: 0; }
        .portal-root { min-height: 100vh; background: #080810; color: #f1f5f9; font-family: 'DM Sans', -apple-system, sans-serif; position: relative; }
        .portal-root::before { content:''; position:fixed; top:-200px; left:50%; transform:translateX(-50%); width:800px; height:500px; background:radial-gradient(ellipse at center,rgba(124,106,255,0.12) 0%,transparent 70%); pointer-events:none; z-index:0; }
        .portal-content { position: relative; z-index: 1; }
        .module-card:hover { transform: translateY(-1px); border-color: rgba(255,255,255,0.12) !important; }
        .summary-btn:hover { transform: translateY(-1px); box-shadow: 0 0 20px rgba(124,106,255,0.3) !important; }
        .view-btn { padding:6px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); color:#64748b; font-size:12px; font-weight:600; cursor:pointer; transition:all 0.2s; font-family:'DM Sans',sans-serif; }
        .view-btn.active { background:rgba(124,106,255,0.15); border-color:rgba(124,106,255,0.4); color:#a78bff; }
        .view-btn:hover:not(.active) { color:#94a3b8; border-color:rgba(255,255,255,0.15); }
        .stat-card { background:linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01)); border:1px solid rgba(255,255,255,0.07); border-radius:16px; padding:16px 20px; }
        @keyframes expandDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dotBounce { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-8px);opacity:1} }
        @keyframes modalIn { from{opacity:0;transform:scale(0.92) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeSlideUp 0.5s cubic-bezier(0.4,0,0.2,1) both; }
      `}</style>

      <div className="portal-root">
        <div className="portal-content">
          <header style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 10, background: "rgba(8,8,16,0.8)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "linear-gradient(135deg,#7c6aff,#5b4cdd)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(124,106,255,0.3)" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" fill="white" /><rect x="9" y="2" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" /><rect x="2" y="9" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" /><rect x="9" y="9" width="5" height="5" rx="1" fill="white" /></svg>
              </div>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#f1f5f9" }}>Scrumly</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {data.git_link && (
                <a href={data.git_link} target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#64748b", textDecoration: "none", padding: "6px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", transition: "all 0.2s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#f1f5f9"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#64748b"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                  Repository ↗
                </a>
              )}
              <span style={{ fontSize: "13px", color: "#475569", fontWeight: 500 }}>Client Portal</span>
            </div>
          </header>

          <main style={{ maxWidth: "760px", margin: "0 auto", padding: "48px 24px 80px" }}>
            {/* Project header */}
            <div className="fade-up" style={{ marginBottom: "40px" }}>
              <h1 style={{ margin: "0 0 8px", fontSize: "clamp(24px,4vw,36px)", fontWeight: 700, letterSpacing: "-0.03em", color: "#f8fafc", lineHeight: 1.2 }}>{data.name}</h1>
              {data.description && <p style={{ margin: "0 0 28px", fontSize: "15px", color: "#64748b", lineHeight: 1.6 }}>{data.description}</p>}

              {/* Progress card */}
              <div style={{ background: "linear-gradient(135deg,rgba(124,106,255,0.08),rgba(124,106,255,0.03))", border: "1px solid rgba(124,106,255,0.2)", borderRadius: "20px", padding: "24px", boxShadow: "0 0 40px rgba(124,106,255,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <span style={{ fontSize: "13px", color: "#7c6aff", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Overall Progress</span>
                  <span style={{ fontSize: "28px", fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Mono',monospace" }}>{data.overall_progress}%</span>
                </div>
                <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "999px", overflow: "hidden", marginBottom: "16px" }}>
                  <div style={{ height: "100%", borderRadius: "999px", width: `${data.overall_progress}%`, background: data.overall_progress === 100 ? "linear-gradient(90deg,#22c55e,#4ade80)" : "linear-gradient(90deg,#7c6aff,#a78bff)", boxShadow: "0 0 12px rgba(124,106,255,0.5)", transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  {[
                    { val: doneCount, label: "Complete", color: "#22c55e" },
                    { val: inProgressCount, label: "In Progress", color: "#f59e0b" },
                    { val: data.modules.length, label: "Total", color: "#f1f5f9" },
                  ].map(({ val, label, color }) => (
                    <div key={label} className="stat-card" style={{ flex: 1, textAlign: "center" }}>
                      <p style={{ margin: 0, fontSize: "20px", fontWeight: 700, color }}>{val}</p>
                      <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Summary button */}
            <div className="fade-up" style={{ animationDelay: "100ms", marginBottom: "32px", display: "flex", justifyContent: "center" }}>
              <button className="summary-btn" onClick={() => setShowSummary(true)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 24px", borderRadius: "14px", background: "linear-gradient(135deg,rgba(124,106,255,0.15),rgba(124,106,255,0.08))", border: "1px solid rgba(124,106,255,0.35)", color: "#a78bff", fontSize: "14px", fontWeight: 600, cursor: "pointer", transition: "all 0.25s", boxShadow: "0 0 24px rgba(124,106,255,0.12),inset 0 1px 0 rgba(255,255,255,0.06)", fontFamily: "'DM Sans',sans-serif" }}>
                ✨ Get AI Project Summary
              </button>
            </div>

            {/* View toggle + modules */}
            <div className="fade-up" style={{ animationDelay: "160ms" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                <h2 style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Modules — {data.modules.length} total
                </h2>
                <div style={{ display: "flex", gap: "6px" }}>
                  {(["list","map","kanban"] as View[]).map((v) => (
                    <button key={v} onClick={() => setView(v)} className={`view-btn${view === v ? " active" : ""}`}>
                      {v === "list" ? "📋 List" : v === "map" ? "🗺 Map" : "📊 Kanban"}
                    </button>
                  ))}
                </div>
              </div>

              {data.modules.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "20px" }}>
                  <p style={{ margin: 0, color: "#334155", fontSize: "14px" }}>No modules added yet.</p>
                </div>
              ) : view === "list" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {data.modules.map((mod, i) => <ModuleCard key={mod.id} mod={mod} index={i} />)}
                </div>
              ) : view === "map" ? (
                <div style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "20px", padding: "28px 32px" }}>
                  <MapView modules={data.modules} />
                </div>
              ) : (
                <KanbanView modules={data.modules} />
              )}
            </div>
          </main>
        </div>
      </div>

      {showSummary && shareToken && <SummaryModal shareToken={shareToken} onClose={() => setShowSummary(false)} />}
    </>
  );
}
