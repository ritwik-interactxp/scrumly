import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { projectsApi } from "../../lib/api";
import { getUser, clearAuth } from "../../lib/auth";
import type { Project } from "../../lib/types";

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 bg-[#1e1e24] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: value === 100 ? "#22c55e" : "#7c6aff" }} />
    </div>
  );
}

export default function WorkspaceHome() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();
  const navigate = useNavigate();

  useEffect(() => { projectsApi.list().then(setProjects).finally(() => setLoading(false)); }, []);
  function logout() { clearAuth(); navigate("/auth/login"); }

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white">
      <header className="border-b border-[#1e1e24] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#7c6aff] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1" fill="white" />
              <rect x="9" y="2" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" />
              <rect x="2" y="9" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" />
              <rect x="9" y="9" width="5" height="5" rx="1" fill="white" />
            </svg>
          </div>
          <span className="font-semibold tracking-tight">Scrumly</span>
          <span className="text-[#3a3a44] text-sm">/</span>
          <span className="text-[#8a8a99] text-sm">My Work</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#7c6aff]/20 border border-[#7c6aff]/30 flex items-center justify-center text-xs font-semibold text-[#7c6aff]">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <span className="text-sm text-[#8a8a99]">{user?.name}</span>
          </div>
          <button onClick={logout} className="text-xs text-[#5a5a66] hover:text-white transition-colors px-2 py-1">Sign out</button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Your Projects</h1>
          <p className="text-sm text-[#5a5a66] mt-1">{projects.length} project{projects.length !== 1 ? "s" : ""} assigned to you</p>
        </div>
        {loading ? (
          <div className="text-center py-20 text-[#5a5a66]">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#5a5a66]">No projects assigned yet.</p>
            <p className="text-xs text-[#3a3a44] mt-2">You'll appear here once the owner adds you to a project.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => (
              <Link key={project.id} to={`/workspace/${project.id}`}
                className="group bg-[#111114] border border-[#1e1e24] hover:border-[#2e2e38] rounded-xl p-5 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <h2 className="font-medium text-white group-hover:text-[#c5bfff] transition-colors">{project.name}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${project.status === "active" ? "border-green-500/20 bg-green-500/10 text-green-400" : "border-[#2e2e38] text-[#5a5a66]"}`}>
                    {project.status}
                  </span>
                </div>
                {project.description && <p className="text-sm text-[#5a5a66] mb-3 line-clamp-2">{project.description}</p>}
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-xs text-[#5a5a66]"><span>Progress</span><span>{project.progress}%</span></div>
                  <ProgressBar value={project.progress} />
                </div>
                <div className="flex items-center gap-3 text-xs text-[#5a5a66]"><span>{project.module_count} modules</span></div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
