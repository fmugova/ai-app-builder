#!/bin/bash

# Safe migration script for Vercel builds
# This script will timeout after 30 seconds to prevent build hanging

set -e

echo "🔄 Starting database migration..."

# Run migration with timeout
timeout 30s npx prisma migrate deploy || {
  exit_code=$?
  if [ $exit_code -eq 124 ]; then
    echo "⚠️  Migration timed out after 30 seconds"
    echo "❌ Please run migrations manually: npm run db:migrate"
    exit 1
  else
    echo "❌ Migration failed with exit code: $exit_code"
    exit $exit_code
  fi
}

echo "✅ Migration completed successfully"
