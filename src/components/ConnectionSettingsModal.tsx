// src/components/ConnectionSettingsModal.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, Database, FileSpreadsheet, Key, Save, RefreshCw, AlertCircle, Info } from "lucide-react";
import { googleDriveService } from "@/lib/googleDriveService";
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

  useEffect(() => {
    if (isOpen) {
      setClientId(localStorage.getItem('vms_google_client_id') || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "");
      // Get from services which already handle localStorage
      setFolderId(localStorage.getItem('vms_google_folder_id') || "");
      setSheetId(localStorage.getItem('vms_google_sheet_id') || "");
      setIsSaved(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    // 1. Client ID
    if (clientId) {
      localStorage.setItem('vms_google_client_id', clientId);
    } else {
      localStorage.removeItem('vms_google_client_id');
    }

    // 2. Folder ID
    googleDriveService.setTargetFolderId(folderId || null);

    // 3. Sheet ID
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
          className="absolute inset-0 bg-background/90"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-surface border-2 border-border rounded-2xl shadow-2xl p-6"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-brand-accent/10 text-brand-accent rounded-xl flex items-center justify-center border border-brand-accent/20">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground">連線設定</h2>
              <p className="text-xs text-muted font-bold">管理 Google Drive 與 Master Sheet 路徑</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Google Client ID */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-black text-foreground uppercase tracking-wider">
                <Key size={14} className="text-brand-accent" />
                Google Client ID
              </label>
              <input
                type="text"
                placeholder="輸入 OAuth 2.0 Client ID..."
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-brand-accent transition-all font-mono"
              />
              <p className="text-[10px] text-muted font-medium flex items-center gap-1">
                <Info size={10} /> 靜態部署模式下，如果環境變數失效，請手動輸入此 ID。
              </p>
            </div>

            {/* Cloud Folder ID */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-black text-foreground uppercase tracking-wider">
                <Database size={14} className="text-brand-accent" />
                專案儲存資料夾 ID
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
              <label className="flex items-center gap-2 text-xs font-black text-foreground uppercase tracking-wider">
                <FileSpreadsheet size={14} className="text-brand-accent" />
                Master Sheet ID
              </label>
              <input
                type="text"
                placeholder="預設：1cj6qJdwtle... (留空使用預設)"
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-brand-accent transition-all font-mono"
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-4">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 text-xs font-black text-muted hover:text-danger transition-all uppercase tracking-widest"
              >
                <RefreshCw size={14} />
                重設為系統預設
              </button>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-border text-sm font-black hover:bg-background transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaved}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg font-black text-sm transition-all ${
                    isSaved ? 'bg-success text-white' : 'bg-brand-accent text-white hover:opacity-90'
                  }`}
                >
                  {isSaved ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                  {isSaved ? '已儲存' : '儲存設定'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
