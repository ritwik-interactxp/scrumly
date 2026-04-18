import { useState, useRef, useEffect, useCallback } from "react";
import type { ScaffoldPreview } from "../lib/types";
import { aiApi, chatApi } from "../lib/api";
import type { ChatSession } from "../lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LocalMessage {
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

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#7c6aff] animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }} />
      ))}
    </div>
  );
}

function ModulePreviewCard({ mod, index }: { mod: ScaffoldPreview["modules"][0]; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const STATUS_COLOR: Record<string, string> = {
    not_started: "#5a5a66", in_progress: "#f59e0b", review: "#3b82f6", done: "#22c55e",
  };
  return (
    <div className="border border-white/8 rounded-xl overflow-hidden">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#0d0d10] hover:bg-[#141418] transition-colors text-left">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLOR[mod.status] || "#5a5a66" }} />
          <span className="text-sm font-medium text-white truncate">{mod.title}</span>
          <span className="text-xs text-[#5a5a66] flex-shrink-0">{mod.checklist?.length ?? 0} tasks</span>
        </div>
        <span className="text-[#5a5a66] text-sm ml-2">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 bg-[#0a0a0d] space-y-1.5">
          {mod.description && <p className="text-xs text-[#5a5a66] mb-2 leading-relaxed">{mod.description}</p>}
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
  projectId?: string;   // If set → persistent mode (per-project chat history in DB)
  onCommit: (projectId: string) => void;
  onProjectEdited?: () => void;  // called after AI makes changes to an existing project
  onClose: () => void;
}

const WELCOME_MSG = "Hey! I'm here to help you set up your project in Scrumly. Tell me what you're working on — what's the project about and what's the goal?";
const WELCOME_MSG_EXISTING = "Hey! I can see your current project. Tell me what you'd like to change — add modules, update tasks, change statuses, anything. Just describe it naturally and I'll make the edits for you.";

export function AiProjectSetup({ projectId, onCommit, onProjectEdited, onClose }: AiProjectSetupProps) {
  const isPersistent = !!projectId;

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [showSessions, setShowSessions] = useState(isPersistent);

  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<ScaffoldPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [committing, setCommitting] = useState(false);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadSessions = useCallback(async () => {
    if (!isPersistent || !projectId) return;
    setSessionsLoading(true);
    try { setSessions(await chatApi.listSessions(projectId)); }
    finally { setSessionsLoading(false); }
  }, [isPersistent, projectId]);

  useEffect(() => { if (isPersistent) loadSessions(); }, [isPersistent, loadSessions]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  useEffect(() => {
    if (!isPersistent && messages.length === 0)
      setMessages([{ role: "assistant", content: WELCOME_MSG }]);
  }, []); // eslint-disable-line

  async function openSession(session: ChatSession) {
    setActiveSession(session);
    setShowSessions(false);
    setMessages([]);
    setPreview(null); setShowPreview(false); setError("");
    setMessagesLoading(true);
    try {
      const msgs = await chatApi.getMessages(projectId!, session.id);
      setMessages(msgs.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
      const lastAI = [...msgs].reverse().find((m) => m.role === "assistant");
      if (lastAI) {
        const { preview: p } = parseReply(lastAI.content);
        if (p) { setPreview(p); setShowPreview(true); }
      }
    } finally {
      setMessagesLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function newSession() {
    if (!isPersistent || !projectId) {
      setActiveSession(null);
      setMessages([{ role: "assistant", content: WELCOME_MSG }]);
      setPreview(null); setShowPreview(false); setError("");
      setShowSessions(false);
      return;
    }
    const session = await chatApi.createSession(projectId, "New chat");
    setSessions((prev) => [session, ...prev]);
    setActiveSession(session);
    setMessages([{ role: "assistant", content: WELCOME_MSG_EXISTING }]);
    setPreview(null); setShowPreview(false); setError("");
    setShowSessions(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function deleteSession(session: ChatSession, e: React.MouseEvent) {
    e.stopPropagation();
    if (!projectId) return;
    await chatApi.deleteSession(projectId, session.id);
    setSessions((prev) => prev.filter((s) => s.id !== session.id));
    if (activeSession?.id === session.id) { setActiveSession(null); setMessages([]); setShowSessions(true); }
  }

  async function saveRename(session: ChatSession) {
    if (!projectId || !renameText.trim()) { setRenamingId(null); return; }
    const updated = await chatApi.renameSession(projectId, session.id, renameText.trim());
    setSessions((prev) => prev.map((s) => s.id === session.id ? { ...s, title: updated.title } : s));
    if (activeSession?.id === session.id) setActiveSession((p) => p ? { ...p, title: updated.title } : p);
    setRenamingId(null);
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput(""); setError(""); setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    try {
      let reply: string;
      if (isPersistent && activeSession) {
        const res = await chatApi.send(projectId!, activeSession.id, text);
        reply = res.reply;
        if (res.session_title) {
          setSessions((prev) => prev.map((s) => s.id === activeSession.id ? { ...s, title: res.session_title, updated_at: new Date().toISOString() } : s));
          setActiveSession((p) => p ? { ...p, title: res.session_title } : p);
        }
        // If Claude made project changes, refresh the parent view
        if (res.actions_taken && res.actions_taken.length > 0 && onProjectEdited) {
          onProjectEdited();
        }
      } else {
        const fullHistory = [...messages, { role: "user" as const, content: text }];
        const res = await aiApi.chat(fullHistory);
        reply = res.reply;
      }
      const { displayText, preview: p } = parseReply(reply);
      setMessages((prev) => [...prev, { role: "assistant", content: displayText || reply }]);
      if (p) { setPreview(p); setShowPreview(true); }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Something went wrong. Make sure your Anthropic API key is saved in Settings.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function handleCommit() {
    if (!preview) return;
    setCommitting(true);
    try { const res = await aiApi.scaffoldCommit(preview); onCommit(res.project_id); }
    catch (e: any) { setError(e?.response?.data?.detail || "Failed to create project."); }
    finally { setCommitting(false); }
  }


  return (
    <div className="fixed inset-0 bg-[#0a0a0d]/95 backdrop-blur-sm z-50 flex" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>

      {/* Sessions sidebar — only in persistent mode */}
      {isPersistent && (
        <div className="w-60 border-r border-white/5 flex flex-col bg-[#08080b] flex-shrink-0">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <p className="text-xs font-semibold text-[#5a5a66] uppercase tracking-wider">History</p>
            <button onClick={newSession} className="text-[#7c6aff] hover:text-white text-lg leading-none transition-colors" title="New chat">+</button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {sessionsLoading ? <p className="text-xs text-[#5a5a66] text-center py-8">Loading...</p>
            : sessions.length === 0 ? (
              <div className="text-center py-10 px-4">
                <p className="text-xs text-[#5a5a66] mb-3">No chats yet</p>
                <button onClick={newSession} className="text-xs text-[#7c6aff] hover:underline">Start a conversation →</button>
              </div>
            ) : sessions.map((s) => (
              <div key={s.id} onClick={() => openSession(s)}
                className={`group relative px-4 py-3 cursor-pointer border-l-2 transition-all hover:bg-white/3 ${activeSession?.id === s.id ? "border-[#7c6aff] bg-[#7c6aff]/5" : "border-transparent"}`}>
                {renamingId === s.id ? (
                  <input type="text" value={renameText} autoFocus
                    onChange={(e) => setRenameText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveRename(s); if (e.key === "Escape") setRenamingId(null); e.stopPropagation(); }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-[#111114] border border-[#7c6aff]/40 rounded px-2 py-0.5 text-xs text-white focus:outline-none" />
                ) : (
                  <>
                    <p className="text-xs font-medium text-white truncate pr-10">{s.title}</p>
                    <p className="text-[10px] text-[#3a3a44] mt-0.5">{s.message_count} msgs · {timeAgo(s.updated_at)}</p>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); setRenamingId(s.id); setRenameText(s.title); }}
                        className="w-5 h-5 flex items-center justify-center text-[#5a5a66] hover:text-white text-xs" title="Rename">✏</button>
                      <button onClick={(e) => deleteSession(s, e)}
                        className="w-5 h-5 flex items-center justify-center text-[#5a5a66] hover:text-red-400" title="Delete">×</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-white/5">
            <button onClick={newSession} className="w-full border border-white/8 text-[#5a5a66] hover:text-white hover:border-[#7c6aff]/40 text-xs py-2 rounded-lg transition-colors">
              + New Chat
            </button>
          </div>
        </div>
      )}

      {/* Chat panel */}
      <div className={`flex flex-col transition-all duration-300 ${showPreview ? "w-1/2" : "flex-1"} bg-[#0d0d10]`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7c6aff] to-[#a78bfa] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2C8 2 3 5 3 9.5C3 12 5 14 8 14C11 14 13 12 13 9.5C13 5 8 2 8 2Z" fill="white" fillOpacity="0.9" />
                <circle cx="6.5" cy="9" r="1" fill="#7c6aff" /><circle cx="9.5" cy="9" r="1" fill="#7c6aff" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{activeSession?.title || "Chat with AI"}</p>
              <p className="text-xs text-[#5a5a66]">{isPersistent ? "History saved · pick up anytime" : "Describe your project, I'll build the structure"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {preview && (
              <button onClick={() => setShowPreview((v) => !v)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${showPreview ? "border-[#7c6aff]/40 text-[#7c6aff] bg-[#7c6aff]/10" : "border-white/10 text-[#8a8a99] hover:text-white"}`}>
                {showPreview ? "Hide preview" : "View project preview ✦"}
              </button>
            )}
            <button onClick={() => { setShowKeyInput(true); setMessages([]); }}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/8 text-[#8a8a99] hover:text-white transition-colors" title="Change API key">🔑</button>
            <button onClick={onClose} className="text-[#5a5a66] hover:text-white text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors">×</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messagesLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-[#7c6aff] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 && isPersistent ? (
            <div className="text-center py-16">
              <p className="text-[#5a5a66] text-sm mb-3">Select a chat from the left or start a new one</p>
              <button onClick={newSession} className="text-sm text-[#7c6aff] hover:underline">+ New Chat</button>
            </div>
          ) : messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-[#7c6aff]/20 border border-[#7c6aff]/30 flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
                  <span className="text-[10px] text-[#7c6aff]">✦</span>
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === "user" ? "bg-[#7c6aff] text-white rounded-tr-sm" : "bg-[#111114] border border-white/6 text-[#d4d4d8] rounded-tl-sm"}`}>
                {msg.content.split("\n").map((line, j, arr) => <span key={j}>{line}{j < arr.length - 1 && <br />}</span>)}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="w-6 h-6 rounded-full bg-[#7c6aff]/20 border border-[#7c6aff]/30 flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
                <span className="text-[10px] text-[#7c6aff]">✦</span>
              </div>
              <div className="bg-[#111114] border border-white/6 rounded-2xl rounded-tl-sm"><TypingDots /></div>
            </div>
          )}
          {error && (
            <div className="flex justify-center">
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {preview && !showPreview && (
          <div className="px-5 pb-2">
            <button onClick={() => setShowPreview(true)} className="w-full flex items-center justify-between bg-[#7c6aff]/10 hover:bg-[#7c6aff]/15 border border-[#7c6aff]/30 rounded-xl px-4 py-2.5 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-[#7c6aff] text-sm">✦</span>
                <span className="text-sm font-medium text-[#7c6aff]">{preview.project?.name}</span>
                <span className="text-xs text-[#5a5a66]">{preview.modules?.length} modules ready</span>
              </div>
              <span className="text-xs text-[#7c6aff]">View preview →</span>
            </button>
          </div>
        )}

        <div className="px-5 pb-5 pt-2 flex-shrink-0">
          <div className="flex gap-2 items-end">
            <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={isPersistent && !activeSession ? "Select or start a chat first..." : "Describe your project or answer the question above..."}
              disabled={isPersistent && !activeSession}
              rows={2}
              className="flex-1 bg-[#111114] border border-white/8 rounded-xl px-4 py-3 text-white text-sm placeholder:text-[#3a3a44] focus:outline-none focus:border-[#7c6aff]/50 transition-colors resize-none leading-relaxed disabled:opacity-40"
              style={{ maxHeight: "120px" }} />
            <button onClick={send} disabled={sending || !input.trim() || (isPersistent && !activeSession)}
              className="h-10 w-10 flex-shrink-0 bg-[#7c6aff] hover:bg-[#6b59ee] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13 8L3 3l2.5 5L3 13l10-5z" fill="white" /></svg>
            </button>
          </div>
          <p className="text-[10px] text-[#3a3a44] mt-2 text-center">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>

      {/* Preview panel */}
      {showPreview && preview && (
        <div className="flex-1 flex flex-col bg-[#0a0a0d] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
            <div>
              <h2 className="text-base font-semibold text-white">{preview.project?.name}</h2>
              {preview.project?.description && <p className="text-xs text-[#5a5a66] mt-0.5 line-clamp-1">{preview.project.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#5a5a66] bg-[#111114] border border-white/6 rounded-lg px-2.5 py-1">
                {preview.modules?.length} modules · {preview.modules?.reduce((a, m) => a + (m.checklist?.length ?? 0), 0)} tasks
              </span>
              <button onClick={handleCommit} disabled={committing}
                className="flex items-center gap-2 bg-[#7c6aff] hover:bg-[#6b59ee] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                {committing ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</> : <>Create project →</>}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
            {preview.modules?.map((mod, i) => <ModulePreviewCard key={i} mod={mod} index={i} />)}
          </div>
          <div className="px-6 py-4 border-t border-white/5 flex-shrink-0">
            <p className="text-xs text-[#5a5a66] text-center">
              Not quite right?{" "}
              <button onClick={() => { setPreview(null); setShowPreview(false); setInput("Actually, let me adjust — "); setTimeout(() => inputRef.current?.focus(), 50); }}
                className="text-[#7c6aff] hover:underline">Keep chatting to refine it</button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
