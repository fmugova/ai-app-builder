import { z } from 'zod'

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const emailSchema = z.string()
  .email('Invalid email address')
  .toLowerCase()
  .trim()
  .max(255, 'Email too long')

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character')

export const nameSchema = z.string()
  .min(1, 'Name is required')
  .max(100, 'Name too long')
  .trim()

export const urlSchema = z.string()
  .url('Invalid URL')
  .max(2000, 'URL too long')

export const slugSchema = z.string()
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
  .min(3, 'Slug too short')
  .max(50, 'Slug too long')

export const codeSchema = z.string()
  .length(6, 'Code must be 6 digits')
  .regex(/^\d{6}$/, 'Code must be numeric')

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema
})

export const signinSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  twoFactorToken: z.string().optional()
})

export const forgotPasswordSchema = z.object({
  email: emailSchema
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema
})

export const verify2FASchema = z.object({
  token: codeSchema
})

// ============================================================================
// PROJECT SCHEMAS
// ============================================================================

export const createProjectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(100, 'Project name too long')
    .trim(),
  description: z.string()
    .max(500, 'Description too long')
    .optional(),
  framework: z.enum(['nextjs', 'react', 'vue', 'svelte']).default('nextjs'),
  prompt: z.string()
    .min(10, 'Prompt too short')
    .max(5000, 'Prompt too long')
    .optional()
})

export const updateProjectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(100, 'Project name too long')
    .trim()
    .optional(),
  description: z.string()
    .max(500, 'Description too long')
    .optional(),
  code: z.string().optional(),
  htmlCode: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional()
})

// ============================================================================
// PAGE SCHEMAS
// ============================================================================

export const createPageSchema = z.object({
  title: z.string()
    .min(1, 'Page title is required')
    .max(100, 'Title too long')
    .trim(),
  slug: slugSchema,
  content: z.string().optional(),
  isHomepage: z.boolean().default(false)
})

export const updatePageSchema = z.object({
  title: z.string()
    .min(1, 'Page title is required')
    .max(100, 'Title too long')
    .trim()
    .optional(),
  slug: slugSchema.optional(),
  content: z.string().optional(),
  isHomepage: z.boolean().optional(),
  order: z.number().int().min(0).optional()
})

// ============================================================================
// ENVIRONMENT VARIABLE SCHEMAS
// ============================================================================

export const createEnvVarSchema = z.object({
  key: z.string()
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Key must be uppercase with underscores only')
    .min(1, 'Key is required')
    .max(100, 'Key too long'),
  value: z.string()
    .min(1, 'Value is required')
    .max(5000, 'Value too long'),
  description: z.string()
    .max(200, 'Description too long')
    .optional(),
  environment: z.enum(['all', 'production', 'development', 'preview']).default('all')
})

export const updateEnvVarSchema = z.object({
  value: z.string()
    .min(1, 'Value is required')
    .max(5000, 'Value too long')
    .optional(),
  description: z.string()
    .max(200, 'Description too long')
    .optional()
})

// ============================================================================
// API ENDPOINT SCHEMAS
// ============================================================================

export const generateEndpointSchema = z.object({
  description: z.string()
    .min(10, 'Description too short')
    .max(2000, 'Description too long'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('GET'),
  path: z.string()
    .regex(/^\/api\/[a-z0-9\-\/\[\]]+$/, 'Invalid API path format')
    .max(200, 'Path too long'),
  requiresAuth: z.boolean().default(false),
  usesDatabase: z.boolean().default(false),
  databaseTable: z.string()
    .max(100, 'Table name too long')
    .optional()
})

export const createEndpointSchema = z.object({
  name: z.string()
    .min(1, 'Endpoint name is required')
    .max(100, 'Name too long')
    .trim(),
  path: z.string()
    .regex(/^\/api\/[a-z0-9\-\/\[\]]+$/, 'Invalid API path')
    .max(200, 'Path too long'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  description: z.string()
    .max(500, 'Description too long')
    .optional(),
  code: z.string()
    .min(1, 'Code is required'),
  requiresAuth: z.boolean().default(false),
  usesDatabase: z.boolean().default(false),
  databaseTable: z.string().optional()
})

// ============================================================================
// DOMAIN SCHEMAS
// ============================================================================

export const addDomainSchema = z.object({
  domain: z.string()
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/,
      'Invalid domain format'
    )
    .max(253, 'Domain too long')
    .toLowerCase()
})

// ============================================================================
// CONTACT FORM SCHEMA
// ============================================================================

export const contactFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  message: z.string()
    .min(10, 'Message too short')
    .max(2000, 'Message too long')
    .trim()
})

// ============================================================================
// WORKSPACE SCHEMAS
// ============================================================================

export const createWorkspaceSchema = z.object({
  name: z.string()
    .min(1, 'Workspace name is required')
    .max(100, 'Name too long')
    .trim(),
  description: z.string()
    .max(500, 'Description too long')
    .optional()
})

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(['owner', 'admin', 'member']).default('member')
})

// ============================================================================
// FEEDBACK SCHEMA
// ============================================================================

export const feedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'improvement', 'other']),
  title: z.string()
    .min(5, 'Title too short')
    .max(100, 'Title too long')
    .trim(),
  description: z.string()
    .min(20, 'Description too short')
    .max(2000, 'Description too long')
    .trim(),
  page: z.string().optional()
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      return {
        success: false,
        error: firstError.message
      }
    }
    return { success: false, error: 'Validation failed' }
  }
}

export function validateSchemaAsync<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  return new Promise((resolve) => {
    try {
      const validated = schema.parse(data)
      resolve({ success: true, data: validated })
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0]
        resolve({
          success: false,
          error: firstError.message
        })
      }
      resolve({ success: false, error: 'Validation failed' })
    }
  })
}
