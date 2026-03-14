// src/components/ConnectionSettingsModal.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, Database, FileSpreadsheet, Key, Save, RefreshCw, Info, Copy, ChevronRight, Folder, FileText, Search, ArrowLeft } from "lucide-react";
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
      const filter = browserType === "folder" 
        ? "application/vnd.google-apps.folder" 
        : undefined;
      
      const files = await googleDriveService.listFiles(parentId, filter);
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
    const newBreadcrumbs = [...breadcrumbs, currentFolder];
    setBreadcrumbs(newBreadcrumbs);
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
    if (browserType === "folder") {
      setFolderId(file.id);
    } else {
      setSheetId(file.id);
    }
    setIsBrowsing(false);
  };

  const handleCreateBackup = async () => {
    if (!googleDriveService.isLoggedIn) {
      alert("請先連接 Google 帳號後再執行此操作。");
      return;
    }

    const currentId = sheetId || googleSheetsService.targetSheet;
    if (!currentId) return;

    if (!window.confirm("系統將會為目前指定的 Master Sheet 建立一份副本存入您的雲端硬碟，並自動切換為該連結。確定執行？")) {
      return;
    }

    setIsCopying(true);
    try {
      const newName = `Validation_Master_Backup_${new Date().toLocaleDateString().replace(/\//g, '-')}`;
      const newId = await googleDriveService.copyFile(currentId, newName);
      setSheetId(newId);
      googleSheetsService.setTargetSheetId(newId);
      alert(`備份成功！新檔案名稱為: ${newName}`);
    } catch (e: any) {
      console.error('Copy failed', e);
      alert(`備份失敗：${e.message || '請確認您是否有該檔案的讀取權限'}`);
    } finally {
      setIsCopying(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!googleDriveService.isLoggedIn) {
      alert("請先連接 Google 帳號後再執行此操作。");
      return;
    }

    if (!window.confirm("系統將會在您的雲端硬碟建立一個專屬資料夾「InjectionPipeline_Data」，並自動將同步路徑切換至該處。確定執行？")) {
      return;
    }

    setIsCreatingFolder(true);
    try {
      const folderId = await googleDriveService.createFolder();
      setFolderId(folderId);
      googleDriveService.setTargetFolderId(folderId);
      alert("資料夾建立成功！同步路徑已更新。");
    } catch (e: any) {
      console.error('Folder creation failed', e);
      alert(`建立失敗：${e.message || '請確認網路連線或授權狀態'}`);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleSave = () => {
    if (clientId) {
      localStorage.setItem('vms_google_client_id', clientId);
    } else {
      localStorage.removeItem('vms_google_client_id');
    }
    googleDriveService.setTargetFolderId(folderId || null);
    googleSheetsService.setTargetSheetId(sheetId || null);

    setIsSaved(true);
    if (onSuccess) onSuccess();
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000);
  };

  const handleReset = () => {
    if (window.confirm("確定要將所有路徑重設為系統預設值嗎？")) {
      setClientId(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "");
      setFolderId("");
      setSheetId("");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/90 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-surface border-2 border-border rounded-2xl shadow-2xl p-6 overflow-hidden min-h-[500px]"
        >
          {/* Main View */}
          <div className={`transition-all duration-300 ${isBrowsing ? '-translate-x-full opacity-0 pointer-events-none absolute' : 'translate-x-0 opacity-100'}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-accent/10 text-brand-accent rounded-xl flex items-center justify-center border border-brand-accent/20">
                  <Settings size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground">連線設定</h2>
                  <p className="text-xs text-muted font-bold">管理 Google Drive 與 Master Sheet 路徑</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowHelp(!showHelp)}
                  className={`p-2 rounded-lg transition-all ${showHelp ? 'bg-brand-accent text-white' : 'bg-background border border-border text-muted hover:text-brand-accent'}`}
                  title="說明手冊"
                >
                  <Info size={20} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-muted hover:text-danger transition-colors rounded-lg hover:bg-danger/10"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showHelp && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-6"
                >
                  <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-black text-brand-accent flex items-center gap-2">
                      <Search size={14} /> 操作導引：
                    </h3>
                    <ul className="text-sm text-foreground/80 space-y-2 font-bold leading-relaxed">
                      <li className="flex gap-2">
                        <span className="text-brand-accent">•</span>
                        <span>使用 <strong className="text-pelagic">挑選</strong> 按鈕可以直接從雲端挑選目前的資料夾或試算表。</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-brand-accent">•</span>
                        <span>若沒有權限同步總表，請點擊 <strong className="text-pelagic">另存副本</strong> 建立您自己的版本。</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-brand-accent">•</span>
                        <span>點擊 <strong className="text-seafoam">建立我的</strong> 可自動在您的雲端建立專屬儲存空間。</span>
                      </li>
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              {/* Google Client ID */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-black text-foreground uppercase tracking-wider">
                  <Key size={16} className="text-brand-accent" />
                  Google Client ID
                </label>
                <input
                  type="text"
                  placeholder="輸入 OAuth 2.0 Client ID..."
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-brand-accent transition-all font-mono"
                />
              </div>

              {/* Folder ID */}
              <div className="space-y-2">
                <label className="flex items-center justify-between text-sm font-black text-foreground uppercase tracking-wider">
                  <span className="flex items-center gap-2">
                    <Database size={16} className="text-brand-accent" />
                    專案儲存資料夾 ID
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenBrowser("folder")}
                      className="text-xs flex items-center gap-1 text-pelagic hover:text-seafoam transition-colors bg-pelagic/10 px-2 py-1 rounded-md border border-pelagic/20 font-black"
                    >
                      <Search size={12} /> 挑選
                    </button>
                    <button
                      onClick={handleCreateFolder}
                      disabled={isCreatingFolder}
                      className="text-xs flex items-center gap-1 text-seafoam hover:text-emerald-400 transition-colors bg-seafoam/10 px-2 py-1 rounded-md border border-seafoam/20 font-black"
                    >
                      {isCreatingFolder ? <RefreshCw size={12} className="animate-spin" /> : <Database size={12} />}
                      {isCreatingFolder ? '建立我的' : '建立我的'}
                    </button>
                  </div>
                </label>
                <input
                  type="text"
                  placeholder="預設：1tSwN6S1Vvkl... (留空使用預設)"
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-brand-accent transition-all font-mono"
                />
              </div>

              {/* Master Sheet ID */}
              <div className="space-y-2">
                <label className="flex items-center justify-between text-sm font-black text-foreground uppercase tracking-wider">
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-brand-accent" />
                    Master Sheet ID
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenBrowser("sheet")}
                      className="text-xs flex items-center gap-1 text-pelagic hover:text-seafoam transition-colors bg-pelagic/10 px-2 py-1 rounded-md border border-pelagic/20 font-black"
                    >
                      <Search size={12} /> 挑選
                    </button>
                    <button
                      onClick={handleCreateBackup}
                      disabled={isCopying}
                      className="text-xs flex items-center gap-1 text-pelagic hover:text-seafoam transition-colors bg-pelagic/10 px-2 py-1 rounded-md border border-pelagic/20 font-black"
                    >
                      {isCopying ? <RefreshCw size={12} className="animate-spin" /> : <Copy size={12} />}
                      {isCopying ? '備份中...' : '另存副本'}
                    </button>
                  </div>
                </label>
                <input
                  type="text"
                  placeholder="預設：1cj6qJdwtle... (留空使用預設)"
                  value={sheetId}
                  onChange={(e) => setSheetId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-brand-accent transition-all font-mono"
                />
              </div>

              <div className="pt-6 flex items-center justify-between gap-4">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 text-sm font-black text-muted hover:text-danger transition-all uppercase tracking-widest"
                >
                  <RefreshCw size={16} />
                  重設預設
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-border text-sm font-black hover:bg-background transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaved}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl font-black text-sm transition-all ${
                      isSaved ? 'bg-success text-white' : 'bg-brand-accent text-white hover:opacity-90 shadow-lg shadow-brand-accent/20'
                    }`}
                  >
                    {isSaved ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                    {isSaved ? '已儲存' : '儲存設定'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Browser View */}
          <div className={`transition-all duration-300 ${!isBrowsing ? 'translate-x-full opacity-0 pointer-events-none absolute' : 'translate-x-0 opacity-100 flex flex-col h-full'}`}>
            <div className="flex items-center gap-3 mb-4">
              <button 
                onClick={handleBack}
                className="p-2 hover:bg-background rounded-lg text-muted transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-lg font-black text-foreground">選擇{browserType === "folder" ? "資料夾" : "試算表"}</h2>
                <p className="text-xs text-muted font-bold truncate max-w-[200px]">{currentFolder.name}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[300px] bg-background/50 rounded-xl border border-border mb-4 p-2 custom-scrollbar">
              {isLoadingFiles ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-muted gap-3">
                  <RefreshCw size={24} className="animate-spin" />
                  <span className="text-sm font-bold">讀取雲端資料中...</span>
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-muted">
                  <Folder size={32} className="opacity-20 mb-2" />
                  <span className="text-sm font-bold">此目錄下無相符項目</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {driveFiles.map((file) => {
                    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                    const isSheet = file.mimeType === 'application/vnd.google-apps.spreadsheet';
                    const isSelectable = (browserType === "folder" && isFolder) || (browserType === "sheet" && isSheet);
                    
                    return (
                      <div 
                        key={file.id}
                        className={`group flex items-center justify-between p-2 rounded-lg transition-all ${isSelectable || isFolder ? 'hover:bg-brand-accent/10 cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                        onClick={() => {
                          if (isFolder) handleNavigate({ id: file.id, name: file.name });
                          else if (isSelectable) handleSelectFile(file);
                        }}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          {isFolder ? (
                            <Folder size={20} className="text-pelagic shrink-0" />
                          ) : (
                            <FileSpreadsheet size={20} className="text-seafoam shrink-0" />
                          )}
                          <span className="text-sm font-bold text-foreground truncate">{file.name}</span>
                        </div>
                        
                        <div className="flex gap-2 shrink-0">
                          {isSelectable && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectFile(file);
                              }}
                              className="px-3 py-1 bg-brand-accent text-white rounded text-xs font-black opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              選取
                            </button>
                          )}
                          {isFolder && <ChevronRight size={18} className="text-muted group-hover:translate-x-1 transition-transform" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-xs text-muted px-1 mt-auto pt-2">
              <span>* 僅列出您有權限存取的項目</span>
              <button onClick={() => setIsBrowsing(false)} className="text-brand-accent font-black hover:underline px-2 py-1">取消</button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
