import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, type } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Get user with subscription and count recent generations
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        subscription: true,
        generations: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Define limits per plan
    const planLimits: Record<string, number> = {
      FREE: 3,
      PRO: 999999, // Unlimited
      BUSINESS: 999999, // Unlimited
    };

    const plan = user.subscription?.plan || "FREE";
    const limit = planLimits[plan] || 3;
    const used = user.generations.length;

    // Check if user has exceeded their limit
    if (used >= limit) {
      return NextResponse.json(
        {
          error: "Generation limit reached",
          message: `You have reached your monthly limit of ${limit} generations. Please upgrade your plan.`,
          limit,
          used,
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
          content: `Generate a complete, production-ready ${type} based on this description: ${prompt}
          
          Requirements:
          - Use modern React with TypeScript
          - Include Tailwind CSS for styling
          - Make it responsive and beautiful
          - Add proper error handling
          - Include comments explaining the code
          - Make it a complete, working component
          
          Return ONLY the complete code, no explanations before or after.`,
        },
      ],
    });

    const generatedCode = message.content[0].type === "text" 
      ? message.content[0].text 
      : "";

    // Save generation to database
    await prisma.generation.create({
      data: {
        userId: user.id,
        prompt,
        response: generatedCode,
        type: type || "web-app",
      },
    });

    return NextResponse.json({
      code: generatedCode,
      usage: {
        used: used + 1,
        limit,
        remaining: limit - (used + 1),
      },
    });
  } catch (error) {
    console.error("Generation error:", error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate code" },
      { status: 500 }
    );
  }
}