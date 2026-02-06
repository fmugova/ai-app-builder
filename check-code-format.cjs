const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCode() {
  try {
    const project = await prisma.project.findUnique({
      where: { id: '2fa5f978-6e43-42ee-89e8-ad0ac5cc0920' },
      select: { code: true, name: true }
    });

    if (!project) {
      console.log('❌ Project not found');
      return;
    }

    console.log('✅ Project:', project.name);
    console.log('\n📄 CODE PREVIEW (first 2000 chars):\n');
    console.log(project.code.substring(0, 2000));
    
    console.log('\n\n🔍 SEARCHING FOR DELIMITERS:\n');
    console.log('Has <!-- PAGE: comment:', project.code.includes('<!-- PAGE:'));
    console.log('Has <div id="page- div:', project.code.includes('<div id="page-'));
    console.log('Has class="page":', project.code.includes('class="page"'));
    
    // Search for specific patterns
    const pageCommentMatch = project.code.match(/<!--\s*PAGE:\s*\w+\s*-->/);
    const pageDivMatch = project.code.match(/<div[^>]*id="page-[^"]+"/);
    
    console.log('\n📊 PATTERN MATCHES:');
    console.log('PAGE comment match:', pageCommentMatch ? pageCommentMatch[0] : 'NONE');
    console.log('Page div match:', pageDivMatch ? pageDivMatch[0] : 'NONE');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCode();
