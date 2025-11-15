import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params; // ✅ Await params in Next.js 16
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