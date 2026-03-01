import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        phases: true,
        tasks: {
          orderBy: { wbs_code: 'asc' }
        },
        notifications: {
          orderBy: { created_at: 'desc' }
        }
      }
    });

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    return NextResponse.json(project);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { status, phaseId, phaseStatus, ...otherData } = body;

    // 1. Update individual phase if phaseId is provided
    if (phaseId) {
      await prisma.projectPhase.update({
        where: { id: phaseId },
        data: { completion_status: phaseStatus }
      });
      return NextResponse.json({ success: true, message: 'Phase updated' });
    }

    // 2. Update general project data
    const updatedProject = await prisma.project.update({
      where: { id: params.id },
      data: {
        ...otherData,
        status: status || undefined
      }
    });

    return NextResponse.json({ success: true, project: updatedProject });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
