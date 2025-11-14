import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// POST /api/teacher/ai/intervention-plan - Generate intervention plan
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      subject,
      focusArea,
      yearGroup,
      currentGrade,
      targetGrade,
      studentCount,
      duration,
      context,
      availability,
    } = body;

    if (!subject || !focusArea || !yearGroup) {
      return NextResponse.json(
        { error: 'Subject, focus area, and year group are required' },
        { status: 400 }
      );
    }

    // Construct prompt for Claude
    const prompt = `You are an expert teacher trainer specializing in targeted intervention strategies for UK GCSE and A-Level students.

Design a comprehensive intervention plan with the following details:

**Intervention Details:**
- Subject: ${subject}
- Focus Area: ${focusArea}
- Year Group: ${yearGroup}
- Current Grade: ${currentGrade || 'Mixed ability'}
- Target Grade: ${targetGrade || 'Improve by 1-2 grades'}
- Number of Students: ${studentCount || '6-8'}
- Duration: ${duration || '6 weeks'}
- Schedule: ${availability || '1 hour per week after school'}
- Context: ${context || 'Students struggling with this topic area'}

**Plan Requirements:**

1. **Weekly Session Breakdown**
   - Provide a week-by-week plan with specific objectives for each session
   - Include timings and activities for each week
   - Build progressively in difficulty

2. **Session Activities**
   - Specific teaching strategies and activities
   - Active learning opportunities
   - Practice exercises appropriate to ability level

3. **Homework Between Sessions**
   - Manageable tasks to reinforce learning
   - Expected time commitment
   - Links to online resources where applicable

4. **Formative Assessment Checkpoints**
   - How to measure progress each week
   - Mini-assessments or exit tickets
   - Indicators of readiness to move on

5. **Resource Recommendations**
   - Specific websites (e.g., Corbett Maths, Physics & Maths Tutor, BBC Bitesize)
   - Recommended worksheets or practice papers
   - Video resources
   - Exam board specific materials

6. **Exit Criteria**
   - Clear success metrics
   - How to determine if intervention has been effective
   - What level of mastery is expected

7. **Contingency Strategies**
   - What to do if progress is slower than expected
   - Alternative approaches for different learning styles
   - How to adapt for individual needs

Format the plan as a detailed, week-by-week intervention program that a teacher can immediately implement.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const planContent = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // Extract resources from the plan
    const resources = extractResources(planContent);

    return NextResponse.json({
      success: true,
      interventionPlan: planContent,
      extractedResources: resources,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    });
  } catch (error: any) {
    console.error('Error generating intervention plan:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate intervention plan' },
      { status: 500 }
    );
  }
}

// Helper function to extract resource links
function extractResources(content: string): string[] {
  const resources: string[] = [];

  // Common educational resource names
  const resourceNames = [
    'Corbett Maths',
    'Mr Barton Maths',
    'Physics & Maths Tutor',
    'Seneca Learning',
    'Oak National Academy',
    'BBC Bitesize',
    'Isaac Physics',
    'Khan Academy',
    'TES Resources',
    'Save My Exams',
  ];

  resourceNames.forEach(name => {
    if (content.includes(name)) {
      resources.push(name);
    }
  });

  // Remove duplicates
  return [...new Set(resources)];
}
