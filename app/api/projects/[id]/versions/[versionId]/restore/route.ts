import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, versionId } = await params;

    const version = await prisma.projectVersion.findUnique({
      where: { id: versionId }
    });

    if (!version || version.projectId !== id) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // Update project with version code
    await prisma.project.update({
      where: { id },
      data: { 
        code: version.code,
        updatedAt: new Date()
      }
    });

    // Create new version for the restore
    await prisma.projectVersion.create({
      data: {
        projectId: id,
        version: version.version,
        code: version.code,
        description: `Restored from version ${version.version}`
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error restoring version:", error);
    return NextResponse.json(
      { error: "Failed to restore version" },
      { status: 500 }
    );
  }
}