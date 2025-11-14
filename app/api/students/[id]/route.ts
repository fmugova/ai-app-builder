import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/students/[id] - Get a specific student
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const student = await prisma.student.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        assessments: {
          orderBy: { date: 'desc' },
        },
        communications: {
          orderBy: { date: 'desc' },
          take: 10,
        },
        interventions: {
          include: {
            intervention: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student' },
      { status: 500 }
    );
  }
}

// PUT /api/students/[id] - Update a student
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify ownership
    const existingStudent = await prisma.student.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const {
      name,
      yearGroup,
      subjects,
      senStatus,
      ealStatus,
      pupilPremium,
      priorAttainment,
      notes,
    } = body;

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (yearGroup !== undefined) updateData.yearGroup = parseInt(yearGroup);
    if (subjects !== undefined) {
      updateData.subjects = typeof subjects === 'string'
        ? subjects
        : JSON.stringify(subjects);
    }
    if (senStatus !== undefined) updateData.senStatus = senStatus;
    if (ealStatus !== undefined) updateData.ealStatus = ealStatus;
    if (pupilPremium !== undefined) updateData.pupilPremium = pupilPremium;
    if (priorAttainment !== undefined) updateData.priorAttainment = priorAttainment;
    if (notes !== undefined) updateData.notes = notes;

    const student = await prisma.student.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(student);
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json(
      { error: 'Failed to update student' },
      { status: 500 }
    );
  }
}

// DELETE /api/students/[id] - Delete a student
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existingStudent = await prisma.student.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    await prisma.student.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json(
      { error: 'Failed to delete student' },
      { status: 500 }
    );
  }
}
