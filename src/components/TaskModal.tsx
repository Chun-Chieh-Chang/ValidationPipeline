"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, X, Plus, AlertCircle, Calendar, Hash, Tag, Briefcase, Link as LinkIcon, GitBranch } from "lucide-react";
import { TASK_STATUS, DEPARTMENTS } from "@/lib/constants";
import { ProjectData } from "@/lib/projectService";

export interface TaskData {
  id: string;
  wbs_code: string;
  task_name: string;
  dept: string;
  status: string;
  planned_date?: string;
  actual_date?: string;
  start_date?: string;
  deliverable?: string;
  depends_on?: string;
  progress?: number;
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: TaskData) => void;
  task?: TaskData | null;
  mode: 'add' | 'edit';
}

export default function TaskModal({ isOpen, onClose, onSave, task, mode }: TaskModalProps) {
  const [formData, setFormData] = useState<Partial<TaskData>>({
    wbs_code: "",
    task_name: "",
    dept: DEPARTMENTS[2], // 工程部
    status: TASK_STATUS.NOT_STARTED,
    planned_date: "",
    start_date: "",
    deliverable: "",
    depends_on: "",
    progress: 0
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && task) {
        setFormData({ ...task });
      } else {
        setFormData({
          id: crypto.randomUUID(),
          wbs_code: "",
          task_name: "",
          dept: "工程部",
          status: "尚未開始",
          planned_date: "",
          start_date: "",
          deliverable: "",
          depends_on: "",
          progress: 0
        });
      }
      setErrorMessage(null);
    }
  }, [isOpen, task, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.wbs_code || !formData.task_name) {
      setErrorMessage("WBS 工作序與任務名稱為必填欄位");
      return;
    }

    onSave(formData as TaskData);
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'number' ? parseInt(e.target.value) : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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
          className="relative w-full max-w-lg bg-surface border-2 border-border rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto custom-scrollbar"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors p-2"
          >
            <X size={24} />
          </button>

          <div className="flex items-center gap-4 mb-8">
            <div className={`w-12 h-12 ${mode === 'add' ? 'bg-seafoam text-abyss' : 'bg-brand-accent text-white'} rounded-2xl flex items-center justify-center shadow-lg`}>
              {mode === 'add' ? <Plus size={24} /> : <Tag size={24} />}
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-foreground">{mode === 'add' ? '新增任務項目' : '編輯任務詳情'}</h2>
              <p className="text-sm text-muted font-bold">配置 WBS 結構與權責分配</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="text-xs font-black uppercase tracking-widest text-muted mb-2 flex items-center gap-2">
                  <Hash size={14} /> WBS 序號
                </label>
                <input
                  type="text"
                  name="wbs_code"
                  placeholder="例如: 1.1"
                  value={formData.wbs_code}
                  onChange={handleChange}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-brand-accent transition-all font-mono font-bold"
                  required
                />
              </div>
              <div className="col-span-1">
                <label className="text-xs font-black uppercase tracking-widest text-muted mb-2 flex items-center gap-2">
                  <Briefcase size={14} /> 負責部門
                </label>
                <select
                  name="dept"
                  value={formData.dept}
                  onChange={handleChange}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold appearance-none"
                >
                  <option value="G.M.">G.M.</option>
                  <option value="業務部">業務部</option>
                  <option value="工程部">工程部</option>
                  <option value="製造部">製造部</option>
                  <option value="品保部">品保部</option>
                  <option value="品管部">品管部</option>
                  <option value="各單位主管">各單位主管</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-black uppercase tracking-widest text-muted mb-2">任務名稱</label>
                <input
                  type="text"
                  name="task_name"
                  placeholder="輸入工作項目描述..."
                  value={formData.task_name}
                  onChange={handleChange}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold"
                  required
                />
              </div>

              <div className="col-span-1">
                <label className="text-xs font-black uppercase tracking-widest text-muted mb-2 flex items-center gap-2">
                  <Calendar size={14} /> 預計完成日期
                </label>
                <input
                  type="date"
                  name="planned_date"
                  value={formData.planned_date ? new Date(formData.planned_date).toISOString().split('T')[0] : ""}
                  onChange={handleChange}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold"
                />
              </div>

              <div className="col-span-1">
                <label className="text-xs font-black uppercase tracking-widest text-muted mb-2 flex items-center gap-2">
                  工作狀態
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold appearance-none"
                >
                  {Object.entries(TASK_STATUS).map(([key, label]) => (
                    <option key={key} value={label}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <label className="text-xs font-black uppercase tracking-widest text-muted mb-2 flex items-center gap-2">
                   開始日期
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date ? new Date(formData.start_date).toISOString().split('T')[0] : ""}
                  onChange={handleChange}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted mb-2 flex items-center gap-2">
                  <GitBranch size={14} /> 前置依賴 (WBS 序號，逗號分隔)
                </label>
                <input
                  type="text"
                  name="depends_on"
                  placeholder="例如: 1.1, 1.2"
                  value={formData.depends_on}
                  onChange={handleChange}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-brand-accent transition-all font-mono font-bold"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted mb-2 flex items-center gap-2">
                  <LinkIcon size={14} /> 交付物/備註鏈結 (格式: 名稱||網址)
                </label>
                <input
                  type="text"
                  name="deliverable"
                  placeholder="匯出報告||https://..."
                  value={formData.deliverable}
                  onChange={handleChange}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-brand-accent transition-all font-bold text-sm"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 text-danger bg-danger/10 p-4 rounded-xl border border-danger/30 text-sm">
                <AlertCircle size={18} />
                <span className="font-bold">{errorMessage}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-xl text-muted hover:text-foreground font-black uppercase tracking-widest text-xs border border-border transition-all"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-10 py-3 rounded-xl bg-brand-accent text-white shadow-xl shadow-brand-accent/20 hover:scale-[1.02] active:scale-95 transition-all font-black uppercase tracking-widest text-xs"
              >
                <Save size={16} />
                <span>{mode === 'add' ? '建立項目' : '儲存編輯'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
