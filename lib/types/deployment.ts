/**
 * Shared Deployment Types
 * 
 * Use these types across deployment-related files to ensure consistency
 * Location: lib/types/deployment.ts
 */

// ============================================
// DEPLOYMENT CONFIGURATION
// ============================================

export interface DeploymentConfig {
  projectName: string;
  html: string;
  css?: string;
  javascript?: string;
  apiEndpoints?: ApiEndpoint[];
  databaseTables?: DatabaseTable[];
  envVars?: Record<string, string>;
  framework?: 'html' | 'nextjs' | 'react';
  buildCommand?: string;
  outputDirectory?: string;
}

export interface ApiEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  code: string;
  requiresAuth?: boolean;
  description?: string;
}

export interface DatabaseTable {
  name: string;
  schema: Record<string, unknown>; // JSON schema or Prisma schema
  indexes?: string[];
  rlsPolicies?: RLSPolicy[];
}

export interface RLSPolicy {
  name: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  using: string; // SQL expression
  withCheck?: string; // SQL expression
}

// ============================================
// DEPLOYMENT RESULT
// ============================================

export interface DeploymentResult {
  success: boolean;
  deploymentId?: string;
  url?: string;
  vercelProjectId?: string;
  deploymentUrl?: string;
  inspectorUrl?: string;
  readyState?: 'READY' | 'ERROR' | 'BUILDING' | 'QUEUED';
  buildLogs?: string[];
  error?: string;
}

// ============================================
// VERCEL SPECIFIC
// ============================================

export interface VercelDeploymentOptions {
  projectName: string;
  files: VercelFile[];
  envVars?: Record<string, string>;
  regions?: string[];
  teamId?: string;
}

export interface VercelFile {
  file: string; // Path within deployment
  data: string; // File content (base64 for binary, utf8 for text)
  encoding?: 'base64' | 'utf8';
}

export interface VercelIntegration {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken?: string;
  teamId?: string;
  teamName?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// DEPLOYMENT RECORD (Database)
// ============================================

export interface DeploymentRecord {
  id: string;
  projectId: string;
  url: string;
  status: DeploymentStatus;
  deploymentId: string;
  provider: DeploymentProvider;
  buildLogs?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DeploymentStatus = 
  | 'pending'
  | 'building'
  | 'deployed'
  | 'failed'
  | 'canceled';

export type DeploymentProvider = 
  | 'vercel'
  | 'netlify'
  | 'cloudflare'
  | 'custom';

// ============================================
// PROJECT WITH DEPLOYMENT DATA
// ============================================

export interface ProjectWithDeploymentData {
  id: string;
  name: string;
  html: string | null;
  css: string | null;
  javascript: string | null;
  ApiEndpoint?: ApiEndpoint[];
  DatabaseTable?: DatabaseTable[];
  SupabaseIntegration?: {
    projectUrl: string;
    anonKey: string;
    serviceKey?: string;
  } | null;
  deployedUrl?: string | null;
  status: string;
}

// ============================================
// ENVIRONMENT VARIABLES
// ============================================

export interface EnvironmentVariable {
  key: string;
  value: string;
  target: ('production' | 'preview' | 'development')[];
  type?: 'encrypted' | 'plain';
}

export interface SupabaseCredentials {
  projectUrl: string;
  anonKey: string;
  serviceKey?: string;
  databaseUrl?: string;
}

// ============================================
// BUILD CONFIGURATION
// ============================================

export interface BuildConfig {
  framework: 'nextjs' | 'react' | 'html';
  buildCommand?: string;
  outputDirectory?: string;
  installCommand?: string;
  devCommand?: string;
  rootDirectory?: string;
}

// ============================================
// ERROR TYPES
// ============================================

export class DeploymentError extends Error {
  constructor(
    message: string,
    public code: DeploymentErrorCode,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DeploymentError';
  }
}

export type DeploymentErrorCode =
  | 'INVALID_CONFIG'
  | 'BUILD_FAILED'
  | 'DEPLOYMENT_FAILED'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'INVALID_PROJECT'
  | 'NETWORK_ERROR'
  | 'TIMEOUT';

// ============================================
// UTILITY TYPES
// ============================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>>
  & {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];
