import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/students - Get all students for the logged-in teacher
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const yearGroup = searchParams.get('yearGroup');
    const subject = searchParams.get('subject');

    const whereClause: any = {
      userId: session.user.id,
    };

    if (yearGroup) {
      whereClause.yearGroup = parseInt(yearGroup);
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        assessments: {
          orderBy: { date: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            assessments: true,
            communications: true,
          },
        },
      },
      orderBy: [
        { yearGroup: 'desc' },
        { name: 'asc' },
      ],
    });

    // Filter by subject if provided (subjects are stored as JSON)
    let filteredStudents = students;
    if (subject) {
      filteredStudents = students.filter(student => {
        try {
          const subjects = JSON.parse(student.subjects);
          return subjects.includes(subject);
        } catch {
          return false;
        }
      });
    }

    return NextResponse.json(filteredStudents);
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

// POST /api/students - Create a new student
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
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

    // Validate required fields
    if (!name || !yearGroup) {
      return NextResponse.json(
        { error: 'Name and year group are required' },
        { status: 400 }
      );
    }

    // Ensure subjects is a JSON string
    const subjectsJson = typeof subjects === 'string'
      ? subjects
      : JSON.stringify(subjects || []);

    const student = await prisma.student.create({
      data: {
        userId: session.user.id,
        name,
        yearGroup: parseInt(yearGroup),
        subjects: subjectsJson,
        senStatus: senStatus || false,
        ealStatus: ealStatus || false,
        pupilPremium: pupilPremium || false,
        priorAttainment: priorAttainment || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json(
      { error: 'Failed to create student' },
      { status: 500 }
    );
  }
}
