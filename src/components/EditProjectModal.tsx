"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, X, Loader2, AlertCircle, FileText, Calendar, Link as LinkIcon, User, Layers, Zap, Database, History } from "lucide-react";
import { projectService, ProjectData } from "@/lib/projectService";
import { DEPARTMENTS, PROJECT_TYPES, PRIORITY_LABELS } from "@/lib/constants";

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: ProjectData) => void;
  project: ProjectData;
}

export default function EditProjectModal({ isOpen, onClose, onSuccess, project }: EditProjectModalProps) {
  const [formData, setFormData] = useState<Partial<ProjectData>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && project) {
      setFormData({
        project_no: project.project_no || "",
        part_no: project.part_no || "",
        rev: project.rev || "",
        type: project.type || "設變",
        dept: project.dept || DEPARTMENTS[2],
        purpose: project.purpose || "",
        owner: project.owner || "",
        ecr_no: project.ecr_no || "",
        ecr_date: project.ecr_date || "",
        ecn_no: project.ecn_no || "",
        ecn_date: project.ecn_date || "",
        start_date: project.start_date || "",
        cloud_link: project.cloud_link || "",
        priority: project.priority || 3
      });
      setStatus('idle');
      setErrorMessage(null);
    }
  }, [isOpen, project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_no) {
      setErrorMessage("模具號碼為必填欄位");
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setErrorMessage(null);

    try {
      const updated = await projectService.update(project.id, formData);
      if (updated) {
        setStatus('idle');
        onSuccess(updated as ProjectData);
        onClose();
      } else {
        throw new Error("更新失敗：找不到專案");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "更新專案時發生未知的錯誤");
      setStatus('error');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'number' ? parseInt(e.target.value) : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
          className="relative w-full max-w-2xl bg-surface border-2 border-border rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto custom-scrollbar"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors p-2"
          >
            <X size={24} />
          </button>

          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-brand-accent text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-accent/20">
              <FileText size={24} />
            </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-foreground">編輯專案屬性</h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-muted font-bold">修改案號基本資訊及雲端鏈結</p>
                  {project.last_master_sync && (
                    <span className="flex items-center gap-1 text-[10px] font-black bg-brand-accent/10 text-brand-accent px-2 py-0.5 rounded-full uppercase tracking-tighter">
                      <Zap size={10} className="fill-current" />
                      已連動總表: {new Date(project.last_master_sync).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4 md:col-span-2">
                <h3 className="text-xs font-black text-brand-accent uppercase tracking-[0.2em] border-b border-border pb-2">基本資訊</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-1">
                    <label className="text-xs font-black uppercase tracking-widest text-muted mb-2 flex items-center gap-2">
                      <Layers size={14} /> 模具號碼 (必填)
                    </label>
                    <input
                      type="text"
                      name="project_no"
                      value={formData.project_no}
                      onChange={handleChange}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold"
                      required
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-black uppercase tracking-widest text-muted mb-2">品號</label>
                    <input
                      type="text"
                      name="part_no"
                      value={formData.part_no}
                      onChange={handleChange}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-muted mb-2">權責部門</label>
                    <select
                      name="dept"
                      value={formData.dept}
                      onChange={handleChange}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold appearance-none cursor-pointer"
                    >
                      {DEPARTMENTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-muted mb-2">專案類型</label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold appearance-none cursor-pointer"
                    >
                      {PROJECT_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-muted mb-2">優先度</label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleChange}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold appearance-none cursor-pointer"
                    >
                      {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-muted mb-2">工程版次</label>
                    <input
                      type="text"
                      name="rev"
                      value={formData.rev}
                      onChange={handleChange}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Status & Dates */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-brand-secondary uppercase tracking-[0.2em] border-b border-border pb-2">排程與人員</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-muted mb-2 flex items-center gap-2">
                      <Calendar size={14} /> 起始日期
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date ? new Date(formData.start_date).toISOString().split('T')[0] : ""}
                      onChange={handleChange}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-muted mb-2 flex items-center gap-2">
                      <User size={14} /> 發出者 (Owner)
                    </label>
                    <input
                      type="text"
                      name="owner"
                      value={formData.owner}
                      onChange={handleChange}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* External Tracking */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-pelagic uppercase tracking-[0.2em] border-b border-border pb-2">外部追蹤</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted mb-2 flex items-center gap-2">
                      <LinkIcon size={14} /> 雲端資料鏈結
                    </label>
                    <input
                      type="url"
                      name="cloud_link"
                      placeholder="https://..."
                      value={formData.cloud_link}
                      onChange={handleChange}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-muted mb-2">ECR 編號</label>
                    <input
                      type="text"
                      name="ecr_no"
                      value={formData.ecr_no}
                      onChange={handleChange}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-muted mb-2">ECN 編號</label>
                    <input
                      type="text"
                      name="ecn_no"
                      value={formData.ecn_no}
                      onChange={handleChange}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                 <label className="block text-xs font-black uppercase tracking-widest text-muted mb-2">變更目的</label>
                 <textarea
                    name="purpose"
                    rows={3}
                    value={formData.purpose}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold resize-none"
                 />
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 text-danger bg-danger/10 p-4 rounded-xl border border-danger/30 text-sm">
                <AlertCircle size={18} />
                <span className="font-bold">{errorMessage}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-border mt-8">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-xl text-muted hover:text-foreground font-black uppercase tracking-widest text-xs border border-border transition-all"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="flex items-center gap-2 px-10 py-3 rounded-xl bg-brand-accent text-white shadow-xl shadow-brand-accent/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-black uppercase tracking-widest text-xs"
              >
                {status === 'submitting' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                <span>儲存變更</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
