"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Clock, CheckCircle, Circle, ArrowRightCircle, Bell, Loader2, Zap, FileDown, BarChart2, Table as TableIcon, ExternalLink } from "lucide-react";
import { projectService } from "@/lib/projectService";

export default function ProjectDetailContainer() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    }>
      <ProjectDetailContent />
    </Suspense>
  );
}

function ProjectDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'gantt'>('table');

  const fetchProject = useCallback(async () => {
    if (!id) return;
    try {
      const data = await projectService.getById(id);
      setProject(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleExport = async () => {
    if (!id) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/projects/${id}/export`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Project_${project.project_no}_Report.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      alert("匯出失敗");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleUpdateStatus = async (taskId: string, currentStatus: string) => {
    setUpdating(taskId);
    let nextStatus = "IN_PROGRESS";
    let actualDate: string | null = null;

    if (currentStatus === "NOT_STARTED") nextStatus = "IN_PROGRESS";
    if (currentStatus === "IN_PROGRESS") {
      nextStatus = "COMPLETED";
      actualDate = new Date().toISOString();
    }

    try {
      // 構建更新後的 tasks 清單 (方案 B / LocalStorage 相容)
      const updatedTasks = project.tasks.map((t: any) => 
        t.id === taskId ? { ...t, status: nextStatus, actual_date: actualDate } : t
      );
      
      const res = await projectService.update(project.id, { tasks: updatedTasks });
      if (res) {
        setProject(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(null);
    }
  };

  const handleTogglePhase = async (phaseId: string, currentStatus: string) => {
    if (!project) return;
    const nextStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    try {
      const updatedPhases = project.phases.map((p: any) => 
        p.id === phaseId ? { ...p, completion_status: nextStatus } : p
      );
      const res = await projectService.update(project.id, { phases: updatedPhases });
      if (res) {
        setProject(res);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleProjectStatus = async () => {
    if (!project) return;
    const nextStatus = project.status === "CLOSED" ? "IN_PROGRESS" : "CLOSED";
    try {
      const res = await projectService.update(project.id, { status: nextStatus });
      if (res) {
        setProject(res);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-white">
      <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
    </div>
  );
  if (!project) return <div className="min-h-screen bg-[#0F172A] p-8 text-white">找不到該專案。</div>;

  // Compute Critical Path
  const computeCriticalPath = (tasks: any[]) => {
    if (!tasks || tasks.length === 0) return new Set<string>();
    const adj: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};
    const wbsToId: Record<string, string> = {};
    
    tasks.forEach(t => {
      adj[t.wbs_code] = [];
      inDegree[t.wbs_code] = 0;
      wbsToId[t.wbs_code] = t.id;
    });

    tasks.forEach(t => {
      if (t.depends_on) {
        const deps = t.depends_on.split(',').map((s: string) => s.trim());
        deps.forEach((depWbs: string) => {
          if (adj[depWbs]) {
            adj[depWbs].push(t.wbs_code);
            inDegree[t.wbs_code] = (inDegree[t.wbs_code] || 0) + 1;
          }
        });
      }
    });

    const dist: Record<string, number> = {};
    const prev: Record<string, string | null> = {};
    
    tasks.forEach(t => {
      dist[t.wbs_code] = 1;
      prev[t.wbs_code] = null;
    });

    const queue = tasks.filter(t => inDegree[t.wbs_code] === 0).map(t => t.wbs_code);
    let maxDist = 0;
    let endNode = null;

    while (queue.length > 0) {
      const u = queue.shift()!;
      if (dist[u] > maxDist) {
        maxDist = dist[u];
        endNode = u;
      }
      (adj[u] || []).forEach(v => {
        if (dist[u] + 1 > dist[v]) {
          dist[v] = dist[u] + 1;
          prev[v] = u;
        }
        inDegree[v]--;
        if (inDegree[v] === 0) queue.push(v);
      });
    }

    const isCritical = new Set<string>();
    let curr = endNode;
    while (curr) {
      isCritical.add(wbsToId[curr]);
      curr = prev[curr];
    }
    return isCritical;
  };

  const criticalPathSet = computeCriticalPath(project.tasks || []);

  const isTaskBlocked = (task: any) => {
    if (!task.depends_on) return { blocked: false, lockedBy: "" };
    const deps = task.depends_on.split(',').map((s: string) => s.trim());
    const uncompletedDeps = project.tasks?.filter((t: any) => deps.includes(t.wbs_code) && t.status !== "COMPLETED") || [];
    return {
      blocked: uncompletedDeps.length > 0,
      lockedBy: uncompletedDeps.map((t: any) => t.wbs_code).join(", ")
    };
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 font-sans">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-sky-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 p-6 md:p-8 max-w-[98%] mx-auto">
        
        {/* 主要專案內容 (Expanded to full width) */}
        <div className="w-full">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={16} /> 返回總覽
          </button>

          <header className="mb-8 relative">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  {project.project_no}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-slate-700/50 border border-slate-600/50 text-slate-300">
                  Rev. {project.rev}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  {project.type}
                </span>
                {project.status === "CLOSED" && (
                  <span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    已結案
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all border border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20"
                >
                  {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                  匯出 Excel
                </button>

                <button 
                  onClick={handleToggleProjectStatus}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all border ${
                    project.status === 'CLOSED'
                      ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
                      : 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500'
                  }`}
                >
                  {project.status === 'CLOSED' ? '重啟專案' : '標記為結案'}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-slate-400 mt-2">
              <div className="text-lg">品號: <span className="text-slate-200">{project.part_no}</span></div>
              <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
              <div className="text-lg">發出者: <span className="text-slate-200">{project.owner}</span></div>
              {project.ecr_no && (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  <div className="text-lg">ECR: <span className="text-slate-200">{project.ecr_no}</span> ({project.ecr_date ? new Date(project.ecr_date).toLocaleDateString() : '未填'})</div>
                </>
              )}
              {project.ecn_no && (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  <div className="text-lg">ECN: <span className="text-slate-200">{project.ecn_no}</span> ({project.ecn_date ? new Date(project.ecn_date).toLocaleDateString() : '未填'})</div>
                </>
              )}
               {project.start_date && (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  <div className="text-lg">起始日: <span className="text-slate-200">{new Date(project.start_date).toLocaleDateString()}</span></div>
                </>
              )}
              {project.cloud_link && (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  <a href={project.cloud_link} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-400 hover:text-sky-300 underline flex items-center gap-1">
                    <FileDown size={18} /> 雲端資料
                  </a>
                </>
              )}
            </div>

            {/* 簽核通知列 (新位置：紅色框選處) */}
            {project.notifications && project.notifications.length > 0 && (
              <div className="mt-6 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-center gap-4 overflow-hidden shadow-[inset_0_0_12px_rgba(245,158,11,0.05)] group">
                <div className="flex items-center gap-2 text-amber-400 flex-shrink-0 font-bold text-sm">
                  <Bell size={18} className="animate-pulse" />
                  <span>最新通知:</span>
                </div>
                <div className="flex-1 flex gap-8 overflow-x-auto no-scrollbar py-1 scroll-smooth">
                  {project.notifications.sort((a:any, b:any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((notif: any) => (
                    <div key={notif.id} className="flex items-center gap-3 whitespace-nowrap border-r border-amber-500/20 pr-8 last:border-0 group/notif">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-sm font-black text-amber-400 border border-amber-500/30">
                        {notif.target_dept}
                      </span>
                      <span className="text-sm text-amber-200 font-medium group-hover/notif:text-amber-100 transition-colors">
                        {notif.message}
                      </span>
                      <span className="text-sm text-amber-500/50 font-mono">
                        {new Date(notif.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Phase Tracker */}
            {project.phases && project.phases.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {project.phases.map((phase: any) => (
                  <button 
                    key={phase.id}
                    onClick={() => handleTogglePhase(phase.id, phase.completion_status)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all cursor-pointer select-none group/phase ${
                      phase.completion_status === 'COMPLETED'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {phase.completion_status === 'COMPLETED' ? <CheckCircle size={14} /> : <Circle size={14} className="group-hover/phase:text-sky-500" />}
                    <span className="text-sm font-bold tracking-wider">{phase.phase_name}</span>
                  </button>
                ))}
              </div>
            )}

            {project.purpose && (
              <div className="mt-6 text-slate-300 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 block">
                <span className="text-slate-500 font-medium mr-2">專案目的:</span>
                {project.purpose}
              </div>
            )}
          </header>

          {/* 視圖切換器與 WBS/甘特圖內容 */}
          <div className="bg-slate-800/40 backdrop-blur-[15px] rounded-2xl border border-white/[0.05] p-6 shadow-xl overflow-hidden mt-8">
            <h2 className="text-xl font-semibold mb-6 text-slate-200 border-b border-slate-700 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span>{viewMode === 'table' ? '分階任務 WBS' : '專案甘特圖 (Timeline)'}</span>
                <div className="flex bg-slate-900/60 rounded-lg p-1 border border-white/5">
                  <button 
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-md transition-all flex items-center gap-1.5 px-3 ${viewMode === 'table' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <TableIcon size={14} />
                    <span className="text-sm">表格</span>
                  </button>
                  <button 
                    onClick={() => setViewMode('gantt')}
                    className={`p-1.5 rounded-md transition-all flex items-center gap-1.5 px-3 ${viewMode === 'gantt' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <BarChart2 size={14} />
                    <span className="text-sm">甘特圖</span>
                  </button>
                </div>
              </div>
              <span className="text-sm font-normal text-slate-500 italic">* {viewMode === 'table' ? '點擊狀態按鈕可切換進度' : '水平視圖展示進度排程'}</span>
            </h2>
            
            {viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px] border border-white/5">
                <thead>
                  <tr className="bg-slate-900/60 text-slate-400 text-sm font-bold uppercase tracking-wider">
                    <th className="px-4 py-3 w-16 text-center border border-white/10">工作序</th>
                    <th className="px-4 py-3 min-w-[180px] border border-white/10">工作項目</th>
                    <th className="px-4 py-3 w-40 text-center border border-white/10">權責</th>
                    <th className="px-4 py-3 w-32 text-center border border-white/10">狀態</th>
                    <th className="px-4 py-3 w-32 text-center border border-white/10">預計完成日</th>
                    <th className="px-4 py-3 w-32 text-center border border-white/10">開始日</th>
                    <th className="px-4 py-3 w-32 text-center text-emerald-400 border border-white/10">實際完成日</th>
                    <th className="px-4 py-3 min-w-[150px] border border-white/10">交付/備註</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {(project.tasks || []).sort((a: any, b: any) => {
                    const aParts = a.wbs_code.split('.').map(Number);
                    const bParts = b.wbs_code.split('.').map(Number);
                    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                      if ((aParts[i] || 0) !== (bParts[i] || 0)) return (aParts[i] || 0) - (bParts[i] || 0);
                    }
                    return 0;
                  }).map((task: any) => {
                    const isCompleted = task.status === "COMPLETED";
                    const isCritical = criticalPathSet.has(task.id);
                    const { blocked, lockedBy } = isTaskBlocked(task);
                    const depth = (task.wbs_code || "").split('.').filter(Boolean).length || 1;
                    const isMainTask = depth === 1;

                    return (
                      <tr 
                        key={task.id}
                        className={`transition-colors group ${
                          isMainTask ? 'bg-sky-500/[0.03] border-l-2 border-sky-500/30' : 'border-l-2 border-transparent'
                        } ${
                          isCompleted ? 'opacity-60 bg-emerald-500/[0.02]' : (isCritical ? 'bg-amber-500/[0.02]' : '')
                        }`}
                      >
                        <td className={`px-4 py-4 text-center font-mono border border-white/5 ${isMainTask ? 'text-sm font-black text-sky-500/80' : 'text-sm text-slate-500'}`}>
                          {task.wbs_code}
                        </td>
                        <td className="px-4 py-4 border border-white/5">
                          <div 
                            className="flex items-center gap-2"
                            style={{ paddingLeft: `${(depth - 1) * 28}px` }}
                          >
                            {!isMainTask && (
                              <span className="text-slate-600 font-mono text-sm mr-1 opacity-50">└─</span>
                            )}
                            {isCritical && !isCompleted && (
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse flex-shrink-0" />
                            )}
                            <div className={`
                              ${isMainTask ? 'text-sm font-black tracking-wider uppercase' : 'text-sm font-normal'} 
                              ${isCompleted ? 'text-slate-500 line-through' : (isCritical ? 'text-amber-200' : (isMainTask ? 'text-sky-400' : 'text-slate-300'))}
                            `}>
                              {task.task_name}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center border border-white/5">
                          {!isMainTask && task.dept && (
                            <span className={`px-2.5 py-1 rounded transition-all font-bold ${
                              task.status === 'IN_PROGRESS' 
                                ? 'bg-amber-400 text-slate-950 text-sm shadow-[0_0_12px_rgba(251,191,36,0.4)] ring-2 ring-amber-500/50 scale-110 inline-block' 
                                : 'bg-slate-700/50 border border-white/5 text-sm text-slate-400'
                            }`}>
                              {task.dept}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center border border-white/5">
                          {updating === task.id ? (
                            <Loader2 size={16} className="animate-spin text-sky-400 mx-auto" />
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(task.id, task.status)}
                              disabled={blocked}
                              className={`w-full max-w-[100px] py-1 rounded-full text-sm font-bold transition-all border ${
                                isCompleted
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  : task.status === 'IN_PROGRESS'
                                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/30 shadow-[0_0_8px_rgba(14,165,233,0.3)]'
                                  : blocked 
                                  ? 'bg-slate-800 text-slate-600 border-slate-700 opacity-50 cursor-not-allowed'
                                  : 'bg-slate-700/30 text-slate-500 border-slate-700 hover:border-slate-500'
                              }`}
                              title={blocked ? `等待前置任務: ${lockedBy}` : ''}
                            >
                              {isCompleted ? '已完成' : task.status === 'IN_PROGRESS' ? '執行中' : '尚未開始'}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center border border-white/5">
                          <div className={`text-sm ${!isCompleted && task.planned_date && new Date(task.planned_date) < new Date() ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                            {task.planned_date ? new Date(task.planned_date).toLocaleDateString() : '-'}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center text-sm text-slate-500 uppercase border border-white/5">
                          {task.start_date ? new Date(task.start_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-4 text-center border border-white/5">
                          <div className={`text-sm ${isCompleted ? 'text-emerald-400 font-bold' : 'text-slate-600 italic'}`}>
                            {task.actual_date ? new Date(task.actual_date).toLocaleDateString() : '待定'}
                          </div>
                        </td>
                        <td className="px-4 py-4 border border-white/5">
                          <div className="flex flex-col gap-1">
                            {task.deliverable && task.deliverable !== 'null' ? (() => {
                              const [display, url] = task.deliverable.split('||');
                              return url ? (
                                <a 
                                  href={url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="flex items-center gap-1.5 text-sm text-sky-400 hover:text-sky-300 underline underline-offset-2 decoration-sky-400/30 transition-colors"
                                >
                                  <span className="w-1 h-1 rounded-full bg-sky-400" />
                                  {display}
                                  <ExternalLink size={10} className="opacity-60" />
                                </a>
                              ) : (
                                <div className="flex items-center gap-1.5 text-sm text-sky-400/80">
                                  <span className="w-1 h-1 rounded-full bg-sky-400" />
                                  {display}
                                </div>
                              );
                            })() : null}
                            {task.progress && task.progress !== 'null' && task.progress !== '0' ? (
                              <div className="flex items-center gap-1.5 text-sm text-emerald-400/70 ml-2.5">
                                進度: {task.progress}%
                              </div>
                            ) : null}
                            {blocked && <span className="text-sm text-rose-500/70 leading-tight ml-2.5">🔒 需先完成: {lockedBy}</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {project.tasks?.length === 0 && (
                <div className="text-center py-12 text-slate-500 italic bg-slate-900/40 border-t border-white/5">
                  本案件目前尚無相關的 WBS 子任務資料。
                </div>
              )}
              </div>
            ) : (
              /* Gantt Chart View */
              <div className="p-4 overflow-x-auto min-h-[500px]">
                {project.tasks && project.tasks.length > 0 ? (() => {
                  const sortedTasks = [...project.tasks].sort((a, b) => {
                    const aParts = a.wbs_code.split('.').map(Number);
                    const bParts = b.wbs_code.split('.').map(Number);
                    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                      if ((aParts[i] || 0) !== (bParts[i] || 0)) return (aParts[i] || 0) - (bParts[i] || 0);
                    }
                    return 0;
                  });

                  // 1. Calculate Absolute Project Bounds
                  const dayMs = 24 * 60 * 60 * 1000;
                  let minD = new Date(project.start_date || project.created_at).getTime();
                  let maxD = minD + (7 * dayMs);

                  sortedTasks.forEach(t => {
                    const s = t.start_date ? new Date(t.start_date).getTime() : minD;
                    const p = t.planned_date ? new Date(t.planned_date).getTime() : s;
                    const a = t.actual_date ? new Date(t.actual_date).getTime() : s;
                    if (s) minD = Math.min(minD, s);
                    if (s) maxD = Math.max(maxD, s);
                    if (p) maxD = Math.max(maxD, p);
                    if (a) maxD = Math.max(maxD, a);
                  });

                  // 2. Buffer for display
                  const displayMin = minD - (3 * dayMs);
                  const displayMax = maxD + (7 * dayMs);
                  const totalRange = displayMax - displayMin;
                  const todayPos = ((Date.now() - displayMin) / totalRange) * 100;

                  return (
                    <div className="flex flex-col min-w-[1200px] relative">
                      {/* Gantt Overlay (Timeline Ticks & Today Marker) */}
                      <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: '16rem', right: 0 }}>
                        {/* Grid Ticks */}
                        {[0, 0.2, 0.4, 0.6, 0.8, 1].map(p => (
                          <div 
                            key={p} 
                            className="absolute top-0 bottom-0 border-l border-slate-800/50"
                            style={{ left: `${p * 100}%` }}
                          />
                        ))}
                        {/* Today Marker Line */}
                        {todayPos > 0 && todayPos < 100 && (
                          <div 
                            className="absolute top-0 bottom-0 w-[2px] bg-rose-500/40 z-[15] shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                            style={{ left: `${todayPos}%` }} 
                          />
                        )}
                      </div>

                      {/* Timeline Header */}
                      <div className="flex border-b border-slate-700/50 pb-3 mb-6 sticky top-0 bg-[#0F172A] z-20">
                        <div className="w-64 flex-shrink-0 text-sm font-bold text-slate-500 uppercase tracking-widest pl-2">任務項目 (WBS)</div>
                        <div className="flex-1 relative h-6">
                           {[0, 0.2, 0.4, 0.6, 0.8, 1].map(p => (
                             <div 
                               key={p} 
                               className="absolute text-sm text-slate-500 font-mono"
                               style={{ left: `${p * 100}%`, transform: 'translateX(-50%)' }}
                             >
                               {new Date(displayMin + totalRange * p).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}
                             </div>
                           ))}
                        </div>
                      </div>

                      {/* Gantt Rows */}
                      <div className="space-y-4 pb-12 relative">
                        {sortedTasks.map(task => {
                          const isCompleted = task.status === "COMPLETED";
                          const isCritical = criticalPathSet.has(task.id);
                          const isMainTask = task.wbs_code.split('.').length === 1;
                          
                          const tStart = task.start_date ? new Date(task.start_date).getTime() : minD;
                          // Use the maximum of planned_date or actual_date to determine the end of the bar
                          const planEnd = task.planned_date ? new Date(task.planned_date).getTime() : tStart;
                          const actualEnd = task.actual_date ? new Date(task.actual_date).getTime() : tStart;
                          const tEnd = Math.max(planEnd, actualEnd, tStart + (dayMs / 2));
                          
                          const left = ((tStart - displayMin) / totalRange) * 100;
                          const width = Math.max(((tEnd - tStart) / totalRange) * 100, 1.2); 

                          return (
                            <div key={task.id} className={`flex items-center group/gantt hover:bg-slate-800/10 py-1.5 transition-colors rounded-lg ${isMainTask ? 'bg-sky-500/[0.02]' : ''}`}>
                              <div className="w-64 flex-shrink-0 flex items-center gap-3 pr-6 overflow-hidden pl-2">
                                <span className={`${isMainTask ? 'text-sm font-black text-sky-500/80' : 'text-sm font-mono text-slate-600'} w-10 flex-shrink-0 tabular-nums`}>
                                  {task.wbs_code}
                                </span>
                                <span className={`truncate ${isMainTask ? 'text-sm font-black tracking-wider uppercase text-sky-400' : 'text-sm font-normal text-slate-300'} ${isCritical && !isCompleted ? 'text-amber-200' : (isCompleted ? 'text-slate-500' : '')}`}>
                                  {task.task_name}
                                </span>
                              </div>
                              <div className="flex-1 h-7 relative">
                                <div 
                                  className={`absolute h-full rounded-md transition-all flex items-center justify-center shadow-lg group/bar cursor-default border ${
                                    isCompleted 
                                      ? 'bg-emerald-500/30 border-emerald-500/40 shadow-emerald-500/5' 
                                      : task.status === 'IN_PROGRESS'
                                      ? 'bg-sky-500/40 border-sky-400/40 shadow-sky-500/5'
                                      : 'bg-slate-700/30 border-slate-600/30'
                                  } ${isCritical && !isCompleted ? 'ring-1 ring-amber-500/40 animate-pulse' : ''}`}
                                  style={{ left: `${left}%`, width: `${width}%` }}
                                >
                                  {/* Tooltip on Hover */}
                                  <div className="opacity-0 group-hover/bar:opacity-100 absolute bottom-full mb-3 bg-slate-800 border border-slate-600 text-sm p-3 rounded-lg shadow-2xl z-50 pointer-events-none whitespace-nowrap transition-all transform scale-95 group-hover/bar:scale-100">
                                    <div className="font-bold border-b border-slate-700 mb-2 pb-1.5 text-slate-200 text-sm">{task.task_name}</div>
                                    <div className="space-y-1">
                                      <div className="flex justify-between gap-4"><span>開始:</span> <span className="text-slate-200 font-mono">{new Date(tStart).toLocaleDateString()}</span></div>
                                      <div className="flex justify-between gap-4"><span>計畫完成:</span> <span className="text-slate-200 font-mono">{task.planned_date ? new Date(task.planned_date).toLocaleDateString() : '-'}</span></div>
                                      {task.actual_date && <div className="flex justify-between gap-4 text-emerald-400 font-bold"><span>實際完成:</span> <span className="font-mono">{new Date(task.actual_date).toLocaleDateString()}</span></div>}
                                      <div className="flex justify-between gap-4 pt-1 border-t border-slate-700"><span>狀態:</span> <span className={isCompleted ? 'text-emerald-400' : 'text-sky-400'}>{isCompleted ? '已完成' : '執行中'}</span></div>
                                    </div>
                                  </div>

                                  {width > 3 && (
                                    isCompleted ? <CheckCircle size={12} className="text-emerald-300 shadow-sm" /> :
                                    isCritical && <Zap size={10} className="text-amber-300" />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })() : (
                  <div className="flex items-center justify-center py-24 text-slate-500 italic bg-slate-900/20 rounded-2xl border border-white/5">
                    尚未載入 WBS 任務資料，無法生成甘特圖。
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
