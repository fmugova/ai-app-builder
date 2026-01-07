'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users } from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  userRole: string;
}

interface WorkspaceSelectorProps {
  value?: string;
  onChange: (workspaceId: string | undefined) => void;
  disabled?: boolean;
}

export function WorkspaceSelector({ value, onChange, disabled }: WorkspaceSelectorProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const response = await fetch('/api/workspaces');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch workspaces');
      }

      // Filter to only show workspaces where user can add projects (admin/owner)
      const eligibleWorkspaces = data.workspaces.filter(
        (ws: Workspace) => ws.userRole === 'owner' || ws.userRole === 'admin'
      );
      
      setWorkspaces(eligibleWorkspaces);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      toast({
        title: 'Error',
        description: 'Failed to load workspaces',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Workspace (Optional)</Label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading workspaces...
        </div>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="workspace">Workspace (Optional)</Label>
      <Select
        value={value || 'none'}
        onValueChange={(val) => onChange(val === 'none' ? undefined : val)}
        disabled={disabled}
      >
        <SelectTrigger id="workspace">
          <SelectValue placeholder="Select a workspace" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <div className="flex items-center gap-2">
              <span>Personal Project</span>
            </div>
          </SelectItem>
          {workspaces.map((workspace) => (
            <SelectItem key={workspace.id} value={workspace.id}>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{workspace.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Share this project with a workspace team
      </p>
    </div>
  );
}
