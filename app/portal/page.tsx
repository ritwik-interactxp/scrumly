"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { projectsApi } from "@/lib/api";
import { clearAuth } from "@/lib/auth";
import type { Project } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function PortalHome() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    projectsApi.list().then((list) => {
      setProjects(list);
      // If only one project, go straight to it
      if (list.length === 1) {
        router.replace(`/portal/${list[0].id}`);
      }
    }).finally(() => setLoading(false));
  }, [router]);

  function logout() {
    clearAuth();
    document.cookie = "scrumflow_token=; path=/; max-age=0";
    router.push("/auth/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center">
        <p className="text-[#5a5a66]">Loading...</p>
      </div>
    );
  }

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
          <span className="font-semibold">ScrumFlow</span>
        </div>
        <button
          onClick={logout}
          className="text-xs text-[#5a5a66] hover:text-white transition-colors"
        >
          Sign out
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-2">Your Projects</h1>
        <p className="text-[#5a5a66] mb-8">Track progress and view documentation.</p>

        <div className="space-y-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/portal/${p.id}`}
              className="flex items-center justify-between bg-[#111114] border border-[#1e1e24] hover:border-[#7c6aff]/40 rounded-xl px-5 py-4 transition-all group"
            >
              <div>
                <p className="font-medium group-hover:text-[#c5bfff] transition-colors">{p.name}</p>
                {p.description && (
                  <p className="text-sm text-[#5a5a66] mt-0.5">{p.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-mono text-[#7c6aff]">{p.progress}%</p>
                  <p className="text-xs text-[#5a5a66]">{p.module_count} modules</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#3a3a44] group-hover:text-[#7c6aff] transition-colors">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
