import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/assessments - Get all assessments with optional filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const subject = searchParams.get('subject');
    const assessmentType = searchParams.get('assessmentType');

    const whereClause: any = {
      student: {
        userId: session.user.id,
      },
    };

    if (studentId) {
      whereClause.studentId = studentId;
    }

    if (subject) {
      whereClause.subject = subject;
    }

    if (assessmentType) {
      whereClause.assessmentType = assessmentType;
    }

    const assessments = await prisma.assessment.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            yearGroup: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(assessments);
  } catch (error) {
    console.error('Error fetching assessments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessments' },
      { status: 500 }
    );
  }
}

// POST /api/assessments - Create a new assessment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      studentId,
      subject,
      assessmentType,
      date,
      score,
      grade,
      targetGrade,
      predictedGrade,
      topicBreakdown,
      notes,
    } = body;

    // Validate required fields
    if (!studentId || !subject || !assessmentType || !date) {
      return NextResponse.json(
        { error: 'Student ID, subject, assessment type, and date are required' },
        { status: 400 }
      );
    }

    // Verify student belongs to this teacher
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        userId: session.user.id,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found or unauthorized' },
        { status: 404 }
      );
    }

    // Ensure topicBreakdown is a JSON string if provided
    const topicBreakdownJson = topicBreakdown
      ? typeof topicBreakdown === 'string'
        ? topicBreakdown
        : JSON.stringify(topicBreakdown)
      : null;

    const assessment = await prisma.assessment.create({
      data: {
        studentId,
        subject,
        assessmentType,
        date: new Date(date),
        score: score ? parseFloat(score) : null,
        grade,
        targetGrade,
        predictedGrade,
        topicBreakdown: topicBreakdownJson,
        notes,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            yearGroup: true,
          },
        },
      },
    });

    return NextResponse.json(assessment, { status: 201 });
  } catch (error) {
    console.error('Error creating assessment:', error);
    return NextResponse.json(
      { error: 'Failed to create assessment' },
      { status: 500 }
    );
  }
}
