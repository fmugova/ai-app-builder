import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function getUserFromSession() {
  try {
    const cookieStore = await cookies();  // ← Added await
    const sessionToken = cookieStore.get("next-auth.session-token") || 
                         cookieStore.get("__Secure-next-auth.session-token");
    
    if (!sessionToken) {
      return null;
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken: sessionToken.value },
      include: { user: true },
    });

    if (!session || session.expires < new Date()) {
      return null;
    }

    return session.user;
  } catch (error) {
    console.error("Error getting user from session:", error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromSession();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, type } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const userWithData = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        subscription: true,
        generations: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
    });

    if (!userWithData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const planLimits: Record<string, number> = {
      FREE: 3,
      PRO: 999999,
      BUSINESS: 999999,
    };

    const plan = userWithData.subscription?.plan || "FREE";
    const limit = planLimits[plan] || 3;
    const used = userWithData.generations.length;

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

    await prisma.generation.create({
      data: {
        userId: userWithData.id,
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