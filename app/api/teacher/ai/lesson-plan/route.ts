import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// POST /api/teacher/ai/lesson-plan - Generate a lesson plan using Claude
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      topic,
      subject,
      yearGroup,
      duration,
      priorKnowledge,
      examBoard,
      differentiation,
    } = body;

    if (!topic || !subject || !yearGroup) {
      return NextResponse.json(
        { error: 'Topic, subject, and year group are required' },
        { status: 400 }
      );
    }

    // Construct prompt for Claude
    const prompt = `Generate a comprehensive ${duration || 60}-minute lesson plan for ${subject}.

**Lesson Details:**
- Topic: ${topic}
- Year Group: ${yearGroup}
- Prior Knowledge: ${priorKnowledge || 'Standard knowledge for year group'}
- Exam Board: ${examBoard || 'General UK curriculum'}
- Duration: ${duration || 60} minutes

**Requirements:**
${differentiation ? `- Include differentiation strategies for: ${differentiation}` : '- Include differentiation for mixed ability'}
- Align learning objectives to the specification
- Include engaging starter, main activities, and plenary
- Provide formative assessment opportunities
- Suggest homework tasks
- Include specific resources (websites, worksheets, videos)

Please structure the lesson plan with the following sections:
1. Learning Objectives (aligned to exam specification)
2. Success Criteria
3. Starter Activity (5-10 minutes)
4. Main Activities (with timings)
5. Differentiation Strategies
6. Assessment for Learning
7. Plenary/Exit Ticket
8. Homework
9. Resources Needed
10. Specification Points Covered

Format the response as a well-structured lesson plan that a teacher can immediately use.`;

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

    const lessonPlanContent = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // Parse the lesson plan into structured format
    const structuredPlan = parseLessonPlan(lessonPlanContent);

    return NextResponse.json({
      success: true,
      lessonPlan: lessonPlanContent,
      structured: structuredPlan,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    });
  } catch (error: any) {
    console.error('Error generating lesson plan:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate lesson plan' },
      { status: 500 }
    );
  }
}

// Helper function to parse lesson plan into structured format
function parseLessonPlan(content: string) {
  const sections: any = {
    objectives: [],
    activities: [],
    resources: [],
  };

  try {
    // Extract learning objectives
    const objectivesMatch = content.match(/(?:Learning Objectives|Objectives):?\s*([\s\S]*?)(?=\n\n|\n#|Success Criteria|$)/i);
    if (objectivesMatch) {
      const objectives = objectivesMatch[1]
        .split('\n')
        .filter(line => line.trim().match(/^[-*•]/))
        .map(line => line.trim().replace(/^[-*•]\s*/, ''));
      sections.objectives = objectives;
    }

    // Extract activities (simplified)
    const activitiesMatch = content.match(/(?:Main Activities|Activities):?\s*([\s\S]*?)(?=\n\n#|Differentiation|Assessment|$)/i);
    if (activitiesMatch) {
      const activities = activitiesMatch[1]
        .split('\n')
        .filter(line => line.trim().length > 0 && !line.trim().match(/^#/))
        .map(line => line.trim());
      sections.activities = activities.slice(0, 10); // Limit to 10 activities
    }

    // Extract resources
    const resourcesMatch = content.match(/(?:Resources|Resources Needed):?\s*([\s\S]*?)(?=\n\n#|Specification|$)/i);
    if (resourcesMatch) {
      const resources = resourcesMatch[1]
        .split('\n')
        .filter(line => line.trim().match(/^[-*•]/))
        .map(line => line.trim().replace(/^[-*•]\s*/, ''));
      sections.resources = resources;
    }
  } catch (error) {
    console.error('Error parsing lesson plan:', error);
  }

  return sections;
}
