// config/generation.ts

export const GENERATION_CONFIG = {
  // Token limits by complexity
  tokenLimits: {
    simple: 15000,
    webapp: 25000,
    ecommerce: 35000,
    complex: 50000,
    maximum: 180000,
  },
  
  // Retry settings
  retry: {
    maxAttempts: 2,
    continuationContextSize: 3000, // Last N characters to include in retry
  },
  
  // Validation settings
  validation: {
    requireCompleteHTML: true,
    requireCSS: true,
    allowPartialJS: false,
  },
  
  // Stream settings
  streaming: {
    timeout: 180000, // 3 minutes
    chunkSize: 1024,
  },
  
  // Generation hints
  prompts: {
    emphasizeCompleteness: true,
    requestModularCode: true,
    includeComments: false, // Reduce tokens
  }
} as const;
