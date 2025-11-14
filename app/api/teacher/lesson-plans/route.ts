import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/teacher/lesson-plans - Get all lesson plans
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const yearGroup = searchParams.get('yearGroup');

    const whereClause: any = {
      userId: session.user.id,
    };

    if (subject) {
      whereClause.subject = subject;
    }

    if (yearGroup) {
      whereClause.yearGroup = yearGroup;
    }

    const lessonPlans = await prisma.lessonPlan.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(lessonPlans);
  } catch (error) {
    console.error('Error fetching lesson plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lesson plans' },
      { status: 500 }
    );
  }
}

// POST /api/teacher/lesson-plans - Create a new lesson plan
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      subject,
      topic,
      yearGroup,
      classCode,
      date,
      duration,
      objectives,
      activities,
      resources,
      differentiation,
      assessment,
      homework,
      reflection,
      specPoints,
    } = body;

    if (!subject || !topic || !yearGroup) {
      return NextResponse.json(
        { error: 'Subject, topic, and year group are required' },
        { status: 400 }
      );
    }

    // Ensure arrays are JSON strings
    const objectivesJson = typeof objectives === 'string'
      ? objectives
      : JSON.stringify(objectives || []);

    const activitiesJson = typeof activities === 'string'
      ? activities
      : JSON.stringify(activities || []);

    const resourcesJson = typeof resources === 'string'
      ? resources
      : JSON.stringify(resources || []);

    const lessonPlan = await prisma.lessonPlan.create({
      data: {
        userId: session.user.id,
        subject,
        topic,
        yearGroup,
        classCode,
        date: date ? new Date(date) : null,
        duration: duration ? parseInt(duration) : null,
        objectives: objectivesJson,
        activities: activitiesJson,
        resources: resourcesJson,
        differentiation,
        assessment,
        homework,
        reflection,
        specPoints,
      },
    });

    return NextResponse.json(lessonPlan, { status: 201 });
  } catch (error) {
    console.error('Error creating lesson plan:', error);
    return NextResponse.json(
      { error: 'Failed to create lesson plan' },
      { status: 500 }
    );
  }
}
