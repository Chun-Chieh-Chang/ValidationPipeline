import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        tasks: {
          select: { status: true }
        },
        phases: true
      }
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { project_no, part_no, rev, type, purpose, owner, ecr_no } = body;

    if (!project_no) {
      return NextResponse.json({ error: '專案號碼 (project_no) 為必填欄位' }, { status: 400 });
    }

    // Default template WBS tasks for a new project
    const defaultTasks = [
      { wbs_code: '1.1', task_name: '變更申請與評估', dept: 'PM', depends_on: null },
      { wbs_code: '1.2', task_name: '工程圖面發行', dept: '工程', depends_on: '1.1' },
      { wbs_code: '2.1', task_name: '模具修改與發包', dept: '生產', depends_on: '1.2' },
      { wbs_code: '2.2', task_name: '試模準備與首件打樣', dept: '生產', depends_on: '2.1' },
      { wbs_code: '3.1', task_name: '首件檢驗 (FA)', dept: '品保', depends_on: '2.2' },
      { wbs_code: '3.2', task_name: '製程確效 (OQ/PQ)', dept: '品保', depends_on: '3.1' },
      { wbs_code: '4.1', task_name: '確效報告結案審查', dept: 'PM', depends_on: '3.2' },
    ];

    const project = await prisma.$transaction(async (tx: any) => {
      // 1. Create the project
      const newProject = await tx.project.create({
        data: {
          project_no,
          part_no: part_no || '',
          rev: rev || '',
          type: type || '設變',
          purpose: purpose || '',
          owner: owner || '系統使用者',
          ecr_no: ecr_no || '',
          status: 'IN_PROGRESS',
        }
      });

      // 2. Create the standard WBS template tasks
      for (const t of defaultTasks) {
        await tx.task.create({
          data: {
            project_id: newProject.id,
            wbs_code: t.wbs_code,
            task_name: t.task_name,
            dept: t.dept,
            status: 'NOT_STARTED',
            depends_on: t.depends_on,
          }
        });
      }

      return newProject;
    });

    return NextResponse.json({ success: true, project });
  } catch (error: any) {
    console.error('Error creating project:', error);
    // Handle Prisma unique constraint error
    if (error.code === 'P2002') {
       return NextResponse.json({ error: '專案號碼已存在' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || '建立專案失敗' }, { status: 500 });
  }
}
