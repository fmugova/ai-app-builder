import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST /api/assessments/upload - Bulk upload assessments from CSV data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { assessments } = body;

    if (!assessments || !Array.isArray(assessments)) {
      return NextResponse.json(
        { error: 'Invalid data format. Expected array of assessments' },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    // Process each assessment
    for (let i = 0; i < assessments.length; i++) {
      const assessment = assessments[i];

      try {
        // Find or create student by name
        let student = await prisma.student.findFirst({
          where: {
            userId: session.user.id,
            name: assessment.studentName,
          },
        });

        // Create student if doesn't exist
        if (!student) {
          student = await prisma.student.create({
            data: {
              userId: session.user.id,
              name: assessment.studentName,
              yearGroup: parseInt(assessment.yearGroup) || 11,
              subjects: JSON.stringify([assessment.subject]),
              senStatus: assessment.senStatus === 'true' || assessment.senStatus === true,
              ealStatus: assessment.ealStatus === 'true' || assessment.ealStatus === true,
              pupilPremium: assessment.pupilPremium === 'true' || assessment.pupilPremium === true,
            },
          });
        }

        // Parse topic breakdown if provided
        let topicBreakdown = null;
        if (assessment.topicBreakdown) {
          try {
            topicBreakdown = typeof assessment.topicBreakdown === 'string'
              ? assessment.topicBreakdown
              : JSON.stringify(assessment.topicBreakdown);
          } catch {
            topicBreakdown = null;
          }
        }

        // Create assessment
        await prisma.assessment.create({
          data: {
            studentId: student.id,
            subject: assessment.subject,
            assessmentType: assessment.assessmentType || 'Mock Exam',
            date: assessment.date ? new Date(assessment.date) : new Date(),
            score: assessment.score ? parseFloat(assessment.score) : null,
            grade: assessment.grade?.toString(),
            targetGrade: assessment.targetGrade?.toString(),
            predictedGrade: assessment.predictedGrade?.toString(),
            topicBreakdown,
            notes: assessment.notes,
          },
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          studentName: assessment.studentName,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      message: `Upload complete. ${results.success} successful, ${results.failed} failed.`,
      results,
    });
  } catch (error) {
    console.error('Error uploading assessments:', error);
    return NextResponse.json(
      { error: 'Failed to upload assessments' },
      { status: 500 }
    );
  }
}
