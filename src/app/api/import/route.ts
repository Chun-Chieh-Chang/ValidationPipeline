import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;
    if (!file) {
      return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = xlsx.read(buffer, { type: 'buffer' });

    // 取得 Master sheet
    let masterSheetName = 'Master sheet';
    if (!workbook.SheetNames.includes(masterSheetName)) {
      masterSheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('master')) || workbook.SheetNames[1];
    }
    const masterSheet = workbook.Sheets[masterSheetName];
    const masterData = xlsx.utils.sheet_to_json<any>(masterSheet, { defval: '' });

    // 這裡紀錄已經匯入的 Project ID 以便等等處理 WBS
    const importedProjects: { dbId: string, projectNo: string }[] = [];

    // Help find keys that might have slightly different names (newlines, spaces, etc.)
    const findValue = (row: any, ...keys: string[]) => {
      const rowKeys = Object.keys(row);
      for (const key of keys) {
        if (row[key] !== undefined && row[key] !== '') return row[key];
        // Partial match
        const foundKey = rowKeys.find(rk => 
          rk.replace(/\s/g, '').includes(key.replace(/\s/g, ''))
        );
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') return row[foundKey];
      }
      return '';
    };

    const parseExcelDate = (val: any) => {
      if (!val || val === '') return null;
      if (typeof val === 'number') {
        const date = new Date((val - 25569) * 86400 * 1000);
        return isNaN(date.getTime()) ? null : date;
      }
      const parsed = new Date(Date.parse(val.toString()));
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    // 開始解析並 upsert Project
    for (let row of masterData) {
      const projectNoValue = findValue(row, '模具號碼', 'Project No', 'No.', '項次');
      const projectNo = projectNoValue ? projectNoValue.toString().trim() : '';
      
      // 若無模具號碼則跳過
      if (!projectNo || projectNo === 'false' || projectNo === 'undefined' || projectNo === '') continue;

      const type = findValue(row, '專案類型', 'Type');
      const partNo = findValue(row, '品號', 'Part No');
      const rev = findValue(row, '工程圖面版次', '版次', 'Rev');
      const purpose = findValue(row, '目的', 'Purpose');
      const owner = findValue(row, '發出者', 'Owner');
      const ecrNo = findValue(row, 'ECR編號', 'ECR No');
      
      const priorityRaw = findValue(row, '優先度');
      const priority = isNaN(parseInt(priorityRaw)) ? 3 : parseInt(priorityRaw);

      const statusText = findValue(row, '狀態').toString();
      const status = statusText.includes('CLOSED') || statusText.includes('結案') ? 'CLOSED' : 'IN_PROGRESS';

      // UPSERT Project
      const project = await prisma.project.upsert({
        where: { project_no: projectNo },
        update: {
          part_no: partNo.toString(),
          rev: rev.toString(),
          type: type.toString(),
          purpose: purpose.toString(),
          priority,
          status,
          owner: owner.toString(),
          ecr_no: ecrNo.toString(),
          ecr_date: parseExcelDate(findValue(row, 'ECR開立日')),
          start_date: parseExcelDate(findValue(row, '專案起始日期'))
        },
        create: {
          project_no: projectNo,
          part_no: partNo.toString(),
          rev: rev.toString(),
          type: type.toString(),
          purpose: purpose.toString(),
          priority,
          status,
          owner: owner.toString(),
          ecr_no: ecrNo.toString(),
          ecr_date: parseExcelDate(findValue(row, 'ECR開立日')),
          start_date: parseExcelDate(findValue(row, '專案起始日期'))
        }
      });
      
      // 1.2 Process Phases (PD, FA, OQ, PQ, EC, 圖面進版)
      const phases = ['PD', 'FA', 'OQ', 'PQ', 'EC', '圖面進版'];
      for (const phaseName of phases) {
        const val = findValue(row, phaseName);
        if (val !== '') {
          await prisma.projectPhase.upsert({
            where: { project_id_phase_name: { project_id: project.id, phase_name: phaseName } },
            update: { 
              completion_status: val === true || val === 'TRUE' || val === '已完成' ? 'COMPLETED' : 'PENDING',
              is_required: true 
            },
            create: {
              project_id: project.id,
              phase_name: phaseName,
              completion_status: val === true || val === 'TRUE' || val === '已完成' ? 'COMPLETED' : 'PENDING',
              is_required: true
            }
          });
        }
      }

      importedProjects.push({ dbId: project.id, projectNo: project.project_no });
    }

    // 第二段：匯入 WBS 任務
    for (const sheetName of workbook.SheetNames) {
      if (sheetName === masterSheetName || sheetName === '項目概要') continue;

      // 看看這個 sheet name 有沒有出現在 imported projects 的 project_no 內
      const proj = importedProjects.find(p => sheetName.startsWith(p.projectNo));
      if (!proj) continue; // 如果找不到對應的 Project 代表他可能是空白頁 or 無關頁

      // 解析此工作表 (range 1 to skip merged main header row)
      const sData = xlsx.utils.sheet_to_json<any>(workbook.Sheets[sheetName], { range: 1, defval: '' });

      // 當我們重新匯入 WBS，先清除該 proj 底下的舊任務
      await prisma.task.deleteMany({
        where: { project_id: proj.dbId }
      });

      const tasksToCreate = [];
      for (const row of sData) {
        const wbsCode = findValue(row, '工作序', 'WBS').toString();
        // Skip legend/empty rows
        if (!wbsCode || wbsCode === 'wbs' || wbsCode === '') continue;

        const taskName = findValue(row, '項目', '工作項目', 'Task');
        const dept = findValue(row, '權責', '作業權責', 'Dept') || '未定義';
        const taskStatusRaw = findValue(row, '狀態', '工作狀態').toString();
        
        let taskStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' = 'NOT_STARTED';
        if (taskStatusRaw.includes('完成') || taskStatusRaw.includes('COMPLETED')) taskStatus = 'COMPLETED';
        else if (taskStatusRaw.includes('行') || taskStatusRaw.includes('IN_PROGRESS')) taskStatus = 'IN_PROGRESS';

        const plannedDate = parseExcelDate(findValue(row, '預計完成', '預定試模', 'Target Date'));
        const startDate = parseExcelDate(findValue(row, '開始日期', 'Start Date'));
        const actualDate = taskStatus === 'COMPLETED' ? parseExcelDate(findValue(row, '完成日期', 'Actual Date')) : null;

        tasksToCreate.push({
          project_id: proj.dbId,
          wbs_code: wbsCode,
          task_name: taskName.toString(),
          dept: dept.toString(),
          status: taskStatus,
          planned_date: plannedDate,
          start_date: startDate,
          actual_date: actualDate,
          deliverable: findValue(row, '交付', 'Deliverable').toString(),
          progress: findValue(row, '交件', 'Progress').toString(),
          depends_on: findValue(row, '前置任務', 'Depends On').toString() || null,
        });
      }

      if (tasksToCreate.length > 0) {
        await prisma.task.createMany({
          data: tasksToCreate
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Data imported successfully', records: importedProjects.length });
  } catch (error: any) {
    console.error("Import error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
