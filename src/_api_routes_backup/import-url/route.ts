import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import axios from 'axios';
import { read, utils } from 'xlsx';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL not provided' }, { status: 400 });
    }

    // Google Sheets URL Parser logic:
    // If it's a standard docs.google.com link, we need to try and fetch the export?format=xlsx format
    let downloadUrl = url;
    if (url.includes('docs.google.com/spreadsheets')) {
       const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
       if (match && match[1]) {
           downloadUrl = `https://docs.google.com/spreadsheets/export?id=${match[1]}&exportFormat=xlsx`;
       }
    }

    const response = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    const workbook = read(buffer);

    const sheetNames = workbook.SheetNames;
    const masterSheetName = sheetNames.find(name => name.toLowerCase().includes('master'));
    
    if (!masterSheetName) {
      return NextResponse.json({ error: 'The uploaded file does not contain a "Master" sheet.' }, { status: 400 });
    }

    const masterSheet = workbook.Sheets[masterSheetName];
    const parseExcelDate = (val: any) => {
      if (!val || val === '' || val === null || val === undefined) return null;
      
      let date: Date | null = null;
      
      // Handle Numeric Excel serial dates
      if (typeof val === 'number') {
        date = new Date((val - 25569) * 86400 * 1000);
      } else {
        const strVal = val.toString().trim().replace(/\//g, '-');
        // If it's a string of just numbers, try to treat as Excel serial
        if (/^\d+$/.test(strVal)) {
          const num = parseInt(strVal);
          if (num > 10000 && num < 100000) { // Reasonable Excel date range
            date = new Date((num - 25569) * 86400 * 1000);
          }
        }
        
        if (!date || isNaN(date.getTime())) {
          date = new Date(Date.parse(strVal));
        }
      }

      if (!date || isNaN(date.getTime())) return null;
      
      // Sanity check: Prisma/SQL Server often fails on extreme dates
      const year = date.getUTCFullYear();
      if (year < 1920 || year > 2100) {
        console.warn(`Ignoring out-of-range date: ${date.toISOString()} from input: ${val}`);
        return null;
      }
      
      return date;
    };

    // 取得 Master Sheet 的二維陣列內容以便精準定位
    const masterEntries: any[][] = utils.sheet_to_json(masterSheet, { header: 1, defval: '' });
    if (masterEntries.length < 2) {
      return NextResponse.json({ error: 'Master Sheet 格式不正確(資料不足)' }, { status: 400 });
    }

    // 建立 Header 映射表 (解決合併儲存格與標題括號問題)
    const headerIndices = new Map<number, string>();
    const row1 = masterEntries[0] || [];
    const row2 = masterEntries[1] || [];
    
    // 合併兩行標題資訊並清潔 (去除空格與括號內容)
    for (let i = 0; i < Math.max(row1.length, row2.length); i++) {
      const h1 = row1[i]?.toString() || '';
      const h2 = row2[i]?.toString() || '';
      // 組合標題並去除所有空白、換行與括號內的補充說明 (例如: (發出者填寫))
      const combined = (h1 + h2).replace(/\s/g, '').replace(/\(.*\)/g, '').replace(/（.*）/g, '');
      if (combined) headerIndices.set(i, combined);
      
      // 另外儲存個別欄位原始清理後的名稱以便比對
      const cleanH1 = h1.replace(/\s/g, '');
      const cleanH2 = h2.replace(/\s/g, '');
      if (cleanH1) headerIndices.set(i + 1000, cleanH1); // 輔助索引
      if (cleanH2) headerIndices.set(i + 2000, cleanH2); // 輔助索引
    }

    const extractUrl = (cell: any) => {
      if (!cell) return '';
      // Direct hyperlink record
      if (cell.l?.Target) return cell.l.Target;
      // Formula hyperlink: =HYPERLINK("url", "label")
      if (cell.f && cell.f.includes('HYPERLINK')) {
        const match = cell.f.match(/HYPERLINK\s*\(\s*["']([^"']+)["']/i);
        if (match && match[1]) return match[1];
      }
      return '';
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
              const url = extractUrl(cell);
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
      // 支援更多勾選符號與關鍵字
      const checkedMarks = ['已完成', 'v', 'x', 'o', 'y', 'yes', 'ok', 'true', '1', '✅', '☑️', '✔', '✓', 'checked'];
      return checkedMarks.includes(s);
    };

    // 先將資料按專案號碼分組，解決合併儲存格產生的空列問題
    const projectGroups = new Map<string, number[]>(); // Now store indices
    for (let i = 2; i < masterEntries.length; i++) {
      const { value: projectNo } = getCellValue(i, '模具號碼', 'ProjectNo', 'No.', '項次');
      const cleanNo = projectNo.trim();
      if (!cleanNo || cleanNo === '' || cleanNo === 'undefined') continue;
      
      if (!projectGroups.has(cleanNo)) projectGroups.set(cleanNo, []);
      projectGroups.get(cleanNo)?.push(i);
    }

    let importedCount = 0;
    const projectNoList = Array.from(projectGroups.keys());

    for (const projectNo of projectNoList) {
      const groupRows = projectGroups.get(projectNo) || [];
      // 尋找該分組中欄位最齊全的一列 (通常是第一列)
      const mainRowIx = groupRows[0];
      
      const type = getCellValue(mainRowIx, '專案類型', 'Type');
      const partNo = getCellValue(mainRowIx, '品號', 'PartNo');
      const rev = getCellValue(mainRowIx, '工程圖面版次', '版次', 'Rev');
      const purpose = getCellValue(mainRowIx, '目的', 'Purpose');
      const owner = getCellValue(mainRowIx, '發出者', 'Owner');
      const ecrNoVal = getCellValue(mainRowIx, 'ECR編號', 'ECRNo');
      const ecrNo = ecrNoVal.value; // It's already stringified in getCellValue
      
      const ecnNoVal = getCellValue(mainRowIx, 'ECN編號', 'ECNNo');
      const ecnNo = ecnNoVal.value;
      
      const priorityRaw = getCellValue(mainRowIx, '優先度').value;
      const priority = isNaN(parseInt(priorityRaw)) ? 3 : parseInt(priorityRaw);

      const statusText = getCellValue(mainRowIx, '狀態').value;
      const status = statusText.includes('CLOSED') || statusText.includes('結案') ? 'CLOSED' : 'IN_PROGRESS';

      const cloudLink = getCellValue(mainRowIx, '雲端資料', '連結', '雲端資料連結');
      const finalLink = cloudLink.url || cloudLink.value; // Prefer underlying URL

      const project = await prisma.project.upsert({
        where: { project_no: projectNo },
        update: {
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
          start_date: parseExcelDate(getCellValue(mainRowIx, '專案起始日期', '起始日期', '開始日', '開始日期', 'Start Date').value)
        },
        create: {
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
          start_date: parseExcelDate(getCellValue(mainRowIx, '專案起始日期', '起始日期', '開始日', '開始日期', 'Start Date').value)
        }
      });

      // 1.2 Process Phases (PD, FA, OQ, PQ, EC, 圖面進版)
      const phases = ['PD', 'FA', 'OQ', 'PQ', 'EC', '圖面進版'];
      for (const phaseName of phases) {
        let completed = false;
        for (const rowIx of groupRows) {
          const { value } = getCellValue(rowIx, phaseName);
          if (isChecked(value)) {
            completed = true;
            break;
          }
        }
        
        await prisma.projectPhase.upsert({
          where: { project_id_phase_name: { project_id: project.id, phase_name: phaseName } },
          update: { 
            completion_status: completed ? 'COMPLETED' : 'PENDING',
            is_required: true 
          },
          create: {
            project_id: project.id,
            phase_name: phaseName,
            completion_status: completed ? 'COMPLETED' : 'PENDING',
            is_required: true
          }
        });
      }

      importedCount++;

      // 2. Process WBS Sheet for this project (if exists)
      const wbsSheetName = sheetNames.find(name => name.startsWith(projectNo));
      if (wbsSheetName) {
        const wbsSheet = workbook.Sheets[wbsSheetName];
        // Header is on row 2, data from row 3
        const wbsEntries: any[][] = utils.sheet_to_json(wbsSheet, { header: 1, defval: '' });
        if (wbsEntries.length > 2) {
          const wbsHeaderIndices = new Map<number, string>();
          const wbsHeaderRow = wbsEntries[1] || []; // row 2
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
                    const url = extractUrl(cell);
                    return { value: val.toString(), url };
                  }
                }
              }
            }
            return { value: '', url: '' };
          };

          await prisma.task.deleteMany({ where: { project_id: project.id } });

          for (let i = 2; i < wbsEntries.length; i++) {
            const wbsCode = getWbsCellValue(i, '工作序', 'WBS').value;
            if (!wbsCode || wbsCode.toLowerCase() === 'wbs') continue;
            
            const taskName = getWbsCellValue(i, '項目', '工作項目', 'Task').value;
            const dept = getWbsCellValue(i, '權責', '作業權責', 'Dept').value || '未定義';
            const statusRaw = getWbsCellValue(i, '狀態', '工作狀態').value;
            
            let taskStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' = 'NOT_STARTED';
            if (statusRaw.includes('完成') || statusRaw.includes('COMPLETED')) taskStatus = 'COMPLETED';
            else if (statusRaw.includes('行') || statusRaw.includes('IN_PROGRESS')) taskStatus = 'IN_PROGRESS';

            const plannedDate = parseExcelDate(getWbsCellValue(i, '預計完成', '預定試模', 'Target Date').value);
            const startDate = parseExcelDate(getWbsCellValue(i, '開始日', '開始日期', '預計開始', 'Start Date').value);
            const actualDate = taskStatus === 'COMPLETED' ? parseExcelDate(getWbsCellValue(i, '完成日期', 'Actual Date').value) : null;
            
            const deliverableInfo = getWbsCellValue(i, '交付', '交付物', '相關文件', '文件', 'Deliverable');
            // Store as "value||url" to parse in frontend
            const deliverable = deliverableInfo.url ? `${deliverableInfo.value}||${deliverableInfo.url}` : deliverableInfo.value;
            
            if (deliverableInfo.url) {
              console.log(`Task ${wbsCode} has link: ${deliverableInfo.url}`);
            }

            await prisma.task.create({
              data: {
                project_id: project.id,
                wbs_code: wbsCode,
                task_name: taskName,
                dept: dept,
                start_date: startDate,
                planned_date: plannedDate,
                actual_date: actualDate,
                deliverable,
                status: taskStatus,
                depends_on: getWbsCellValue(i, '前置任務', 'Depends On').value || null,
              }
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Google Sheet data imported successfully.', records: importedCount });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: error.message || 'File processing failed.' }, { status: 500 });
  }
}
