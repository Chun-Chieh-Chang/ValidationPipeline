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
      const USE_API = process.env.NEXT_PUBLIC_USE_API === 'true';
      if (!USE_API) {
        alert("在免伺服器靜態部署模式下，暫不支援單一專案匯出功能。");
        setExporting(false);
        return;
      }
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

  const refreshAutoReminders = useCallback(async (currentProject: any) => {
    if (!currentProject || !currentProject.tasks) return;
    
    let needsUpdate = false;
    let updatedNotifications = [...(currentProject.notifications || [])];
    const today = new Date();
    const reminderWindowDays = 3;

    for (const task of currentProject.tasks) {
      if (task.status === 'COMPLETED' || !task.planned_date || !task.dept) continue;

      const plannedDate = new Date(task.planned_date);
      const diffTime = plannedDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // 檢查是否已發送過該任務的提前提醒或是逾期提醒
      const alreadyNotified = updatedNotifications.some(n => 
        n.task_id === task.id && (n.message.includes('提醒：任務') || n.message.includes('逾期提醒：任務'))
      );
      
      // 觸發條件：預計 3 天內完成，或是已經逾期 (diffDays < 0)
      if (diffDays <= reminderWindowDays && !alreadyNotified) {
        let msg = "";
        if (diffDays < 0) {
          msg = `🚨 逾期提醒：任務「${task.task_name}」已逾期 ${Math.abs(diffDays)} 天 (預定 ${plannedDate.toLocaleDateString()})，請 ${task.dept} 盡速推進。`;
        } else {
          msg = `提醒：任務「${task.task_name}」預計於 ${plannedDate.toLocaleDateString()} 完成，請 ${task.dept} 相關人員準備接手。`;
        }

        updatedNotifications.push({
          id: "notif_auto_" + Math.random().toString(36).substring(2, 9),
          project_id: currentProject.id,
          task_id: task.id,
          target_dept: task.dept,
          message: msg,
          is_read: false,
          created_at: new Date().toISOString()
        });
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      const res = await projectService.update(currentProject.id, { notifications: updatedNotifications });
      if (res) setProject(res);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      await fetchProject();
    };
    loadData();
  }, [fetchProject]);

  // 第二層 Effect 用於處理自動提醒（在 project 載入後執行一次）
  useEffect(() => {
    if (project && !loading) {
      refreshAutoReminders(project);
    }
  }, [project, loading, refreshAutoReminders]);

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
      const currentTask = project.tasks.find((t: any) => t.id === taskId);
      if (!currentTask) return;

      // 構建更新後的 tasks 清單 (方案 B / LocalStorage 相容)
      const updatedTasks = project.tasks.map((t: any) => 
        t.id === taskId ? { ...t, status: nextStatus, actual_date: actualDate } : t
      );
      
      let updatedNotifications = [...(project.notifications || [])];

      // 簽核流程與通知邏輯 (當任務標記為完成)
      if (nextStatus === 'COMPLETED') {
        // 1. 找出所有接續此任務的後續任務
        let nextTasks = updatedTasks.filter((t: any) => t.depends_on && t.depends_on.split(',').map((s: string) => s.trim()).includes(currentTask.wbs_code));

        // 2. 如果沒有設定明確的關聯，則退回預設邏輯：尋找 WBS 清單中的下一個任務
        if (nextTasks.length === 0) {
          const sortedTasks = [...updatedTasks].sort((a: any, b: any) => {
              const aParts = a.wbs_code.split('.').map(Number);
              const bParts = b.wbs_code.split('.').map(Number);
              for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                if ((aParts[i] || 0) !== (bParts[i] || 0)) return (aParts[i] || 0) - (bParts[i] || 0);
              }
              return 0;
          });
          const idx = sortedTasks.findIndex((t: any) => t.id === taskId);
          if (idx !== -1 && idx + 1 < sortedTasks.length) {
            nextTasks = [sortedTasks[idx + 1]];
          }
        }

        for (const nextTask of nextTasks) {
          // 檢查該後續任務是否已準備好發出提醒
          let readyToNotify = true;
          if (nextTask.depends_on) {
            const deps = nextTask.depends_on.split(',').map((s: string) => s.trim());
            const uncompletedDeps = updatedTasks.filter((t: any) => deps.includes(t.wbs_code) && t.status !== 'COMPLETED');
            if (uncompletedDeps.length > 0) readyToNotify = false;
          }

          if (readyToNotify && nextTask.status !== 'COMPLETED') {
            const plannedDateStr = nextTask.planned_date 
                ? new Date(nextTask.planned_date).toLocaleDateString() 
                : '未定';
            
            updatedNotifications.push({
              id: "notif_" + Math.random().toString(36).substring(2, 9),
              project_id: project.id,
              task_id: nextTask.id,
              target_dept: nextTask.dept,
              message: `前置任務「${currentTask.task_name}」已完成。請準備接手「${nextTask.task_name}」(預計: ${plannedDateStr})。`,
              is_read: false,
              created_at: new Date().toISOString()
            });
          }
        }
      }

      const res = await projectService.update(project.id, { 
        tasks: updatedTasks,
        notifications: updatedNotifications
      });
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
    <div className="min-h-screen bg-background flex items-center justify-center text-brand-primary font-bold">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin" />
        載入專案資料中...
      </div>
    </div>
  );

  if (!project) return (
    <div className="min-h-screen bg-background p-8 text-foreground font-bold">
      找不到該專案。
    </div>
  );

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
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-brand-primary/20">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] right-[-5%] w-[600px] h-[600px] bg-brand-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] left-[-5%] w-[400px] h-[400px] bg-brand-peach/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 p-6 md:p-8 max-w-[98%] mx-auto">
        
        {/* 主要專案內容 (Expanded to full width) */}
        <div className="w-full">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-slate-500 hover:text-brand-primary mb-8 font-bold transition-all group/back"
          >
            <ArrowLeft size={16} className="group-hover/back:-translate-x-1 transition-transform" /> 
            返回總覽
          </button>

          <header className="mb-10 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
              <div className="flex flex-wrap items-center gap-4">
                <h1 className="text-4xl font-black tracking-tight text-foreground">
                  {project.project_no}
                </h1>
                <div className="flex gap-2">
                  <span className="px-3 py-1 rounded-xl text-xs font-black tracking-widest bg-slate-100 border border-slate-200 text-slate-500 uppercase">
                    Rev. {project.rev}
                  </span>
                  <span className="px-3 py-1 rounded-xl text-xs font-black tracking-widest bg-brand-accent/40 border border-brand-secondary/20 text-brand-primary uppercase">
                    {project.type}
                  </span>
                  {project.status === "CLOSED" && (
                    <span className="px-3 py-1 rounded-xl text-xs font-black tracking-widest bg-emerald-50 border border-emerald-100 text-emerald-600 uppercase">
                      Completed
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all border-2 border-brand-accent bg-white text-brand-primary hover:bg-brand-accent/20 shadow-sm"
                >
                  {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                  匯出案號報表
                </button>

                <button 
                  onClick={handleToggleProjectStatus}
                  className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all shadow-sm ${
                    project.status === 'CLOSED'
                      ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      : 'bg-brand-primary text-white hover:shadow-lg hover:shadow-brand-primary/20'
                  }`}
                >
                  {project.status === 'CLOSED' ? '重啟案號' : '標記為結案'}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-slate-500 bg-white/50 backdrop-blur-sm p-6 rounded-3xl border border-brand-secondary/10 shadow-sm">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">品號 (Part No.)</span>
                <span className="text-foreground font-black">{project.part_no}</span>
              </div>
              <div className="w-px h-8 bg-brand-secondary/10 hidden md:block" />
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">負責人 (Owner)</span>
                <span className="text-foreground font-black">{project.owner}</span>
              </div>
              {project.ecr_no && (
                <>
                  <div className="w-px h-8 bg-brand-secondary/10 hidden md:block" />
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ECR 號碼</span>
                    <span className="text-brand-primary font-black">{project.ecr_no} <span className="text-slate-400 font-bold ml-1 text-xs">({project.ecr_date ? new Date(project.ecr_date).toLocaleDateString() : '未填'})</span></span>
                  </div>
                </>
              )}
              {project.ecn_no && (
                <>
                  <div className="w-px h-8 bg-brand-secondary/10 hidden md:block" />
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ECN 號碼</span>
                    <span className="text-slate-700 font-black">{project.ecn_no} <span className="text-slate-400 font-bold ml-1 text-xs">({project.ecn_date ? new Date(project.ecn_date).toLocaleDateString() : '未填'})</span></span>
                  </div>
                </>
              )}
              {project.start_date && (
                <>
                  <div className="w-px h-8 bg-brand-secondary/10 hidden md:block" />
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">起始日期</span>
                    <span className="text-slate-600 font-bold">{new Date(project.start_date).toLocaleDateString()}</span>
                  </div>
                </>
              )}
              {project.cloud_link && (
                <>
                  <div className="w-px h-8 bg-brand-secondary/10 hidden md:block" />
                  <a href={project.cloud_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-brand-accent/40 px-4 py-2 rounded-xl text-brand-primary hover:bg-brand-accent transition-all font-black text-sm">
                    <ExternalLink size={16} /> 雲端資料
                  </a>
                </>
              )}
            </div>

            {/* 簽核通知列 */}
            {project.notifications && project.notifications.length > 0 && (
              <div className="mt-8 bg-white border border-brand-secondary/20 rounded-3xl p-5 flex items-center gap-6 overflow-hidden shadow-sm group">
                <div className="flex items-center gap-2 text-brand-primary flex-shrink-0 font-black text-sm uppercase tracking-widest">
                  <Bell size={20} className="animate-pulse" />
                  <span>最新通知:</span>
                </div>
                <div className="flex-1 flex gap-10 overflow-x-auto no-scrollbar py-1 scroll-smooth">
                  {project.notifications.sort((a:any, b:any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((notif: any) => (
                    <div key={notif.id} className="flex items-center gap-4 whitespace-nowrap border-r border-brand-secondary/10 pr-10 last:border-0 group/notif">
                      <span className="px-3 py-1 rounded-xl bg-brand-accent/40 text-xs font-black text-brand-primary border border-brand-secondary/20 uppercase tracking-tighter">
                        {notif.target_dept}
                      </span>
                      <span className="text-sm text-foreground font-bold group-hover/notif:text-brand-primary transition-colors">
                        {notif.message}
                      </span>
                      <span className="text-xs text-slate-400 font-black">
                        {new Date(notif.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Phase Tracker */}
            {project.phases && project.phases.length > 0 && (
              <div className="mt-8 flex flex-wrap items-center gap-4">
                {project.phases.map((phase: any) => (
                  <button 
                    key={phase.id}
                    onClick={() => handleTogglePhase(phase.id, phase.completion_status)}
                    className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border-2 transition-all cursor-pointer select-none group/phase shadow-sm ${
                      phase.completion_status === 'COMPLETED'
                        ? 'bg-brand-primary border-brand-primary text-white shadow-brand-primary/20'
                        : 'bg-white border-brand-secondary/20 text-slate-400 hover:border-brand-primary/40 hover:text-brand-primary'
                    }`}
                  >
                    {phase.completion_status === 'COMPLETED' ? <CheckCircle size={18} /> : <Circle size={18} className="group-hover/phase:scale-110 transition-transform" />}
                    <span className="text-sm font-black tracking-widest uppercase">{phase.phase_name}</span>
                  </button>
                ))}
              </div>
            )}

            {project.purpose && (
              <div className="mt-8 text-foreground bg-brand-accent/10 p-6 rounded-3xl border border-brand-secondary/10 flex flex-col gap-2">
                <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest">案號目的 (Project Purpose)</span>
                <p className="text-lg font-bold leading-relaxed">{project.purpose}</p>
              </div>
            )}
          </header>

          {/* 視圖切換器與 WBS/甘特圖內容 */}
          <div className="bg-white rounded-3xl border border-brand-secondary/20 p-8 shadow-xl mt-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-brand-secondary/10 pb-6">
              <div className="flex items-center gap-6">
                <h2 className="text-2xl font-black text-foreground">
                  {viewMode === 'table' ? '任務清單 (WBS)' : '專案甘特圖 (Gantt)'}
                </h2>
                <div className="flex bg-brand-accent/30 rounded-xl p-1 border border-brand-secondary/15">
                  <button 
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black transition-all ${viewMode === 'table' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-400 hover:text-brand-primary'}`}
                  >
                    <TableIcon size={16} />
                    表格
                  </button>
                  <button 
                    onClick={() => setViewMode('gantt')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black transition-all ${viewMode === 'gantt' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-400 hover:text-brand-primary'}`}
                  >
                    <BarChart2 size={16} />
                    甘特圖
                  </button>
                </div>
              </div>
            </div>
            
            {viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px] border border-brand-secondary/10">
                <thead>
                  <tr className="bg-brand-accent/30 text-brand-primary text-xs font-black uppercase tracking-widest">
                    <th className="px-4 py-4 w-16 text-center border-b border-brand-secondary/10">工作序</th>
                    <th className="px-4 py-4 min-w-[180px] border-b border-l border-brand-secondary/10">工作項目</th>
                    <th className="px-4 py-4 w-40 text-center border-b border-l border-brand-secondary/10">權責</th>
                    <th className="px-4 py-4 w-32 text-center border-b border-l border-brand-secondary/10">狀態</th>
                    <th className="px-4 py-4 w-32 text-center border-b border-l border-brand-secondary/10">預計完成日</th>
                    <th className="px-4 py-4 w-32 text-center border-b border-l border-brand-secondary/10">開始日</th>
                    <th className="px-4 py-4 w-32 text-center text-brand-primary border-b border-l border-brand-secondary/10">實際完成日</th>
                    <th className="px-4 py-4 min-w-[150px] border-b border-l border-brand-secondary/10">交付/備註</th>
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
                        className={`transition-colors group border-b border-brand-secondary/5 ${
                          isMainTask ? 'bg-brand-accent/10 border-l-4 border-l-brand-primary' : 'bg-white border-l-4 border-l-transparent'
                        } ${
                          isCompleted ? 'opacity-60 grayscale-[0.3]' : (isCritical ? 'bg-brand-peach/10' : '')
                        }`}
                      >
                        <td className={`px-4 py-5 text-center font-black border-r border-brand-secondary/5 ${isMainTask ? 'text-sm text-brand-primary' : 'text-sm text-slate-400'}`}>
                          {task.wbs_code}
                        </td>
                        <td className="px-4 py-5 border-r border-brand-secondary/5">
                          <div 
                            className="flex items-center gap-2"
                            style={{ paddingLeft: `${(depth - 1) * 28}px` }}
                          >
                            {!isMainTask && (
                              <span className="text-slate-300 font-mono text-sm mr-1">└─</span>
                            )}
                            {isCritical && !isCompleted && (
                              <div className="w-1.5 h-1.5 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(136,117,245,0.6)] animate-pulse flex-shrink-0" />
                            )}
                            <div className={`
                              ${isMainTask ? 'text-sm font-black tracking-tight uppercase' : 'text-sm font-bold'} 
                              ${isCompleted ? 'text-slate-400 line-through' : (isCritical ? 'text-brand-primary' : (isMainTask ? 'text-slate-900' : 'text-slate-600'))}
                            `}>
                              {task.task_name}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center border-r border-brand-secondary/5">
                          {!isMainTask && task.dept && (
                            <span className={`px-3 py-1 rounded-xl transition-all font-black text-xs uppercase tracking-widest ${
                              task.status === 'IN_PROGRESS' 
                                ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-110 inline-block' 
                                : 'bg-slate-100 border border-slate-200 text-slate-500'
                            }`}>
                              {task.dept}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-5 text-center border-r border-brand-secondary/5">
                          {updating === task.id ? (
                            <Loader2 size={16} className="animate-spin text-brand-primary mx-auto" />
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(task.id, task.status)}
                              disabled={blocked}
                              className={`w-full max-w-[100px] py-1.5 rounded-xl text-xs font-black tracking-widest transition-all border-2 ${
                                isCompleted
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                  : task.status === 'IN_PROGRESS'
                                  ? 'bg-brand-accent/40 text-brand-primary border-brand-secondary/20 shadow-sm'
                                  : blocked 
                                  ? 'bg-slate-50 text-slate-300 border-slate-100 opacity-50 cursor-not-allowed'
                                  : 'bg-white text-slate-400 border-slate-200 hover:border-brand-primary/40'
                              }`}
                              title={blocked ? `等待前置任務: ${lockedBy}` : ''}
                            >
                              {isCompleted ? 'DONE' : task.status === 'IN_PROGRESS' ? 'RUN' : 'OPEN'}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-5 text-center border-r border-brand-secondary/5">
                          <div className={`text-sm font-bold ${!isCompleted && task.planned_date && new Date(task.planned_date) < new Date() ? 'text-red-500' : 'text-slate-500'}`}>
                            {task.planned_date ? new Date(task.planned_date).toLocaleDateString() : '-'}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center text-sm font-bold text-slate-400 border-r border-brand-secondary/5">
                          {task.start_date ? new Date(task.start_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-5 text-center border-r border-brand-secondary/5">
                          <div className={`text-sm font-bold ${isCompleted ? 'text-emerald-600' : 'text-slate-300 italic'}`}>
                            {task.actual_date ? new Date(task.actual_date).toLocaleDateString() : 'Pending'}
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <div className="flex flex-col gap-1">
                            {task.deliverable && task.deliverable !== 'null' ? (() => {
                              const [display, url] = task.deliverable.split('||');
                              return url ? (
                                <a 
                                  href={url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="flex items-center gap-1.5 text-sm text-brand-primary hover:text-brand-primary/70 font-bold transition-colors"
                                >
                                  <ExternalLink size={14} className="text-brand-primary" />
                                  {display}
                                </a>
                              ) : (
                                <div className="flex items-center gap-1.5 text-sm text-slate-400 font-bold">
                                  {display}
                                </div>
                              );
                            })() : null}
                            {task.progress && task.progress !== 'null' && task.progress !== '0' ? (
                              <div className="flex items-center gap-1.5 text-xs text-brand-primary/70 ml-1 font-black">
                                Progress: {task.progress}%
                              </div>
                            ) : null}
                            {blocked && <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter mt-1">🔒 LOCKED BY: {lockedBy}</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {project.tasks?.length === 0 && (
                <div className="text-center py-20 bg-slate-50/50 rounded-b-3xl border-t border-brand-secondary/10">
                  <div className="flex flex-col items-center gap-3">
                    <FileDown size={40} className="text-slate-200" />
                    <p className="text-slate-400 font-bold">目前無 WBS 子任務資料</p>
                  </div>
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
                      <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: '20rem', right: 0 }}>
                        {/* Grid Ticks */}
                        {[0, 0.2, 0.4, 0.6, 0.8, 1].map(p => (
                          <div 
                            key={p} 
                            className="absolute top-0 bottom-0 border-l border-brand-secondary/10"
                            style={{ left: `${p * 100}%` }}
                          />
                        ))}
                        {/* Today Marker Line */}
                        {todayPos > 0 && todayPos < 100 && (
                          <div 
                            className="absolute top-0 bottom-0 w-[3px] bg-brand-primary z-[15] shadow-[0_0_15px_rgba(136,117,245,0.4)]"
                            style={{ left: `${todayPos}%` }} 
                          />
                        )}
                      </div>

                      {/* Timeline Header */}
                      <div className="flex border-b border-brand-secondary/10 pb-4 mb-8 sticky top-0 bg-white z-20">
                        <div className="w-80 flex-shrink-0 text-xs font-black text-slate-400 uppercase tracking-widest pl-4">任務 WBS 結構 (Gantt)</div>
                        <div className="flex-1 relative h-6">
                           {[0, 0.2, 0.4, 0.6, 0.8, 1].map(p => (
                             <div 
                               key={p} 
                               className="absolute text-xs text-slate-500 font-black tabular-nums"
                               style={{ left: `${p * 100}%`, transform: 'translateX(-50%)' }}
                             >
                               {new Date(displayMin + totalRange * p).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}
                             </div>
                           ))}
                        </div>
                      </div>

                      {/* Gantt Rows */}
                      <div className="space-y-3 pb-20 relative">
                        {sortedTasks.map(task => {
                          const isCompleted = task.status === "COMPLETED";
                          const isCritical = criticalPathSet.has(task.id);
                          const isMainTask = task.wbs_code.split('.').length === 1;
                          
                          const tStart = task.start_date ? new Date(task.start_date).getTime() : minD;
                          const planEnd = task.planned_date ? new Date(task.planned_date).getTime() : tStart;
                          const actualEnd = task.actual_date ? new Date(task.actual_date).getTime() : tStart;
                          const tEnd = Math.max(planEnd, actualEnd, tStart + (dayMs / 2));
                          
                          const left = ((tStart - displayMin) / totalRange) * 100;
                          const width = Math.max(((tEnd - tStart) / totalRange) * 100, 1.2); 

                          return (
                            <div key={task.id} className={`flex items-center group/gantt hover:bg-brand-accent/10 py-2.5 transition-colors rounded-2xl ${isMainTask ? 'bg-brand-accent/5' : 'bg-white'}`}>
                              <div className="w-80 flex-shrink-0 flex items-center gap-4 pr-10 overflow-hidden pl-4">
                                <span className={`${isMainTask ? 'text-sm font-black text-brand-primary' : 'text-sm font-black text-slate-300'} w-12 flex-shrink-0 tabular-nums`}>
                                  {task.wbs_code}
                                </span>
                                <span className={`truncate leading-tight font-black ${isMainTask ? 'text-sm uppercase text-slate-900 tracking-tight' : 'text-sm font-bold text-slate-600'} ${isCritical && !isCompleted ? 'text-brand-primary underline decoration-2 decoration-brand-primary/20 underline-offset-4' : (isCompleted ? 'text-slate-400 line-through decoration-1' : '')}`}>
                                  {task.task_name}
                                </span>
                              </div>
                              <div className="flex-1 h-8 relative">
                                  <div 
                                    className={`absolute h-full rounded-2xl transition-all flex items-center justify-center shadow-lg group/bar cursor-default border-2 ${
                                      isCompleted 
                                        ? 'bg-brand-primary border-brand-primary text-white' 
                                        : task.status === 'IN_PROGRESS'
                                        ? 'bg-brand-accent border-brand-secondary/20 text-brand-primary'
                                        : 'bg-slate-50 border-slate-100 text-slate-400'
                                    } ${isCritical && !isCompleted ? 'shadow-xl shadow-brand-primary/20 animate-pulse' : ''}`}
                                  style={{ left: `${left}%`, width: `${width}%` }}
                                >
                                  {/* Tooltip on Hover */}
                                  <div className="opacity-0 group-hover/bar:opacity-100 absolute bottom-full mb-4 bg-white border border-brand-secondary/20 text-sm p-4 rounded-2xl shadow-2xl z-50 pointer-events-none whitespace-nowrap transition-all transform translate-y-2 group-hover/bar:translate-y-0">
                                    <div className="font-black border-b border-brand-secondary/10 mb-3 pb-2 text-foreground text-sm uppercase tracking-tight">{task.task_name}</div>
                                    <div className="space-y-2">
                                      <div className="flex justify-between gap-10"><span className="text-slate-400 font-bold">開始:</span> <span className="text-foreground font-black tabular-nums">{new Date(tStart).toLocaleDateString()}</span></div>
                                      <div className="flex justify-between gap-10"><span className="text-slate-400 font-bold">計畫完成:</span> <span className="text-foreground font-black tabular-nums">{task.planned_date ? new Date(task.planned_date).toLocaleDateString() : '-'}</span></div>
                                      {task.actual_date && <div className="flex justify-between gap-10 text-emerald-600 font-black"><span>實際完成:</span> <span className="tabular-nums">{new Date(task.actual_date).toLocaleDateString()}</span></div>}
                                      <div className="flex justify-between gap-10 pt-2 border-t border-brand-secondary/10 font-black text-brand-primary uppercase tracking-widest text-xs"><span>狀態:</span> <span>{isCompleted ? 'Completed' : 'Running'}</span></div>
                                    </div>
                                  </div>

                                  {width > 3 && (
                                    isCompleted ? <CheckCircle size={16} className="text-white drop-shadow-sm" /> :
                                    isCritical && <Zap size={14} className="text-brand-primary drop-shadow-sm" />
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
                  <div className="flex flex-col items-center justify-center py-32 bg-slate-50/50 rounded-3xl border border-brand-secondary/10 gap-4">
                    <BarChart2 size={48} className="text-slate-200" />
                    <p className="text-slate-400 font-bold">尚未載入 WBS 任務資料，無法生成甘特圖</p>
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
