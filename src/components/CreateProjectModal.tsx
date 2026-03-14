"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Loader2, AlertCircle, FileText, Search, Zap } from "lucide-react";
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
    ecr_no: "",
    ecr_date: "",
    ecn_no: "",
    ecn_date: "",
    start_date: "",
    cloud_link: "",
    master_sheet_id: "",
    last_master_sync: ""
  });
  
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error' | 'searching'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLookup = async () => {
    if (!formData.project_no || status === 'searching') return;
    
    setStatus('searching');
    setErrorMessage(null);
    try {
      const existing = await projectService.findByProjectNo(formData.project_no);
      if (existing) {
        setFormData({
          ...formData,
          part_no: existing.part_no || "",
          rev: existing.rev || "",
          type: existing.type || "設變",
          purpose: existing.purpose || "",
          owner: existing.owner || "",
          ecr_no: existing.ecr_no || "",
          ecr_date: existing.ecr_date ? new Date(existing.ecr_date).toISOString().split('T')[0] : "",
          ecn_no: existing.ecn_no || "",
          ecn_date: existing.ecn_date ? new Date(existing.ecn_date).toISOString().split('T')[0] : "",
          start_date: existing.start_date ? new Date(existing.start_date).toISOString().split('T')[0] : "",
          cloud_link: existing.cloud_link || "",
          master_sheet_id: existing.master_sheet_id || "",
          last_master_sync: existing.last_master_sync || ""
        });
      }
    } catch (err) {
      console.error("Lookup failed:", err);
    } finally {
      setStatus('idle');
    }
  };

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
        project_no: "", part_no: "", rev: "", type: "設變", purpose: "", owner: "", 
        ecr_no: "", ecr_date: "", ecn_no: "", ecn_date: "", start_date: "", cloud_link: "",
        master_sheet_id: "", last_master_sync: ""
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
            className="absolute inset-0 bg-black/90"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-surface border-2 border-border rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[95vh] overflow-y-auto no-scrollbar"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-foreground text-background rounded-full flex items-center justify-center border border-border">
                <FileText size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">還原/建立確效專案</h2>
                <p className="text-sm text-muted font-bold">從 Master Sheet 總表自動同步現有定義</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-black uppercase tracking-widest text-muted mb-2">模具號碼 (必填)</label>
                  <div className="relative group">
                    <input
                      type="text"
                      name="project_no"
                      value={formData.project_no}
                      onChange={handleChange}
                      onBlur={handleLookup}
                      className="w-full bg-background border-2 border-border rounded-xl px-12 py-3.5 text-foreground focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all font-black text-lg placeholder:text-muted/30"
                      placeholder="例如: M284"
                      required
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-accent transition-colors">
                      {status === 'searching' ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                    </div>
                    {formData.project_no && (
                      <button 
                        type="button"
                        onClick={handleLookup}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black bg-brand-accent/10 text-brand-accent px-3 py-1.5 rounded-lg hover:bg-brand-accent/20 transition-all flex items-center gap-1"
                      >
                        <Zap size={12} className="fill-current" />
                        手動抓取
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-muted mb-2">品號</label>
                  <input
                    type="text"
                    name="part_no"
                    value={formData.part_no}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-muted mb-2">工程版次</label>
                  <input
                    type="text"
                    name="rev"
                    value={formData.rev}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-muted mb-2">專案類型</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold appearance-none cursor-pointer"
                  >
                    <option value="設變">設變</option>
                    <option value="新模">新模</option>
                    <option value="移模">移模</option>
                    <option value="修模">修模</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-muted mb-2">負責人 (Owner)</label>
                  <input
                    type="text"
                    name="owner"
                    value={formData.owner}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-black uppercase tracking-widest text-muted mb-2">變更目的</label>
                  <input
                    type="text"
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-muted mb-2">ECR 編號</label>
                  <input
                    type="text"
                    name="ecr_no"
                    value={formData.ecr_no}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-muted mb-2">ECR 日期</label>
                  <input
                    type="date"
                    name="ecr_date"
                    value={formData.ecr_date}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-muted mb-2">ECN 編號</label>
                  <input
                    type="text"
                    name="ecn_no"
                    value={formData.ecn_no}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-muted mb-2">ECN 日期</label>
                  <input
                    type="date"
                    name="ecn_date"
                    value={formData.ecn_date}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-muted mb-2">起始日期</label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-muted mb-2">雲端連結</label>
                  <input
                    type="text"
                    name="cloud_link"
                    value={formData.cloud_link}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold"
                    placeholder="https://drive.google.com/..."
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 text-danger bg-danger/10 p-3 rounded-xl border border-danger/30 text-sm">
                  <AlertCircle size={16} />
                  <span className="font-bold">{errorMessage}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl text-muted hover:text-foreground bg-surface border border-border hover:bg-background transition-all font-black uppercase tracking-widest text-xs"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={status === 'submitting' || status === 'searching'}
                  className="relative px-8 py-2.5 rounded-xl bg-brand-accent text-background shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest font-black"
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
