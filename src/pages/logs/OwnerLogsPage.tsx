import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logsApi } from "../../lib/api";
import { projectsApi } from "../../lib/api";
import type { ActivityLog, Project } from "../../lib/types";

const ACTION_ICONS: Record<string, string> = {
  module_created: "📦", module_updated: "✏️", module_deleted: "🗑️", module_status_changed: "🔄",
  task_created: "➕", task_completed: "✅", task_uncompleted: "↩️", task_deleted: "🗑️", task_updated: "✏️",
  project_created: "🚀", project_updated: "✏️",
  member_invited: "📨", member_joined: "👋", member_removed: "👤",
  ai_scaffold: "🤖", ai_chat_edit: "🤖",
};

const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
  manual: { label: "Manual", color: "bg-blue-500/20 text-blue-300" },
  ai_claude: { label: "Claude", color: "bg-purple-500/20 text-purple-300" },
  ai_gpt: { label: "GPT", color: "bg-green-500/20 text-green-300" },
  system: { label: "System", color: "bg-gray-500/20 text-gray-400" },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function OwnerLogsPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsApi.list().then(setProjects).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    logsApi.getOwnerLogs(selectedProject || undefined)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [selectedProject]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate("/dashboard")}
            className="text-gray-400 hover:text-white transition-colors text-sm">← Dashboard</button>
          <div>
            <h1 className="text-2xl font-bold text-white">Activity Logs</h1>
            <p className="text-gray-400 text-sm mt-1">Everything that's happened across your projects</p>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Logs */}
        {loading ? (
          <div className="text-center text-gray-400 py-20">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="text-center text-gray-400 py-20">No activity yet. Start working on your projects!</div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const icon = ACTION_ICONS[log.action] || "📝";
              const src = SOURCE_BADGE[log.source] || SOURCE_BADGE.manual;
              return (
                <div key={log.id}
                  className="bg-white/5 border border-white/10 rounded-xl px-5 py-4 flex items-start gap-4 hover:bg-white/8 transition-colors">
                  <span className="text-xl mt-0.5">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm leading-relaxed">{log.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-gray-400 text-xs font-medium">{log.user_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${src.color}`}>{src.label}</span>
                      <span className="text-gray-500 text-xs">{timeAgo(log.created_at)}</span>
                    </div>
                  </div>
                  <span className="text-gray-600 text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
