"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import { googleDriveService } from "@/lib/googleDriveService";
import { googleSheetsService } from "@/lib/googleSheetsService";
import ImportModal from "@/components/ImportModal";
import { ThemeToggle } from '@/components/ThemeToggle';
import { motion } from "framer-motion";
import CreateProjectModal from "@/components/CreateProjectModal";
import ConnectionSettingsModal from "@/components/ConnectionSettingsModal";
import { Plus, FileDown, Loader2, LayoutGrid, Table as TableIcon, CheckCircle, Circle, Trash2, Users, Settings as SettingsIcon } from "lucide-react";
import { projectService } from "@/lib/projectService";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);

  // 初始化 Shared Mode 參數
  useEffect(() => {
    const fId = searchParams.get('folderId');
    const sId = searchParams.get('sheetId');
    if (fId) googleDriveService.setTargetFolderId(fId);
    if (sId) googleSheetsService.setTargetSheetId(sId);
  }, [searchParams]);

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
      // 如果已登入 Google Drive，則優先同步到 Google Sheets
      if (googleDriveService.isLoggedIn) {
        let cleanId = googleSheetsService.targetSheet;
        
        if (!cleanId) {
          const spreadsheetId = window.prompt("請輸入目標 Google Sheets ID (或者貼上網址):");
          if (!spreadsheetId) {
            setExporting(false);
            return;
          }
          cleanId = spreadsheetId;
          if (spreadsheetId.includes('docs.google.com/spreadsheets')) {
            const match = spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (match && match[1]) cleanId = match[1];
          }
        }

        await googleSheetsService.syncToSheet(cleanId!, projects);
        alert("已成功同步至 Google Sheets！");
      } else {
        // 原有的方案 A/B 匯出邏輯
        const USE_API = process.env.NEXT_PUBLIC_USE_API === 'true';
        if (!USE_API) {
          alert("在免伺服器靜態部署模式下且未連接 Google，暫不支援匯出總表功能。請點擊「連接 Google Drive」以直接同步至雲端表格。");
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
      }
    } catch (err) {
      console.error(err);
      alert("匯出失敗: " + (err instanceof Error ? err.message : "未知錯誤"));
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
    
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        await projectService.importData(content);
        await fetchProjects();
        alert('還原成功！雲端資料已同步更新。');
      } catch (err: any) {
        console.error('Restore Error:', err);
        const msg = err.name === 'QuotaExceededError' 
          ? '還原失敗：資源空間不足 (LocalStorage 已滿)。請先嘗試清空部分資料。'
          : `還原失敗：${err.message || '檔案格式錯誤'}`;
        alert(msg);
      } finally {
        setLoading(false);
        // 清空 input 讓同一個檔案可以再次選擇
        e.target.value = '';
      }
    };
    reader.onerror = () => {
      alert('檔案讀取失敗');
      setLoading(false);
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
            <p className="text-muted font-bold tracking-tight text-sm">
              射出成型確效管理系統 (v2.6 - Auto-Pilot)
            </p>
            {googleSheetsService.targetSheet && (
              <div className="mt-1 flex items-center gap-1.5 text-[10px] font-black uppercase text-brand-accent tracking-widest">
                <Users size={12} />
                Shared Team Mode
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button 
              onClick={() => setSettingsModalOpen(true)}
              className="p-2.5 text-muted hover:text-foreground hover:bg-surface border border-transparent hover:border-border rounded-xl transition-all"
              title="連線設定"
            >
              <SettingsIcon size={20} />
            </button>
            <GoogleAuthButton />
            <ThemeToggle />
            <div className="flex gap-2 bg-background p-1 rounded-xl shadow-inner border border-border">
          <button
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-black transition-all ${
              viewMode === 'cards' 
                ? 'bg-surface text-foreground shadow-md border border-border' 
                : 'text-muted hover:text-foreground'
            }`}
          >
            <LayoutGrid size={16} /> <span className="tracking-widest">卡片</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-black transition-all ${
              viewMode === 'table' 
                ? 'bg-surface text-foreground shadow-md border border-border' 
                : 'text-muted hover:text-foreground'
            }`}
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
              className="px-4 py-2.5 rounded-lg bg-surface border-2 border-border text-foreground hover:bg-foreground hover:text-background text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50"
              title={googleDriveService.isLoggedIn ? "存檔至 Google Sheets" : "匯出 Excel (需 API 支援)"}
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
              {googleDriveService.isLoggedIn ? "存檔至總表" : "匯出總表"}
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
            <button onClick={() => setCreateModalOpen(true)} className="px-6 py-2.5 rounded-xl text-sm font-black transition-all bg-brand-accent text-white hover:opacity-90 shadow-lg border border-brand-accent">
              <Plus size={16} className="inline mr-2" />
              建立新專案
            </button>
            <div className="flex gap-1">
              <button 
                onClick={() => setImportModalOpen(true)} 
                className="px-6 py-2.5 rounded-l-xl text-sm font-black transition-all bg-surface text-muted hover:text-foreground border border-border bg-opacity-50 hover:bg-opacity-100 shadow-lg"
              >
                匯入 Master
              </button>
              <button 
                onClick={() => {
                  const sheetUrl = googleSheetsService.targetSheet 
                    ? `https://docs.google.com/spreadsheets/d/${googleSheetsService.targetSheet}/edit`
                    : "https://docs.google.com/spreadsheets/d/1cj6qJdwtle-YxIhLAB4CjXZC3hnFfk7IE31nEpuRfmI/edit";
                  window.open(sheetUrl, '_blank');
                }}
                className="px-3 py-2.5 rounded-r-xl text-sm font-black transition-all bg-surface text-muted hover:text-foreground border-y border-r border-border bg-opacity-50 hover:bg-opacity-100 shadow-lg"
                title="在新視窗開啟 Master Sheet"
              >
                <TableIcon size={16} />
              </button>
            </div>

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

        <ConnectionSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          onSuccess={() => {
            // Re-fetch or reload to apply potential new Client ID or paths
            window.location.reload(); 
          }}
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
            {projects.map((project) => {
              const isCompleted = project.status === 'CLOSED'; // Assuming 'CLOSED' means completed for the project card status
              return (
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
                      <span className="px-3 py-1 rounded-xl text-sm font-black tracking-widest bg-foreground border border-foreground text-background uppercase shadow-sm">
                        {project.type}
                      </span>
                      <span className="px-3 py-1 rounded-xl text-sm font-black tracking-widest bg-surface border border-border text-muted uppercase shadow-sm">
                        Rev. {project.rev}
                      </span>
                      {project.status === "CLOSED" ? (
                        <span className="px-3 py-1 rounded-xl text-sm font-black tracking-widest bg-white text-black border border-white uppercase">
                          已結案
                        </span>
                      ) : project.status === "IN_PROGRESS" ? (
                        <span className="px-3 py-1 rounded-xl text-sm font-black tracking-widest bg-brand-accent/10 border border-brand-accent/30 text-brand-accent uppercase animate-pulse">
                          進行中
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-xl text-sm font-black tracking-widest bg-surface border border-border text-muted uppercase">
                          尚未開始
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl font-black text-foreground mb-3 leading-tight group-hover:text-abyss transition-colors">
                      {project.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm font-bold text-muted mb-6">
                      <div>品號: <span className="text-foreground tracking-tight">{project.part_no}</span></div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                        負責人: 
                        <span className={`tracking-tight px-2 py-0.5 rounded transition-all font-black ${
                          project.status === "IN_PROGRESS" 
                            ? "bg-brand-accent text-brand-accent-fg animate-subtle-pulse" 
                            : "text-foreground"
                        }`}>
                          {project.owner}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-white/40" />目的: <span className="text-foreground tracking-tight line-clamp-1">{project.purpose || '無'}</span></div>
                    </div>

                    {/* Phase Indicators */}
                    {project.phases && project.phases.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {project.phases.map((phase: any) => {
                          const isCompleted = phase.completion_status === 'COMPLETED';
                          return (
                          <div 
                        key={phase.id} 
                        className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-widest text-center border transition-all ${
                          isCompleted 
                            ? 'bg-success/10 text-success border-success/30 shadow-sm'
                            : 'bg-background text-muted border-border'
                        }`}
                      >
                            {phase.phase_name}
                          </div>
                        );})}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 w-full md:w-auto relative z-10">
                    <div className="bg-surface px-6 py-4 rounded-3xl border-2 border-border text-center min-w-[140px] shadow-lg">
                      <div className="text-sm font-black text-muted uppercase tracking-[0.2em] mb-2 text-center">實體進度</div>
                      <div className="text-4xl font-black text-foreground leading-none tabular-nums">
                        {(() => {
                          const totalTasks = project.tasks?.length || 0;
                          const progressSum = project.tasks?.reduce((sum: number, t: any) => sum + (Number(t.progress) || 0), 0) || 0;
                          return totalTasks > 0 ? Math.round(progressSum / totalTasks) : 0;
                        })()}%
                      </div>
                      <div className="text-xs font-black text-muted mt-3 border-t border-border/50 pt-2 tabular-nums flex flex-col gap-1">
                        <div>已完: {project.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0} / {project.tasks?.length || 0}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );})}
          </div>
        ) : (
          /* Simple Table View Mode */
          <div className="bg-surface border border-border mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1200px] bg-surface">
                <thead>
                  <tr className="bg-background text-foreground text-sm font-black uppercase tracking-[0.1em] whitespace-nowrap">
                    <th className="px-4 py-3 w-16 text-center border-b border-r border-border" rowSpan={2}>優先度</th>
                    <th className="px-4 py-3 w-32 text-center border-b border-r border-border" rowSpan={2}>起始日期</th>
                    <th className="px-4 py-3 w-32 border-b border-r border-border" rowSpan={2}>專案類型</th>
                    <th className="px-4 py-3 w-40 border-b border-r border-border" rowSpan={2}>模具號碼</th>
                    <th className="px-4 py-3 w-36 border-b border-r border-border" rowSpan={2}>品號</th>
                    <th className="px-4 py-3 w-24 text-center border-b border-r border-border" rowSpan={2}>版次</th>
                    <th className="px-4 py-3 min-w-[180px] border-b border-r border-border" rowSpan={2}>目的</th>
                    
                    <th className="px-4 py-2 text-center border-b border-r border-border text-xs font-black tracking-widest text-muted" colSpan={6}>
                      程序追蹤
                    </th>
                    
                    <th className="px-4 py-3 w-28 text-center border-b border-r border-border" rowSpan={2}>狀態</th>
                    <th className="px-4 py-3 w-24 text-center border-b border-r border-border" rowSpan={2}>連結</th>
                    <th className="px-4 py-3 w-40 border-b border-r border-border whitespace-nowrap" rowSpan={2}>ECR</th>
                    <th className="px-4 py-3 w-28 border-b border-r border-border whitespace-nowrap" rowSpan={2}>發出人員</th>
                    <th className="px-4 py-3 w-40 border-b border-border whitespace-nowrap" rowSpan={2}>ECN</th>
                  </tr>
                  <tr className="bg-background/50 text-muted text-xs tracking-widest whitespace-nowrap font-black uppercase">
                    <th className="px-3 py-2 text-center w-12 border-b border-r border-border font-black">PD</th>
                    <th className="px-3 py-2 text-center w-12 border-b border-r border-border font-black">FA</th>
                    <th className="px-3 py-2 text-center w-12 border-b border-r border-border font-black">OQ</th>
                    <th className="px-3 py-2 text-center w-12 border-b border-r border-border font-black">PQ</th>
                    <th className="px-3 py-2 text-center w-12 border-b border-r border-border font-black">EC</th>
                    <th className="px-3 py-2 text-center min-w-[64px] border-b border-r border-border font-black">圖面進版</th>
                  </tr>
                </thead>

                <tbody className="">
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

                        <td className="px-4 py-4 text-center border-b border-r border-border">
                          <span className={`inline-block w-6 h-6 leading-6 rounded-full text-xs font-black ${project.priority <= 1 ? 'border border-danger text-danger' : 'border border-muted text-muted'}`}>
                            {project.priority || 3}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-muted text-sm font-black border-b border-r border-border">
                          {project.start_date && !isNaN(new Date(project.start_date).getTime()) ? new Date(project.start_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-5 font-black text-sm tracking-widest text-foreground border-b border-r border-border">
                          {project.type}
                        </td>
                        <td className="px-4 py-5 font-black text-sm tracking-wider text-foreground border-b border-r border-border">
                          {project.project_no}
                        </td>
                        <td className="px-4 py-5 font-black text-sm tracking-wider text-foreground border-b border-r border-border">
                          {project.part_no}
                        </td>
                        <td className="px-4 py-5 text-center font-black text-sm text-foreground border-b border-r border-border">
                          {project.rev}
                        </td>
                        <td className="px-4 py-5 text-sm text-muted font-bold leading-relaxed border-b border-r border-border min-w-[200px]">
                          {project.purpose || "-"}
                        </td>
                        <td className="px-1 py-5 border-b border-r border-border">{renderCheck('PD')}</td>
                        <td className="px-1 py-5 border-b border-r border-border">{renderCheck('FA')}</td>
                        <td className="px-1 py-5 border-b border-r border-border">{renderCheck('OQ')}</td>
                        <td className="px-1 py-5 border-b border-r border-border">{renderCheck('PQ')}</td>
                        <td className="px-1 py-5 border-b border-r border-border">{renderCheck('EC')}</td>
                        <td className="px-1 py-5 border-b border-r border-border">{renderCheck('圖面進版')}</td>
                        <td className="px-4 py-3 text-center border-b border-r border-border">
                          <div className={`px-3 py-1 rounded-full text-xs font-black tracking-widest border flex items-center justify-center gap-1.5 w-max mx-auto whitespace-nowrap ${
                  project.status === 'CLOSED' 
                    ? 'text-success border-success' 
                    : project.status === 'IN_PROGRESS'
                    ? 'text-brand-accent border-brand-accent'
                    : 'text-muted border-border'
                }`}>
                  <Circle size={8} className={
                    project.status === 'CLOSED' ? 'fill-success text-success' :
                    project.status === 'IN_PROGRESS' ? 'fill-brand-accent text-brand-accent animate-pulse' :
                    'fill-muted text-muted'
                  } />
                  {project.status === 'CLOSED' ? '已結案' : project.status === 'IN_PROGRESS' ? '進行中' : '尚未開始'}
                </div>
                        </td>
                        <td className="px-4 py-5 text-center border-b border-r border-border">
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
                        <td className="px-4 py-5 text-muted text-sm border-b border-r border-border">
                          <div className="font-black text-foreground">{(project.ecr_no && String(project.ecr_no).toLowerCase() !== 'true') ? project.ecr_no : "-"}</div>
                          {project.ecr_date && !isNaN(new Date(project.ecr_date).getTime()) && String(project.ecr_no).toLowerCase() !== 'true' && <div className="text-sm font-black text-neutral-500 mt-1 tabular-nums">
                            {new Date(project.ecr_date).toLocaleDateString()}
                          </div>}
                        </td>
                        <td className="px-4 py-5 font-black text-sm border-b border-r border-border whitespace-nowrap">
                          <span className={`px-2 py-1 rounded transition-all ${
                            project.status === 'IN_PROGRESS'
                              ? 'bg-brand-accent text-brand-accent-fg animate-subtle-pulse'
                              : 'text-foreground'
                          }`}>
                            {project.owner || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-muted text-sm border-b border-border">
                          <div className="font-black text-foreground">{(project.ecn_no && String(project.ecn_no).toLowerCase() !== 'true') ? project.ecn_no : "-"}</div>
                          {project.ecn_date && !isNaN(new Date(project.ecn_date).getTime()) && String(project.ecn_no).toLowerCase() !== 'true' && <div className="text-sm font-black text-neutral-500 mt-1 tabular-nums">
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

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-pelagic" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
