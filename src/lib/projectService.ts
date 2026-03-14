import { googleDriveService } from './googleDriveService';

export interface TaskData {
  id: string;
  wbs_code: string;
  task_name: string;
  dept: string;
  status: string;
  progress?: number;
  planned_date?: string;
  actual_date?: string;
  start_date?: string;
  deliverable?: string;
  depends_on?: string;
}

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
  master_sheet_id?: string;
  last_master_sync?: string;
  dept?: string;
  phases: any[];
  tasks: TaskData[];
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
        // 如果是方案 A (API 模式)，也需要同步到 API (目前僅 LocalStorage)
        // 這裡我們維持 LocalStorage 為主，但強迫同步到雲端
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        
        // 如果已登錄 Google Drive，則嘗試同步到雲端進行備份
        if (googleDriveService.isLoggedIn) {
          console.log('JSON 還原成功，嘗試同步至雲端備份...');
          try {
            await this.syncWithCloud(true); 
            console.log('雲端備份同步完成');
          } catch (syncError) {
            console.warn('雲端同步失敗，但本機資料已還原成功。', syncError);
            // 不拋出錯誤，讓還原流程算成功
          }
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
   * @param forcePush 是否強制以本地覆蓋雲端 (通常用於還原操作)
   */
  async syncWithCloud(forcePush: boolean = false): Promise<void> {
    if (!googleDriveService.isLoggedIn) return;

    try {
      const folderId = await googleDriveService.findOrCreateFolder();
      const fileId = await googleDriveService.findOrCreateFile(folderId);
      
      // 獲取本地與雲端資料
      const localData = await this.getAll();
      const cloudContent = await googleDriveService.getFileContent(fileId);
      
      // 策略：
      // 1. 如果是強制推送(還原)，則直接上傳
      // 2. 如果本地為空且雲端有資料，拉取雲端
      // 3. 否則本地為準推送到雲端
      if (forcePush) {
        await googleDriveService.saveFileContent(fileId, localData);
        console.log('Force push completed after restore');
        return;
      }

      const hasLocal = localData && localData.length > 0;
      const hasCloud = cloudContent && Array.isArray(cloudContent) && cloudContent.length > 0;

      if (!hasLocal && hasCloud) {
        console.log('本地資料為空，正在從雲端拉取資料...');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudContent));
        // 注意：這裡不呼叫 fetchProjects，需要調用端處理 UI 刷新
        return;
      }

      // 如果兩邊都有資料，或者只有本地有資料，通常以本地為準
      // 為了防止誤刪雲端資料，若本地筆數顯著少於雲端，暫不自動覆蓋 (除非 forcePush)
      if (hasLocal && hasCloud && localData.length < cloudContent.length / 2) {
         console.warn('本地資料明顯少於雲端，防止誤報，跳過自動同步。請使用「還原」功能手動處理。');
         return;
      }

      await googleDriveService.saveFileContent(fileId, localData);
      console.log('Cloud sync completed (Local -> Cloud)');
    } catch (e) {
      console.error('Cloud sync failed', e);
      throw e; // 傳播錯誤以便 UI 察覺
    }
  },
  
  /**
   * 根據模具號碼搜尋現有專案 (優先從 Master Sheet 獲取)
   */
  async findByProjectNo(projectNo: string): Promise<ProjectData | null> {
    if (!isClient) return null;

    // 1. 優先嘗試從 Google Master Sheet 獲取 (即時資料)
    const { googleSheetsService } = await import('./googleSheetsService');
    if (googleSheetsService.hasTargetSheet) {
      try {
        const spreadsheetId = localStorage.getItem('vms_google_sheet_id');
        if (spreadsheetId) {
          const rows = await googleSheetsService.fetchMasterRows(spreadsheetId);
          const match = rows.find(r => r.project_no?.trim() === projectNo.trim());
          if (match) {
            return {
              id: "proj_" + Math.random().toString(36).substring(2, 9),
              ...match,
              status: match.status_text === '已結案' ? 'CLOSED' : 'IN_PROGRESS',
              master_sheet_id: spreadsheetId,
              last_master_sync: new Date().toISOString(),
              phases: [],
              tasks: [],
              notifications: []
            } as any;
          }
        }
      } catch (e) {
        console.warn('從 Master Sheet 獲取資料失敗，切換至本地搜尋', e);
      }
    }

    // 2. 回退至搜尋已存檔專案
    const projects = await this.getAll();
    return projects.find(p => p.project_no?.trim() === projectNo.trim()) || null;
  }
};
