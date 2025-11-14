import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Grade conversion utilities
const GCSE_GRADES = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const ALEVEL_GRADES = ['U', 'E', 'D', 'C', 'B', 'A', 'A*'];

function gradeToNumeric(grade: string, isALevel: boolean = false): number {
  if (!grade) return 0;

  if (isALevel) {
    const index = ALEVEL_GRADES.indexOf(grade);
    return index >= 0 ? index : 0;
  } else {
    const gradeNum = parseInt(grade);
    return isNaN(gradeNum) ? 0 : gradeNum;
  }
}

function calculateProgress(currentGrade: string, targetGrade: string, isALevel: boolean = false): string {
  const current = gradeToNumeric(currentGrade, isALevel);
  const target = gradeToNumeric(targetGrade, isALevel);

  if (current >= target) return 'On Target';
  if (current === target - 1) return 'Borderline';
  return 'Below Target';
}

// GET /api/teacher/analytics - Get comprehensive analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const yearGroup = searchParams.get('yearGroup');

    // Get all students for this teacher
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
          where: subject ? { subject } : {},
          orderBy: { date: 'desc' },
        },
      },
    });

    // Calculate KPIs
    const analytics = {
      totalStudents: students.length,
      subjects: [] as any[],
      overallProgress: {
        onTarget: 0,
        borderline: 0,
        belowTarget: 0,
        noData: 0,
      },
      gradeDistribution: {} as any,
      equityMetrics: {
        pupilPremium: {
          total: 0,
          onTarget: 0,
          averageGrade: 0,
        },
        sen: {
          total: 0,
          onTarget: 0,
          averageGrade: 0,
        },
        eal: {
          total: 0,
          onTarget: 0,
          averageGrade: 0,
        },
      },
      recentAssessments: [] as any[],
      atRiskStudents: [] as any[],
    };

    // Group assessments by subject
    const subjectMap = new Map<string, any>();

    students.forEach(student => {
      // Track equity metrics
      if (student.pupilPremium) analytics.equityMetrics.pupilPremium.total++;
      if (student.senStatus) analytics.equityMetrics.sen.total++;
      if (student.ealStatus) analytics.equityMetrics.eal.total++;

      student.assessments.forEach(assessment => {
        if (!subjectMap.has(assessment.subject)) {
          subjectMap.set(assessment.subject, {
            subject: assessment.subject,
            studentCount: new Set(),
            assessmentCount: 0,
            averageGrade: 0,
            gradeSum: 0,
            gradeCount: 0,
            onTarget: 0,
            borderline: 0,
            belowTarget: 0,
          });
        }

        const subjectData = subjectMap.get(assessment.subject);
        subjectData.studentCount.add(student.id);
        subjectData.assessmentCount++;

        if (assessment.grade) {
          const gradeNum = gradeToNumeric(assessment.grade);
          subjectData.gradeSum += gradeNum;
          subjectData.gradeCount++;

          // Grade distribution
          if (!analytics.gradeDistribution[assessment.grade]) {
            analytics.gradeDistribution[assessment.grade] = 0;
          }
          analytics.gradeDistribution[assessment.grade]++;
        }

        // Progress tracking
        if (assessment.grade && assessment.targetGrade) {
          const progress = calculateProgress(assessment.grade, assessment.targetGrade);

          if (progress === 'On Target') {
            subjectData.onTarget++;
            analytics.overallProgress.onTarget++;

            if (student.pupilPremium) analytics.equityMetrics.pupilPremium.onTarget++;
            if (student.senStatus) analytics.equityMetrics.sen.onTarget++;
            if (student.ealStatus) analytics.equityMetrics.eal.onTarget++;
          } else if (progress === 'Borderline') {
            subjectData.borderline++;
            analytics.overallProgress.borderline++;
          } else {
            subjectData.belowTarget++;
            analytics.overallProgress.belowTarget++;

            // Identify at-risk students
            analytics.atRiskStudents.push({
              studentId: student.id,
              studentName: student.name,
              yearGroup: student.yearGroup,
              subject: assessment.subject,
              currentGrade: assessment.grade,
              targetGrade: assessment.targetGrade,
              gap: gradeToNumeric(assessment.targetGrade) - gradeToNumeric(assessment.grade),
              senStatus: student.senStatus,
              pupilPremium: student.pupilPremium,
              ealStatus: student.ealStatus,
            });
          }
        }
      });
    });

    // Calculate averages per subject
    subjectMap.forEach((data, subject) => {
      analytics.subjects.push({
        subject,
        studentCount: data.studentCount.size,
        assessmentCount: data.assessmentCount,
        averageGrade: data.gradeCount > 0
          ? (data.gradeSum / data.gradeCount).toFixed(2)
          : 'N/A',
        onTargetPercent: data.onTarget > 0
          ? ((data.onTarget / (data.onTarget + data.borderline + data.belowTarget)) * 100).toFixed(1)
          : '0',
        borderlinePercent: data.borderline > 0
          ? ((data.borderline / (data.onTarget + data.borderline + data.belowTarget)) * 100).toFixed(1)
          : '0',
        belowTargetPercent: data.belowTarget > 0
          ? ((data.belowTarget / (data.onTarget + data.borderline + data.belowTarget)) * 100).toFixed(1)
          : '0',
      });
    });

    // Calculate equity metrics percentages
    if (analytics.equityMetrics.pupilPremium.total > 0) {
      analytics.equityMetrics.pupilPremium.onTargetPercent =
        ((analytics.equityMetrics.pupilPremium.onTarget / analytics.equityMetrics.pupilPremium.total) * 100).toFixed(1);
    }

    if (analytics.equityMetrics.sen.total > 0) {
      analytics.equityMetrics.sen.onTargetPercent =
        ((analytics.equityMetrics.sen.onTarget / analytics.equityMetrics.sen.total) * 100).toFixed(1);
    }

    if (analytics.equityMetrics.eal.total > 0) {
      analytics.equityMetrics.eal.onTargetPercent =
        ((analytics.equityMetrics.eal.onTarget / analytics.equityMetrics.eal.total) * 100).toFixed(1);
    }

    // Sort at-risk students by gap (highest first)
    analytics.atRiskStudents.sort((a, b) => b.gap - a.gap);
    analytics.atRiskStudents = analytics.atRiskStudents.slice(0, 20); // Top 20

    // Get recent assessments
    const allAssessments = students.flatMap(s =>
      s.assessments.map(a => ({
        ...a,
        studentName: s.name,
        yearGroup: s.yearGroup,
      }))
    );
    allAssessments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    analytics.recentAssessments = allAssessments.slice(0, 10);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
