"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Loader2, AlertCircle, FileText } from "lucide-react";
import { projectService } from "@/lib/projectService";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const [formData, setFormData] = useState({
    project_no: "",
    part_no: "",
    rev: "",
    type: "設變",
    purpose: "",
    owner: "",
    ecr_no: ""
  });
  
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_no) {
      setErrorMessage("模具號碼 (專案編號) 為必填欄位");
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setErrorMessage(null);

    try {
      // 構建初始化專案資料 (為了支援靜態模式 B，我們在客戶端也準備好資料結構)
      const newProject = {
        id: crypto.randomUUID(),
        ...formData,
        priority: 3,
        status: "IN_PROGRESS",
        created_at: new Date().toISOString(),
        phases: [],
        tasks: [],
        notifications: []
      };

      await projectService.save(newProject as any);

      setFormData({
        project_no: "", part_no: "", rev: "", type: "設變", purpose: "", owner: "", ecr_no: ""
      });
      setStatus('idle');
      onSuccess();
      onClose();

    } catch (err: any) {
      setErrorMessage(err.message || "建立專案時發生未知的錯誤");
      setStatus('error');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
            className="relative w-full max-w-xl bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-sky-500/20 text-sky-400 rounded-full flex items-center justify-center border border-sky-500/30">
                <FileText size={24} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">新增確效專案</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">模具號碼 (必填)</label>
                  <input
                    type="text"
                    name="project_no"
                    value={formData.project_no}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    placeholder="例如: M284"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">品號</label>
                  <input
                    type="text"
                    name="part_no"
                    value={formData.part_no}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">工程版次</label>
                  <input
                    type="text"
                    name="rev"
                    value={formData.rev}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">專案類型</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="設變">設變</option>
                    <option value="新模">新模</option>
                    <option value="移模">移模</option>
                    <option value="修模">修模</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">ECR 編號</label>
                  <input
                    type="text"
                    name="ecr_no"
                    value={formData.ecr_no}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">變更目的</label>
                  <input
                    type="text"
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">發出者 (Owner)</label>
                  <input
                    type="text"
                    name="owner"
                    value={formData.owner}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-sm mt-4">
                  <AlertCircle size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-700 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl font-medium text-slate-300 hover:text-white bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="relative px-6 py-2.5 rounded-xl font-medium text-white shadow-lg overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed
                             bg-gradient-to-t from-emerald-600 to-emerald-500 border border-emerald-400/50 hover:from-emerald-500 hover:to-emerald-400"
                >
                  <div className="flex items-center gap-2">
                    {status === 'submitting' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Plus size={18} />
                    )}
                    <span>送出建檔</span>
                  </div>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
