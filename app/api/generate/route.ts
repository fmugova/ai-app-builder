import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, projectId } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Get user with subscription
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        subscription: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Count user's generations in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const generationCount = await prisma.generation.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Check usage limits based on plan
    const limits: Record<string, number> = {
      FREE: 3,
      PRO: 999999,
      ENTERPRISE: 999999,
    };

    const userPlan = user.subscription?.plan || "FREE";
    const limit = limits[userPlan] || 3;

    if (generationCount >= limit) {
      return NextResponse.json(
        {
          error: "Generation limit reached",
          limit,
          used: generationCount,
        },
        { status: 429 }
      );
    }

    // Generate code with Claude
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are an expert React developer. Generate a complete, production-ready React component based on this description:

${prompt}

Requirements:
- Use modern React with hooks
- Include proper TypeScript types
- Add Tailwind CSS for styling
- Make it responsive and accessible
- Include comments explaining key parts
- Return ONLY the JSX code, no explanations

Component code:`,
        },
      ],
    });

    const generatedCode =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Save generation to database
    const generation = await prisma.generation.create({
      data: {
        userId: user.id,
        prompt,
        code: generatedCode,
        projectId: projectId || null,
      },
    });

    return NextResponse.json({
      code: generatedCode,
      generationId: generation.id,
      usage: {
        used: generationCount + 1,
        limit,
      },
    });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate code" },
      { status: 500 }
    );
  }
}