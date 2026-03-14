/**
 * Global Constants & Single Source of Truth (SSoT)
 * All business logic definitions should be managed here.
 */

// 1. 任務狀態 (Task Status)
// 內部代碼 vs UI 顯示文字
export const TASK_STATUS = {
  NOT_STARTED: '尚未開始',
  IN_PROGRESS: '進行中',
  COMPLETED: '已完成',
} as const;

export type TaskStatusType = typeof TASK_STATUS[keyof typeof TASK_STATUS];

// 2. 專案狀態 (Project Status)
export const PROJECT_STATUS = {
  IN_PROGRESS: 'IN_PROGRESS',
  CLOSED: 'CLOSED',
} as const;

export const PROJECT_STATUS_LABELS = {
  [PROJECT_STATUS.IN_PROGRESS]: '進行中',
  [PROJECT_STATUS.CLOSED]: '已結案',
} as const;

// 3. 權責部門 (Departments)
// 必須與 Master Sheet 的列定義完全對齊
export const DEPARTMENTS = [
  'G.M.',
  '業務部',
  '工程部',
  '製造部',
  '品保部',
  '品管部',
  '各單位主管'
] as const;

export type DepartmentType = typeof DEPARTMENTS[number];

// 4. 專案類型 (Project Types)
export const PROJECT_TYPES = [
  '設變',
  '新模',
  '移模',
  '修模'
] as const;

export type ProjectType = typeof PROJECT_TYPES[number];

// 5. 優先度定義 (Priority)
export const PRIORITY_LABELS: Record<number, string> = {
  1: '緊急',
  2: '重要',
  3: '一般',
  4: '低'
};

// 5. 映射函式 (Mapping Helpers)
export const StatusMapper = {
  // 將 Master Sheet 的文字轉換為內部代碼
  fromMasterSheet(text: string): string {
    if (text === '已結案') return PROJECT_STATUS.CLOSED;
    return PROJECT_STATUS.IN_PROGRESS;
  },
  
  // 內部代碼轉 UI 文字
  toLabel(status: string): string {
    return PROJECT_STATUS_LABELS[status as keyof typeof PROJECT_STATUS_LABELS] || '進行中';
  }
};
