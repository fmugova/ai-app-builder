import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // For now, return all projects since we don't have auth
    // In production, you'd filter by user
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

    // Ensure all projects have required fields with defaults
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

    // For now, create with a placeholder user
    // In production, get user from session
    const placeholderUserId = "demo-user";

    const project = await prisma.project.create({
      data: {
        name,
        description: description || '',
        code,
        type: type || 'webapp', // ✅ Added type field
        userId: placeholderUserId,
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
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}