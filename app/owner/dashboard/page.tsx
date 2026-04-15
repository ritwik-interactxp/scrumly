"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { projectsApi } from "@/lib/api";
import type { Project } from "@/lib/types";

function statusColor(status: Project["status"]) {
  return status === "active" ? "#22c55e" : "#5a5a66";
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1 bg-[#1e1e24] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${value}%`,
          background: value === 100 ? "#22c55e" : "#7c6aff",
        }}
      />
    </div>
  );
}

export default function OwnerDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    projectsApi.list().then(setProjects).finally(() => setLoading(false));
  }, []);

  async function createProject() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const p = await projectsApi.create(newName.trim(), newDesc.trim() || undefined);
      setProjects((prev) => [p, ...prev]);
      setShowNew(false);
      setNewName("");
      setNewDesc("");
    } finally {
      setCreating(false);
    }
  }

  const activeProjects = projects.filter((p) => p.status === "active");
  const totalModules = projects.reduce((acc, p) => acc + p.module_count, 0);
  const totalMembers = projects.reduce((acc, p) => acc + p.member_count, 0);
  const avgProgress =
    projects.length > 0
      ? Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / projects.length)
      : 0;

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white">
      {/* Top nav */}
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
          <span className="font-semibold tracking-tight">ScrumFlow</span>
          <span className="text-[#3a3a44] text-sm">/</span>
          <span className="text-[#8a8a99] text-sm">Dashboard</span>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-[#7c6aff] hover:bg-[#6b59ee] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <span>+</span> New Project
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Active Projects", value: activeProjects.length },
            { label: "Total Modules", value: totalModules },
            { label: "Colleagues", value: totalMembers },
            { label: "Avg Progress", value: `${avgProgress}%` },
          ].map((s) => (
            <div key={s.label} className="bg-[#111114] border border-[#1e1e24] rounded-xl p-4">
              <p className="text-[#5a5a66] text-xs mb-1">{s.label}</p>
              <p className="text-2xl font-mono font-semibold text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Projects */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-[#8a8a99] uppercase tracking-wider">
            Projects
          </h2>
          <span className="text-[#5a5a66] text-xs">{projects.length} total</span>
        </div>

        {loading ? (
          <div className="text-center py-20 text-[#5a5a66]">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#5a5a66] text-sm mb-4">No projects yet</p>
            <button
              onClick={() => setShowNew(true)}
              className="bg-[#7c6aff] hover:bg-[#6b59ee] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/owner/dashboard/${project.id}`}
                className="group bg-[#111114] border border-[#1e1e24] hover:border-[#2e2e38] rounded-xl p-5 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: statusColor(project.status) }}
                    />
                    <span className="font-medium text-white">{project.name}</span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${
                      project.status === "active"
                        ? "border-green-500/20 bg-green-500/10 text-green-400"
                        : "border-[#2e2e38] bg-[#1a1a20] text-[#5a5a66]"
                    }`}
                  >
                    {project.status}
                  </span>
                </div>

                {project.description && (
                  <p className="text-sm text-[#5a5a66] mb-3 line-clamp-1">{project.description}</p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs text-[#5a5a66]">
                    <span>Progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <ProgressBar value={project.progress} />
                </div>

                <div className="flex items-center gap-4 text-xs text-[#5a5a66]">
                  <span>{project.module_count} modules</span>
                  <span>{project.member_count} members</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* New project modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111114] border border-[#1e1e24] rounded-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-white mb-4">New Project</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Project name"
                autoFocus
                className="w-full bg-[#0d0d0f] border border-[#1e1e24] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-[#3a3a44] focus:outline-none focus:border-[#7c6aff] transition-colors"
              />
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={3}
                className="w-full bg-[#0d0d0f] border border-[#1e1e24] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-[#3a3a44] focus:outline-none focus:border-[#7c6aff] transition-colors resize-none"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowNew(false)}
                className="flex-1 border border-[#1e1e24] text-[#8a8a99] hover:text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createProject}
                disabled={creating || !newName.trim()}
                className="flex-1 bg-[#7c6aff] hover:bg-[#6b59ee] disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
