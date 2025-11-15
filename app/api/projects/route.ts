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
    const { name, description, type, code } = await request.json();

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    // Try to get or create a demo user
    const demoEmail = "demo@buildflow.app";
    let user = await prisma.user.findUnique({
      where: { email: demoEmail },
    });

    // If demo user doesn't exist, create it
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: demoEmail,
          name: "Demo User",
          // password is optional, so we don't need to include it
        },
      });
    }

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
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}