// app/api/auto-fix/route.ts
// Auto-fix common code quality issues in existing projects

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { CodeAutoFixer } from '@/lib/validators/auto-fixer';
import CodeValidator from '@/lib/validators/code-validator';

export const maxDuration = 60; // 60 seconds for Vercel Pro
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await req.json();
    
    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    console.log('🔧 AUTO-FIX REQUEST:', projectId);

    // Fetch project with files
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId: session.user.id },
      include: { ProjectFile: { orderBy: { order: 'asc' } } }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const autoFixer = new CodeAutoFixer();
    const validator = new CodeValidator();
    let filesFixed = 0;
    let totalFixesApplied: string[] = [];

    // For single-file HTML projects
    if (!project.isMultiFile && project.html) {
      console.log('🔧 Fixing single-file HTML project...');
      
      const validationResult = validator.validateAll(project.html, '', '');
      const fixResult = autoFixer.autoFix(project.html, validationResult);
      
      if (fixResult.appliedFixes.length > 0) {
        await prisma.project.update({
          where: { id: projectId },
          data: {
            html: fixResult.fixed,
            code: fixResult.fixed,
            validationScore: BigInt(validationResult.score),
            validationPassed: validationResult.passed,
            updatedAt: new Date(),
          }
        });
        
        filesFixed = 1;
        totalFixesApplied = fixResult.appliedFixes;
        console.log('✅ Single-file project fixed');
      }
    }
    // For multi-file projects
    else if (project.ProjectFile && project.ProjectFile.length > 0) {
      console.log('🔧 Fixing multi-file project...');
      
      const filesToUpdate: Array<{ id: string; content: string }> = [];
      
      for (const file of project.ProjectFile) {
        // Only fix HTML, TSX, and JSX files
        if (file.path.endsWith('.html') || 
            file.path.endsWith('.tsx') || 
            file.path.endsWith('.jsx')) {
          
          console.log(`🔧 Fixing ${file.path}...`);
          
          const validationResult = validator.validateAll(file.content, '', '');
          const fixResult = autoFixer.autoFix(file.content, validationResult);
          
          if (fixResult.appliedFixes.length > 0) {
            filesToUpdate.push({
              id: file.id,
              content: fixResult.fixed
            });
            
            filesFixed++;
            totalFixesApplied.push(...fixResult.appliedFixes.map(fix => 
              `${file.path}: ${fix}`
            ));
            
            console.log(`✅ Fixed ${file.path}: ${fixResult.appliedFixes.length} fixes`);
          }
        }
      }
      
      // Update all fixed files in database
      if (filesToUpdate.length > 0) {
        await Promise.all(
          filesToUpdate.map(file => 
            prisma.projectFile.update({
              where: { id: file.id },
              data: { content: file.content }
            })
          )
        );
        
        // Update project timestamp
        await prisma.project.update({
          where: { id: projectId },
          data: { updatedAt: new Date() }
        });
        
        console.log(`✅ Updated ${filesToUpdate.length} files`);
      }
    }

    console.log('✅ AUTO-FIX COMPLETE:', {
      filesFixed,
      totalFixes: totalFixesApplied.length
    });

    return NextResponse.json({ 
      success: true, 
      filesFixed,
      fixesApplied: totalFixesApplied,
      message: `Fixed ${filesFixed} file${filesFixed !== 1 ? 's' : ''} with ${totalFixesApplied.length} total improvements`
    });

  } catch (error) {
    console.error('❌ Auto-fix error:', error);
    return NextResponse.json(
      { error: 'Failed to auto-fix project' },
      { status: 500 }
    );
  }
}
