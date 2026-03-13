// src/lib/googleSheetsService.ts

import { ProjectData } from './projectService';

class GoogleSheetsService {
  private accessToken: string | null = null;
  private targetSheetId: string | null = null;

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  setTargetSheetId(id: string | null) {
    this.targetSheetId = id;
  }

  get hasTargetSheet() {
    return !!this.targetSheetId;
  }

  get targetSheet() {
    return this.targetSheetId;
  }

  private async fetchSheets(spreadsheetId: string, endpoint: string, options: RequestInit = {}) {
    if (!this.accessToken) throw new Error('Not authenticated with Google');

    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Google Sheets API Error: ${error.error?.message || res.statusText}`);
    }

    return res.json();
  }

  /**
   * 將專案資料轉換為 Google Sheets 的列格式
   */
  private mapProjectToRow(project: ProjectData) {
    const completedTasks = project.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0;
    const totalTasks = project.tasks?.length || 0;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return [
      project.priority || 3,
      project.start_date ? new Date(project.start_date).toLocaleDateString() : '',
      project.type || '',
      project.project_no || '',
      project.part_no || '',
      project.rev || '',
      project.purpose || '',
      project.status === 'CLOSED' ? '已結案' : '進行中',
      project.owner || '',
      `${progress}%`,
      project.ecr_no || '',
      project.ecn_no || ''
    ];
  }

  async syncToSheet(spreadsheetId: string, projects: ProjectData[]): Promise<void> {
    const rows = projects.map(p => this.mapProjectToRow(p));
    
    // 加上標題列
    const header = [
      '優先度', '起始日期', '專案類型', '模具號碼', '品號', '版次', '目的', '狀態', '負責人', '進度', 'ECR', 'ECN'
    ];
    
    const values = [header, ...rows];

    await this.fetchSheets(spreadsheetId, '/values/A1:Z5000?valueInputOption=USER_ENTERED', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        range: 'A1:Z5000',
        majorDimension: 'ROWS',
        values: values,
      }),
    });
  }

  /**
   * 獲取試算表標題（驗證連結是否有效）
   */
  async getSpreadsheetTitle(spreadsheetId: string): Promise<string> {
    const data = await this.fetchSheets(spreadsheetId, '?fields=properties.title');
    return data.properties.title;
  }
}

export const googleSheetsService = new GoogleSheetsService();
