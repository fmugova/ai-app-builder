import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const versions = await prisma.projectVersion.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ versions });

  } catch (error) {
    console.error("Error fetching versions:", error);
    return NextResponse.json(
      { error: "Failed to fetch versions" },
      { status: 500 }
    );
  }
}