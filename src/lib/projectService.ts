import { googleDriveService } from './googleDriveService';

export interface ProjectData {
  id: string;
  project_no: string;
  part_no: string;
  rev: string;
  type: string;
  purpose: string;
  priority: number;
  status: string;
  ecr_no?: string;
  ecr_date?: string;
  ecn_no?: string;
  ecn_date?: string;
  owner: string;
  cloud_link?: string;
  start_date?: string;
  created_at?: string;
  updated_at?: string;
  phases: any[];
  tasks: any[];
  notifications: any[];
}

const STORAGE_KEY = 'vms_projects_data';

// 判斷是否處於客戶端環境
const isClient = typeof window !== 'undefined';
// 判斷是否啟用 API (預設關閉以符合 GitHub Pages 靜態環境)
const USE_API = process.env.NEXT_PUBLIC_USE_API === 'true';

export const projectService = {
  // 從 Storage 或 API 獲取所有專案
  async getAll(): Promise<ProjectData[]> {
    if (!isClient) return [];
    
    // 優先嘗試從 API 獲取 (方案 A)
    if (USE_API) {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('API 不可用，切換至 LocalStorage 模式');
      }
    }

    // 方案 B 的回退機制
    const local = localStorage.getItem(STORAGE_KEY);
    return local ? JSON.parse(local) : [];
  },

  // 獲取單一專案
  async getById(id: string): Promise<ProjectData | null> {
    if (!isClient) return null;

    if (USE_API) {
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (res.ok) return await res.json();
      } catch (e) {
        // 靜態模式則從本地尋找
      }
    }

    const all = await this.getAll();
    return all.find(p => p.id === id) || null;
  },

  // 保存專案 (可用於導入或新增)
  async save(project: ProjectData): Promise<void> {
    if (!isClient) return;

    // 如果 API 可用則同步到後端 (方案 A)
    if (USE_API) {
      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(project)
        });
        if (res.ok) return;
      } catch (e) {
        // API 失敗則記錄並存入本地
      }
    }

    // 方案 B: 儲存至本地
    const all = await this.getAll();
    const index = all.findIndex(p => p.id === project.id);
    if (index >= 0) {
      all[index] = project;
    } else {
      all.push(project);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

    // 如果已登錄 Google Drive，則同步
    if (googleDriveService.isLoggedIn) {
      this.syncWithCloud();
    }
  },

  // 更新專案狀態或任務
  async update(id: string, updates: Partial<ProjectData>): Promise<ProjectData | null> {
    if (!isClient) return null;

    let updatedProject: ProjectData | null = null;

    if (USE_API) {
      try {
        const res = await fetch(`/api/projects/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        if (res.ok) {
          const data = await res.json();
          updatedProject = data.project || data;
        }
      } catch (e) {
        // API 不可用
      }
    }

    if (!updatedProject) {
      // 方案 B 機制
      const all = await this.getAll();
      const index = all.findIndex(p => p.id === id);
      if (index >= 0) {
        const updated = { ...all[index], ...updates };
        all[index] = updated;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        updatedProject = updated;
      }
    }

    // 如果已登錄 Google Drive，則同步
    if (updatedProject && googleDriveService.isLoggedIn) {
      this.syncWithCloud();
    }

    return updatedProject;
  },

  // 一鍵清空所有資料與釋放記憶體
  async clearAll(): Promise<void> {
    if (!isClient) return;

    if (USE_API) {
      try {
        await fetch('/api/projects', { method: 'DELETE' });
      } catch (e) {
        // API 失敗
      }
    }

    localStorage.removeItem(STORAGE_KEY);
    
    if (googleDriveService.isLoggedIn) {
      this.syncWithCloud();
    }
  },

  // 導出所有資料 (JSON 備份)
  async exportData(): Promise<string> {
    if (!isClient) return '';
    const all = await this.getAll();
    return JSON.stringify(all, null, 2);
  },

  // 導入所有資料 (JSON 還原)
  async importData(jsonContent: string): Promise<void> {
    if (!isClient) return;
    try {
      const data = JSON.parse(jsonContent);
      if (Array.isArray(data)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        // 如果已登錄 Google Drive，則同步
        if (googleDriveService.isLoggedIn) {
          this.syncWithCloud();
        }
      } else {
        throw new Error('格式錯誤：應為專案陣列');
      }
    } catch (e) {
      console.error('導入失敗', e);
      throw e;
    }
  },

  /**
   * 與 Google Drive 同步雲端資料
   */
  async syncWithCloud(): Promise<void> {
    if (!googleDriveService.isLoggedIn) return;

    try {
      const folderId = await googleDriveService.findOrCreateFolder();
      const fileId = await googleDriveService.findOrCreateFile(folderId);
      
      // 獲取本地資料
      const localData = await this.getAll();
      
      // 獲取雲端資料
      const cloudContent = await googleDriveService.getFileContent(fileId);
      
      // 這裡採用簡單的「合併」策略：如果有雲端資料且本地資料為空，則拉取雲端；否則以本地為準推送到雲端
      // 更複雜的 Merge 邏輯可在此擴充
      if (!localData || localData.length === 0) {
        if (cloudContent && Array.isArray(cloudContent)) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudContent));
          return;
        }
      }

      // 將本地資料推送到雲端
      await googleDriveService.saveFileContent(fileId, localData);
      console.log('Cloud sync completed');
    } catch (e) {
      console.error('Cloud sync failed', e);
    }
  }
};
