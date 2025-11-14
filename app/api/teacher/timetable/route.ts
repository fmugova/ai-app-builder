import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/teacher/timetable - Get teacher's timetable
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const day = searchParams.get('day');

    const whereClause: any = {
      userId: session.user.id,
    };

    if (day) {
      whereClause.day = day;
    }

    const timetable = await prisma.timetableEntry.findMany({
      where: whereClause,
      orderBy: [
        { day: 'asc' },
        { period: 'asc' },
      ],
    });

    return NextResponse.json(timetable);
  } catch (error) {
    console.error('Error fetching timetable:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timetable' },
      { status: 500 }
    );
  }
}

// POST /api/teacher/timetable - Create timetable entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      day,
      period,
      startTime,
      endTime,
      subject,
      yearGroup,
      classCode,
      room,
      studentCount,
    } = body;

    if (!day || !period || !startTime || !endTime || !subject) {
      return NextResponse.json(
        { error: 'Day, period, times, and subject are required' },
        { status: 400 }
      );
    }

    const entry = await prisma.timetableEntry.create({
      data: {
        userId: session.user.id,
        day,
        period: parseInt(period),
        startTime,
        endTime,
        subject,
        yearGroup: yearGroup || '',
        classCode: classCode || '',
        room,
        studentCount: studentCount ? parseInt(studentCount) : null,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('Error creating timetable entry:', error);
    return NextResponse.json(
      { error: 'Failed to create timetable entry' },
      { status: 500 }
    );
  }
}
