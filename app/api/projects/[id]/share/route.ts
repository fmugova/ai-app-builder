import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nanoid } from "nanoid";

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { isPublic, regenerate } = body;

    const project = await prisma.project.findUnique({
      where: { id }
    });

    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const updates: any = { isPublic };
    
    if (isPublic && (!project.shareToken || regenerate)) {
      updates.shareToken = nanoid(10);
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: updates
    });

    return NextResponse.json({
      isPublic: updatedProject.isPublic,
      shareToken: updatedProject.shareToken
    });

  } catch (error) {
    console.error("Error updating sharing:", error);
    return NextResponse.json(
      { error: "Failed to update sharing settings" },
      { status: 500 }
    );
  }
}