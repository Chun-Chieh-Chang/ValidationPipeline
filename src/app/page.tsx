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
        return "bg-brand-primary text-white border-brand-primary";
      case "IN_PROGRESS":
        return "bg-brand-secondary/20 text-brand-primary border-brand-secondary/40";
      case "PENDING":
      case "NOT_STARTED":
      default:
        return "bg-slate-50 text-slate-400 border-slate-200";
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-brand-primary/20">
      <div className="relative z-10 p-8 max-w-[92%] mx-auto">
        <header className="mb-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground mb-1">
              Injection <span className="text-brand-primary">Pipeline</span>
            </h1>
            <p className="text-slate-500 font-medium">
              射出成型確效管理系統 (v2.0 - FatPandaVision)
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex bg-brand-accent/30 rounded-xl p-1 border border-brand-secondary/20 mr-2">
              <button 
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500 hover:text-brand-primary'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500 hover:text-brand-primary'}`}
              >
                <TableIcon size={18} />
              </button>
            </div>

            <button 
              onClick={handleClearAllData}
              disabled={loading || projects.length === 0}
              className="px-4 py-2.5 rounded-lg bg-red-50 text-red-500 border border-red-100 text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50 hover:bg-red-100"
              title="一鍵清空所有專案與釋放記憶體"
            >
              <Trash2 size={16} />
              清空資料
            </button>
            <button 
              onClick={handleGlobalExport}
              disabled={exporting || projects.length === 0}
              className="px-4 py-2.5 rounded-lg bg-brand-accent/20 hover:bg-brand-accent/40 border border-brand-secondary/20 text-brand-primary text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
              匯出總表
            </button>
            <button 
              onClick={() => setCreateModalOpen(true)}
              className="px-6 py-2.5 rounded-lg bg-brand-primary hover:shadow-lg hover:shadow-brand-primary/20 text-white text-sm font-bold transition-all flex items-center gap-2"
            >
              <Plus size={18} />
              建立新專案
            </button>
            <button 
              onClick={() => setImportModalOpen(true)}
              className="px-6 py-2.5 rounded-lg bg-white border-2 border-brand-accent text-brand-primary hover:bg-brand-accent/10 font-bold text-sm transition-all"
            >
              匯入 Master Sheet
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
          <div className="text-center py-24 text-slate-500">
            <div className="w-10 h-10 border-4 border-brand-accent border-t-brand-primary rounded-full animate-spin mx-auto mb-4" />
            載入資料中...
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center text-slate-400 py-24 bg-white rounded-3xl border-2 border-brand-accent border-dashed max-w-4xl mx-auto shadow-sm">
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
                className="group relative cursor-pointer bg-white rounded-3xl border border-brand-secondary/20 p-8 shadow-xl hover:shadow-2xl hover:border-brand-primary/40 transition-all overflow-hidden"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
                  <div className="flex-1 w-full relative z-10">
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      <span className="text-2xl font-black text-brand-primary tracking-tight">
                        {project.project_no}
                      </span>
                      <span className="px-3 py-1 rounded-xl text-xs font-black tracking-widest bg-brand-accent/30 border border-brand-secondary/10 text-brand-primary uppercase">
                        {project.type}
                      </span>
                      <span className="px-3 py-1 rounded-xl text-xs font-black tracking-widest bg-slate-50 border border-slate-200 text-slate-500 uppercase">
                        Rev. {project.rev}
                      </span>
                      {project.status === "CLOSED" ? (
                        <span className="px-3 py-1 rounded-xl text-xs font-black tracking-widest bg-emerald-50 border border-emerald-100 text-emerald-600 uppercase">
                          Completed
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-xl text-xs font-black tracking-widest bg-brand-peach/20 border border-brand-peach/40 text-[#D87D3A] uppercase animate-pulse">
                          Active
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl font-black text-foreground mb-3 leading-tight group-hover:text-brand-primary transition-colors">
                      {project.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm font-bold text-slate-500 mb-6">
                      <div>品號: <span className="text-foreground">{project.part_no}</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-slate-300" />負責人: <span className="text-foreground">{project.owner}</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-slate-300" />目的: <span className="text-foreground line-clamp-1">{project.purpose || '無'}</span></div>
                    </div>

                    {/* Phase Indicators */}
                    {project.phases && project.phases.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {project.phases.map((phase: any) => (
                          <div 
                            key={phase.id}
                            className={`px-2 py-0.5 rounded text-sm font-bold uppercase transition-all border ${
                              phase.completion_status === 'COMPLETED' 
                                ? 'bg-[#064E3B] text-emerald-400 border-emerald-500/50' 
                                : 'bg-[#334155] text-slate-500 border-slate-700'
                            }`}
                          >
                            {phase.phase_name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 w-full md:w-auto relative z-10">
                    <div className="bg-brand-accent/20 px-6 py-4 rounded-3xl border border-brand-secondary/10 text-center min-w-[140px]">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">任務進度</div>
                      <div className="text-3xl font-black text-brand-primary leading-none">
                        {Math.round(((project.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0) / (project.tasks?.length || 1)) * 100)}%
                      </div>
                      <div className="text-[11px] font-bold text-slate-500 mt-1">
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
          <div className="bg-white rounded-3xl border border-brand-secondary/20 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1400px]">
                <thead>
                  <tr className="bg-brand-accent/30 text-brand-primary text-xs font-black uppercase tracking-widest">
                    <th className="px-3 py-5 text-center w-14 border-b border-brand-secondary/10" rowSpan={2}>優先</th>
                    <th className="px-4 py-5 w-32 border-b border-l border-brand-secondary/10" rowSpan={2}>起始日期</th>
                    <th className="px-4 py-5 w-28 border-b border-l border-brand-secondary/10" rowSpan={2}>專案類型</th>
                    <th className="px-4 py-5 w-36 border-b border-l border-brand-secondary/10" rowSpan={2}>模具號碼</th>
                    <th className="px-4 py-5 w-36 border-b border-l border-brand-secondary/10" rowSpan={2}>品號</th>
                    <th className="px-3 py-5 text-center w-24 border-b border-l border-brand-secondary/10" rowSpan={2}>工程圖面版次</th>
                    <th className="px-4 py-5 min-w-[150px] border-b border-l border-brand-secondary/10" rowSpan={2}>目的</th>
                    <th className="px-4 py-3 text-center border-b border-l border-brand-secondary/10" colSpan={6}>程序燈號 (Phases)</th>
                    <th className="px-3 py-5 w-24 text-center border-b border-l border-brand-secondary/10" rowSpan={2}>狀態</th>
                    <th className="px-3 py-5 w-28 text-center border-b border-l border-brand-secondary/10" rowSpan={2}>雲端資料</th>
                    <th className="px-4 py-5 w-36 border-b border-l border-brand-secondary/10" rowSpan={2}>ECR編號</th>
                    <th className="px-4 py-5 w-28 border-b border-l border-brand-secondary/10" rowSpan={2}>負責人</th>
                    <th className="px-4 py-5 w-36 border-b border-l border-brand-secondary/10" rowSpan={2}>ECN編號</th>
                  </tr>
                  <tr className="bg-brand-accent/10 text-slate-500 text-[10px] font-black tracking-tighter">
                    <th className="px-1 py-2 text-center w-12 border-l border-brand-secondary/5">PD</th>
                    <th className="px-1 py-2 text-center w-12 border-l border-brand-secondary/5">FA</th>
                    <th className="px-1 py-2 text-center w-12 border-l border-brand-secondary/5">OQ</th>
                    <th className="px-1 py-2 text-center w-12 border-l border-brand-secondary/5">PQ</th>
                    <th className="px-1 py-2 text-center w-12 border-l border-brand-secondary/5">EC</th>
                    <th className="px-1 py-2 text-center w-16 leading-tight border-l border-brand-secondary/5">圖面進版</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {projects.map((project) => {
                    const getPhase = (name: string) => project.phases?.find((p: any) => p.phase_name === name);
                    const renderCheck = (name: string) => {
                      const ph = getPhase(name);
                      if (!ph) return "-";
                      return ph.completion_status === 'COMPLETED' ? (
                        <CheckCircle size={14} className="text-emerald-400 mx-auto" />
                      ) : (
                        <Circle size={14} className="text-slate-700 mx-auto" />
                      );
                    };

                    return (
                      <tr 
                        key={project.id}
                        onClick={() => router.push(`/projects/view?id=${project.id}`)}
                        className="hover:bg-brand-accent/5 border-b border-brand-secondary/5 cursor-pointer transition-colors group"
                      >
                        <td className="px-4 py-5 text-center border-r border-brand-secondary/5">
                          <span className={`inline-block w-8 h-8 leading-8 rounded-full text-xs font-black ${project.priority <= 1 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}>
                            {project.priority || 3}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-slate-500 text-sm font-bold border-l border-brand-secondary/5">
                          {project.start_date ? new Date(project.start_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-5 border-l border-brand-secondary/5">
                          <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-brand-accent/20 text-brand-primary border border-brand-secondary/10 uppercase">
                            {project.type}
                          </span>
                        </td>
                        <td className="px-4 py-5 font-black text-brand-primary group-hover:underline border-l border-brand-secondary/5">
                          {project.project_no}
                        </td>
                        <td className="px-4 py-5 text-foreground font-black border-l border-brand-secondary/5">
                          {project.part_no}
                        </td>
                        <td className="px-4 py-5 text-center text-slate-500 font-bold border-l border-brand-secondary/5">
                          {project.rev}
                        </td>
                        <td className="px-4 py-5 text-slate-500 text-sm font-medium truncate max-w-[150px] border-l border-brand-secondary/5" title={project.purpose}>
                          {project.purpose || "-"}
                        </td>
                        <td className="px-1 py-5 border-l border-brand-secondary/5">{renderCheck('PD')}</td>
                        <td className="px-1 py-5 border-l border-brand-secondary/5">{renderCheck('FA')}</td>
                        <td className="px-1 py-5 border-l border-brand-secondary/5">{renderCheck('OQ')}</td>
                        <td className="px-1 py-5 border-l border-brand-secondary/5">{renderCheck('PQ')}</td>
                        <td className="px-1 py-5 border-l border-brand-secondary/5">{renderCheck('EC')}</td>
                        <td className="px-1 py-5 border-l border-brand-secondary/5">{renderCheck('圖面進版')}</td>
                        <td className="px-4 py-5 text-center border-l border-brand-secondary/5">
                          <div className={`text-xs font-black px-2 py-1 rounded-lg ${project.status === 'CLOSED' ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-accent/30 text-brand-primary'}`}>
                            {project.status === 'CLOSED' ? '結案' : '進行中'}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center border-l border-brand-secondary/5">
                          {project.cloud_link ? (
                            <a 
                              href={project.cloud_link} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              onClick={(e) => e.stopPropagation()}
                              className="text-brand-primary hover:text-brand-primary/70 transition-colors"
                            >
                              <FileDown size={18} className="mx-auto" />
                            </a>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-4 py-5 text-slate-500 text-sm border-l border-brand-secondary/5">
                          <div className="font-black text-brand-primary">{project.ecr_no || "-"}</div>
                          {project.ecr_date && <div className="text-[11px] font-bold text-slate-400 mt-0.5">
                            {new Date(project.ecr_date).toLocaleDateString()}
                          </div>}
                        </td>
                        <td className="px-4 py-5 text-foreground font-bold text-sm border-l border-brand-secondary/5">
                          {project.owner}
                        </td>
                        <td className="px-4 py-5 text-slate-500 text-sm border-l border-brand-secondary/5">
                          <div className="font-black text-slate-700">{project.ecn_no || "-"}</div>
                          {project.ecn_date && <div className="text-[11px] font-bold text-slate-400 mt-0.5">
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
