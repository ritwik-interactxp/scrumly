"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { portalApi } from "@/lib/api";
import type { PortalProject, PortalModule } from "@/lib/types";

const STATUS_CONFIG = {
  not_started: { label: "Not Started", color: "#5a5a66", bg: "#1a1a20" },
  in_progress: { label: "In Progress", color: "#f59e0b", bg: "#f59e0b15" },
  review: { label: "Review", color: "#3b82f6", bg: "#3b82f615" },
  done: { label: "Complete", color: "#22c55e", bg: "#22c55e15" },
};

function CircleProgress({ value, size = 64 }: { value: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e1e24" strokeWidth="4" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={value === 100 ? "#22c55e" : "#7c6aff"}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
    </svg>
  );
}

function ModuleCard({ mod }: { mod: PortalModule }) {
  const sc = STATUS_CONFIG[mod.status];

  return (
    <div className="bg-[#111114] border border-[#1e1e24] rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-white mb-1">{mod.title}</h3>
          {mod.description && (
            <p className="text-sm text-[#5a5a66] line-clamp-2">{mod.description}</p>
          )}
        </div>
        <span
          className="text-xs px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0"
          style={{ color: sc.color, background: sc.bg }}
        >
          {sc.label}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <CircleProgress value={mod.progress} size={56} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-mono font-semibold" style={{ color: mod.progress === 100 ? "#22c55e" : "#7c6aff" }}>
              {Math.round(mod.progress)}%
            </span>
          </div>
        </div>

        <div className="flex-1">
          <div className="h-1.5 bg-[#1e1e24] rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${mod.progress}%`,
                background: mod.progress === 100 ? "#22c55e" : "#7c6aff",
              }}
            />
          </div>
          <p className="text-xs text-[#5a5a66]">
            {mod.checklist_done} of {mod.checklist_total} tasks completed
          </p>
        </div>
      </div>

      {mod.doc_link && (
        <div className="mt-4 pt-4 border-t border-[#1e1e24]">
          <a
            href={mod.doc_link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-[#7c6aff] hover:text-white transition-colors"
          >
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

export default function PortalPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [data, setData] = useState<PortalProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    portalApi
      .get(projectId)
      .then(setData)
      .catch(() => setError("Unable to load project. Please check your access."))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center">
        <p className="text-[#5a5a66]">Loading...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 mb-2">{error}</p>
          <a href="/auth/login" className="text-sm text-[#7c6aff] hover:underline">
            Sign in
          </a>
        </div>
      </div>
    );
  }

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
        {/* Project hero */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">{data.name}</h1>
          {data.description && (
            <p className="text-[#8a8a99] text-lg">{data.description}</p>
          )}

          {/* Overall progress */}
          <div className="mt-6 bg-[#111114] border border-[#1e1e24] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[#8a8a99]">Overall Progress</span>
              <span className="font-mono font-semibold text-lg">{data.overall_progress}%</span>
            </div>
            <div className="h-2 bg-[#1e1e24] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${data.overall_progress}%`,
                  background: data.overall_progress === 100 ? "#22c55e" : "#7c6aff",
                }}
              />
            </div>
            <div className="flex gap-6 mt-4 text-sm text-[#5a5a66]">
              <span>{data.modules.length} modules total</span>
              <span>{doneModules} completed</span>
            </div>
          </div>
        </div>

        {/* Modules grid */}
        <h2 className="text-sm font-medium text-[#5a5a66] uppercase tracking-wider mb-4">
          Modules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.modules.map((mod) => (
            <ModuleCard key={mod.id} mod={mod} />
          ))}
        </div>
      </main>
    </div>
  );
}

export async function generateStaticParams() {
  return [];
}
