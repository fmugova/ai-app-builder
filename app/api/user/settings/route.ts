// app/api/user/settings/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const settingsSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  notifications: z.boolean().optional(),
  autoSave: z.boolean().optional(),
});

import type { Session } from 'next-auth';
import type { Prisma } from '@prisma/client';

async function getUserFromSession(
  session: Session | null,
  select?: Prisma.UserSelect
) {
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({ where: { email: session.user.email }, ...(select ? { select } : {}) });
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const select = {
      id: true,
      name: true,
      email: true,
      theme: true,
      notifications: true,
      autoSave: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      generationsUsed: true,
      generationsLimit: true,
      projectsThisMonth: true,
      projectsLimit: true,
      githubUsername: true,
      createdAt: true,
    };
    const user = await getUserFromSession(session, select);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({
      ...user,
      generationsUsed: Number(user.generationsUsed ?? 0),
      generationsLimit: Number(user.generationsLimit ?? 0),
      projectsThisMonth: Number(user.projectsThisMonth ?? 0),
      projectsLimit: Number(user.projectsLimit ?? 0),
    });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = await getUserFromSession(session);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const body = await req.json();
    const validatedData = settingsSchema.parse(body);
    // Update user settings
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: validatedData,
      select: {
        id: true,
        name: true,
        email: true,
        theme: true,
        notifications: true,
        autoSave: true,
      }
    });
    return NextResponse.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Settings POST error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
