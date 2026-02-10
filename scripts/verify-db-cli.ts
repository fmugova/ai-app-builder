#!/usr/bin/env node
/**
 * Database Verification CLI
 * 
 * Usage: npm run verify-db
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { verifyDatabaseOrExit } from './verify-migrations.js';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

verifyDatabaseOrExit();
