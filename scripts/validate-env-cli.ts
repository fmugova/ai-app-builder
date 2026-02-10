#!/usr/bin/env node
/**
 * Environment Validation CLI
 * 
 * Usage: npm run validate-env
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { validateEnvironmentOrExit } from '../lib/validate-env.js';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

validateEnvironmentOrExit();
