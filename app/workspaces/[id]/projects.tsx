'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderKanban } from 'lucide-react';

interface Project {
  id: string;
  projectId: string;
  permission: string;
  addedAt: Date;
}

interface ProjectsProps {
  projects: Project[];
}

export default function Projects({ projects }: ProjectsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Workspace Projects</h2>
        <p className="text-sm text-muted-foreground">
          Projects shared with this workspace
        </p>
      </div>
      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-center">
              Add projects to share them with your team.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Project {project.projectId}</CardTitle>
                    <CardDescription>
                      Permission: {project.permission}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {new Date(project.addedAt).toLocaleDateString()}
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
