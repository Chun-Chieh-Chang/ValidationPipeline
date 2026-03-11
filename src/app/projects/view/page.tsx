"use client";

import { useEffect, useState, useCallback, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Clock, CheckCircle, Circle, ArrowRightCircle, Bell, Loader2, Zap, FileDown, BarChart2, Table as TableIcon, ExternalLink } from "lucide-react";
import { projectService } from "@/lib/projectService";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function ProjectDetailContainer() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-pelagic" />
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
            const plannedDateStr = nextTask.planned_date && !isNaN(new Date(nextTask.planned_date).getTime())
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
    <div className="min-h-screen bg-background flex items-center justify-center text-abyss font-bold">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin" />
        載入專案中...
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
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-seafoam overflow-x-hidden no-scrollbar">

      <div className="relative z-10 p-6 md:p-8 max-w-[98%] mx-auto overflow-y-hidden no-scrollbar">
        
        {/* 主要專案內容 (Expanded to full width) */}
        <div className="w-full">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-muted hover:text-foreground mb-8 font-bold transition-all group/back"
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
                  <span className="px-3 py-1 rounded-xl text-sm font-black tracking-widest bg-surface border border-border text-foreground uppercase shadow-sm">
                    Rev. {project.rev}
                  </span>
                  <span className="px-3 py-1 rounded-xl text-sm font-black tracking-widest bg-brand-secondary/10 border border-brand-secondary/30 text-brand-secondary uppercase shadow-sm">
                    {project.type}
                  </span>
                  {project.status === "CLOSED" && (
                    <span className="px-3 py-1 rounded-xl text-sm font-black tracking-widest bg-success/10 border border-success/30 text-success uppercase shadow-sm">
                      Completed
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                  <ThemeToggle />
                  <button 
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all border-2 border-border bg-surface text-foreground hover:bg-background shadow-xl"
                  >

                  {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                  匯出案號報表
                </button>

                <button 
                  onClick={handleToggleProjectStatus}
                  className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all shadow-xl ${
                    project.status === 'CLOSED'
                      ? 'bg-background border-2 border-border text-muted hover:text-foreground'
                      : 'bg-brand-accent text-white hover:opacity-90 border-2 border-brand-accent'
                  }`}
                >
                  {project.status === 'CLOSED' ? '重啟案號' : '標記為結案'}
                </button>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-foreground bg-surface p-6 rounded-3xl border-2 border-border shadow-xl">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-black uppercase tracking-widest text-muted">品號</span>
                <span className="text-foreground font-black">{project.part_no}</span>
              </div>
              <div className="w-px h-8 bg-border hidden md:block" />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-black uppercase tracking-widest text-muted">負責人</span>
                <span className={`font-black px-2 py-0.5 rounded transition-all ${
                  project.status === "IN_PROGRESS"
                    ? "bg-brand-accent text-brand-accent-fg animate-subtle-pulse"
                    : "text-foreground"
                }`}>
                  {project.owner}
                </span>
              </div>

              {project.ecr_no && String(project.ecr_no).toLowerCase() !== 'true' && (
                <>
                  <div className="w-px h-8 bg-border hidden md:block" />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-black uppercase tracking-widest text-muted">ECR 號碼</span>
                    <span className="text-brand-accent font-black">{project.ecr_no} <span className="text-muted font-bold ml-1 text-sm">({project.ecr_date ? new Date(project.ecr_date).toLocaleDateString() : '未填'})</span></span>
                  </div>
                </>
              )}
              {project.ecn_no && String(project.ecn_no).toLowerCase() !== 'true' && (
                <>
                  <div className="w-px h-8 bg-border hidden md:block" />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-black uppercase tracking-widest text-muted">ECN 號碼</span>
                    <span className="text-brand-accent font-black">{project.ecn_no} <span className="text-muted font-bold ml-1 text-sm">({project.ecn_date ? new Date(project.ecn_date).toLocaleDateString() : '未填'})</span></span>
                  </div>
                </>
              )}
              {project.start_date && (
                <>
                  <div className="w-px h-8 bg-border hidden md:block" />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-black uppercase tracking-widest text-foreground opacity-80 decoration-abyss underline underline-offset-4 decoration-2">起始日期</span>
                    <span className="text-foreground font-black text-lg">{new Date(project.start_date).toLocaleDateString()}</span>
                  </div>
                </>
              )}
              {project.cloud_link && (
                <>
                  <div className="w-px h-8 bg-border hidden md:block" />
                  <a href={project.cloud_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-brand-secondary/10 border border-brand-secondary/30 px-4 py-2 rounded-xl text-brand-secondary hover:bg-surface transition-all font-black text-sm">
                    <ExternalLink size={16} /> 雲端資料
                  </a>
                </>
              )}
            </div>

            {/* 簽核通知列 */}
            {project.notifications && project.notifications.length > 0 && (
              <div className="mt-8 bg-surface border-2 border-border rounded-3xl p-5 flex items-center gap-6 overflow-hidden shadow-xl group">
                <div className="flex items-center gap-2 text-brand-accent flex-shrink-0 font-black text-sm uppercase tracking-widest">
                  <Bell size={20} className="animate-pulse" />
                  <span>最新通知:</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="animate-marquee flex gap-10">
                    {/* Render notifications twice for seamless scrolling */}
                    {[...project.notifications, ...project.notifications]
                      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((notif: any, idx: number) => (
                        <div key={`${notif.id}-${idx}`} className="flex items-center gap-4 whitespace-nowrap border-r border-border pr-10 last:border-0 group/notif">
                          <span className="px-3 py-1 rounded-xl bg-brand-secondary/10 text-sm font-black text-brand-secondary border border-brand-secondary/30 uppercase tracking-tighter">
                            {notif.target_dept}
                          </span>
                          <span className="text-sm text-danger font-bold group-hover/notif:brightness-110 transition-colors">
                            {notif.message}
                          </span>
                          <span className="text-sm text-foreground font-black">
                            {(notif.created_at && !isNaN(new Date(notif.created_at).getTime())) ? new Date(notif.created_at).toLocaleDateString() : '-'}
                          </span>
                        </div>
                      ))}
                  </div>
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
                    className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border transition-all cursor-pointer select-none group/phase shadow-xl ${
                      phase.completion_status === 'COMPLETED'
                        ? 'bg-success/10 border-success/30 text-success shadow-success/10'
                        : 'bg-background border-border text-muted hover:border-brand-accent/40 hover:text-brand-accent hover:bg-brand-accent/5'
                    }`}
                  >
                    {phase.completion_status === 'COMPLETED' ? <CheckCircle size={18} /> : <Circle size={18} className="group-hover/phase:scale-110 transition-transform" />}
                    <span className="text-sm font-black tracking-widest uppercase">{phase.phase_name}</span>
                  </button>
                ))}
              </div>
            )}

            {project.purpose && (
              <div className="mt-8 text-foreground bg-primary/20 p-6 rounded-3xl border-2 border-border flex flex-col gap-2">
                <span className="text-sm font-black text-abyss uppercase tracking-widest">案號目的</span>
                <p className="text-lg font-bold leading-relaxed">{project.purpose}</p>
              </div>
            )}

          </header>

          {/* 視圖切換器與 WBS/甘特圖內容 (Elevated Z-index to prevent tooltip clipping) */}
          <div className="bg-surface rounded-3xl border-2 border-border shadow-2xl mt-10 p-8 relative z-30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-border pb-6">
              <div className="flex items-center gap-6">
                <h2 className="text-2xl font-black text-foreground">
                  {viewMode === 'table' ? '任務清單 (WBS)' : '專案甘特圖 (Gantt)'}
                </h2>
                <div className="flex bg-background rounded-xl p-1 border border-border">
                  <button 
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black transition-all ${viewMode === 'table' ? 'bg-surface text-abyss shadow-md' : 'text-neutral-400 hover:text-abyss'}`}
                  >
                    <TableIcon size={16} />
                    表格
                  </button>
                  <button 
                    onClick={() => setViewMode('gantt')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black transition-all ${viewMode === 'gantt' ? 'bg-surface text-abyss shadow-md' : 'text-slate-400 hover:text-abyss'}`}
                  >
                    <BarChart2 size={16} />
                    甘特圖
                  </button>
                </div>
              </div>
            </div>
            
            {viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px] border border-border">
                <thead>
                  <tr className="bg-surface text-foreground text-sm font-black uppercase tracking-[0.1em]">
                    <th className="px-4 py-5 w-16 text-center border-b border-r border-border">工作序</th>
                    <th className="px-4 py-5 min-w-[200px] border-b border-r border-border">工作項目</th>
                    <th className="px-4 py-5 w-44 text-center border-b border-r border-border">權責</th>
                    <th className="px-4 py-5 w-36 text-center border-b border-r border-border">狀態</th>
                    <th className="px-4 py-5 w-36 text-center border-b border-r border-border tracking-tighter">預計完成</th>
                    <th className="px-4 py-5 w-36 text-center border-b border-r border-border tracking-tighter">開始日</th>
                    <th className="px-4 py-5 w-36 text-center font-black border-b border-r border-border tracking-tighter">實際完成</th>
                    <th className="px-4 py-5 min-w-[240px] font-black border-b border-r border-border">交付/備註及鏈結</th>
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
                    const topLevelIndex = parseInt((task.wbs_code || "1").split('.')[0], 10);
                    const isMainTask = depth === 1;
                    
                    const rowBgClass = isMainTask ? `bg-surface border-l-4 border-l-abyss` : `bg-surface border-l-4 border-l-transparent`;

                    return (
                      <tr 
                        key={task.id} 
                        className={`transition-colors hover:bg-surface/50 ${isMainTask ? 'bg-background shadow-sm' : ''}`}
                      >
                        <td className={`px-4 py-5 text-center font-black border-b border-r border-border ${isMainTask ? 'text-sm text-foreground' : 'text-sm text-foreground'}`}>
                          {task.wbs_code}
                        </td>
                        <td className={`px-4 py-5 border-b border-r border-border font-bold text-sm ${isMainTask ? 'text-foreground' : 'text-muted'}`}>
                          <div className={`flex items-center gap-3 ${!isMainTask ? 'ml-8' : ''}`}>
                            {!isMainTask && <div className="w-4 h-px bg-border" />}
                            <span className="leading-relaxed">{task.task_name}</span>
                          </div>
                        </td>
                        <td className="px-4 pt-4 pb-2 text-center border-b border-r border-border">
                          <div className="flex flex-col gap-2 items-center justify-center">
                            {!isMainTask && task.dept && (
                              <span className={`px-3 py-1.5 rounded transition-all font-black text-xs uppercase tracking-widest border shadow-sm flex items-center gap-1 ${
                                task.status === 'IN_PROGRESS' 
                                  ? 'bg-brand-accent text-brand-accent-fg border-brand-accent animate-subtle-pulse'
                                  : 'bg-surface border-border text-muted'
                              }`}>
                                {task.status === 'IN_PROGRESS' && <Zap size={12} className="fill-current" />}
                                {task.dept}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center border-b border-r border-border">
                          {updating === task.id ? (
                            <Loader2 size={16} className="animate-spin text-abyss mx-auto" />
                          ) : (
                              <button
                              onClick={() => handleUpdateStatus(task.id, task.status)}
                              disabled={blocked}
                              className={`w-full max-w-[100px] py-1 rounded-full text-xs font-black tracking-widest transition-all border uppercase ${
                                isCompleted
                                  ? 'text-success border-success'
                                    : task.status === 'IN_PROGRESS'
                                    ? 'text-brand-accent border-brand-accent'
                                  : blocked 
                                  ? 'text-muted/50 border-border/50 cursor-not-allowed'
                                  : 'text-muted border-border hover:border-brand-accent hover:text-brand-accent'
                              }`}
                              title={blocked ? `等待前置任務: ${lockedBy}` : ''}
                            >
                              {isCompleted ? '已完成' : task.status === 'IN_PROGRESS' ? '進行中' : '未開始'}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-5 text-center border-b border-r border-border font-black">
                          <div className={`text-sm tabular-nums tracking-tight ${!isCompleted && task.planned_date && new Date(task.planned_date) < new Date() ? 'text-danger' : 'text-muted'}`}>
                            {task.planned_date && !isNaN(new Date(task.planned_date).getTime()) ? new Date(task.planned_date).toLocaleDateString() : '-'}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center text-sm font-black tabular-nums tracking-tight text-muted border-b border-r border-border">
                          {task.start_date ? new Date(task.start_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-5 text-center border-b border-r border-border font-black">
                          <div className={`text-sm tabular-nums tracking-tight ${isCompleted ? 'text-success' : 'text-muted italic'}`}>
                            {task.actual_date && !isNaN(new Date(task.actual_date).getTime()) ? new Date(task.actual_date).toLocaleDateString() : '尚未'}
                          </div>
                        </td>
                        <td className="px-4 py-5 border-b border-r border-border">
                          <div className="flex flex-col gap-2">
                            {task.deliverable && task.deliverable !== 'null' ? (() => {
                              const [display, url] = task.deliverable.split('||');
                              return url ? (
                                <a 
                                  href={url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="flex items-center gap-2 text-sm text-brand-secondary hover:text-brand-primary transition-all font-black underline underline-offset-4 decoration-2"
                                >
                                  <ExternalLink size={14} className="flex-shrink-0" />
                                  <span className="truncate max-w-[240px]">{display}</span>
                                </a>
                              ) : (
                                <div className="flex items-center gap-2 text-sm text-foreground font-bold">
                                  {display}
                                </div>
                              )
                            })() : null}
                            {task.progress && task.progress !== 'null' && task.progress !== '0' ? (
                              <div className="flex items-center gap-1.5 text-sm text-brand-secondary ml-1 font-black uppercase tracking-tighter">
                                進度: {task.progress}%
                              </div>
                            ) : null}
                            {blocked && <span className="text-[10px] font-black text-danger uppercase tracking-widest mt-1 bg-danger/10 px-2 py-0.5 rounded-md">🔒 Locked by {lockedBy}</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {project.tasks?.length === 0 && (
                <div className="text-center py-20 bg-background rounded-b-3xl border-t border-border">
                  <div className="flex flex-col items-center gap-3">
                    <FileDown size={40} className="text-muted" />
                    <p className="text-foreground font-bold">目前無 WBS 子任務資料</p>
                  </div>
                </div>
              )}

              </div>
            ) : (
              /* Gantt Chart View - Cleaned up horizontal scroll and hidden scrollbar artifact */
              <div className="p-4 overflow-x-auto min-h-[500px] relative z-10 no-scrollbar">
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
                      {/* Gantt Overlay (Unified Grid & Today Marker) */}
                      <div className="absolute top-0 bottom-0 pointer-events-none z-0" style={{ left: '20rem', right: 0 }}>
                        {/* Unified Background Vertical Grid Lines */}
                        {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map(p => (
                          <div 
                            key={`unified-bg-grid-${p}`} 
                            className="absolute top-0 bottom-0 border-l border-border/20 z-0"
                            style={{ left: `${p * 100}%` }}
                          />
                        ))}

                        {/* Today Marker Line */}
                        {todayPos > 0 && todayPos < 100 && (
                          <div 
                            className="absolute top-0 bottom-0 w-px bg-red-500 z-[30] shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                            style={{ left: `${todayPos}%` }} 
                          >
                            <div className="absolute top-0 -translate-x-1/2 bg-red-500 text-white text-[10px] px-1 rounded-b font-bold">今天</div>
                          </div>
                        )}
                      </div>

                      {/* Timeline Header (Z-index 40 - Above normal rows, below hovered rows) */}
                      <div className="flex sticky top-0 bg-surface z-40 border-b border-border h-14">
                        <div className="w-80 flex-shrink-0 text-sm font-black text-foreground uppercase tracking-widest pl-4 flex items-center border-r border-border bg-surface">
                          任務詳情 / WBS
                        </div>
                        <div className="flex-1 relative h-full">
                           {/* Date labels only here, grid lines moved to unified overlay */}
                           {[0, 0.2, 0.4, 0.6, 0.8, 1].map(p => (
                             <div 
                               key={p} 
                               className="absolute h-full flex items-center"
                               style={{ left: `${p * 100}%` }}
                             >
                               <span className="ml-2 text-sm text-muted font-black tabular-nums whitespace-nowrap">
                                 {new Date(displayMin + totalRange * p).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}
                               </span>
                             </div>
                           ))}
                        </div>
                      </div>

                      {/* Gantt Rows Container (Tooltips now appear below, so we eliminate redundant top padding) */}
                      <div className="pt-0 pb-40 relative border-x border-b border-border shadow-xl bg-surface">

                        {sortedTasks.map(task => {
                          const isCompleted = task.status === "COMPLETED";
                          const isCritical = criticalPathSet.has(task.id);
                          const isMainTask = task.wbs_code.split('.').length === 1;
                           
                          const rowBgClass = isMainTask ? 'bg-surface border-l-4 border-l-abyss/50' : 'bg-surface border-l-4 border-l-transparent';
                           
                          const tStart = task.start_date ? new Date(task.start_date).getTime() : minD;
                          const planEnd = task.planned_date ? new Date(task.planned_date).getTime() : tStart;
                          const actualEnd = task.actual_date ? new Date(task.actual_date).getTime() : tStart;
                          const tEnd = Math.max(planEnd, actualEnd, tStart + (dayMs / 2));
                           
                          const left = ((tStart - displayMin) / totalRange) * 100;
                          const width = Math.max(((tEnd - tStart) / totalRange) * 100, 1.2); 

                          return (
                            <div key={task.id} className={`flex items-stretch group/gantt hover:bg-seafoam/10 transition-all border-b border-border last:border-0 relative z-10 hover:z-[100] ${rowBgClass}`}>
                              {/* Left Info Column */}
                              <div className="w-80 flex-shrink-0 flex items-center gap-4 pr-6 overflow-hidden pl-4 border-r border-border py-4 min-h-[56px]">
                                <span className={`${isMainTask ? 'text-sm font-black text-abyss' : 'text-sm font-bold text-muted'} w-10 flex-shrink-0 tabular-nums`}>
                                  {task.wbs_code}
                                </span>
                                <span className={`truncate leading-tight font-black ${isMainTask ? 'text-sm uppercase text-foreground' : 'text-sm font-bold text-foreground'} ${isCompleted ? 'opacity-50 line-through' : (isCritical && !isCompleted ? 'text-danger' : '')}`}>
                                  {task.task_name}
                                </span>
                              </div>

                              {/* Right Gantt Area */}
                              <div className="flex-1 relative flex items-center">
                                {/* Task Bar (Z-index 30) */}

                                {/* Task Bar (Z-index 30) */}
                                <div className="w-full h-8 relative z-30 mx-0 px-0">
                                  <div 
                                    className={`absolute h-full rounded-md transition-all flex items-center justify-center shadow-lg group/bar cursor-default border-2 ${
                                      isCompleted 
                                        ? 'bg-emerald-200 border-emerald-400 text-emerald-900' 
                                        : task.status === 'IN_PROGRESS'
                                        ? 'bg-seafoam border-reef text-abyss'
                                        : 'bg-surface border-border text-muted'
                                    } ${isCritical && !isCompleted ? 'animate-pulse border-red-500 scale-[1.02] shadow-xl shadow-red-500/30' : ''}`}
                                    style={{ left: `${left}%`, width: `${width}%` }}
                                  >
                                    {/* Tooltip on Hover (Z-index 110, appearing BELOW the bar) */}
                                    <div className="opacity-0 group-hover/bar:opacity-100 absolute top-full mt-4 left-1/2 -translate-x-1/2 bg-surface border-2 border-border text-sm p-6 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.4)] z-[110] pointer-events-none whitespace-nowrap transition-all transform -translate-y-2 group-hover/bar:translate-y-0 min-w-[320px]">
                                      <div className="font-black border-b border-border/10 mb-5 pb-2 text-abyss text-lg uppercase tracking-tight">{task.task_name}</div>
                                      <div className="space-y-4">
                                        <div className="flex justify-between gap-12"><span className="text-muted font-bold">計畫開始:</span> <span className="text-foreground font-black tabular-nums text-base">{new Date(tStart).toLocaleDateString()}</span></div>
                                        <div className="flex justify-between gap-12"><span className="text-muted font-bold">預計完成:</span> <span className="text-foreground font-black tabular-nums text-base">{task.planned_date ? new Date(task.planned_date).toLocaleDateString() : '-'}</span></div>
                                        {task.actual_date && <div className="flex justify-between gap-12 text-success font-black text-base"><span>實際完成:</span> <span className="tabular-nums">{new Date(task.actual_date).toLocaleDateString()}</span></div>}
                                        <div className="flex justify-between gap-12 pt-4 border-t border-border/10 font-black text-sm uppercase tracking-[0.2em]">
                                            <span className="text-muted tracking-widest">當前狀態</span> 
                                            <span className={isCompleted ? 'text-success bg-success/10 px-3 py-1 rounded-full' : 'text-pelagic bg-pelagic/10 px-3 py-1 rounded-full'}>{isCompleted ? '已完成' : '進行中'}</span>
                                        </div>
                                      </div>
                                    </div>


                                    {width > 3 && (
                                      isCompleted ? <CheckCircle size={16} className="text-emerald-800" /> :
                                      isCritical && <Zap size={14} className="text-red-600" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })() : (
                  <div className="flex flex-col items-center justify-center py-32 bg-background rounded-3xl border border-border gap-4">
                    <BarChart2 size={48} className="text-muted" />
                    <p className="text-muted font-bold">尚未載入 WBS 任務資料，無法生成甘特圖</p>
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
