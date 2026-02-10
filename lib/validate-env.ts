/**
 * Environment Validation Script
 * 
 * Validates all required environment variables at application startup.
 * Prevents deployment with missing or invalid configuration.
 * 
 * Usage:
 * - Automatically called in next.config.js
 * - Manually run: npm run validate-env
 */

type ValidationResult = {
  valid: boolean;
  missing: { key: string; description: string }[];
  invalid: { key: string; reason: string }[];
  warnings: string[];
};

// Required environment variables with descriptions
const REQUIRED_ENV_VARS = {
  // Database
  DATABASE_URL: {
    description: 'PostgreSQL connection URL',
    validate: (value: string) => {
      if (!value.startsWith('postgresql://') && !value.startsWith('postgres://')) {
        return 'Must start with postgresql:// or postgres://';
      }
      if (!value.includes('@')) {
        return 'Missing database credentials';
      }
      return null;
    },
  },

  // Authentication
  NEXTAUTH_URL: {
    description: 'Application URL for authentication',
    validate: (value: string) => {
      try {
        new URL(value);
        return null;
      } catch {
        return 'Must be a valid URL';
      }
    },
  },
  NEXTAUTH_SECRET: {
    description: 'NextAuth secret key (min 32 characters)',
    validate: (value: string) => {
      if (value.length < 32) {
        return 'Must be at least 32 characters long';
      }
      if (value === 'your-secret-here' || value === 'changeme') {
        return 'Must not use default/placeholder value';
      }
      return null;
    },
  },

  // AI Generation
  ANTHROPIC_API_KEY: {
    description: 'Anthropic API key for Claude',
    validate: (value: string) => {
      if (!value.startsWith('sk-ant-')) {
        return 'Must start with sk-ant-';
      }
      if (value.length < 50) {
        return 'API key appears to be invalid (too short)';
      }
      return null;
    },
  },

  // Payments
  STRIPE_SECRET_KEY: {
    description: 'Stripe secret key',
    validate: (value: string) => {
      if (!value.startsWith('sk_test_') && !value.startsWith('sk_live_')) {
        return 'Must start with sk_test_ or sk_live_';
      }
      if (process.env.NODE_ENV === 'production' && value.startsWith('sk_test_')) {
        return 'WARNING: Using test key in production';
      }
      return null;
    },
  },
  STRIPE_WEBHOOK_SECRET: {
    description: 'Stripe webhook secret',
    validate: (value: string) => {
      if (!value.startsWith('whsec_')) {
        return 'Must start with whsec_';
      }
      return null;
    },
  },
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: {
    description: 'Stripe publishable key (public)',
    validate: (value: string) => {
      if (!value.startsWith('pk_test_') && !value.startsWith('pk_live_')) {
        return 'Must start with pk_test_ or pk_live_';
      }
      return null;
    },
  },
} as const;

// Recommended but not required
const RECOMMENDED_ENV_VARS = {
  VERCEL_TOKEN: 'Required for one-click deployments',
  SENTRY_DSN: 'Recommended for error tracking',
  UPSTASH_REDIS_REST_URL: 'Recommended for distributed rate limiting',
  UPSTASH_REDIS_REST_TOKEN: 'Recommended for distributed rate limiting',
} as const;

// Production-specific requirements
const PRODUCTION_REQUIRED = {
  VERCEL_TOKEN: 'Required for production deployments',
  SENTRY_DSN: 'Critical for production monitoring',
  UPSTASH_REDIS_REST_URL: 'Required for multi-instance rate limiting',
} as const;

/**
 * Validates all environment variables
 */
export function validateEnvironment(): ValidationResult {
  const missing: ValidationResult['missing'] = [];
  const invalid: ValidationResult['invalid'] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const [key, config] of Object.entries(REQUIRED_ENV_VARS)) {
    const value = process.env[key];

    if (!value) {
      missing.push({
        key,
        description: config.description,
      });
    } else {
      const error = config.validate(value);
      if (error) {
        if (error.startsWith('WARNING:')) {
          warnings.push(`${key}: ${error}`);
        } else {
          invalid.push({
            key,
            reason: error,
          });
        }
      }
    }
  }

  // Check recommended variables
  for (const [key, description] of Object.entries(RECOMMENDED_ENV_VARS)) {
    if (!process.env[key]) {
      warnings.push(`${key} is not set - ${description}`);
    }
  }

  // Production-specific checks
  if (process.env.NODE_ENV === 'production') {
    for (const [key, description] of Object.entries(PRODUCTION_REQUIRED)) {
      if (!process.env[key]) {
        missing.push({
          key,
          description: `[PRODUCTION] ${description}`,
        });
      }
    }

    // Ensure no test keys in production
    if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
      invalid.push({
        key: 'STRIPE_SECRET_KEY',
        reason: 'Using test key in production environment',
      });
    }
  }

  // Check for common mistakes
  checkCommonMistakes(warnings);

  return {
    valid: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    warnings,
  };
}

/**
 * Checks for common configuration mistakes
 */
function checkCommonMistakes(warnings: string[]): void {
  // Check if using placeholder values
  const placeholders = [
    'your-api-key',
    'your-token',
    'changeme',
    'replace-this',
    'xxx',
  ];

  for (const [key, value] of Object.entries(process.env)) {
    if (
      typeof value === 'string' &&
      placeholders.some((p) => value.toLowerCase().includes(p))
    ) {
      warnings.push(`${key} appears to contain a placeholder value`);
    }
  }

  // Check if DATABASE_URL and DIRECT_URL are the same
  if (
    process.env.DATABASE_URL &&
    process.env.DIRECT_URL &&
    process.env.DATABASE_URL === process.env.DIRECT_URL
  ) {
    warnings.push(
      'DATABASE_URL and DIRECT_URL are identical - DIRECT_URL should bypass connection pooling'
    );
  }

  // Check if NEXTAUTH_URL matches NODE_ENV
  if (process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL) {
    if (
      process.env.NEXTAUTH_URL.includes('localhost') ||
      process.env.NEXTAUTH_URL.includes('127.0.0.1')
    ) {
      warnings.push(
        'NEXTAUTH_URL points to localhost in production environment'
      );
    }
  }

  // Check for mixed Stripe keys (test publishable with live secret)
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const stripePublic = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (stripeSecret && stripePublic) {
    const secretIsTest = stripeSecret.startsWith('sk_test_');
    const publicIsTest = stripePublic.startsWith('pk_test_');

    if (secretIsTest !== publicIsTest) {
      warnings.push(
        'Stripe key mismatch: mixing test and live keys (secret vs public)'
      );
    }
  }
}

/**
 * Formats and prints validation results
 */
export function printValidationResults(result: ValidationResult): void {
  console.log('\n🔍 Environment Variable Validation\n');
  console.log('━'.repeat(60));

  if (result.valid && result.warnings.length === 0) {
    console.log('✅ All required environment variables are valid!\n');
    return;
  }

  // Print missing variables
  if (result.missing.length > 0) {
    console.log('\n❌ Missing required variables:\n');
    result.missing.forEach(({ key, description }) => {
      console.log(`  • ${key}`);
      console.log(`    ${description}\n`);
    });
  }

  // Print invalid variables
  if (result.invalid.length > 0) {
    console.log('\n❌ Invalid variables:\n');
    result.invalid.forEach(({ key, reason }) => {
      console.log(`  • ${key}`);
      console.log(`    ${reason}\n`);
    });
  }

  // Print warnings
  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:\n');
    result.warnings.forEach((warning) => {
      console.log(`  • ${warning}`);
    });
    console.log();
  }

  console.log('━'.repeat(60));

  // Print helpful information
  if (result.missing.length > 0 || result.invalid.length > 0) {
    console.log('\n📖 Setup Guide:\n');
    console.log('  1. Copy .env.example to .env.local');
    console.log('  2. Fill in all required values');
    console.log('  3. Generate NEXTAUTH_SECRET:');
    console.log('     openssl rand -base64 32');
    console.log('  4. Run validation again:');
    console.log('     npm run validate-env\n');
    console.log('See .env.example for detailed documentation.\n');
  }
}

/**
 * Main validation function with exit on failure
 */
export function validateEnvironmentOrExit(): void {
  // Skip validation in test environment
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const result = validateEnvironment();

  printValidationResults(result);

  if (!result.valid) {
    console.error('\n❌ Environment validation failed!\n');
    process.exit(1);
  }

  if (result.warnings.length > 0) {
    console.log('⚠️  Environment validated with warnings\n');
  }
}

// Export for testing
export const __testing__ = {
  REQUIRED_ENV_VARS,
  RECOMMENDED_ENV_VARS,
  checkCommonMistakes,
};
