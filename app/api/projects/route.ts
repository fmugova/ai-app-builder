import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    
    // If no session, return empty projects
    if (!session?.user?.email) {
      return NextResponse.json({ projects: [] });
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ projects: [] });
    }

    // Get ONLY this user's projects
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        code: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        isPublic: true,
        shareToken: true,
        userId: true,
      },
    });

    const formattedProjects = projects.map(project => ({
      id: project.id,
      name: project.name || 'Untitled Project',
      description: project.description || '',
      type: project.type || 'webapp',
      code: project.code,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      isPublic: project.isPublic || false,
      shareToken: project.shareToken || null,
    }));

    return NextResponse.json({ projects: formattedProjects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects", projects: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("📝 Received save request:", { name: body.name, type: body.type });
    
    const { name, description, type, code } = body;

    if (!name || !code) {
      console.error("❌ Missing required fields:", { hasName: !!name, hasCode: !!code });
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    try {
      await prisma.$connect();
      console.log("✅ Database connected");
    } catch (connError) {
      console.error("❌ Database connection failed:", connError);
      return NextResponse.json(
        { 
          error: "Database connection failed", 
          details: "Please check your DATABASE_URL environment variable",
        },
        { status: 500 }
      );
    }

    const session = await getServerSession(authConfig);
    let userId: string;

    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });
      
      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
      
      userId = user.id;
      console.log("✅ Saving for logged-in user:", user.email);
    } else {
      console.log("👤 No session, using demo user...");
      
      const demoEmail = "demo@buildflow.app";
      let demoUser = await prisma.user.findUnique({
        where: { email: demoEmail },
      });
      
      if (!demoUser) {
        demoUser = await prisma.user.create({
          data: {
            email: demoEmail,
            name: "Demo User",
            password: "demo123",
          },
        });
        console.log("✅ Demo user created");
      }
      
      userId = demoUser.id;
    }

    console.log("💾 Creating project with userId:", userId);

    const project = await prisma.project.create({
      data: {
        name,
        description: description || '',
        code,
        type: type || 'webapp',
        userId: userId,
        isPublic: false,
      },
    });

    console.log("✅ Project created successfully:", project.id);

    return NextResponse.json({
      id: project.id,
      name: project.name,
      description: project.description,
      type: project.type,
      code: project.code,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      isPublic: project.isPublic,
      shareToken: project.shareToken,
    });
    
  } catch (error: any) {
    console.error("❌ Unexpected error:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to create project", 
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}