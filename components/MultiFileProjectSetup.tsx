'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Code, Download, Rocket, Play, CheckCircle2, FileCode } from 'lucide-react';

interface MultiFileProjectSetupProps {
  projectName: string;
  filesCount: number;
  projectType: string;
  dependencies?: Record<string, string>;
  onDownload?: () => void;
  onViewCode?: () => void;
  onDeploy?: () => void;
}

export default function MultiFileProjectSetup({
  projectName,
  filesCount,
  projectType,
  dependencies,
  onDownload,
  onViewCode,
  onDeploy,
}: MultiFileProjectSetupProps) {
  const getFrameworkName = () => {
    switch (projectType) {
      case 'fullstack':
        return 'Next.js 14 + Supabase';
      case 'next-js':
        return 'Next.js';
      case 'react':
        return 'React + Vite';
      default:
        return projectType;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <Rocket className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-sm">
          <strong className="font-semibold">Multi-file {getFrameworkName()} project generated!</strong>
          <br />
          This project contains {filesCount} files and requires Node.js to run. Follow the instructions below to get started.
        </AlertDescription>
      </Alert>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Button
          onClick={onDownload}
          className="w-full"
          size="lg"
        >
          <Download className="mr-2 h-4 w-4" />
          Download Project
        </Button>
        
        <Button
          onClick={onViewCode}
          variant="outline"
          className="w-full"
          size="lg"
        >
          <FileCode className="mr-2 h-4 w-4" />
          View Code Files
        </Button>

        {onDeploy && (
          <Button
            onClick={onDeploy}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <Rocket className="mr-2 h-4 w-4" />
            Deploy to Vercel
          </Button>
        )}
      </div>

      {/* Setup Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Local Development */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Play className="h-5 w-5 text-green-600" />
              Run Locally
            </CardTitle>
            <CardDescription>
              Set up and run the project on your machine
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">1</Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">Download the project files</p>
                  <p className="text-xs text-muted-foreground">Click &ldquo;Download Project&rdquo; above</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">2</Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">Extract and navigate to folder</p>
                  <div className="mt-1 bg-muted p-2 rounded text-xs font-mono">
                    cd {projectName}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">3</Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">Install dependencies</p>
                  <div className="mt-1 bg-muted p-2 rounded text-xs font-mono">
                    npm install
                  </div>
                </div>
              </div>

              {projectType === 'fullstack' && (
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">4</Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Set up environment variables</p>
                    <div className="mt-1 bg-muted p-2 rounded text-xs font-mono">
                      cp .env.example .env.local
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Edit .env.local with your API keys
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">{projectType === 'fullstack' ? '5' : '4'}</Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">Start development server</p>
                  <div className="mt-1 bg-muted p-2 rounded text-xs font-mono">
                    npm run dev
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Open in browser</p>
                  <a 
                    href="http://localhost:3000" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    http://localhost:3000
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deploy to Production */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Rocket className="h-5 w-5 text-purple-600" />
              Deploy to Production
            </CardTitle>
            <CardDescription>
              Deploy your app to Vercel for free
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">1</Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">Create Vercel account</p>
                  <a 
                    href="https://vercel.com/signup" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    vercel.com/signup
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">2</Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">Install Vercel CLI (optional)</p>
                  <div className="mt-1 bg-muted p-2 rounded text-xs font-mono">
                    npm i -g vercel
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">3</Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">Deploy from folder</p>
                  <div className="mt-1 bg-muted p-2 rounded text-xs font-mono">
                    vercel
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Or use &ldquo;Deploy to Vercel&rdquo; button above
                  </p>
                </div>
              </div>

              {projectType === 'fullstack' && (
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">4</Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Add environment variables</p>
                    <p className="text-xs text-muted-foreground">
                      Set your API keys in Vercel dashboard
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Get live URL</p>
                  <p className="text-xs text-muted-foreground">
                    Your app will be live at *.vercel.app
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dependencies Info */}
      {dependencies && Object.keys(dependencies).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Code className="h-5 w-5" />
              Key Dependencies
            </CardTitle>
            <CardDescription>
              Main packages included in this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(dependencies).slice(0, 10).map(([name, version]) => (
                <Badge key={name} variant="secondary" className="font-mono text-xs">
                  {name} {version}
                </Badge>
              ))}
              {Object.keys(dependencies).length > 10 && (
                <Badge variant="outline" className="text-xs">
                  +{Object.keys(dependencies).length - 10} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
