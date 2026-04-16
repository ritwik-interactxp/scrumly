import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import type { ScaffoldPreview } from "../lib/types";
import { aiApi } from "../lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ParsedReply {
  displayText: string;
  preview: ScaffoldPreview | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseReply(raw: string): ParsedReply {
  const match = raw.match(/<project_json>([\s\S]*?)<\/project_json>/);
  if (!match) return { displayText: raw.trim(), preview: null };

  const displayText = raw.replace(/<project_json>[\s\S]*?<\/project_json>/, "").trim();
  try {
    const preview = JSON.parse(match[1].trim()) as ScaffoldPreview;
    return { displayText, preview };
  } catch {
    return { displayText, preview: null };
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[#7c6aff] animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
        />
      ))}
    </div>
  );
}

function ModulePreviewCard({ mod, index }: { mod: ScaffoldPreview["modules"][0]; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const STATUS_COLOR: Record<string, string> = {
    not_started: "#5a5a66",
    in_progress: "#f59e0b",
    review: "#3b82f6",
    done: "#22c55e",
  };

  return (
    <div className="border border-white/8 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#0d0d10] hover:bg-[#141418] transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: STATUS_COLOR[mod.status] || "#5a5a66" }}
          />
          <span className="text-sm font-medium text-white truncate">{mod.title}</span>
          <span className="text-xs text-[#5a5a66] flex-shrink-0">
            {mod.checklist?.length ?? 0} tasks
          </span>
        </div>
        <span className="text-[#5a5a66] text-sm ml-2">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 bg-[#0a0a0d] space-y-1.5">
          {mod.description && (
            <p className="text-xs text-[#5a5a66] mb-2 leading-relaxed">{mod.description}</p>
          )}
          {mod.checklist?.map((item, j) => (
            <div key={j} className="flex items-center gap-2.5 py-0.5">
              <span className="w-3.5 h-3.5 rounded border border-white/10 flex-shrink-0" />
              <span className="text-xs text-[#8a8a99]">{item.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface AiProjectSetupProps {
  apiKey: string;
  onCommit: (projectId: string) => void;
  onClose: () => void;
}

export function AiProjectSetup({ apiKey, onCommit, onClose }: AiProjectSetupProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<ScaffoldPreview | null>(null);
  const [committing, setCommitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Kick off with a welcome message
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content:
          "Hey! I'm here to help you set up your project in Scrumly. Tell me what you're working on — what's the project about and what's the goal?",
      },
    ]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const data = await aiApi.chat(updatedMessages, apiKey);
      const { displayText, preview: parsedPreview } = parseReply(data.reply);

      const assistantMsg: ChatMessage = { role: "assistant", content: displayText };
      setMessages((prev) => [...prev, assistantMsg]);

      if (parsedPreview) {
        setPreview(parsedPreview);
        setShowPreview(true);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Something went wrong. Check your API key.");
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function handleCommit() {
    if (!preview) return;
    setCommitting(true);
    try {
      const res = await aiApi.scaffoldCommit(preview);
      onCommit(res.project_id);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to create project.");
    } finally {
      setCommitting(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div
      className="fixed inset-0 bg-[#0a0a0d]/95 backdrop-blur-sm z-50 flex"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Chat panel */}
      <div
        className={`flex flex-col transition-all duration-300 ${
          showPreview ? "w-1/2" : "w-full max-w-2xl mx-auto"
        } bg-[#0d0d10] border-r border-white/5`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7c6aff] to-[#a78bfa] flex items-center justify-center shadow-lg shadow-violet-500/20">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 2C8 2 3 5 3 9.5C3 12 5 14 8 14C11 14 13 12 13 9.5C13 5 8 2 8 2Z"
                  fill="white"
                  fillOpacity="0.9"
                />
                <circle cx="6.5" cy="9" r="1" fill="#7c6aff" />
                <circle cx="9.5" cy="9" r="1" fill="#7c6aff" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Chat with AI</p>
              <p className="text-xs text-[#5a5a66]">Describe your project, I'll build the structure</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {preview && (
              <button
                onClick={() => setShowPreview((v) => !v)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  showPreview
                    ? "border-[#7c6aff]/40 text-[#7c6aff] bg-[#7c6aff]/10"
                    : "border-white/10 text-[#8a8a99] hover:text-white hover:border-white/20"
                }`}
              >
                {showPreview ? "Hide preview" : "View project preview ✦"}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-[#5a5a66] hover:text-white text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-[#7c6aff]/20 border border-[#7c6aff]/30 flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
                  <span className="text-[10px] text-[#7c6aff]">✦</span>
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#7c6aff] text-white rounded-tr-sm"
                    : "bg-[#111114] border border-white/6 text-[#d4d4d8] rounded-tl-sm"
                }`}
              >
                {msg.content.split("\n").map((line, j) => (
                  <span key={j}>
                    {line}
                    {j < msg.content.split("\n").length - 1 && <br />}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="w-6 h-6 rounded-full bg-[#7c6aff]/20 border border-[#7c6aff]/30 flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
                <span className="text-[10px] text-[#7c6aff]">✦</span>
              </div>
              <div className="bg-[#111114] border border-white/6 rounded-2xl rounded-tl-sm">
                <TypingDots />
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center">
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Preview pill */}
        {preview && !showPreview && (
          <div className="px-5 pb-2">
            <button
              onClick={() => setShowPreview(true)}
              className="w-full flex items-center justify-between bg-[#7c6aff]/10 hover:bg-[#7c6aff]/15 border border-[#7c6aff]/30 rounded-xl px-4 py-2.5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[#7c6aff] text-sm">✦</span>
                <span className="text-sm font-medium text-[#7c6aff]">{preview.project.name}</span>
                <span className="text-xs text-[#5a5a66]">
                  {preview.modules.length} modules ready
                </span>
              </div>
              <span className="text-xs text-[#7c6aff]">View preview →</span>
            </button>
          </div>
        )}

        {/* Input */}
        <div className="px-5 pb-5 pt-2 flex-shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your project or answer the question above..."
              rows={2}
              className="flex-1 bg-[#111114] border border-white/8 rounded-xl px-4 py-3 text-white text-sm placeholder:text-[#3a3a44] focus:outline-none focus:border-[#7c6aff]/50 transition-colors resize-none leading-relaxed"
              style={{ maxHeight: "120px" }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="h-10 w-10 flex-shrink-0 bg-[#7c6aff] hover:bg-[#6b59ee] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-violet-500/20"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13 8L3 3l2.5 5L3 13l10-5z" fill="white" />
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-[#3a3a44] mt-2 text-center">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Preview panel */}
      {showPreview && preview && (
        <div className="flex-1 flex flex-col bg-[#0a0a0d] overflow-hidden">
          {/* Preview header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
            <div>
              <h2 className="text-base font-semibold text-white">{preview.project.name}</h2>
              {preview.project.description && (
                <p className="text-xs text-[#5a5a66] mt-0.5 line-clamp-1">
                  {preview.project.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#5a5a66] bg-[#111114] border border-white/6 rounded-lg px-2.5 py-1">
                {preview.modules.length} modules · {preview.modules.reduce((a, m) => a + (m.checklist?.length ?? 0), 0)} tasks
              </span>
              <button
                onClick={handleCommit}
                disabled={committing}
                className="flex items-center gap-2 bg-[#7c6aff] hover:bg-[#6b59ee] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-lg shadow-violet-500/20"
              >
                {committing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>Create project →</>
                )}
              </button>
            </div>
          </div>

          {/* Module list */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
            {preview.modules.map((mod, i) => (
              <ModulePreviewCard key={i} mod={mod} index={i} />
            ))}
          </div>

          {/* Regenerate option */}
          <div className="px-6 py-4 border-t border-white/5 flex-shrink-0">
            <p className="text-xs text-[#5a5a66] text-center">
              Not quite right?{" "}
              <button
                onClick={() => {
                  setPreview(null);
                  setShowPreview(false);
                  setInput("Actually, let me adjust — ");
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className="text-[#7c6aff] hover:underline"
              >
                Keep chatting to refine it
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
