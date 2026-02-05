// Script to fix published projects that have publicSlug but missing publish status
// Run with: node fix-published-projects.js

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixPublishedProjects() {
  try {
    console.log('🔍 Checking for projects with publicSlug...');

    // Find all projects with publicSlug
    const projects = await prisma.project.findMany({
      where: {
        publicSlug: { not: null }
      },
      select: {
        id: true,
        name: true,
        publicSlug: true,
        isPublished: true,
        publishedAt: true,
        publicUrl: true,
        status: true,
        updatedAt: true
      }
    });

    console.log(`\nFound ${projects.length} projects with publicSlug`);

    let fixed = 0;
    let urlFixed = 0;

    for (const project of projects) {
      const updates = {};

      // Fix missing publish status
      if (!project.isPublished || !project.publishedAt) {
        updates.isPublished = true;
        updates.publishedAt = project.publishedAt || project.updatedAt;
        updates.status = 'PUBLISHED';
        fixed++;
        console.log(`\n❌ ISSUE: ${project.name} (${project.publicSlug})`);
        console.log(`   - isPublished: ${project.isPublished}`);
        console.log(`   - publishedAt: ${project.publishedAt}`);
      }

      // Fix wrong publicUrl (/app/ instead of /p/)
      if (project.publicUrl?.includes('/app/') || !project.publicUrl) {
        updates.publicUrl = `https://buildflow-ai.app/p/${project.publicSlug}`;
        urlFixed++;
        console.log(`\n🔗 URL: ${project.name}`);
        console.log(`   - Old: ${project.publicUrl || 'null'}`);
        console.log(`   - New: https://buildflow-ai.app/p/${project.publicSlug}`);
      }

      // Apply updates if needed
      if (Object.keys(updates).length > 0) {
        await prisma.project.update({
          where: { id: project.id },
          data: updates
        });
        console.log(`   ✅ Fixed!`);
      }
    }

    console.log(`\n\n📊 Summary:`);
    console.log(`   - Total projects with publicSlug: ${projects.length}`);
    console.log(`   - Fixed publish status: ${fixed}`);
    console.log(`   - Fixed URLs: ${urlFixed}`);

    // Check for the specific slug mentioned
    console.log(`\n🔍 Checking specific slug: mental-health-companion-app-ai-journaling-t-z3rF72-i`);
    const specificProject = await prisma.project.findFirst({
      where: {
        publicSlug: 'mental-health-companion-app-ai-journaling-t-z3rF72-i'
      },
      select: {
        id: true,
        name: true,
        publicSlug: true,
        isPublished: true,
        publishedAt: true,
        publicUrl: true,
        status: true
      }
    });

    if (specificProject) {
      console.log(`\n✅ Found project:`);
      console.log(JSON.stringify(specificProject, null, 2));
      console.log(`\n🌐 URL: https://buildflow-ai.app/p/${specificProject.publicSlug}`);
    } else {
      console.log(`\n❌ Project not found with this slug`);
      console.log(`   This could mean:`);
      console.log(`   1. The project was deleted`);
      console.log(`   2. The slug is incorrect`);
      console.log(`   3. The project was never published`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPublishedProjects();
