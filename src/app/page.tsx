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
        return "bg-[#064E3B] text-emerald-400 border-emerald-500/50";
      case "IN_PROGRESS":
        return "bg-[#0C4A6E] text-sky-400 border-sky-500/50";
      case "PENDING":
      case "NOT_STARTED":
      default:
        return "bg-[#1E293B] text-slate-500 border-slate-700";
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 font-sans selection:bg-sky-900">
      <div className="relative z-10 p-8 max-w-[92%] mx-auto">
        <header className="mb-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
              射出成型確效管理系統
            </h1>
            <p className="text-slate-400">
              模具變更與確效案件即時追蹤 (Validation Pipeline)
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex bg-[#1E293B] rounded-lg p-1 border border-slate-700 mr-2">
              <button 
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'cards' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <TableIcon size={18} />
              </button>
            </div>

            <button 
              onClick={handleClearAllData}
              disabled={loading || projects.length === 0}
              className="px-4 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 backdrop-blur-md border border-red-500/20 text-red-400 text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
              title="一鍵清空所有專案與釋放記憶體"
            >
              <Trash2 size={16} />
              清空資料
            </button>
            <button 
              onClick={handleGlobalExport}
              disabled={exporting || projects.length === 0}
              className="px-4 py-2.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] border border-slate-700 text-slate-300 text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
              匯出總表
            </button>
            <button 
              onClick={() => setCreateModalOpen(true)}
              className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/50 text-white text-sm font-medium transition-all flex items-center gap-2"
            >
              <Plus size={18} />
              建立新專案
            </button>
            <button 
              onClick={() => setImportModalOpen(true)}
              className="px-6 py-2.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] border border-slate-700 text-sm font-medium transition-all"
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
          <div className="text-center text-slate-400 py-12">
            <div className="w-8 h-8 border-2 border-slate-600 border-t-sky-500 rounded-full animate-spin mx-auto mb-4" />
            載入資料中...
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center text-slate-400 py-24 bg-[#1E293B] rounded-3xl border border-slate-700 border-dashed">
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
                whileHover={{ y: -4, scale: 1.005 }}
                transition={{ duration: 0.3 }}
                className="group relative cursor-pointer bg-[#1E293B] rounded-2xl border border-slate-700 p-6 shadow-xl transition-all hover:bg-[#2D3748] hover:shadow-2xl hover:border-slate-600"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex-1 w-full">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl font-bold text-white tracking-wide">
                        {project.project_no}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-[#334155] border border-slate-600 text-slate-300">
                        Rev. {project.rev}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-[#1E3A8A] border border-blue-500/50 text-blue-400">
                        {project.type}
                      </span>
                      {project.status === "CLOSED" && (
                        <span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-[#064E3B] border border-emerald-500/50 text-emerald-400">
                          已結案
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <div>品號: {project.part_no}</div>
                      <div className="w-1 h-1 rounded-full bg-slate-600" />
                      <div>負責人: {project.owner}</div>
                      <div className="w-1 h-1 rounded-full bg-slate-600" />
                      <div>目的: {project.purpose || '無'}</div>
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

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* WBS 進度簡易條 (計算已完成 / 總數) */}
                    <div className="text-right">
                      <div className="text-sm text-slate-400 mb-1">任務進度</div>
                      <div className="text-lg font-bold text-slate-200">
                        {project.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0}
                        <span className="text-slate-500 text-sm mx-1">/</span>
                        {project.tasks?.length || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Table View Mode */
          <div className="bg-[#1E293B] rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1400px] border border-slate-700">
                <thead>
                  <tr className="bg-[#0F172A] text-slate-400 text-sm font-bold uppercase tracking-wider">
                    <th className="px-3 py-3 text-center w-14 border border-slate-700" rowSpan={2}>優先</th>
                    <th className="px-4 py-3 w-32 border border-white/10" rowSpan={2}>起始日期</th>
                    <th className="px-4 py-3 w-28 border border-white/10" rowSpan={2}>專案類型</th>
                    <th className="px-4 py-3 w-36 border border-white/10" rowSpan={2}>模具號碼</th>
                    <th className="px-4 py-3 w-36 border border-white/10" rowSpan={2}>品號</th>
                    <th className="px-3 py-3 text-center w-24 border border-white/10" rowSpan={2}>工程圖面版次</th>
                    <th className="px-4 py-3 min-w-[150px] border border-white/10" rowSpan={2}>目的</th>
                    <th className="px-4 py-2 text-center border border-white/10" colSpan={6}>程序</th>
                    <th className="px-3 py-3 w-24 text-center border border-white/10" rowSpan={2}>狀態</th>
                    <th className="px-3 py-3 w-28 text-center border border-white/10" rowSpan={2}>雲端資料 (連結)</th>
                    <th className="px-4 py-3 w-36 border border-white/10" rowSpan={2}>ECR編號</th>
                    <th className="px-4 py-3 w-28 border border-white/10" rowSpan={2}>發出者</th>
                    <th className="px-4 py-3 w-36 border border-white/10" rowSpan={2}>ECN編號</th>
                  </tr>
                  <tr className="bg-[#0F172A] text-slate-500 text-sm">
                    <th className="px-1 py-1.5 text-center w-12 border border-white/5 font-semibold">PD</th>
                    <th className="px-1 py-1.5 text-center w-12 border border-white/5 font-semibold">FA</th>
                    <th className="px-1 py-1.5 text-center w-12 border border-white/5 font-semibold">OQ</th>
                    <th className="px-1 py-1.5 text-center w-12 border border-white/5 font-semibold">PQ</th>
                    <th className="px-1 py-1.5 text-center w-12 border border-white/5 font-semibold">EC</th>
                    <th className="px-1 py-1 text-center w-16 leading-tight border border-white/5 font-semibold">圖面進版</th>
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
                        className="hover:bg-[#334155] border-b border-slate-700 cursor-pointer transition-colors group"
                      >
                        <td className="px-4 py-4 text-center border-r border-slate-700">
                          <span className={`inline-block w-7 h-7 leading-7 rounded-full text-sm font-bold ${project.priority <= 1 ? 'bg-[#7F1D1D] text-rose-400' : 'bg-[#334155] text-slate-400'}`}>
                            {project.priority || 3}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-400 text-sm border border-white/5">
                          {project.start_date ? new Date(project.start_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-4 border border-white/5">
                          <span className="px-2 py-0.5 rounded-full text-sm bg-blue-500/10 border border-blue-500/20 text-blue-400">
                            {project.type}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-bold text-white group-hover:text-sky-400 transition-colors border border-white/5">
                          {project.project_no}
                        </td>
                        <td className="px-4 py-4 text-slate-300 border border-white/5">
                          {project.part_no}
                        </td>
                        <td className="px-4 py-4 text-center text-slate-400 border border-white/5">
                          {project.rev}
                        </td>
                        <td className="px-4 py-4 text-slate-400 text-sm truncate max-w-[150px] border border-white/5" title={project.purpose}>
                          {project.purpose || "-"}
                        </td>
                        <td className="px-1 py-4 border border-white/5">{renderCheck('PD')}</td>
                        <td className="px-1 py-4 border border-white/5">{renderCheck('FA')}</td>
                        <td className="px-1 py-4 border border-white/5">{renderCheck('OQ')}</td>
                        <td className="px-1 py-4 border border-white/5">{renderCheck('PQ')}</td>
                        <td className="px-1 py-4 border border-white/5">{renderCheck('EC')}</td>
                        <td className="px-1 py-4 border border-white/5">{renderCheck('圖面進版')}</td>
                        <td className="px-4 py-4 text-center border border-white/5">
                          <div className={`text-sm font-bold ${project.status === 'CLOSED' ? 'text-emerald-400' : 'text-sky-400'}`}>
                            {project.status === 'CLOSED' ? '結案' : '進行中'}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center border border-white/5">
                          {project.cloud_link ? (
                            <a 
                              href={project.cloud_link} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              onClick={(e) => e.stopPropagation()}
                              className="text-sky-400 hover:text-sky-300 transition-colors"
                            >
                              <FileDown size={14} className="mx-auto" />
                            </a>
                          ) : <span className="text-slate-700">-</span>}
                        </td>
                        <td className="px-4 py-4 text-slate-400 text-sm border border-white/5">
                          <div className="font-medium text-slate-200">{project.ecr_no || "-"}</div>
                          {project.ecr_date && <div className="text-sm opacity-60 opacity-0 group-hover:opacity-100 transition-opacity">
                            {new Date(project.ecr_date).toLocaleDateString()}
                          </div>}
                        </td>
                        <td className="px-4 py-4 text-slate-300 text-sm border border-white/5">
                          {project.owner}
                        </td>
                        <td className="px-4 py-4 text-slate-400 text-sm border border-white/5">
                          <div className="font-medium text-slate-200">{project.ecn_no || "-"}</div>
                          {project.ecn_date && <div className="text-sm opacity-60 opacity-0 group-hover:opacity-100 transition-opacity">
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
