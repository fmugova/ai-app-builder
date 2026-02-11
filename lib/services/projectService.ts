/**
 * Project Service
 * Helper functions for project database operations
 */

import prisma from '@/lib/prisma';
import { FileInfo } from './iterationDetector';

export async function getProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      ProjectFile: {
        orderBy: { updatedAt: 'desc' }
      },
      ProjectVersion: {
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });

  return project;
}

export async function getProjectFiles(projectId: string): Promise<FileInfo[]> {
  const files = await prisma.projectFile.findMany({
    where: { projectId },
   orderBy: { updatedAt: 'desc' }
  });

  return files.map(file => ({
    filename: file.path.split('/').pop() || file.path,
    path: file.path,
    content: file.content,
    lastModified: file.updatedAt || file.createdAt || new Date(),
    type: getFileType(file.path)
  }));
}

export async function saveProjectFiles(
  projectId: string,
  files: Array<{ path: string; content: string; language?: string }>
) {
  // Delete existing files first
  await prisma.projectFile.deleteMany({
    where: { projectId }
  });

  // Create new files
  const createdFiles = await Promise.all(
    files.map((file, index) =>
      prisma.projectFile.create({
        data: {
          projectId,
          path: file.path,
          content: file.content,
          language: file.language || getLanguageFromPath(file.path),
          order: index
        }
      })
    )
  );

  return createdFiles;
}

export async function updateProjectMetadata(
  projectId: string,
  data: {
    code?: string;
    multiPage?: boolean;
    isMultiFile?: boolean;
    tokensUsed?: number;
    generationTime?: number;
  }
) {
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...data,
      updatedAt: new Date()
    }
  });

  return updated;
}

export async function createProjectVersion(
  projectId: string,
  userId: string,
  code: string,
  description?: string
) {
  // Get current version number
  const latestVersion = await prisma.projectVersion.findFirst({
    where: { projectId },
    orderBy: { version: 'desc' }
  });

  const newVersion = (latestVersion?.version || 0) + 1;

  const version = await prisma.projectVersion.create({
    data: {
      projectId,
      userId,
      version: newVersion,
      code,
      description
    }
  });

  return version;
}

function getFileType(path: string): FileInfo['type'] {
  const ext = path.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
      return 'css';
    case 'js':
    case 'jsx':
      return 'js';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'json':
      return 'json';
    default:
      return 'other';
  }
}

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
      return 'css';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    default:
      return 'plaintext';
  }
}
