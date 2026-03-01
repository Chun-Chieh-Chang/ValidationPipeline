import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { status, actual_date } = await request.json();
    
    // 取得當前任務資訊
    const currentTask = await prisma.task.findUnique({
      where: { id: params.id },
      include: { project: true }
    });

    if (!currentTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // 更新任務狀態
    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: { 
        status,
        actual_date: actual_date ? new Date(actual_date) : undefined
      }
    });

    // 簽核流程與通知邏輯 (當任務標記為完成)
    if (status === 'COMPLETED') {
      // 找出所有該專案的任務
      const projectTasks = await prisma.task.findMany({
        where: { project_id: currentTask.project_id },
        orderBy: { wbs_code: 'asc' }
      });

      // 1. 如果有其他任務的 depends_on 包含此 task 的 wbs_code，則那些是後續任務
      let nextTasks = projectTasks.filter((t: any) => t.depends_on && t.depends_on.includes(currentTask.wbs_code));

      // 2. 如果沒有設定明確的關聯，則退回預設邏輯：尋找清單中的「下一個」任務
      if (nextTasks.length === 0) {
        const idx = projectTasks.findIndex((t: any) => t.wbs_code === currentTask.wbs_code);
        if (idx !== -1 && idx + 1 < projectTasks.length) {
          nextTasks = [projectTasks[idx + 1]];
        }
      }

      for (const nextTask of nextTasks) {
        // 確認下一個任務的其他前置任務是否也全完成 (若有多個前置)
        let readyToNotify = true;
        if (nextTask.depends_on) {
           const deps = nextTask.depends_on.split(',').map((s: string) => s.trim());
           const uncompletedDeps = projectTasks.filter((t: any) => deps.includes(t.wbs_code) && t.status !== 'COMPLETED');
           // 如果還有其他前置尚未完成，就先不要發通知（這點可能因實際管理情況而異，這裡先不擋，或者可以發出「部份前置完成」通知）
           if (uncompletedDeps.length > 0) readyToNotify = false;
        }

        if (readyToNotify && nextTask.status !== 'COMPLETED') {
          const plannedDate = nextTask.planned_date 
              ? new Date(nextTask.planned_date).toLocaleDateString() 
              : '未定';
          
          await prisma.notification.create({
            data: {
              project_id: currentTask.project_id,
              task_id: nextTask.id,
              target_dept: nextTask.dept,
              message: `前置任務「${currentTask.task_name}」已完成。請準備接手「${nextTask.task_name}」(預計: ${plannedDate})。`
            }
          });
        }
      }

      // 檢查是否所有任務都完成了，如果是，更新 Project 狀態為 CLOSED
      const unresolvedTasks = await prisma.task.count({
        where: {
          project_id: currentTask.project_id,
          status: { not: 'COMPLETED' }
        }
      });

      if (unresolvedTasks === 0) {
        await prisma.project.update({
          where: { id: currentTask.project_id },
          data: { status: 'CLOSED' }
        });
      }
    }

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
