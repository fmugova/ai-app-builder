import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';
import prisma from '@/lib/prisma';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// POST /api/teacher/ai/analyze-data - Analyze student data and provide insights
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subject, yearGroup, assessmentType } = body;

    if (!subject || !yearGroup) {
      return NextResponse.json(
        { error: 'Subject and year group are required' },
        { status: 400 }
      );
    }

    // Fetch students and their assessments
    const students = await prisma.student.findMany({
      where: {
        userId: session.user.id,
        yearGroup: parseInt(yearGroup),
      },
      include: {
        assessments: {
          where: {
            subject,
            ...(assessmentType && { assessmentType }),
          },
          orderBy: { date: 'desc' },
          take: 3, // Last 3 assessments per student
        },
      },
    });

    if (students.length === 0) {
      return NextResponse.json(
        { error: 'No students found for the specified criteria' },
        { status: 404 }
      );
    }

    // Prepare data summary for Claude
    const dataSummary = students.map(student => {
      const latestAssessment = student.assessments[0];
      return {
        name: student.name,
        currentGrade: latestAssessment?.grade || 'N/A',
        targetGrade: latestAssessment?.targetGrade || 'N/A',
        score: latestAssessment?.score || 'N/A',
        topicBreakdown: latestAssessment?.topicBreakdown
          ? JSON.parse(latestAssessment.topicBreakdown)
          : null,
        senStatus: student.senStatus,
        ealStatus: student.ealStatus,
        pupilPremium: student.pupilPremium,
        trend: calculateTrend(student.assessments),
      };
    });

    // Calculate class statistics
    const stats = {
      totalStudents: students.length,
      averageGrade: calculateAverageGrade(students),
      onTargetCount: students.filter(s => {
        const latest = s.assessments[0];
        return latest && parseInt(latest.grade || '0') >= parseInt(latest.targetGrade || '9');
      }).length,
      belowTargetCount: students.filter(s => {
        const latest = s.assessments[0];
        return latest && parseInt(latest.grade || '0') < parseInt(latest.targetGrade || '9');
      }).length,
    };

    // Construct prompt for Claude
    const prompt = `You are an experienced educational data analyst specializing in UK GCSE and A-Level performance data.

Analyze this ${subject} assessment data for Year ${yearGroup}:

**Class Statistics:**
- Total Students: ${stats.totalStudents}
- Average Current Grade: ${stats.averageGrade}
- Students On Target: ${stats.onTargetCount} (${((stats.onTargetCount / stats.totalStudents) * 100).toFixed(1)}%)
- Students Below Target: ${stats.belowTargetCount} (${((stats.belowTargetCount / stats.totalStudents) * 100).toFixed(1)}%)

**Individual Student Data:**
${JSON.stringify(dataSummary, null, 2)}

**Analysis Required:**

1. **Overall Class Performance Summary** (RAG rated: Red/Amber/Green)
   - Provide a clear performance rating and justification

2. **Top 3 Class Strengths** (with specific evidence from the data)
   - What are students doing well?
   - Which topics show strong performance?

3. **Top 3 Priority Weaknesses** (requiring intervention)
   - Where are the biggest gaps?
   - Which students need immediate support?
   - Which topics need reteaching?

4. **Equity Analysis**
   - Are there performance gaps for SEN, EAL, or Pupil Premium students?
   - What patterns emerge?

5. **Specific Intervention Recommendations**
   - Which students should be grouped together?
   - What specific topics should be the focus?
   - Suggested intervention strategies

6. **Teaching Priorities for Next 4 Weeks**
   - What should be the focus in upcoming lessons?
   - Which specification points need attention?

7. **Predicted Outcomes**
   - If the current trajectory continues, what are likely outcomes?
   - How many students are at risk of not meeting targets?

Please provide actionable, specific insights that a teacher can immediately act upon. Format with clear headings and bullet points.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 3000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const analysisContent = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    return NextResponse.json({
      success: true,
      analysis: analysisContent,
      classStats: stats,
      studentCount: students.length,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    });
  } catch (error: any) {
    console.error('Error analyzing data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze data' },
      { status: 500 }
    );
  }
}

// Helper functions
function calculateTrend(assessments: any[]): string {
  if (assessments.length < 2) return 'Insufficient Data';

  const latest = parseInt(assessments[0]?.grade || '0');
  const previous = parseInt(assessments[1]?.grade || '0');

  if (latest > previous) return 'Improving';
  if (latest < previous) return 'Declining';
  return 'Stable';
}

function calculateAverageGrade(students: any[]): string {
  const grades = students
    .map(s => parseInt(s.assessments[0]?.grade || '0'))
    .filter(g => g > 0);

  if (grades.length === 0) return 'N/A';

  const average = grades.reduce((a, b) => a + b, 0) / grades.length;
  return average.toFixed(1);
}
