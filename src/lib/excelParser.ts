import { read, utils } from 'xlsx';
import { ProjectData } from './projectService';

export async function parseExcelData(buffer: ArrayBuffer): Promise<ProjectData[]> {
  const workbook = read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;
  const masterSheetName = sheetNames.find(name => name.toLowerCase().includes('master')) || sheetNames[1] || sheetNames[0];
  
  if (!masterSheetName) {
    throw new Error('找不到 Master Sheet');
  }

  const masterSheet = workbook.Sheets[masterSheetName];
  const masterEntries: any[][] = utils.sheet_to_json(masterSheet, { header: 1, defval: '' });
  
  if (masterEntries.length < 2) {
    throw new Error('Master Sheet 格式不正確(資料不足)');
  }

  const headerIndices = new Map<number, string>();
  const row1 = masterEntries[0] || [];
  const row2 = masterEntries[1] || [];
  
  for (let i = 0; i < Math.max(row1.length, row2.length); i++) {
    const h1 = row1[i]?.toString() || '';
    const h2 = row2[i]?.toString() || '';
    const combined = (h1 + h2).replace(/\s/g, '').replace(/\(.*\)/g, '').replace(/（.*）/g, '');
    if (combined) headerIndices.set(i, combined);
    const cleanH1 = h1.replace(/\s/g, '');
    const cleanH2 = h2.replace(/\s/g, '');
    if (cleanH1) headerIndices.set(i + 1000, cleanH1);
    if (cleanH2) headerIndices.set(i + 2000, cleanH2);
  }

  const parseExcelDate = (val: any) => {
    if (!val || val === '' || val === null || val === undefined) return undefined;
    if (typeof val === 'number') {
      const date = new Date((val - 25569) * 86400 * 1000);
      return isNaN(date.getTime()) ? undefined : date.toISOString();
    }
    const strVal = val.toString().trim().replace(/\//g, '-');
    if (/^\d+$/.test(strVal)) {
      const num = parseInt(strVal);
      if (num > 10000 && num < 100000) {
        const date = new Date((num - 25569) * 86400 * 1000);
        return isNaN(date.getTime()) ? undefined : date.toISOString();
      }
    }
    const date = new Date(Date.parse(strVal));
    if (!date || isNaN(date.getTime())) return undefined;
    const year = date.getUTCFullYear();
    if (year < 1920 || year > 2100) return undefined;
    return date.toISOString();
  };

  const getCellValue = (rowIx: number, ...keys: string[]) => {
    const row = masterEntries[rowIx];
    if (!row) return { value: '', url: '' };
    for (const key of keys) {
      const cleanTarget = key.replace(/\s/g, '');
      const entries = Array.from(headerIndices.entries());
      for (const [idx, headerName] of entries) {
        const realIdx = idx % 1000;
        if (headerName.includes(cleanTarget) || cleanTarget.includes(headerName)) {
          const val = row[realIdx];
          if (val !== undefined && val !== '') {
            const cellAddress = utils.encode_cell({ r: rowIx, c: realIdx });
            const cell = masterSheet[cellAddress];
            let url = '';
            if (cell?.l?.Target) url = cell.l.Target;
            else if (cell?.f && cell.f.includes('HYPERLINK')) {
              const match = cell.f.match(/HYPERLINK\s*\(\s*["']([^"']+)["']/i);
              if (match && match[1]) url = match[1];
            }
            return { value: val.toString(), url };
          }
        }
      }
    }
    return { value: '', url: '' };
  };

  const isChecked = (val: any) => {
    if (val === true || val === 'TRUE' || val === 'true' || val === 1 || val === '1') return true;
    if (val === false || val === 'FALSE' || val === 'false' || val === 0 || val === '0') return false;
    const s = val?.toString().trim().toLowerCase();
    if (!s) return false;
    const checkedMarks = ['已完成', 'v', 'x', 'o', 'y', 'yes', 'ok', 'true', '1', '✅', '☑️', '✔', '✓', 'checked'];
    return checkedMarks.includes(s);
  };

  const projectGroups = new Map<string, number[]>();
  for (let i = 2; i < masterEntries.length; i++) {
    const { value: projectNo } = getCellValue(i, '模具號碼', 'ProjectNo', 'No.', '項次');
    const cleanNo = projectNo.trim();
    if (!cleanNo || cleanNo === '' || cleanNo === 'undefined') continue;
    if (!projectGroups.has(cleanNo)) projectGroups.set(cleanNo, []);
    projectGroups.get(cleanNo)?.push(i);
  }

  const projects: ProjectData[] = [];
  const projectNoList = Array.from(projectGroups.keys());

  for (const projectNo of projectNoList) {
    const groupRows = projectGroups.get(projectNo) || [];
    const mainRowIx = groupRows[0];
    
    const id = "proj_" + Math.random().toString(36).substring(2, 9);
    const type = getCellValue(mainRowIx, '專案類型', 'Type');
    const partNo = getCellValue(mainRowIx, '品號', 'PartNo');
    const rev = getCellValue(mainRowIx, '工程圖面版次', '版次', 'Rev');
    const purpose = getCellValue(mainRowIx, '目的', 'Purpose');
    const owner = getCellValue(mainRowIx, '發出者', 'Owner');
    const ecrNo = getCellValue(mainRowIx, 'ECR編號', 'ECRNo').value;
    const ecnNo = getCellValue(mainRowIx, 'ECN編號', 'ECNNo').value;
    const priorityRaw = getCellValue(mainRowIx, '優先度').value;
    const priority = isNaN(parseInt(priorityRaw)) ? 3 : parseInt(priorityRaw);
    const statusText = getCellValue(mainRowIx, '狀態').value;
    const status = statusText.includes('CLOSED') || statusText.includes('結案') ? 'CLOSED' : 'IN_PROGRESS';
    const cloudLink = getCellValue(mainRowIx, '雲端資料', '連結', '雲端資料連結');
    const finalLink = cloudLink.url || cloudLink.value;

    const projectPhases = [];
    const phaseNames = ['PD', 'FA', 'OQ', 'PQ', 'EC', '圖面進版'];
    for (const phaseName of phaseNames) {
      let completed = false;
      for (const rowIx of groupRows) {
        const { value } = getCellValue(rowIx, phaseName);
        if (isChecked(value)) {
          completed = true;
          break;
        }
      }
      projectPhases.push({
        id: "ph_" + Math.random().toString(36).substring(2, 9),
        phase_name: phaseName,
        completion_status: completed ? 'COMPLETED' : 'PENDING',
        is_required: true
      });
    }

    const tasks = [];
    const wbsSheetName = sheetNames.find(name => name.startsWith(projectNo));
    if (wbsSheetName) {
      const wbsSheet = workbook.Sheets[wbsSheetName];
      const wbsEntries: any[][] = utils.sheet_to_json(wbsSheet, { header: 1, defval: '' });
      if (wbsEntries.length > 2) {
        const wbsHeaderIndices = new Map<number, string>();
        const wbsHeaderRow = wbsEntries[1] || [];
        for (let i = 0; i < wbsHeaderRow.length; i++) {
          const h = wbsHeaderRow[i]?.toString().replace(/\s/g, '') || '';
          if (h) wbsHeaderIndices.set(i, h);
        }

        const getWbsCellValue = (rowIx: number, ...keys: string[]) => {
          const row = wbsEntries[rowIx];
          if (!row) return { value: '', url: '' };
          for (const key of keys) {
            const cleanTarget = key.replace(/\s/g, '');
            const entries = Array.from(wbsHeaderIndices.entries());
            for (const [idx, hName] of entries) {
              if (hName.includes(cleanTarget) || cleanTarget.includes(hName)) {
                const val = row[idx];
                if (val !== undefined && val !== '') {
                  const addr = utils.encode_cell({ r: rowIx, c: idx });
                  const cell = wbsSheet[addr];
                  let url = '';
                  if (cell?.l?.Target) url = cell.l.Target;
                  else if (cell?.f && cell.f.includes('HYPERLINK')) {
                    const match = cell.f.match(/HYPERLINK\s*\(\s*["']([^"']+)["']/i);
                    if (match && match[1]) url = match[1];
                  }
                  return { value: val.toString(), url };
                }
              }
            }
          }
          return { value: '', url: '' };
        };

        for (let i = 2; i < wbsEntries.length; i++) {
          const wbsCode = getWbsCellValue(i, '工作序', 'WBS').value;
          if (!wbsCode || wbsCode.toLowerCase() === 'wbs') continue;
          
          const taskName = getWbsCellValue(i, '項目', '工作項目', 'Task').value;
          const dept = getWbsCellValue(i, '權責', '作業權責', 'Dept').value || '未定義';
          const statusRaw = getWbsCellValue(i, '狀態', '工作狀態').value;
          
          let taskStatus = 'NOT_STARTED';
          if (statusRaw.includes('完成') || statusRaw.includes('COMPLETED')) taskStatus = 'COMPLETED';
          else if (statusRaw.includes('行') || statusRaw.includes('IN_PROGRESS')) taskStatus = 'IN_PROGRESS';

          const plannedDate = parseExcelDate(getWbsCellValue(i, '預計完成', '預定試模', 'Target Date').value);
          const startDate = parseExcelDate(getWbsCellValue(i, '開始日', '開始日期', '預計開始', 'Start Date').value);
          const actualDate = taskStatus === 'COMPLETED' ? parseExcelDate(getWbsCellValue(i, '完成日期', 'Actual Date').value) : undefined;
          
          const deliverableInfo = getWbsCellValue(i, '交付', '交付物', '相關文件', '文件', 'Deliverable');
          const deliverable = deliverableInfo.url ? `${deliverableInfo.value}||${deliverableInfo.url}` : deliverableInfo.value;
          
          tasks.push({
            id: "task_" + Math.random().toString(36).substring(2, 9),
            wbs_code: wbsCode,
            task_name: taskName,
            dept,
            status: taskStatus,
            start_date: startDate,
            planned_date: plannedDate,
            actual_date: actualDate,
            deliverable,
            progress: getWbsCellValue(i, '交件', 'Progress').value,
            depends_on: getWbsCellValue(i, '前置任務', 'Depends On').value || null
          });
        }
      }
    }

    projects.push({
      id,
      project_no: projectNo,
      part_no: partNo.value,
      rev: rev.value,
      type: type.value,
      purpose: purpose.value,
      priority,
      status,
      owner: owner.value,
      ecr_no: ecrNo,
      ecr_date: parseExcelDate(getCellValue(mainRowIx, 'ECR開立日').value),
      ecn_no: ecnNo,
      ecn_date: parseExcelDate(getCellValue(mainRowIx, 'ECN開立日').value),
      cloud_link: finalLink,
      start_date: parseExcelDate(getCellValue(mainRowIx, '專案起始日期', '起始日期', '開始日', '開始日期', 'Start Date').value),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      phases: projectPhases,
      tasks,
      notifications: []
    });
  }

  return projects;
}
