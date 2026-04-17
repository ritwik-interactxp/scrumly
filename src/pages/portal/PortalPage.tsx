import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { portalApi } from "../../lib/api";
import type { PortalProject, PortalModule } from "../../lib/types";

const STATUS_CONFIG = {
  not_started: { label: "Not Started", color: "#64748b", glow: "#64748b", dot: "#334155" },
  in_progress:  { label: "In Progress", color: "#f59e0b", glow: "#f59e0b", dot: "#f59e0b" },
  review:       { label: "In Review",   color: "#38bdf8", glow: "#38bdf8", dot: "#38bdf8" },
  done:         { label: "Complete",    color: "#22c55e", glow: "#22c55e", dot: "#22c55e" },
};

// ── Animated ring progress ────────────────────────────────────────────────────
function RingProgress({ value, size = 72, color }: { value: number; size?: number; color: string }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 0 6px ${color}88)` }} />
    </svg>
  );
}

// ── Module card (glass panel, clickable) ──────────────────────────────────────
function ModuleCard({ mod, index }: { mod: PortalModule; index: number }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[mod.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.not_started;
  const isComplete = mod.status === "done";

  return (
    <div
      onClick={() => setOpen(!open)}
      style={{
        animationDelay: `${index * 80}ms`,
        background: open
          ? `linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)`
          : `linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)`,
        border: `1px solid ${open ? cfg.color + "55" : "rgba(255,255,255,0.07)"}`,
        boxShadow: open ? `0 0 24px ${cfg.color}18, inset 0 1px 0 rgba(255,255,255,0.06)` : `inset 0 1px 0 rgba(255,255,255,0.04)`,
        backdropFilter: "blur(12px)",
        borderRadius: "20px",
        cursor: "pointer",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
      }}
      className="module-card"
    >
      {/* Card header */}
      <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Ring */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <RingProgress value={mod.progress} size={60} color={cfg.color} />
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            transform: "rotate(90deg)"
          }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: cfg.color, fontFamily: "monospace" }}>
              {Math.round(mod.progress)}%
            </span>
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#f1f5f9", letterSpacing: "-0.01em" }}>
              {mod.title}
            </h3>
            <span style={{
              fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
              color: cfg.color, background: cfg.color + "18", border: `1px solid ${cfg.color}33`,
              padding: "2px 8px", borderRadius: "20px"
            }}>
              {cfg.label}
            </span>
          </div>
          {mod.description && (
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {mod.description}
            </p>
          )}
          {/* Progress bar */}
          <div style={{ marginTop: "8px", height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: "999px",
              width: `${mod.progress}%`,
              background: isComplete
                ? "linear-gradient(90deg, #22c55e, #4ade80)"
                : `linear-gradient(90deg, ${cfg.color}88, ${cfg.color})`,
              boxShadow: `0 0 8px ${cfg.color}66`,
              transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
            }} />
          </div>
        </div>

        {/* Chevron + task count */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
          <span style={{ fontSize: "11px", color: "#475569" }}>
            {mod.checklist_done}/{mod.checklist_total} tasks
          </span>
          <svg
            width="18" height="18" viewBox="0 0 18 18" fill="none"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s ease", color: open ? cfg.color : "#475569" }}
          >
            <path d="M5 7l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Expanded task list */}
      {open && (
        <div style={{
          borderTop: `1px solid rgba(255,255,255,0.05)`,
          padding: "16px 24px 20px",
          animation: "expandDown 0.25s ease",
        }}>
          {mod.checklist_total === 0 ? (
            <p style={{ margin: 0, fontSize: "13px", color: "#475569", fontStyle: "italic" }}>No tasks added yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <p style={{ margin: "0 0 10px", fontSize: "11px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                Tasks — {mod.checklist_done} of {mod.checklist_total} done
              </p>
              {/* We only have counts from the API, so show visual representation */}
              {Array.from({ length: mod.checklist_total }).map((_, i) => {
                const isDone = i < mod.checklist_done;
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "8px 12px", borderRadius: "10px",
                    background: isDone ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isDone ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)"}`,
                  }}>
                    <div style={{
                      width: "16px", height: "16px", borderRadius: "50%", flexShrink: 0,
                      background: isDone ? "#22c55e" : "transparent",
                      border: `2px solid ${isDone ? "#22c55e" : "#334155"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isDone && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span style={{ fontSize: "13px", color: isDone ? "#64748b" : "#94a3b8", textDecoration: isDone ? "line-through" : "none" }}>
                      Task {i + 1}
                    </span>
                    {isDone && (
                      <span style={{ marginLeft: "auto", fontSize: "10px", color: "#22c55e", fontWeight: 600 }}>Done</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {mod.doc_link && (
            <a
              href={mod.doc_link} target="_blank" rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                marginTop: "14px", fontSize: "12px", color: "#7c6aff",
                textDecoration: "none", fontWeight: 500,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2h5l2 2v6H2V2z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
                <path d="M7 2v2h2" stroke="currentColor" strokeWidth="1.1" />
                <path d="M3.5 5.5h4M3.5 7h4M3.5 8.5h2.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
              </svg>
              View Documentation ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ── AI Summary Modal ──────────────────────────────────────────────────────────
function SummaryModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${import.meta.env.VITE_API_URL}/portal/${projectId}/summary`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => setSummary(d.summary))
      .catch(() => setError("Couldn't generate summary. Please try again."))
      .finally(() => setLoading(false));
  }, [projectId]);

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
      }}
    >
      <div style={{
        width: "100%", maxWidth: "520px",
        background: "linear-gradient(135deg, rgba(20,20,28,0.98) 0%, rgba(14,14,20,0.98) 100%)",
        border: "1px solid rgba(124,106,255,0.3)",
        borderRadius: "24px", padding: "28px",
        boxShadow: "0 0 60px rgba(124,106,255,0.15), 0 40px 80px rgba(0,0,0,0.6)",
        animation: "modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "40px", height: "40px", borderRadius: "12px", flexShrink: 0,
              background: "linear-gradient(135deg, rgba(124,106,255,0.2), rgba(124,106,255,0.1))",
              border: "1px solid rgba(124,106,255,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2l1.8 4.2L15 8l-4.2 1.8L9 14l-1.8-4.2L3 8l4.2-1.8L9 2z"
                  stroke="#a78bff" strokeWidth="1.3" strokeLinejoin="round" fill="rgba(124,106,255,0.15)" />
              </svg>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#f1f5f9" }}>AI Project Summary</h2>
              <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>Generated just for you</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "30px", height: "30px", borderRadius: "8px", border: "none",
              background: "rgba(255,255,255,0.05)", color: "#64748b", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLButtonElement).style.color = "#f1f5f9"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLButtonElement).style.color = "#64748b"; }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(124,106,255,0.2), transparent)", marginBottom: "20px" }} />

        {/* Body */}
        <div style={{ minHeight: "80px" }}>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "20px 0" }}>
              <div style={{ display: "flex", gap: "4px" }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: "6px", height: "6px", borderRadius: "50%", background: "#7c6aff",
                    animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                    boxShadow: "0 0 8px #7c6aff88",
                  }} />
                ))}
              </div>
              <span style={{ fontSize: "13px", color: "#64748b" }}>Claude is reviewing your project…</span>
            </div>
          )}
          {error && <p style={{ margin: 0, color: "#f87171", fontSize: "14px" }}>{error}</p>}
          {summary && (
            <p style={{ margin: 0, fontSize: "14px", color: "#cbd5e1", lineHeight: 1.7 }}>{summary}</p>
          )}
        </div>

        {!loading && (
          <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={onClose}
              style={{
                padding: "8px 18px", borderRadius: "10px",
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                color: "#94a3b8", fontSize: "13px", fontWeight: 500, cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLButtonElement).style.color = "#f1f5f9"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"; }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PortalPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [data, setData] = useState<PortalProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    portalApi.get(projectId)
      .then(setData)
      .catch(() => setError("Unable to load project. Please check your access."))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#080810", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(124,106,255,0.15)", border: "1px solid rgba(124,106,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="5" height="5" rx="1" fill="#7c6aff" /><rect x="9" y="2" width="5" height="5" rx="1" fill="#7c6aff" fillOpacity="0.5" /><rect x="2" y="9" width="5" height="5" rx="1" fill="#7c6aff" fillOpacity="0.5" /><rect x="9" y="9" width="5" height="5" rx="1" fill="#7c6aff" />
          </svg>
        </div>
        <p style={{ color: "#475569", fontSize: "14px", margin: 0 }}>Loading your project…</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div style={{ minHeight: "100vh", background: "#080810", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#f87171", marginBottom: "12px" }}>{error}</p>
        <a href="/auth/login" style={{ color: "#7c6aff", fontSize: "14px" }}>Sign in</a>
      </div>
    </div>
  );

  const doneCount = data.modules.filter((m) => m.status === "done").length;
  const inProgressCount = data.modules.filter((m) => m.status === "in_progress").length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        * { box-sizing: border-box; }
        body { margin: 0; }

        .portal-root {
          min-height: 100vh;
          background: #080810;
          color: #f1f5f9;
          font-family: 'DM Sans', -apple-system, sans-serif;
          position: relative;
        }

        .portal-root::before {
          content: '';
          position: fixed;
          top: -200px; left: 50%;
          transform: translateX(-50%);
          width: 800px; height: 500px;
          background: radial-gradient(ellipse at center, rgba(124,106,255,0.12) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .portal-root::after {
          content: '';
          position: fixed;
          bottom: -200px; right: -100px;
          width: 600px; height: 600px;
          background: radial-gradient(ellipse at center, rgba(56,189,248,0.05) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .portal-content { position: relative; z-index: 1; }

        .module-card:hover {
          transform: translateY(-1px);
          border-color: rgba(255,255,255,0.12) !important;
        }

        .summary-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 0 20px rgba(124,106,255,0.3) !important;
        }

        .stat-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 16px 20px;
          backdrop-filter: blur(12px);
        }

        @keyframes expandDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-8px); opacity: 1; }
        }

        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.92) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .fade-up {
          animation: fadeSlideUp 0.5s cubic-bezier(0.4,0,0.2,1) both;
        }
      `}</style>

      <div className="portal-root">
        <div className="portal-content">

          {/* Header */}
          <header style={{
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            padding: "16px 32px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            backdropFilter: "blur(20px)",
            position: "sticky", top: 0, zIndex: 10,
            background: "rgba(8,8,16,0.8)",
          }}>
            <Link to="/portal" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "10px",
                background: "linear-gradient(135deg, #7c6aff, #5b4cdd)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 20px rgba(124,106,255,0.3)",
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="5" height="5" rx="1" fill="white" />
                  <rect x="9" y="2" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" />
                  <rect x="2" y="9" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" />
                  <rect x="9" y="9" width="5" height="5" rx="1" fill="white" />
                </svg>
              </div>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#f1f5f9" }}>Scrumly</span>
            </Link>

            <span style={{ fontSize: "13px", color: "#475569", fontWeight: 500 }}>Client Portal</span>
          </header>

          <main style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 24px 80px" }}>

            {/* Project hero */}
            <div className="fade-up" style={{ marginBottom: "40px" }}>
              <h1 style={{
                margin: "0 0 8px",
                fontSize: "clamp(24px, 4vw, 36px)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: "#f8fafc",
                lineHeight: 1.2,
              }}>
                {data.name}
              </h1>
              {data.description && (
                <p style={{ margin: "0 0 28px", fontSize: "15px", color: "#64748b", lineHeight: 1.6 }}>
                  {data.description}
                </p>
              )}

              {/* Overall progress card */}
              <div style={{
                background: "linear-gradient(135deg, rgba(124,106,255,0.08) 0%, rgba(124,106,255,0.03) 100%)",
                border: "1px solid rgba(124,106,255,0.2)",
                borderRadius: "20px", padding: "24px",
                boxShadow: "0 0 40px rgba(124,106,255,0.08)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <span style={{ fontSize: "13px", color: "#7c6aff", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Overall Progress
                  </span>
                  <span style={{ fontSize: "28px", fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Mono', monospace" }}>
                    {data.overall_progress}%
                  </span>
                </div>
                <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "999px", overflow: "hidden", marginBottom: "16px" }}>
                  <div style={{
                    height: "100%", borderRadius: "999px",
                    width: `${data.overall_progress}%`,
                    background: data.overall_progress === 100
                      ? "linear-gradient(90deg, #22c55e, #4ade80)"
                      : "linear-gradient(90deg, #7c6aff, #a78bff)",
                    boxShadow: "0 0 12px rgba(124,106,255,0.5)",
                    transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)",
                  }} />
                </div>
                <div style={{ display: "flex", gap: "20px" }}>
                  <div className="stat-card" style={{ flex: 1, textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#22c55e" }}>{doneCount}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>Complete</p>
                  </div>
                  <div className="stat-card" style={{ flex: 1, textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#f59e0b" }}>{inProgressCount}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>In Progress</p>
                  </div>
                  <div className="stat-card" style={{ flex: 1, textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#f1f5f9" }}>{data.modules.length}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total</p>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Summary Button — prominent, centered */}
            <div className="fade-up" style={{ animationDelay: "100ms", marginBottom: "36px", display: "flex", justifyContent: "center" }}>
              <button
                className="summary-btn"
                onClick={() => setShowSummary(true)}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "12px 24px", borderRadius: "14px",
                  background: "linear-gradient(135deg, rgba(124,106,255,0.15) 0%, rgba(124,106,255,0.08) 100%)",
                  border: "1px solid rgba(124,106,255,0.35)",
                  color: "#a78bff", fontSize: "14px", fontWeight: 600,
                  cursor: "pointer", transition: "all 0.25s",
                  boxShadow: "0 0 24px rgba(124,106,255,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1.5l1.6 3.9L13.5 7l-3.9 1.6L8 12.5l-1.6-3.9L2.5 7l3.9-1.6L8 1.5z"
                    stroke="#a78bff" strokeWidth="1.2" strokeLinejoin="round" fill="rgba(124,106,255,0.2)" />
                </svg>
                ✨ Get AI Project Summary
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.6 }}>
                  <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Modules section */}
            <div className="fade-up" style={{ animationDelay: "160ms" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <h2 style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Modules — {data.modules.length} total
                </h2>
                <span style={{ fontSize: "12px", color: "#334155" }}>Click any card to see tasks</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {data.modules.map((mod, i) => (
                  <ModuleCard key={mod.id} mod={mod} index={i} />
                ))}
              </div>

              {data.modules.length === 0 && (
                <div style={{
                  textAlign: "center", padding: "60px 20px",
                  background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "20px",
                }}>
                  <p style={{ margin: 0, color: "#334155", fontSize: "14px" }}>No modules added yet.</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {showSummary && projectId && (
        <SummaryModal projectId={projectId} onClose={() => setShowSummary(false)} />
      )}
    </>
  );
}
