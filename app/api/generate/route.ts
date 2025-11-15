import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { prompt, projectId, userEmail } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    let user = userEmail
      ? await prisma.user.findUnique({
          where: { email: userEmail },
          include: { subscription: true },
        })
      : null;

    const userPlan = user?.subscription?.plan || "FREE";
    const limits: Record<string, number> = {
      FREE: 3,
      PRO: 999999,
      ENTERPRISE: 999999,
    };
    const limit = limits[userPlan] || 3;

    let generationCount = 0;
    if (user) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      generationCount = await prisma.generation.count({
        where: {
          userId: user.id,
          createdAt: { gte: thirtyDaysAgo },
        },
      });

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
    }

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

    if (user) {
      await prisma.generation.create({
        data: {
          userId: user.id,
          prompt,
          response: generatedCode,  // 
          type: "COMPONENT",  // ✅ Required field
        },
      });
    }

    return NextResponse.json({
      code: generatedCode,
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