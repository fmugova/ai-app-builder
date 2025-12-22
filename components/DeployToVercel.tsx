'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Rocket, ExternalLink, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DeployToVercelProps {
  projectId: string;
  projectName: string;
  githubRepoName?: string; // Pass this from your GitHub export
}

export default function DeployToVercel({ 
  projectId, 
  projectName,
  githubRepoName 
}: DeployToVercelProps) {
  const [isDeploying, setIsDeploying] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<{
    status: 'connecting' | 'building' | 'ready' | 'error';
    message: string;
    vercelUrl?: string;
    error?: string;
  }>({
    status: 'connecting',
    message: 'Initializing deployment...',
  });
  
  const [needsGithubAuth, setNeedsGithubAuth] = useState(false);
  const [needsVercelAuth, setNeedsVercelAuth] = useState(false);

  const startDeployment = async () => {
    if (!githubRepoName) {
      alert('Please export to GitHub first!');
      return;
    }

    setIsDeploying(true);
    setShowDialog(true);
    setDeploymentStatus({
      status: 'connecting',
      message: 'Connecting to Vercel...',
    });
    
    try {
      const response = await fetch('/api/deploy/vercel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId,
          githubRepoName 
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.needsGithubAuth) {
          setNeedsGithubAuth(true);
          setDeploymentStatus({
            status: 'error',
            message: 'GitHub connection required',
            error: 'Please connect your GitHub account first',
          });
          setIsDeploying(false);
          return;
        }
        
        if (data.needsVercelAuth) {
          setNeedsVercelAuth(true);
          setDeploymentStatus({
            status: 'error',
            message: 'Vercel connection required',
            error: 'Please connect your Vercel account in Settings',
          });
          setIsDeploying(false);
          return;
        }
        
        throw new Error(data.error || data.details || 'Deployment failed');
      }
      
      // Start polling for deployment status
      setDeploymentStatus({
        status: 'building',
        message: 'Building on Vercel...',
        vercelUrl: data.deployment.vercelUrl,
      });
      
      pollDeploymentStatus(data.deployment.id, data.deployment.vercelUrl);
      
    } catch (error: any) {
      console.error('Deployment error:', error);
      setDeploymentStatus({
        status: 'error',
        message: 'Deployment failed',
        error: error.message,
      });
      setIsDeploying(false);
    }
  };
  
  const pollDeploymentStatus = async (deploymentId: string, vercelUrl: string) => {
    const maxAttempts = 60; // 5 minutes
    let attempts = 0;
    
    const poll = async () => {
      try {
        const response = await fetch(
          `/api/deploy/status?deploymentId=${deploymentId}`
        );
        const data = await response.json();
        
        if (data.status === 'ready') {
          setDeploymentStatus({
            status: 'ready',
            message: 'Deployment successful!',
            vercelUrl: data.url || vercelUrl,
          });
          setIsDeploying(false);
          return;
        }
        
        if (data.status === 'error') {
          setDeploymentStatus({
            status: 'error',
            message: 'Deployment failed',
            error: data.error || 'Unknown error occurred',
          });
          setIsDeploying(false);
          return;
        }
        
        // Still building
        setDeploymentStatus({
          status: 'building',
          message: `Building on Vercel... (${data.readyState || 'BUILDING'})`,
          vercelUrl: data.url || vercelUrl,
        });
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          setDeploymentStatus({
            status: 'error',
            message: 'Deployment timeout',
            error: 'Deployment is taking longer than expected. Check Vercel dashboard.',
          });
          setIsDeploying(false);
        }
      } catch (error: any) {
        console.error('Status polling error:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setIsDeploying(false);
        }
      }
    };
    
    poll();
  };
  
  return (
    <>
      <Button
        onClick={startDeployment}
        disabled={isDeploying || !githubRepoName}
        className="gap-2"
        variant="default"
      >
        {isDeploying ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Deploying...
          </>
        ) : (
          <>
            <Rocket className="h-4 w-4" />
            Deploy to Vercel
          </>
        )}
      </Button>
      
      {!githubRepoName && (
        <p className="text-sm text-muted-foreground mt-2">
          Export to GitHub first to enable deployment
        </p>
      )}
      
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {deploymentStatus.status === 'ready' 
                ? '🎉 Deployment Successful!' 
                : deploymentStatus.status === 'error'
                ? 'Deployment Failed'
                : 'Deploying to Vercel'}
            </DialogTitle>
            <DialogDescription>
              {deploymentStatus.message}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Status Indicator */}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
              {deploymentStatus.status === 'connecting' && (
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              )}
              {deploymentStatus.status === 'building' && (
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              )}
              {deploymentStatus.status === 'ready' && (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              )}
              {deploymentStatus.status === 'error' && (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="text-sm font-medium">
                {deploymentStatus.status === 'connecting' && 'Connecting to Vercel...'}
                {deploymentStatus.status === 'building' && 'Building your application...'}
                {deploymentStatus.status === 'ready' && 'Your app is live!'}
                {deploymentStatus.status === 'error' && 'Something went wrong'}
              </span>
            </div>
            
            {/* Error Message */}
            {deploymentStatus.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{deploymentStatus.error}</AlertDescription>
              </Alert>
            )}
            
            {/* Action Buttons */}
            {needsGithubAuth && (
              <Button 
                onClick={() => window.location.href = '/settings'} 
                className="w-full"
              >
                Connect GitHub
              </Button>
            )}
            
            {needsVercelAuth && (
              <Button 
                onClick={() => window.location.href = '/settings'} 
                className="w-full"
              >
                Connect Vercel
              </Button>
            )}
            
            {/* Success - View Live Site */}
            {deploymentStatus.status === 'ready' && deploymentStatus.vercelUrl && (
              <Button
                onClick={() => window.open(deploymentStatus.vercelUrl, '_blank')}
                className="w-full gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                View Live Site
              </Button>
            )}
            
            {/* Building - Show URL */}
            {deploymentStatus.status === 'building' && deploymentStatus.vercelUrl && (
              <div className="text-sm text-muted-foreground text-center">
                Your site will be available at:{' '}
                <span className="font-mono text-foreground">
                  {deploymentStatus.vercelUrl}
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
