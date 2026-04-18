import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";

interface KeyStatus {
  has_anthropic: boolean;
  has_openai: boolean;
  anthropic_masked?: string;
  openai_masked?: string;
}

function InputRow({
  label, subtitle, placeholder, value, onChange, onSave, onClear, hasCurrent, masked, saving, clearing,
}: {
  label: string; subtitle: string; placeholder: string; value: string;
  onChange: (v: string) => void; onSave: () => void; onClear: () => void;
  hasCurrent: boolean; masked?: string; saving: boolean; clearing: boolean;
}) {
  const [show, setShow] = useState(false);

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "20px 24px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#f1f5f9" }}>{label}</p>
          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#475569" }}>{subtitle}</p>
        </div>
        {hasCurrent && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{
              fontSize: "11px", fontWeight: 600, color: "#22c55e",
              background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
              padding: "3px 10px", borderRadius: "20px",
            }}>● Active</span>
            <span style={{ fontSize: "12px", color: "#475569", fontFamily: "monospace" }}>{masked}</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <input
            type={show ? "text" : "password"}
            placeholder={hasCurrent ? "Enter new key to replace…" : placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: "100%", padding: "10px 40px 10px 14px",
              background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px", color: "#f1f5f9", fontSize: "13px", fontFamily: "monospace",
              outline: "none", boxSizing: "border-box",
            }}
          />
          <button
            onClick={() => setShow(!show)}
            style={{
              position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", color: "#475569", cursor: "pointer", padding: "4px",
            }}
          >
            {show
              ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4z" stroke="currentColor" strokeWidth="1.2" /><circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M2 2l10 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
              : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4z" stroke="currentColor" strokeWidth="1.2" /><circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2" /></svg>
            }
          </button>
        </div>

        <button
          onClick={onSave}
          disabled={!value.trim() || saving}
          style={{
            padding: "10px 16px", borderRadius: "10px", border: "none",
            background: value.trim() ? "linear-gradient(135deg, #7c6aff, #5b4cdd)" : "rgba(255,255,255,0.06)",
            color: value.trim() ? "white" : "#475569",
            fontSize: "13px", fontWeight: 600, cursor: value.trim() ? "pointer" : "not-allowed",
            whiteSpace: "nowrap", transition: "all 0.2s",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving…" : "Save"}
        </button>

        {hasCurrent && (
          <button
            onClick={onClear}
            disabled={clearing}
            style={{
              padding: "10px 14px", borderRadius: "10px",
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
              color: "#f87171", fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s",
              opacity: clearing ? 0.7 : 1,
            }}
          >
            {clearing ? "…" : "Remove"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [saving, setSaving] = useState<"anthropic" | "openai" | null>(null);
  const [clearing, setClearing] = useState<"anthropic" | "openai" | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    api.get("/auth/keys").then((r) => setStatus(r.data)).catch(() => {});
  }, []);

  const saveKey = async (type: "anthropic" | "openai") => {
    setSaving(type);
    try {
      const body = type === "anthropic"
        ? { anthropic_api_key: anthropicKey }
        : { openai_api_key: openaiKey };
      await api.patch("/auth/keys", body);
      const r = await api.get("/auth/keys");
      setStatus(r.data);
      type === "anthropic" ? setAnthropicKey("") : setOpenaiKey("");
      showToast(`${type === "anthropic" ? "Anthropic" : "OpenAI"} key saved successfully.`, true);
    } catch (e: any) {
      showToast(e.response?.data?.detail || "Failed to save key.", false);
    } finally {
      setSaving(null);
    }
  };

  const clearKey = async (type: "anthropic" | "openai") => {
    setClearing(type);
    try {
      const body = type === "anthropic"
        ? { anthropic_api_key: "" }
        : { openai_api_key: "" };
      await api.patch("/auth/keys", body);
      const r = await api.get("/auth/keys");
      setStatus(r.data);
      showToast(`${type === "anthropic" ? "Anthropic" : "OpenAI"} key removed.`, true);
    } catch {
      showToast("Failed to remove key.", false);
    } finally {
      setClearing(null);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #080810; }
        input::placeholder { color: #334155; }
        input:focus { border-color: rgba(124,106,255,0.4) !important; box-shadow: 0 0 0 3px rgba(124,106,255,0.08); }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#080810", color: "#f1f5f9", fontFamily: "'DM Sans', sans-serif" }}>
        {/* Header */}
        <header style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 32px",
          display: "flex", alignItems: "center", gap: "16px",
          backdropFilter: "blur(20px)", background: "rgba(8,8,16,0.9)",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <Link to="/owner/dashboard" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", color: "#475569", fontSize: "13px" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Dashboard
          </Link>
          <span style={{ color: "#1e2530" }}>·</span>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#f1f5f9" }}>Settings</span>
        </header>

        <main style={{ maxWidth: "640px", margin: "0 auto", padding: "48px 24px 80px" }}>
          <div style={{ marginBottom: "36px" }}>
            <h1 style={{ margin: "0 0 6px", fontSize: "24px", fontWeight: 700, letterSpacing: "-0.02em" }}>Settings</h1>
            <p style={{ margin: 0, fontSize: "14px", color: "#475569" }}>Manage your API keys. Keys are encrypted and stored securely.</p>
          </div>

          {/* AI Keys section */}
          <div style={{ marginBottom: "10px" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: "12px", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              AI API Keys
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <InputRow
                label="Anthropic (Claude)"
                subtitle="Used for AI scaffold, project chat, and client portal summaries."
                placeholder="sk-ant-api03-…"
                value={anthropicKey}
                onChange={setAnthropicKey}
                onSave={() => saveKey("anthropic")}
                onClear={() => clearKey("anthropic")}
                hasCurrent={!!status?.has_anthropic}
                masked={status?.anthropic_masked}
                saving={saving === "anthropic"}
                clearing={clearing === "anthropic"}
              />
              <InputRow
                label="OpenAI (optional)"
                subtitle="Optional. If provided, may be used for secondary AI tasks."
                placeholder="sk-…"
                value={openaiKey}
                onChange={setOpenaiKey}
                onSave={() => saveKey("openai")}
                onClear={() => clearKey("openai")}
                hasCurrent={!!status?.has_openai}
                masked={status?.openai_masked}
                saving={saving === "openai"}
                clearing={clearing === "openai"}
              />
            </div>
          </div>

          <div style={{
            marginTop: "24px", padding: "14px 18px", borderRadius: "12px",
            background: "rgba(124,106,255,0.06)", border: "1px solid rgba(124,106,255,0.15)",
          }}>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b", lineHeight: 1.6 }}>
              <strong style={{ color: "#7c6aff" }}>Security:</strong> Keys are encrypted using AES before storage. They are never returned in plaintext — only a masked preview is shown. You can remove a key at any time.
            </p>
          </div>
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 100,
          padding: "12px 18px", borderRadius: "12px",
          background: toast.ok ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
          border: `1px solid ${toast.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
          color: toast.ok ? "#4ade80" : "#f87171",
          fontSize: "13px", fontWeight: 500,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          animation: "fadeSlideUp 0.3s ease",
        }}>
          {toast.msg}
        </div>
      )}
      <style>{`@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </>
  );
}
