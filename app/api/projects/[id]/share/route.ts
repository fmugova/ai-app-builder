import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const params = await context.params;
    
    // Verify project ownership
    const existingProject = await prisma.project.findUnique({
      where: { id: params.id },
      select: { userId: true }
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    if (existingProject.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You don't have permission to modify this project" },
        { status: 403 }
      );
    }

    const { isPublic } = await request.json();

    // Generate share token if making public
    const shareToken = isPublic ? randomBytes(16).toString("hex") : null;

    const project = await prisma.project.update({
      where: { id: params.id },
      data: {
        isPublic,
        shareToken,
      },
    });

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        type: project.type,
        code: project.code,
        isPublic: project.isPublic,
        shareToken: project.shareToken,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error toggling share:", error);
    return NextResponse.json(
      { error: "Failed to update share settings" },
      { status: 500 }
    );
  }
}