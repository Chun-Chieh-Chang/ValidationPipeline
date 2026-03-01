import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as xlsx from 'xlsx';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        tasks: { orderBy: { wbs_code: 'asc' } },
        phases: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 1. Prepare Summary Data (Master view)
    const summaryData = [
      {
        '模具號碼': project.project_no,
        '品號': project.part_no,
        '版次': project.rev,
        '專案類型': project.type,
        '專案目的': project.purpose,
        '發出者': project.owner,
        'ECR編號': project.ecr_no,
        'ECR日期': project.ecr_date ? new Date(project.ecr_date).toLocaleDateString() : '',
        '起始日期': project.start_date ? new Date(project.start_date).toLocaleDateString() : '',
        '狀態': project.status === 'CLOSED' ? '已結案' : '進行中',
      }
    ];

    // 2. Prepare Detailed WBS Data
    const wbsData = project.tasks.map((t: any) => ({
      '工作序': t.wbs_code,
      '項目名稱': t.task_name,
      '權責部門': t.dept,
      '狀態': t.status,
      '預計完成日': t.planned_date ? new Date(t.planned_date).toLocaleDateString() : '',
      '實際完成日': t.actual_date ? new Date(t.actual_date).toLocaleDateString() : '',
      '交付物': t.deliverable || '',
      '進度%': t.progress || '',
      '前置任務': t.depends_on || '',
    }));

    // 3. Create Workbook
    const wb = xlsx.utils.book_new();
    
    const wsSummary = xlsx.utils.json_to_sheet(summaryData);
    xlsx.utils.book_append_sheet(wb, wsSummary, '專案概要');

    const wsWBS = xlsx.utils.json_to_sheet(wbsData);
    xlsx.utils.book_append_sheet(wb, wsWBS, 'WBS 詳細清單');

    // 4. Generate Buffer
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 5. Return as file download
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="Project_${project.project_no}_Export.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (error: any) {
    console.error('Export Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
