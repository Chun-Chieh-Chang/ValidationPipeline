"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, X, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { parseExcelData } from "@/lib/excelParser";
import { projectService } from "@/lib/projectService";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string>("https://docs.google.com/spreadsheets/d/1cj6qJdwtle-YxIhLAB4CjXZC3hnFfk7IE31nEpuRfmI/edit?usp=drive_link");
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentCount, setCurrentCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const handleClear = async () => {
    if (window.confirm("【危險操作】這將會清空所有專案資料並重設目前欄位。確定要繼續嗎？")) {
      await projectService.clearAll();
      setFile(null);
      setUrl("");
      setStatus('idle');
      setErrorMessage(null);
      setSuccessMessage(null);
      setCurrentCount(0);
      setTotalCount(0);
      
      // Notify dashboard to refresh
      onSuccess();

      // Reset the file input element so the same file could be selected again
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    }
  };


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUrl(""); // Clear URL if file is selected
      setStatus('idle');
      setErrorMessage(null);
      setSuccessMessage(null);
      setCurrentCount(0);
      setTotalCount(0);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    setErrorMessage(null);
    setSuccessMessage(null);
    setCurrentCount(0);
    setTotalCount(0);

    const USE_API = process.env.NEXT_PUBLIC_USE_API === 'true';

    try {
      // 方案 B 處理: 嘗試透過 API，若失效則在瀏覽器端直解
      const formData = new FormData();
      formData.append("file", file);
      
      let success = false;
      let count = 0;

      if (USE_API) {
        try {
          const res = await fetch("/api/import", {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              count = data.records;
              success = true;
            }
          }
        } catch (apiErr) {
          // API failed (e.g. GitHub pages static export)
        }
      }

      if (!success) {
        console.log("Fallback to client-side parsing...");
        const buffer = await file.arrayBuffer();
        const projects = await parseExcelData(buffer);
        
        setTotalCount(projects.length);
        for (let i = 0; i < projects.length; i++) {
          await projectService.save(projects[i]);
          setCurrentCount(i + 1);
        }
        count = projects.length;
        success = true;
      }

      if (success) {
        setSuccessMessage(`成功匯入 ${count} 筆專案資料！`);
        setStatus('success');
        setTimeout(() => {
          onSuccess();
          onClose();
          setStatus('idle');
          setFile(null);
        }, 1500);
      } else {
        throw new Error("匯入失敗");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "上傳失敗，請檢查檔案格式是否相符。");
      setStatus('error');
    }
  };

  const handleURLImport = async () => {
    if (!url) return;
    setStatus('uploading');
    setErrorMessage(null);
    setSuccessMessage(null);
    setCurrentCount(0);
    setTotalCount(0);

    const USE_API = process.env.NEXT_PUBLIC_USE_API === 'true';

    try {
      let downloadUrl = url;
      if (url.includes('docs.google.com/spreadsheets')) {
        const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
            downloadUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=xlsx`;
        }
      }

      if (!USE_API) {
        // 在前端直接解析 URL：需透過多層 CORS Proxy 繞過瀏覽器跨域限制 (因為 Google export 網址禁止跨域)
        // 確保此 Google Sheet 必須是「知道連結的使用者皆可檢視」的公開共用狀態
        let res;
        let successProxy = null;
        
        const proxies = [
          `https://api.codetabs.com/v1/proxy?quest=${downloadUrl}`,
          `https://api.allorigins.win/raw?url=${encodeURIComponent(downloadUrl)}`,
          `https://corsproxy.io/?${encodeURIComponent(downloadUrl)}`
        ];

        for (const proxy of proxies) {
          try {
            const attempt = await fetch(proxy);
            if (attempt.ok) {
              res = attempt;
              successProxy = proxy;
              break;
            }
          } catch (e) {
            console.warn("Proxy failed:", proxy);
          }
        }
        
        if (!res || !res.ok) {
          throw new Error("無法下載該網址內容。請確認是否為 Google Sheet 且共用權限已設為「知道連結的使用者皆可檢視」，或是各大代理伺服器目前皆遭 Google 阻擋。建議您在靜態環境下直接使用手動檔案上傳即可。");
        }

        const buffer = await res.arrayBuffer();
        const projects = await parseExcelData(buffer);
        
        setTotalCount(projects.length);
        for (let i = 0; i < projects.length; i++) {
          await projectService.save(projects[i]);
          setCurrentCount(i + 1);
        }
        
        setSuccessMessage(`成功匯入 ${projects.length} 筆專案資料！`);
        setStatus('success');
        setTimeout(() => {
          onSuccess();
          onClose();
          setStatus('idle');
          setUrl('');
        }, 2000);
        return;
      }

      // 嘗試呼叫方案 A API
      const res = await fetch('/api/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        // 因靜態頁面無法使用 API，直接報錯提示使用者
        if (res.status === 404) {
          throw new Error('在免伺服器靜態部署模式下，無法直接解析 URL。\n請先下載 Excel 檔案 (.xlsx) 後使用「上傳檔案」功能匯入。');
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Import failed');
      }

      const data = await res.json();
      setSuccessMessage(`成功匯入 ${data.records} 筆專案資料！`);
      setStatus('success');
      setTimeout(() => {
        onSuccess();
        onClose();
        setStatus('idle');
        setUrl('');
      }, 2000);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || '發生未知錯誤');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90"
          />


          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-surface border-2 border-border rounded-2xl shadow-2xl p-6 sm:p-8"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>


            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 bg-neutral-800 text-white rounded-full flex items-center justify-center mb-4 border border-border">
                <FileSpreadsheet size={24} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">匯入 Master Sheet</h2>
              <p className="text-muted text-sm">
                請上傳「射出成型之製程變更、確效專案之管理.xlsx」，系統將自動同步專案庫。
              </p>
            </div>


            <div className="space-y-4">
              <label
                htmlFor="file-upload"
                className={`relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${file ? 'border-white bg-white/5' : 'border-neutral-800 bg-black hover:bg-neutral-900 hover:border-white'} ${status === 'uploading' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >

                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                  {file ? (
                    <>
                      <FileSpreadsheet className="w-8 h-8 text-white mb-3" />
                      <p className="mb-2 text-sm text-white font-black break-all">{file.name}</p>
                      <p className="text-sm text-neutral-400">點擊更換檔案</p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-8 h-8 text-muted mb-3" />
                      <p className="mb-2 text-sm text-foreground font-medium">點擊或拖入檔案</p>
                      <p className="text-sm text-muted">僅支援 .xlsx 格式</p>
                    </>

                  )}
                </div>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".xlsx, .xls"
                  onChange={handleFileSelect}
                  disabled={status === 'uploading' || url !== ""} // Disable file input if URL is present or uploading
                />
              </label>

              <div className="flex items-center gap-4 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-sm text-muted uppercase font-medium">或使用 URL 匯入</span>
                <div className="flex-1 h-px bg-border" />
              </div>


              <div className="flex flex-col gap-2">
                <input
                  type="url"
                  placeholder="貼上 Google Sheet 共用連結..."
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setFile(null); // Clear file if URL is entered
                    setStatus('idle');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  disabled={status === 'uploading' || file !== null} // Disable URL input if file is present or uploading
                  className="w-full px-4 py-3 bg-black border-2 border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-white transition-all placeholder:text-neutral-600 font-bold"
                />

              </div>

              {status === 'uploading' && totalCount > 0 && (
                <div className="space-y-3 p-4 bg-background border border-border rounded-xl">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white font-black flex items-center gap-2 uppercase tracking-widest text-xs">
                       <Loader2 className="w-4 h-4 animate-spin" />
                       正在同步專案庫...
                    </span>
                    <span className="text-foreground font-mono font-bold">
                      {Math.round((currentCount / totalCount) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-surface rounded-full overflow-hidden border border-border">
                    <motion.div 
                      className="h-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.4)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${(currentCount / totalCount) * 100}%` }}
                      transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                    />
                  </div>
                  <div className="text-right text-sm text-muted font-medium">
                    已處理 {currentCount} / 共 {totalCount} 筆
                  </div>
                </div>
              )}


              {errorMessage && (
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-950 p-3 rounded-lg border border-red-300 dark:border-red-800 text-sm">
                  <AlertCircle size={16} />
                  <span className="font-bold">{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 p-3 rounded-lg border border-emerald-300 dark:border-emerald-800 text-sm">
                  <CheckCircle size={16} />
                  <span className="font-bold">{successMessage}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-4">
                <button
                  onClick={handleClear}
                  disabled={(!file && !url) || status === 'uploading'}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-danger bg-danger/5 border border-danger/20 hover:bg-danger hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-[10px]"
                  title="清空包含巨大檔案的記憶體佔用與網址"
                >
                  <Trash2 size={18} />
                  <span>清空欄位與記憶體</span>
                </button>


                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl font-black text-neutral-400 hover:text-white bg-transparent border border-border hover:bg-neutral-900 transition-all uppercase tracking-widest text-xs"
                  >
                    取消
                  </button>

                  <button
                    onClick={url ? handleURLImport : handleUpload}
                    disabled={(!file && !url) || status === 'uploading'}
                    className="relative px-8 py-2.5 rounded-xl font-black text-black bg-white shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-xs"
                  >
                    <div className="flex items-center gap-2">
                      {status === 'uploading' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <UploadCloud size={18} />
                      )}
                      <span>開始匯入</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
