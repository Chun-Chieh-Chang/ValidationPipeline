import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as xlsx from 'xlsx';

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        phases: true,
        tasks: true
      },
      orderBy: { created_at: 'desc' }
    });

    const exportData = projects.map((p: any) => {
      const getPhaseStatus = (name: string) => {
        const ph = p.phases.find((ph: any) => ph.phase_name === name);
        return ph ? (ph.completion_status === 'COMPLETED' ? 'V' : '') : '';
      };

      return {
        '模具號碼': p.project_no,
        '品號': p.part_no,
        '版次': p.rev,
        '類型': p.type,
        '目的': p.purpose,
        '負責人': p.owner,
        'ECR編號': p.ecr_no,
        'PD': getPhaseStatus('PD'),
        'FA': getPhaseStatus('FA'),
        'OQ': getPhaseStatus('OQ'),
        'PQ': getPhaseStatus('PQ'),
        'EC': getPhaseStatus('EC'),
        '圖面進版': getPhaseStatus('圖面進版'),
        '當前進度': `${p.tasks.filter((t: any) => t.status === 'COMPLETED').length}/${p.tasks.length}`,
        '狀態': p.status === 'CLOSED' ? '已結案' : '進行中',
        '匯入/建立時間': new Date(p.created_at).toLocaleDateString()
      };
    });

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(exportData);
    xlsx.utils.book_append_sheet(wb, ws, '專案清單總表');

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Disposition': 'attachment; filename="All_Projects_Master_Export.xlsx"',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
