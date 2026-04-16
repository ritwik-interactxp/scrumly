import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { projectsApi, modulesApi, checklistApi } from "../../lib/api";
import { getUser } from "../../lib/auth";
import type { Project, Module, ChecklistItem } from "../../lib/types";

const STATUS_CONFIG = {
  not_started: { label: "Not Started", color: "#5a5a66" },
  in_progress: { label: "In Progress", color: "#f59e0b" },
  review: { label: "Review", color: "#3b82f6" },
  done: { label: "Done", color: "#22c55e" },
};

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 bg-[#1e1e24] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: value === 100 ? "#22c55e" : "#7c6aff" }} />
    </div>
  );
}

export default function WorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const user = getUser();

  useEffect(() => {
    if (!projectId) return;
    Promise.all([projectsApi.get(projectId), modulesApi.list(projectId)]).then(([p, m]) => {
      setProject(p); setModules(m);
      if (m.length > 0) setSelectedModule(m[0]);
    });
  }, [projectId]);

  useEffect(() => {
    if (selectedModule && projectId) checklistApi.list(projectId, selectedModule.id).then(setChecklist);
  }, [selectedModule, projectId]);

  async function toggleItem(itemId: string) {
    if (!projectId) return;
    const updated = await checklistApi.toggle(projectId, itemId);
    setChecklist((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
    modulesApi.list(projectId).then(setModules);
  }

  if (!project) return <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center"><p className="text-[#5a5a66]">Loading...</p></div>;

  const done = checklist.filter((i) => i.is_done).length;
  const total = checklist.length;

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white flex flex-col">
      <header className="border-b border-[#1e1e24] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-semibold">{project.name}</h1>
          <p className="text-xs text-[#5a5a66] mt-0.5">{project.progress}% complete · {modules.length} modules</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#7c6aff] flex items-center justify-center text-xs font-semibold">{user?.name?.[0]?.toUpperCase()}</div>
          <span className="text-sm text-[#8a8a99]">{user?.name}</span>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r border-[#1e1e24] overflow-y-auto">
          <div className="p-4">
            <p className="text-xs text-[#5a5a66] uppercase tracking-wider mb-3">Modules</p>
            <div className="space-y-1">
              {modules.map((mod) => {
                const sc = STATUS_CONFIG[mod.status];
                return (
                  <button key={mod.id} onClick={() => setSelectedModule(mod)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${selectedModule?.id === mod.id ? "bg-[#7c6aff]/10 text-white" : "text-[#8a8a99] hover:text-white hover:bg-[#1a1a20]"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sc.color }} />
                      <span className="text-sm font-medium truncate">{mod.title}</span>
                    </div>
                    <div className="pl-3.5">
                      <ProgressBar value={mod.progress} />
                      <p className="text-xs text-[#3a3a44] mt-1">{mod.checklist_done}/{mod.checklist_total}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto p-6">
          {selectedModule ? (
            <>
              <div className="mb-6">
                <div className="flex items-start justify-between mb-1">
                  <h2 className="text-lg font-semibold">{selectedModule.title}</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: STATUS_CONFIG[selectedModule.status].color, background: `${STATUS_CONFIG[selectedModule.status].color}1a` }}>
                    {STATUS_CONFIG[selectedModule.status].label}
                  </span>
                </div>
                {selectedModule.description && <p className="text-sm text-[#5a5a66]">{selectedModule.description}</p>}
                {selectedModule.doc_link && (
                  <a href={selectedModule.doc_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-[#7c6aff] hover:underline mt-2">📄 View Documentation ↗</a>
                )}
              </div>
              <div className="bg-[#111114] border border-[#1e1e24] rounded-xl p-4 mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[#8a8a99]">Progress</span>
                  <span className="font-mono">{done}/{total} items</span>
                </div>
                <ProgressBar value={selectedModule.progress} />
              </div>
              <div className="space-y-2">
                {checklist.length === 0 && <p className="text-sm text-[#5a5a66] text-center py-8">No checklist items for this module yet.</p>}
                {checklist.map((item) => (
                  <div key={item.id} onClick={() => toggleItem(item.id)}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#111114] cursor-pointer group transition-colors">
                    <div className={`mt-0.5 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${item.is_done ? "bg-[#7c6aff] border-[#7c6aff]" : "border-[#2e2e38] group-hover:border-[#7c6aff]"}`}>
                      {item.is_done && <svg width="11" height="11" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${item.is_done ? "text-[#5a5a66] line-through" : "text-white"}`}>{item.text}</p>
                      {item.is_done && item.done_by_name && <p className="text-xs text-[#3a3a44] mt-0.5">Done by {item.done_by_name}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full"><p className="text-[#5a5a66]">Select a module to view its checklist</p></div>
          )}
        </main>
      </div>
    </div>
  );
}
