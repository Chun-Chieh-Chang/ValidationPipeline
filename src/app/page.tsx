"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import ImportModal from "@/components/ImportModal";
import CreateProjectModal from "@/components/CreateProjectModal";
import { Plus, FileDown, Loader2, LayoutGrid, Table as TableIcon, CheckCircle, Circle, Trash2 } from "lucide-react";
import { projectService } from "@/lib/projectService";

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await projectService.getAll();
      setProjects(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalExport = async () => {
    setExporting(true);
    try {
      const USE_API = process.env.NEXT_PUBLIC_USE_API === 'true';
      if (!USE_API) {
        alert("在免伺服器靜態部署模式下，暫不支援匯出總表功能。");
        setExporting(false);
        return;
      }
      const res = await fetch('/api/projects/export');
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Master_Inventory_Report_${new Date().toLocaleDateString()}.xlsx`;
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

  const handleClearAllData = async () => {
    if (window.confirm("【危險操作】這將會清空所有專案資料與釋放記憶體。確定要繼續嗎？")) {
      setLoading(true);
      await projectService.clearAll();
      setProjects([]);
      setLoading(false);
      alert("資料與記憶體已成功清空！");
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const getPhaseColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "CLOSED":
        return "bg-abyss text-white border-abyss";
      case "IN_PROGRESS":
        return "bg-seafoam text-abyss border-reef";
      default:
        return "bg-surface text-muted border-border";
    }
  };

  const handleExportJSON = async () => {
    try {
      const json = await projectService.exportData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VMS_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('備份失敗');
    }
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        await projectService.importData(content);
        await fetchProjects();
        alert('還原成功！');
      } catch (err) {
        alert('還原失敗，請檢查檔案格式');
      }
    };
    reader.readAsText(file);
  };


  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-abyss selection:text-white">
      <div className="relative z-10 p-8 max-w-[92%] mx-auto">
        <header className="mb-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground mb-1">
              Injection <span className="text-pelagic">Pipeline</span>
            </h1>
            <p className="text-muted font-bold tracking-tight">
              射出成型確效管理系統 (v2.0 - FatPandaVision)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-surface rounded-2xl p-1 border border-border mr-2 shadow-inner">
              <button 
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-2 px-3 ${viewMode === 'cards' ? 'bg-abyss text-white shadow-sm' : 'text-muted hover:text-abyss'}`}
              >
                <LayoutGrid size={16} />
                <span className="text-sm font-black uppercase">卡片</span>
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-2 px-3 ${viewMode === 'table' ? 'bg-abyss text-white shadow-sm' : 'text-muted hover:text-abyss'}`}
              >
                <TableIcon size={16} />
                <span className="text-sm font-black uppercase">表格</span>
              </button>
            </div>


            <button 
              onClick={handleClearAllData}
              disabled={loading || projects.length === 0}
              className="px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 border-2 border-red-700 text-white text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50"
              title="一鍵清空所有專案與釋放記憶體"
            >
              <Trash2 size={16} />
              清空資料
            </button>
            <button 
              onClick={handleGlobalExport}
              disabled={exporting || projects.length === 0}
              className="px-4 py-2.5 rounded-lg bg-surface hover:bg-seafoam dark:hover:bg-slate-800 border-2 border-border text-foreground text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
              匯出總表
            </button>
            <button 
              onClick={handleExportJSON}
              className="px-4 py-2.5 rounded-lg bg-surface border-2 border-border text-foreground text-sm font-bold transition-all flex items-center gap-2"
              title="導出 JSON 備份檔"
            >
              備份
            </button>
            <label className="px-4 py-2.5 rounded-lg bg-surface border-2 border-border text-foreground text-sm font-bold transition-all flex items-center gap-2 cursor-pointer">
              還原
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
            <button 
              onClick={() => setCreateModalOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-abyss text-white text-sm font-black transition-all flex items-center gap-2 shadow-xl hover:opacity-90 active:scale-95"
            >
              <Plus size={18} />
              建立新專案
            </button>
            <button 
              onClick={() => setImportModalOpen(true)}
              className="px-6 py-2.5 rounded-lg bg-surface border-2 border-pelagic text-abyss hover:bg-seafoam font-bold text-sm transition-all"
            >
              匯入 Master
            </button>

          </div>
        </header>

        <ImportModal 
          isOpen={isImportModalOpen} 
          onClose={() => setImportModalOpen(false)} 
          onSuccess={() => fetchProjects()} 
        />

        <CreateProjectModal
          isOpen={isCreateModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={() => fetchProjects()}
        />

        {loading ? (
          <div className="text-center py-24 text-muted">
            <div className="w-10 h-10 border-4 border-seafoam border-t-pelagic rounded-full animate-spin mx-auto mb-4" />
            載入資料中...
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center text-muted py-24 bg-surface rounded-3xl border border-border border-dashed font-bold text-sm">
            目前尚無專案資料，請點擊上方按鈕匯入 Excel。
          </div>
        ) : viewMode === 'cards' ? (
          <div className="space-y-6">
            {projects.map((project) => (
              <motion.div
                key={project.id}
                onClick={() => router.push(`/projects/view?id=${project.id}`)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -6, scale: 1.01 }}
                transition={{ duration: 0.3 }}
                className="group relative cursor-pointer bg-surface rounded-2xl border border-border p-6 shadow-xl transition-all hover:shadow-2xl hover:border-pelagic"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
                  <div className="flex-1 w-full relative z-10">
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      <span className="text-2xl font-black text-abyss tracking-tight">
                        {project.project_no}
                      </span>
                      <span className="px-3 py-1 rounded-xl text-sm font-black tracking-widest bg-seafoam border border-reef text-abyss uppercase">
                        {project.type}
                      </span>
                      <span className="px-3 py-1 rounded-xl text-sm font-black tracking-widest bg-surface border border-border text-muted uppercase shadow-sm">
                        Rev. {project.rev}
                      </span>
                      {project.status === "CLOSED" ? (
                        <span className="px-3 py-1 rounded-xl text-sm font-black tracking-widest bg-success/10 border border-success/30 text-success uppercase">
                          Completed
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-xl text-sm font-black tracking-widest bg-danger/10 border border-danger/30 text-danger uppercase animate-pulse">
                          Active
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl font-black text-foreground mb-3 leading-tight group-hover:text-abyss transition-colors">
                      {project.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm font-bold text-muted mb-6">
                      <div>品號: <span className="text-foreground tracking-tight">{project.part_no}</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-pelagic/40" />負責人: <span className="text-foreground tracking-tight">{project.owner}</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-pelagic/40" />目的: <span className="text-foreground tracking-tight line-clamp-1">{project.purpose || '無'}</span></div>
                    </div>

                    {/* Phase Indicators */}
                    {project.phases && project.phases.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {project.phases.map((phase: any) => (
                          <div 
                            key={phase.id}
                            className={`px-3 py-1 rounded-xl text-sm font-black uppercase transition-all border ${
                              phase.completion_status === 'COMPLETED' 
                                ? 'bg-success text-white border-success' 
                                : 'bg-surface text-muted border-border'
                            }`}
                          >
                            {phase.phase_name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 w-full md:w-auto relative z-10">
                    <div className="bg-surface px-6 py-4 rounded-3xl border-2 border-border text-center min-w-[140px] shadow-lg">
                      <div className="text-sm font-black text-muted uppercase tracking-[0.2em] mb-2 text-center">任務進度</div>
                      <div className="text-4xl font-black text-foreground leading-none tabular-nums">
                        {Math.round(((project.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0) / (project.tasks?.length || 1)) * 100)}%
                      </div>
                      <div className="text-sm font-black text-muted mt-3 border-t border-border/50 pt-2 tabular-nums">
                        {project.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0} / {project.tasks?.length || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Table View Mode */
          <div className="bg-surface rounded-2xl border border-border shadow-2xl overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[1500px] border border-border">
                <thead>
                  <tr className="bg-background text-white text-sm font-black uppercase tracking-[0.1em]">
                    <th className="px-3 py-4 text-center w-14 border-r border-border" rowSpan={2}>優先</th>
                    <th className="px-4 py-4 w-32 border-r border-border" rowSpan={2}>起始日期</th>
                    <th className="px-4 py-4 w-28 border-r border-border" rowSpan={2}>專案類型</th>
                    <th className="px-4 py-4 w-40 border-r border-border" rowSpan={2}>模具號碼</th>
                    <th className="px-4 py-4 w-40 border-r border-border" rowSpan={2}>品號</th>
                    <th className="px-3 py-4 text-center w-24 border-r border-border" rowSpan={2}>版次</th>
                    <th className="px-4 py-4 min-w-[180px] border-r border-border" rowSpan={2}>目的</th>
                    <th className="px-4 py-2 text-center border-b border-r border-border" colSpan={6}>程序追蹤</th>
                    <th className="px-3 py-4 w-24 text-center border-r border-border" rowSpan={2}>狀態</th>
                    <th className="px-3 py-4 w-28 text-center border-r border-border" rowSpan={2}>連結</th>
                    <th className="px-4 py-4 w-40 border-r border-border" rowSpan={2}>ECR</th>
                    <th className="px-4 py-4 w-28 border-r border-border" rowSpan={2}>人員</th>
                    <th className="px-4 py-4 w-40" rowSpan={2}>ECN</th>
                  </tr>
                  <tr className="bg-[#1e293b] text-slate-200 text-sm font-black uppercase">
                    <th className="px-1 py-1.5 text-center w-12 border-r border-border font-black">PD</th>
                    <th className="px-1 py-1.5 text-center w-12 border-r border-border font-black">FA</th>
                    <th className="px-1 py-1.5 text-center w-12 border-r border-border font-black">OQ</th>
                    <th className="px-1 py-1.5 text-center w-12 border-r border-border font-black">PQ</th>
                    <th className="px-1 py-1.5 text-center w-12 border-r border-border font-black">EC</th>
                    <th className="px-1 py-1.5 text-center w-12 border-r border-border font-black">圖進</th>
                  </tr>
                </thead>

                <tbody className="text-sm">
                  {projects.map((project) => {
                    const getPhase = (name: string) => project.phases?.find((p: any) => p.phase_name === name);
                    const renderCheck = (name: string) => {
                      const ph = getPhase(name);
                      if (!ph) return "-";
                      return ph.completion_status === 'COMPLETED' ? (
                        <CheckCircle size={14} className="text-success mx-auto" />
                      ) : (
                        <Circle size={14} className="text-muted/30 mx-auto" />
                      );
                    };

                    return (
                      <tr 
                        key={project.id}
                        onClick={() => router.push(`/projects/view?id=${project.id}`)}
                        className="hover:bg-background cursor-pointer transition-colors group"
                      >

                        <td className="px-4 py-5 text-center border-r border-border">
                          <span className={`inline-block w-8 h-8 leading-8 rounded-full text-sm font-black ${project.priority <= 1 ? 'bg-danger/10 text-danger border border-danger/30' : 'bg-surface border border-border text-muted'}`}>
                            {project.priority || 3}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-muted text-sm font-black border-l border-border">
                          {project.start_date ? new Date(project.start_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-5 border-l border-border">
                          <span className="px-3 py-1 rounded-xl text-sm font-black bg-seafoam text-abyss border border-reef uppercase shadow-sm">
                            {project.type}
                          </span>
                        </td>
                        <td className="px-4 py-5 font-black text-abyss group-hover:underline border-l border-border tracking-tight">
                          {project.project_no}
                        </td>
                        <td className="px-4 py-5 text-foreground font-black border-l border-border">
                          {project.part_no}
                        </td>
                        <td className="px-4 py-5 text-center text-foreground font-black border-l border-border">
                          {project.rev}
                        </td>
                        <td className="px-4 py-5 text-muted text-sm font-bold truncate max-w-[200px] border-l border-border" title={project.purpose}>
                          {project.purpose || "-"}
                        </td>
                        <td className="px-1 py-5 border-l border-border">{renderCheck('PD')}</td>
                        <td className="px-1 py-5 border-l border-border">{renderCheck('FA')}</td>
                        <td className="px-1 py-5 border-l border-border">{renderCheck('OQ')}</td>
                        <td className="px-1 py-5 border-l border-border">{renderCheck('PQ')}</td>
                        <td className="px-1 py-5 border-l border-border">{renderCheck('EC')}</td>
                        <td className="px-1 py-5 border-l border-border">{renderCheck('圖面進版')}</td>
                        <td className="px-4 py-5 text-center border-l border-border">
                          <div className={`text-sm font-black px-3 py-1 rounded-xl border-2 ${project.status === 'CLOSED' ? 'bg-success/10 text-success border-success/30' : 'bg-seafoam text-abyss border-reef'}`}>
                            {project.status === 'CLOSED' ? '結案' : '進行中'}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center border-l border-border">
                          {project.cloud_link ? (
                            <a 
                              href={project.cloud_link} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              onClick={(e) => e.stopPropagation()}
                              className="text-pelagic hover:text-abyss transition-colors"
                            >
                              <FileDown size={18} className="mx-auto" />
                            </a>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-4 py-5 text-muted text-sm border-l border-border">
                          <div className="font-black text-pelagic">{(project.ecr_no && String(project.ecr_no).toLowerCase() !== 'true') ? project.ecr_no : "-"}</div>
                          {project.ecr_date && String(project.ecr_no).toLowerCase() !== 'true' && <div className="text-sm font-black text-muted mt-1 tabular-nums">
                            {new Date(project.ecr_date).toLocaleDateString()}
                          </div>}
                        </td>
                        <td className="px-4 py-5 text-foreground font-black text-sm border-l border-border">
                          {project.owner}
                        </td>
                        <td className="px-4 py-5 text-muted text-sm border-l border-border">
                          <div className="font-black text-foreground">{(project.ecn_no && String(project.ecn_no).toLowerCase() !== 'true') ? project.ecn_no : "-"}</div>
                          {project.ecn_date && String(project.ecn_no).toLowerCase() !== 'true' && <div className="text-sm font-black text-muted mt-1 tabular-nums">
                            {new Date(project.ecn_date).toLocaleDateString()}
                          </div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
