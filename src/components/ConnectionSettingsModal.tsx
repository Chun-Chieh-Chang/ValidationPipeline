// src/components/ConnectionSettingsModal.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, Database, FileSpreadsheet, Key, Save, RefreshCw, Info, Copy, ChevronRight, Folder, FileText, Search, ArrowLeft, Cloud, ShieldCheck, Share2 } from "lucide-react";
import { googleDriveService, GoogleDriveFile } from "@/lib/googleDriveService";
import { googleSheetsService } from "@/lib/googleSheetsService";

interface ConnectionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ConnectionSettingsModal({ isOpen, onClose, onSuccess }: ConnectionSettingsModalProps) {
  const [clientId, setClientId] = useState("");
  const [folderId, setFolderId] = useState("");
  const [sheetId, setSheetId] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Browser States
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [browserType, setBrowserType] = useState<"folder" | "sheet">("folder");
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<{ id: string; name: string }>({ id: 'root', name: '我的雲端硬碟' });
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setClientId(localStorage.getItem('vms_google_client_id') || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "");
      setFolderId(localStorage.getItem('vms_google_folder_id') || "");
      setSheetId(localStorage.getItem('vms_google_sheet_id') || "");
      setIsSaved(false);
      setIsBrowsing(false);
      setShowHelp(false);
    }
  }, [isOpen]);

  const fetchDriveFiles = useCallback(async (parentId: string) => {
    if (!googleDriveService.isLoggedIn) {
      alert("請先連接 Google 帳號。");
      return;
    }
    setIsLoadingFiles(true);
    try {
      const files = await googleDriveService.listFiles(parentId, browserType === "folder" ? "application/vnd.google-apps.folder" : undefined);
      setDriveFiles(files);
    } catch (e: any) {
      console.error('Failed to list files', e);
      alert(`讀取失敗：${e.message}`);
    } finally {
      setIsLoadingFiles(false);
    }
  }, [browserType]);

  const handleOpenBrowser = (type: "folder" | "sheet") => {
    setBrowserType(type);
    setIsBrowsing(true);
    setCurrentFolder({ id: 'root', name: '我的雲端硬碟' });
    setBreadcrumbs([]);
    fetchDriveFiles('root');
  };

  const handleNavigate = (folder: { id: string; name: string }) => {
    setBreadcrumbs([...breadcrumbs, currentFolder]);
    setCurrentFolder(folder);
    fetchDriveFiles(folder.id);
  };

  const handleBack = () => {
    if (breadcrumbs.length === 0) {
      setIsBrowsing(false);
      return;
    }
    const newBreadcrumbs = [...breadcrumbs];
    const prevFolder = newBreadcrumbs.pop();
    if (prevFolder) {
      setBreadcrumbs(newBreadcrumbs);
      setCurrentFolder(prevFolder);
      fetchDriveFiles(prevFolder.id);
    }
  };

  const handleSelectFile = (file: GoogleDriveFile) => {
    if (browserType === "folder") setFolderId(file.id);
    else setSheetId(file.id);
    setIsBrowsing(false);
  };

  const handleCreateBackup = async () => {
    if (!googleDriveService.isLoggedIn) { alert("請先連接 Google 帳號。"); return; }
    const currentId = sheetId || googleSheetsService.targetSheet;
    if (!currentId) return;
    if (!window.confirm("系統將會為目前指定的 Master Sheet 建立一份副本存入您的雲端硬碟。確定執行？")) return;
    setIsCopying(true);
    try {
      const newName = `Validation_Master_Backup_${new Date().toLocaleDateString().replace(/\//g, '-')}`;
      const newId = await googleDriveService.copyFile(currentId, newName);
      setSheetId(newId);
      googleSheetsService.setTargetSheetId(newId);
      alert(`備份成功！`);
    } catch (e: any) { alert(`備份失敗：${e.message}`); } finally { setIsCopying(false); }
  };

  const handleCreateFolder = async () => {
    if (!googleDriveService.isLoggedIn) { alert("請先連接 Google 帳號。"); return; }
    if (!window.confirm("系統將會在您的雲端硬碟建立一個專屬資料夾「InjectionPipeline_Data」。確定執行？")) return;
    setIsCreatingFolder(true);
    try {
      const folderId = await googleDriveService.createFolder();
      setFolderId(folderId);
      googleDriveService.setTargetFolderId(folderId);
      alert("資料夾建立成功！");
    } catch (e: any) { alert(`建立失敗：${e.message}`); } finally { setIsCreatingFolder(false); }
  };

  const handleSave = () => {
    if (clientId) localStorage.setItem('vms_google_client_id', clientId);
    else localStorage.removeItem('vms_google_client_id');
    googleDriveService.setTargetFolderId(folderId || null);
    googleSheetsService.setTargetSheetId(sheetId || null);
    setIsSaved(true);
    if (onSuccess) onSuccess();
    setTimeout(() => { setIsSaved(false); onClose(); }, 1000);
  };

  const handleReset = () => {
    if (window.confirm("確定重設預設值？")) {
      setClientId(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "");
      setFolderId(""); setSheetId("");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-background/90 backdrop-blur-sm" />

        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-surface border-2 border-border rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Main View */}
          <div className={`flex flex-col h-full transition-all duration-300 ${isBrowsing ? '-translate-x-full opacity-0 pointer-events-none absolute' : 'translate-x-0 opacity-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-accent/10 text-brand-accent rounded-xl flex items-center justify-center border border-brand-accent/20">
                  <Settings size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground">體系化連線設定</h2>
                  <p className="text-xs text-muted font-bold">按步驟配置雲端連線邏輯</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowHelp(!showHelp)} className={`p-2 rounded-xl transition-all ${showHelp ? 'bg-brand-accent text-white shadow-lg' : 'bg-background border border-border text-muted hover:text-brand-accent'}`}>
                  <Info size={20} />
                </button>
                <button onClick={onClose} className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-xl">
                  <X size={24} />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showHelp && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-2 mb-4">
                  <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-xl p-4 text-sm font-bold space-y-2">
                    <p className="text-brand-accent font-black underline">💡 快速邏輯指南：</p>
                    <p>1. **基礎**：必須填入 Client ID 才能與 Google 伺服器溝通。</p>
                    <p>2. **存檔**：確保您在不同設備登入時，資料能自動同步。</p>
                    <p>3. **報表**：這只是為了產出給長官看的 Excel 表格。</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 overflow-y-auto pr-1 mt-4 space-y-6 custom-scrollbar pb-4">
              {/* Step 1: Auth */}
              <div className="space-y-3">
                <h3 className="text-sm font-black text-brand-accent flex items-center gap-2 uppercase tracking-widest pl-1">
                  <span className="w-6 h-6 rounded-full bg-brand-accent text-white flex items-center justify-center text-[10px]">1</span>
                  基礎認證 (Authentication)
                </h3>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-accent transition-colors">
                    <ShieldCheck size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder="輸入 OAuth 2.0 Client ID..."
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-brand-accent transition-all font-mono"
                  />
                </div>
              </div>

              <div className="w-full h-px bg-border/50" />

              {/* Step 2: Storage */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-pelagic flex items-center gap-2 uppercase tracking-widest pl-1">
                  <span className="w-6 h-6 rounded-full bg-pelagic text-white flex items-center justify-center text-[10px]">2</span>
                  雲端個人存檔空間 (Private Storage)
                </h3>
                <div className="bg-background/50 border border-border rounded-2xl p-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted"> <Cloud size={14} /> 資料夾 ID (存放 vms_data.json) </div>
                    <input
                      type="text"
                      placeholder="留空使用預設"
                      value={folderId}
                      onChange={(e) => setFolderId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-brand-accent font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleOpenBrowser("folder")} className="flex-1 h-10 flex items-center justify-center gap-2 bg-surface hover:bg-background border border-border text-sm font-black rounded-xl transition-all">
                      <Search size={16} /> 挑選空間
                    </button>
                    <button onClick={handleCreateFolder} disabled={isCreatingFolder} className="flex-1 h-10 flex items-center justify-center gap-2 bg-pelagic/10 hover:bg-pelagic/20 border border-pelagic/30 text-sm font-black text-pelagic rounded-xl transition-all">
                      {isCreatingFolder ? <RefreshCw size={16} className="animate-spin" /> : <Database size={16} />}
                      {isCreatingFolder ? '建立中...' : '建立我的空間'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3: Reporting */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-seafoam flex items-center gap-2 uppercase tracking-widest pl-1">
                  <span className="w-6 h-6 rounded-full bg-seafoam text-white flex items-center justify-center text-[10px]">3</span>
                  團隊進度總表匯出 (Team Reporting)
                </h3>
                <div className="bg-background/50 border border-border rounded-2xl p-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted"> <Share2 size={14} /> Master Sheet ID (同步報表用) </div>
                    <input
                      type="text"
                      placeholder="留空使用預設"
                      value={sheetId}
                      onChange={(e) => setSheetId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-brand-accent font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleOpenBrowser("sheet")} className="flex-1 h-10 flex items-center justify-center gap-2 bg-surface hover:bg-background border border-border text-sm font-black rounded-xl transition-all">
                      <Search size={16} /> 挑選試算表
                    </button>
                    <button onClick={handleCreateBackup} disabled={isCopying} className="flex-1 h-10 flex items-center justify-center gap-2 bg-seafoam/10 hover:bg-seafoam/20 border border-seafoam/30 text-sm font-black text-seafoam rounded-xl transition-all">
                      {isCopying ? <RefreshCw size={16} className="animate-spin" /> : <Copy size={16} />}
                      {isCopying ? '作業中...' : '另存新副本'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-6 border-t border-border mt-4 flex items-center justify-between">
              <button onClick={handleReset} className="flex items-center gap-2 text-sm font-black text-muted hover:text-danger uppercase tracking-widest transition-all">
                <RefreshCw size={16} /> 重設
              </button>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-border text-sm font-black hover:bg-background transition-all"> 取消 </button>
                <button onClick={handleSave} disabled={isSaved} className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-black text-sm transition-all shadow-lg ${isSaved ? 'bg-success text-white' : 'bg-brand-accent text-white hover:opacity-90 shadow-brand-accent/20'}`}>
                  {isSaved ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                  {isSaved ? '已儲存' : '儲存體系設定'}
                </button>
              </div>
            </div>
          </div>

          {/* Browser View */}
          <div className={`transition-all duration-300 ${!isBrowsing ? 'translate-x-full opacity-0 pointer-events-none absolute' : 'translate-x-0 opacity-100 flex flex-col h-full'}`}>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={handleBack} className="p-2 hover:bg-background rounded-xl text-muted transition-colors border border-border"><ArrowLeft size={20} /></button>
              <div>
                <h2 className="text-lg font-black text-foreground">挑選{browserType === "folder" ? "空間" : "報表檔案"}</h2>
                <div className="flex items-center gap-1 text-xs text-muted font-bold truncate max-w-[200px]"> <Folder size={12} /> {currentFolder.name} </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-[350px] bg-background/50 rounded-2xl border-2 border-dashed border-border p-2 custom-scrollbar">
              {isLoadingFiles ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-muted gap-3"> <RefreshCw size={32} className="animate-spin text-brand-accent" /> <span className="text-sm font-bold">雲端讀取中...</span> </div>
              ) : driveFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-muted"> <Folder size={48} className="opacity-10 mb-4" /> <span className="text-sm font-bold">無相符項目</span> </div>
              ) : (
                <div className="space-y-1">
                  {driveFiles.map((file) => {
                    const isF = file.mimeType === 'application/vnd.google-apps.folder';
                    const isS = file.mimeType === 'application/vnd.google-apps.spreadsheet';
                    const isSel = (browserType === "folder" && isF) || (browserType === "sheet" && isS);
                    return (
                      <div key={file.id} className={`group flex items-center justify-between p-3 rounded-xl transition-all ${isSel || isF ? 'hover:bg-brand-accent/5 cursor-pointer' : 'opacity-30'}`} onClick={() => { if (isF) handleNavigate({ id: file.id, name: file.name }); else if (isSel) handleSelectFile(file); }}>
                        <div className="flex items-center gap-3 overflow-hidden">
                          {isF ? <Folder size={20} className="text-pelagic shrink-0" /> : <FileSpreadsheet size={20} className="text-seafoam shrink-0" />}
                          <span className="text-sm font-bold truncate">{file.name}</span>
                        </div>
                        {isSel && <button onClick={(e) => { e.stopPropagation(); handleSelectFile(file); }} className="px-4 py-1.5 bg-brand-accent text-white rounded-lg text-xs font-black opacity-0 group-hover:opacity-100 transition-all shadow-md"> 選取 </button>}
                        {isF && <ChevronRight size={18} className="text-muted group-hover:translate-x-1" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-xs text-muted">
              <span>* 僅列出您有權限存取的目錄</span>
              <button onClick={() => setIsBrowsing(false)} className="text-brand-accent font-black hover:bg-brand-accent/10 px-4 py-2 rounded-xl transition-all"> 返回 </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
