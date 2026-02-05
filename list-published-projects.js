// List all published projects
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function listPublishedProjects() {
  try {
    const projects = await prisma.project.findMany({
      where: {
        publicSlug: { not: null }
      },
      select: {
        name: true,
        publicSlug: true,
        publicUrl: true,
        isPublished: true,
        publishedAt: true,
        createdAt: true,
        User: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 30
    });

    console.log(`\n📋 Published Projects (${projects.length} total):\n`);
    
    projects.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`);
      console.log(`   Slug: ${p.publicSlug}`);
      console.log(`   URL: https://buildflow-ai.app/p/${p.publicSlug}`);
      console.log(`   Published: ${p.isPublished ? 'Yes' : 'No'} (${p.publishedAt || 'Never'})`);
      console.log(`   Owner: ${p.User.name || p.User.email}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listPublishedProjects();
