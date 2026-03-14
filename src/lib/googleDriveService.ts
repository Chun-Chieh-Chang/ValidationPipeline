// src/lib/googleDriveService.ts

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
}

class GoogleDriveService {
  private accessToken: string | null = null;
  private folderName = 'InjectionPipeline_Data';
  private fileName = 'vms_data.json';
  private defaultFolderId = '1tSwN6S1VvklTGEa1U3MdwDt2xszSZvWl';
  private targetFolderId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.targetFolderId = localStorage.getItem('vms_google_folder_id');
    }
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  setTargetFolderId(id: string | null) {
    this.targetFolderId = id;
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem('vms_google_folder_id', id);
      else localStorage.removeItem('vms_google_folder_id');
    }
  }

  get currentFolderId() {
    return this.targetFolderId || this.defaultFolderId;
  }

  get isLoggedIn() {
    return !!this.accessToken;
  }

  private async fetchDrive(endpoint: string, options: RequestInit = {}) {
    if (!this.accessToken) throw new Error('Not authenticated with Google');

    const res = await fetch(`https://www.googleapis.com/drive/v3${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!res.ok) {
      const error = await res.json();
      const message = error.error?.message || res.statusText;
      if (res.status === 401) {
        throw new Error(`Google 登入工作階段已過期 (401)，請重新登入以執行此操作。`);
      }
      if (res.status === 403 || res.status === 404) {
        throw new Error(`Google Drive API 存取被拒 (${res.status}): 請確認該資料夾是否已共用給您，或權限是否正確。(${message})`);
      }
      throw new Error(`Google Drive API Error: ${message}`);
    }

    return res.json();
  }

  async findOrCreateFolder(): Promise<string> {
    // 如果已有指定的 Target Folder ID，直接使用
    return this.currentFolderId;

    const q = `name='${this.folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const data = await this.fetchDrive(`/files?q=${encodeURIComponent(q)}&fields=files(id, name)`);
    
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }

    const folder = await this.fetchDrive('/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: this.folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    return folder.id;
  }

  async findOrCreateFile(folderId: string): Promise<string> {
    const q = `name='${this.fileName}' and '${folderId}' in parents and trashed=false`;
    const data = await this.fetchDrive(`/files?q=${encodeURIComponent(q)}&fields=files(id, name)`);

    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }

    const file = await this.fetchDrive('/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: this.fileName,
        parents: [folderId],
      }),
    });

    return file.id;
  }

  async getFileContent(fileId: string): Promise<any> {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to fetch file content');
    
    return res.json();
  }

  async saveFileContent(fileId: string, content: any): Promise<void> {
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(content),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to save to Drive: ${error.error?.message || res.statusText}`);
    }
  }

  /**
   * 複製檔案 (用於另存新檔/建立備份)
   */
  async copyFile(fileId: string, newName: string): Promise<string> {
    const data = await this.fetchDrive(`/files/${fileId}/copy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName,
      }),
    });

    return data.id;
  }

  /**
   * 建立新資料夾
   */
  async createFolder(name: string = this.folderName): Promise<string> {
    const folder = await this.fetchDrive('/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    return folder.id;
  }

  /**
   * 列出資料夾內容 (用於 Drive Browser)
   */
  async listFiles(parentId: string = 'root', mimeTypeFilter?: string): Promise<GoogleDriveFile[]> {
    let q = `'${parentId}' in parents and trashed = false`;
    if (mimeTypeFilter) {
      q += ` and mimeType = '${mimeTypeFilter}'`;
    }
    
    const data = await this.fetchDrive(`/files?q=${encodeURIComponent(q)}&fields=files(id, name, mimeType)&orderBy=folder,name`);
    return data.files || [];
  }

  /**
   * 獲取單一檔案/資料夾詳情 (包含路徑)
   */
  async getFileMetadata(fileId: string): Promise<any> {
    return this.fetchDrive(`/files/${fileId}?fields=id, name, mimeType, parents`);
  }
}

export const googleDriveService = new GoogleDriveService();
