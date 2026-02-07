'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Tabs component not needed for this implementation
import { FileCode, Copy, Check, ChevronRight, Folder, File } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CodeFile {
  path: string;
  content: string;
  language: string;
}

interface CodeFileViewerProps {
  files: CodeFile[];
  projectName?: string;
}

export default function CodeFileViewer({ files }: CodeFileViewerProps) {
  const [selectedFile, setSelectedFile] = useState(files[0]?.path || '');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const getFileIcon = (path: string) => {
    if (path.includes('/')) {
      const parts = path.split('/');
      if (parts.length > 1 && !parts[parts.length - 1].includes('.')) {
        return <Folder className="h-4 w-4 text-blue-500" />;
      }
    }
    
    if (path.endsWith('.tsx') || path.endsWith('.jsx')) return '⚛️';
    if (path.endsWith('.ts')) return '🔷';
    if (path.endsWith('.js')) return '🟨';
    if (path.endsWith('.json')) return '📋';
    if (path.endsWith('.css')) return '🎨';
    if (path.endsWith('.md')) return '📝';
    if (path.endsWith('.env')) return '🔐';
    return <File className="h-4 w-4 text-gray-500" />;
  };

  const getLanguageLabel = (language: string) => {
    const labels: Record<string, string> = {
      typescript: 'TypeScript',
      javascript: 'JavaScript',
      json: 'JSON',
      css: 'CSS',
      markdown: 'Markdown',
      text: 'Text',
    };
    return labels[language] || language;
  };

  const copyToClipboard = async (content: string, path: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFile(path);
      toast.success(`Copied ${path}`);
      setTimeout(() => setCopiedFile(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  // Group files by directory
  const groupedFiles = files.reduce((acc, file) => {
    const dir = file.path.includes('/') 
      ? file.path.substring(0, file.path.lastIndexOf('/'))
      : 'root';
    
    if (!acc[dir]) {
      acc[dir] = [];
    }
    acc[dir].push(file);
    return acc;
  }, {} as Record<string, CodeFile[]>);

  const selectedFileData = files.find(f => f.path === selectedFile);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCode className="h-5 w-5" />
          Project Files
          <Badge variant="secondary" className="ml-auto">
            {files.length} files
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-4 divide-x divide-border h-[600px]">
          {/* File Tree Sidebar */}
          <div className="lg:col-span-1 p-4 overflow-auto">
            <div className="space-y-1">
              {Object.entries(groupedFiles).map(([dir, dirFiles]) => (
                <div key={dir} className="space-y-1">
                  {dir !== 'root' && (
                    <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground py-1">
                      <Folder className="h-3 w-3" />
                      {dir}
                    </div>
                  )}
                  {dirFiles.map((file) => (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFile(file.path)}
                      className={`
                        w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2
                        hover:bg-accent transition-colors
                        ${selectedFile === file.path ? 'bg-accent font-medium' : ''}
                      `}
                    >
                      <span className="flex-shrink-0">{getFileIcon(file.path)}</span>
                      <span className="truncate">
                        {file.path.split('/').pop()}
                      </span>
                      {selectedFile === file.path && (
                        <ChevronRight className="h-3 w-3 ml-auto flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Code Display */}
          <div className="lg:col-span-3 flex flex-col">
            {selectedFileData ? (
              <>
                {/* File Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">{selectedFileData.path}</span>
                    <Badge variant="outline" className="text-xs">
                      {getLanguageLabel(selectedFileData.language)}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(selectedFileData.content, selectedFileData.path)}
                  >
                    {copiedFile === selectedFileData.path ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>

                {/* Code Content */}
                <div className="flex-1 overflow-auto">
                  <pre className="p-4 text-sm">
                    <code className="font-mono">{selectedFileData.content}</code>
                  </pre>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Select a file to view its contents</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
