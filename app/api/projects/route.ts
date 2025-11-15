import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const projects = await prisma.project.findMany({
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
    console.log("Received save request:", { name: body.name, type: body.type });
    
    const { name, description, type, code } = body;

    if (!name || !code) {
      console.error("Missing required fields:", { hasName: !!name, hasCode: !!code });
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    console.log("Looking for demo user...");
    
    // Try to get or create a demo user
    const demoEmail = "demo@buildflow.app";
    let user;
    
    try {
      user = await prisma.user.findUnique({
        where: { email: demoEmail },
      });
      console.log("User lookup result:", user ? "Found" : "Not found");
    } catch (findError) {
      console.error("Error finding user:", findError);
      throw findError;
    }

    // If demo user doesn't exist, create it
    if (!user) {
      console.log("Creating new demo user...");
      try {
        user = await prisma.user.create({
          data: {
            email: demoEmail,
            name: "Demo User",
          },
        });
        console.log("Demo user created successfully:", user.id);
      } catch (createError) {
        console.error("Error creating user:", createError);
        // If user creation fails due to unique constraint (race condition),
        // try to fetch again
        user = await prisma.user.findUnique({
          where: { email: demoEmail },
        });
        
        if (!user) {
          throw new Error("Failed to create or find demo user");
        }
      }
    }

    console.log("Creating project with userId:", user.id);

    // Create the project
    const project = await prisma.project.create({
      data: {
        name,
        description: description || '',
        code,
        type: type || 'webapp',
        userId: user.id,
        isPublic: false,
      },
    });

    console.log("Project created successfully:", project.id);

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
  } catch (error) {
    console.error("Error creating project - Full details:", error);
    
    // Return detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error("Error message:", errorMessage);
    console.error("Error stack:", errorStack);
    
    return NextResponse.json(
      { 
        error: "Failed to create project", 
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}