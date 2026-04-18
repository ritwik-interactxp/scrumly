import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { dailySummaryApi, projectsApi, logsApi, contributionsApi } from "../../lib/api";
import type { DailySummary, Project, ActivityLog, Contribution } from "../../lib/types";
import { getUser } from "../../lib/auth";

const ACTION_ICONS: Record<string, string> = {
  module_created: "📦", module_updated: "✏️", module_deleted: "🗑️", module_status_changed: "🔄",
  task_created: "➕", task_completed: "✅", task_uncompleted: "↩️", task_deleted: "🗑️", task_updated: "✏️",
  project_created: "🚀", ai_scaffold: "🤖", ai_chat_edit: "🤖",
  member_invited: "📨", member_joined: "👋",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function DailySummaryPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const user = getUser();
  const isOwner = user?.system_role === "owner";

  const [project, setProject] = useState<Project | null>(null);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [generating, setGenerating] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"summary" | "contributions" | "logs">("summary");

  useEffect(() => {
    if (!projectId) return;
    projectsApi.get(projectId).then(setProject).catch(() => {});
    dailySummaryApi.get(projectId).then(setSummary).catch(() => {});
    logsApi.getProjectLogs(projectId).then(setLogs).catch(() => {});
    contributionsApi.get(projectId).then(setContributions).catch(() => {});
  }, [projectId]);

  const handleGenerate = async () => {
    if (!projectId) return;
    setGenerating(true);
    setError("");
    try {
      const result = await dailySummaryApi.generate(projectId);
      setSummary(result);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to generate summary");
    } finally {
      setGenerating(false);
    }
  };

  const handleToggle = async () => {
    if (!projectId) return;
    setToggling(true);
    try {
      const result = await dailySummaryApi.toggle(projectId);
      setSummary(prev => prev ? { ...prev, enabled: result.enabled } : null);
    } finally {
      setToggling(false);
    }
  };

  // Today's logs only
  const todayLogs = logs.filter(l => {
    const d = new Date(l.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const maxTasks = Math.max(...contributions.map(c => c.tasks_completed), 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/projects/${projectId}`)}
              className="text-gray-400 hover:text-white transition-colors text-sm">← Project</button>
            <div>
              <h1 className="text-2xl font-bold text-white">Daily Summary</h1>
              <p className="text-gray-400 text-sm mt-1">{project?.name}</p>
            </div>
          </div>
          {isOwner && summary && (
            <div className="flex items-center gap-3">
              <span className={`text-sm ${summary.enabled ? "text-green-400" : "text-gray-500"}`}>
                {summary.enabled ? "Summaries On" : "Summaries Off"}
              </span>
              <button
                onClick={handleToggle}
                disabled={toggling}
                className={`relative w-12 h-6 rounded-full transition-colors ${summary.enabled ? "bg-green-500" : "bg-gray-600"}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${summary.enabled ? "translate-x-7" : "translate-x-1"}`} />
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["summary", "contributions", "logs"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${activeTab === tab ? "bg-purple-600 text-white" : "bg-white/5 text-gray-400 hover:text-white"}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Summary Tab */}
        {activeTab === "summary" && (
          <div className="space-y-4">
            {isOwner && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={generating || !summary?.enabled}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  {generating ? "Generating..." : "✨ Generate Today's Summary"}
                </button>
                {!summary?.enabled && <span className="text-gray-500 text-sm">Toggle on to enable</span>}
              </div>
            )}

            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{error}</div>}

            {summary?.last_summary_text ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">AI Summary</h3>
                  {summary.last_generated_at && (
                    <span className="text-gray-500 text-xs">{timeAgo(summary.last_generated_at)}</span>
                  )}
                </div>
                <p className="text-gray-300 leading-relaxed">{summary.last_summary_text}</p>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
                <div className="text-4xl mb-3">📊</div>
                <p className="text-gray-400">No summary generated yet.</p>
                {isOwner && <p className="text-gray-500 text-sm mt-1">Click Generate to create today's summary using GPT.</p>}
              </div>
            )}

            {/* Today's stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{todayLogs.filter(l => l.action === "task_completed").length}</div>
                <div className="text-gray-400 text-xs mt-1">Tasks Done Today</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{todayLogs.filter(l => l.action === "module_created").length}</div>
                <div className="text-gray-400 text-xs mt-1">Modules Added</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{new Set(todayLogs.map(l => l.user_id)).size}</div>
                <div className="text-gray-400 text-xs mt-1">Active Members</div>
              </div>
            </div>
          </div>
        )}

        {/* Contributions Tab */}
        {activeTab === "contributions" && (
          <div className="space-y-3">
            {contributions.length === 0 ? (
              <div className="text-center text-gray-400 py-16">No contributions logged yet.</div>
            ) : contributions.map((c, i) => (
              <div key={c.user_id || i} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold">
                      {c.user_name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="text-white font-medium text-sm">{c.user_name}</div>
                      {c.last_active && <div className="text-gray-500 text-xs">Last active {timeAgo(c.last_active)}</div>}
                    </div>
                  </div>
                  {i === 0 && <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">🏆 Top contributor</span>}
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center"><div className="text-lg font-bold text-green-400">{c.tasks_completed}</div><div className="text-gray-500 text-xs">Tasks Done</div></div>
                  <div className="text-center"><div className="text-lg font-bold text-blue-400">{c.tasks_created}</div><div className="text-gray-500 text-xs">Tasks Added</div></div>
                  <div className="text-center"><div className="text-lg font-bold text-purple-400">{c.modules_created}</div><div className="text-gray-500 text-xs">Modules</div></div>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.round((c.tasks_completed / maxTasks) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === "logs" && (
          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="text-center text-gray-400 py-16">No activity yet.</div>
            ) : logs.map(log => (
              <div key={log.id} className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 flex items-center gap-4">
                <span className="text-lg">{ACTION_ICONS[log.action] || "📝"}</span>
                <div className="flex-1">
                  <p className="text-white text-sm">{log.description}</p>
                  <span className="text-gray-500 text-xs">{log.user_name}</span>
                </div>
                <span className="text-gray-600 text-xs">{timeAgo(log.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
