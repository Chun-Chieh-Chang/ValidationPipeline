"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, X, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUrl(""); // Clear URL if file is selected
      setStatus('idle');
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(`成功匯入 ${data.records} 筆專案資料！`);
        setStatus('success');
        setTimeout(() => {
          onSuccess();
          onClose();
          setStatus('idle');
          setFile(null);
        }, 1500);
      } else {
        throw new Error(data.message || "發生未知錯誤");
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

    try {
      const res = await fetch('/api/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setSuccessMessage(`成功匯入 ${data.records} 筆專案資料！`); // Assuming similar success message structure
      setStatus('success');
      setTimeout(() => {
        onSuccess();
        onClose();
        setStatus('idle');
        setUrl('');
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || 'An unexpected error occurred.');
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
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-slate-800/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 bg-sky-500/20 text-sky-400 rounded-full flex items-center justify-center mb-4 border border-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                <FileSpreadsheet size={24} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white mb-2">匯入 Master Sheet</h2>
              <p className="text-slate-400 text-sm">
                請上傳「射出成型之製程變更、確效專案之管理.xlsx」，系統將自動同步專案庫。
              </p>
            </div>

            <div className="space-y-4">
              <label
                htmlFor="file-upload"
                className={`relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 hover:border-slate-500'} ${status === 'uploading' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                  {file ? (
                    <>
                      <FileSpreadsheet className="w-8 h-8 text-emerald-400 mb-3" />
                      <p className="mb-2 text-sm text-emerald-300 font-medium break-all">{file.name}</p>
                      <p className="text-sm text-emerald-400/70">點擊更換檔案</p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-8 h-8 text-slate-400 mb-3" />
                      <p className="mb-2 text-sm text-slate-300 font-medium">點擊或拖入檔案</p>
                      <p className="text-sm text-slate-500">僅支援 .xlsx 格式</p>
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
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-sm text-slate-500 uppercase font-medium">或使用 URL 匯入</span>
                <div className="flex-1 h-px bg-slate-700" />
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
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-sm">
                  <AlertCircle size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 text-sm">
                  <CheckCircle size={16} />
                  <span>{successMessage}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl font-medium text-slate-300 hover:text-white bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={url ? handleURLImport : handleUpload}
                  disabled={(!file && !url) || status === 'uploading'}
                  className="relative px-5 py-2.5 rounded-xl font-medium text-white shadow-lg overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed
                             bg-gradient-to-t from-sky-600 to-sky-500 border border-sky-400/50 hover:from-sky-500 hover:to-sky-400
                             active:from-sky-700 active:to-sky-600 disabled:from-slate-700 disabled:to-slate-600 disabled:border-slate-600"
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
